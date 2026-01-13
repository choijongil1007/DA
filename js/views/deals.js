
import { Store } from '../store.js';
import { generateId, showToast, showConfirmModal } from '../utils.js';
import { STAGE_DEFINITIONS } from '../config.js';

let deleteTargetId = null;
let editTargetId = null;

export async function renderDeals(container) {
    const deals = await Store.getDeals();
    
    const inProgressDeals = deals.filter(d => d.status === 'active' || !d.status);
    const closedDeals = deals.filter(d => d.status === 'won' || d.status === 'lost');

    const html = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 class="text-3xl font-bold text-slate-900 tracking-tight">Deals</h1>
                <p class="text-slate-500 mt-1 text-sm font-medium">딜 설계 및 진행 현황</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div class="relative flex-1 sm:w-64">
                    <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input type="text" id="deal-search-input" class="input-enterprise w-full pl-9 py-2.5 text-sm" placeholder="내부 담당자 검색...">
                </div>
                <button id="btn-create-deal" class="bg-slate-900 hover:bg-indigo-600 text-white pl-4 pr-5 py-2.5 rounded-lg shadow-sm transition-all text-sm font-bold flex items-center gap-2 active:scale-95 border border-transparent whitespace-nowrap">
                    <i class="fa-solid fa-plus text-xs"></i> New Deal
                </button>
            </div>
        </div>

        <div class="space-y-12">
            <!-- In-Progress Section -->
            <section id="section-inprogress">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                    <h2 class="text-xl font-bold text-slate-800">In-Progress</h2>
                    <span class="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">${inProgressDeals.length}</span>
                </div>
                <div id="inprogress-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${inProgressDeals.length === 0 ? `
                        <div class="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <p class="text-slate-400 text-sm font-medium">진행 중인 Deal이 없습니다.</p>
                        </div>
                    ` : inProgressDeals.map(deal => createDealCard(deal)).join('')}
                </div>
            </section>

            <!-- Closed Section -->
            <section id="section-closed" class="${closedDeals.length === 0 ? 'hidden' : ''}">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-1.5 h-6 bg-slate-400 rounded-full"></div>
                    <h2 class="text-xl font-bold text-slate-800">Closed</h2>
                    <span class="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">${closedDeals.length}</span>
                </div>
                <div id="closed-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80">
                    ${closedDeals.map(deal => createDealCard(deal)).join('')}
                </div>
            </section>
        </div>

        <!-- Create Modal (Dark Slate Theme) -->
        <div id="create-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md modal-backdrop transition-opacity opacity-0"></div>
            <div class="relative w-full max-w-lg bg-slate-900 rounded-2xl shadow-modal p-8 transform transition-all scale-95 opacity-0 border border-white/10">
                <button type="button" class="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors btn-close-modal">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>

                <div class="flex items-center gap-3 mb-6">
                    <div class="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400">
                        <i class="fa-solid fa-plus text-sm"></i>
                    </div>
                    <h2 class="text-xl font-bold text-white tracking-tight">새 Deal 등록</h2>
                </div>
                
                <form id="create-form" class="space-y-5">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">고객사명 (Client)</label>
                        <input type="text" name="clientName" required class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full" placeholder="예: 삼성전자">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">프로젝트명 (Deal Name)</label>
                        <input type="text" name="dealName" required class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full" placeholder="예: 클라우드 마이그레이션">
                    </div>
                    <div class="grid grid-cols-2 gap-5">
                        <div>
                            <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">고객 담당자</label>
                            <input type="text" name="clientContact" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">내부 담당자</label>
                            <input type="text" name="internalContact" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                        </div>
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">제안 솔루션</label>
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
                         <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">수주 목표일</label>
                         <input type="date" name="purchaseDate" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">메모</label>
                         <textarea name="memo" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full resize-none" rows="3"></textarea>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-6 mt-4 border-t border-white/5">
                        <button type="button" class="btn-close-modal px-5 py-2.5 bg-slate-800 border border-white/5 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition-colors">취소</button>
                        <button type="submit" class="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all text-sm shadow-md">등록</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Edit Modal (Dark Slate Theme) -->
        <div id="edit-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md edit-modal-backdrop transition-opacity opacity-0"></div>
            <div class="relative w-full max-w-lg bg-slate-900 rounded-2xl shadow-modal p-8 transform transition-all scale-95 opacity-0 border border-white/10">
                <button type="button" class="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors btn-close-edit-modal">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>

                <div class="flex items-center gap-3 mb-6">
                    <div class="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30 text-blue-400">
                        <i class="fa-solid fa-pen text-sm"></i>
                    </div>
                    <h2 class="text-xl font-bold text-white tracking-tight">Deal 정보 수정</h2>
                </div>
                
                <form id="edit-form" class="space-y-5">
                    <input type="hidden" name="id">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">고객사명 (Client)</label>
                        <input type="text" name="clientName" required class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">프로젝트명 (Deal Name)</label>
                        <input type="text" name="dealName" required class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                    </div>
                    <div class="grid grid-cols-2 gap-5">
                        <div>
                            <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">고객 담당자</label>
                            <input type="text" name="clientContact" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">내부 담당자</label>
                            <input type="text" name="internalContact" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                        </div>
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">제안 솔루션</label>
                         <input type="text" name="solution" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">딜 사이즈</label>
                        <select name="dealSize" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                            <option value="기회성 딜">기회성 딜</option>
                            <option value="표준 딜">표준 딜</option>
                            <option value="전략 딜">전략 딜</option>
                        </select>
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">수주 목표일</label>
                         <input type="date" name="purchaseDate" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full">
                    </div>
                    <div>
                         <label class="block text-xs font-bold text-slate-400 mb-1.5 ml-0.5">메모</label>
                         <textarea name="memo" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full resize-none" rows="3"></textarea>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-6 mt-4 border-t border-white/5">
                        <button type="button" class="btn-close-edit-modal px-5 py-2.5 bg-slate-800 border border-white/5 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition-colors">취소</button>
                        <button type="submit" class="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all text-sm shadow-md">저장</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete Modal (Dark Slate Theme) -->
        <div id="delete-modal" class="fixed inset-0 z-[110] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md delete-modal-backdrop transition-opacity opacity-0"></div>
            <div class="relative w-full max-w-sm bg-slate-900 rounded-2xl shadow-modal p-6 transform transition-all scale-95 opacity-0 text-center border border-white/10">
                
                <div class="w-12 h-12 rounded-full bg-rose-600/20 flex items-center justify-center mx-auto mb-4 text-rose-500 border border-rose-500/30">
                    <i class="fa-solid fa-trash-can text-lg"></i>
                </div>
                
                <h3 class="text-lg font-bold mb-2 text-white">Deal 삭제</h3>
                <p class="text-slate-400 text-sm mb-6 leading-relaxed">
                    삭제된 데이터는 복구할 수 없습니다.<br>정말 삭제하시겠습니까?
                </p>
                
                <div class="flex gap-3 justify-center">
                    <button type="button" class="btn-close-delete-modal px-4 py-2 bg-slate-800 border border-white/5 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition-colors">취소</button>
                    <button type="button" id="btn-confirm-delete" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors">삭제</button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    attachEvents(container, deals);
}

function createDealCard(deal) {
    const stageId = deal.currentStage || 'awareness';
    const stageLabel = STAGE_DEFINITIONS[stageId] ? STAGE_DEFINITIONS[stageId].label : 'Unknown';
    const isClosed = deal.status === 'won' || deal.status === 'lost';

    const stageGradients = {
        awareness: 'from-sky-200 to-sky-300',
        consideration: 'from-sky-400 to-blue-500',
        evaluation: 'from-blue-600 to-indigo-600',
        purchase: 'from-indigo-800 to-slate-900'
    };
    const gradientClass = isClosed ? 'from-slate-400 to-slate-500' : (stageGradients[stageId] || 'from-indigo-500 to-purple-500');

    let statusBadge = '';
    if (deal.status === 'won') {
        statusBadge = '<span class="text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">WON</span>';
    } else if (deal.status === 'lost') {
        statusBadge = '<span class="text-xs font-bold bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200">LOST</span>';
    } else {
        statusBadge = `<span class="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100">${stageLabel}</span>`;
    }

    return `
        <div class="group relative card-enterprise p-0 flex flex-col h-full cursor-pointer deal-card overflow-hidden ${isClosed ? 'opacity-90 grayscale-[0.2]' : ''}" data-id="${deal.id}">
            <div class="h-1.5 w-full bg-gradient-to-r ${gradientClass}"></div>
            
            <!-- Internal Contact Tag (Top Right) -->
            <div class="absolute top-[1.25rem] right-[1.25rem] z-0 group-hover:opacity-0 transition-opacity duration-200 pointer-events-none">
                <span class="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap shadow-sm">
                    <i class="fa-solid fa-user-tie mr-1 opacity-70"></i>${deal.internalContact || '담당자 미정'}
                </span>
            </div>

            <div class="p-6 flex flex-col h-full">
                <div class="flex justify-between items-start mb-4">
                    <div class="overflow-hidden pr-2">
                        <span class="text-xs font-bold text-slate-500 mb-1.5 inline-block uppercase tracking-wide">${deal.clientName} | ${deal.dealSize || '표준 딜'}</span>
                        <h3 class="font-bold text-lg text-slate-900 truncate leading-snug group-hover:text-indigo-600 transition-colors">${deal.dealName}</h3>
                    </div>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 -mr-2 -mt-1">
                        <button type="button" class="btn-edit-deal text-slate-400 hover:text-indigo-600 p-2 rounded-md hover:bg-indigo-50 transition-colors" title="수정">
                            <i class="fa-solid fa-pen text-sm"></i>
                        </button>
                        <button type="button" class="btn-delete-deal text-slate-400 hover:text-red-500 p-2 rounded-md hover:bg-red-50 transition-colors" title="삭제">
                            <i class="fa-solid fa-trash-can text-sm"></i>
                        </button>
                    </div>
                </div>
                <div class="flex-grow">
                     <p class="text-sm text-slate-500 line-clamp-2 leading-relaxed font-normal">${deal.memo || '메모 없음'}</p>
                </div>
                <div class="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-400">${isClosed ? 'Final Status' : 'Current Stage'}</span>
                    ${statusBadge}
                </div>
            </div>
        </div>
    `;
}

function attachEvents(container, deals) {
    const searchInput = document.getElementById('deal-search-input');
    const inProgressGrid = document.getElementById('inprogress-grid');
    const closedGrid = document.getElementById('closed-grid');
    const sectionClosed = document.getElementById('section-closed');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const cards = container.querySelectorAll('.deal-card');
            let visibleCount = 0;
            let visibleInProgress = 0;
            let visibleClosed = 0;

            cards.forEach(card => {
                const dealId = card.dataset.id;
                const deal = deals.find(d => d.id === dealId);
                if (!deal) return;

                // 프로젝트명 등이 아닌 '내부 담당자(internalContact)' 필드로만 검색 수행
                const matches = (deal.internalContact && deal.internalContact.toLowerCase().includes(query));
                
                if (matches) {
                    card.classList.remove('hidden');
                    visibleCount++;
                    if (deal.status === 'won' || deal.status === 'lost') {
                        visibleClosed++;
                    } else {
                        visibleInProgress++;
                    }
                } else {
                    card.classList.add('hidden');
                }
            });

            if (sectionClosed) {
                sectionClosed.classList.toggle('hidden', visibleClosed === 0 && query === '');
            }

            let emptyState = document.getElementById('search-empty-state');
            if (visibleCount === 0 && query !== '') {
                if (!emptyState) {
                    emptyState = document.createElement('div');
                    emptyState.id = 'search-empty-state';
                    emptyState.className = 'col-span-full flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 animate-modal-in';
                    emptyState.innerHTML = `
                        <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100 text-slate-300">
                            <i class="fa-solid fa-magnifying-glass text-2xl"></i>
                        </div>
                        <p class="text-slate-900 font-bold text-lg">검색 결과가 없습니다</p>
                        <p class="text-slate-500 text-sm mt-1">담당자 이름으로 다시 검색해보세요.</p>
                    `;
                    inProgressGrid.appendChild(emptyState);
                }
            } else if (emptyState) {
                emptyState.remove();
            }
        });
    }

    const createModal = document.getElementById('create-modal');
    const createBtn = document.getElementById('btn-create-deal');
    const createForm = document.getElementById('create-form');
    
    const toggleModal = (modal, show) => {
        const backdrop = modal.querySelector('.transition-opacity');
        const panel = modal.querySelector('.transform');
        if (show) {
            modal.classList.remove('hidden');
            requestAnimationFrame(() => {
                backdrop.classList.remove('opacity-0');
                backdrop.classList.add('opacity-100');
                panel.classList.remove('opacity-0', 'scale-95');
                panel.classList.add('opacity-100', 'scale-100');
            });
        } else {
            backdrop.classList.add('opacity-0');
            backdrop.classList.remove('opacity-100');
            panel.classList.add('opacity-0', 'scale-95');
            panel.classList.remove('opacity-100', 'scale-100');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    };

    if (createBtn) createBtn.addEventListener('click', () => toggleModal(createModal, true));

    createModal.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => toggleModal(createModal, false));
    });
    createModal.querySelector('.modal-backdrop').addEventListener('click', () => toggleModal(createModal, false));
    
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(createForm);
        const newDeal = Store.createEmptyDeal();
        newDeal.id = generateId();
        newDeal.clientName = formData.get('clientName');
        newDeal.dealName = formData.get('dealName');
        newDeal.clientContact = formData.get('clientContact');
        newDeal.internalContact = formData.get('internalContact');
        newDeal.solution = formData.get('solution');
        newDeal.dealSize = formData.get('dealSize');
        newDeal.purchaseDate = formData.get('purchaseDate');
        newDeal.memo = formData.get('memo');
        
        await Store.saveDeal(newDeal);
        toggleModal(createModal, false);
        showToast('성공적으로 등록되었습니다.', 'success');
        renderDeals(container);
    });

    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');

    editModal.querySelectorAll('.btn-close-edit-modal').forEach(btn => {
        btn.addEventListener('click', () => toggleModal(editModal, false));
    });
    editModal.querySelector('.edit-modal-backdrop').addEventListener('click', () => toggleModal(editModal, false));

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(editForm);
        const dealId = editTargetId;
        const existingDeal = await Store.getDeal(dealId);
        if (existingDeal) {
            existingDeal.clientName = formData.get('clientName');
            existingDeal.dealName = formData.get('dealName');
            existingDeal.clientContact = formData.get('clientContact');
            existingDeal.internalContact = formData.get('internalContact');
            existingDeal.solution = formData.get('solution');
            existingDeal.dealSize = formData.get('dealSize');
            existingDeal.purchaseDate = formData.get('purchaseDate');
            existingDeal.memo = formData.get('memo');
            existingDeal.updatedAt = new Date().toISOString();
            await Store.saveDeal(existingDeal);
            toggleModal(editModal, false);
            showToast('수정되었습니다.', 'success');
            renderDeals(container);
        }
    });

    const deleteModal = document.getElementById('delete-modal');

    deleteModal.querySelectorAll('.btn-close-delete-modal').forEach(btn => {
        btn.addEventListener('click', () => toggleModal(deleteModal, false));
    });
    deleteModal.querySelector('.delete-modal-backdrop').addEventListener('click', () => toggleModal(deleteModal, false));

    document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
        if (deleteTargetId) {
            await Store.deleteDeal(deleteTargetId);
            showToast('삭제되었습니다.', 'success');
            toggleModal(deleteModal, false);
            renderDeals(container);
        }
    });

    container.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit-deal');
        const deleteBtn = e.target.closest('.btn-delete-deal');
        const card = e.target.closest('.deal-card');

        if (editBtn) {
            e.stopPropagation();
            const dealId = editBtn.closest('.deal-card').dataset.id;
            const deal = await Store.getDeal(dealId);
            if (deal) {
                editTargetId = dealId;
                editForm.elements['id'].value = deal.id;
                editForm.elements['clientName'].value = deal.clientName;
                editForm.elements['dealName'].value = deal.dealName;
                editForm.elements['clientContact'].value = deal.clientContact || '';
                editForm.elements['internalContact'].value = deal.internalContact || '';
                editForm.elements['solution'].value = deal.solution || '';
                editForm.elements['dealSize'].value = deal.dealSize || '표준 딜';
                editForm.elements['purchaseDate'].value = deal.purchaseDate || '';
                editForm.elements['memo'].value = deal.memo || '';
                toggleModal(editModal, true);
            }
        } else if (deleteBtn) {
            e.stopPropagation();
            deleteTargetId = deleteBtn.closest('.deal-card').dataset.id;
            toggleModal(deleteModal, true);
        } else if (card) {
            const id = card.dataset.id;
            if (window.app && window.app.navigateTo) {
                window.app.navigateTo('details', { id });
            }
        }
    });
}
