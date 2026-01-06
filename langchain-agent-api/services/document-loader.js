import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { Document } from '@langchain/core/documents';

/**
 * 문서 로더 서비스
 * PDF, DOCX, TXT 등 다양한 형식의 문서를 로드
 */
export class DocumentLoaderService {
    /**
     * PDF 파일 로드
     * @param {string} filePath - 파일 경로
     * @returns {Promise<Document[]>}
     */
    static async loadPDF(filePath) {
        try {
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdfParse(dataBuffer);
            
            return [new Document({
                pageContent: data.text,
                metadata: {
                    source: path.basename(filePath),
                    type: 'pdf',
                    pages: data.numpages,
                    info: data.info
                }
            })];
        } catch (error) {
            console.error('Error loading PDF:', error);
            throw new Error(`Failed to load PDF: ${error.message}`);
        }
    }

    /**
     * DOCX 파일 로드
     * @param {string} filePath - 파일 경로
     * @returns {Promise<Document[]>}
     */
    static async loadDOCX(filePath) {
        try {
            const dataBuffer = await fs.readFile(filePath);
            const result = await mammoth.extractRawText({ buffer: dataBuffer });
            
            return [new Document({
                pageContent: result.value,
                metadata: {
                    source: path.basename(filePath),
                    type: 'docx'
                }
            })];
        } catch (error) {
            console.error('Error loading DOCX:', error);
            throw new Error(`Failed to load DOCX: ${error.message}`);
        }
    }

    /**
     * TXT 파일 로드
     * @param {string} filePath - 파일 경로
     * @returns {Promise<Document[]>}
     */
    static async loadTXT(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            
            return [new Document({
                pageContent: content,
                metadata: {
                    source: path.basename(filePath),
                    type: 'txt'
                }
            })];
        } catch (error) {
            console.error('Error loading TXT:', error);
            throw new Error(`Failed to load TXT: ${error.message}`);
        }
    }

    /**
     * 파일 확장자에 따라 적절한 로더 선택
     * @param {string} filePath - 파일 경로
     * @returns {Promise<Document[]>}
     */
    static async loadDocument(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        
        switch (ext) {
            case '.pdf':
                return await this.loadPDF(filePath);
            case '.docx':
            case '.doc':
                return await this.loadDOCX(filePath);
            case '.txt':
            case '.md':
                return await this.loadTXT(filePath);
            default:
                throw new Error(`Unsupported file type: ${ext}`);
        }
    }

    /**
     * 버퍼에서 직접 문서 로드 (업로드된 파일용)
     * @param {Buffer} buffer - 파일 버퍼
     * @param {string} filename - 파일명
     * @returns {Promise<Document[]>}
     */
    static async loadFromBuffer(buffer, filename) {
        const ext = path.extname(filename).toLowerCase();
        
        switch (ext) {
            case '.pdf':
                try {
                    const data = await pdfParse(buffer);
                    return [new Document({
                        pageContent: data.text,
                        metadata: {
                            source: filename,
                            type: 'pdf',
                            pages: data.numpages
                        }
                    })];
                } catch (error) {
                    throw new Error(`Failed to parse PDF: ${error.message}`);
                }
            case '.docx':
            case '.doc':
                try {
                    const result = await mammoth.extractRawText({ buffer });
                    return [new Document({
                        pageContent: result.value,
                        metadata: {
                            source: filename,
                            type: 'docx'
                        }
                    })];
                } catch (error) {
                    throw new Error(`Failed to parse DOCX: ${error.message}`);
                }
            case '.txt':
            case '.md':
                try {
                    const content = buffer.toString('utf-8');
                    return [new Document({
                        pageContent: content,
                        metadata: {
                            source: filename,
                            type: 'txt'
                        }
                    })];
                } catch (error) {
                    throw new Error(`Failed to parse TXT: ${error.message}`);
                }
            default:
                throw new Error(`Unsupported file type: ${ext}`);
        }
    }
}

