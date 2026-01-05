import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { DynamicStructuredTool } from '@langchain/core/tools';
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
- Format your responses clearly and professionally`],
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad')
]);

/**
 * LangChain Agent 생성
 * @returns {Promise<AgentExecutor>}
 */
export async function createAgent() {
    try {
        const agent = await createOpenAIFunctionsAgent({
            llm: model,
            tools,
            prompt
        });

        const agentExecutor = new AgentExecutor({
            agent,
            tools,
            verbose: process.env.NODE_ENV === 'development',
            maxIterations: 15,
            returnIntermediateSteps: true
        });

        return agentExecutor;
    } catch (error) {
        console.error('Error creating agent:', error);
        throw new Error(`Failed to create agent: ${error.message}`);
    }
}

/**
 * Agent를 사용하여 메시지 처리
 * @param {string} message - 사용자 메시지
 * @param {object} context - 추가 컨텍스트
 * @returns {Promise<object>}
 */
export async function invokeAgent(message, context = {}) {
    const agent = await createAgent();
    const result = await agent.invoke({
        input: message,
        ...context
    });
    return result;
}

