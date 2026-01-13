
import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showToast, showConfirmModal, generateId } from '../utils.js';

export function renderDWS(container, deal, isReadOnly) {
    const risks = deal.decisionRisks || [];
    const purchaseDiscovery = deal.discovery.purchase?.result;
    const hasDiscovery = !!purchaseDiscovery;
    const hasTWS = !!deal.twsReport;

    let reportHtml = '';
    if (deal.dwsReport && deal.dwsReport.content) {
        let content = deal.dwsReport.content;
        if (window.marked && !content.trim().startsWith('<')) {
            content = window.marked.parse(content);
        }
        reportHtml = content;
    }

    container.innerHTML = `
        <div class="flex flex-col h-full animate-modal-in max-w-5xl mx-auto w-full gap-10 pb-20">
            <div class="border-b border-slate-200 pb-4 no-print flex justify-between items-center">
                <div>
                    <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Deal Win Strategy</h2>
                    <p class="text-slate-500 text-sm mt-1 font-medium">구매 단계(Purchase): 최종 의사결정 유도 및 리스크 관리</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold border border-indigo-700 shadow-sm">Purchase Stage</span>
                </div>
            </div>

            <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden no-print">
                <div class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 class="font-bold text-slate-800 text-sm tracking-wide flex items-center gap-2">
                        <i class="fa-solid fa-triangle-exclamation text-slate-500"></i> Decision Risks
                    </h3>
                    ${!isReadOnly ? `<button id="btn-add-risk" class="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1"><i class="fa-solid fa-plus"></i> 리스크 추가</button>` : ''}
                </div>
                <div class="p-6">
                    ${risks.length === 0 ? `<div class="text-center text-slate-400 text-sm py-4 italic">등록된 리스크가 없습니다.</div>` : renderRiskTable(risks, isReadOnly)}
                </div>
            </section>

            <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden no-print">
                <div class="bg-slate-50 px-6 py-4 border-b border-slate-100">
                    <h3 class="font-bold text-slate-800 text-sm tracking-wide flex items-center gap-2">
                        <i class="fa-solid fa-bullseye text-slate-500"></i> Purchase Context
                    </h3>
                </div>
                <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-indigo-50/30 p-4 rounded-lg border border-indigo-100">
                        <div class="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Purchase JTBD</div>
                        <ul class="text-sm text-slate-700 space-y-1 list-disc pl-4 font-medium">${renderListItems(purchaseDiscovery?.jtbd)}</ul>
                    </div>
                    <div class="bg-emerald-50/40 p-4 rounded-lg border border-emerald-100">
                        <div class="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Purchase Success Criteria</div>
                        <ul class="text-sm text-slate-700 space-y-1 list-disc pl-4 font-medium">${renderListItems(purchaseDiscovery?.sc)}</ul>
                    </div>
                </div>
                <div class="px-6 pb-6">
                    <div class="flex items-center gap-2 px-4 py-2.5 bg-slate-100 rounded-lg border border-slate-200 shadow-inner">
                        <i class="fa-solid fa-circle-check ${hasTWS ? 'text-emerald-500' : 'text-slate-300'} text-xs"></i>
                        <span class="text-xs font-bold text-slate-600">Technical Win Strategy (Prerequisite): ${hasTWS ? 'Verified' : 'Missing'}</span>
                    </div>
                </div>
            </section>

            ${deal.dwsReport ? renderDWSReportBlock(deal, reportHtml, isReadOnly) : renderDWSTriggerBlock(isReadOnly, hasDiscovery)}

            <div id="strategy-generating-overlay" class="hidden fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-center">
                <div class="spinner border-indigo-500 border-t-transparent w-16 h-16 mb-6"></div>
                <h3 class="text-2xl font-bold text-white mb-2">Deal Win Strategy 생성 중...</h3>
                <p class="text-indigo-200 text-sm animate-pulse mb-8">리스크와 성공 기준을 분석하여 최종 의사결정 전략을 도출하고 있습니다.</p>
            </div>
        </div>

        <div id="risk-modal" class="fixed inset-0 z-[150] hidden flex items-center justify-center p-4">
            <div id="risk-modal-backdrop" class="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity opacity-0"></div>
            <div id="risk-modal-panel" class="relative bg-white rounded-xl shadow-modal p-6 max-w-md w-full transform transition-all scale-95 opacity-0 border border-slate-200">
                <h3 class="text-lg font-bold text-slate-900 mb-4">Decision Risk 추가</h3>
                <form id="risk-form" class="space-y-4">
                    <div><label class="block text-xs font-bold text-slate-500 mb-1">유형 (Type)</label><select id="risk-type" class="input-enterprise w-full"><option value="Contract">계약 (Contract)</option><option value="Organization">조직/정치 (Organization)</option><option value="Execution">실행/기술 (Execution)</option><option value="Responsibility">책임 소재 (Responsibility)</option></select></div>
                    <div><label class="block text-xs font-bold text-slate-500 mb-1">내용 (Description)</label><input type="text" id="risk-desc" class="input-enterprise w-full" placeholder="리스크 내용 입력" required></div>
                    <div class="grid grid-cols-2 gap-4"><div><label class="block text-xs font-bold text-slate-500 mb-1">심각도 (Severity)</label><select id="risk-severity" class="input-enterprise w-full"><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div><div><label class="block text-xs font-bold text-slate-500 mb-1">담당자 (Owner)</label><input type="text" id="risk-owner" class="input-enterprise w-full" placeholder="예: 영업대표"></div></div>
                    <div class="flex gap-3 justify-end pt-2"><button type="button" id="btn-cancel-risk" class="text-slate-500 hover:text-slate-700 font-medium text-sm px-3">취소</button><button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors text-sm shadow-md">추가</button></div>
                </form>
            </div>
        </div>
    `;

    attachDWSEvents(deal);
}

