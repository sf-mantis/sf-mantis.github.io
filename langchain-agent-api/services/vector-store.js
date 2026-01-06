import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { EmbeddingService } from './embedding-service.js';

/**
 * 벡터 스토어 서비스 (Pinecone)
 * 추후 ChromaDB로 전환 가능하도록 추상화
 */
export class VectorStoreService {
    static _pinecone = null;
    static _index = null;

    /**
     * Pinecone 클라이언트 초기화
     */
    static async initialize() {
        if (!this._pinecone) {
            const apiKey = process.env.PINECONE_API_KEY;
            if (!apiKey) {
                throw new Error('PINECONE_API_KEY is not set in environment variables');
            }

            this._pinecone = new Pinecone({
                apiKey: apiKey
            });
        }
        return this._pinecone;
    }

    /**
     * Pinecone 인덱스 가져오기
     * @returns {Promise<Pinecone.Index>}
     */
    static async getIndex() {
        if (!this._index) {
            await this.initialize();
            const indexName = process.env.PINECONE_INDEX_NAME || 'langchain-docs';
            this._index = this._pinecone.Index(indexName);
        }
        return this._index;
    }

    /**
     * LangChain PineconeStore 생성
     * @returns {Promise<PineconeStore>}
     */
    static async createStore() {
        const index = await this.getIndex();
        const embeddings = EmbeddingService.getEmbeddings();
        
        return await PineconeStore.fromExistingIndex(embeddings, {
            pineconeIndex: index,
            namespace: process.env.PINECONE_NAMESPACE || undefined
        });
    }

    /**
     * 문서를 벡터 스토어에 추가
     * @param {Document[]} documents - 추가할 문서 청크들
     * @param {object} metadata - 추가 메타데이터
     * @returns {Promise<string[]>} - 추가된 문서 ID들
     */
    static async addDocuments(documents, metadata = {}) {
        const store = await this.createStore();
        const ids = await store.addDocuments(
            documents.map(doc => ({
                ...doc,
                metadata: {
                    ...doc.metadata,
                    ...metadata,
                    addedAt: new Date().toISOString()
                }
            }))
        );
        return ids;
    }

    /**
     * 벡터 유사도 검색
     * @param {string} query - 검색 쿼리
     * @param {number} k - 반환할 결과 개수 (기본값: 4)
     * @param {object} filter - 메타데이터 필터
     * @returns {Promise<Document[]>}
     */
    static async similaritySearch(query, k = 4, filter = null) {
        const store = await this.createStore();
        return await store.similaritySearch(query, k, filter);
    }

    /**
     * 벡터 유사도 검색 (점수 포함)
     * @param {string} query - 검색 쿼리
     * @param {number} k - 반환할 결과 개수
     * @param {object} filter - 메타데이터 필터
     * @returns {Promise<Array<{doc: Document, score: number}>>}
     */
    static async similaritySearchWithScore(query, k = 4, filter = null) {
        const store = await this.createStore();
        return await store.similaritySearchWithScore(query, k, filter);
    }

    /**
     * 특정 문서 ID로 삭제
     * @param {string[]} ids - 삭제할 문서 ID들
     * @returns {Promise<void>}
     */
    static async deleteDocuments(ids) {
        const index = await this.getIndex();
        // Pinecone은 delete1() 메서드를 사용하며, 여러 ID는 반복 호출 필요
        for (const id of ids) {
            await index.delete1([id]);
        }
    }

    /**
     * 메타데이터 필터로 문서 삭제
     * @param {object} filter - 메타데이터 필터
     * @returns {Promise<void>}
     */
    static async deleteByMetadata(filter) {
        const index = await this.getIndex();
        // Pinecone은 필터를 사용한 삭제를 위해 delete() 메서드 사용
        await index.deleteMany({ filter });
    }

    /**
     * 네임스페이스의 모든 문서 삭제
     * @param {string} namespace - 네임스페이스 (선택)
     * @returns {Promise<void>}
     */
    static async deleteAll(namespace = null) {
        const index = await this.getIndex();
        // Pinecone은 deleteAll() 대신 delete()를 사용하여 모든 벡터 삭제
        // 모든 ID를 삭제하려면 먼저 쿼리로 ID를 가져와야 함
        // 또는 네임스페이스만 삭제하는 경우
        if (namespace) {
            await index.deleteMany({ namespace });
        } else {
            // 전체 삭제는 위험하므로 주의 필요
            // 실제로는 스토어를 통해 관리하는 것이 좋음
            throw new Error('deleteAll without namespace is not supported. Use deleteByMetadata with specific filter.');
        }
    }
}

