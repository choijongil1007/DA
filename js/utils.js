
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function showLoader(text = "AI 계산 중...") {
    const loader = document.getElementById('global-loader');
    const textEl = document.getElementById('loader-text');
    if (loader && textEl) {
        textEl.innerText = text;
        loader.classList.remove('hidden');
    }
}

export function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');
}

/**
 * 버튼 자체에 로딩 상태를 적용합니다 (화면 차단 없음)
 * @param {HTMLElement} btn - 버튼 엘리먼트
 * @param {boolean} isLoading - 로딩 중 여부
 * @param {string} loadingText - 로딩 중 표시할 텍스트
 */
export function setButtonLoading(btn, isLoading, loadingText = "Analyzing...") {
    if (!btn) return;

    if (isLoading) {
        const currentWidth = btn.offsetWidth;
        btn.style.minWidth = `${currentWidth}px`;
        btn.style.width = 'auto'; 
        
        btn.dataset.originalContent = btn.innerHTML;
        btn.disabled = true;
        btn.classList.add('cursor-not-allowed', 'opacity-80', 'bg-gray-700', 'whitespace-nowrap');
        btn.classList.remove('bg-gray-900', 'hover:bg-black', 'shadow-lg');
        
        btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-white"></i> <span class="ml-2">${loadingText}</span>`;
    } else {
        btn.disabled = false;
        btn.style.minWidth = ''; 
        btn.style.width = '';
        btn.classList.remove('cursor-not-allowed', 'opacity-80', 'bg-gray-700', 'whitespace-nowrap');
        btn.classList.add('bg-gray-900', 'hover:bg-black', 'shadow-lg');
        
        if (btn.dataset.originalContent) {
            btn.innerHTML = btn.dataset.originalContent;
        }
    }
}

export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bgClass = 'bg-gray-900 border border-gray-800';
    
    let iconHtml = '';
    if (type === 'success') {
        iconHtml = '<i class="fa-solid fa-circle-check text-emerald-400 text-lg"></i>';
    } else if (type === 'error') {
        iconHtml = '<i class="fa-solid fa-triangle-exclamation text-red-400 text-lg"></i>';
    } else {
        iconHtml = '<i class="fa-solid fa-circle-info text-blue-400 text-lg"></i>';
    }
    
    toast.className = `${bgClass} text-white px-5 py-3 rounded-full shadow-2xl text-sm font-medium transform transition-all duration-300 translate-y-10 opacity-0 flex items-center gap-3 backdrop-blur-md`;
    toast.innerHTML = `${iconHtml} <span>${message}</span>`;
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Firestore Timestamp를 포함한 다양한 날짜 형식을 안전하게 문자열로 변환합니다.
 */
export function formatDate(date) {
    if (!date) return '-';
    
    // Firestore Timestamp 객체인 경우 (.toDate 메서드가 있는 경우)
    if (date && typeof date === 'object' && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString();
    }
    
    // Firestore Timestamp 데이터만 있는 일반 객체인 경우
    if (date && typeof date === 'object' && date.seconds) {
        return new Date(date.seconds * 1000).toLocaleDateString();
    }
    
    // 숫자(ms)나 문자열인 경우
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString();
}

