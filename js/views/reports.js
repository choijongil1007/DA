
import { Store } from '../store.js';
import { renderStrategy } from './strategy.js';
import { showToast, showConfirmModal, formatDate } from '../utils.js';

let currentDealId = null;

// 단계별 보고서 타입 매핑
const STAGE_REPORT_MAP = {
    awareness: ['problem_definition'],
    consideration: ['decision_preconditions', 'qualification_report'],
    evaluation: ['decision_criteria', 'competitive_insight', 'tws'],
    purchase: ['success_guide', 'dws']
};

export async function renderReports(container, dealId) {
    currentDealId = dealId;
    const deal = await Store.getDeal(dealId);
    if (!deal) return;

    const currentStage = deal.currentStage;
    const allReports = [];

    // 1. TWS/DWS 특수 보고서 추가
    if (deal.twsReport) {
        allReports.push({ id: 'tws', title: 'Tech. Win Strategy Report', createdAt: deal.twsReport.updatedAt, type: 'tws', isStrategy: true });
    }
    if (deal.dwsReport) {
        allReports.push({ id: 'dws', title: 'Deal Win Strategy Report', createdAt: deal.dwsReport.updatedAt, type: 'dws', isStrategy: true });
    }

    // 2. 일반 보고서들 추가
    if (deal.reports) {
        deal.reports.forEach(rep => {
            allReports.push({ ...rep, isStrategy: false });
        });
    }

    // 3. 현재 단계 vs 참고 보고서 분류
    const currentStageTypes = STAGE_REPORT_MAP[currentStage] || [];
    const currentStageReports = allReports.filter(r => currentStageTypes.includes(r.type));
    const referenceReports = allReports.filter(r => !currentStageTypes.includes(r.type));

    const isEmpty = allReports.length === 0;

    const createReportCardHtml = (report) => {
        const { id, title, createdAt, type, isStrategy } = report;
        const iconClass = isStrategy ? "fa-solid fa-chess-knight text-indigo-600" : "fa-solid fa-file-lines text-slate-600";
        const bgClass = isStrategy ? "bg-indigo-50 border-indigo-100" : "bg-slate-50 border-slate-200";
        const cardClass = isStrategy ? 'card-strategy-report' : 'report-card';
        const deleteClass = isStrategy ? 'btn-delete-strategy' : 'btn-delete-report';
        
        return `
            <div class="card-enterprise group p-5 cursor-pointer hover:border-indigo-400 transition-all relative ${cardClass}" data-id="${id}" data-type="${type}">
                <div class="flex justify-between items-start mb-4">
                    <div class="w-10 h-10 rounded-lg ${bgClass} flex items-center justify-center font-bold text-lg border shadow-sm">
                        <i class="${iconClass}"></i>
                    </div>
                    <button class="${deleteClass} w-6 h-6 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors flex items-center justify-center absolute top-4 right-4" data-id="${id}" data-type="${type}">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
                <h4 class="text-base font-bold text-slate-900 mb-1 truncate">${title}</h4>
                <p class="text-[11px] text-slate-400 font-medium">생성일: ${formatDate(createdAt)}</p>
                ${isStrategy ? '<div class="mt-2"><span class="text-[9px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded shadow-sm">Strategy Report</span></div>' : ''}
            </div>
        `;
    };

    container.innerHTML = `
        <div class="flex flex-col h-full animate-modal-in">
            <div class="mb-8 pb-4 border-b border-slate-200">
                <div class="flex items-center gap-3">
                    <button id="btn-back-reports-list" class="hidden text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-full hover:bg-slate-100">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Reports Center</h2>
                        <p class="text-slate-500 text-sm mt-1 font-medium">생성된 모든 분석 보고서를 한곳에서 확인하세요.</p>
                    </div>
                </div>
            </div>
            
            <div id="reports-list-view" class="space-y-12 ${isEmpty ? 'flex-1 flex flex-col items-center justify-center min-h-[400px]' : ''}">
                ${isEmpty ? `
                     <div class="text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-12 w-full max-w-lg">
                        <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 mx-auto border border-slate-100"><i class="fa-regular fa-folder-open text-2xl"></i></div>
                        <h3 class="text-lg font-bold text-slate-900 mb-2">저장된 보고서가 없습니다</h3>
                        <p class="text-slate-500 text-sm font-medium">전략 수립 단계에서 보고서를 생성하세요.</p>
                    </div>
                ` : `
                    <!-- Current Stage Section -->
                    <section>
                        <div class="flex items-center gap-2 mb-6">
                            <span class="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                            <h3 class="text-sm font-black text-slate-800 uppercase tracking-widest">현재 단계 보고서</h3>
                            <div class="h-px flex-1 bg-slate-100 ml-2"></div>
                        </div>
                        ${currentStageReports.length > 0 ? `
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                ${currentStageReports.map(rep => createReportCardHtml(rep)).join('')}
                            </div>
                        ` : `
                            <div class="py-10 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                                <p class="text-xs text-slate-400 font-medium">현재 단계에서 생성된 보고서가 없습니다.</p>
                            </div>
                        `}
                    </section>

                    <!-- Reference Reports Section -->
                    ${referenceReports.length > 0 ? `
                        <section>
                            <div class="flex items-center gap-2 mb-6">
                                <span class="w-2 h-2 rounded-full bg-slate-300"></span>
                                <h3 class="text-sm font-black text-slate-500 uppercase tracking-widest">참고 보고서 (다른 단계)</h3>
                                <div class="h-px flex-1 bg-slate-100 ml-2"></div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                ${referenceReports.map(rep => createReportCardHtml(rep)).join('')}
                            </div>
                        </section>
                    ` : ''}
                `}
            </div>

            <div id="report-viewer-container" class="hidden flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-8 shadow-inner min-h-[600px] h-auto overflow-visible">
                 <div id="report-viewer-content" class="bg-white p-6 md:p-10 shadow-sm border border-slate-200 rounded-lg max-w-4xl mx-auto overflow-x-hidden"></div>
            </div>
        </div>
    `;
    attachEvents(container);
}

