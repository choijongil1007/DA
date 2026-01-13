
import { Store } from '../store.js';
import { renderDiscovery } from './discovery.js';
import { renderDealQualification } from './dealQualification.js';
import { renderSolutionMap } from './solutionMap.js';
import { renderCompetitiveFit } from './competitiveFit.js';
import { renderStrategy } from './strategy.js';
import { renderReports } from './reports.js';
import { STAGE_DEFINITIONS, FUNCTION_ACCESS_MATRIX, MENU_ITEMS } from '../config.js';
import { showToast, showConfirmModal, formatDate } from '../utils.js';
import { openDealCloseModal } from './dealClose.js';

let currentDealId = null;
let currentActiveFeature = 'dashboard';

export async function renderDealDetails(container, dealId, initialFeature = 'dashboard') {
    currentDealId = dealId;
    currentActiveFeature = initialFeature;
    const deal = await Store.getDeal(dealId);
    
    if (!deal) {
        container.innerHTML = `<div class="p-4 text-center text-slate-500">Deal not found.</div>`;
        return;
    }

    if (!deal.currentStage || !STAGE_DEFINITIONS[deal.currentStage]) {
        deal.currentStage = 'awareness';
        await Store.saveDeal(deal);
    }

    const currentStageId = deal.currentStage;

    container.innerHTML = `
        <div class="flex flex-col h-full gap-5">
            <!-- 1. Stage Anchor -->
            <div class="w-full">
                <div class="flex items-center gap-2 mb-2 text-[13px] text-slate-400">
                    <span class="font-medium">${deal.clientName}</span>
                    <i class="fa-solid fa-chevron-right text-[9px]"></i>
                    <span class="font-bold text-slate-600">${deal.dealName}</span>
                </div>
                <div id="stage-anchor-container">${renderStageAnchor(currentStageId)}</div>
            </div>

            <!-- 2. Main Workspace -->
            <div class="flex flex-col md:flex-row gap-5 items-start h-full">
                <!-- Sidebar Menu -->
                <aside id="sidebar-menu-container" class="w-full md:w-60 flex-shrink-0">
                    ${renderSidebarMenu(deal)}
                </aside>

                <!-- Content Area -->
                <main class="flex-1 w-full bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[550px] p-1">
                     <div id="feature-content" class="w-full h-full p-4 md:p-6"></div>
                </main>
            </div>
        </div>
        
        <!-- Next Stage Modal (Dark Theme) -->
        <div id="next-stage-modal" class="fixed inset-0 z-[150] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity opacity-0" id="next-stage-backdrop"></div>
            <div id="next-stage-panel" class="relative bg-slate-900 rounded-xl shadow-modal p-6 max-w-md w-full transform transition-all scale-95 opacity-0 border border-white/10">
                <h3 class="text-xl font-bold text-white mb-2">다음 단계로 이동</h3>
                <p id="next-stage-desc" class="text-slate-400 text-sm mb-6 leading-relaxed"></p>
                <div class="flex justify-end gap-3">
                    <button id="btn-cancel-stage" class="px-4 py-2 text-slate-400 hover:bg-white/5 rounded-lg text-sm font-bold">취소</button>
                    <button id="btn-confirm-stage" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow hover:bg-indigo-700">이동 (Move)</button>
                </div>
            </div>
        </div>

        <!-- Edit Modal Dashboard (Dark Theme) -->
        <div id="edit-modal-dashboard" class="fixed inset-0 z-[160] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md edit-modal-backdrop transition-opacity opacity-0"></div>
            <div id="edit-modal-dashboard-panel" class="relative w-full max-w-lg bg-slate-900 rounded-2xl shadow-modal p-8 transform transition-all scale-95 opacity-0 border border-white/10">
                <button type="button" id="btn-close-edit-modal-dashboard" class="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30 text-blue-400">
                        <i class="fa-solid fa-pen text-sm"></i>
                    </div>
                    <h2 class="text-xl font-bold text-white tracking-tight">Deal 정보 수정</h2>
                </div>
                <form id="edit-form-dashboard" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 mb-1 ml-0.5">고객사명</label>
                            <input type="text" name="clientName" required class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                        </div>
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 mb-1 ml-0.5">프로젝트명</label>
                            <input type="text" name="dealName" required class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 mb-1 ml-0.5">고객 담당자</label>
                            <input type="text" name="clientContact" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 mb-1 ml-0.5">내부 담당자</label>
                            <input type="text" name="internalContact" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                        </div>
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 mb-1 ml-0.5">제안 솔루션</label>
                            <input type="text" name="solution" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                        </div>
                         <div>
                            <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">딜 사이즈</label>
                            <select name="dealSize" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                                <option value="기회성 딜">기회성 딜</option>
                                <option value="표준 딜" selected>표준 딜</option>
                                <option value="전략 딜">전략 딜</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 mb-1 ml-0.5">수주 목표일</label>
                            <input type="date" name="purchaseDate" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                        </div>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button type="button" id="btn-cancel-edit-modal-dashboard" class="px-4 py-2 bg-slate-800 border border-white/5 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition-colors">취소</button>
                        <button type="submit" class="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all text-sm shadow-md">저장</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    attachEvents();
    await loadFeature(currentActiveFeature);
}

async function updateSidebarUI() {
    const deal = await Store.getDeal(currentDealId);
    const container = document.getElementById('sidebar-menu-container');
    if (container && deal) {
        container.innerHTML = renderSidebarMenu(deal);
        attachSidebarEvents();
    }
}

function renderStageAnchor(currentStageId) {
    const stages = ['awareness', 'consideration', 'evaluation', 'purchase'];
    const currentIndex = stages.indexOf(currentStageId);
    const currentDef = STAGE_DEFINITIONS[currentStageId];

    const stepsHtml = stages.map((stageId, index) => {
        let statusClass = 'future';
        if (index < currentIndex) statusClass = 'completed';
        if (index === currentIndex) statusClass = 'active';
        const label = STAGE_DEFINITIONS[stageId].label.split('(')[0].split('. ')[1];
        return `<div class="stage-step ${statusClass} flex-1 h-11 flex items-center justify-center font-bold text-[15px] transition-all select-none">${index + 1}. ${label}</div>`;
    }).join('');

    return `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="flex w-full pr-4 bg-slate-50">${stepsHtml}</div>
        </div>
        <div class="bg-indigo-50/50 border-b border-r border-l border-indigo-100 rounded-b-xl mx-2 p-1.5 text-center -mt-1 relative z-0">
            <p class="text-indigo-800 text-[12px] font-bold"><i class="fa-solid fa-circle-question mr-1.5 opacity-70"></i> ${currentDef.keyQuestion}</p>
        </div>
    `;
}

function validateStageTransition(deal) {
    const stage = deal.currentStage;
    const checks = [];
    const checkDisc = (s) => {
        const d = deal.discovery[s];
        if (!d) return { inputs: false, insight: false };
        return { inputs: !!(d.behavior && d.emotion && d.touchpoint && d.problem), insight: !!d.result };
    };
    const disc = checkDisc(stage);

    const discoveryCheckLabel = 'Discovery & Insight 완료';

    if (stage === 'awareness') {
        checks.push({ label: discoveryCheckLabel, valid: disc.inputs && disc.insight });
    } else if (stage === 'consideration') {
        checks.push({ label: discoveryCheckLabel, valid: disc.insight });
        const qual = deal.assessment.consideration;
        const isQualDone = qual && qual.isCompleted;
        checks.push({ label: 'Deal Qualification 완료', valid: isQualDone });
        const hasMap = Object.keys(deal.solutionMapContent || {}).length > 0;
        checks.push({ label: 'Solution Map 수립', valid: hasMap });
    } else if (stage === 'evaluation') {
        checks.push({ label: discoveryCheckLabel, valid: disc.insight });
        checks.push({ label: 'Competitive Fit 완료', valid: !!(deal.competitive && deal.competitive.result) });
        checks.push({ label: 'Tech. Win Strategy 완료', valid: !!deal.twsReport });
    } else if (stage === 'purchase') {
        checks.push({ label: discoveryCheckLabel, valid: disc.insight });
        checks.push({ label: 'Deal Win Strategy 완료', valid: !!deal.dwsReport });
    }
    return { canMove: checks.length > 0 && checks.every(c => c.valid), checks };
}

function renderSidebarMenu(deal) {
    const currentStageId = deal.currentStage;
    const menuHtml = MENU_ITEMS.map(item => {
        const access = FUNCTION_ACCESS_MATRIX[item.id][currentStageId];
        if (access === 'hide') return '';
        
        let label = item.label;
        if (item.id === 'strategy' && currentStageId === 'evaluation') label = 'Tech. Win Strategy';
        if (item.id === 'strategy' && currentStageId === 'purchase') label = 'Deal Win Strategy';

        const badge = access === 'view' ? '<span class="ml-auto text-[9px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded border border-slate-200">View</span>' : '';
        const isActive = item.id === currentActiveFeature;
        const activeClass = isActive ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900';
        return `<button class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 menu-btn ${activeClass}" data-feature="${item.id}"><div class="w-5 text-center text-xs opacity-70"><i class="${item.icon}"></i></div><span class="leading-tight">${label}</span>${badge}</button>`;
    }).join('');

    const { canMove, checks } = validateStageTransition(deal);
    const checklistHtml = checks.map(c => `<div class="flex items-center justify-between text-[11px] mb-1.5 ${c.valid ? 'text-slate-400 opacity-60' : 'text-slate-500 font-bold'}"><span class="flex items-center gap-1.5"><i class="fa-solid ${c.valid ? 'fa-check text-emerald-500' : 'fa-circle text-[5px] text-slate-300'}"></i>${c.label}</span></div>`).join('');
    const btnClass = canMove ? "border-2 border-indigo-100 text-indigo-800 hover:bg-indigo-50 hover:border-indigo-200 shadow-sm" : "border border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed opacity-80";
    const btnLabel = (currentStageId === 'purchase') ? 'Deal 종료 (Won/Lost)' : '다음 단계로';
    const btnDisabled = canMove ? '' : 'disabled';

    return `<nav class="space-y-0.5">${menuHtml}</nav><div class="pt-4 mt-4 border-t border-slate-200"><button id="btn-move-stage" class="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${btnClass}" ${btnDisabled}><span>${btnLabel}</span><i class="fa-solid fa-arrow-right text-[10px]"></i></button><div class="mt-4 px-2 space-y-1">${checklistHtml}</div></div>`;
}

