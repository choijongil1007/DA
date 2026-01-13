
import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showToast, setButtonLoading, showConfirmModal } from '../utils.js';

export function renderTWS(container, deal, isReadOnly) {
    const compData = deal.competitive || {};
    const hasCompetitiveResult = !!compData.result;
    const krCount = (compData.requirements || []).length;
    const kfrCount = (compData.functionalRequirements || []).length;
    const positionAnalysis = analyzeCompetitivePosition(compData.result);

    let reportHtml = '';
    if (deal.twsReport && deal.twsReport.content) {
        let content = deal.twsReport.content;
        if (window.marked && !content.trim().startsWith('<')) {
            content = window.marked.parse(content);
        }
        reportHtml = content;
    }

    container.innerHTML = `
        <div class="flex flex-col h-full animate-modal-in max-w-5xl mx-auto w-full gap-8 pb-20">
            <div class="border-b border-slate-200 pb-4 no-print flex justify-between items-end">
                <div>
                    <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Tech. Win Strategy</h2>
                    <p class="text-slate-500 text-sm mt-1 font-medium">평가 단계(Evaluation): 기술적 우위 증명 및 경쟁 승리 전략</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold border border-indigo-700 shadow-sm">Evaluation Stage</span>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 no-print">
                 <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <i class="fa-solid fa-crosshairs text-lg"></i>
                    </div>
                    <div>
                        <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Key Requirements</div>
                        <div class="text-base font-bold text-slate-900">${krCount}개 정의됨</div>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100">
                        <i class="fa-solid fa-cogs text-lg"></i>
                    </div>
                    <div>
                        <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Functional Specs</div>
                        <div class="text-base font-bold text-slate-900">${kfrCount}개 정의됨</div>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center ${hasCompetitiveResult ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}">
                        <i class="fa-solid ${hasCompetitiveResult ? 'fa-check-double' : 'fa-triangle-exclamation'} text-lg"></i>
                    </div>
                    <div>
                        <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Competitive Fit</div>
                        <div class="text-base font-bold text-slate-900">${hasCompetitiveResult ? '분석 완료' : '데이터 부족'}</div>
                    </div>
                </div>
            </div>

            <section class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden no-print">
                <div class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 class="font-bold text-slate-800 text-sm tracking-wide flex items-center gap-2">
                        <i class="fa-solid fa-chart-column text-slate-500"></i> 기술 경쟁 정보
                    </h3>
                </div>
                <div class="p-6">
                    ${renderPositionSummary(positionAnalysis)}
                </div>
            </section>

            ${deal.twsReport ? renderTWSReportBlock(deal, reportHtml, isReadOnly) : renderTWSTriggerBlock(isReadOnly, hasCompetitiveResult)}
            
            <div id="strategy-generating-overlay" class="hidden fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-center">
                <div class="spinner border-indigo-500 border-t-transparent w-16 h-16 mb-6"></div>
                <h3 class="text-2xl font-bold text-white mb-2">Tech. Win Strategy 설계 중...</h3>
                <p class="text-indigo-200 text-sm animate-pulse mb-8">기술적 차별화 요소와 경쟁 우위를 결합하여 최적의 승리 논리를 도출하고 있습니다.</p>
            </div>
        </div>
    `;

    attachTWSEvents(deal, positionAnalysis);
}

function renderTWSTriggerBlock(isReadOnly, isReady) {
    const desc = `고객의 <span class="text-white font-bold">성공 기준</span>과 우리의 <span class="text-white font-bold">기술적 차별점</span>을 매핑하여,<br><span class="text-indigo-300 font-bold">강력한 기술적 승리 논리</span>를 생성합니다.`;
    const disabledAttr = !isReady ? 'disabled title="Competitive Fit 분석 데이터가 필요합니다"' : '';

    return `
        <section class="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden text-center p-16 relative no-print border border-white/10">
            <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            <div class="flex flex-col items-center max-w-xl mx-auto">
                <div class="w-20 h-20 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-8 text-indigo-400 backdrop-blur-md border border-indigo-500/30 shadow-inner">
                    <i class="fa-solid fa-chess-knight text-4xl"></i>
                </div>
                <h3 class="text-3xl font-bold text-white mb-4 tracking-tight">승리를 위한 기술 전략 수립</h3>
                <p class="text-slate-400 text-base mb-10 leading-relaxed">${desc}</p>
                ${!isReadOnly ? `
                <button id="btn-gen-tws" class="bg-indigo-600 text-white hover:bg-indigo-500 px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3 transform hover:scale-105 active:scale-95" ${disabledAttr}>
                    <i class="fa-solid fa-wand-magic-sparkles"></i> AI 전략 생성 실행
                </button>
                 ` : `<span class="text-slate-500 bg-slate-800 px-6 py-3 rounded-xl text-sm font-bold border border-slate-700">View Only Mode</span>`}
            </div>
        </section>
    `;
}

