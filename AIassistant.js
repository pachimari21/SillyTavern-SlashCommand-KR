/* ==========================================
   ai.js - AI 채팅 및 API 통신 전용 스크립트 (Updated)
   ========================================== */

const ICONS = {
    SEND: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
    STOP: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>`,
    REROLL: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>`,
    LEFT: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`,
    RIGHT: `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`
};

// UUID 생성기 
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 마크다운 설정 초기화 
function initMarkdown() {
    if (typeof marked !== 'undefined') {
        const renderer = new marked.Renderer();
        renderer.code = function (code, language) {
            if (typeof code === 'object' && code !== null) {
                if (code.text) code = code.text;
                if (code.lang && !language) language = code.lang;
            }
            code = String(code || "");
            const validLang = (language || 'text').toLowerCase();
            const displayLang = validLang === 'text' ? 'Text' : validLang;
            const escapedCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

            return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-lang">${displayLang}</span><button class="code-copy-btn" onclick="window.copyCode(this)"><span>📄</span> 복사</button></div><pre><code class="language-${validLang}">${escapedCode}</code></pre></div>`;
        };
        renderer.link = function (href, title, text) {
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" title="${title || ''}">${text}</a>`;
        };
        marked.setOptions({ renderer: renderer, breaks: true, gfm: true });
    }
}

// 글로벌 복사 함수
window.copyCode = function (btn) {
    const codeBlock = btn.closest('.code-block-wrapper').querySelector('pre code');
    if (codeBlock) {
        navigator.clipboard.writeText(codeBlock.innerText).then(() => {
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<span>✅</span>';
            setTimeout(() => btn.innerHTML = originalHtml, 2000);
        }).catch(err => alert('복사 실패'));
    }
};

