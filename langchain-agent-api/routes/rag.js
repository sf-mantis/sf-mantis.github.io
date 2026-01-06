import express from 'express';
import { invokeRAGAgent, clearSessionMemory } from '../agents/rag-agent.js';
import { VectorStoreService } from '../services/vector-store.js';

export const ragRouter = express.Router();

// RAG 검색 및 응답 생성
ragRouter.post('/search', async (req, res) => {
    try {
        const { query, sessionId, context, options } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query is required'
            });
        }

        console.log('RAG search request:', { query, sessionId });

        const result = await invokeRAGAgent(query, sessionId || null, { ...context, ...options });

        res.json({
            success: true,
            data: {
                response: result.output || result,
                context: result.context || {},
                steps: result.steps || [],
                sessionId: sessionId || null,
                hasMemory: !!sessionId
            }
        });
    } catch (error) {
        console.error('RAG search error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to perform RAG search',
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    }
});

// 직접 문서 검색 (벡터 유사도만)
ragRouter.post('/documents/search', async (req, res) => {
    try {
        const { query, k = 4, filter } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query is required'
            });
        }

        const results = await VectorStoreService.similaritySearchWithScore(query, k, filter);

        res.json({
            success: true,
            data: {
                query: query,
                results: results.map(([doc, score]) => ({
                    content: doc.pageContent,
                    metadata: doc.metadata,
                    score: score
                })),
                count: results.length
            }
        });
    } catch (error) {
        console.error('Document search error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to search documents'
        });
    }
});

// 세션 메모리 초기화
ragRouter.delete('/session/:sessionId', (req, res) => {
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

