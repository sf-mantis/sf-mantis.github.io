import express from 'express';
import { createAgent } from '../agents/langchain-agent.js';

export const agentRouter = express.Router();

// Agent 실행 엔드포인트
agentRouter.post('/invoke', async (req, res) => {
    try {
        const { message, context, options } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        console.log('Agent invoke request:', { message, context, options });

        const agent = await createAgent();
        const result = await agent.invoke({
            input: message,
            context: context || {},
            ...options
        });

        res.json({
            success: true,
            data: {
                response: result.output || result,
                context: result.context || {},
                steps: result.steps || []
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

// Agent 스트리밍 엔드포인트 (SSE)
agentRouter.post('/stream', async (req, res) => {
    try {
        const { message, context, options } = req.body;

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

        const agent = await createAgent();
        const stream = await agent.stream({
            input: message,
            context: context || {},
            ...options
        });

        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
    } catch (error) {
        console.error('Agent stream error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
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