// ★ 메인 함수
function initAiSystem(getWikiContextCallback) {
    initMarkdown();

    const PROVIDERS = {
        openai: {
            name: "OpenAI",
            endpoint: "https://api.openai.com/v1",
            models: [
                // GPT-5 & Future
                "gpt-5",
                "gpt-5-2025-08-07",
                "gpt-chat-latest",
                "gpt-5-mini",
                "gpt-5-mini-2025-08-07",
                "gpt-5-nano",
                "gpt-5-nano-2025-08-07",

                // GPT-o1 (Reasoning)
                "o1-pro-2025-03-19",
                "o1-preview",
                "o1-preview-2024-09-12",
                "o1-mini",
                "o1-mini-2024-09-12",
                "o1-mini-2025-01-31",

                // GPT-4o
                "gpt-4o",
                "gpt-4o-2024-11-20",
                "gpt-4o-2024-08-06",
                "gpt-4o-2024-05-13",
                "chatgpt-4o-latest",
                "gpt-4o-mini",
                "gpt-4o-mini-2024-07-18",

                // GPT-4.5 & 4 Turbo
                "gpt-4.5-preview-2025-02-27",
                "gpt-4-turbo-preview",
                "gpt-4-0125-preview",
                "gpt-4-1106-preview",
                "gpt-4",
                "gpt-4-32k",

                // GPT-3.5
                "gpt-3.5-turbo",
                "gpt-3.5-turbo-0125",
                "gpt-3.5-turbo-1106",
                "gpt-3.5-turbo-16k"
            ]
        },
        anthropic: {
            name: "Anthropic",
            endpoint: "https://api.anthropic.com/v1",
            models: [
                // Claude 4
                "claude-opus-4-20250514",
                "claude-4-sonnet-20250514",
                "claude-4-sonnet-thinking",
                "claude-4-opus-thinking",

                // Claude 3.7
                "claude-3-7-sonnet-latest",
                "claude-3-7-sonnet-20250219",

                // Claude 3.5
                "claude-3-5-sonnet-latest",
                "claude-3-5-sonnet-20241022",
                "claude-3-5-sonnet-20240620",
                "claude-3-5-haiku-20241022",

                // Claude 3
                "claude-3-opus-20240229",
                "claude-3-sonnet-20240229",
                "claude-3-haiku-20240307",

                // Legacy
                "claude-2.1",
                "claude-2.0",
                "claude-1.3"
            ]
        },
        google: {
            name: "Google Gemini",
            endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
            models: [
                // Gemini 2.5
                "gemini-3-pro-preview",
                "gemini-2.5-pro",
                "gemini-2.5-flash",
                "gemini-2.5-flash-preview-05-20",
                "gemini-2.5-pro-preview-05-06",
                "gemini-2.5-pro-preview-03-25",
                "gemini-2.5-flash-preview-04-17",

                // Gemini 2.0
                "gemini-2.0-flash",
                "gemini-2.0-pro-exp",
                "gemini-2.0-pro-exp-02-05",
                "gemini-2.0-flash-exp",
                "gemini-2.0-flash-exp-image-generation",
                "gemini-2.0-flash-lite-preview",
                "gemini-2.0-flash-lite-preview-02-05",
                "gemini-2.0-flash-001",
                "gemini-2.0-flash-thinking-exp",
                "gemini-2.0-flash-thinking-exp-01-21",
                "gemini-2.0-flash-thinking-exp-1219",

                // Gemini 1.5
                "gemini-1.5-pro",
                "gemini-1.5-pro-latest",
                "gemini-1.5-pro-002",
                "gemini-1.5-pro-001",
                "gemini-1.5-pro-exp-0801",
                "gemini-1.5-pro-exp-0827",
                "gemini-1.5-flash",
                "gemini-1.5-flash-latest",
                "gemini-1.5-flash-002",
                "gemini-1.5-flash-001",
                "gemini-1.5-flash-8b",
                "gemini-1.5-flash-exp-0827",
                "gemini-1.5-flash-8b-exp-0827",
                "gemini-1.5-flash-8b-exp-0924",

                // Experimental
                "gemini-exp-1114",
                "gemini-exp-1121",
                "gemini-exp-1206",

                // Legacy (1.0)
                "gemini-1.0-pro",
                "gemini-1.0-pro-latest",
                "gemini-1.0-pro-001",
                "gemini-pro",
                "gemini-ultra",
                "gemini-1.0-ultra-latest",

                // Gemma
                "gemma-3-27b-it",
            ]
        },
        cohere: {
            name: "Cohere",
            endpoint: "https://api.cohere.ai/v1", // Cohere 기본 엔드포인트 추가
            models: [
                "command-a-03-2025",
                "c4ai-aya-expanse-8b",
                "c4ai-aya-expanse-32b",
                "command-r",
                "command-r-08-2024",
                "command-r-plus",
                "command-r-plus-08-2024"
            ]
        },
        custom: { name: "Custom", endpoint: "", models: [] }
    };

    // DOM 요소 가져오기
    const els = {
        sidebarToggle: document.getElementById('ai-sidebar-toggle'),
        sessionSidebar: document.getElementById('ai-session-sidebar'),
        toggleBtn: document.getElementById('ai-chat-toggle'),
        container: document.getElementById('ai-chat-container'),
        closeBtn: document.getElementById('ai-chat-close'),
        expandBtn: document.getElementById('ai-expand-btn'),
        settingsToggle: document.getElementById('ai-settings-toggle'),
        settingsWrapper: document.getElementById('ai-settings-wrapper'),
        newChatBtn: document.getElementById('ai-new-chat-btn'),
        sessionList: document.getElementById('ai-session-list'),
        exportBtn: document.getElementById('ai-export-btn'),
        importTrigger: document.getElementById('ai-import-trigger'),
        importFile: document.getElementById('ai-import-file'),
        clearAllBtn: document.getElementById('ai-clear-all-btn'),
        apiKeyInput: document.getElementById('ai-api-key'),
        saveKeyBtn: document.getElementById('ai-save-key-btn'),
        modelSelect: document.getElementById('ai-model-select'),
        userInput: document.getElementById('ai-user-input'),
        sendBtn: document.getElementById('ai-send-btn'),
        chatLog: document.getElementById('ai-chat-log'),
        tokenSlider: document.getElementById('ai-token-slider'),
        tokenValue: document.getElementById('ai-token-value'),
        toggleCustomModelLink: document.getElementById('toggle-custom-model'),
        customModelRow: document.getElementById('custom-model-row'),
        newModelProvider: document.getElementById('ai-new-model-provider'),
        customEndpointWrapper: document.getElementById('ai-custom-endpoint-wrapper'),
        customModelName: document.getElementById('ai-custom-model-name'),
        customEndpoint: document.getElementById('ai-custom-endpoint'),
        addModelBtn: document.getElementById('ai-add-model-btn'),
        deleteModelBtn: document.getElementById('ai-delete-model-btn'),
        importChatTrigger: document.getElementById('ai-import-chat-trigger'), // [추가]
        importChatFile: document.getElementById('ai-import-chat-file'),       // [추가]
    };

    if (!els.toggleBtn) return;

    // Provider Select 동적 생성
    let providerSelect = document.getElementById('ai-provider-select');
    if (!providerSelect) {
        providerSelect = document.createElement('select');
        providerSelect.id = 'ai-provider-select';
        providerSelect.className = 'ai-select';
        providerSelect.style.marginRight = '5px';
        providerSelect.style.flex = '1';
        for (const [key, val] of Object.entries(PROVIDERS)) {
            const opt = document.createElement('option');
            opt.value = key; opt.text = val.name;
            providerSelect.appendChild(opt);
        }
        els.modelSelect.parentNode.insertBefore(providerSelect, els.modelSelect);
        els.modelSelect.style.flex = '2';
    }

    // 채팅 세션 관리자 (기능 보강)
    const ChatManager = {
        key: 'ai_chat_sessions_v4',
        data: { sessions: [], activeSessionId: null },
        init() {
            const saved = localStorage.getItem(this.key);
            if (saved) try { this.data = JSON.parse(saved); } catch (e) { }
            if (this.data.sessions.length === 0) this.createNewSession("새 채팅");
            else if (!this.data.activeSessionId) this.data.activeSessionId = this.data.sessions[0].id;
        },
        save() { localStorage.setItem(this.key, JSON.stringify(this.data)); },
        createNewSession(title = "새 채팅") {
            const newSession = { id: generateUUID(), title: title, messages: [], lastUpdated: Date.now() };
            this.data.sessions.unshift(newSession);
            this.data.activeSessionId = newSession.id;
            this.save();
            return newSession;
        },
        getActiveSession() { return this.data.sessions.find(s => s.id === this.data.activeSessionId) || this.createNewSession(); },
        exportSession(id) {
            const session = this.data.sessions.find(s => s.id === id);
            if (!session) return alert("채팅을 찾을 수 없습니다.");

            const safeTitle = session.title.replace(/[^a-z0-9가-힣\s]/gi, '').trim() || 'chat';
            const fileName = `${safeTitle}_${new Date().toISOString().slice(0, 10)}.json`;

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
            const anchor = document.createElement('a');
            anchor.href = dataStr;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
        },

        importSingleSession(jsonString) {
            try {
                const session = JSON.parse(jsonString);

                if (!session.messages || !Array.isArray(session.messages)) {
                    alert("올바른 채팅 데이터가 아닙니다.");
                    return false;
                }

                session.id = generateUUID();
                session.lastUpdated = Date.now();
                session.title = "[가져옴] " + (session.title || "제목 없음");

                this.data.sessions.unshift(session);
                this.switchSession(session.id);
                return true;
            } catch (e) {
                console.error(e);
                alert("파일 파싱 오류: JSON 형식이 아닙니다.");
                return false;
            }
        },
        // 스와이프 구조 지원
        addMessageToActive(role, content) {
            const session = this.getActiveSession();
            session.messages.push({
                role,
                content,
                swipes: [content],
                swipeIndex: 0,
                timestamp: Date.now()
            });
            session.lastUpdated = Date.now();

            if (role === 'user' && session.title === "새 채팅") {
                session.title = content.length > 20 ? content.substring(0, 20) + "..." : content;
            }
            this.data.sessions.sort((a, b) => b.lastUpdated - a.lastUpdated);
            this.save();
        },
        // 봇 메시지 상태 저장 (리롤/스와이프 반영)
        saveBotMessageState(content, swipes, index) {
            const session = this.getActiveSession();
            if (session.messages.length > 0) {
                const lastMsg = session.messages[session.messages.length - 1];
                if (lastMsg.role === 'bot') {
                    lastMsg.content = content;
                    lastMsg.swipes = swipes;
                    lastMsg.swipeIndex = index;
                    this.save();
                }
            }
        },
        deleteSession(id) {
            this.data.sessions = this.data.sessions.filter(s => s.id !== id);
            if (this.data.sessions.length === 0) this.createNewSession();
            else if (this.data.activeSessionId === id) this.data.activeSessionId = this.data.sessions[0].id;
            this.save();
        },
        switchSession(id) {
            if (this.data.sessions.some(s => s.id === id)) {
                this.data.activeSessionId = id;
                this.save();
                return true;
            }
            return false;
        },
        clearAll() { this.data.sessions = []; this.data.activeSessionId = null; localStorage.removeItem(this.key); this.init(); },
        exportData() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.data));
            const anchor = document.createElement('a');
            anchor.href = dataStr;
            anchor.download = "sillytavern_wiki_chat_" + new Date().toISOString().slice(0, 10) + ".json";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
        },
        importData(jsonString) {
            try {
                const parsed = JSON.parse(jsonString);
                if (parsed.sessions && Array.isArray(parsed.sessions)) {
                    this.data = parsed;
                    if (!this.data.activeSessionId && this.data.sessions.length > 0) this.data.activeSessionId = this.data.sessions[0].id;
                    this.save();
                    return true;
                }
            } catch (e) { }
            return false;
        }
    };

    ChatManager.init();

    let isGenerating = false;
    let abortController = null;
    let lastUserPrompt = "";

    // --- UI 이벤트 리스너 ---
    providerSelect.addEventListener('change', () => { populateModelOptions(); updateCustomUIState(); updateApiKeyDisplay(); localStorage.setItem('ai_provider', providerSelect.value); });
    els.modelSelect.addEventListener('change', () => localStorage.setItem('ai_selected_model', els.modelSelect.value));

    if (els.sidebarToggle) {
        els.sidebarToggle.addEventListener('click', () => {
            els.sessionSidebar.classList.toggle('collapsed');
        });
    }

    els.settingsToggle.addEventListener('click', () => els.settingsWrapper.classList.toggle('collapsed'));
    els.toggleBtn.addEventListener('click', () => {
        els.container.classList.remove('hidden');
        setTimeout(() => els.userInput.focus(), 100);
    });
    els.closeBtn.addEventListener('click', () => els.container.classList.add('hidden'));
    els.expandBtn.addEventListener('click', () => {
        els.container.classList.toggle('expanded');
        // 아이콘 변경 로직
        els.expandBtn.innerHTML = els.container.classList.contains('expanded') ?
            `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M3 21l7-7"/></svg>` :
            `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
    });

    els.newChatBtn.addEventListener('click', () => {
        ChatManager.createNewSession(); renderSessionList(); renderChatLog();
        // 모바일 편의성: 사이드바가 열려있으면 그대로 둠
    });
    els.exportBtn.addEventListener('click', () => ChatManager.exportData());
    els.importTrigger.addEventListener('click', () => els.importFile.click());
    els.importFile.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                if (ChatManager.importData(evt.target.result)) { alert('가져오기 성공'); renderSessionList(); renderChatLog(); }
                else alert('파일 오류');
            };
            reader.readAsText(e.target.files[0]);
        }
        e.target.value = '';
    });
    els.clearAllBtn.addEventListener('click', () => { if (confirm('모든 기록을 삭제합니까?')) { ChatManager.clearAll(); renderSessionList(); renderChatLog(); } });

    els.sendBtn.addEventListener('click', () => sendMessage());
    els.userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

    if (els.tokenSlider && els.tokenValue) {
        const savedToken = localStorage.getItem('ai_token_limit');
        if (savedToken) {
            els.tokenSlider.value = savedToken;
            els.tokenValue.textContent = savedToken;
        }
        els.tokenSlider.addEventListener('input', function () {
            els.tokenValue.textContent = this.value;
            localStorage.setItem('ai_token_limit', this.value);
        });
    }

    els.saveKeyBtn.addEventListener('click', () => {
        localStorage.setItem(`ai_api_key_${providerSelect.value}`, els.apiKeyInput.value.trim());
        alert('API Key가 저장되었습니다.');
    });

    els.toggleCustomModelLink.addEventListener('click', (e) => { e.preventDefault(); els.customModelRow.classList.toggle('hidden'); });
    if (els.newModelProvider) {
        els.newModelProvider.addEventListener('change', function () {
            if (this.value === 'custom') els.customEndpointWrapper.classList.remove('hidden');
            else els.customEndpointWrapper.classList.add('hidden');
        });
    }
    els.addModelBtn.addEventListener('click', () => {
        const name = els.customModelName.value.trim();
        const endpoint = els.customEndpoint.value.trim();
        if (name) {
            let models = JSON.parse(localStorage.getItem('ai_custom_models_v2') || '[]');
            if (models.some(m => m.name === name)) return alert('이름 중복');
            models.push({ name, endpoint, provider: els.newModelProvider.value });
            localStorage.setItem('ai_custom_models_v2', JSON.stringify(models));
            if (providerSelect.value === 'custom') populateModelOptions();
            els.customModelName.value = ''; els.customEndpoint.value = ''; els.customModelRow.classList.add('hidden');
        }
    });
    els.deleteModelBtn.addEventListener('click', () => {
        if (providerSelect.value === 'custom' && confirm('삭제?')) {
            let models = JSON.parse(localStorage.getItem('ai_custom_models_v2') || '[]');
            models = models.filter(m => m.name !== els.modelSelect.value);
            localStorage.setItem('ai_custom_models_v2', JSON.stringify(models));
            populateModelOptions();
        }
    });

    if (els.importChatTrigger && els.importChatFile) {
        els.importChatTrigger.addEventListener('click', () => els.importChatFile.click());
        els.importChatFile.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    if (ChatManager.importSingleSession(evt.target.result)) {
                        alert('채팅을 성공적으로 가져왔습니다.');
                        renderSessionList();
                        renderChatLog();
                    }
                };
                reader.readAsText(e.target.files[0]);
            }
            e.target.value = ''; // 초기화
        });
    }

    function updateSendButtonState() {
        els.sendBtn.innerHTML = isGenerating ? ICONS.STOP : ICONS.SEND;
        els.sendBtn.classList.toggle('generating', isGenerating);
    }

    // --- 핵심 기능: 메시지 전송 및 API 호출 (업데이트됨) ---
    async function sendMessage(manualInput = null, isReroll = false, targetBotMessageDiv = null) {
        // 생성 중 중단 로직
        if (isGenerating) {
            if (abortController) abortController.abort();
            isGenerating = false;
            updateSendButtonState();
            document.querySelectorAll('.thinking').forEach(el => el.remove());
            return;
        }

        let question;
        // 리롤 로직: 마지막 질문 재사용
        if (isReroll) {
            question = lastUserPrompt;
            if (!question) {
                // 저장된 마지막 유저 메시지 찾기
                const session = ChatManager.getActiveSession();
                const lastUserMsg = session.messages.slice().reverse().find(m => m.role === 'user');
                if (lastUserMsg) {
                    question = lastUserMsg.content;
                    lastUserPrompt = question;
                }
            }
            if (!question) return;
        } else {
            question = manualInput || els.userInput.value.trim();
            if (!question) return;
            lastUserPrompt = question; // 질문 저장

            ChatManager.addMessageToActive('user', question);
            addMessageUI(question, 'user');
            els.userInput.value = '';
            els.userInput.style.height = 'auto';
        }

        isGenerating = true;
        updateSendButtonState();
        abortController = new AbortController();
        const signal = abortController.signal;

        // 로딩 UI
        const loaderHtml = '<div class="loader-3"><span></span><span></span></div>';
        const loadingDiv = addMessageUI(loaderHtml, 'bot', true);

        const apiKey = els.apiKeyInput.value.trim();
        const providerKey = providerSelect.value;
        const modelName = els.modelSelect.value;
        const maxTokens = parseInt(els.tokenSlider.value) || 1000;
        const session = ChatManager.getActiveSession();

        // 문맥 구성
        let recentHistory = session.messages.slice(-10); // 최근 10개
        // 리롤 중이라면, 방금 생성된(또는 생성 중인) 봇 메시지는 히스토리에서 제외해야 함
        if (isReroll && recentHistory.length > 0 && recentHistory[recentHistory.length - 1].role === 'bot') {
            recentHistory.pop();
        }
        // 현재 질문이 히스토리에 중복으로 들어가지 않게 필터링 (필요 시)
        recentHistory = recentHistory.filter(m => m.content !== question);

        const systemContext = typeof getWikiContextCallback === 'function' ? getWikiContextCallback() : "";

        try {
            if (!apiKey && providerKey !== 'custom') throw new Error("API Key가 설정되지 않았습니다.");

            let answer = "";
            let response, data;
            let baseUrl = PROVIDERS[providerKey]?.endpoint || "";

            // Custom Endpoint 처리
            if (providerKey === 'custom') {
                const opt = els.modelSelect.options[els.modelSelect.selectedIndex];
                baseUrl = opt.getAttribute('data-endpoint') || "";
            } else if (providerKey === 'anthropic') {
                baseUrl = PROVIDERS.anthropic.endpoint + "/messages";
            } else if (providerKey === 'google') {
                baseUrl = `${PROVIDERS.google.endpoint}/${modelName}:generateContent?key=${apiKey}`;
            }

            // URL 보정
            if (!baseUrl.endsWith('/chat/completions') && providerKey !== 'anthropic' && providerKey !== 'google') {
                baseUrl = baseUrl.replace(/\/+$/, '') + '/chat/completions';
            }

            // --- Google Gemini 호출 ---
            if (providerKey === 'google') {
                // 히스토리 변환
                const historyParts = recentHistory.map(m => ({ role: m.role === 'bot' ? 'model' : 'user', parts: [{ text: m.content }] }));

                response = await fetch(baseUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            { role: 'user', parts: [{ text: `[System Instruction]\n${systemContext}` }] },
                            ...historyParts,
                            { role: 'user', parts: [{ text: question }] }
                        ],
                        generationConfig: { maxOutputTokens: maxTokens }
                    }),
                    signal: signal
                });
                data = await response.json();
                if (data.error) throw new Error(data.error.message);
                answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "응답을 생성할 수 없습니다.";
            }
            // --- Anthropic Claude 호출 ---
            else if (providerKey === 'anthropic') {
                const historyMsgs = recentHistory.map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content }));

                response = await fetch(baseUrl, {
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json',
                        'dangerously-allow-browser': 'true'
                    },
                    body: JSON.stringify({
                        model: modelName,
                        max_tokens: maxTokens,
                        system: `SillyTavern Helper.\n${systemContext}`,
                        messages: [...historyMsgs, { role: "user", content: question }]
                    }),
                    signal: signal
                });
                data = await response.json();
                if (data.error) throw new Error(data.error.message);
                answer = data.content?.[0]?.text || "응답 없음";
            }
            // --- OpenAI 및 Custom 호출 ---
            else {
                const historyMsgs = recentHistory.map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content }));

                response = await fetch(baseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelName,
                        max_tokens: maxTokens,
                        messages: [
                            { role: "system", content: systemContext },
                            ...historyMsgs,
                            { role: "user", content: question }
                        ]
                    }),
                    signal: signal
                });
                data = await response.json();
                if (data.error) throw new Error(data.error.message);
                answer = data.choices?.[0]?.message?.content || "응답 없음";
            }

            // 3. 응답 처리
            loadingDiv.remove();

            if (isReroll && targetBotMessageDiv) {
                // 리롤인 경우 기존 봇 메시지 배열에 추가
                targetBotMessageDiv.swipes.push(answer);
                targetBotMessageDiv.swipeIndex = targetBotMessageDiv.swipes.length - 1;
                targetBotMessageDiv.updateSwipeUI();
            } else {
                // 새 응답
                ChatManager.addMessageToActive('bot', answer);
                addMessageUI(answer, 'bot');
            }

        } catch (err) {
            loadingDiv.remove();
            if (err.name !== 'AbortError') {
                addMessageUI(`❌ 오류 발생: ${err.message}`, 'bot');
            }
        } finally {
            isGenerating = false;
            abortController = null;
            updateSendButtonState();
            renderSessionList(); // 제목 업데이트 등 반영
        }
    }

    // --- UI 렌더링 헬퍼 (스와이프 지원) ---
    function renderSessionList() {
        els.sessionList.innerHTML = '';
        ChatManager.data.sessions.forEach(s => {
            const div = document.createElement('div');
            div.className = `ai-session-item ${s.id === ChatManager.data.activeSessionId ? 'active' : ''}`;

            // 1. 제목 영역
            const titleSpan = document.createElement('span');
            titleSpan.textContent = s.title;
            titleSpan.style.flex = '1';
            titleSpan.style.overflow = 'hidden';
            titleSpan.style.textOverflow = 'ellipsis';
            titleSpan.onclick = () => { ChatManager.switchSession(s.id); renderSessionList(); renderChatLog(); };

            // 2. 버튼들을 담을 컨테이너 (우측 정렬용)
            const btnGroup = document.createElement('div');
            btnGroup.style.display = 'flex';
            btnGroup.style.gap = '5px';

            // 3. [추가] 내보내기 버튼 (아이콘: 저장/다운로드)
            const exportBtn = document.createElement('button');
            exportBtn.className = 'ai-session-btn';
            exportBtn.title = '이 채팅만 내보내기';
            exportBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
            exportBtn.onclick = (e) => {
                e.stopPropagation();
                ChatManager.exportSession(s.id);
            };

            // 4. 삭제 버튼 (기존 코드 유지 또는 단순화)
            const delBtn = document.createElement('button');
            delBtn.className = 'ai-session-btn delete-btn'; // CSS 스타일링을 위해 클래스 추가 권장
            delBtn.title = '삭제';
            // 기존의 긴 SVG 대신 간단한 X 아이콘 사용 (원하시면 기존 trash-svg 유지 가능)
            delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('이 채팅을 삭제하시겠습니까?')) {
                    ChatManager.deleteSession(s.id);
                    renderSessionList();
                    renderChatLog();
                }
            };

            // 요소 조립
            btnGroup.append(exportBtn, delBtn);
            div.append(titleSpan, btnGroup);
            els.sessionList.appendChild(div);
        });
    }
    function renderChatLog() {
        els.chatLog.innerHTML = '';
        const session = ChatManager.getActiveSession();

        if (session.messages.length === 0) {
            // [수정됨] 상세한 첫 인사 메시지
            const greeting = `### 👋 안녕하세요! **STScript 위키 도우미**입니다.

저는 위키에 수록된 방대한 **명령어(/), 매크로({{}}), 퀵 리플라이(QR)** 정보를 모두 학습하고 있습니다. 복잡한 **STScript** 작성이 막막할 때 저에게 물어봐 주세요!

---

#### 💡 **이렇게 물어보세요 (사용 예시)**

* **명령어 검색:** "배경을 변경하는 명령어가 뭐야?"
* **문법 질문:** "조건문(/if)은 어떻게 사용해?"
* **스크립트 작성:** "주사위를 굴려서 10 이상이면 '성공', 아니면 '실패'라고 출력하는 QR 스크립트 짜줘."
* **매크로 활용:** "현재 캐릭터 이름을 가져오는 매크로는?"

---

#### 💰 **토큰 비용 안내 **
* **1회 질문 당 예상 비용:** 약 **3,000 ~ 5,000 토큰** + α (질문/답변 길이)

궁금한 점이 있다면 무엇이든 물어봐 주세요! 🥰`;

            addMessageUI(greeting, 'bot');
        } else {
            session.messages.forEach(m => {
                addMessageUI(m.content, m.role, false, m.swipes, m.swipeIndex);
            });
        }
    }
    // messageIndex 매개변수 (삭제/수정 식별용)
    function addMessageUI(text, role, isThinking = false, savedSwipes = null, savedIndex = 0, messageIndex = -1) {
        const div = document.createElement('div');
        div.className = `ai-message ${role}`;

        // 마크다운 본문 영역
        const contentDiv = document.createElement('div');
        contentDiv.className = 'markdown-body';
        div.appendChild(contentDiv);

        // 텍스트 렌더링 함수
        const renderText = (txt) => {
            if (role === 'bot') {
                if (isThinking) {
                    contentDiv.innerHTML = txt;
                    div.classList.add('thinking');
                } else if (typeof marked !== 'undefined') {
                    try { contentDiv.innerHTML = marked.parse(txt); } catch (e) { contentDiv.innerHTML = txt.replace(/\n/g, '<br>'); }
                    div.classList.remove('thinking');
                } else {
                    contentDiv.innerHTML = txt.replace(/\n/g, '<br>');
                    div.classList.remove('thinking');
                }
            } else {
                contentDiv.textContent = txt; // 유저는 텍스트 그대로
            }
        };
        renderText(text);

        // 봇 메시지 하단 Footer (스와이프/리롤)
        if (role === 'bot' && !isThinking) {
            div.swipes = savedSwipes || [text];
            div.swipeIndex = savedIndex !== undefined ? savedIndex : 0;

            const footer = document.createElement('div');
            footer.className = 'message-footer';

            const navDiv = document.createElement('div');
            navDiv.className = 'swipe-controls';

            const prevBtn = document.createElement('button');
            prevBtn.className = 'nav-btn prev';
            prevBtn.innerHTML = ICONS.LEFT;

            const counter = document.createElement('span');
            counter.className = 'swipe-counter';
            counter.innerText = '1/1';

            const nextBtn = document.createElement('button');
            nextBtn.className = 'nav-btn next';
            nextBtn.innerHTML = ICONS.RIGHT;

            const rerollBtn = document.createElement('button');
            rerollBtn.className = 'reroll-btn';
            rerollBtn.innerHTML = ICONS.REROLL;
            rerollBtn.title = "재생성";

            navDiv.append(prevBtn, counter, nextBtn);
            footer.append(navDiv, rerollBtn);
            div.appendChild(footer);

            div.updateSwipeUI = () => {
                const current = div.swipeIndex + 1;
                const total = div.swipes.length;
                counter.innerText = `${current}/${total}`;

                prevBtn.disabled = div.swipeIndex === 0;
                nextBtn.disabled = div.swipeIndex === total - 1;

                renderText(div.swipes[div.swipeIndex]);

                ChatManager.saveBotMessageState(
                    div.swipes[div.swipeIndex],
                    div.swipes,
                    div.swipeIndex
                );
            };

            prevBtn.onclick = () => { if (div.swipeIndex > 0) { div.swipeIndex--; div.updateSwipeUI(); } };
            nextBtn.onclick = () => { if (div.swipeIndex < div.swipes.length - 1) { div.swipeIndex++; div.updateSwipeUI(); } };
            rerollBtn.onclick = () => { if (isGenerating) return; sendMessage(null, true, div); };

            div.updateSwipeUI();
        }

        // ==========================================
        // [추가됨] 컨트롤 버튼 그룹 (복사/수정/삭제)
        // ==========================================
        if (!isThinking) {
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'msg-controls';

            // 1. 복사 버튼
            const copyBtn = document.createElement('button');
            copyBtn.className = 'msg-btn copy';
            copyBtn.title = '복사';
            copyBtn.innerHTML = '📋'; // 또는 SVG 아이콘
            copyBtn.onclick = () => {
                const currentText = (div.swipes) ? div.swipes[div.swipeIndex] : contentDiv.textContent;
                navigator.clipboard.writeText(currentText).then(() => {
                    copyBtn.innerHTML = '✅'; setTimeout(() => copyBtn.innerHTML = '📋', 1500);
                });
            };

            // 2. 수정 버튼 (저장된 메시지인 경우에만 - index가 0 이상)
            if (messageIndex >= 0) {
                const editBtn = document.createElement('button');
                editBtn.className = 'msg-btn edit';
                editBtn.title = '수정';
                editBtn.innerHTML = '✏️';

                editBtn.onclick = () => {
                    // 수정 모드 진입
                    controlsDiv.style.display = 'none'; // 컨트롤 숨김
                    contentDiv.style.display = 'none';  // 기존 텍스트 숨김
                    if (div.querySelector('.message-footer')) div.querySelector('.message-footer').style.display = 'none';

                    const currentText = (div.swipes) ? div.swipes[div.swipeIndex] : text;

                    const editWrapper = document.createElement('div');
                    editWrapper.className = 'edit-wrapper';

                    const textarea = document.createElement('textarea');
                    textarea.className = 'edit-textarea';
                    textarea.value = currentText;

                    const actionDiv = document.createElement('div');
                    actionDiv.className = 'edit-actions';

                    const saveBtn = document.createElement('button');
                    saveBtn.className = 'ai-btn-small';
                    saveBtn.style.backgroundColor = '#2ecc71'; // 초록색
                    saveBtn.textContent = '저장';

                    const cancelBtn = document.createElement('button');
                    cancelBtn.className = 'ai-btn-small';
                    cancelBtn.style.backgroundColor = '#95a5a6'; // 회색
                    cancelBtn.textContent = '취소';

                    // 저장 로직
                    saveBtn.onclick = () => {
                        const newContent = textarea.value;
                        ChatManager.editMessage(messageIndex, newContent);
                        renderChatLog(); // 전체 다시 그리기 (가장 안전)
                    };

                    // 취소 로직
                    cancelBtn.onclick = () => {
                        editWrapper.remove();
                        contentDiv.style.display = 'block';
                        controlsDiv.style.display = 'flex';
                        if (div.querySelector('.message-footer')) div.querySelector('.message-footer').style.display = 'flex';
                    };

                    actionDiv.append(cancelBtn, saveBtn);
                    editWrapper.append(textarea, actionDiv);
                    div.insertBefore(editWrapper, contentDiv);
                    textarea.focus();
                };

                // 3. 삭제 버튼
                const delBtn = document.createElement('button');
                delBtn.className = 'msg-btn delete';
                delBtn.title = '삭제';
                delBtn.innerHTML = '🗑️';
                delBtn.onclick = () => {
                    if (confirm('이 메시지를 삭제하시겠습니까?')) {
                        ChatManager.deleteMessage(messageIndex);
                        renderChatLog(); // 리스트 갱신
                    }
                };

                controlsDiv.appendChild(editBtn);
                controlsDiv.appendChild(delBtn);
            }

            // 복사 버튼은 항상 맨 앞에
            controlsDiv.insertBefore(copyBtn, controlsDiv.firstChild);
            div.appendChild(controlsDiv);
        }

        els.chatLog.appendChild(div);
        els.chatLog.scrollTop = els.chatLog.scrollHeight;
        return div;
    }

    function populateModelOptions() {
        const providerKey = providerSelect.value;
        els.modelSelect.innerHTML = '';

        let models = [];
        if (providerKey === 'custom') {
            models = JSON.parse(localStorage.getItem('ai_custom_models_v2') || '[]').map(m => ({ value: m.name, text: `[${m.provider}] ${m.name}`, endpoint: m.endpoint }));
        } else {
            models = PROVIDERS[providerKey]?.models.map(m => ({ value: m, text: m })) || [];
        }

        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.value; opt.text = m.text;
            if (m.endpoint) opt.setAttribute('data-endpoint', m.endpoint);
            els.modelSelect.appendChild(opt);
        });

        const savedApiKey = localStorage.getItem(`ai_api_key_${providerKey}`);
        els.apiKeyInput.value = savedApiKey || '';

        const savedModel = localStorage.getItem('ai_selected_model');
        if (savedModel && [...els.modelSelect.options].some(o => o.value === savedModel)) els.modelSelect.value = savedModel;
    }

    // UI 업데이트 헬퍼
    function updateCustomUIState() {
        const isCustom = providerSelect.value === 'custom';
        els.toggleCustomModelLink.style.display = isCustom ? 'block' : 'none';
        els.deleteModelBtn.classList.toggle('hidden', !isCustom);
        if (!isCustom) els.customModelRow.classList.add('hidden');
    }
    function updateApiKeyDisplay() {
        els.apiKeyInput.value = localStorage.getItem(`ai_api_key_${providerSelect.value}`) || '';
    }

    // 초기 실행
    const savedProvider = localStorage.getItem('ai_provider');
    if (savedProvider && PROVIDERS[savedProvider]) providerSelect.value = savedProvider;
    loadSettings();
    renderSessionList();
    renderChatLog();
    updateSendButtonState();

    function loadSettings() {
        populateModelOptions();
        updateCustomUIState();
        updateApiKeyDisplay();
    }
}