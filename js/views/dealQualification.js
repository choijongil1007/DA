
import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showToast, setButtonLoading, showConfirmModal, cleanJSONString } from '../utils.js';
import { ASSESSMENT_CONFIG } from '../config.js';

let currentDealId = null;
let currentStageId = null;

export async function renderDealQualification(container, dealId, stageId = 'awareness', onUpdate = null) {
    currentDealId = dealId;
    currentStageId = stageId;
    const deal = await Store.getDeal(dealId);
    if (!deal) return;

    let effectiveStageId = stageId === 'evaluation' || stageId === 'purchase' ? 'consideration' : stageId;
    let isReadOnly = stageId !== 'consideration';

    if (!deal.assessment[effectiveStageId]) {
        deal.assessment[effectiveStageId] = {
            biz: { scores: {}, weights: { budget: 20, authority: 25, need: 35, timeline: 20 } },
            tech: { scores: {}, weights: { req: 30, arch: 25, data: 25, ops: 20 } },
            aiRecommendations: {}, 
            isCompleted: false
        };
        await Store.saveDeal(deal);
    }
    
    if (!deal.assessment[effectiveStageId].aiRecommendations) {
        deal.assessment[effectiveStageId].aiRecommendations = {};
    }

    const stageAssessment = deal.assessment[effectiveStageId];
    const isCompleted = stageAssessment.isCompleted;

    container.innerHTML = `
        <div class="mb-6 flex justify-between items-center">
            <div>
                <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Deal Qualification${isReadOnly ? ' (조회 전용)' : ''}</h2>
                <p class="text-slate-500 text-sm mt-1 font-medium">BANT 및 기술 성숙도 상세 평가</p>
            </div>
            ${!isReadOnly ? `<button id="btn-refresh-ai-qual" class="bg-white border border-slate-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 flex items-center gap-2 transition-all shadow-sm"><i class="fa-solid fa-wand-magic-sparkles text-indigo-500"></i> AI 추천</button>` : ''}
        </div>
        
        <div class="flex flex-col gap-6">
            <!-- Business Fit Section -->
            <div class="card-enterprise overflow-hidden border-slate-200 section-qual" data-section="biz">
                <div class="p-5 font-black border-b bg-slate-50 text-slate-900 text-[15px] uppercase tracking-widest flex items-center justify-between cursor-pointer toggle-header-qual hover:bg-slate-100 transition-colors">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-briefcase text-indigo-500"></i> 비즈니스 적합성
                    </div>
                    <div class="w-6 h-6 rounded flex items-center justify-center text-slate-400 transition-transform duration-300 icon-chevron-qual" style="transform: rotate(180deg)">
                        <i class="fa-solid fa-chevron-down text-xs"></i>
                    </div>
                </div>
                <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 toggle-content-qual">
                    ${renderScoreSection('biz', stageAssessment, isReadOnly)}
                </div>
            </div>
            
            <!-- Technical Fit Section -->
            <div class="card-enterprise overflow-hidden border-slate-200 section-qual" data-section="tech">
                <div class="p-5 font-black border-b bg-slate-50 text-slate-900 text-[15px] uppercase tracking-widest flex items-center justify-between cursor-pointer toggle-header-qual hover:bg-slate-100 transition-colors">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-microchip text-indigo-500"></i> 기술적 적합성
                    </div>
                    <div class="w-6 h-6 rounded flex items-center justify-center text-slate-400 transition-transform duration-300 icon-chevron-qual" style="transform: rotate(180deg)">
                        <i class="fa-solid fa-chevron-down text-xs"></i>
                    </div>
                </div>
                <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 toggle-content-qual">
                    ${renderScoreSection('tech', stageAssessment, isReadOnly)}
                </div>
            </div>

            <div class="flex justify-center pt-4">
                <button id="btn-show-result-qual" class="bg-slate-900 text-white px-12 py-3.5 rounded-2xl font-bold shadow-lg hover:shadow-slate-200 active:scale-95 transition-all flex items-center gap-3">
                    <i class="fa-solid fa-chart-line"></i> 최종 결과 분석 및 Go/No-Go 판정
                </button>
            </div>
            
            <div id="assessment-result-container-qual" class="${isCompleted ? '' : 'hidden'} mt-6 mb-10"></div>
        </div>
    `;

    if (isCompleted) {
        document.getElementById('assessment-result-container-qual').innerHTML = renderResultContent(calculateScores(stageAssessment), isReadOnly);
    }

    attachEvents(container, deal, effectiveStageId, isReadOnly, onUpdate);
}

