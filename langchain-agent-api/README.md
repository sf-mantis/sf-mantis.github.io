# LangChain Agent API Server

Node.js 기반 LangChain Agent API 서버로, Ext JS 프론트엔드에서 Ajax 호출을 통해 사용할 수 있습니다.

## 🚀 기능

- **LangChain Agent**: OpenAI를 활용한 AI 에이전트
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
PORT=3000
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

서버가 `http://localhost:3000`에서 실행됩니다.

## 📡 API 엔드포인트

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
  "context": {},
  "options": {}
}
```

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
POST /api/agent/stream
```

Server-Sent Events를 통해 실시간으로 응답을 받습니다.

**요청 본문:**
```json
{
  "message": "간단한 계산을 해주세요",
  "context": {},
  "options": {}
}
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

## 🔌 Ext JS에서 사용하기

### 기본 Ajax 호출 예시

```javascript
Ext.Ajax.request({
    url: 'http://localhost:3000/api/agent/invoke',
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
        url: 'http://localhost:3000/api/agent/invoke',
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
const eventSource = new EventSource('http://localhost:3000/api/agent/stream');

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

## 🔧 커스터마이징

### 도구 추가

`agents/langchain-agent.js` 파일에서 `tools` 배열에 새로운 도구를 추가할 수 있습니다:

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

