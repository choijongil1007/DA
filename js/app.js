
import { renderDeals } from './views/deals.js';
import { renderDealDetails } from './views/details.js';
import { Store } from './store.js';
import { showToast, showConfirmModal, showLoader, hideLoader } from './utils.js';

// DOM Elements
const appContainer = document.getElementById('app');
const backBtn = document.getElementById('nav-back-btn');
const migrationTools = document.getElementById('migration-tools');
const btnMigrate = document.getElementById('btn-migrate-data');
const btnClearLocal = document.getElementById('btn-clear-local-data');

// Expose to window to avoid circular dependency issues in views
window.app = window.app || {};
window.app.navigateTo = navigateTo;

// Simple Router
export async function navigateTo(view, params = {}) {
    if (!appContainer) return;
    
    showLoader("페이지를 불러오는 중...");
    
    if (view === 'deals') {
        backBtn.classList.add('hidden');
        appContainer.innerHTML = '';
        await renderDeals(appContainer);
    } else if (view === 'details') {
        backBtn.classList.remove('hidden');
        appContainer.innerHTML = '';
        await renderDealDetails(appContainer, params.id, params.tab);
    }
    
    window.scrollTo(0, 0);
    hideLoader();
    checkLocalDataStatus();
}

function checkLocalDataStatus() {
    if (Store.hasLocalData()) {
        migrationTools.classList.remove('hidden');
    } else {
        migrationTools.classList.add('hidden');
    }
}

// Initialization
async function init() {
    if (backBtn) {
        backBtn.addEventListener('click', () => navigateTo('deals'));
    }
    const navLogo = document.getElementById('nav-logo');
    if (navLogo) {
        navLogo.addEventListener('click', () => navigateTo('deals'));
    }

    if (btnMigrate) {
        btnMigrate.addEventListener('click', async () => {
            showConfirmModal("로컬 데이터를 Firestore로 이동하시겠습니까? (중복 데이터는 제외됩니다)", async () => {
                showLoader("데이터 마이그레이션 중...");
                try {
                    const count = await Store.migrateToFirestore();
                    showToast(`${count}건의 데이터가 성공적으로 마이그레이션 되었습니다.`, 'success');
                    await navigateTo('deals');
                } catch (e) {
                    showToast("마이그레이션 실패: " + e.message, 'error');
                } finally {
                    hideLoader();
                }
            });
        });
    }

    if (btnClearLocal) {
        btnClearLocal.addEventListener('click', () => {
            showConfirmModal("로컬 스토리지의 모든 데이터를 삭제하시겠습니까? (Firestore 데이터는 안전합니다)", () => {
                Store.clearLocalData();
                showToast("로컬 데이터가 삭제되었습니다.", 'success');
                checkLocalDataStatus();
            });
        });
    }

    await navigateTo('deals');
}

// Ensure init runs even if module loading happens after DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