function renderDWSTriggerBlock(isReadOnly, isReady) {
    const desc = `<span class="text-white font-bold">리스크(Risk)</span>와 <span class="text-white font-bold">성공 기준(SC)</span>을 바탕으로,<br>AI가 <span class="text-indigo-300 font-bold">의사결정 1-Pager</span>와 <span class="text-indigo-300 font-bold">Close Readiness</span>를 진단합니다.`;
    const disabledAttr = !isReady ? 'disabled title="Purchase Discovery 데이터가 부족합니다"' : '';
    return `
        <section class="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden text-center p-16 relative no-print border border-white/10">
            <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <div class="flex flex-col items-center max-w-xl mx-auto">
                <div class="w-20 h-20 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-8 text-indigo-400 backdrop-blur-md border border-indigo-500/30 shadow-inner">
                    <i class="fa-solid fa-file-signature text-4xl"></i>
                </div>
                <h3 class="text-3xl font-bold text-white mb-4 tracking-tight">Deal Win Strategy 수립</h3>
                <p class="text-slate-400 text-base mb-10 leading-relaxed">${desc}</p>
                ${!isReadOnly ? `
                <button id="btn-gen-dws" class="bg-indigo-600 text-white hover:bg-indigo-500 px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3 transform hover:scale-105 active:scale-95" ${disabledAttr}>
                    <i class="fa-solid fa-wand-magic-sparkles"></i> AI 전략 생성 실행
                </button>
                 ` : `<span class="text-slate-500 bg-slate-800 px-6 py-3 rounded-xl text-sm font-bold border border-slate-700">View Only Mode</span>`}
            </div>
        </section>
    `;
}

