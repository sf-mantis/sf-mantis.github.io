# LangChain Agent API Server

Node.js 기반 LangChain Agent API 서버로, Ext JS 프론트엔드에서 Ajax 호출을 통해 사용할 수 있습니다.

## 🚀 기능

- **LangChain Agent**: OpenAI를 활용한 AI 에이전트
- **RAG (Retrieval-Augmented Generation)**: 내부 문서 검색 기반 응답 생성
- **메모리 기능**: 세션별 대화 기록 저장 및 관리 (Summarize Buffer Memory)
- **문서 관리**: PDF, DOCX, TXT 파일 업로드 및 자동 인덱싱
- **벡터 검색**: Pinecone 기반 유사도 검색 (추후 ChromaDB 전환 가능)
- **RESTful API**: Express 기반 REST API
- **CORS 지원**: Ext JS 등 프론트엔드에서 호출 가능
- **스트리밍 지원**: Server-Sent Events (SSE)를 통한 실시간 응답
- **에러 핸들링**: 체계적인 에러 처리 및 로깅

## 📋 필수 요구사항

- Node.js 18.0 이상
- npm 또는 yarn
- OpenAI API Key

## 🛠 설치 및 실행

### 1. 의존성 설치

```bash
cd langchain-agent-api
npm install
```

### 2. 환경 변수 설정

`env.example.txt` 파일을 참고하여 `.env` 파일을 생성하고 필요한 값들을 설정하세요:

```bash
# Windows PowerShell
Copy-Item env.example.txt .env

# Linux/Mac
cp env.example.txt .env
```

`.env` 파일을 열어 다음 값들을 설정:

```env
PORT=4000
NODE_ENV=development
OPENAI_API_KEY=your_openai_api_key_here
CORS_ORIGIN=http://localhost:1841
AGENT_TEMPERATURE=0.7
AGENT_MAX_TOKENS=2000
```

### 3. 서버 실행

```bash
# 프로덕션 모드
npm start

# 개발 모드 (자동 재시작)
npm run dev
```

서버가 `http://localhost:4000`에서 실행됩니다.

## 📡 API 엔드포인트

### RAG 검색

```
POST /api/rag/search
```

내부 문서를 검색하여 적절한 응답을 생성합니다.

**요청 본문:**
```json
{
  "query": "회사 정책에 대해 알려주세요",
  "sessionId": "user-123-session-456",
  "context": {},
  "options": {}
}
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "response": "회사 정책에 따르면...",
    "context": {},
    "steps": [],
    "sessionId": "user-123-session-456",
    "hasMemory": true
  }
}
```

### 문서 업로드 및 인덱싱

```
POST /api/documents/upload
```

PDF, DOCX, TXT 파일을 업로드하고 자동으로 인덱싱합니다.

**요청:**
- Content-Type: `multipart/form-data`
- 파일 필드: `file`
- 문서 ID (선택): `documentId`

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "documentId": "doc-1234567890",
    "filename": "policy.pdf",
    "chunksCount": 15,
    "vectorIds": ["vec-1", "vec-2", ...]
  }
}
```

### 문서 검색 (벡터 유사도만)

```
POST /api/rag/documents/search
```

벡터 유사도 검색만 수행합니다 (LLM 응답 없음).

**요청 본문:**
```json
{
  "query": "회사 정책",
  "k": 4,
  "filter": {
    "documentId": "doc-123"
  }
}
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "query": "회사 정책",
    "results": [
      {
        "content": "회사 정책 내용...",
        "metadata": {
          "source": "policy.pdf",
          "documentId": "doc-123"
        },
        "score": 0.85
      }
    ],
    "count": 4
  }
}
```

### 문서 삭제

```
DELETE /api/documents/:documentId
```

특정 문서를 벡터 스토어에서 삭제합니다.

### 문서 재인덱싱

```
POST /api/documents/:documentId/reindex
```

기존 문서를 삭제하고 새로 인덱싱합니다.

### Health Check

```
GET /api/health
```

서버 상태 확인

**응답 예시:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

### Agent 실행

```
POST /api/agent/invoke
```

Agent에 메시지를 전달하고 응답을 받습니다.

**요청 본문:**
```json
{
  "message": "2 + 2는 무엇인가요?",
  "sessionId": "user-123-session-456",
  "context": {},
  "options": {}
}
```

**메모리 기능 사용 (Summarize Buffer Memory):**
- `sessionId`를 제공하면 해당 세션의 대화 기록이 자동으로 저장됩니다
- **최근 20개 메시지**는 원문으로 유지되고, 그 이전 대화는 **자동으로 요약**됩니다
- 다음 요청에서 같은 `sessionId`를 사용하면 이전 대화를 기억합니다
- `sessionId`를 생략하면 메모리 없이 독립적인 요청으로 처리됩니다
- 메모리 효율적이고 비용 절감 효과가 있습니다

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "response": "2 + 2는 4입니다.",
    "context": {},
    "steps": []
  }
}
```

### Agent 스트리밍

```
GET /api/agent/stream
```

Server-Sent Events를 통해 실시간으로 응답을 받습니다.

**주의:** EventSource는 GET 요청만 지원하므로, 쿼리 파라미터로 데이터를 전달합니다.

**쿼리 파라미터:**
- `message` (필수): 사용자 메시지
- `sessionId` (선택): 세션 ID
- `context` (선택): JSON 문자열로 인코딩된 컨텍스트
- `options` (선택): JSON 문자열로 인코딩된 옵션

**사용 예시:**
```
GET /api/agent/stream?message=간단한 계산을 해주세요&sessionId=user-123
```