function attachEvents(container) {
    const listView = container.querySelector('#reports-list-view'), 
          viewerContainer = container.querySelector('#report-viewer-container'), 
          viewerContent = container.querySelector('#report-viewer-content'), 
          backBtn = container.querySelector('#btn-back-reports-list');
    
    if (!backBtn) return;

    backBtn.onclick = () => { 
        listView.classList.remove('hidden'); 
        viewerContainer.classList.add('hidden'); 
        backBtn.classList.add('hidden'); 
    };

    container.onclick = async (e) => {
        const card = e.target.closest('.report-card'), 
              stratCard = e.target.closest('.card-strategy-report'), 
              delBtn = e.target.closest('.btn-delete-report'),
              delStratBtn = e.target.closest('.btn-delete-strategy');

        if (delBtn) {
            e.stopPropagation();
            showConfirmModal('이 보고서를 정말 삭제하시겠습니까?', async () => { 
                await Store.deleteReport(currentDealId, delBtn.dataset.id); 
                await renderReports(container, currentDealId); 
                showToast('보고서가 삭제되었습니다.', 'success');
            });
        } else if (delStratBtn) {
            e.stopPropagation();
            const type = delStratBtn.dataset.type;
            const typeLabel = type === 'tws' ? 'Tech. Win' : 'Deal Win';
            showConfirmModal(`${typeLabel} 전략 보고서를 삭제하시겠습니까? (원본 데이터는 유지됩니다)`, async () => {
                const updatedDeal = await Store.getDeal(currentDealId);
                if (type === 'tws') updatedDeal.twsReport = null;
                else updatedDeal.dwsReport = null;
                await Store.saveDeal(updatedDeal);
                await renderReports(container, currentDealId);
                showToast('보고서가 삭제되었습니다.', 'success');
            });
        } else if (card) {
            const repId = card.dataset.id;
            const latestDeal = await Store.getDeal(currentDealId);
            if (!latestDeal || !latestDeal.reports) return;

            const rep = latestDeal.reports.find(r => r.id === repId);
            
            if (!rep) {
                showToast("보고서 데이터를 찾을 수 없습니다.", "error");
                return;
            }

            listView.classList.add('hidden'); 
            viewerContainer.classList.remove('hidden'); 
            backBtn.classList.remove('hidden');
            viewerContent.innerHTML = `<div class="prose prose-slate max-w-none"><div class="report-body-rendered">${rep.contentHTML || '<p class="text-slate-400">내용이 비어있는 보고서입니다.</p>'}</div></div>`;
        } else if (stratCard) {
            const type = stratCard.dataset.id; // tws or dws
            listView.classList.add('hidden'); 
            viewerContainer.classList.remove('hidden'); 
            backBtn.classList.remove('hidden');
            await renderStrategy(viewerContent, currentDealId, true, type === 'tws' ? 'standard' : 'purchase');
        }
    };
}