function renderDWSReportBlock(deal, reportHtml, isReadOnly) {
    return `
        <section class="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative print:shadow-none print:border-0 print:rounded-none">
            <!-- Header Banner (TWS와 동일) -->
            <div class="bg-slate-900 border-b border-slate-800 p-10 md:p-12 print:bg-white print:p-0 print:border-b-2 print:border-black print:mb-10">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-3 border border-indigo-500/20">
                            Executive Decision Document
                        </div>
                        <h1 class="text-4xl font-black text-white tracking-tighter mb-2">Deal Win Strategy Report</h1>
                        <p class="text-slate-400 text-base font-medium">Strategic Close Readiness & Executive Decision Support</p>
                    </div>
                    <div class="flex gap-3 no-print">
                        ${!isReadOnly ? `
                        <button id="btn-regen-dws" class="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 backdrop-blur-sm shadow-inner">
                            <i class="fa-solid fa-rotate"></i> 전략 재생성
                        </button>
                        ` : ''}
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm print:bg-white print:border-slate-200 print:text-slate-900">
                    <div><div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Client</div><div class="text-sm font-bold text-white print:text-slate-900">${deal.clientName}</div></div>
                    <div><div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Project</div><div class="text-sm font-bold text-white print:text-slate-900">${deal.dealName}</div></div>
                    <div><div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Proposed Solution</div><div class="text-sm font-bold text-indigo-400 print:text-indigo-600">${deal.solution}</div></div>
                    <div><div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Status</div><div class="text-sm font-bold text-emerald-400 print:text-emerald-600">Purchase Pending</div></div>
                </div>
            </div>

            <!-- Content Area (TWS와 동일한 여백 정책) -->
            <div class="p-10 md:p-16 print:p-0">
                <div id="strategy-content" class="prose prose-slate max-w-none 
                    prose-headings:text-slate-900 prose-headings:font-black prose-headings:tracking-tight
                    prose-h1:text-3xl prose-h1:mt-24 prose-h1:mb-12 prose-h1:pb-4 prose-h1:border-b-2 prose-h1:border-slate-100
                    prose-h2:text-xl prose-h2:mt-20 prose-h2:mb-8 prose-h2:flex prose-h2:items-center prose-h2:gap-3
                    prose-h2:before:content-[''] prose-h2:before:w-2 prose-h2:before:h-8 prose-h2:before:bg-indigo-600 prose-h2:before:rounded-full
                    prose-h3:text-lg prose-h3:mt-16 prose-h3:mb-6 prose-h3:text-slate-800
                    prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-base prose-p:mb-8
                    prose-li:text-slate-700 prose-li:marker:text-indigo-500 prose-li:mb-2 font-medium
                    prose-blockquote:border-l-0 prose-blockquote:bg-indigo-50 prose-blockquote:p-8 prose-blockquote:rounded-3xl prose-blockquote:not-italic prose-blockquote:mt-24 prose-blockquote:mb-16 prose-blockquote:border-2 prose-blockquote:border-indigo-100
                    prose-strong:text-slate-900 prose-strong:font-bold
                    prose-table:border-hidden prose-table:rounded-2xl prose-table:overflow-hidden prose-table:shadow-sm prose-table:mt-8 prose-table:mb-12
                    prose-th:bg-slate-50 prose-th:text-slate-900 prose-th:font-bold prose-th:p-4
                    prose-td:p-4 prose-td:border-b prose-td:border-slate-100">
                    ${reportHtml}
                </div>
            </div>

            <!-- Footer -->
            <div class="bg-slate-50 px-10 py-6 border-t border-slate-100 text-center print:hidden">
                <p class="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">Generated by Deal Architect Strategy Engine</p>
            </div>
        </section>`;
}

function attachDWSEvents(deal) {
    const addRiskBtn = document.getElementById('btn-add-risk');
    const genBtn = document.getElementById('btn-gen-dws');
    const regenBtn = document.getElementById('btn-regen-dws');
    
    if (addRiskBtn) addRiskBtn.onclick = () => {
        const modal = document.getElementById('risk-modal');
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            document.getElementById('risk-modal-backdrop').classList.remove('opacity-0');
            document.getElementById('risk-modal-panel').classList.remove('opacity-0', 'scale-95');
            document.getElementById('risk-modal-panel').classList.add('opacity-100', 'scale-100');
        });
    };

    document.getElementById('btn-cancel-risk').onclick = () => {
        const modal = document.getElementById('risk-modal');
        document.getElementById('risk-modal-backdrop').classList.add('opacity-0');
        document.getElementById('risk-modal-panel').classList.add('scale-95', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 200);
    };

    document.getElementById('risk-form').onsubmit = (e) => {
        e.preventDefault();
        const risk = { id: generateId(), type: document.getElementById('risk-type').value, description: document.getElementById('risk-desc').value, severity: document.getElementById('risk-severity').value, owner: document.getElementById('risk-owner').value };
        deal.decisionRisks.push(risk);
        Store.saveDeal(deal);
        showToast('리스크가 추가되었습니다.', 'success');
        renderDWS(document.getElementById('feature-content'), deal, false);
    };

    if (genBtn) genBtn.onclick = () => generateDWS(deal);
    if (regenBtn) regenBtn.onclick = () => showConfirmModal("기존 보고서가 덮어씌워집니다. 다시 생성하시겠습니까?", () => generateDWS(deal));

    document.querySelectorAll('.btn-delete-risk').forEach(btn => btn.onclick = () => {
        deal.decisionRisks.splice(parseInt(btn.dataset.idx), 1);
        Store.saveDeal(deal);
        renderDWS(document.getElementById('feature-content'), deal, false);
    });
}