**Ext JS에서 사용:**
```javascript
const eventSource = new EventSource(
    'http://localhost:4000/api/agent/stream?message=' + 
    encodeURIComponent('간단한 계산을 해주세요') + 
    '&sessionId=' + sessionId
);

eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.done) {
        eventSource.close();
    } else {
        console.log('스트리밍 데이터:', data.chunk);
    }
};
```

### Agent 설정 조회

```
GET /api/agent/config
```

현재 Agent 설정을 조회합니다.

**응답 예시:**
```json
{
  "success": true,
  "config": {
    "temperature": 0.7,
    "maxTokens": 2000,
    "model": "gpt-3.5-turbo"
  }
}
```

### 세션 메모리 초기화

```
DELETE /api/agent/session/:sessionId
```

특정 세션의 대화 기록을 삭제합니다.

**응답 예시:**
```json
{
  "success": true,
  "message": "Session user-123-session-456 memory cleared"
}
```

### 세션 대화 기록 조회

```
GET /api/agent/session/:sessionId/history
```

특정 세션의 대화 기록을 조회합니다.

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "sessionId": "user-123-session-456",
    "recentMessages": [
      {
        "type": "HumanMessage",
        "content": "내 이름은 김남근이야"
      },
      {
        "type": "AIChatMessage",
        "content": "안녕하세요, 김남근님!"
      }
    ],
    "summary": "사용자의 이름은 김남근입니다. 이전 대화에서...",
    "totalMessages": 2,
    "maxRecentMessages": 20
  }
}
```

**메모리 동작 방식:**
- 최근 20개 메시지는 원문으로 저장
- 20개를 초과하면 오래된 메시지가 자동으로 요약됨
- 요약은 LLM을 통해 생성되어 맥락을 유지하면서 압축됨

## 🔌 Ext JS에서 사용하기

### 기본 Ajax 호출 예시

```javascript
Ext.Ajax.request({
    url: 'http://localhost:4000/api/agent/invoke',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    jsonData: {
        message: '안녕하세요, 도와주세요',
        context: {},
        options: {}
    },
    success: function(response) {
        const result = Ext.decode(response.responseText);
        console.log('Agent 응답:', result.data.response);
    },
    failure: function(response) {
        console.error('에러:', response);
    }
});
```

### Store를 사용한 예시

```javascript
Ext.define('MyApp.store.AgentStore', {
    extend: 'Ext.data.Store',
    proxy: {
        type: 'ajax',
        url: 'http://localhost:4000/api/agent/invoke',
        method: 'POST',
        reader: {
            type: 'json',
            rootProperty: 'data'
        }
    },
    listeners: {
        beforeload: function(store, operation) {
            operation.setParams({
                message: store.message,
                context: store.context || {},
                options: store.options || {}
            });
        }
    }
});
```

### 스트리밍 예시 (SSE)

```javascript
const eventSource = new EventSource('http://localhost:4000/api/agent/stream');

eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.done) {
        eventSource.close();
    } else {
        console.log('스트리밍 데이터:', data.chunk);
    }
};
```

## 📁 프로젝트 구조

```
langchain-agent-api/
├── server.js              # Express 서버 진입점
├── package.json           # 프로젝트 설정 및 의존성
├── .env.example           # 환경 변수 예시
├── .gitignore            # Git 제외 파일
├── config/               # 설정 파일
│   └── index.js
├── routes/               # API 라우트
│   ├── agent.js         # Agent 관련 엔드포인트
│   └── health.js        # Health check 엔드포인트
└── agents/                # Agent 구현
    └── langchain-agent.js # LangChain Agent 로직
```

## 🔍 RAG (Retrieval-Augmented Generation)

이 프로젝트는 RAG 기능을 지원하여 내부 문서를 검색하고 그 내용을 기반으로 응답을 생성합니다.

### RAG 워크플로우

1. **문서 업로드**: PDF, DOCX, TXT 파일을 업로드
2. **텍스트 분할**: 문서를 적절한 크기의 청크로 분할
3. **임베딩 생성**: 각 청크를 벡터로 변환
4. **벡터 DB 저장**: Pinecone에 벡터 저장
5. **검색 및 생성**: 사용자 쿼리와 유사한 문서 검색 후 LLM으로 응답 생성

### 벡터 DB 전환 (Pinecone → ChromaDB)

현재는 Pinecone을 사용하지만, `services/vector-store.js`를 수정하여 ChromaDB로 쉽게 전환할 수 있습니다:

```javascript
// ChromaDB 사용 예시
import { Chroma } from '@langchain/chroma';

// VectorStoreService.createStore() 메서드를 수정
static async createStore() {
    const embeddings = EmbeddingService.getEmbeddings();
    return await Chroma.fromExistingCollection(embeddings, {
        collectionName: 'documents',
        url: process.env.CHROMA_URL || 'http://localhost:8000'
    });
}
```

## 🔧 커스터마이징

### 도구 추가

`agents/langchain-agent.js` 또는 `agents/rag-agent.js` 파일에서 `tools` 배열에 새로운 도구를 추가할 수 있습니다:

```javascript
const tools = [
    // 기존 도구들...
    new DynamicStructuredTool({
        name: 'my_custom_tool',
        description: 'Custom tool description',
        schema: z.object({
            // 스키마 정의
        }),
        func: async ({ /* 파라미터 */ }) => {
            // 도구 로직
            return '결과';
        }
    })
];
```

### 프롬프트 수정

`agents/langchain-agent.js`의 `prompt` 변수를 수정하여 Agent의 동작을 변경할 수 있습니다.

## 🐛 문제 해결

### CORS 에러

`.env` 파일에서 `CORS_ORIGIN`을 Ext JS 애플리케이션이 실행되는 도메인으로 설정하세요.

### OpenAI API Key 에러

`.env` 파일에 올바른 `OPENAI_API_KEY`가 설정되어 있는지 확인하세요.

## 📝 라이선스

MIT

