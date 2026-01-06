import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ConversationSummaryBufferMemory } from 'langchain/memory';
import { z } from 'zod';

// OpenAI 모델 초기화
const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    temperature: parseFloat(process.env.AGENT_TEMPERATURE) || 0.7,
    maxTokens: parseInt(process.env.AGENT_MAX_TOKENS) || 2000,
    openAIApiKey: process.env.OPENAI_API_KEY
});

// 예제 도구들 정의
const tools = [
    new DynamicStructuredTool({
        name: 'calculator',
        description: 'Performs basic arithmetic operations. Use this tool to calculate mathematical expressions.',
        schema: z.object({
            expression: z.string().describe('The mathematical expression to evaluate (e.g., "2 + 2", "10 * 5")')
        }),
        func: async ({ expression }) => {
            try {
                // 간단한 계산기 (보안을 위해 eval 대신 더 안전한 방법 사용 권장)
                // 실제 프로덕션에서는 math.js 같은 라이브러리 사용 권장
                const result = Function(`"use strict"; return (${expression})`)();
                return `Result: ${result}`;
            } catch (error) {
                return `Error calculating: ${error.message}`;
            }
        }
    }),
    new DynamicStructuredTool({
        name: 'get_current_time',
        description: 'Gets the current date and time. Use this when you need to know what time it is now.',
        schema: z.object({}),
        func: async () => {
            return new Date().toISOString();
        }
    })
];

// Agent 프롬프트 템플릿
const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a helpful AI assistant. You have access to tools that can help you answer questions and perform tasks.
    
Use the following guidelines:
- Always be helpful, accurate, and concise
- Use tools when appropriate to get accurate information
- If you don't know something, say so rather than making up information
- Format your responses clearly and professionally
- Remember previous conversation context when available`],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad')
]);

// 세션별 메모리 저장소 (실제 프로덕션에서는 Redis나 DB 사용 권장)
const sessionMemories = new Map();

// 최근 대화 유지 개수 설정 (환경 변수 또는 기본값)
const RECENT_MESSAGES_COUNT = parseInt(process.env.RECENT_MESSAGES_COUNT) || 20;
// 메시지당 평균 토큰 수 추정 (한국어 기준 약 1.5배)
const AVG_TOKENS_PER_MESSAGE = 100;
// 최근 20개 메시지를 유지하기 위한 토큰 제한
const MAX_TOKEN_LIMIT = RECENT_MESSAGES_COUNT * AVG_TOKENS_PER_MESSAGE;

/**
 * 세션별 메모리 가져오기 또는 생성 (Summarize Buffer Memory)
 * @param {string} sessionId - 세션 ID
 * @returns {ConversationSummaryBufferMemory}
 */
function getOrCreateMemory(sessionId) {
    if (!sessionMemories.has(sessionId)) {
        const memory = new ConversationSummaryBufferMemory({
            llm: model,
            maxTokenLimit: MAX_TOKEN_LIMIT,
            returnMessages: true,
            memoryKey: 'chat_history',
            inputKey: 'input'
        });
        sessionMemories.set(sessionId, memory);
    }
    return sessionMemories.get(sessionId);
}

/**
 * LangChain Agent 생성 (Summarize Buffer Memory 포함)
 * @param {string} sessionId - 세션 ID (선택)
 * @returns {Promise<{agent: AgentExecutor, memory: ConversationSummaryBufferMemory|null}>}
 */
export async function createAgent(sessionId = null) {
    try {
        const memory = sessionId ? getOrCreateMemory(sessionId) : null;
        
        // 메모리가 있는 경우 프롬프트에 대화 기록 포함
        const agentPrompt = memory 
            ? prompt 
            : ChatPromptTemplate.fromMessages([
                ['system', `You are a helpful AI assistant. You have access to tools that can help you answer questions and perform tasks.
                
Use the following guidelines:
- Always be helpful, accurate, and concise
- Use tools when appropriate to get accurate information
- If you don't know something, say so rather than making up information
- Format your responses clearly and professionally`],
                ['human', '{input}'],
                new MessagesPlaceholder('agent_scratchpad')
            ]);

        const agent = await createOpenAIFunctionsAgent({
            llm: model,
            tools,
            prompt: agentPrompt
        });

        const agentExecutor = new AgentExecutor({
            agent,
            tools,
            verbose: process.env.NODE_ENV === 'development',
            maxIterations: 15,
            returnIntermediateSteps: true
        });

        return { agent: agentExecutor, memory };
    } catch (error) {
        console.error('Error creating agent:', error);
        throw new Error(`Failed to create agent: ${error.message}`);
    }
}

/**
 * Agent를 사용하여 메시지 처리 (Summarize Buffer Memory 포함)
 * @param {string} message - 사용자 메시지
 * @param {string} sessionId - 세션 ID (선택, 메모리 사용 시 필수)
 * @param {object} context - 추가 컨텍스트
 * @returns {Promise<object>}
 */
export async function invokeAgent(message, sessionId = null, context = {}) {
    const { agent, memory } = await createAgent(sessionId);
    
    // 메모리가 있으면 메모리에서 대화 기록 로드
    let inputData = { input: message, ...context };
    
    if (memory) {
        // 메모리에서 대화 기록 로드 (최근 메시지 + 요약)
        const memoryVariables = await memory.loadMemoryVariables({});
        inputData.chat_history = memoryVariables.chat_history || [];
    }
    
    const result = await agent.invoke(inputData);
    
    // 메모리에 사용자 메시지와 AI 응답 저장
    // ConversationSummaryBufferMemory가 자동으로 요약 처리
    if (memory) {
        await memory.saveContext(
            { input: message },
            { output: result.output || result }
        );
    }
    
    return result;
}

/**
 * 세션 메모리 초기화
 * @param {string} sessionId - 세션 ID
 */
export function clearSessionMemory(sessionId) {
    if (sessionMemories.has(sessionId)) {
        sessionMemories.delete(sessionId);
    }
}

/**
 * 세션 메모리 조회 (최근 메시지 + 요약)
 * @param {string} sessionId - 세션 ID
 * @returns {Promise<object>} 대화 기록 및 요약 정보
 */
export async function getSessionHistory(sessionId) {
    const memory = sessionMemories.get(sessionId);
    if (!memory) {
        return {
            recentMessages: [],
            summary: null,
            totalMessages: 0
        };
    }
    
    try {
        // 메모리에서 현재 상태 로드
        const memoryVariables = await memory.loadMemoryVariables({});
        const messages = memoryVariables.chat_history || [];
        
        // 요약 정보 가져오기 (메모리 내부에서 관리)
        const summary = memory.movingSummaryBuffer || null;
        
        return {
            recentMessages: messages.map(msg => ({
                type: msg.constructor.name,
                content: msg.content
            })),
            summary: summary,
            totalMessages: messages.length,
            maxRecentMessages: RECENT_MESSAGES_COUNT
        };
    } catch (error) {
        console.error('Error getting session history:', error);
        return {
            recentMessages: [],
            summary: null,
            totalMessages: 0
        };
    }
}

