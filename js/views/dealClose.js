
import { Store } from '../store.js';
import { callGemini } from '../api.js';
import { showToast, setButtonLoading, showConfirmModal } from '../utils.js';

let currentDealId = null;
let onCloseCallback = null;

export async function openDealCloseModal(dealId, callback) {
    currentDealId = dealId;
    onCloseCallback = callback;
    
    let modal = document.getElementById('deal-close-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deal-close-modal';
        modal.className = 'fixed inset-0 z-[200] hidden flex items-center justify-center p-4';
        document.body.appendChild(modal);
    }
    
    await renderModalContent(modal);
    modal.classList.remove('hidden');
    
    const backdrop = modal.querySelector('#deal-close-backdrop');
    const panel = modal.querySelector('.transform');
    requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0');
        backdrop.classList.add('opacity-100');
        panel.classList.remove('opacity-0', 'scale-95');
        panel.classList.add('opacity-100', 'scale-100');
    });
}

async function renderModalContent(container) {
    const deal = await Store.getDeal(currentDealId);
    if (!deal) return;

    container.innerHTML = `
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity opacity-0" id="deal-close-backdrop"></div>
        <div class="relative bg-slate-900 rounded-2xl shadow-modal w-full max-w-xl transform transition-all scale-95 opacity-0 border border-white/10 flex flex-col max-h-[90vh]">
            <!-- Header -->
            <div class="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-black/20 rounded-t-2xl">
                <h3 class="text-xl font-bold text-white flex items-center gap-2">
                    <i class="fa-solid fa-flag-checkered text-indigo-400"></i> Deal Close
                </h3>
                <button id="deal-close-cancel" class="text-slate-500 hover:text-white transition-colors">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>
            
            <!-- Body -->
            <div class="p-8 overflow-y-auto custom-scrollbar flex-1">
                <div class="space-y-8">
                    <!-- Close Type Selection -->
                    <div>
                        <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">1. Close Type 선택</label>
                        <div class="grid grid-cols-2 gap-4">
                            <label class="relative flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-emerald-500/5 group border-white/5 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-500/10">
                                <input type="radio" name="closeType" value="won" class="hidden peer">
                                <div class="flex flex-col items-center gap-2">
                                    <i class="fa-solid fa-trophy text-2xl text-slate-700 peer-checked:text-emerald-500 group-hover:text-emerald-400"></i>
                                    <span class="font-bold text-slate-500 peer-checked:text-emerald-400">Won</span>
                                </div>
                            </label>
                            <label class="relative flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-rose-500/5 group border-white/5 has-[:checked]:border-rose-500 has-[:checked]:bg-rose-500/10">
                                <input type="radio" name="closeType" value="lost" class="hidden peer">
                                <div class="flex flex-col items-center gap-2">
                                    <i class="fa-solid fa-circle-xmark text-2xl text-slate-700 peer-checked:text-rose-500 group-hover:text-rose-400"></i>
                                    <span class="font-bold text-slate-500 peer-checked:text-rose-400">Lost</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- AI Factor Analysis -->
                    <div id="factors-section" class="hidden">
                        <div class="flex justify-between items-center mb-4">
                            <label class="block text-xs font-black text-slate-400 uppercase tracking-widest" id="factors-label">2. 주요 요인 분석</label>
                            <button id="btn-analyze-factors" class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-2">
                                <i class="fa-solid fa-wand-magic-sparkles"></i> AI 분석 실행
                            </button>
                        </div>
                        
                        <div id="factors-list" class="space-y-2 bg-black/20 p-4 rounded-xl border border-white/5 min-h-[100px] flex flex-col justify-center text-white">
                            <p class="text-xs text-slate-500 text-center italic">분석 버튼을 눌러 Win/Loss 요인을 도출하세요.</p>
                        </div>
                        
                        <div class="mt-4">
                            <label class="block text-[11px] font-bold text-slate-400 mb-2 ml-1">기타 직접 입력 원인</label>
                            <input type="text" id="other-factor" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full text-sm" placeholder="목록에 없는 경우 직접 입력하세요.">
                        </div>
                    </div>

                    <!-- Lessons Learned -->
                    <div>
                        <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">3. Lessons Learned</label>
                        <textarea id="lessons-learned" class="input-enterprise !bg-slate-800 !border-white/10 !text-white w-full min-h-[120px] resize-none text-sm" placeholder="이 딜을 진행하며 배운 점이나 다음 프로젝트에서 개선할 점을 자유롭게 기록하세요."></textarea>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="px-8 py-5 border-t border-white/5 bg-black/20 rounded-b-2xl flex justify-end gap-3">
                <button id="btn-cancel-close" class="px-6 py-2.5 bg-slate-800 border border-white/5 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-all text-sm">취소</button>
                <button id="btn-save-close" class="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 shadow-lg transition-all text-sm transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" disabled>종료 처리 완료</button>
            </div>
        </div>
    `;

    attachEvents(deal);
}

function attachEvents(deal) {
    const modal = document.getElementById('deal-close-modal');
    const backdrop = document.getElementById('deal-close-backdrop');
    const closeBtn = document.getElementById('deal-close-cancel');
    const cancelBtn = document.getElementById('btn-cancel-close');
    const saveBtn = document.getElementById('btn-save-close');
    const panel = modal.querySelector('.transform');
    
    const closeModal = () => {
        if (modal) {
            backdrop.classList.add('opacity-0');
            panel.classList.add('scale-95', 'opacity-0');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    };
    // ... rest of event logic ...
}
