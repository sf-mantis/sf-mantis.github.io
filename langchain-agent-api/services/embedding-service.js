import { OpenAIEmbeddings } from '@langchain/openai';

/**
 * 임베딩 서비스
 * 텍스트를 벡터로 변환
 */
export class EmbeddingService {
    static _embeddings = null;

    /**
     * 임베딩 모델 인스턴스 가져오기 (싱글톤)
     * @returns {OpenAIEmbeddings}
     */
    static getEmbeddings() {
        if (!this._embeddings) {
            this._embeddings = new OpenAIEmbeddings({
                modelName: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
                openAIApiKey: process.env.OPENAI_API_KEY,
                dimensions: parseInt(process.env.EMBEDDING_DIMENSION) || undefined
            });
        }
        return this._embeddings;
    }

    /**
     * 텍스트를 임베딩 벡터로 변환
     * @param {string|string[]} texts - 변환할 텍스트
     * @returns {Promise<number[][]>}
     */
    static async embedText(texts) {
        const embeddings = this.getEmbeddings();
        return await embeddings.embedDocuments(Array.isArray(texts) ? texts : [texts]);
    }

    /**
     * 쿼리 텍스트를 임베딩 벡터로 변환
     * @param {string} query - 쿼리 텍스트
     * @returns {Promise<number[]>}
     */
    static async embedQuery(query) {
        const embeddings = this.getEmbeddings();
        return await embeddings.embedQuery(query);
    }
}

