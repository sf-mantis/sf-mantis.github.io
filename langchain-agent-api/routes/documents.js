import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { DocumentLoaderService } from '../services/document-loader.js';
import { TextSplitterService } from '../services/text-splitter.js';
import { VectorStoreService } from '../services/vector-store.js';

export const documentsRouter = express.Router();

// Multer 설정 (파일 업로드)
const upload = multer({
    dest: 'documents/uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.docx', '.doc', '.txt', '.md'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${ext} is not allowed. Allowed types: ${allowedTypes.join(', ')}`));
        }
    }
});

// 문서 업로드 및 인덱싱
documentsRouter.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const filePath = req.file.path;
        const filename = req.file.originalname;
        const documentId = req.body.documentId || `doc-${Date.now()}`;

        console.log(`Processing document: ${filename}`);

        // 1. 문서 로드
        const buffer = await fs.readFile(filePath);
        const documents = await DocumentLoaderService.loadFromBuffer(buffer, filename);

        // 2. 텍스트 분할
        const chunks = await TextSplitterService.splitDocuments(documents);

        // 3. 메타데이터에 문서 ID 추가
        const chunksWithMetadata = chunks.map(chunk => ({
            ...chunk,
            metadata: {
                ...chunk.metadata,
                documentId: documentId,
                filename: filename
            }
        }));

        // 4. 벡터 스토어에 추가
        const ids = await VectorStoreService.addDocuments(chunksWithMetadata, {
            documentId: documentId,
            filename: filename
        });

        // 5. 임시 파일 삭제
        await fs.unlink(filePath);

        res.json({
            success: true,
            data: {
                documentId: documentId,
                filename: filename,
                chunksCount: chunks.length,
                vectorIds: ids
            }
        });
    } catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process document'
        });
    }
});

// 문서 삭제
documentsRouter.delete('/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;

        await VectorStoreService.deleteByMetadata({
            documentId: documentId
        });

        res.json({
            success: true,
            message: `Document ${documentId} deleted`
        });
    } catch (error) {
        console.error('Document delete error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete document'
        });
    }
});

// 문서 재인덱싱
documentsRouter.post('/:documentId/reindex', upload.single('file'), async (req, res) => {
    try {
        const { documentId } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        // 기존 문서 삭제
        await VectorStoreService.deleteByMetadata({ documentId });

        // 새로 인덱싱
        const filePath = req.file.path;
        const filename = req.file.originalname;
        const buffer = await fs.readFile(filePath);

        const documents = await DocumentLoaderService.loadFromBuffer(buffer, filename);
        const chunks = await TextSplitterService.splitDocuments(documents);

        const chunksWithMetadata = chunks.map(chunk => ({
            ...chunk,
            metadata: {
                ...chunk.metadata,
                documentId: documentId,
                filename: filename
            }
        }));

        const ids = await VectorStoreService.addDocuments(chunksWithMetadata, {
            documentId: documentId,
            filename: filename
        });

        await fs.unlink(filePath);

        res.json({
            success: true,
            data: {
                documentId: documentId,
                filename: filename,
                chunksCount: chunks.length,
                vectorIds: ids
            }
        });
    } catch (error) {
        console.error('Document reindex error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to reindex document'
        });
    }
});

