import express from 'express';
import { invokeAgent, createAgent, clearSessionMemory, getSessionHistory } from '../agents/langchain-agent.js';

export const agentRouter = express.Router();

// Agent 실행 엔드포인트 (메모리 지원)
agentRouter.post('/invoke', async (req, res) => {
    try {
        const { message, sessionId, context, options } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        console.log('Agent invoke request:', { message, sessionId, context, options });

        // 세션 ID가 있으면 메모리와 함께 Agent 실행
        const result = await invokeAgent(message, sessionId || null, { ...context, ...options });

        // 세션 ID가 있으면 대화 기록도 함께 반환
        let memoryInfo = null;
        if (sessionId) {
            memoryInfo = await getSessionHistory(sessionId);
        }

        res.json({
            success: true,
            data: {
                response: result.output || result,
                context: result.context || {},
                steps: result.steps || [],
                sessionId: sessionId || null,
                hasMemory: !!sessionId,
                memoryInfo: memoryInfo
            }
        });
    } catch (error) {
        console.error('Agent invoke error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to invoke agent',
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    }
});

// Agent 스트리밍 엔드포인트 (SSE, 스트리밍은 청크 단위의 응답을 모아 수동으로 메모리 저장 필요)
// GET 요청으로 변경하여 EventSource와 호환되도록 함
agentRouter.get('/stream', async (req, res) => {
    try {
        // GET 요청에서는 쿼리 파라미터로 데이터 받기
        const { message, sessionId } = req.query;
        const context = req.query.context ? JSON.parse(req.query.context) : {};
        const options = req.query.options ? JSON.parse(req.query.options) : {};

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // SSE 헤더 설정
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const { agent, memory } = await createAgent(sessionId || null);
        
        // 메모리가 있으면 chat_history를 포함해야 함
        let inputData = { input: message, ...context, ...options };
        
        if (memory) {
            // 메모리에서 대화 기록 로드 (최근 메시지 + 요약)
            const memoryVariables = await memory.loadMemoryVariables({});
            inputData.chat_history = memoryVariables.chat_history || [];
        }
        
        const stream = await agent.stream(inputData);

        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }

        res.write(`data: ${JSON.stringify({ done: true, sessionId: sessionId || null })}\n\n`);
        res.end();
    } catch (error) {
        console.error('Agent stream error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

// 세션 메모리 초기화 엔드포인트
agentRouter.delete('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        clearSessionMemory(sessionId);
        res.json({
            success: true,
            message: `Session ${sessionId} memory cleared`
        });
    } catch (error) {
        console.error('Clear session error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to clear session'
        });
    }
});

// 세션 대화 기록 조회 엔드포인트
agentRouter.get('/session/:sessionId/history', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const history = await getSessionHistory(sessionId);
        res.json({
            success: true,
            data: {
                sessionId,
                history: history
            }
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get history'
        });
    }
});

// Agent 설정 조회
agentRouter.get('/config', (req, res) => {
    res.json({
        success: true,
        config: {
            temperature: parseFloat(process.env.AGENT_TEMPERATURE) || 0.7,
            maxTokens: parseInt(process.env.AGENT_MAX_TOKENS) || 2000,
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
        }
    });
});

