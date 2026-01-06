import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { agentRouter } from './routes/agent.js';
import { healthRouter } from './routes/health.js';
import { documentsRouter } from './routes/documents.js';
import { ragRouter } from './routes/rag.js';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// 미들웨어 설정
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'data-tracking', 'form-name']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 요청 로깅 미들웨어
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// 라우트 설정
app.use('/api/health', healthRouter);
app.use('/api/agent', agentRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/rag', ragRouter);

// 루트 엔드포인트
app.get('/', (req, res) => {
    res.json({
        message: 'LangChain Agent API Server',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            agent: '/api/agent',
            documents: '/api/documents',
            rag: '/api/rag'
        }
    });
});

// 404 핸들러
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// 에러 핸들러
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 LangChain Agent API Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
});

