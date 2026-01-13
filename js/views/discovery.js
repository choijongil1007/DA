
import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showToast, setButtonLoading, cleanJSONString } from '../utils.js';
import { DISCOVERY_STAGES } from '../config.js';

let currentDealId = null;

export async function renderDiscovery(container, dealId, targetStage = null, onUpdate = null) {
    currentDealId = dealId;
    const deal = await Store.getDeal(dealId);
    if (!deal) return;

    let stagesToRender = [...DISCOVERY_STAGES];
    if (targetStage) {
        const targetIndex = DISCOVERY_STAGES.findIndex(s => s.id === targetStage);
        if (targetIndex !== -1) {
            stagesToRender = stagesToRender.slice(0, targetIndex + 1).reverse();
        }
    }

    container.innerHTML = `
        <div class="mb-8 border-b border-slate-200 pb-5">
            <h2 class="text-2xl font-bold text-slate-900 tracking-tight mb-2">Discovery Analysis</h2>
            <p class="text-slate-500 text-base font-medium">단계별 고객 여정 분석</p>
        </div>
        <div class="space-y-6" id="stages-container">
            ${stagesToRender.map((stage, index) => {
                const isExpanded = (targetStage && stage.id === targetStage) || (!targetStage && index === 0);
                let stageData = deal.discovery[stage.id];
                return renderStage(stage, stageData, isExpanded, false);
            }).join('')}
        </div>
    `;

    attachEvents(dealId, onUpdate);
}

function renderStage(stageConfig, data, isExpanded = false, isReadOnly = false) {
    if (!data) {
        data = { behavior: '', emotion: '', touchpoint: '', problem: '', result: null, frozen: false };
    }
    const isStale = !data.frozen && data.result; 
    const isButtonDisabled = data.frozen && data.result;
    const buttonStateClass = isButtonDisabled ? 'opacity-50 cursor-not-allowed bg-slate-400' : 'bg-slate-900 hover:bg-indigo-600 shadow-md active:scale-95';

    let statusHtml = '<span class="text-xs text-slate-400 font-bold mt-0.5 block flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-full"><i class="fa-regular fa-circle"></i> 입력 대기</span>';
    if (data.frozen) {
        statusHtml = '<span class="text-xs text-emerald-600 font-bold flex items-center gap-1.5 mt-0.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"><i class="fa-solid fa-circle-check"></i> 분석 완료</span>';
    } else if (data.result) {
        statusHtml = '<span class="text-xs text-amber-600 font-bold flex items-center gap-1.5 mt-0.5 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100"><i class="fa-solid fa-circle-exclamation"></i> 변경사항 있음</span>';
    }

    const colorMap = { 'awareness': 'rose', 'consideration': 'amber', 'evaluation': 'sky', 'purchase': 'emerald' };
    const color = colorMap[stageConfig.id] || 'slate';

    return `
        <div class="card-enterprise stage-card group relative" data-stage="${stageConfig.id}">
            <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${colorMap[stageConfig.id] === 'rose' ? 'from-rose-400 to-rose-500' : colorMap[stageConfig.id] === 'amber' ? 'from-amber-400 to-amber-500' : colorMap[stageConfig.id] === 'sky' ? 'from-sky-400 to-sky-500' : 'from-emerald-400 to-emerald-500'} rounded-t-xl z-10"></div>
            
            <div class="p-5 flex justify-between items-center cursor-pointer toggle-header select-none bg-slate-50/50 hover:bg-slate-50 border-b border-transparent rounded-t-xl">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border border-${color}-100 ${stageConfig.iconStyle.replace('bg-', 'bg-opacity-20 bg-').replace('text-', 'text-opacity-90 text-')}">
                        <i class="fa-solid ${getIconForStage(stageConfig.id)} text-lg"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 text-base tracking-tight">${stageConfig.label.split('. ')[1]}</h3>
                        <div class="mt-1 status-badge">${statusHtml}</div>
                    </div>
                </div>
                <div class="w-8 h-8 rounded-lg bg-white text-slate-400 flex items-center justify-center transition-all duration-300 icon-chevron border border-slate-200" style="transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}">
                    <i class="fa-solid fa-chevron-down text-xs"></i>
                </div>
            </div>
            <div class="${isExpanded ? '' : 'hidden'} toggle-content border-t border-slate-100 bg-white rounded-b-xl overflow-visible">
                <div class="p-6 md:p-8 overflow-visible">
                    <div class="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-inner mb-8 overflow-visible">
                        <h4 class="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 tracking-wide">
                            <i class="fa-regular fa-pen-to-square"></i> Discovery Inputs
                        </h4>
                        <div class="grid grid-cols-1 gap-y-8">
                            ${renderInput('고객 행동', 'behavior', data.behavior, stageConfig.id, '고객 행동을 입력하세요', isReadOnly, [
                                '고객이 지금 하는 행동은?',
                                '어떤 조건/상황에서 발생?',
                                '실행을 제한하는 제약은?',
                                '행동의 결과는 무엇인가?'
                            ])}
                            ${renderInput('고객 감정', 'emotion', data.emotion, stageConfig.id, '느끼는 감정과 동기', isReadOnly, [
                                '어떤 감정을 느끼는가?',
                                '그 감정 뒤 동기는 무엇인가?',
                                '어떤 상태가 되면 해결된 것인가?'
                            ])}
                            ${renderInput('고객 접점', 'touchpoint', data.touchpoint, stageConfig.id, '문제 인식 경로', isReadOnly, [
                                '문제를 인식한 경로는?',
                                '해결책을 찾은 채널은?',
                                '어떤 접점이 문제/행동 변화 유발?'
                            ])}
                            ${renderInput('고객 문제', 'problem', data.problem, stageConfig.id, 'Pain Point와 한계', isReadOnly, [
                                '문제가 언제/어디서 발생?',
                                '현재 해결 방식은?',
                                '기존 방식의 한계는?',
                                '발생하는 손실/위험은?',
                                '해결을 막는 장애 요인은?'
                            ])}
                        </div>
                        <div class="flex justify-end pt-6 mt-4 border-t border-slate-200">
                             <button class="btn-analyze text-white px-6 py-2.5 rounded-xl transition-all text-sm font-bold flex items-center gap-2 justify-center min-w-[160px] ${buttonStateClass}" 
                                data-stage="${stageConfig.id}" ${isButtonDisabled ? 'disabled' : ''}>
                                <i class="fa-solid fa-wand-magic-sparkles text-yellow-300 text-xs"></i> ${data.result ? '인사이트 재생성' : '인사이트 생성'}
                             </button>
                        </div>
                    </div>
                    <div class="result-area transition-all duration-500">${data.result ? renderResult(data.result, isStale, stageConfig.id) : ''}</div>
                </div>
            </div>
        </div>
    `;
}