function renderDashboard(container, deal) {
    const stageId = deal.currentStage;
    const stageDef = STAGE_DEFINITIONS[stageId];
    const STAGE_FOCUS_CONTENT = {
        awareness: {
            purpose: "고객이 겪는 문제를 정확히 정의한다. 아직 해결책을 말할 단계가 아니다.",
            customerNow: ["문제가 있다는 건 느낀다", "왜 중요한지, 어떻게 풀어야 할지는 모른다"],
            presalesRole: "문제를 설명하지 말고 구조화하라",
            focusOn: ["문제가 발생한 상황(Context)", "현재 사용 중인 해결 방식", "왜 지금 이 문제가 커졌는지", "문제가 해결되지 않았을 때의 영향"],
            avoid: ["기능 요구사항 정리", "제품·데모·경쟁사 언급", "너무 이른 솔루션 제안"],
            coreGoal: "솔루션 이전에 문제의 중요성을 정의하라"
        },
        consideration: {
            purpose: "문제를 어떤 방식으로 해결할지 고객이 판단할 수 있도록 돕는다.",
            customerNow: ["해결 방향을 탐색 중이다", "여러 선택지가 있다는 걸 인식하기 시작했다"],
            presalesRole: "기능 비교보다 유리한 판단 기준을 설계하라",
            focusOn: ["고객이 중요하게 여기는 평가 기준", "우선순위와 트레이드오프", "이해관계자별 관점 차이", "반드시 피해야 할 조건"],
            avoid: ["우리 제품 장점 나열", "경쟁사 비교부터 시작", "기술 스펙 중심 설명"],
            coreGoal: "고객이 스스로 판단 기준을 말하게 하라"
        },
        evaluation: {
            purpose: "선택이 틀리지 않았음을 검증 가능하고 설명 가능한 형태로 만든다.",
            customerNow: ["잘못된 선택에 대한 책임을 걱정한다", "내부 설득과 합의가 필요하다"],
            presalesRole: "기술 증명을 넘어 선택의 정당성을 부여하라",
            pocInsight: "이 단계의 PoC는 기술 우위를 보여주는 동시에, ‘우리 솔루션을 반대할 이유’를 줄이기 위한 검증 과정이다.",
            keyActivities: [
                { title: "검증 설계 (PoC / Evaluation)", items: ["Success Criteria 명확화", "평가 항목과 가중치 정의", "검증 범위와 한계 설정", "평가 결과 해석"] },
                { title: "제안서 작성 (Proposal)", items: ["고객의 평가 기준 구조를 그대로 반영", "PoC 결과를 기준별로 연결", "리스크와 대응 방안 명시", "내부 공유·승인을 고려한 논리 구성"] }
            ],
            extraInfo: "PoC가 검증이라면, 제안서는 그 검증을 결정 가능하게 만드는 문서다.",
            avoid: ["성공 기준 없는 PoC", "모든 요구사항 수용", "평가 결과가 반영되지 않은 제안서", "“일단 써달라”는 요청에 끌려가는 문서 작성"],
            coreGoal: "PoC와 제안서를 하나의 승리 구조로 통합하라"
        },
        purchase: {
            purpose: "결정을 안심하고 승인할 수 있게 돕는다.",
            customerNow: ["기능보다 리스크를 본다", "도입 이후를 걱정한다"],
            presalesRole: "설득하지 말고 구매의 불확실성을 제거하라",
            focusOn: ["최종 의사결정 기준", "승인 프로세스와 이해관계자", "도입 이후 시나리오", "실패 시 대응 방안"],
            avoid: ["기술 설명 반복", "“이제 결정만 남았다”는 가정", "영업에게 완전히 넘기는 태도"],
            coreGoal: "구매를 결단이 아닌 안심의 결과로 유도하라"
        }
    };
    const focus = STAGE_FOCUS_CONTENT[stageId];
    const renderStandardList = (items) => `<ul class="space-y-3">${items.map(item => `<li class="text-sm text-slate-600 flex items-start gap-3"><span class="w-1.5 h-1.5 rounded-full bg-slate-200 mt-2 flex-shrink-0"></span><span class="font-medium">${item}</span></li>`).join('')}</ul>`;
    const renderSectionTitle = (label, colorClass = "bg-indigo-500", textClass = "text-slate-900") => `<div class="mb-2.5"><div class="flex items-center gap-2.5"><div class="w-1.5 h-5 ${colorClass} rounded-full"></div><h4 class="text-base font-black ${textClass} tracking-tight">${label}</h4></div><div class="h-px w-full bg-slate-100 mt-1.5"></div></div>`;

    container.innerHTML = `
        <div class="animate-modal-in space-y-4">
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-24 h-24 bg-indigo-50/40 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>
                <button id="btn-edit-deal-dashboard" class="absolute top-4 right-4 text-slate-300 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100 z-20"><i class="fa-solid fa-pen-to-square text-xs"></i></button>
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div class="flex-grow">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${deal.clientName}</span>
                            <span class="text-[9px] bg-slate-900 text-white px-2 py-0.5 rounded font-bold shadow-sm">${deal.dealSize || '표준 딜'}</span>
                        </div>
                        <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">${deal.dealName}</h2>
                        <p class="text-indigo-600 font-bold text-[13px] flex items-center gap-1.5 mt-0.5"><i class="fa-solid fa-cube text-[11px]"></i> ${deal.solution || '솔루션 미지정'}</p>
                    </div>
                    <div class="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 min-w-[160px] flex flex-col justify-center">
                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 text-center">수주 목표일</div>
                        <div class="text-[14px] font-bold text-slate-700 text-center"><i class="fa-regular fa-calendar-check mr-2 text-indigo-500"></i>${deal.purchaseDate || '미정'}</div>
                    </div>
                </div>
            </div>
            <div class="flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-1">
                <h2 class="text-xl font-extrabold text-slate-900 mb-0.5 tracking-tight">${stageDef.label}</h2>
                <p class="text-slate-500 text-sm font-semibold italic">"${stageDef.keyQuestion}"</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-4">
                    <div class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                        ${renderSectionTitle("이 단계의 목적", "bg-indigo-500")}
                        <p class="text-sm font-medium text-slate-700 leading-relaxed">${focus.purpose}</p>
                    </div>
                    <div class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                        ${renderSectionTitle("고객은 지금", "bg-slate-400")}
                        ${renderStandardList(focus.customerNow)}
                    </div>
                    <div class="bg-slate-900 text-white p-5 rounded-2xl shadow-xl border border-slate-800">
                        ${renderSectionTitle("프리세일즈의 역할", "bg-indigo-400", "text-white")}
                        <p class="text-sm font-medium leading-snug tracking-tight text-slate-100">${focus.presalesRole}</p>
                    </div>
                    <div class="bg-slate-900 text-white p-5 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
                        <div class="absolute -right-6 -bottom-6 opacity-5 scale-150 rotate-12 text-white"><i class="fa-solid fa-star text-7xl"></i></div>
                        ${renderSectionTitle("이번 실습의 핵심", "bg-indigo-400", "text-white")}
                        <p class="text-sm font-medium text-slate-100 leading-snug relative z-10 tracking-tight">${focus.coreGoal}</p>
                    </div>
                </div>
                <div class="space-y-4">
                    <div class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                        ${renderSectionTitle(stageId === 'evaluation' ? '핵심 활동' : '이 단계에서 집중할 것', "bg-emerald-500")}
                        ${stageId === 'evaluation' ? `
                            <div class="space-y-4">
                                ${focus.keyActivities.map(activity => `
                                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <p class="text-xs font-black text-slate-900 mb-2.5 flex items-center gap-1.5 uppercase"><i class="fa-solid fa-chevron-right text-[8px] text-slate-400"></i> ${activity.title}</p>
                                        <ul class="space-y-1.5">
                                            ${activity.items.map(i => `<li class="text-sm text-slate-600 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-slate-300 font-medium">${i}</li>`).join('')}
                                        </ul>
                                    </div>
                                `).join('')}
                                <div class="mt-1 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                    <p class="text-[12px] text-indigo-700 font-bold leading-relaxed">💡 ${focus.pocInsight}</p>
                                    <p class="text-[11px] text-slate-400 font-bold mt-1.5 uppercase tracking-wide">Insight: ${focus.extraInfo}</p>
                                </div>
                            </div>
                        ` : renderStandardList(focus.focusOn)}
                    </div>
                    <div class="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                        ${renderSectionTitle("피해야 할 것", "bg-rose-500")}
                        <div class="flex flex-wrap gap-2">
                            ${focus.avoid.map(item => `<span class="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-rose-100">${item}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    const editBtn = container.querySelector('#btn-edit-deal-dashboard');
    if (editBtn) editBtn.addEventListener('click', async () => openEditModal(await Store.getDeal(currentDealId)));
}

