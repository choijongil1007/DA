
import { Store } from '../store.js';
import { showWarningModal, showToast, setButtonLoading } from '../utils.js'; 
import { callGemini } from '../api.js';

let insightContainer = null;
let currentDealId = null;
let isViewMode = false;

export async function renderCompetitiveFit(containerOrId, dealId, isReadOnly = false) {
    if (typeof containerOrId === 'string') {
        insightContainer = document.getElementById(containerOrId);
    } else {
        insightContainer = containerOrId;
    }

    currentDealId = dealId;
    isViewMode = isReadOnly;
    
    if (!insightContainer) {
        console.error("Competitive Fit container not found");
        return;
    }

    const deal = await Store.getDeal(currentDealId);
    await renderUI(deal);
}

async function renderUI(deal) {
    if (!deal) deal = await Store.getDeal(currentDealId);
    
    const compState = deal.competitive || { 
        competitor: '', 
        ourProduct: deal.solution || '', 
        requirements: [], 
        functionalRequirements: [], 
        result: null 
    };
    
    const ourProduct = compState.ourProduct || deal.solution || '';
    const competitor = compState.competitor || '';

    const inputStateClass = isViewMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900';
    const disabledAttr = isViewMode ? 'disabled' : '';
    const displayResult = compState.result ? '' : 'hidden';
    const displayPlaceholder = compState.result ? 'hidden' : '';
    
    const isGenButtonDisabled = !!compState.result;
    const genButtonClass = isGenButtonDisabled 
        ? 'bg-slate-400 cursor-not-allowed opacity-60' 
        : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 active:scale-95';

    insightContainer.innerHTML = `
        <div class="flex flex-col gap-6 w-full max-w-full overflow-hidden animate-modal-in">
             <div class="mb-4 pb-2 border-b border-slate-200 flex justify-between items-end">
                <div>
                    <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Competitive Fit${isViewMode ? ' (조회 전용)' : ''}</h2>
                    <p class="text-slate-500 text-sm mt-1 font-medium">경쟁 우위 분석 및 대응 전략 수립</p>
                </div>
                ${isViewMode ? '<span class="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded border border-slate-200">View Only</span>' : ''}
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm no-print">
                <h3 class="text-lg font-bold text-slate-800 mb-4">분석 설정</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label class="block text-sm font-semibold text-slate-600 mb-1.5">자사 제품 (필수)</label>
                        <input type="text" id="insight-our-product" class="input-enterprise w-full ${inputStateClass}" value="${ourProduct}" placeholder="예: Atlassian Jira" ${disabledAttr}>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-600 mb-1.5">경쟁사 제품 (필수)</label>
                        <input type="text" id="insight-competitor" class="input-enterprise w-full ${inputStateClass}" value="${competitor}" placeholder="예: ServiceNow ITOM" ${disabledAttr}>
                    </div>
                </div>

                <div class="border-t border-slate-100 pt-5 mb-6">
                    <div class="flex justify-between items-center mb-2">
                        <label class="block text-sm font-bold text-slate-800">1. 핵심 고객 요구사항 (Key Requirements)</label>
                        ${!isViewMode ? `
                        <div class="flex gap-2">
                            <button id="btn-extract-reqs" class="text-xs flex items-center gap-1 text-indigo-800 hover:text-indigo-900 font-bold bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                                <i class="fa-solid fa-wand-magic-sparkles"></i> AI 추출 (KR & KFR)
                            </button>
                            <button id="btn-add-req" class="text-xs flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold bg-white border border-slate-300 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-slate-50">
                                <i class="fa-solid fa-plus"></i> 추가
                            </button>
                        </div>
                        ` : ''}
                    </div>
                    <div id="req-input-container" class="space-y-2.5"></div>
                </div>

                <div class="border-t border-slate-100 pt-5 mb-6">
                    <div class="flex justify-between items-center mb-2">
                        <label class="block text-sm font-bold text-slate-800">2. 핵심 기능 요건 (Key Functional Requirements)</label>
                        ${!isViewMode ? `
                        <div class="flex gap-2">
                            <button id="btn-add-func-req" class="text-xs flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold bg-white border border-slate-300 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-slate-50">
                                <i class="fa-solid fa-plus"></i> 추가
                            </button>
                        </div>
                        ` : ''}
                    </div>
                    <div id="func-req-input-container" class="space-y-2.5"></div>
                </div>

                ${!isViewMode ? `
                <div class="flex justify-end">
                    <button id="btn-generate-insight" class="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl transition-all text-sm font-bold ${genButtonClass}" ${isGenButtonDisabled ? 'disabled' : ''}>
                        <i class="fa-solid fa-wand-magic-sparkles"></i> AI 경쟁 분석 실행
                    </button>
                </div>
                ` : ''}
            </div>

            <div class="flex flex-col min-h-[400px] border border-slate-100 rounded-3xl bg-white shadow-xl relative w-full overflow-hidden" id="insight-result-container">
                <div class="p-8 pb-24 w-full overflow-x-hidden" id="insight-scroll-area">
                    <div id="insight-placeholder" class="flex flex-col items-center justify-center py-24 text-slate-400 ${displayPlaceholder}">
                        <div class="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 text-slate-300 border border-slate-100">
                            <i class="fa-solid fa-chart-simple text-3xl"></i>
                        </div>
                        <p class="font-bold text-slate-500">분석 결과가 여기에 표시됩니다</p>
                    </div>
                    <div id="insight-content" class="report-content w-full prose prose-slate max-w-none 
                        prose-headings:text-slate-900 prose-headings:font-black prose-headings:tracking-tight
                        prose-h1:text-2xl prose-h1:mt-0 prose-h1:mb-12 prose-h1:pb-6 prose-h1:border-b-4 prose-h1:border-slate-100 prose-h1:text-center
                        prose-h2:text-lg prose-h2:mt-16 prose-h2:mb-6 prose-h2:flex prose-h2:items-center prose-h2:gap-3
                        prose-h2:before:content-[''] prose-h2:before:w-2 prose-h2:before:h-8 prose-h2:before:bg-slate-900 prose-h2:before:rounded-full
                        prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-sm prose-p:mb-6
                        prose-li:text-slate-600 prose-li:text-sm prose-li:leading-relaxed
                        prose-table:border-collapse prose-table:rounded-xl prose-table:overflow-hidden prose-table:mt-6 prose-table:mb-12 prose-table:w-full prose-table:shadow-md prose-table:border prose-table:border-slate-200
                        prose-th:bg-slate-900 prose-th:text-white prose-th:font-extrabold prose-th:p-4 prose-th:text-center prose-th:border-none prose-th:uppercase prose-th:tracking-wider prose-th:text-[11px]
                        prose-td:p-4 prose-td:border-b prose-td:border-slate-100 prose-td:text-sm prose-td:leading-relaxed prose-td:bg-white text-slate-700 ${displayResult}">
                        ${compState.result || ''}
                    </div>
                </div>

                <div id="insight-loading" class="hidden absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-20 rounded-xl">
                    <div class="spinner border-indigo-600 border-t-transparent w-12 h-12 mb-4"></div>
                    <p class="text-indigo-600 font-black animate-pulse">고객 요구사항 기반 경쟁 분석 중...</p>
                </div>

                <div id="insight-action-bar" class="hidden absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-end z-10 rounded-b-3xl">
                    <button id="btn-save-as-report" class="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg font-bold text-sm transform active:scale-95">
                        <i class="fa-regular fa-file-lines"></i> 보고서로 저장
                    </button>
                </div>
            </div>
        </div>

        <!-- Save Report Modal -->
        <div id="modal-save-comp-report" class="fixed inset-0 z-[150] hidden flex items-center justify-center p-4">
            <div id="modal-save-comp-report-bg" class="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity opacity-0"></div>
            <div id="modal-save-comp-report-panel" class="relative bg-white rounded-xl shadow-modal p-6 max-w-md w-full transform transition-all scale-95 opacity-0 border border-slate-200">
                <h3 class="text-lg font-bold text-slate-900 mb-4">경쟁 분석 보고서 저장</h3>
                <div class="mb-6">
                    <label class="block text-xs font-bold text-slate-500 mb-1.5 ml-1">보고서 이름</label>
                    <input type="text" id="input-comp-report-name" class="input-enterprise w-full" placeholder="보고서 이름을 입력하세요">
                </div>
                <div class="flex gap-3 justify-end">
                    <button id="btn-cancel-save-comp-report" class="text-slate-500 hover:text-slate-700 font-medium text-sm px-3">취소</button>
                    <button id="btn-confirm-save-comp-report" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors text-sm shadow-md">저장</button>
                </div>
            </div>
        </div>
    `;

    const reqs = compState.requirements || [];
    if (reqs.length === 0 && !isViewMode) {
        addListItemInput("req-input-container", "req-input", "", "요구사항");
    } else {
        reqs.forEach(req => addListItemInput("req-input-container", "req-input", req, "요구사항", isViewMode));
    }

    const funcReqs = compState.functionalRequirements || [];
    if (funcReqs.length === 0 && !isViewMode) {
        addListItemInput("func-req-input-container", "func-req-input", "", "기능 요건");
    } else {
        funcReqs.forEach(req => addListItemInput("func-req-input-container", "func-req-input", req, "기능 요건", isViewMode));
    }

    const actionBar = document.getElementById('insight-action-bar');
    if (compState.result && !isViewMode && actionBar) {
        actionBar.classList.remove('hidden');
    }

    if (!isViewMode) {
        document.getElementById('btn-add-req')?.addEventListener('click', async () => {
            addListItemInput("req-input-container", "req-input", "", "추가 요구사항");
            await saveState();
            enableGenButton();
        });

        document.getElementById('btn-add-func-req')?.addEventListener('click', async () => {
            addListItemInput("func-req-input-container", "func-req-input", "", "추가 기능 요건");
            await saveState();
            enableGenButton();
        });

        document.getElementById('btn-extract-reqs')?.addEventListener('click', extractRequirementsFromDiscovery);
        document.getElementById('btn-generate-insight')?.addEventListener('click', generateInsight);
        document.getElementById('btn-save-as-report')?.addEventListener('click', openSaveReportModal);

        const productInput = document.getElementById('insight-our-product');
        const competitorInput = document.getElementById('insight-competitor');
        
        const handleInputChange = async () => {
            await saveState();
            enableGenButton();
        };

        productInput?.addEventListener('input', handleInputChange);
        competitorInput?.addEventListener('input', handleInputChange);

        setupSaveModal();
    }
}