function renderScoreSection(type, stageData, isReadOnly) {
    const aiRecs = stageData.aiRecommendations || {};
    
    return ASSESSMENT_CONFIG[type].categories.map(cat => {
        const scores = stageData[type].scores;
        const itemsHtml = cat.items.map((label, idx) => {
            const id = `${cat.id}_${idx}`;
            const val = scores[id] || 3;
            const aiRec = aiRecs[id];
            
            let aiIndicatorHtml = '';
            if (aiRec) {
                aiIndicatorHtml = `
                    <div class="tooltip-trigger ml-2 bg-indigo-600 text-white px-1.5 py-0.5 rounded-md flex items-center gap-1 cursor-help transition-all hover:bg-indigo-700 shadow-sm">
                        <i class="fa-solid fa-wand-magic-sparkles text-[8px]"></i>
                        <span class="text-[9px] font-black">${aiRec.score}</span>
                        <div class="tooltip-content !w-56 !left-0 !transform-none !ml-2">
                            <div class="font-bold text-indigo-200 mb-1 border-b border-white/10 pb-1">AI 추천 근거 (${aiRec.score}점)</div>
                            <div class="text-[10px] leading-relaxed text-slate-100">${aiRec.reason || '분석 데이터 기반 산출'}</div>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="mb-6 last:mb-0">
                    <div class="flex justify-between items-center mb-2">
                        <div class="flex items-center">
                            <label class="text-[13px] font-bold text-slate-900 block truncate pr-1 uppercase tracking-tight">${label}</label>
                            ${aiIndicatorHtml}
                        </div>
                        <span id="score-val-${id}" class="text-[10px] font-black bg-slate-900 text-white w-5 h-5 flex items-center justify-center rounded shadow-sm">${val}</span>
                    </div>
                    <input type="range" min="1" max="5" value="${val}" class="score-slider-qual slider-enterprise w-full" data-type="${type}" data-id="${id}" ${isReadOnly ? 'disabled' : ''}>
                    <div class="flex justify-between mt-1 px-1 select-none">
                        <span class="text-[11px] text-slate-400 font-black">1</span>
                        <span class="text-[11px] text-slate-400 font-black">2</span>
                        <span class="text-[11px] text-slate-400 font-black">3</span>
                        <span class="text-[11px] text-slate-400 font-black">4</span>
                        <span class="text-[11px] text-slate-400 font-black">5</span>
                    </div>
                </div>`;
        }).join('');
        return `
            <div class="bg-slate-50/80 p-5 rounded-xl border border-slate-100 shadow-inner flex flex-col h-full">
                <h4 class="font-bold text-[15px] text-slate-900 mb-5 flex items-center gap-2 uppercase tracking-widest border-b-2 border-slate-200 pb-2">
                    <i class="fa-solid fa-circle text-[5px] text-slate-400"></i> ${cat.label}
                </h4>
                <div class="flex-grow">${itemsHtml}</div>
            </div>`;
    }).join('');
}

function attachEvents(container, deal, stageId, isReadOnly, onUpdate) {
    container.querySelectorAll('.toggle-header-qual').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.parentElement;
            const content = section.querySelector('.toggle-content-qual');
            const icon = section.querySelector('.icon-chevron-qual');
            const isHidden = content.classList.toggle('hidden');
            icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    });

    const bindSaveReportEvent = () => {
        const manualSaveBtn = document.getElementById('btn-save-qual-report');
        if (manualSaveBtn) {
            manualSaveBtn.onclick = async () => {
                const refreshedDeal = await Store.getDeal(currentDealId);
                const refreshedScores = calculateScores(refreshedDeal.assessment[stageId]);
                await saveAssessmentReport(refreshedDeal, stageId, refreshedScores);
                showToast('보고서가 저장되었습니다.', 'success');
            };
        }
    };

    if (deal.assessment[stageId].isCompleted) {
        bindSaveReportEvent();
    }

    if (!isReadOnly) {
        document.querySelectorAll('.score-slider-qual').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const { id } = e.target.dataset;
                const scoreDisplay = document.getElementById(`score-val-${id}`);
                if (scoreDisplay) scoreDisplay.textContent = e.target.value;
            });
            
            slider.addEventListener('change', async (e) => {
                const { type, id } = e.target.dataset;
                const targetInput = e.target;
                const newVal = parseInt(targetInput.value);
                const currentDeal = await Store.getDeal(currentDealId);
                const oldValFromStore = currentDeal.assessment[stageId][type].scores[id] || 3;
                const aiRec = currentDeal.assessment[stageId].aiRecommendations?.[id];
                
                if (aiRec && Math.abs(newVal - aiRec.score) >= 2) {
                    showConfirmModal(`입력하신 ${newVal}점은 AI 추천 점수(${aiRec.score}점)와 2점 이상 차이가 큽니다. 이대로 진행하시겠습니까?`, 
                    async () => {
                        await saveScore(currentDeal, stageId, type, id, newVal, onUpdate);
                    }, 
                    () => {
                        targetInput.value = oldValFromStore;
                        const scoreDisplay = document.getElementById(`score-val-${id}`);
                        if (scoreDisplay) scoreDisplay.textContent = oldValFromStore;
                    });
                } else {
                    await saveScore(currentDeal, stageId, type, id, newVal, onUpdate);
                }
            });
        });
        
        const btnRefreshAi = document.getElementById('btn-refresh-ai-qual');
        btnRefreshAi?.addEventListener('click', async () => {
            const deal = await Store.getDeal(currentDealId);
            const discData = deal.discovery[stageId] || {};
            if (!discData.result) {
                showToast('먼저 Discovery 분석을 완료해야 AI가 점수를 추천할 수 있습니다.', 'error');
                return;
            }
            setButtonLoading(btnRefreshAi, true, "AI 분석 중...");
            try {
                // Construct items list for Gemini
                const itemsList = [];
                ['biz', 'tech'].forEach(type => {
                    ASSESSMENT_CONFIG[type].categories.forEach(cat => {
                        cat.items.forEach((label, idx) => {
                            itemsList.push({ id: `${cat.id}_${idx}`, label: `${cat.label} - ${label}` });
                        });
                    });
                });

                const discoverySummary = `
                    Behavior: ${discData.behavior || 'N/A'}
                    Problem: ${discData.problem || 'N/A'}
                    JTBD: ${Array.isArray(discData.result.jtbd) ? discData.result.jtbd.join(', ') : discData.result.jtbd}
                    Success Criteria: ${Array.isArray(discData.result.sc) ? discData.result.sc.join(', ') : discData.result.sc}
                `;

                const prompt = `Sales Expert. Analyze following Discovery data and recommend Deal Qualification scores (1-5) for each item.
Discovery Data:
${discoverySummary}

Items to score:
${itemsList.map(item => `- ${item.id}: ${item.label}`).join('\n')}

Return JSON ONLY: { "recommendations": { "item_id": { "score": number, "reason": "string" } } }. Use Korean for reasons.`; 

                let result = await callGemini(prompt);
                
                // Fallback parsing logic for inconsistent AI/Proxy responses
                if (typeof result === 'string') {
                    try {
                        const cleaned = cleanJSONString(result);
                        result = JSON.parse(cleaned);
                    } catch(e) {
                        console.error("Manual JSON parse failed:", e);
                    }
                }

                // AI might sometimes omit the "recommendations" root key despite prompt instructions
                const recommendations = result?.recommendations || (result && typeof result === 'object' ? result : null);

                if (recommendations && typeof recommendations === 'object') {
                    const currentDeal = await Store.getDeal(currentDealId);
                    const stageAssessment = currentDeal.assessment[stageId];
                    stageAssessment.aiRecommendations = recommendations;
                    
                    Object.entries(recommendations).forEach(([id, rec]) => {
                        // Ensure we have a valid recommendation object with a score
                        if (rec && typeof rec.score === 'number') {
                            const type = (id.startsWith('budget') || id.startsWith('authority') || id.startsWith('need') || id.startsWith('timeline')) ? 'biz' : 'tech';
                            if (stageAssessment[type]) {
                                stageAssessment[type].scores[id] = rec.score;
                            }
                        }
                    });

                    await Store.saveDeal(currentDeal);
                    await renderDealQualification(container, currentDealId, currentStageId, onUpdate);
                    showToast('AI 추천 점수와 근거를 도출했습니다.', 'success');
                } else {
                    throw new Error("Invalid response format from AI.");
                }
            } catch (err) {
                console.error(err);
                showToast('AI 추천 실패: ' + err.message, 'error');
            } finally {
                setButtonLoading(btnRefreshAi, false);
            }
        });
    }

    document.getElementById('btn-show-result-qual').onclick = async () => {
        const currentDeal = await Store.getDeal(currentDealId);
        const stageData = currentDeal.assessment[stageId];
        const isFirstCompletion = !stageData.isCompleted;
        stageData.isCompleted = true;
        await Store.saveDeal(currentDeal);
        const scores = calculateScores(stageData);
        const resDiv = document.getElementById('assessment-result-container-qual');
        resDiv.innerHTML = renderResultContent(scores, isReadOnly);
        resDiv.classList.remove('hidden');
        if (isFirstCompletion) {
            await saveAssessmentReport(currentDeal, stageId, scores);
        }
        if (onUpdate) await onUpdate();
        showToast('분석이 완료되었습니다.', 'success');
        resDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        bindSaveReportEvent();
    };
}