function getIconForStage(id) {
    switch(id) {
        case 'awareness': return 'fa-eye';
        case 'consideration': return 'fa-scale-balanced';
        case 'evaluation': return 'fa-magnifying-glass-chart';
        case 'purchase': return 'fa-file-signature';
        default: return 'fa-circle';
    }
}

function renderInput(label, key, value, stageId, placeholder, isReadOnly, guideItems = []) {
    const tooltipHtml = guideItems.length > 0 ? `
        <div class="tooltip-trigger inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-500 text-[10px] cursor-help hover:bg-slate-300 transition-colors ml-2">
            <i class="fa-solid fa-question"></i>
            <div class="tooltip-content !w-72 !bottom-full !left-4 !mb-3 !z-[110] !transform-none !opacity-0 group-hover:!opacity-100">
                <div class="text-indigo-300 font-bold mb-2 text-xs flex items-center gap-2">
                    <span class="w-1.5 h-3.5 bg-indigo-500 rounded-full"></span> 가이드 질문
                </div>
                <ul class="list-disc pl-5 space-y-1.5 text-slate-100 opacity-95 text-[12px] leading-snug">
                    ${guideItems.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        </div>
    ` : '';

    return `
        <div class="space-y-2 overflow-visible">
            <div class="flex items-center">
                <label class="text-sm font-bold text-slate-700 block tracking-wide ml-1">${label}</label>
                ${tooltipHtml}
            </div>
            <textarea class="input-enterprise w-full min-h-[100px] resize-none overflow-hidden leading-relaxed text-sm p-4 shadow-sm ${isReadOnly ? 'bg-slate-100 text-slate-500' : 'bg-white text-slate-900'}"
                data-stage="${stageId}" data-key="${key}" placeholder="${placeholder}" ${isReadOnly ? 'disabled' : ''}
                oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'">${value || ''}</textarea>
        </div>
    `;
}

function renderResult(result, isStale, stageId) {
    const opacity = isStale ? 'opacity-50 grayscale-[0.5]' : 'opacity-100';
    if (typeof result === 'string') return `<div class="${opacity} bg-white p-8 rounded-2xl border border-slate-200 prose prose-sm max-w-none text-slate-700 whitespace-pre-line">${result}</div>`;
    const renderList = (items) => (Array.isArray(items) ? items : []).map(item => `<li class="flex items-start gap-3"><span class="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 flex-shrink-0"></span><span class="text-slate-700 text-sm font-medium">${item}</span></li>`).join('');

    let extraActionHtml = '';
    if (stageId === 'awareness') {
        extraActionHtml = `
            <div class="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                <button class="btn-gen-problem-def bg-slate-900 hover:bg-indigo-600 shadow-md active:scale-95 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 justify-center min-w-[200px]">
                    <i class="fa-solid fa-wand-magic-sparkles text-yellow-300 text-xs"></i> 문제 정의서 생성
                </button>
            </div>
        `;
    } else if (stageId === 'consideration') {
        extraActionHtml = `
            <div class="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                <button class="btn-gen-decision-pre bg-slate-900 hover:bg-indigo-600 shadow-md active:scale-95 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 justify-center min-w-[200px]">
                    <i class="fa-solid fa-wand-magic-sparkles text-yellow-300 text-xs"></i> 검토 기준 정의서 생성
                </button>
            </div>
        `;
    } else if (stageId === 'evaluation') {
        extraActionHtml = `
            <div class="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                <button class="btn-gen-decision-crit bg-slate-900 hover:bg-indigo-600 shadow-md active:scale-95 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 justify-center min-w-[200px]">
                    <i class="fa-solid fa-wand-magic-sparkles text-yellow-300 text-xs"></i> 판단 기준 정의서 생성
                </button>
            </div>
        `;
    } else if (stageId === 'purchase') {
        extraActionHtml = `
            <div class="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                <button class="btn-gen-success-guide bg-slate-900 hover:bg-indigo-600 shadow-md active:scale-95 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 justify-center min-w-[200px]">
                    <i class="fa-solid fa-wand-magic-sparkles text-yellow-300 text-xs"></i> 프로젝트 성공 가이드 생성
                </button>
            </div>
        `;
    }

    return `
        <div class="${opacity} space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-blue-50/40 p-6 rounded-2xl border border-blue-100 relative overflow-hidden"><h4 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">JTBD</h4><ul class="space-y-3">${renderList(result.jtbd)}</ul></div>
                <div class="bg-emerald-50/40 p-6 rounded-2xl border border-emerald-100 relative overflow-hidden"><h4 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">성공 기준</h4><ul class="space-y-3">${renderList(result.sc)}</ul></div>
            </div>
            ${extraActionHtml}
        </div>
    `;
}