function setupSaveModal() {
    const cancelBtn = document.getElementById('btn-cancel-save-comp-report');
    const confirmBtn = document.getElementById('btn-confirm-save-comp-report');
    const bg = document.getElementById('modal-save-comp-report-bg');

    cancelBtn.onclick = closeSaveReportModal;
    bg.onclick = closeSaveReportModal;
    confirmBtn.onclick = async () => {
        const title = document.getElementById('input-comp-report-name').value.trim();
        const contentHTML = document.getElementById('insight-content').innerHTML;
        if (!title) {
            showToast("보고서 이름을 입력해주세요.", "error");
            return;
        }
        await Store.addReport(currentDealId, title, contentHTML, 'competitive_insight');
        showToast("보고서가 'Reports' 메뉴에 저장되었습니다.", "success");
        closeSaveReportModal();
    };
}

function openSaveReportModal() {
    const modal = document.getElementById('modal-save-comp-report');
    const panel = document.getElementById('modal-save-comp-report-panel');
    const bg = document.getElementById('modal-save-comp-report-bg');
    const input = document.getElementById('input-comp-report-name');

    const ourProduct = document.getElementById('insight-our-product').value || '자사 제품';
    const competitor = document.getElementById('insight-competitor').value || '경쟁사 제품';
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    input.value = `${ourProduct} vs ${competitor} 비교 분석_${dateStr}`;

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        bg.classList.remove('opacity-0');
        panel.classList.remove('scale-95', 'opacity-0');
        panel.classList.add('scale-100', 'opacity-100');
    });
}