async function saveAssessmentReport(deal, stageId, scores) {
    const reportTitle = 'Deal Qualification Report';
    const reportHtml = generateReportHtml(deal, stageId, scores);
    
    if (deal.reports) {
        const existingReportIndex = deal.reports.findIndex(r => r.title === reportTitle && r.type === 'qualification_report');
        if (existingReportIndex !== -1) {
            deal.reports[existingReportIndex].contentHTML = reportHtml;
            deal.reports[existingReportIndex].createdAt = Date.now();
            await Store.saveDeal(deal);
            return;
        }
    }
    await Store.addReport(deal.id, reportTitle, reportHtml, 'qualification_report');
}

function generateReportHtml(deal, stageId, scores) {
    const stageData = deal.assessment[stageId];
    const total = Math.round((scores.bizScore + scores.techScore) / 2);
    let verdict = 'Strong Go';
    let colorHex = '#10B981';
    if (total < 70) { verdict = 'Conditional Go'; colorHex = '#F59E0B'; }
    if (total < 45) { verdict = 'High Risk (No-Go)'; colorHex = '#F43F5E'; }

    const renderDetailTable = (type, label) => {
        const categories = ASSESSMENT_CONFIG[type].categories;
        const scores = stageData[type].scores;
        let rowsHtml = '';
        categories.forEach(cat => {
            const rowSpan = cat.items.length;
            cat.items.forEach((item, idx) => {
                const id = `${cat.id}_${idx}`;
                const val = scores[id] || 3;
                let scoreBg = '#0F172A';
                if (val >= 4) scoreBg = '#4F46E5';
                if (val <= 2) scoreBg = '#EF4444';
                rowsHtml += `
                    <tr style="border-bottom: 1px solid #F1F5F9;">
                        ${idx === 0 ? `<td rowspan="${rowSpan}" style="padding: 18px 20px; font-size: 14px; font-weight: 700; color: #64748B; background: #F8FAFC; border-right: 1px solid #F1F5F9; text-align: center;">${cat.label}</td>` : ''}
                        <td style="padding: 18px 20px; font-size: 14px; color: #1E293B;">${item}</td>
                        <td style="padding: 18px 20px; text-align: center;"><div style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: ${scoreBg}; color: white; border-radius: 8px; font-weight: 800;">${val}</div></td>
                    </tr>
                `;
            });
        });

        return `
            <div style="margin-bottom: 40px; background: white; border-radius: 20px; border: 1px solid #E2E8F0; overflow: hidden;">
                <div style="padding: 20px; background: #0F172A; color: white;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: #ffffff !important;">${label} 상세 평가</h3>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead><tr style="background: #F8FAFC; border-bottom: 2px solid #F1F5F9;"><th style="padding: 12px; font-size: 12px; width: 20%;">분류</th><th style="padding: 12px; font-size: 12px; text-align: left;">항목</th><th style="padding: 12px; font-size: 12px; width: 15%;">점수</th></tr></thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;
    };

    return `
        <div style="font-family: sans-serif; padding: 20px;">
            <div style="background: #0F172A; border-radius: 24px; padding: 40px; color: white; margin-bottom: 40px; text-align: center;">
                <div style="font-size: 60px; font-weight: 900; margin-bottom: 10px;">${total}</div>
                <div style="font-size: 24px; font-weight: 800; color: ${colorHex};">${verdict}</div>
                <div style="display: flex; justify-content: center; gap: 40px; mt-20px; margin-top: 30px;">
                    <div><div style="font-size: 10px; color: #94A3B8;">BIZ FIT</div><div style="font-size: 20px; font-weight: 800;">${scores.bizScore}%</div></div>
                    <div><div style="font-size: 10px; color: #94A3B8;">TECH FIT</div><div style="font-size: 20px; font-weight: 800;">${scores.techScore}%</div></div>
                </div>
            </div>
            ${renderDetailTable('biz', '비즈니스 적합성')}
            ${renderDetailTable('tech', '기술적 적합성')}
        </div>
    `;
}

async function saveScore(deal, stageId, type, id, value, onUpdate) {
    deal.assessment[stageId][type].scores[id] = value;
    await Store.saveDeal(deal);
    if (onUpdate) await onUpdate();
}

export function calculateScores(stageAssessment) {
    let bizTotal = 0, techTotal = 0;
    ['biz', 'tech'].forEach(type => {
        ASSESSMENT_CONFIG[type].categories.forEach(cat => {
            let catSum = 0;
            cat.items.forEach((_, idx) => catSum += (stageAssessment[type].scores[`${cat.id}_${idx}`] || 3));
            const avg = catSum / cat.items.length;
            const weight = stageAssessment[type].weights[cat.id] || 25;
            if (type === 'biz') bizTotal += avg * weight; else techTotal += avg * weight;
        });
    });
    return { 
        bizScore: Math.round(bizTotal / 5), 
        techScore: Math.round(techTotal / 5) 
    };
}

function renderResultContent(scores, isReadOnly) {
    const total = Math.round((scores.bizScore + scores.techScore) / 2);
    let statusColor = 'bg-emerald-500';
    let textColor = 'text-emerald-400';
    let statusText = 'Strong Go';
    if (total < 70) { statusColor = 'bg-amber-500'; textColor = 'text-amber-400'; statusText = 'Conditional Go'; }
    if (total < 45) { statusColor = 'bg-rose-500'; textColor = 'text-rose-400'; statusText = 'High Risk (No-Go)'; }

    return `
        <div class="bg-slate-900 rounded-3xl p-10 text-white shadow-2xl animate-modal-in border border-slate-800 relative overflow-hidden mt-8">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
                <div class="flex flex-col justify-center">
                    <div class="flex items-center gap-3 mb-8">
                        <div class="w-3 h-3 rounded-full ${statusColor} animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.3)]"></div>
                        <h4 class="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Decision Verdict</h4>
                    </div>
                    <div class="mb-10">
                        <div class="text-6xl font-black tracking-tighter mb-3">${total}<span class="text-2xl text-slate-600 ml-1">/100</span></div>
                        <div class="text-3xl font-bold ${textColor} mb-5">${statusText}</div>
                    </div>
                    <div class="grid grid-cols-2 gap-5">
                        <div class="bg-white/5 p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
                            <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Business Fit</div>
                            <div class="text-2xl font-black text-white">${scores.bizScore}%</div>
                        </div>
                        <div class="bg-white/5 p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
                            <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Technical Fit</div>
                            <div class="text-2xl font-black text-white">${scores.techScore}%</div>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col items-center">
                    <div class="text-[10px] font-black text-slate-500 mb-6 uppercase tracking-[0.3em]">Qualification Quadrant</div>
                    
                    <div class="relative w-full max-w-[340px] aspect-square">
                        <!-- Y-Axis Label -->
                        <div class="absolute -left-10 top-1/2 -rotate-90 origin-center text-[11px] font-bold text-slate-500 whitespace-nowrap">Tech. Fit</div>
                        
                        <!-- Main Quadrant Box -->
                        <div class="w-full h-full relative quadrant-grid bg-white/5 border border-slate-700/50 rounded-2xl overflow-hidden">
                            <!-- Helper Lines -->
                            <div class="absolute inset-0 pointer-events-none">
                                <div class="absolute top-1/2 left-0 w-full h-px bg-white/10"></div>
                                <div class="absolute left-1/2 top-0 w-px h-full bg-white/10"></div>
                            </div>
                            
                            <!-- Quadrant Text Guide -->
                            <div class="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none opacity-40">
                                <div class="flex items-center justify-center text-center p-2 text-[13px] font-bold text-slate-400 border-r border-b border-white/5">Tech OK, Biz Risky</div>
                                <div class="flex items-center justify-center text-center p-2 text-[13px] font-bold text-emerald-400 border-b border-white/5">Go</div>
                                <div class="flex items-center justify-center text-center p-2 text-[13px] font-bold text-rose-400 border-r border-white/5">Drop</div>
                                <div class="flex items-center justify-center text-center p-2 text-[13px] font-bold text-slate-400">Biz OK, Tech Risky</div>
                            </div>

                            <!-- User Result Dot -->
                            <div class="quadrant-dot shadow-[0_0_30px_rgba(79,70,229,0.7)] border-4 border-white" 
                                 style="left: ${scores.bizScore}%; top: ${100 - scores.techScore}%; background-color: #6366f1; width: 24px; height: 24px; transform: translate(-50%, -50%); z-index: 50;">
                            </div>
                        </div>

                        <!-- X-Axis Label -->
                        <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[11px] font-bold text-slate-500 whitespace-nowrap">Biz Fit</div>
                    </div>
                </div>
            </div>
            <div class="mt-12 flex justify-end no-print">
                <button id="btn-save-qual-report" class="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-white/10 transition-all backdrop-blur-sm">
                    <i class="fa-regular fa-file-lines"></i> 보고서로 저장
                </button>
            </div>
        </div>
    `;
}
