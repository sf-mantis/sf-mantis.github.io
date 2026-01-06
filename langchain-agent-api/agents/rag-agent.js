import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ConversationSummaryBufferMemory } from 'langchain/memory';
import { VectorStoreService } from '../services/vector-store.js';
import { z } from 'zod';

// OpenAI 모델 초기화
const model = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    temperature: parseFloat(process.env.AGENT_TEMPERATURE) || 0.7,
    maxTokens: parseInt(process.env.AGENT_MAX_TOKENS) || 2000,
    openAIApiKey: process.env.OPENAI_API_KEY
});

// 세션별 메모리 저장소
const sessionMemories = new Map();

// 최근 대화 유지 개수 설정
const RECENT_MESSAGES_COUNT = parseInt(process.env.RECENT_MESSAGES_COUNT) || 20;
const AVG_TOKENS_PER_MESSAGE = 100;
const MAX_TOKEN_LIMIT = RECENT_MESSAGES_COUNT * AVG_TOKENS_PER_MESSAGE;

/**
 * 세션별 메모리 가져오기 또는 생성
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
 * RAG Agent 생성
 * @param {string} sessionId - 세션 ID (선택)
 * @returns {Promise<{agent: AgentExecutor, memory: ConversationSummaryBufferMemory|null}>}
 */
export async function createRAGAgent(sessionId = null) {
    try {
        const memory = sessionId ? getOrCreateMemory(sessionId) : null;

        // 문서 검색 도구 정의
        const documentSearchTool = new DynamicStructuredTool({
            name: 'document_search',
            description: 'Searches internal documents for relevant information. Use this when you need to find information from company documents, manuals, or knowledge base.',
            schema: z.object({
                query: z.string().describe('The search query to find relevant documents')
            }),
            func: async ({ query }) => {
                try {
                    const k = parseInt(process.env.RAG_TOP_K) || 4;
                    const results = await VectorStoreService.similaritySearch(query, k);
                    
                    if (results.length === 0) {
                        return 'No relevant documents found.';
                    }
                    
                    // 검색 결과를 포맷팅
                    const formattedResults = results.map((doc, idx) => {
                        return `[Document ${idx + 1}]\nSource: ${doc.metadata.source || 'Unknown'}\nContent: ${doc.pageContent}\n`;
                    }).join('\n---\n\n');
                    
                    return `Found ${results.length} relevant document(s):\n\n${formattedResults}`;
                } catch (error) {
                    console.error('Document search error:', error);
                    return `Error searching documents: ${error.message}`;
                }
            }
        });

        const tools = [documentSearchTool];

        // RAG 프롬프트 템플릿
        const prompt = ChatPromptTemplate.fromMessages([
            ['system', `You are a helpful AI assistant with access to internal company documents. 
            
Use the following guidelines:
- Always search internal documents first when answering questions
- Use the document_search tool to find relevant information
- Cite the source documents when providing answers
- If information is not found in documents, say so clearly
- Combine information from multiple documents when relevant
- Be accurate and cite sources properly
- Remember previous conversation context when available`],
            new MessagesPlaceholder('chat_history'),
            ['human', '{input}'],
            new MessagesPlaceholder('agent_scratchpad')
        ]);

        const agentPrompt = memory 
            ? prompt 
            : ChatPromptTemplate.fromMessages([
                ['system', `You are a helpful AI assistant with access to internal company documents. 
                
Use the following guidelines:
- Always search internal documents first when answering questions
- Use the document_search tool to find relevant information
- Cite the source documents when providing answers
- If information is not found in documents, say so clearly`],
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
        console.error('Error creating RAG agent:', error);
        throw new Error(`Failed to create RAG agent: ${error.message}`);
    }
}

/**
 * RAG Agent를 사용하여 메시지 처리
 * @param {string} message - 사용자 메시지
 * @param {string} sessionId - 세션 ID (선택)
 * @param {object} context - 추가 컨텍스트
 * @returns {Promise<object>}
 */
export async function invokeRAGAgent(message, sessionId = null, context = {}) {
    const { agent, memory } = await createRAGAgent(sessionId);
    
    let inputData = { input: message, ...context };
    
    if (memory) {
        const memoryVariables = await memory.loadMemoryVariables({});
        inputData.chat_history = memoryVariables.chat_history || [];
    }
    
    const result = await agent.invoke(inputData);
    
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
 */
export function clearSessionMemory(sessionId) {
    if (sessionMemories.has(sessionId)) {
        sessionMemories.delete(sessionId);
    }
}

