import dotenv from 'dotenv';

dotenv.config();

export const config = {
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        temperature: parseFloat(process.env.AGENT_TEMPERATURE) || 0.7,
        maxTokens: parseInt(process.env.AGENT_MAX_TOKENS) || 2000
    },
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
    }
};

// 필수 환경 변수 검증
if (!config.openai.apiKey) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY is not set. Agent functionality will be limited.');
}