async function openEditModal(deal) {
    const modal = document.getElementById('edit-modal-dashboard');
    const backdrop = modal.querySelector('.edit-modal-backdrop');
    const panel = modal.querySelector('.transform');
    const form = document.getElementById('edit-form-dashboard');
    
    form.clientName.value = deal.clientName;
    form.dealName.value = deal.dealName;
    form.clientContact.value = deal.clientContact || '';
    form.internalContact.value = deal.internalContact || '';
    form.solution.value = deal.solution || '';
    form.dealSize.value = deal.dealSize || '표준 딜';
    form.purchaseDate.value = deal.purchaseDate || '';
    
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0');
        backdrop.classList.add('opacity-100');
        panel.classList.remove('opacity-0', 'scale-95');
        panel.classList.add('opacity-100', 'scale-100');
    });
}

function closeDashboardModal() {
    const modal = document.getElementById('edit-modal-dashboard');
    const backdrop = modal.querySelector('.edit-modal-backdrop');
    const panel = modal.querySelector('.transform');
    backdrop.classList.add('opacity-0');
    backdrop.classList.remove('opacity-100');
    panel.classList.add('opacity-0', 'scale-95');
    panel.classList.remove('opacity-100', 'scale-100');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

async function loadFeature(featureId) {
    const container = document.getElementById('feature-content');
    if (!container) return;
    currentActiveFeature = featureId;
    const deal = await Store.getDeal(currentDealId);
    const stageId = deal.currentStage;
    const onUpdate = async () => await updateSidebarUI();

    switch (featureId) {
        case 'dashboard': renderDashboard(container, deal); break;
        case 'discovery': await renderDiscovery(container, currentDealId, stageId, onUpdate); break;
        case 'assessment': await renderDealQualification(container, currentDealId, stageId, onUpdate); break;
        case 'solutionMap': await renderSolutionMap(container, currentDealId, stageId, onUpdate); break;
        case 'competitive': await renderCompetitiveFit(container, currentDealId, FUNCTION_ACCESS_MATRIX.competitive[stageId] === 'view', onUpdate); break;
        case 'technicalWin': await renderStrategy(container, currentDealId, true, 'standard'); break;
        case 'strategy': await renderStrategy(container, currentDealId, FUNCTION_ACCESS_MATRIX.strategy[stageId] === 'view', onUpdate); break;
        case 'reports': await renderReports(container, currentDealId); break;
        default: renderDashboard(container, deal);
    }
    await updateSidebarUI();
}

function attachSidebarEvents() {
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', () => loadFeature(btn.dataset.feature));
    });
    const btnMove = document.getElementById('btn-move-stage');
    if (btnMove && !btnMove.disabled) {
        btnMove.onclick = async () => {
            const deal = await Store.getDeal(currentDealId);
            const currentDef = STAGE_DEFINITIONS[deal.currentStage];
            if (deal.currentStage === 'purchase') {
                openDealCloseModal(currentDealId, () => {
                    if (window.app && window.app.navigateTo) window.app.navigateTo('deals');
                });
            } else {
                document.getElementById('next-stage-desc').innerHTML = `현재 <strong>${currentDef.label}</strong> 단계의 핵심 질문에 대한 답을 찾으셨나요?<br><br><span class="font-bold text-indigo-400">"${currentDef.keyQuestion}"</span>`;
                const modal = document.getElementById('next-stage-modal');
                const backdrop = modal.querySelector('.transition-opacity');
                const panel = modal.querySelector('.transform');
                modal.classList.remove('hidden');
                requestAnimationFrame(() => {
                    backdrop.classList.remove('opacity-0');
                    backdrop.classList.add('opacity-100');
                    panel.classList.remove('opacity-0', 'scale-95');
                    panel.classList.add('opacity-100', 'scale-100');
                });
            }
        };
    }
}