function closeSaveReportModal() {
    const modal = document.getElementById('modal-save-comp-report');
    const panel = document.getElementById('modal-save-comp-report-panel');
    const bg = document.getElementById('modal-save-comp-report-bg');
    bg.classList.add('opacity-0');
    panel.classList.remove('scale-100', 'opacity-100');
    panel.classList.add('scale-95', 'opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

function enableGenButton() {
    const btn = document.getElementById('btn-generate-insight');
    if (btn) {
        btn.disabled = false;
        btn.classList.remove('bg-slate-400', 'cursor-not-allowed', 'opacity-60');
        btn.classList.add('bg-indigo-600', 'hover:bg-indigo-700', 'shadow-md', 'active:scale-95');
    }
}

function addListItemInput(containerId, inputClass, value = "", placeholderText = "입력", readOnly = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const inputWrapper = document.createElement('div');
    inputWrapper.className = "flex items-center gap-2";
    
    const input = document.createElement('input');
    input.type = "text";
    input.className = `input-enterprise w-full ${inputClass} ${readOnly ? 'bg-slate-100 text-slate-500' : 'bg-white'}`;
    input.placeholder = placeholderText;
    input.value = value;
    if (readOnly) input.disabled = true;
    else {
        input.addEventListener('change', async () => await saveState());
        input.addEventListener('input', enableGenButton);
    }
    
    inputWrapper.appendChild(input);

    if (!readOnly) {
        const btnDel = document.createElement('button');
        btnDel.className = "p-2 text-slate-400 hover:text-red-500";
        btnDel.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
        btnDel.onclick = async () => { 
            inputWrapper.remove(); 
            await saveState(); 
            enableGenButton(); 
        };
        inputWrapper.appendChild(btnDel);
    }

    container.appendChild(inputWrapper);
}

async function saveState() {
    if (isViewMode) return;
    const deal = await Store.getDeal(currentDealId);
    if (!deal) return;

    const ourProduct = document.getElementById('insight-our-product')?.value || '';
    const competitor = document.getElementById('insight-competitor')?.value || '';
    const reqInputs = document.querySelectorAll('.req-input');
    const requirements = Array.from(reqInputs).map(input => input.value);
    const funcReqInputs = document.querySelectorAll('.func-req-input');
    const functionalRequirements = Array.from(funcReqInputs).map(input => input.value);
    
    if (!deal.competitive) deal.competitive = {};
    deal.competitive.ourProduct = ourProduct;
    deal.competitive.competitor = competitor;
    deal.competitive.requirements = requirements;
    deal.competitive.functionalRequirements = functionalRequirements;
    
    await Store.saveDeal(deal);
}

async function extractRequirementsFromDiscovery() {
    const deal = await Store.getDeal(currentDealId);
    if (!deal) return;
    const btn = document.getElementById('btn-extract-reqs');
    
    let discoveryText = "";
    const stages = ['awareness', 'consideration', 'evaluation', 'purchase'];
    stages.forEach(stage => {
        const data = deal.discovery[stage];
        if (data && data.result) {
            if (data.result.sc) discoveryText += `[${stage} SC]: ${data.result.sc}\n`;
            if (data.result.jtbd) discoveryText += `[${stage} JTBD]: ${data.result.jtbd}\n`;
        }
    });

    if (!discoveryText) {
        showToast("분석할 Discovery 데이터가 없습니다.", "error");
        return;
    }

    setButtonLoading(btn, true, "요구사항 분석 중...");
    try {
        const prompt = `From the following discovery data, extract up to 5 strategic Key Requirements (Outcome-focused) and up to 5 Key Functional Requirements.
Discovery Data:
${discoveryText}

Rules:
1. Max 5 items per category.
2. Focus on critical strategic value and high-level decision criteria.
3. Exclude granular technical test cases or implementation details.
4. Return JSON: {requirements: [], functionalRequirements: []}. Language: Korean.`;

        const result = await callGemini(prompt);
        const reqContainer = document.getElementById('req-input-container');
        const funcReqContainer = document.getElementById('func-req-input-container');
        
        reqContainer.innerHTML = '';
        (result.requirements || []).forEach(req => addListItemInput("req-input-container", "req-input", req));
        funcReqContainer.innerHTML = '';
        (result.functionalRequirements || []).forEach(req => addListItemInput("func-req-input-container", "func-req-input", req));

        await saveState(); 
        enableGenButton();
        showToast("추출 완료", "success");
    } catch (error) {
        showToast("추출 실패: " + error.message, "error");
    } finally {
        setButtonLoading(btn, false);
    }
}

async function generateInsight() {
    const competitor = document.getElementById('insight-competitor').value.trim();
    const ourProduct = document.getElementById('insight-our-product').value.trim();
    if (!competitor || !ourProduct) { showWarningModal("자사 및 경쟁사 제품명을 입력해주세요."); return; }

    const loading = document.getElementById('insight-loading');
    const resultArea = document.getElementById('insight-content');
    const placeholder = document.getElementById('insight-placeholder');
    const actionBar = document.getElementById('insight-action-bar');
    
    placeholder.classList.add('hidden');
    resultArea.classList.add('hidden');
    actionBar.classList.add('hidden');
    loading.classList.remove('hidden');

    try {
        const deal = await Store.getDeal(currentDealId);
        const reqs = Array.from(document.querySelectorAll('.req-input')).map(i => i.value).filter(v => v.trim()).join(', ');
        const funcReqs = Array.from(document.querySelectorAll('.func-req-input')).map(i => i.value).filter(v => v.trim()).join(', ');
        
        const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
        
        const prompt = `Role: Senior Presales Consultant.
Task: Create a professional competitive comparison report between "${ourProduct}" (자사) and "${competitor}" (경쟁사).
Language: Korean.
Output Format: HTML with Tailwind CSS classes.

Rules:
1. NO introductory greetings or closing remarks. Start immediately with the title.
2. Title Styling: 
   - <h1 class="text-3xl font-bold text-slate-900 mb-2 tracking-tight">${ourProduct} vs ${competitor}</h1>
   - <p class="text-sm text-slate-500 mb-10 font-medium">생성 일자: ${today}</p>
3. Table Styling:
   - Apply 'text-sm' class to all table cells (td) and header cells (th) to ensure clear readability.
   - Background for headers: bg-slate-900.
   - Text for headers: text-white font-extrabold text-[11px] text-center uppercase tracking-wider py-4.
4. Section 1: 핵심 고객 요구사항 (Key Requirements)
   - Input KR: ${reqs}
   - Table Columns: 항목, 분석 및 비교.
   - Analysis Rule: For the comparison column, start with a symbol (O, △, X) followed by a clear, concise comparative sentence. Ensure the cell uses 'text-sm'.
5. Section 2: 핵심 기능 요건 (Key Functional Requirements)
   - Input KFR: ${funcReqs}
   - Table Columns: 기능 요건, ${ourProduct}, ${competitor}.
   - Content: Use symbols (O, △, X) primarily. Ensure the cell uses 'text-sm'.
6. Summary Section:
   - At the end, add a <div class="mt-12 p-8 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
   - <h2 class="text-xl font-bold text-slate-900 mb-4">종합 분석 및 전략 요약</h2>
   - Provide 3-4 bullet points summarizing the strategic takeaways. Ensure text size is consistent with tables (text-sm).
7. Tone: Objective, factual, and data-driven. Use Tailwind for professional spacing (e.g., mb-12 between sections).`;

        const result = await callGemini(prompt);
        
        let htmlContent = typeof result === 'string' ? result : (result.text || result.content || '');
        htmlContent = htmlContent.replace(/```html/g, "").replace(/```/g, "");
        resultArea.innerHTML = htmlContent;
        
        loading.classList.add('hidden');
        resultArea.classList.remove('hidden');
        actionBar.classList.remove('hidden');
        
        deal.competitive.result = htmlContent;
        await Store.saveDeal(deal);
    } catch (error) {
        showToast("분석 오류: " + error.message, "error");
        loading.classList.add('hidden');
    }
}

function analyzeCompetitivePosition(htmlContent) {
    if (!htmlContent) return { strengths: [], weaknesses: [], parities: [], count: 0 };
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const items = [];
    doc.querySelectorAll('table tbody tr').forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 2) items.push({ name: cols[0].innerText.trim(), content: cols[1].innerText.trim() });
    });
    // Simple analysis for UI feedback
    const strengths = [], weaknesses = [];
    items.forEach(item => {
        if (item.content.includes('O')) strengths.push(item.name);
        else if (item.content.includes('X')) weaknesses.push(item.name);
    });
    return { strengths, weaknesses, count: items.length };
}

function extractEvaluationDiscoveryData(deal) {
    const disc = deal.discovery.evaluation?.result || deal.discovery.consideration?.result || {};
    return { 
        jtbd: Array.isArray(disc.jtbd) ? disc.jtbd.join(", ") : (disc.jtbd || "Not specified"), 
        sc: Array.isArray(disc.sc) ? disc.sc.join(", ") : (disc.sc || "Not specified") 
    };
}
