// ==========================================
// script.js - 통합 데이터 로딩 및 렌더링
// ==========================================

// [1] 전역 변수
let wikiData = { commands: [], macros: [], quickReplies: [] }; // 전체 데이터 저장
let searchQuery = '';
let currentCommandCategory = 'all';
let currentMacroCategory = 'all-macros';
let currentQrCategory = 'all-qr';

// [2] 데이터 로드 및 렌더링 메인 함수
async function loadAndRenderData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        
        // 데이터 저장 (없을 경우 빈 배열 처리)
        wikiData.commands = data.commands || [];
        wikiData.macros = data.macros || [];
        wikiData.quickReplies = data.quickReplies || [];

        // 3개 섹션 렌더링 실행
        renderCommands(wikiData.commands);
        renderMacros(wikiData.macros);
        renderQuickReplies(wikiData.quickReplies);

        console.log("모든 데이터 렌더링 완료");

    } catch (error) {
        console.error("데이터 로드 실패:", error);
        document.querySelectorAll('.no-results').forEach(el => el.textContent = "데이터 로드 실패 (JSON 형식을 확인하세요)");
    }
}

// -------------------------------------------------------
// 2-1. 명령어 렌더링 (수정됨: 카테고리 그룹화 적용)
// -------------------------------------------------------
function renderCommands(commands) {
    const container = document.getElementById('command-list-container');
    if (!container) return;
    container.innerHTML = '';

    // 1. 카테고리별 한글 제목 매핑
    const categoryTitles = {
        "basic": "기본 명령어",
        "math": "수학 연산",
        "variable": "변수 관리",
        "audio": "오디오 관련",
        "api": "API 관련",
        "chat": "채팅 관련",
        "ui": "인터페이스",
        "tools": "도구 관련",
        "db": "데이터 관련",
        "lalib": "LALib 확장"
    };

    // 2. 데이터 그룹화
    const grouped = {};
    commands.forEach(cmd => {
        const cat = cmd.category || 'other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(cmd);
    });

    // 3. 그룹별 렌더링
    // 정의된 카테고리 순서대로 출력하거나, 데이터에 있는 순서대로 출력
    // 여기서는 categoryTitles에 정의된 순서 + 나머지로 처리
    const definedOrder = Object.keys(categoryTitles);
    const existingCategories = Object.keys(grouped);
    
    // 순서 정렬: 정의된 순서가 먼저 오고, 없는 것은 뒤로
    existingCategories.sort((a, b) => {
        const idxA = definedOrder.indexOf(a);
        const idxB = definedOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    existingCategories.forEach(cat => {
        const items = grouped[cat];
        const title = categoryTitles[cat] || cat; // 매핑된 제목이 없으면 영문 키 사용

        // 해당 카테고리의 명령어 아이템 HTML 생성
        const itemsHTML = items.map(cmd => {
            // 인자(Arguments) 처리
            let argsHTML = '';
            if (cmd.arguments && Array.isArray(cmd.arguments)) {
                argsHTML = cmd.arguments.map(arg => {
                    const classes = ['argument'];
                    if (arg.isOptional) classes.push('optional');
                    const text = arg.text || arg;
                    return `<span class="${classes.join(' ')}">${text}</span>`;
                }).join(' ');
            } else if (typeof cmd.arguments === 'string' && cmd.arguments.trim() !== '') {
                argsHTML = `<span class="argument">${cmd.arguments}</span>`;
            }

            // 예제(Example) 처리
            let exampleHTML = '';
            if (cmd.example) {
                exampleHTML = `<div class="example">${cmd.example}</div>`;
            }

            return `
                <div class="item command-item" data-search-text="${cmd.name.toLowerCase()}"> <div class="command-name">
                        <span class="monospace">${cmd.name}</span>
                    </div>
                    <div class="help-content">
                        ${cmd.description}
                        ${exampleHTML} 
                    </div>
                    <div class="arguments">
                        ${argsHTML} 
                    </div>
                    <div class="returns">리턴값: ${cmd.returns}</div>
                </div>
            `;
        }).join('');

        // 섹션 래퍼 생성
        const sectionHTML = `
            <div class="command-section" data-command-category="${cat}">
                <div class="category" data-category="${cat}">${title}</div> <div class="command-items-wrapper">
                    ${itemsHTML}
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', sectionHTML);
    });
}

// -------------------------------------------------------
// 2-2. 매크로 렌더링
// -------------------------------------------------------
function renderMacros(macros) {
    const container = document.getElementById('macro-list-container');
    if (!container) return;
    container.innerHTML = '';

    // 카테고리별로 그룹화
    const grouped = {};
    const categoryTitles = {
        "basic-macros": "기본적인 매크로",
        "ai-macros": "AI 생성 조정 매크로",
        "environment-macros": "환경 감지 매크로",
        "advanced-macros": "고급 모드 및 컨텍스트 템플릿 매크로",
        "chat-macros": "채팅 변수 매크로"
    };

    macros.forEach(macro => {
        if (!grouped[macro.category]) grouped[macro.category] = [];
        grouped[macro.category].push(macro);
    });

    // 그룹별 HTML 생성
    for (const [cat, items] of Object.entries(grouped)) {
        const title = categoryTitles[cat] || cat;
        
        let itemsHTML = items.map(m => `
            <li class="macro-item">
                <div class="macro-name">${m.name}</div>
                <div class="macro-description">${m.description}</div>
            </li>
        `).join('');

        const sectionHTML = `
            <div class="macro-section" data-macro-category="${cat}">
                <h2 class="macro-title">${title}</h2>
                <ul class="macro-list">
                    ${itemsHTML}
                </ul>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', sectionHTML);
    }
}

// -------------------------------------------------------
// 2-3. 퀵 리플라이 렌더링 (복잡한 구조 처리)
// -------------------------------------------------------
function renderQuickReplies(qrs) {
    const container = document.getElementById('qr-list-container');
    if (!container) return;
    container.innerHTML = '';

    qrs.forEach(qr => {
        let contentHTML = '';

        // content 배열을 순회하며 타입별로 HTML 생성
        if (qr.content && Array.isArray(qr.content)) {
            contentHTML = qr.content.map(block => {
                if (block.type === 'html') {
                    return `<div class="help-content" style="border:none; padding:0; background:transparent;">${block.value}</div>`;
                } 
                else if (block.type === 'grid') {
                    const gridItems = block.items.map(i => `
                        <div class="guide-item" ${i.fullWidth ? 'style="grid-column: 1 / -1;"' : ''}>
                            <span class="guide-term">${i.term}</span>
                            <p class="guide-desc">${i.desc}</p>
                            ${i.ex ? `<span class="guide-ex">${i.ex}</span>` : ''}
                        </div>
                    `).join('');
                    return `<div class="guide-grid">${gridItems}</div>`;
                }
                else if (block.type === 'header') {
                    return `<div class="subcategory-header">${block.value}</div>`;
                }
                else if (block.type === 'command') { // 라이브러리 등 명령어 스타일
                    return `
                        <div class="item">
                            <div class="command-name"><span class="monospace">${block.name}</span></div>
                            <div class="help-content">
                                ${block.description}
                                ${block.example ? `<div class="example">${block.example}</div>` : ''}
                            </div>
                        </div>
                    `;
                }
            }).join('');
        }

        // 가이드 박스 조립
        const boxHTML = `
            <div class="guide-box ${qr.isOpen ? 'open' : ''}" data-qr-category="${qr.category}">
                <div class="guide-header" onclick="toggleGuide(this)">
                    <h3 class="guide-title">${qr.title}</h3>
                    <span class="guide-toggle-icon">${qr.isOpen ? '▲' : '▼'}</span>
                </div>
                <div class="guide-content-wrapper" ${qr.isOpen ? 'style="max-height: 1000px; padding: 0 20px 20px;"' : ''}>
                    ${contentHTML}
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', boxHTML);
    });
}

// [3] AI용 데이터 추출 (JSON 기반으로 변경하여 성능 향상)
// AIassistant.js 내부의 getWikiContext 함수 교체

// [업데이트] AI에게 보낼 컨텍스트 생성 함수 (QR 데이터 포함)
function getWikiContext() {
    // 1. [페르소나 & 기본 지침]
    const intro = [
        "당신은 'SillyTavern(실리태번)'의 스크립트(STScript) 작성 및 문제 해결을 돕는 AI 전문가입니다.",
        "사용자의 질문에 대해 한국어로 친절하게 답변하고, 스크립트 예시가 필요하면 코드 블록으로 제공하세요.",
        "답변 시 아래의 [문법 규칙]과 [가이드 및 명령어 목록]을 참고하여 사실에 입각해 답변해야 합니다."
    ].join('\n');

    // 2. [핵심 문법 가이드]
    const syntaxGuide = [
        "\n### [STScript 핵심 문법 규칙]",
        "1. 명령어 실행: 모든 명령어는 슬래시(/)로 시작합니다. (예: /echo, /sys)",
        "2. 파이프(|): 앞 명령어의 결과를 뒤 명령어의 입력으로 전달합니다. (예: /echo 안녕 | /setvar key=myVar)",
        "3. 매크로/변수: {{variable}} 형태로 값을 호출합니다. (예: {{user}}, {{char}}, {{getvar::score}})",
        "4. 클로저(Closure): 하위 스크립트 블록은 {: ... :} 로 감쌉니다. (조건문, 반복문 등에서 사용)",
        "5. 주석: // 내용",
        "6. 인자: key=value 형태 또는 순서대로 입력."
    ].join('\n');

    // 3. [데이터 추출 시작]
    let contextData = ["\n### [가이드 및 명령어 목록]"];

    // (A) 퀵 리플라이(QR) 가이드 데이터 추출 (추가된 부분)
    const qrTab = document.getElementById('quick-replies');
    if (qrTab) {
        contextData.push("\n[퀵 리플라이(QR) 기능 가이드]");
        qrTab.querySelectorAll('.guide-box').forEach(box => {
            // 가이드 제목
            const title = box.querySelector('.guide-title')?.textContent.trim();
            if (title) contextData.push(`\n#### ${title}`);

            // 가이드 내부 텍스트 (일반 설명)
            const content = box.querySelector('.help-content');
            if (content) {
                const text = content.innerText.replace(/\n\s+/g, '\n').trim();
                if(text) contextData.push(text);
            }

            // 가이드 내부 용어 정의 (Term : Desc)
            box.querySelectorAll('.guide-item').forEach(item => {
                const term = item.querySelector('.guide-term')?.textContent.trim();
                const desc = item.querySelector('.guide-desc')?.textContent.trim();
                const ex = item.querySelector('.guide-ex')?.textContent.trim();
                
                if (term && desc) {
                    let line = `- ${term}: ${desc}`;
                    if(ex) line += ` (예시: ${ex})`;
                    contextData.push(line);
                }
            });
        });
    }

    // (B) 매크로 데이터 추출
    contextData.push("\n[매크로 목록]");
    document.querySelectorAll('.macro-item').forEach(item => {
        const name = item.querySelector('.macro-name')?.textContent.trim();
        const desc = item.querySelector('.macro-description')?.textContent.trim();
        if (name) contextData.push(`- ${name}: ${desc}`);
    });

    // (C) 명령어 데이터 추출
    contextData.push("\n[명령어 목록]");
    document.querySelectorAll('.item').forEach(item => {
        const name = item.querySelector('.command-name')?.textContent.replace(/\s+/g, ' ').trim();
        
        let desc = "";
        const helpContent = item.querySelector('.help-content');
        if (helpContent) {
            // 텍스트만 추출하고 너무 긴 공백 제거
            desc = helpContent.textContent.replace(/\s+/g, ' ').trim();
            // 토큰 절약을 위해 설명이 너무 길면 자름 (선택 사항)
            if (desc.length > 200) desc = desc.substring(0, 200) + "..."; 
        }
        
        if (name) contextData.push(`- ${name}: ${desc}`);
    });

    // 4. 최종 병합 반환
    return `${intro}\n${syntaxGuide}\n${contextData.join('\n')}`;
}

// [4] 초기화 및 이벤트 리스너
document.addEventListener('DOMContentLoaded', async function () {
    // 1. 데이터 로드 및 렌더링
    await loadAndRenderData();

    // 2. AI 시스템 연결
    if (typeof initAiSystem === 'function') {
        initAiSystem(getWikiContext);
    }

    // --- UI 로직 (기존 코드 유지 및 최적화) ---

    // 검색 기능
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function () {
        searchQuery = this.value.toLowerCase();
        // 현재 활성화된 탭에 따라 필터링 실행
        if (document.getElementById('commands').classList.contains('active')) filterCommandItems();
        else if (document.getElementById('macros').classList.contains('active')) filterMacroItems();
        else if (document.getElementById('quick-replies').classList.contains('active')) filterQrItems();
    });

    // 탭 전환
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabLinks = document.querySelectorAll('.tab-link');
    
    function setActiveTab(tabId) {
        document.querySelectorAll('.tab-button, .tab-link, .tab-content').forEach(el => el.classList.remove('active'));
        
        const targetBtn = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        const targetLink = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
        const targetContent = document.getElementById(tabId);

        if(targetBtn) targetBtn.classList.add('active');
        if(targetLink) targetLink.classList.add('active');
        if(targetContent) targetContent.classList.add('active');

        // 사이드바 카테고리 표시 제어
        ['macro-categories', 'command-categories', 'qr-categories'].forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
        
        if (tabId === 'macros') document.getElementById('macro-categories').classList.remove('hidden');
        else if (tabId === 'commands') document.getElementById('command-categories').classList.remove('hidden');
        else if (tabId === 'quick-replies') document.getElementById('qr-categories').classList.remove('hidden');
    }

    tabButtons.forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.getAttribute('data-tab'))));
    tabLinks.forEach(link => link.addEventListener('click', () => {
        setActiveTab(link.getAttribute('data-tab'));
        if (window.innerWidth <= 980) closeSidebar();
    }));

    // 카테고리 필터링 (통합 처리)
    function setupCategoryNav(btnSelector, linkSelector, globalVarName, filterFunc) {
        const buttons = document.querySelectorAll(btnSelector);
        const links = document.querySelectorAll(linkSelector);
        
        const handler = function() {
            const cat = this.getAttribute('data-category');
            buttons.forEach(b => b.classList.toggle('active', b.getAttribute('data-category') === cat));
            links.forEach(l => l.classList.toggle('active', l.getAttribute('data-category') === cat));
            
            // 전역 변수 업데이트 (eval 없이 처리하기 위해 switch 사용 권장하지만, 간단히 변수 매핑)
            if(globalVarName === 'currentCommandCategory') currentCommandCategory = cat;
            if(globalVarName === 'currentMacroCategory') currentMacroCategory = cat;
            if(globalVarName === 'currentQrCategory') currentQrCategory = cat;

            filterFunc();
            if (window.innerWidth <= 980) closeSidebar();
        };

        buttons.forEach(b => b.addEventListener('click', handler));
        links.forEach(l => l.addEventListener('click', handler));
    }

    setupCategoryNav('#category-nav .category-button', '.command-category-link', 'currentCommandCategory', filterCommandItems);
    setupCategoryNav('#macro-category-nav .category-button', '.macro-category-link', 'currentMacroCategory', filterMacroItems);
    setupCategoryNav('#qr-category-nav .category-button', '.qr-category-link', 'currentQrCategory', filterQrItems);


    // 테마 설정
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.checked = true;
    }
    themeToggle.addEventListener('change', function() {
        const theme = this.checked ? 'dark' : 'light';
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });

    // 기타 UI 유틸리티
    const backToTop = document.querySelector('.back-to-top');
    window.addEventListener('scroll', () => backToTop.classList.toggle('visible', window.scrollY > 300));
    backToTop.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-menu-overlay');
    if (sidebarToggle) sidebarToggle.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.style.display = 'block'; });
    if (overlay) overlay.addEventListener('click', closeSidebar);

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
    }

    // 모바일 헤더 삽입
    if (window.innerWidth <= 980) {
        document.querySelector('.main-content').insertAdjacentHTML('afterbegin', `<div class="mobile-header"><div class="mobile-title">실리태번 명령어 한글화 위키</div></div>`);
    }

    // 초기 상태 필터링
    filterCommandItems();
    if (window.innerWidth > 980) {
        document.getElementById('macro-categories').classList.remove('hidden');
        document.getElementById('command-categories').classList.add('hidden');
    }
});