function renderTWSReportBlock(deal, reportHtml, isReadOnly) {
    return `
        <section class="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden relative print:shadow-none print:border-0 print:rounded-none">
            <!-- Header Banner -->
            <div class="bg-slate-900 border-b border-slate-800 p-8 md:p-12 print:bg-white print:p-0 print:border-b-2 print:border-black print:mb-10">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest mb-3 border border-indigo-500/20">
                            Technical Presales Document
                        </div>
                        <h1 class="text-3xl font-black text-white tracking-tighter mb-2 leading-tight">Tech. Win Strategy Report</h1>
                        <p class="text-slate-400 text-sm font-medium border-l-2 border-indigo-500 pl-3">Strategic Alignment & Competitive Technical Differentiation</p>
                    </div>
                    <div class="flex gap-2 no-print">
                        ${!isReadOnly ? `
                        <button id="btn-regen-tws" class="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 backdrop-blur-sm shadow-inner">
                            <i class="fa-solid fa-rotate"></i> 전략 재생성
                        </button>
                        ` : ''}
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md print:bg-white print:border-slate-200 print:text-slate-900">
                    <div><div class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Client</div><div class="text-xs font-bold text-white print:text-slate-900">${deal.clientName}</div></div>
                    <div><div class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Project</div><div class="text-xs font-bold text-white print:text-slate-900">${deal.dealName}</div></div>
                    <div><div class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Solution</div><div class="text-xs font-bold text-indigo-400 print:text-indigo-600">${deal.solution}</div></div>
                    <div><div class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Competitor</div><div class="text-xs font-bold text-rose-400 print:text-rose-600">${deal.competitive?.competitor || '-'}</div></div>
                </div>
            </div>

            <!-- Content Area -->
            <div class="p-8 md:p-14 lg:p-16 print:p-0 bg-slate-50/30">
                <div id="strategy-content" class="prose prose-slate max-w-none 
                    prose-headings:text-slate-900 prose-headings:font-black prose-headings:tracking-tight
                    prose-h1:text-2xl prose-h1:mt-0 prose-h1:mb-12 prose-h1:pb-6 prose-h1:border-b-4 prose-h1:border-indigo-100 prose-h1:text-center
                    prose-h2:text-lg prose-h2:mt-16 prose-h2:mb-6 prose-h2:flex prose-h2:items-center prose-h2:gap-3
                    prose-h2:before:content-[''] prose-h2:before:w-2 prose-h2:before:h-8 prose-h2:before:bg-indigo-600 prose-h2:before:rounded-full
                    prose-h3:text-base prose-h3:mt-10 prose-h3:mb-4 prose-h3:text-slate-800 prose-h3:font-bold
                    prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-sm prose-p:mb-6
                    prose-li:text-slate-600 prose-li:marker:text-indigo-500 prose-li:mb-2 prose-li:text-sm prose-li:leading-relaxed
                    prose-blockquote:border-l-0 prose-blockquote:bg-white prose-blockquote:p-8 prose-blockquote:rounded-2xl prose-blockquote:italic-none prose-blockquote:mt-16 prose-blockquote:mb-12 prose-blockquote:border prose-blockquote:border-slate-200 prose-blockquote:shadow-sm
                    prose-strong:text-slate-900 prose-strong:font-normal
                    prose-table:border-collapse prose-table:rounded-xl prose-table:overflow-hidden prose-table:mt-6 prose-table:mb-12 prose-table:w-full prose-table:shadow-md prose-table:border prose-table:border-slate-200
                    prose-th:bg-slate-900 prose-th:text-white prose-th:font-bold prose-th:p-4 prose-th:text-center prose-th:border-none prose-th:uppercase prose-th:tracking-wider prose-th:text-[10px]
                    prose-td:p-4 prose-td:border-b prose-td:border-slate-100 prose-td:text-sm prose-td:leading-relaxed prose-td:bg-white">
                    ${reportHtml}
                </div>
            </div>
            
            <!-- Footer -->
            <div class="bg-white px-8 py-8 border-t border-slate-100 text-center print:hidden flex flex-col items-center gap-3">
                <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
                <p class="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Generated by Deal Architect Strategy Engine</p>
            </div>
        </section>
    `;
}

