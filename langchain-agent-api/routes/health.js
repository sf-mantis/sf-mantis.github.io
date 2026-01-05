import express from 'express';

export const healthRouter = express.Router();

// Health check 엔드포인트
healthRouter.get('/', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