async function generateDWS(deal) {
    const overlay = document.getElementById('strategy-generating-overlay');
    overlay.classList.remove('hidden');
    try {
        const disc = deal.discovery.purchase?.result || {};
        const jtbd = Array.isArray(disc.jtbd) ? disc.jtbd.join(", ") : (disc.jtbd || "Not specified");
        const sc = Array.isArray(disc.sc) ? disc.sc.join(", ") : (disc.sc || "Not specified");
        const risks = (deal.decisionRisks || []).map(r => `- [${r.type}] ${r.description} (${r.severity})`).join("\n");
        const twsContext = deal.twsReport ? deal.twsReport.content : "Not available";

        const prompt = `Role: Senior B2B Sales Strategy Director. 
Context: Purchase Stage (Final Closing). 
Objective: Create a high-stakes "Deal Win Strategy" report for executive decision support.
Language: Korean. Format: Professional Markdown.

Input: 
1. Purchase JTBD: ${jtbd}
2. Purchase SC (Procurement/Budget/Approval): ${sc}
3. Decision Risks: ${risks}
4. Technical Win Strategy Context: ${twsContext}

Requirements:
- Use consistent bullet points (-) for all lists. Do not use numbers unless explicitly referring to a sequence of steps.
- Maintain substantial vertical spacing between sections using headers (#, ##).
- Use professional, punchy titles.

Output Structure:
# 1. Executive Decision 1-Pager
- **Purchase JTBD 요약**: 고객이 이 계약을 통해 달성하고자 하는 최종 비즈니스 가치.
- **Top Decision Risk**: 현재 가장 치명적인 리스크 2가지 선정 및 요약.
- **Purchase Success Criteria**: 계약 승인을 위해 충족되어야 할 핵심 조건.
- **Deal Win Hypothesis**: (Write this hypothesis inside a blockquote)
> **승리 가설:** "[A] 리스크를 제거하고 [B] 조건을 충족시키면 계약을 승인할 수 있다."

# 2. Deal Win Strategy (Extended)
- **Technical Win Strategy 정렬**: 기술적으로 검증된 가치가 비즈니스 승인으로 이어지는 논리적 연결 고리.
- **Decision Risk 대응 전략**: 각 리스크별 구체적인 해소 및 방어 시나리어.
- **Non-Negotiable 조건**: 우리가 반드시 고수해야 하거나, 고객이 양보하지 않을 핵심 조건.
- **Do / Don’t 가이드**: 클로징을 위해 즉시 실행해야 할 행동과 피해야 할 행동 리스트.

# 3. Close Readiness Check
- **최종 진단 (Status)**: Ready to Close / Hold (이유 포함).
- **Next Action Items**: 담당자별 최종 실행 과제.

Style Guide:
- Use bold text for emphasis.
- Use tables for structured comparisons if necessary.
- Avoid generic phrases; be specific to the executive decision context.`;

        const result = await callGemini(prompt);
        saveDWS(deal, result);
    } catch (error) {
        showToast('전략 수립 실패: ' + error.message, 'error');
    } finally {
        overlay.classList.add('hidden');
    }
}

function saveDWS(deal, resultRaw) {
    let markdownContent = typeof resultRaw === 'string' ? resultRaw : (resultRaw.text || resultRaw.content || "");
    markdownContent = markdownContent.replace(/^```markdown/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
    deal.dwsReport = { content: markdownContent, updatedAt: new Date().toISOString(), isDWS: true };
    Store.saveDeal(deal);
    showToast('전략 보고서가 성공적으로 생성되었습니다.', 'success');
    renderDWS(document.getElementById('feature-content'), deal, false);
}

function renderRiskTable(risks, isReadOnly) {
    return `<div class="overflow-x-auto rounded-lg border border-slate-200"><table class="w-full text-left text-sm"><thead class="bg-slate-50 border-b font-bold text-slate-600"><tr><th class="p-3">유형</th><th class="p-3">내용</th><th class="p-3">심각도</th><th class="p-3">담당자</th>${!isReadOnly ? `<th class="p-3 text-center">관리</th>` : ''}</tr></thead><tbody>${risks.map((r, i) => `<tr class="border-b"><td class="p-3">${r.type}</td><td class="p-3">${r.description}</td><td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.severity === 'High' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}">${r.severity}</span></td><td class="p-3 text-slate-500 font-medium">${r.owner}</td>${!isReadOnly ? `<td class="p-3 text-center"><button class="btn-delete-risk text-slate-300 hover:text-red-500" data-idx="${i}"><i class="fa-solid fa-trash-can"></i></button></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}

function renderListItems(items) {
    if (!items) return '<li>Not specified</li>';
    const list = Array.isArray(items) ? items : [items];
    return list.map(i => `<li>${i}</li>`).join('');
}