function attachEvents(dealId, onUpdate) {
    document.querySelectorAll('.toggle-header').forEach(header => {
        header.addEventListener('click', () => {
            const card = header.parentElement;
            const content = card.querySelector('.toggle-content');
            const icon = card.querySelector('.icon-chevron');
            content.classList.toggle('hidden');
            icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    });

    document.querySelectorAll('.input-enterprise').forEach(input => {
        if (input.tagName === 'TEXTAREA') { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; }
        input.addEventListener('input', async (e) => {
            const deal = await Store.getDeal(dealId);
            const stageId = e.target.dataset.stage;
            const key = e.target.dataset.key;
            
            const card = e.target.closest('.stage-card');
            if (card) {
                const btn = card.querySelector('.btn-analyze');
                const badge = card.querySelector('.status-badge');
                const hasResult = !!deal.discovery[stageId]?.result;

                if (btn && btn.disabled) {
                    btn.disabled = false;
                    btn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-slate-400');
                    btn.classList.add('bg-slate-900', 'hover:bg-indigo-600', 'shadow-md', 'active:scale-95');
                }

                if (badge && hasResult) {
                    badge.innerHTML = '<span class="text-xs text-amber-600 font-bold flex items-center gap-1.5 mt-0.5 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100"><i class="fa-solid fa-circle-exclamation"></i> 변경사항 있음</span>';
                }
            }

            if (deal.discovery[stageId]) {
                deal.discovery[stageId][key] = e.target.value;
                deal.discovery[stageId].frozen = false;
                await Store.saveDeal(deal);
                if (onUpdate) await onUpdate();
            }
        });
    });

    document.querySelectorAll('.btn-analyze').forEach(btn => {
        btn.addEventListener('click', async () => {
            const stageId = btn.dataset.stage;
            const deal = await Store.getDeal(dealId);
            const stageData = deal.discovery[stageId];
            if (!stageData.behavior && !stageData.problem) { showToast('정보를 입력해주세요.', 'error'); return; }

            const card = btn.closest('.stage-card');
            const resultArea = card.querySelector('.result-area');
            setButtonLoading(btn, true, "분석 중...");
            resultArea.innerHTML = `<div class="animate-pulse flex flex-col items-center py-10"><div class="spinner border-indigo-500 w-8 h-8 mb-4"></div><p class="text-sm text-slate-500">AI 분석 중...</p></div>`;

            try {
                const prompt = `Role: Senior B2B Sales Strategist. Stage: ${stageId}.
Analyze following customer signals: 
- Behavior: ${stageData.behavior}
- Problem: ${stageData.problem}

Objective:
1. Generate exactly 4 to 6 items for JTBD (Jobs to be Done).
2. Generate exactly 4 to 6 items for Success Criteria (SC).

Rules:
1. Focus on high-level strategic alignment and decision-making criteria appropriate for the "${stageId}" stage.
2. Exclude overly technical test cases or granular functional validation items.
3. Items should represent what needs to be agreed upon or confirmed at this business level.
4. Return JSON ONLY: { "jtbd": [], "sc": [] }. Language: Korean.`;

                const result = await callGemini(prompt);
                
                const freshDeal = await Store.getDeal(dealId);
                freshDeal.discovery[stageId].result = result;
                freshDeal.discovery[stageId].frozen = true;
                await Store.saveDeal(freshDeal);
                
                resultArea.innerHTML = renderResult(result, false, stageId);
                
                const badge = card.querySelector('.status-badge');
                if (badge) {
                    badge.innerHTML = '<span class="text-xs text-emerald-600 font-bold flex items-center gap-1.5 mt-0.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"><i class="fa-solid fa-circle-check"></i> 분석 완료</span>';
                }

                if (stageId === 'awareness') {
                    const defBtn = resultArea.querySelector('.btn-gen-problem-def');
                    if (defBtn) defBtn.onclick = () => generateProblemDefinition(dealId);
                } else if (stageId === 'consideration') {
                    const defBtn = resultArea.querySelector('.btn-gen-decision-pre');
                    if (defBtn) defBtn.onclick = () => generateDecisionPreconditions(dealId);
                } else if (stageId === 'evaluation') {
                    const defBtn = resultArea.querySelector('.btn-gen-decision-crit');
                    if (defBtn) defBtn.onclick = () => generateDecisionCriteria(dealId);
                } else if (stageId === 'purchase') {
                    const defBtn = resultArea.querySelector('.btn-gen-success-guide');
                    if (defBtn) defBtn.onclick = () => generateProjectSuccessGuide(dealId);
                }

                showToast('분석 완료', 'success');
                if (onUpdate) await onUpdate();
            } catch (e) {
                showToast(e.message, 'error');
                resultArea.innerHTML = '';
            } finally {
                setButtonLoading(btn, false);
            }
        });
    });

    document.querySelectorAll('.btn-gen-problem-def').forEach(btn => {
        btn.onclick = () => generateProblemDefinition(dealId);
    });

    document.querySelectorAll('.btn-gen-decision-pre').forEach(btn => {
        btn.onclick = () => generateDecisionPreconditions(dealId);
    });

    document.querySelectorAll('.btn-gen-decision-crit').forEach(btn => {
        btn.onclick = () => generateDecisionCriteria(dealId);
    });

    document.querySelectorAll('.btn-gen-success-guide').forEach(btn => {
        btn.onclick = () => generateProjectSuccessGuide(dealId);
    });
}

/**
 * AI 응답 객체에서 JSON 부분을 찾아 안전하게 파싱합니다.
 */
function parseAiJsonResponse(resultRaw) {
    try {
        if (!resultRaw) return null;
        
        // 만약 전체 API 응답 객체라면 후보 추출
        let textToParse = "";
        if (typeof resultRaw === 'object') {
            if (resultRaw.candidates && resultRaw.candidates[0]?.content?.parts[0]?.text) {
                textToParse = resultRaw.candidates[0].content.parts[0].text;
            } else {
                // 이미 필요한 데이터 형태인 경우
                return resultRaw;
            }
        } else {
            textToParse = String(resultRaw);
        }
        
        // JSON 문자열 정화 및 추출
        const cleaned = cleanJSONString(textToParse);
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("AI JSON Parse Error:", e, resultRaw);
        // 폴백: 최소한의 구조라도 생성하여 반환
        if (typeof resultRaw === 'string' && resultRaw.length > 50) {
            return { 
                title: "보고서 (비정형)", 
                summary: "데이터 파싱 중 오류가 발생하여 원문이 표시됩니다.", 
                sections: [{ title: "분석 내용", type: "text", content: resultRaw }] 
            };
        }
        return null;
    }
}

/**
 * 정형화된 보고서 데이터를 HTML로 변환하여 렌더링합니다 (SaaS UI 컴포넌트 엔진)
 */
function renderStructuredReport(data) {
    if (!data) return '<div class="text-rose-500 p-8 border border-rose-500/20 bg-rose-500/5 rounded-2xl">보고서 데이터를 불러올 수 없습니다.</div>';
    
    // 데이터가 JSON 구조가 아닌 일반 텍스트인 경우를 위한 폴백
    if (typeof data === 'string' || (!data.sections && !data.title)) {
        const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        return `
            <h1 class="text-center mb-16 text-4xl font-black text-white uppercase tracking-tighter border-none">분석 보고서</h1>
            <div class="text-slate-300 leading-relaxed text-base mb-12 bg-white/5 p-8 rounded-2xl border border-white/5 whitespace-pre-line font-mono text-sm">
                ${text}
            </div>
        `;
    }

    let html = `<h1 class="text-center mb-16 text-4xl font-black text-white uppercase tracking-tighter border-none">${data.title || "보고서"}</h1>`;
    
    if (data.summary) {
        html += `
            <blockquote class="bg-indigo-900/10 border-l-4 border-indigo-500 p-8 rounded-2xl mb-12 flex gap-5">
                <div class="text-indigo-500 text-4xl opacity-50 shrink-0 mt-1">
                    <i class="fa-solid fa-quote-left"></i>
                </div>
                <div>
                    <h4 class="text-indigo-400 font-black uppercase tracking-widest text-[11px] mb-3">Executive Summary</h4>
                    <p class="text-indigo-100 text-lg leading-relaxed font-medium italic">${data.summary}</p>
                </div>
            </blockquote>
        `;
    }

    if (data.sections && Array.isArray(data.sections)) {
        data.sections.forEach(section => {
            html += `<h2 class="flex items-center gap-3 mt-16 mb-8 text-indigo-400 font-bold text-xl border-b border-indigo-500/20 pb-4"><span class="w-1.5 h-6 bg-indigo-500 rounded-full"></span>${section.title}</h2>`;
            
            if (section.type === 'table' && section.tableData) {
                const headers = section.tableData.headers || [];
                const rows = section.tableData.rows || [];
                
                html += `
                    <div class="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] mb-12 shadow-2xl">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-indigo-900/40 border-b border-white/10">
                                    ${headers.map(h => `<th class="p-4 text-[11px] font-black text-white uppercase tracking-wider text-center">${h}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.map(row => `
                                    <tr class="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                                        ${row.map(cell => `<td class="p-4 text-sm text-slate-300 leading-relaxed">${cell}</td>`).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else if (section.type === 'list' && section.items) {
                html += `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                        ${section.items.map(item => {
                            const itemTitle = typeof item === 'object' ? (item.title || item.label) : null;
                            const itemContent = typeof item === 'object' ? (item.content || item.value || item.text) : item;
                            return `
                            <div class="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-indigo-500/30 transition-all shadow-sm">
                                ${itemTitle ? `<h4 class="text-indigo-300 font-bold text-sm mb-3 flex items-center gap-2"><i class="fa-solid fa-check text-[10px]"></i> ${itemTitle}</h4>` : ''}
                                <p class="text-slate-300 text-sm leading-relaxed">${itemContent}</p>
                            </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else {
                html += `<div class="text-slate-300 leading-relaxed text-base mb-12 bg-white/5 p-8 rounded-2xl border border-white/5">${section.content || ""}</div>`;
            }
        });
    }

    return html;
}

/**
 * 인식 단계 정보를 바탕으로 문제 정의서 초안 생성
 */
async function generateProblemDefinition(dealId) {
    const deal = await Store.getDeal(dealId);
    const disc = deal.discovery.awareness?.result;
    if (!disc || !disc.jtbd) {
        showToast("인식 단계의 Discovery 인사이트를 먼저 생성해주세요.", "error");
        return;
    }

    const clientName = deal.clientName || "고객사";
    const jtbdList = Array.isArray(disc.jtbd) ? disc.jtbd.join("\n- ") : disc.jtbd;
    const scList = Array.isArray(disc.sc) ? disc.sc.join("\n- ") : disc.sc;

    const loader = document.getElementById('global-loader');
    loader.classList.remove('hidden');

    try {
        const prompt = `당신은 B2B 프리세일즈 전문가입니다.
당신의 역할은 새로운 문제를 발굴하거나, 시장·산업·비즈니스 관점에서 일반적인 문제를 나열하는 것이 아닙니다.
당신의 역할은 이미 제공된 JTBD(Job To Be Done)를 ‘의사결정자가 이해할 수 있는 문제 정의’ 형태로 다시 설명하는 것입니다.
이 문서의 모든 내용은 제공된 JTBD와 Success Criteria에서만 도출되어야 합니다.

[절대 금지 사항]
- 회사 소개, 산업 설명, 시장 배경 작성 금지
- 고객사명 등 고유명사를 산업·기술 영역으로 해석 금지
- 새로운 문제, 리스크, 이슈를 임의로 추가 금지
- “낮은 유지율”, “수익성 악화” 등 일반적 비즈니스 문제 나열 금지
- Executive Summary, 사업 배경, 전략적 의미 같은 컨설팅 문서 톤 사용 금지
- 해결책, 기술, 제품, 방법, 접근 방식 언급 금지

[반드시 지켜야 할 원칙]
- JTBD는 이 문서의 유일한 문제 출처(Source of Truth)입니다
- JTBD에 직접 연결되지 않는 문장은 작성하지 마세요
- 문제 정의서는 JTBD를 다른 말로 설명하는 문서입니다
- “왜 이 문제가 지금 중요한가”만 설명하세요
- 고객 관점에서, 판단을 돕는 중립적 문장만 사용하세요

[입력 데이터]
고객사: ${clientName}
JTBD 목록:
- ${jtbdList}

Success Criteria 목록:
- ${scList}

[출력 문서 구조 (강제)]
# 문제 정의서 (JTBD 기반)
## 문서 목적
이 문서는 이미 도출된 고객의 JTBD가 왜 의사결정 차원에서 중요한 문제인지 설명하기 위한 문서입니다. 해결책이나 접근 방식을 제시하지 않습니다.

---

## 문제 정의 1
[연결된 JTBD]
- {{해당 JTBD 원문}}

[문제 설명]
- 이 JTBD가 충족되지 않을 경우, 고객의 의사결정 또는 운영에 어떤 판단 부담이 발생하는지
- 왜 이 문제가 지금 시점에서 더 이상 방치되기 어려운지
- 이 문제가 명확히 정의되지 않으면, 이후 단계에서 어떤 혼란이 생길 수 있는지

(※ JTBD 개수만큼 위 섹션 반복)

---

## 요약 문장 (의사결정자용)
- 위 JTBD들이 해결되지 않을 경우 발생하는 공통된 판단 리스크를 2~3문장으로 요약
- “이 문제를 더 검토할 가치가 있는가?”에 답이 되도록 작성

Language: Korean. Return Markdown format text.`;

        const resultRaw = await callGemini(prompt);
        openReportEditor(resultRaw, dealId, 'problem_definition', false);
    } catch (e) {
        showToast("생성 실패: " + e.message, "error");
    } finally {
        loader.classList.add('hidden');
    }
}

/**
 * 고려 단계 정보를 바탕으로 검토 기준 정의서 초안 생성
 */
async function generateDecisionPreconditions(dealId) {
    const deal = await Store.getDeal(dealId);
    const disc = deal.discovery.consideration?.result;
    if (!disc || !disc.jtbd) {
        showToast("고려 단계의 Discovery 인사이트를 먼저 생성해주세요.", "error");
        return;
    }

    const clientName = deal.clientName || "고객사";
    const jtbdList = Array.isArray(disc.jtbd) ? disc.jtbd.join("\n- ") : disc.jtbd;
    const scList = Array.isArray(disc.sc) ? disc.sc.join("\n- ") : disc.sc;

    const loader = document.getElementById('global-loader');
    loader.classList.remove('hidden');

    try {
        const prompt = `당신은 B2B 프리세일즈 전문가입니다.
이 문서는 다음 단계로 넘기기 위한 게이트 문서가 아니며, Go/No-Go 판단을 위한 문서가 아닙니다.
이 문서는 이미 정의된 JTBD를 ‘어떤 기준과 조건에서 검토해야 하는지’를 정리하는 고려 단계(Consideration)의 산출물입니다.

[절대 금지 사항]
- 다음 단계, 평가 단계, 전환, 게이트라는 개념 언급 금지
- 회사 전체의 의사결정 기준 작성 금지
- 전략, 시장, 재무, 투자, ROI 관점의 일반론 작성 금지
- “전략적 부합성”, “시장성”, “재무 타당성” 같은 범용 프레임워크 사용 금지
- Go/No-Go 체크리스트 작성 금지
- JTBD와 직접 연결되지 않는 기준 생성 금지
- 해결책, 기술, 제품, 실행 방안 언급 금지

[강제 원칙]
- 제공된 JTBD는 이 문서의 유일한 출발점(Source of Truth)입니다
- 모든 검토 기준은 ‘선택을 가능하게 만드는 조건’이어야 합니다
- 검토 기준의 목적은 ‘아무 선택이나 하지 않게 만드는 것’입니다
- 검토 기준은 사고를 정리하기 위한 것이지, 결정을 강제하지 않습니다
- 고객 관점에서, 중립적이고 판단을 돕는 언어만 사용하세요

[입력 데이터]
고객사: ${clientName}
JTBD 목록:
- ${jtbdList}

Success Criteria 목록:
- ${scList}

[출력 문서 구조 (강제)]
# 검토 기준 정의서 (JTBD 기반)

## 문서 목적
이 문서는 정의된 JTBD를 어떤 기준과 조건에서 검토해야 하는지 정리하기 위한 문서입니다. 특정 선택이나 결정을 유도하지 않습니다.

---

## JTBD 1에 대한 검토 기준
[연결된 JTBD]
- {{해당 JTBD 원문}}

[검토 기준]
- 이 JTBD를 검토할 때 반드시 전제되어야 할 조건
- 이 조건이 충족되지 않을 경우, 검토 자체가 왜 왜곡될 수 있는지에 대한 설명
- 이 기준이 없을 때 발생할 수 있는 판단상의 혼란

(※ JTBD 개수만큼 위 섹션 반복)

---

## 요약 문장 (의사결정자용)
- 각 JTBD를 검토할 때 공통적으로 유지되어야 할 기준
- 이 기준들이 왜 지금 정리되어야 하는지에 대한 요약

Language: Korean. Return Markdown format text.`;

        const resultRaw = await callGemini(prompt);
        openReportEditor(resultRaw, dealId, 'decision_preconditions', false);
    } catch (e) {
        showToast("생성 실패: " + e.message, "error");
    } finally {
        loader.classList.add('hidden');
    }
}

/**
 * 평가 단계 정보를 바탕으로 판단 기준 정의서 초안 생성
 */
async function generateDecisionCriteria(dealId) {
    const deal = await Store.getDeal(dealId);
    const disc = deal.discovery.evaluation?.result;
    if (!disc || !disc.jtbd) {
        showToast("평가 단계의 Discovery 인사이트를 먼저 생성해주세요.", "error");
        return;
    }

    const clientName = deal.clientName || "고객사";
    const jtbdList = Array.isArray(disc.jtbd) ? disc.jtbd.join("\n- ") : disc.jtbd;
    const scList = Array.isArray(disc.sc) ? disc.sc.join("\n- ") : disc.sc;

    const loader = document.getElementById('global-loader');
    loader.classList.remove('hidden');

    try {
        const prompt = `당신은 B2B 프리세일즈 전문가입니다.
이 문서는 다음 단계로 넘기기 위한 게이트 문서가 아니며, Go/No-Go 판단을 위한 문서가 아닙니다.
이 문서는 이미 검토와 검증을 거친 JTBD를 기준으로, 여러 선택지 또는 대안들을 어떤 기준과 관점에서 ‘비교·판단’해야 하는지를 정리하는 평가 단계(Evaluation)의 산출물입니다.

[절대 금지 사항]
- 다음 단계, 전환, 게이트, 승인, 통과, 탈락 표현 사용 금지
- 회사 전체 또는 조직 차원의 일반적 의사결정 기준 작성 금지
- 전략, 시장, 재무, 투자, ROI 관점의 일반론 작성 금지
- “전략적 부합성”, “시장성”, “재무 타당성” 같은 범용 프레임워크 사용 금지
- 점수화, 순위화, Go/No-Go 체크리스트 작성 금지
- JTBD와 직접 연결되지 않는 평가 기준 생성 금지
- 특정 해결책, 기술, 제품, 공급사, 실행 방안 언급 금지

[강제 원칙]
- 제공된 JTBD와 Success Criteria는 이 문서의 유일한 판단 기준의 출처(Source of Truth)입니다
- 모든 평가 기준은 ‘무엇이 더 낫다’가 아니라 ‘어떤 관점에서 판단해야 하는가’를 설명해야 합니다
- 평가 기준의 목적은 선택을 돕는 것이지, 선택을 대신하지 않는 것입니다
- 평가 기준은 결론을 유도하지 않고, 판단의 일관성을 유지하는 역할을 합니다
- 고객 관점에서, 중립적이며 비교·판단을 돕는 언어만 사용하세요

[입력 데이터]
고객사: ${clientName}
JTBD 목록:
- ${jtbdList}

Success Criteria 목록:
- ${scList}

[출력 문서 구조 (강제)]
# 평가 기준 정의서 (JTBD 기반)

## 문서 목적
이 문서는 정의된 JTBD를 기준으로 여러 선택지 또는 대안들을 어떤 기준과 관점에서 평가해야 하는지를 정리하기 위한 문서입니다. 특정 선택이나 결정을 유도하지 않습니다.

---

## JTBD 1에 대한 평가 기준
[연결된 JTBD]
- {{해당 JTBD 원문}}

[평가 기준]
- 이 JTBD를 기준으로 선택지를 비교할 때 유지되어야 할 판단 관점
- 이 관점이 없을 경우 평가가 왜 주관적으로 흐를 수 있는지에 대한 설명
- 동일한 JTBD라도 서로 다른 결론이 나올 수 있는 이유에 대한 정리

(※ JTBD 개수만큼 위 섹션 반복)

---

## 요약 문장 (의사결정자용)
- 각 JTBD를 평가할 때 공통적으로 유지되어야 할 판단 관점
- 이 기준들이 평가 단계에서 왜 명시적으로 정리되어야 하는지에 대한 요약

Language: Korean. Return Markdown format text.`;

        const resultRaw = await callGemini(prompt);
        openReportEditor(resultRaw, dealId, 'decision_criteria', false);
    } catch (e) {
        showToast("생성 실패: " + e.message, "error");
    } finally {
        loader.classList.add('hidden');
    }
}

/**
 * 구매 단계 정보를 바탕으로 프로젝트 성공 가이드 초안 생성
 */
async function generateProjectSuccessGuide(dealId) {
    const deal = await Store.getDeal(dealId);
    const disc = deal.discovery.purchase?.result;
    if (!disc || !disc.sc) {
        showToast("구매 단계의 Discovery 인사이트(성공 기준)를 먼저 생성해주세요.", "error");
        return;
    }

    const clientName = deal.clientName || "고객사";
    const scList = Array.isArray(disc.sc) ? disc.sc.join("\n- ") : disc.sc;

    const loader = document.getElementById('global-loader');
    loader.classList.remove('hidden');

    try {
        const prompt = `당신은 B2B 프리세일즈 전문가입니다.
당신이 작성할 문서는 '프로젝트 성공 가이드'입니다.
이 문서는 계약 전·후 고객에게 그대로 공유 가능한 문서여야 합니다.

⚠️ 이 문서는 다음을 절대 하지 않습니다:
- 특정 솔루션, 기술, 제품, 공급사를 추천하거나 설명하지 않습니다
- 결정을 요구하거나 확정하지 않습니다
- Go / No-Go, 평가, 승인, 통과 같은 표현을 사용하지 않습니다
- 전략, 실행 계획, 책임 분담, 계약 조건을 정의하지 않습니다

이 문서의 목적은 오직 하나입니다.
프로젝트가 성공적으로 진행되기 위해 이미 논의된 성공 기준과, 그 기준이 흔들릴 수 있는 지점에 대한 공통 인식을 정리하는 것입니다.

[강제 개념 규칙]
- Success Criteria(SC)는 Deal 관점에서 도출된 기준이지만, 이 문서에서는 반드시 ‘프로젝트 성공을 가능하게 하는 전제 조건’의 관점으로 재해석해야 합니다.
- 리스크는 새로 도출하지 않습니다.
- 반드시 구매 단계에서 정리된 SC만을 입력값으로 사용하며, 각 SC가 유지되지 않을 수 있는 상황을 뒤집어서 도출합니다.
- 리스크 대응 방안은 실행 계획이 아닙니다.
- “무엇을 하겠다”가 아니라, 어떤 전제가 유지될 경우 관리 가능하다고 인식했는지만 작성합니다.
- 모든 문장은 고객 관점, 중립적 서술, 판단을 돕는 언어로 작성합니다.

[톤 가이드]
❌ “확보한다 / 보장한다 / 해결한다”
❌ “문제가 없다 / 리스크가 낮다”
⭕ “~일 경우 관리 가능한 것으로 인식됨”
⭕ “~범위 내에서 유지될 경우 안정적으로 판단됨”

[입력 데이터]
고객사: ${clientName}
성공 기준(Success Criteria) 목록:
- ${scList}

[출력 문서 구조 (강제)]
# 프로젝트 성공 가이드
## 문서 목적
본 문서는 프로젝트가 성공적으로 진행되기 위해 지금까지 논의된 성공 기준과, 해당 기준이 유지되지 않을 수 있는 지점에 대한 공통 인식을 정리한 가이드입니다. 특정 결정을 전제하거나 확정하지 않습니다.

---

## 1. 프로젝트 성공을 가능하게 하는 전제 조건
- 구매 단계에서 정리된 Success Criteria를 프로젝트 성공 관점에서 요약합니다. (목록 형태)

---

## 2. 예상되는 리스크
- 위 전제 조건이 유지되지 않을 수 있는 상황을 중심으로 작성합니다. (성공 기준과 1:1 대응 목록)

---

## 3. 리스크 대응 방안에 대한 공통 인식
- 실행 계획이나 약속이 아닌, 관리 가능하다고 인식한 전제 조건만 작성합니다. (성공 기준과 1:1 대응 목록)
- “~할 것이다” 표현 사용 금지

Language: Korean. Return Markdown format text.`;

        const resultRaw = await callGemini(prompt);
        openReportEditor(resultRaw, dealId, 'success_guide', false);
    } catch (e) {
        showToast("생성 실패: " + e.message, "error");
    } finally {
        loader.classList.add('hidden');
    }
}

/**
 * 보고서 편집 모달 오픈 (JSON 데이터를 기반으로 SaaS UI 렌더링)
 */
function openReportEditor(content, dealId, reportType, isJson = false) {
    const modal = document.getElementById('problem-def-modal');
    const backdrop = document.getElementById('problem-def-backdrop');
    const panel = document.getElementById('problem-def-panel');
    const preview = document.getElementById('problem-def-preview');
    const editor = document.getElementById('problem-def-editor');
    
    const modalTitle = document.getElementById('report-modal-title');
    const btnPreview = document.getElementById('btn-problem-def-preview-mode');
    const btnEdit = document.getElementById('btn-problem-def-edit-mode');
    const saveBtn = document.getElementById('btn-save-problem-def-report');

    if (!modal || !editor) return;

    modalTitle.innerText = "보고서 데이터 검토 및 시각화";
    editor.value = content;

    const renderPreview = () => {
        if (isJson) {
            try {
                const data = JSON.parse(editor.value);
                preview.innerHTML = renderStructuredReport(data);
            } catch (e) {
                preview.innerHTML = `<div class="text-rose-400 p-10 bg-rose-500/10 rounded-xl border border-rose-500/20">
                    <h4 class="font-bold mb-2">JSON 데이터 형식 오류</h4>
                    <p class="text-sm">편집 탭에서 데이터를 올바른 JSON 형식으로 수정해주세요.</p>
                    <pre class="mt-4 text-[10px] bg-black/40 p-4 rounded-lg overflow-x-auto">${e.message}</pre>
                </div>`;
            }
        } else if (window.marked) {
            preview.innerHTML = window.marked.parse(editor.value);
        } else {
            preview.innerText = editor.value;
        }
    };
    renderPreview();

    // UI Toggle 로직
    const showPreview = () => {
        preview.classList.remove('hidden');
        editor.classList.add('hidden');
        btnPreview.classList.add('bg-indigo-600', 'text-white');
        btnPreview.classList.remove('text-slate-400');
        btnEdit.classList.remove('bg-indigo-600', 'text-white');
        btnEdit.classList.add('text-slate-400');
        renderPreview();
    };

    const showEdit = () => {
        preview.classList.add('hidden');
        editor.classList.remove('hidden');
        btnEdit.classList.add('bg-indigo-600', 'text-white');
        btnEdit.classList.remove('text-slate-400');
        btnPreview.classList.remove('bg-indigo-600', 'text-white');
        btnPreview.classList.add('text-slate-400');
    };

    btnPreview.onclick = showPreview;
    btnEdit.onclick = showEdit;

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0'); backdrop.classList.add('opacity-100');
        panel.classList.remove('opacity-0', 'scale-95'); panel.classList.add('opacity-100', 'scale-100');
    });

    const close = () => {
        backdrop.classList.add('opacity-0'); panel.classList.add('opacity-0', 'scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    };

    document.getElementById('problem-def-cancel').onclick = close;
    document.getElementById('btn-save-problem-def-cancel').onclick = close;

    saveBtn.onclick = async () => {
        const raw = editor.value;
        if (!raw.trim()) return;

        let reportTitle = "보고서";
        if (reportType === 'problem_definition') reportTitle = "문제 정의서";
        else if (reportType === 'decision_preconditions') reportTitle = "검토 기준 정의서";
        else if (reportType === 'decision_criteria') reportTitle = "판단 기준 정의서";
        else if (reportType === 'success_guide') reportTitle = "프로젝트 성공 가이드";
        
        // 시각화된 HTML을 그대로 저장
        renderPreview();
        const htmlToSave = preview.innerHTML;

        try {
            await Store.addReport(dealId, reportTitle, htmlToSave, reportType);
            showToast("세련된 디자인의 보고서가 'Reports'에 저장되었습니다.", "success");
            close();
        } catch (e) {
            showToast("저장 실패: " + e.message, "error");
        }
    };
}