// -------------------------------------------------------
// 필터링 및 하이라이트 함수들
// -------------------------------------------------------

function highlightSearchTerm(element, term) {
    // 기존 하이라이트 제거
    element.querySelectorAll('.highlight').forEach(el => {
        el.outerHTML = el.textContent; // 태그만 벗김
    });
    element.normalize(); // 텍스트 노드 병합

    if (!term) return;

    const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    while(walk.nextNode()) nodes.push(walk.currentNode);

    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');

    nodes.forEach(node => {
        const match = node.nodeValue.match(regex);
        if (match) {
            const span = document.createElement('span');
            span.innerHTML = node.nodeValue.replace(regex, '<span class="highlight">$1</span>');
            node.parentNode.replaceChild(span, node);
        }
    });
}

function escapeRegExp(string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function filterCommandItems() {
    const isSearching = !!searchQuery;
    const container = document.getElementById('command-list-container');
    if(!container) return;
    
    // 섹션별로 순회 (매크로 로직과 동일하게 변경)
    const sections = container.querySelectorAll('.command-section');
    let hasResult = false;

    sections.forEach(section => {
        const sectionCat = section.getAttribute('data-command-category');
        // command-item 클래스를 가진 요소들 탐색
        const items = section.querySelectorAll('.item'); 
        let sectionVisible = false;

        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            // nav 버튼 클릭 시 전역 변수 currentCommandCategory와 비교
            const matchCat = currentCommandCategory === 'all' || sectionCat === currentCommandCategory;
            const matchSearch = !isSearching || text.includes(searchQuery);

            if (matchCat && matchSearch) {
                item.style.display = ''; // 보이게 설정
                sectionVisible = true;
                hasResult = true;
                highlightSearchTerm(item, searchQuery);
            } else {
                item.style.display = 'none'; // 숨김
                highlightSearchTerm(item, '');
            }
        });

        // 해당 섹션에 보여줄 아이템이 하나라도 있으면 섹션 표시, 없으면 숨김
        section.style.display = sectionVisible ? 'block' : 'none';
    });
    
    toggleNoResults(container, hasResult);
}