function attachTWSEvents(deal, positionAnalysis) {
    const genBtn = document.getElementById('btn-gen-tws');
    const regenBtn = document.getElementById('btn-regen-tws');
    if (genBtn) genBtn.addEventListener('click', () => generateTWS(deal, positionAnalysis));
    if (regenBtn) regenBtn.addEventListener('click', () => {
        showConfirmModal("기존 전략 보고서가 덮어씌워집니다. 다시 생성하시겠습니까?", () => generateTWS(deal, positionAnalysis));
    });
}

async function generateTWS(deal, positionAnalysis) {
    const overlay = document.getElementById('strategy-generating-overlay');
    overlay.classList.remove('hidden');
    try {
        const leanDiscovery = extractEvaluationDiscoveryData(deal);
        const compSummary = { 
            strengths: positionAnalysis.strengths.join(", ") || "None Identified", 
            weaknesses: positionAnalysis.weaknesses.join(", ") || "None Identified" 
        };
        const techScore = deal.assessment.evaluation?.techScore || deal.assessment.consideration?.techScore || 'N/A';

        const prompt = `
Role: Senior B2B Presales Strategy Director. 
Context: Evaluation Stage (Proof of Value).
Objective: Create a sophisticated "Tech. Win Strategy" report that demonstrates technical superiority.
Language: Korean. Format: Professional Markdown.

Input Data:
1. Client: ${deal.clientName}
2. Our Solution: ${deal.solution}
3. Main Competitor: ${deal.competitive?.competitor || 'Unknown'}
4. Technical Fit Score: ${techScore}/100
5. Evaluation JTBD (What customer wants to achieve): ${leanDiscovery.jtbd}
6. Key Success Criteria (How they measure win): ${leanDiscovery.sc}
7. Our Relative Strengths: ${compSummary.strengths}
8. Known Gaps/Weaknesses: ${compSummary.weaknesses}

Requirements:
- Structure the report with the following specific sections using Markdown headers (#, ##).
- Each major section should have substantial spacing from the previous one.
- **CRITICAL**: All titles, headers, and content MUST be written in Korean only. 
- **CRITICAL**: DO NOT include English translations in parentheses (e.g., instead of "성공 기준(Success Criteria)", simply write "성공 기준").
- **CRITICAL**: DO NOT include "(PoV 단계)" or any stage-related suffix in the main title.
- **CRITICAL**: In Section 5 (Hypothesis), DO NOT use double quotes (") at all. Use bold text only for the header (##) and the "**핵심 가설:**" label. The actual hypothesis content MUST be plain text.
- **CRITICAL**: DO NOT use bold markers (**) for any words within sentences or lists in the entire body text. Only headers (##, ###) and table headers are allowed to be bold.
- **CRITICAL**: Ensure all body text is concise and direct.

Main Title Format: # [Our Solution Name]: [Client Name] 기술적 승리 전략 보고서

Sections:
# [Our Solution Name]: [Client Name] 기술적 승리 전략 보고서

## 1. 기술적 가치 제안
Summarize how our technical architecture directly aligns with the customer's JTBD. Strictly no bold text in paragraphs.

## 2. 핵심 요구사항 대응 전략
Create a table showing how our specific features fulfill the Key Success Criteria. Ensure content is Korean only, no bold text inside the table cells.

## 3. 경쟁사 대비 차별화 포인트
Highlight the top 2-3 technical areas where we clearly outperform the competitor. Use clear headers. No bold text in paragraphs.

## 4. 리스크 완화 전략
Address our weaknesses and explain how we will neutralize them. Strictly no bold text in paragraphs.

## 5. 기술적 승리 가설
> **핵심 가설:** 기술적으로 [A]와 [B]라는 이유로 우리가 경쟁사 대비 [C]한 가치를 제공하므로, 최종 기술 평가에서 승리한다.
(Note: The label "핵심 가설:" can be bold, but the surrounding content MUST NOT contain double quotes or any other bold markers).

Style Guide:
- Use tables for structured data.
- Avoid generic phrases; be specific to the presales context.
- Keep it concise but authoritative.
- Body text font size is assumed to be small (text-sm), so maintain clarity with short sentences.
`;

        const result = await callGemini(prompt);
        saveTWS(deal, result);
    } catch (error) {
        showToast('전략 수립 실패: ' + error.message, 'error');
    } finally {
        overlay.classList.add('hidden');
    }
}

