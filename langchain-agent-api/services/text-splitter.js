import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

/**
 * 텍스트 분할 서비스
 * 문서를 적절한 크기의 청크로 분할
 */
export class TextSplitterService {
    /**
     * 텍스트 분할기 생성
     * @param {number} chunkSize - 청크 크기 (기본값: 1000)
     * @param {number} chunkOverlap - 청크 겹침 (기본값: 200)
     * @returns {RecursiveCharacterTextSplitter}
     */
    static createSplitter(chunkSize = 1000, chunkOverlap = 200) {
        return new RecursiveCharacterTextSplitter({
            chunkSize: chunkSize,
            chunkOverlap: chunkOverlap,
            separators: ['\n\n', '\n', ' ', ''], // 한국어도 고려한 구분자
        });
    }

    /**
     * 문서를 청크로 분할
     * @param {Document[]} documents - 분할할 문서들
     * @param {number} chunkSize - 청크 크기
     * @param {number} chunkOverlap - 청크 겹침
     * @returns {Promise<Document[]>}
     */
    static async splitDocuments(documents, chunkSize = null, chunkOverlap = null) {
        const defaultChunkSize = parseInt(process.env.CHUNK_SIZE) || 1000;
        const defaultChunkOverlap = parseInt(process.env.CHUNK_OVERLAP) || 200;
        
        const splitter = this.createSplitter(
            chunkSize || defaultChunkSize,
            chunkOverlap || defaultChunkOverlap
        );
        
        return await splitter.splitDocuments(documents);
    }
}

