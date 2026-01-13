
import { Store } from '../store.js';
import { initTreemap } from './solutionMapVisual.js';
import { initTreeBuilder } from './solutionMapEditor.js';
import { showToast, showConfirmModal } from '../utils.js';

let currentDealId = null;
let viewMode = 'list';

export async function renderSolutionMap(container, dealId, stageId, onUpdate) {
    currentDealId = dealId;
    const deal = await Store.getDeal(dealId);
    if (!deal) return;

    if (!container.dataset.initialized) {
        viewMode = 'list';
        container.dataset.initialized = 'true';
    }

    if (viewMode === 'list') {
        renderList(container, deal);
    } else {
        await renderWorkspace(container, deal, onUpdate);
    }
}

function renderList(container, deal) {
    const savedMaps = deal.savedMaps || [];
    container.innerHTML = `
        <div class="flex flex-col h-full animate-modal-in">
            <div class="flex justify-between items-center mb-8 pb-4 border-b border-slate-200">
                <div>
                    <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Solution Map</h2>
                    <p class="text-slate-500 text-sm mt-1 font-medium">저장된 맵 리스트 및 관리</p>
                </div>
                <button id="btn-new-map" class="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg text-sm flex items-center gap-2">
                    <i class="fa-solid fa-plus"></i> 새 맵 구성하기
                </button>
            </div>
            
            ${savedMaps.length === 0 ? `
                <div class="flex-1 flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                        <i class="fa-solid fa-map-location-dot text-2xl text-slate-300"></i>
                    </div>
                    <p class="text-slate-400 font-bold">저장된 맵이 없습니다.</p>
                    <p class="text-slate-400 text-xs mt-1">새 맵 구성하기 버튼을 눌러 시작하세요.</p>
                </div>
            ` : `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${savedMaps.map(map => `
                        <div class="card-enterprise group p-6 cursor-pointer relative map-card" data-id="${map.id}">
                            <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <i class="fa-solid fa-map"></i>
                            </div>
                            <h4 class="text-lg font-bold text-slate-900 mb-1 truncate">${map.title}</h4>
                            <p class="text-xs text-slate-400 font-medium">최종 수정: ${new Date(map.updatedAt).toLocaleDateString()}</p>
                            <button class="btn-delete-map absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 transition-colors" data-id="${map.id}">
                                <i class="fa-solid fa-trash-can text-sm"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;

    document.getElementById('btn-new-map').onclick = () => {
        viewMode = 'workspace';
        renderWorkspace(container, deal);
    };

    container.querySelectorAll('.map-card').forEach(card => {
        card.onclick = async (e) => {
            if (e.target.closest('.btn-delete-map')) return;
            const map = savedMaps.find(m => m.id === card.dataset.id);
            if (map) {
                await Store.saveMapContent(deal.id, map.content);
                viewMode = 'workspace';
                renderWorkspace(container, deal);
            }
        };
    });

    container.querySelectorAll('.btn-delete-map').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            showConfirmModal("이 맵을 삭제하시겠습니까?", async () => {
                await Store.deleteSavedMap(deal.id, btn.dataset.id);
                showToast("삭제되었습니다.", "success");
                const updatedDeal = await Store.getDeal(deal.id);
                renderList(container, updatedDeal);
            });
        };
    });
}

async function renderWorkspace(container, deal, onUpdate) {
    container.innerHTML = `
        <div class="flex flex-col h-full animate-modal-in relative">
            <div class="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 gap-4 border-b border-slate-200 pb-1">
                <div class="flex items-center gap-3">
                    <button id="btn-back-list" class="text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-full hover:bg-slate-100" title="리스트로 돌아가기">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Solution Map</h2>
                        <p class="text-slate-500 text-sm mt-1 font-medium">아키텍처 구성 및 분석</p>
                    </div>
                </div>
                <div class="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    <button class="sm-tab-btn px-4 py-2 rounded-md text-sm font-bold text-slate-500 hover:text-slate-900 transition-all" data-tab="view">
                        <i class="fa-regular fa-map mr-1.5"></i> 솔루션 맵
                    </button>
                    <button class="sm-tab-btn px-4 py-2 rounded-md text-sm font-bold text-slate-500 hover:text-slate-900 transition-all" data-tab="update" id="tab-update-btn">
                        <i class="fa-solid fa-pen-to-square mr-1.5"></i> 맵 업데이트
                    </button>
                </div>
            </div>

            <div id="sm-content-area" class="flex-1 min-h-[600px] relative pb-20">
                <div id="sm-view-container" class="tab-content w-full h-full">
                     <div class="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex-1 w-full min-h-[600px] shadow-inner h-full">
                        <div id="treemap-view-container" class="w-full h-full"></div>
                    </div>
                </div>
                <div id="sm-update-container" class="tab-content hidden w-full h-full flex flex-col gap-6">
                    <div class="bg-white rounded-2xl border border-slate-200 p-4 w-full flex flex-col shadow-sm" style="height: 500px; shrink-0;">
                        <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 shrink-0">
                            <h3 class="text-sm font-bold text-slate-800 ml-1 flex items-center gap-2 uppercase tracking-wide">
                                <i class="fa-solid fa-list-ul"></i> 구조 편집
                            </h3>
                            <button id="btn-add-domain" class="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
                                <i class="fa-solid fa-plus"></i> 대분류 추가
                            </button>
                        </div>
                        <div id="tree-editor-wrapper" class="w-full flex-1 overflow-y-auto pr-2 custom-scrollbar"></div>
                    </div>
                    <div class="bg-slate-50 rounded-2xl border border-slate-200 p-5 w-full shadow-inner flex-1" style="min-height: 500px;">
                        <h3 class="text-sm font-bold text-slate-500 mb-4 ml-1 flex items-center gap-2 uppercase tracking-wide">
                             <i class="fa-solid fa-eye"></i> 실시간 맵 미리보기
                        </h3>
                        <div id="treemap-update-container" class="w-full h-full"></div>
                    </div>
                </div>
            </div>

            <div id="fab-save-container" class="absolute bottom-4 right-4 z-50 hidden">
                <button id="btn-save-map-snapshot" class="bg-slate-900 text-white px-6 py-3 rounded-full font-bold hover:bg-indigo-600 transition-all shadow-2xl hover:shadow-float flex items-center gap-3 active:scale-95 group shadow-indigo-500/30">
                    <i class="fa-solid fa-floppy-disk text-indigo-300 group-hover:text-white transition-colors"></i>
                    <span>저장하기</span>
                </button>
            </div>
        </div>

        <!-- Save Map Modal (Dark Theme) -->
        <div id="modal-save-map" class="fixed inset-0 z-[150] hidden flex items-center justify-center p-4">
            <div id="modal-save-map-bg" class="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity opacity-0"></div>
            <div id="modal-save-map-panel" class="relative bg-slate-900 rounded-xl shadow-modal p-6 max-w-sm w-full transform transition-all scale-95 opacity-0 border border-white/10">
                <h3 class="text-lg font-bold text-white mb-4">현재 맵 저장</h3>
                <div class="mb-6">
                    <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-1">맵 이름</label>
                    <input type="text" id="input-map-name" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full" placeholder="예: Deal_2025.01.01">
                </div>
                <div class="flex gap-3 justify-end">
                    <button id="btn-cancel-save-map" class="text-slate-400 hover:text-white font-medium text-sm px-3">취소</button>
                    <button id="btn-confirm-save-map" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors text-sm shadow-md">저장</button>
                </div>
            </div>
        </div>
    `;

    let refreshViewMap, refreshUpdateMap;

    const switchTab = async (tab) => {
        const viewCont = document.getElementById('sm-view-container');
        const updateCont = document.getElementById('sm-update-container');
        const fabCont = document.getElementById('fab-save-container');
        const btns = container.querySelectorAll('.sm-tab-btn');

        btns.forEach(b => {
            if (b.dataset.tab === tab) {
                b.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
                b.classList.remove('text-slate-500');
            } else {
                b.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm');
                b.classList.add('text-slate-500');
            }
        });

        if (tab === 'view') {
            viewCont.classList.remove('hidden');
            updateCont.classList.add('hidden');
            fabCont.classList.add('hidden');
            if (!refreshViewMap) refreshViewMap = await initTreemap('treemap-view-container', deal.id);
            else await refreshViewMap();
        } else {
            viewCont.classList.add('hidden');
            updateCont.classList.remove('hidden');
            fabCont.classList.remove('hidden');
            if (!refreshUpdateMap) refreshUpdateMap = await initTreemap('treemap-update-container', deal.id);
            else await refreshUpdateMap();
            
            await initTreeBuilder('tree-editor-wrapper', deal.id, async () => {
                if (refreshUpdateMap) await refreshUpdateMap();
                if (onUpdate) await onUpdate();
            });
        }
    };

    container.querySelectorAll('.sm-tab-btn').forEach(btn => {
        btn.onclick = () => switchTab(btn.dataset.tab);
    });

    document.getElementById('btn-back-list').onclick = () => {
        viewMode = 'list';
        renderList(container, deal);
    };

    const saveBtn = document.getElementById('btn-save-map-snapshot');
    const saveModal = document.getElementById('modal-save-map');
    const saveBg = document.getElementById('modal-save-map-bg');
    const savePanel = document.getElementById('modal-save-map-panel');
    const nameInput = document.getElementById('input-map-name');
    const confirmSave = document.getElementById('btn-confirm-save-map');
    const cancelSave = document.getElementById('btn-cancel-save-map');

    saveBtn.addEventListener('click', () => {
        const now = new Date();
        nameInput.value = `${deal.dealName}_Map_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
        saveModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            saveBg.classList.remove('opacity-0');
            saveBg.classList.add('opacity-100');
            savePanel.classList.remove('scale-95', 'opacity-0');
            savePanel.classList.add('scale-100', 'opacity-100');
        });
        nameInput.focus();
    });

    const closeSaveModal = () => {
        saveBg.classList.add('opacity-0');
        saveBg.classList.remove('opacity-100');
        savePanel.classList.remove('scale-100', 'opacity-100');
        savePanel.classList.add('scale-95', 'opacity-0');
        setTimeout(() => saveModal.classList.add('hidden'), 300);
    };

    saveBg.onclick = closeSaveModal;
    cancelSave.onclick = closeSaveModal;

    confirmSave.onclick = async () => {
        const title = nameInput.value.trim();
        if (!title) return showToast("이름을 입력하세요.", "error");
        const content = await Store.getMapContent(deal.id);
        await Store.addSavedMap(deal.id, title, content);
        showToast("맵이 저장되었습니다.", "success");
        closeSaveModal();
    };

    // Default tab
    await switchTab('view');
}