export function cleanJSONString(str) {
    if (!str) return "";
    let cleaned = str;
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```\s*$/, '');
    const firstOpenBrace = cleaned.indexOf('{');
    const firstOpenBracket = cleaned.indexOf('[');
    let startIdx = -1;
    if (firstOpenBrace !== -1 && firstOpenBracket !== -1) {
        startIdx = Math.min(firstOpenBrace, firstOpenBracket);
    } else if (firstOpenBrace !== -1) {
        startIdx = firstOpenBrace;
    } else if (firstOpenBracket !== -1) {
        startIdx = firstOpenBracket;
    }
    if (startIdx !== -1) cleaned = cleaned.substring(startIdx);
    return cleaned.trim();
}

export function tryRepairJSON(jsonStr) {
    try { return JSON.parse(jsonStr); } catch (e) {}
    const stack = [];
    let inString = false;
    let escaped = false;
    for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        if (char === '"' && !escaped) inString = !inString;
        else if (!inString) {
            if (char === '{') stack.push('}');
            else if (char === '[') stack.push(']');
            else if (char === '}' || char === ']') {
                if (stack.length > 0 && stack[stack.length - 1] === char) stack.pop();
            }
        }
        if (char === '\\' && !escaped) escaped = true;
        else escaped = false;
    }
    let repair = "";
    if (inString) repair += '"';
    repair += stack.reverse().join('');
    const repairedStr = jsonStr + repair;
    try { return JSON.parse(repairedStr); } catch (e) {
        console.warn("JSON Repair Failed:", e);
        return null;
    }
}

export function renderMarkdownLike(text) {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

export function showWarningModal(message) {
    const modal = document.getElementById('warning-modal');
    const backdrop = document.getElementById('warning-modal-backdrop');
    const panel = document.getElementById('warning-modal-panel');
    const msgEl = document.getElementById('warning-modal-message');
    const closeBtn = document.getElementById('warning-modal-close');
    if (!modal || !backdrop || !panel || !msgEl) { alert(message); return; }
    msgEl.textContent = message;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('opacity-0', 'scale-95');
        panel.classList.add('opacity-100', 'scale-100');
    });
    const close = () => {
        backdrop.classList.add('opacity-0');
        panel.classList.remove('opacity-100', 'scale-100');
        panel.classList.add('opacity-0', 'scale-95');
        setTimeout(() => modal.classList.add('hidden'), 200);
    };
    closeBtn.onclick = close;
}

export function showConfirmModal(message, onConfirm, onCancel = null) {
    const modal = document.getElementById('confirm-modal');
    const backdrop = document.getElementById('confirm-modal-backdrop');
    const panel = document.getElementById('confirm-modal-panel');
    const msgEl = document.getElementById('confirm-modal-message');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    const okBtn = document.getElementById('confirm-modal-ok');
    if (!modal) {
        if (confirm(message)) onConfirm();
        else if (onCancel) onCancel();
        return;
    }
    msgEl.textContent = message;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('opacity-0', 'scale-95');
        panel.classList.add('opacity-100', 'scale-100');
    });
    const close = () => {
        backdrop.classList.add('opacity-0');
        panel.classList.remove('opacity-100', 'scale-100');
        panel.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            okBtn.onclick = null;
            cancelBtn.onclick = null;
        }, 200);
    };
    cancelBtn.onclick = () => { if (onCancel) onCancel(); close(); };
    okBtn.onclick = () => { onConfirm(); close(); };
}

export function showSolutionDetailModal(data) {
    const modal = document.getElementById('solution-detail-modal');
    const backdrop = document.getElementById('detail-modal-backdrop');
    const panel = document.getElementById('detail-modal-panel');
    const closeBtn = document.getElementById('detail-modal-close');
    if (!modal) return;
    document.getElementById('detail-name').textContent = data.name || '-';
    document.getElementById('detail-manufacturer').textContent = data.manufacturer || '제조사 미지정';
    document.getElementById('detail-share').textContent = `${data.share}%`;
    document.getElementById('detail-note').textContent = data.note || '내용 없음';
    const ppList = document.getElementById('detail-painpoints');
    ppList.innerHTML = '';
    if (data.painPoints && data.painPoints.length > 0) {
        data.painPoints.forEach(pp => {
            const li = document.createElement('li');
            li.className = "flex items-start gap-2 text-sm text-gray-400";
            li.innerHTML = `<span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span><span>${pp}</span>`;
            ppList.appendChild(li);
        });
    } else {
        ppList.innerHTML = '<li class="text-sm text-gray-500 italic">등록된 Pain-Point가 없습니다.</li>';
    }
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('opacity-0', 'scale-95');
        panel.classList.add('opacity-100', 'scale-100');
    });
    const close = () => {
        backdrop.classList.add('opacity-0');
        panel.classList.remove('opacity-100', 'scale-100');
        panel.classList.add('opacity-0', 'scale-95');
        setTimeout(() => modal.classList.add('hidden'), 200);
    };
    closeBtn.onclick = close;
    if (backdrop) backdrop.onclick = close;
}