function filterMacroItems() {
    const isSearching = !!searchQuery;
    const container = document.getElementById('macro-list-container');
    if(!container) return;

    // 섹션별로 순회
    const sections = container.querySelectorAll('.macro-section');
    let hasResult = false;

    sections.forEach(section => {
        const sectionCat = section.getAttribute('data-macro-category');
        const items = section.querySelectorAll('.macro-item');
        let sectionVisible = false;

        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            const matchCat = currentMacroCategory === 'all-macros' || sectionCat === currentMacroCategory;
            const matchSearch = !isSearching || text.includes(searchQuery);

            if (matchCat && matchSearch) {
                item.style.display = ''; // block 대신 기본값
                sectionVisible = true;
                hasResult = true;
                highlightSearchTerm(item, searchQuery);
            } else {
                item.style.display = 'none';
                highlightSearchTerm(item, '');
            }
        });

        section.style.display = sectionVisible ? 'block' : 'none';
    });

    toggleNoResults(container, hasResult);
}

function filterQrItems() {
    const isSearching = !!searchQuery;
    const container = document.getElementById('qr-list-container');
    if(!container) return;

    const boxes = container.querySelectorAll('.guide-box');
    let hasResult = false;

    boxes.forEach(box => {
        const cat = box.getAttribute('data-qr-category');
        const text = box.textContent.toLowerCase();
        const matchCat = currentQrCategory === 'all-qr' || cat === currentQrCategory;
        const matchSearch = !isSearching || text.includes(searchQuery);

        if (matchCat && matchSearch) {
            box.style.display = 'block';
            hasResult = true;
            highlightSearchTerm(box, searchQuery);
        } else {
            box.style.display = 'none';
            highlightSearchTerm(box, '');
        }
    });

    toggleNoResults(container, hasResult);
}

