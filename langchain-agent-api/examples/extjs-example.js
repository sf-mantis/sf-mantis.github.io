/**
 * Ext JS에서 LangChain Agent API를 사용하는 예제
 * 
 * 사용 방법:
 * 1. 이 파일을 Ext JS 애플리케이션에 포함
 * 2. API 서버 URL을 환경에 맞게 수정
 * 3. AgentService를 사용하여 Agent 호출
 */

Ext.define('MyApp.service.AgentService', {
    singleton: true,
    
    apiUrl: 'http://localhost:3000/api/agent',
    
    /**
     * Agent에 메시지를 전송하고 응답을 받습니다
     * @param {String} message - 사용자 메시지
     * @param {Object} context - 추가 컨텍스트 (선택)
     * @param {Object} options - 추가 옵션 (선택)
     * @returns {Promise} Agent 응답
     */
    invoke: function(message, context, options) {
        return new Promise(function(resolve, reject) {
            Ext.Ajax.request({
                url: this.apiUrl + '/invoke',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonData: {
                    message: message,
                    context: context || {},
                    options: options || {}
                },
                success: function(response) {
                    try {
                        const result = Ext.decode(response.responseText);
                        if (result.success) {
                            resolve(result.data);
                        } else {
                            reject(new Error(result.error || 'Unknown error'));
                        }
                    } catch (e) {
                        reject(new Error('Failed to parse response: ' + e.message));
                    }
                },
                failure: function(response) {
                    try {
                        const error = Ext.decode(response.responseText);
                        reject(new Error(error.error || 'Request failed'));
                    } catch (e) {
                        reject(new Error('Request failed: ' + response.statusText));
                    }
                },
                scope: this
            });
        });
    },
    
    /**
     * Agent 설정을 조회합니다
     * @returns {Promise} Agent 설정
     */
    getConfig: function() {
        return new Promise(function(resolve, reject) {
            Ext.Ajax.request({
                url: this.apiUrl + '/config',
                method: 'GET',
                success: function(response) {
                    try {
                        const result = Ext.decode(response.responseText);
                        if (result.success) {
                            resolve(result.config);
                        } else {
                            reject(new Error(result.error || 'Unknown error'));
                        }
                    } catch (e) {
                        reject(new Error('Failed to parse response: ' + e.message));
                    }
                },
                failure: function(response) {
                    reject(new Error('Request failed: ' + response.statusText));
                },
                scope: this
            });
        });
    },
    
    /**
     * Health check를 수행합니다
     * @returns {Promise} 서버 상태
     */
    healthCheck: function() {
        return new Promise(function(resolve, reject) {
            Ext.Ajax.request({
                url: 'http://localhost:3000/api/health',
                method: 'GET',
                success: function(response) {
                    try {
                        const result = Ext.decode(response.responseText);
                        resolve(result);
                    } catch (e) {
                        reject(new Error('Failed to parse response: ' + e.message));
                    }
                },
                failure: function(response) {
                    reject(new Error('Request failed: ' + response.statusText));
                }
            });
        });
    }
});

// 사용 예제:
/*
// 1. 기본 사용
MyApp.service.AgentService.invoke('안녕하세요, 도와주세요')
    .then(function(result) {
        console.log('Agent 응답:', result.response);
    })
    .catch(function(error) {
        console.error('에러:', error);
    });

// 2. 컨텍스트와 함께 사용
MyApp.service.AgentService.invoke(
    '계산해주세요',
    { userId: '123', sessionId: 'abc' },
    { temperature: 0.5 }
)
    .then(function(result) {
        console.log('응답:', result.response);
    });

// 3. Ext JS Store와 함께 사용
Ext.define('MyApp.store.AgentStore', {
    extend: 'Ext.data.Store',
    
    fields: ['response', 'context', 'steps'],
    
    proxy: {
        type: 'ajax',
        url: 'http://localhost:3000/api/agent/invoke',
        method: 'POST',
        reader: {
            type: 'json',
            rootProperty: 'data'
        }
    },
    
    loadAgentResponse: function(message, context, options) {
        this.getProxy().setExtraParams({
            message: message,
            context: context || {},
            options: options || {}
        });
        this.load();
    }
});

// 4. Ext JS Form과 함께 사용
Ext.define('MyApp.view.AgentForm', {
    extend: 'Ext.form.Panel',
    
    items: [{
        xtype: 'textfield',
        name: 'message',
        fieldLabel: '메시지',
        allowBlank: false
    }, {
        xtype: 'button',
        text: '전송',
        handler: function(btn) {
            const form = btn.up('form');
            const message = form.getValues().message;
            
            MyApp.service.AgentService.invoke(message)
                .then(function(result) {
                    Ext.Msg.alert('응답', result.response);
                })
                .catch(function(error) {
                    Ext.Msg.alert('에러', error.message);
                });
        }
    }]
});
*/

