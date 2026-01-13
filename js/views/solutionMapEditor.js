
import { Store } from '../store.js';
import { showWarningModal, showConfirmModal } from '../utils.js';
import { callGemini } from '../api.js';

const expandedState = new Set();
let container = null;
let currentDealId = null;
let refreshCallback = null;
let currentDomainForModal = null;
let currentCategoryForModal = null;
let currentSolutionIndexForModal = null;

const ICONS = {
    chevronRight: `<svg class="w-4 h-4 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
    chevronDown: `<svg class="w-4 h-4 text-slate-500 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
    plus: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    edit: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    trash: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    check: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    x: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
};

export async function initTreeBuilder(elementId, dealId, onUpdate) {
    container = document.getElementById(elementId);
    currentDealId = dealId;
    refreshCallback = onUpdate;
    if (!container) return;
    const addDomainBtn = document.getElementById('btn-add-domain');
    if (addDomainBtn) {
        const newBtn = addDomainBtn.cloneNode(true);
        addDomainBtn.parentNode.replaceChild(newBtn, addDomainBtn);
        newBtn.addEventListener('click', () => showAddDomainInput());
    }
    setupSolutionModal();
    await render();
    return render;
}

async function render() {
    if (!container) return;
    const data = await Store.getMapContent(currentDealId);
    const scrollTop = container.scrollTop;
    container.innerHTML = '';
    const domainKeys = Object.keys(data || {});
    let hasValidDomains = false;
    domainKeys.forEach(domainName => {
        const categories = data[domainName];
        if (!categories || typeof categories !== 'object' || Array.isArray(categories)) return;
        hasValidDomains = true;
        const isExpanded = expandedState.has(`d-${domainName}`);
        const domainEl = document.createElement('div');
        domainEl.className = "bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all mb-3 hover:shadow-md";
        domainEl.dataset.domainName = domainName;
        const header = document.createElement('div');
        header.className = `p-3 flex items-center justify-between cursor-pointer select-none transition-colors ${isExpanded ? 'bg-slate-50 border-b border-slate-100' : 'bg-white hover:bg-slate-50'}`;
        const titleArea = document.createElement('div');
        titleArea.className = "flex items-center gap-2 flex-1";
        titleArea.innerHTML = `<span class="p-1 rounded-md hover:bg-slate-200 transition-colors">${isExpanded ? ICONS.chevronDown : ICONS.chevronRight}</span><span class="font-bold text-slate-800 text-sm tracking-tight domain-title-text">${escapeHtml(domainName)}</span>`;
        titleArea.addEventListener('click', () => toggleExpand(`d-${domainName}`));
        const actionsArea = document.createElement('div');
        actionsArea.className = "flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity";
        const btnAdd = createActionButton(ICONS.plus, 'text-slate-600', '중분류 추가');
        btnAdd.onclick = (e) => { e.stopPropagation(); showAddCategoryInput(domainName); };
        const btnEdit = createActionButton(ICONS.edit, 'text-blue-600', '이름 수정');
        btnEdit.onclick = (e) => { e.stopPropagation(); showEditDomainInput(domainName, header); };
        const btnDel = createActionButton(ICONS.trash, 'text-red-500', '삭제');
        btnDel.onclick = (e) => { e.stopPropagation(); deleteDomain(domainName); };
        actionsArea.append(btnAdd, btnEdit, btnDel); header.appendChild(titleArea); header.appendChild(actionsArea); header.classList.add('group'); domainEl.appendChild(header);
        if (isExpanded) {
            const catContainer = document.createElement('div');
            catContainer.className = "p-2 bg-slate-50/30 space-y-1.5"; catContainer.dataset.domainContent = domainName;
            Object.keys(categories).forEach(catName => {
                const solutions = categories[catName]; const isCatExpanded = expandedState.has(`c-${domainName}-${catName}`);
                const catEl = document.createElement('div');
                catEl.className = "rounded-lg border border-transparent hover:border-slate-200 hover:bg-white transition-all"; catEl.dataset.catName = catName;
                const catHeader = document.createElement('div');
                catHeader.className = "flex items-center justify-between py-1.5 px-2 group/cat cursor-pointer select-none";
                const catTitleArea = document.createElement('div');
                catTitleArea.className = "flex items-center gap-2 flex-1 pl-1";
                catTitleArea.innerHTML = `<span class="text-slate-400 scale-90">${isCatExpanded ? ICONS.chevronDown : ICONS.chevronRight}</span><span class="text-sm font-semibold text-slate-700 cat-title-text">${escapeHtml(catName)}</span>`;
                catTitleArea.addEventListener('click', () => toggleExpand(`c-${domainName}-${catName}`));
                const catActions = document.createElement('div');
                catActions.className = "flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity";
                const cBtnAdd = createActionButton(ICONS.plus, 'text-slate-500', '솔루션 추가');
                cBtnAdd.onclick = (e) => { e.stopPropagation(); openSolutionModal(domainName, catName); };
                const cBtnEdit = createActionButton(ICONS.edit, 'text-blue-500', '이름 수정');
                cBtnEdit.onclick = (e) => { e.stopPropagation(); showEditCategoryInput(domainName, catName, catHeader); };
                const cBtnDel = createActionButton(ICONS.trash, 'text-red-500', '삭제');
                cBtnDel.onclick = (e) => { e.stopPropagation(); deleteCategory(domainName, catName); };
                catActions.append(cBtnAdd, cBtnEdit, cBtnDel); catHeader.appendChild(catTitleArea); catHeader.appendChild(catActions); catEl.appendChild(catHeader);
                if (isCatExpanded) {
                    const solContainer = document.createElement('div');
                    solContainer.className = "pl-8 pr-1 pb-2 space-y-1"; solContainer.dataset.solutionContent = `${domainName}-${catName}`;
                    solutions.forEach((sol, idx) => {
                        const solEl = document.createElement('div');
                        solEl.className = "flex items-center justify-between group/sol py-2 px-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-blue-300 transition-colors";
                        const solContent = document.createElement('div');
                        solContent.className = "flex items-center gap-2 text-sm text-slate-600 w-full overflow-hidden mr-2";
                        solContent.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span><span class="truncate font-medium text-slate-700">${escapeHtml(sol.name)}</span><span class="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full font-mono shrink-0 ml-auto border border-slate-200">${sol.share}%</span>`;
                        const solActions = document.createElement('div');
                        solActions.className = "flex items-center opacity-0 group-hover/sol:opacity-100 transition-opacity shrink-0";
                        const sBtnEdit = createActionButton(ICONS.edit, 'text-blue-400', '수정'); sBtnEdit.onclick = () => openSolutionModal(domainName, catName, sol, idx);
                        const sBtnDel = createActionButton(ICONS.trash, 'text-red-400', '삭제'); sBtnDel.onclick = () => deleteSolution(domainName, catName, idx);
                        solActions.append(sBtnEdit, sBtnDel); solEl.appendChild(solContent); solEl.appendChild(solActions); solContainer.appendChild(solEl);
                    });
                    catEl.appendChild(solContainer);
                }
                catContainer.appendChild(catEl);
            });
            domainEl.appendChild(catContainer);
        }
        container.appendChild(domainEl);
    });
    if (!hasValidDomains) {
        if (document.querySelectorAll('.temp-input-row').length === 0) {
             container.innerHTML = `<div id="empty-msg" class="flex flex-col items-center justify-center h-48 text-slate-400"><p class="text-sm font-medium">데이터가 없습니다</p><p class="text-xs mt-1 text-slate-400">'대분류 추가' 버튼을 눌러 시작하세요.</p></div>`;
        }
    }
    container.scrollTop = scrollTop;
}

function setupSolutionModal() {
    const cancelBtn = document.getElementById('solution-modal-cancel');
    const saveBtn = document.getElementById('solution-modal-save');
    const analyzeBtn = document.getElementById('btn-analyze-painpoints');
    const backdrop = document.getElementById('solution-modal-backdrop');
    
    // 엔터 키 핸들링 추가
    const manufacturerInput = document.getElementById('sol-manufacturer');
    const nameInput = document.getElementById('sol-name');
    
    const handleEnter = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveSolutionFromModal();
        }
    };
    
    manufacturerInput.addEventListener('keydown', handleEnter);
    nameInput.addEventListener('keydown', handleEnter);

    const newCancel = cancelBtn.cloneNode(true); cancelBtn.parentNode.replaceChild(newCancel, cancelBtn); newCancel.addEventListener('click', closeSolutionModal);
    const newBackdrop = backdrop.cloneNode(true); backdrop.parentNode.replaceChild(newBackdrop, backdrop); newBackdrop.addEventListener('click', closeSolutionModal);
    const newSave = saveBtn.cloneNode(true); saveBtn.parentNode.replaceChild(newSave, saveBtn); newSave.addEventListener('click', saveSolutionFromModal);
    const newAnalyze = analyzeBtn.cloneNode(true); analyzeBtn.parentNode.replaceChild(newAnalyze, analyzeBtn); newAnalyze.addEventListener('click', fetchPainPoints);
}

function openSolutionModal(domainName, categoryName, existingSolution = null, index = null) {
    currentDomainForModal = domainName; currentCategoryForModal = categoryName; currentSolutionIndexForModal = index;
    const modal = document.getElementById('solution-modal'), backdrop = document.getElementById('solution-modal-backdrop'), panel = document.getElementById('solution-modal-panel'), title = document.getElementById('solution-modal-title'), analyzeBtn = document.getElementById('btn-analyze-painpoints');
    const mInput = document.getElementById('sol-manufacturer'), nInput = document.getElementById('sol-name'), sInput = document.getElementById('sol-share'), noteInput = document.getElementById('sol-note'), listContainer = document.getElementById('painpoint-list'), shareDisp = document.getElementById('sol-share-disp');
    mInput.value = ''; nInput.value = ''; sInput.value = '10'; shareDisp.innerText = '10%'; noteInput.value = ''; listContainer.innerHTML = '<p class="text-xs text-gray-500 text-center py-4">제조사와 제품명을 입력 후 \'AI 분석\' 버튼을 눌러주세요.</p>';
    analyzeBtn.disabled = false; analyzeBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-indigo-50/50'); analyzeBtn.classList.add('bg-indigo-50', 'hover:bg-indigo-100');
    if (existingSolution) {
        title.textContent = '솔루션 수정'; mInput.value = existingSolution.manufacturer || ''; nInput.value = existingSolution.name || ''; sInput.value = existingSolution.share || 10; shareDisp.innerText = sInput.value + '%'; noteInput.value = existingSolution.note || '';
        if (existingSolution.painPoints && existingSolution.painPoints.length > 0) { renderPainPoints(existingSolution.painPoints, true); analyzeBtn.disabled = true; analyzeBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-indigo-50/50'); }
    } else { title.textContent = '솔루션 추가'; }
    modal.classList.remove('hidden'); requestAnimationFrame(() => { backdrop.classList.remove('opacity-0'); panel.classList.remove('opacity-0', 'scale-95'); panel.classList.add('opacity-100', 'scale-100'); });
    if(!existingSolution) mInput.focus();
}

function closeSolutionModal() {
    const modal = document.getElementById('solution-modal'), backdrop = document.getElementById('solution-modal-backdrop'), panel = document.getElementById('solution-modal-panel');
    backdrop.classList.add('opacity-0'); panel.classList.remove('opacity-100', 'scale-100'); panel.classList.add('opacity-0', 'scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

async function fetchPainPoints() {
    const m = document.getElementById('sol-manufacturer').value.trim(), p = document.getElementById('sol-name').value.trim(), l = document.getElementById('painpoint-list'), loader = document.getElementById('painpoint-loading'), btn = document.getElementById('btn-analyze-painpoints');
    if (!m || !p) { showWarningModal("제조사와 제품명을 모두 입력해주세요."); return; }
    if (btn.disabled) return;
    l.innerHTML = ''; loader.classList.remove('hidden');
    try {
        const prompt = `List 5 to 8 common customer pain points for the software product "${m} ${p}" in Korean. Provide the answer as a plain text list, one item per line. Do not use numbering or markdown.`;
        const resultRaw = await callGemini(prompt);
        let rawContent = typeof resultRaw === 'string' ? resultRaw : (resultRaw.content || resultRaw.text || JSON.stringify(resultRaw));
        const pts = rawContent.split('\n').map(li => li.trim()).filter(li => li.length > 0).map(li => li.replace(/^[-*•\d\.]+\s*/, ''));
        if (pts.length === 0) l.innerHTML = '<p class="text-xs text-red-400 text-center py-4">결과를 가져올 수 없습니다.</p>';
        else { renderPainPoints(pts, false); btn.disabled = true; btn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-indigo-50/50'); }
    } catch (e) { l.innerHTML = `<div class="p-4 bg-red-50 text-red-500 text-xs">${e.message}</div>`; }
    finally { loader.classList.add('hidden'); }
}

function renderPainPoints(points, preChecked = false) {
    const l = document.getElementById('painpoint-list'); l.innerHTML = '';
    points.forEach((point) => {
        const div = document.createElement('div');
        const isSelected = preChecked;
        div.className = `flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none group mb-2 ${isSelected ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-500"}`;
        div.dataset.value = point; div.dataset.selected = isSelected ? "true" : "false";
        const icon = document.createElement('div');
        icon.className = `w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? "bg-blue-500 text-white" : "bg-white"}`;
        icon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        const text = document.createElement('span'); text.className = "text-sm flex-1 font-medium"; text.textContent = point;
        div.onclick = () => {
            const cur = div.dataset.selected === "true"; div.dataset.selected = !cur ? "true" : "false";
            div.className = div.dataset.selected === "true" ? `flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none group mb-2 border-blue-500 bg-blue-50 text-blue-700` : `flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none group mb-2 border-gray-200 bg-white text-gray-500`;
            icon.className = `w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${div.dataset.selected === "true" ? "bg-blue-500 text-white" : "bg-white"}`;
        };
        div.appendChild(icon); div.appendChild(text); l.appendChild(div);
    });
}

async function saveSolutionFromModal() {
    const m = document.getElementById('sol-manufacturer').value.trim(), n = document.getElementById('sol-name').value.trim(), s = parseFloat(document.getElementById('sol-share').value), note = document.getElementById('sol-note').value.trim();
    const checked = []; document.getElementById('painpoint-list').querySelectorAll('div[data-selected="true"]').forEach(div => checked.push(div.dataset.value));
    if (!n) { showWarningModal("제품명을 입력해주세요."); return; }
    let res; if (currentSolutionIndexForModal !== null) res = await Store.updateSolution(currentDealId, currentDomainForModal, currentCategoryForModal, currentSolutionIndexForModal, n, s, m, checked, note);
    else res = await Store.addSolution(currentDealId, currentDomainForModal, currentCategoryForModal, n, s, m, checked, note);
    if (res === 'SUCCESS') { closeSolutionModal(); await render(); if(refreshCallback) await refreshCallback(); }
    else showWarningModal(res === 'OVERFLOW' ? "합계 100% 초과 불가" : "저장 실패");
}

async function showAddDomainInput() {
    removeTempInputs(); const row = document.createElement('div'); row.className = "temp-input-row bg-white border border-blue-400 rounded-xl p-3 flex items-center gap-2 mb-3 shadow-sm";
    const input = document.createElement('input'); input.className = "input-enterprise flex-1"; input.placeholder = "새 대분류 이름...";
    const btnS = createMiniButton(ICONS.check, "text-green-600"), btnC = createMiniButton(ICONS.x, "text-red-500");
    btnS.onclick = async () => { if (await Store.addDomain(currentDealId, input.value.trim())) { expandedState.add(`d-${input.value.trim()}`); await render(); if(refreshCallback) await refreshCallback(); } };
    btnC.onclick = () => row.remove(); input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnS.onclick(); });
    row.append(input, btnS, btnC); container.appendChild(row); input.focus();
}

async function showAddCategoryInput(domain) {
    if (!expandedState.has(`d-${domain}`)) { expandedState.add(`d-${domain}`); await render(); }
    const box = document.querySelector(`[data-domain-content="${CSS.escape(domain)}"]`); if (!box) return;
    removeTempInputs(); const row = document.createElement('div'); row.className = "temp-input-row flex items-center gap-2 p-2 pl-4 bg-white border border-blue-300 rounded-lg shadow-sm";
    const input = document.createElement('input'); input.className = "input-enterprise flex-1"; input.placeholder = "새 중분류...";
    const btnS = createMiniButton(ICONS.check, "text-green-600"), btnC = createMiniButton(ICONS.x, "text-red-500");
    btnS.onclick = async () => { if (await Store.addCategory(currentDealId, domain, input.value.trim())) { await render(); if(refreshCallback) await refreshCallback(); } };
    btnC.onclick = () => row.remove();
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnS.onclick(); });
    row.append(input, btnS, btnC); box.appendChild(row); input.focus();
}

async function showEditCategoryInput(d, o, h) {
    const t = h.querySelector('.cat-title-text'), orig = t.innerText; t.innerHTML = '';
    const i = document.createElement('input'); i.value = orig; i.className = "input-enterprise !h-6 text-xs";
    i.onkeydown = (e) => { if (e.key === 'Enter') i.blur(); };
    i.onblur = async () => { if (i.value.trim() && i.value.trim() !== orig) await Store.renameCategory(currentDealId, d, orig, i.value.trim()); await render(); if(refreshCallback) await refreshCallback(); };
    t.appendChild(i); i.focus();
}

async function showEditDomainInput(d, h) {
    const t = h.querySelector('.domain-title-text'), orig = t.innerText; t.innerHTML = '';
    const i = document.createElement('input'); i.value = orig; i.className = "input-enterprise !h-7 text-sm font-bold";
    i.onkeydown = (e) => { if (e.key === 'Enter') i.blur(); };
    i.onblur = async () => { if (i.value.trim() && i.value.trim() !== orig) await Store.renameDomain(currentDealId, orig, i.value.trim()); await render(); if(refreshCallback) await refreshCallback(); };
    t.appendChild(i); i.focus();
}

function removeTempInputs() { document.querySelectorAll('.temp-input-row').forEach(el => el.remove()); }
function createActionButton(ic, cl, ti) { const b = document.createElement('button'); b.innerHTML = ic; b.className = `p-1.5 rounded-md ${cl}`; b.title = ti; return b; }
function createMiniButton(ic, cl) { const b = document.createElement('button'); b.innerHTML = ic; b.className = `p-1.5 ${cl}`; return b; }
async function toggleExpand(k) { if (expandedState.has(k)) expandedState.delete(k); else expandedState.add(k); await render(); }
function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
async function deleteDomain(n) { showConfirmModal(`'${n}' 삭제?`, async () => { await Store.deleteDomain(currentDealId, n); await render(); if(refreshCallback) await refreshCallback(); }); }
async function deleteCategory(d, n) { showConfirmModal(`'${n}' 삭제?`, async () => { await Store.deleteCategory(currentDealId, d, n); await render(); if(refreshCallback) await refreshCallback(); }); }
async function deleteSolution(d, c, i) { showConfirmModal("삭제?", async () => { await Store.deleteSolution(currentDealId, d, c, i); await render(); if(refreshCallback) await refreshCallback(); }); }