function closeNextStageModal() {
    const modal = document.getElementById('next-stage-modal');
    const backdrop = modal.querySelector('.transition-opacity');
    const panel = modal.querySelector('.transform');
    backdrop.classList.add('opacity-0');
    backdrop.classList.remove('opacity-100');
    panel.classList.add('opacity-0', 'scale-95');
    panel.classList.remove('opacity-100', 'scale-100');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function attachEvents() {
    attachSidebarEvents();
    document.getElementById('btn-cancel-stage').onclick = closeNextStageModal;
    document.getElementById('next-stage-backdrop').onclick = closeNextStageModal;
    document.getElementById('btn-confirm-stage').onclick = async () => {
        const deal = await Store.getDeal(currentDealId);
        const nextStage = STAGE_DEFINITIONS[deal.currentStage].nextStage;
        if (nextStage) {
            deal.currentStage = nextStage;
            await Store.saveDeal(deal);
            showToast(`${STAGE_DEFINITIONS[nextStage].label} 단계로 이동했습니다.`, 'success');
            closeNextStageModal();
            await renderDealDetails(document.getElementById('app'), currentDealId, 'dashboard');
        }
    };
    document.getElementById('btn-close-edit-modal-dashboard').onclick = closeDashboardModal;
    document.getElementById('btn-cancel-edit-modal-dashboard').onclick = closeDashboardModal;
    document.getElementById('edit-form-dashboard').onsubmit = async (e) => {
        e.preventDefault();
        const deal = await Store.getDeal(currentDealId);
        const form = e.target;
        deal.clientName = form.clientName.value;
        deal.dealName = form.dealName.value;
        deal.clientContact = form.clientContact.value;
        deal.internalContact = form.internalContact.value;
        deal.solution = form.solution.value;
        deal.dealSize = form.dealSize.value;
        deal.purchaseDate = form.purchaseDate.value;
        deal.updatedAt = new Date().toISOString();
        await Store.saveDeal(deal);
        showToast('Deal 정보가 수정되었습니다.', 'success');
        closeDashboardModal();
        await renderDealDetails(document.getElementById('app'), currentDealId, 'dashboard');
    };
}