function toggleNoResults(container, hasResult) {
    let msg = container.querySelector('.no-results-msg');
    if (!hasResult) {
        if (!msg) {
            msg = document.createElement('div');
            msg.className = 'no-results no-results-msg';
            msg.style.padding = '20px';
            msg.style.textAlign = 'center';
            msg.style.color = '#999';
            msg.textContent = '검색 결과가 없습니다.';
            container.appendChild(msg);
        }
    } else {
        if (msg) msg.remove();
    }
}

// 전역 함수 (QR 가이드 토글용)
// 전역 함수 (QR 가이드 및 문법 가이드 토글용)
window.toggleGuide = function(header) {
    let box;

    // 1. 인자가 전달된 경우 (Quick Replies 등 동적 생성 요소: onclick="toggleGuide(this)")
    if (header) {
        box = header.closest('.guide-box');
    } 
    // 2. 인자가 없는 경우 (HTML에 고정된 문법 가이드: onclick="toggleGuide()")
    else {
        box = document.getElementById('syntaxGuide');
    }

    // 박스를 찾았으면 토글 실행
    if (box) {
        box.classList.toggle('open');
        const icon = box.querySelector('.guide-toggle-icon');
        if (icon) {
            icon.textContent = box.classList.contains('open') ? '▲' : '▼';
        }
    }
};