function saveTWS(deal, resultRaw) {
    let markdownContent = typeof resultRaw === 'string' ? resultRaw : (resultRaw.text || resultRaw.content || "");
    markdownContent = markdownContent.replace(/^```markdown/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
    deal.twsReport = { content: markdownContent, updatedAt: new Date().toISOString() };
    Store.saveDeal(deal);
    showToast('전략 보고서가 성공적으로 생성되었습니다.', 'success');
    renderTWS(document.getElementById('feature-content'), deal, false);
}

function analyzeCompetitivePosition(htmlContent) {
    if (!htmlContent) return { strengths: [], weaknesses: [], parities: [], count: 0 };
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const items = [];
    doc.querySelectorAll('table tbody tr').forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 3) items.push({ name: cols[0].innerText.trim(), our: cols[1].innerText.trim(), comp: cols[2].innerText.trim() });
    });
    const strengths = [], weaknesses = [], parities = [];
    const getScore = (val) => val.includes('O') || val.includes('○') ? 2 : (val.includes('△') ? 1 : 0);
    items.forEach(item => {
        const oS = getScore(item.our), cS = getScore(item.comp);
        if (oS > cS) strengths.push(item.name); else if (oS < cS) weaknesses.push(item.name); else parities.push(item.name);
    });
    return { strengths, weaknesses, parities, count: items.length };
}

function renderPositionSummary(analysis) {
    if (analysis.count === 0) return `<div class="text-slate-400 italic text-sm py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">Competitive Fit 분석을 먼저 수행하세요.</div>`;
    
    const renderList = (items, empty, color, icon) => items.length === 0 
        ? `<p class="text-xs text-slate-400 italic px-2">${empty}</p>` 
        : `<ul class="space-y-3 mt-1">${items.map(i => `<li class="text-sm ${color} font-bold flex items-start gap-3 leading-snug"><i class="${icon} text-[10px] mt-1.5 shrink-0 opacity-80"></i><span>${i}</span></li>`).join('')}</ul>`;

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-emerald-50/40 p-6 rounded-2xl border border-emerald-100 shadow-sm">
                <h4 class="font-black text-emerald-800 text-[13px] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> Our Strengths
                </h4>
                ${renderList(analysis.strengths, '분석된 우위 요소가 없습니다.', 'text-slate-800', 'fa-solid fa-check-circle text-emerald-500')}
            </div>
            <div class="bg-rose-50/40 p-6 rounded-2xl border border-rose-100 shadow-sm">
                <h4 class="font-black text-rose-800 text-[13px] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span> Key Gaps
                </h4>
                ${renderList(analysis.weaknesses, '주요 제약 사항이 발견되지 않았습니다.', 'text-slate-800', 'fa-solid fa-circle-exclamation text-rose-500')}
            </div>
        </div>`;
}

function extractEvaluationDiscoveryData(deal) {
    const disc = deal.discovery.evaluation?.result || deal.discovery.consideration?.result || {};
    return { 
        jtbd: Array.isArray(disc.jtbd) ? disc.jtbd.join(", ") : (disc.jtbd || "Not specified"), 
        sc: Array.isArray(disc.sc) ? disc.sc.join(", ") : (disc.sc || "Not specified") 
    };
}
