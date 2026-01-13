import { Store } from '../store.js';
import { showSolutionDetailModal } from '../utils.js';

const CONFIG = {
    domain: { headerHeight: 0 },
    category: { headerHeight: 34, margin: 4 }
};

const RANK_COLORS = [
    'bg-indigo-100', 'bg-emerald-100', 'bg-amber-100', 'bg-rose-100', 'bg-sky-100', 'bg-purple-100', 'bg-orange-100'
];

export async function initTreemap(containerId, dealId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const renderCurrent = async () => {
        const content = await Store.getMapContent(dealId);
        render(container, content);
    };

    await renderCurrent();

    let lastWidth = container.clientWidth;
    const resizeObserver = new ResizeObserver(async (entries) => {
        for (let entry of entries) {
            if (entry.contentRect.width !== lastWidth) {
                lastWidth = entry.contentRect.width;
                window.requestAnimationFrame(async () => await renderCurrent());
            }
        }
    });
    resizeObserver.observe(container);
    return renderCurrent;
}

function render(container, data) {
    if (!container) return;
    const containerWidth = container.clientWidth;
    if (containerWidth === 0) return;
    const compStyle = window.getComputedStyle(container);
    const paddingX = parseFloat(compStyle.paddingLeft) + parseFloat(compStyle.paddingRight);
    const availableWidth = Math.max(0, containerWidth - paddingX - 4);
    container.innerHTML = '';
    const domainEntries = Object.entries(data);
    if (domainEntries.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-center text-slate-400"><i class="fa-solid fa-layer-group text-3xl mb-3 opacity-50"></i><p class="text-sm">데이터가 없습니다.</p></div>`;
        return;
    }
    const MIN_DOMAIN_HEIGHT = 400;
    const AREA_PER_SOLUTION = 12000; 

    domainEntries.forEach(([domainName, categories]) => {
        const section = document.createElement('div');
        section.className = "w-full mb-12 border-b border-slate-100 pb-12 last:border-0 last:pb-0";
        const title = document.createElement('h3');
        title.className = "text-xl font-bold text-slate-800 mb-6 pl-4 border-l-4 border-slate-900";
        title.textContent = domainName;
        section.appendChild(title);
        let solutionCount = 0;
        Object.values(categories).forEach(sols => {
            solutionCount += sols.length;
            const totalShare = sols.reduce((sum, s) => sum + s.share, 0);
            if (totalShare < 100) solutionCount++;
        });
        solutionCount = Math.max(1, solutionCount);
        const requiredArea = solutionCount * AREA_PER_SOLUTION;
        let calcHeight = availableWidth > 0 ? requiredArea / availableWidth : MIN_DOMAIN_HEIGHT;
        const catCount = Object.keys(categories).length;
        calcHeight += (catCount * CONFIG.category.headerHeight) + 40;
        const finalHeight = Math.max(MIN_DOMAIN_HEIGHT, calcHeight);
        const mapDiv = document.createElement('div');
        mapDiv.className = "relative w-full bg-white";
        mapDiv.style.height = `${finalHeight}px`;
        const root = buildDomainTree(domainName, categories);
        if (root.value > 0) {
            const nodes = computeLayout(root, { x: 0, y: 0, width: availableWidth, height: finalHeight });
            renderNodes(mapDiv, nodes);
        } else {
            mapDiv.innerHTML = `<div class="flex items-center justify-center h-full bg-slate-50 text-slate-400 text-sm rounded-lg">데이터 없음</div>`;
        }
        section.appendChild(mapDiv);
        const solutionsWithPainPoints = [];
        Object.entries(categories).forEach(([catName, solutions]) => {
            solutions.forEach(sol => { if (sol.painPoints && sol.painPoints.length > 0) solutionsWithPainPoints.push({ ...sol, category: catName }); });
        });
        if (solutionsWithPainPoints.length > 0) {
            const ppSection = document.createElement('div');
            ppSection.className = "mt-8";
            const ppHeader = document.createElement('h3');
            ppHeader.className = "text-xl font-bold text-slate-800 mb-6 pl-4 border-l-4 border-slate-900";
            ppHeader.textContent = "주요 고객 불만사항 (Key Pain Points)";
            ppSection.appendChild(ppHeader);
            const grid = document.createElement('div');
            grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
            solutionsWithPainPoints.forEach(sol => {
                const card = document.createElement('div');
                card.className = "bg-white border border-slate-200 rounded-lg p-4 shadow-sm";
                const cardHeader = document.createElement('div');
                cardHeader.className = "flex justify-between items-start mb-3 border-b border-slate-100 pb-2";
                cardHeader.innerHTML = `<div class="overflow-hidden mr-2"><div class="text-[10px] text-slate-500 font-bold mb-0.5 uppercase tracking-wide truncate">${sol.category}</div><div class="font-bold text-slate-900 text-sm truncate">${sol.name}</div></div><span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap">${sol.manufacturer || 'Unknown'}</span>`;
                const list = document.createElement('ul');
                list.className = "space-y-1.5";
                sol.painPoints.forEach(pp => {
                    const item = document.createElement('li');
                    item.className = "text-xs text-slate-600 flex items-start gap-2 leading-relaxed";
                    item.innerHTML = `<span class="text-rose-400 mt-0.5">•</span> <span>${pp}</span>`;
                    list.appendChild(item);
                });
                card.appendChild(cardHeader); card.appendChild(list); grid.appendChild(card);
            });
            ppSection.appendChild(grid); section.appendChild(ppSection);
        }
        container.appendChild(section);
    });
}

function buildDomainTree(domainName, categories) {
    const root = { name: 'root', type: 'root', children: [], value: 0 };
    const domainNode = { name: domainName, type: 'domain', children: [], value: 0 };
    Object.entries(categories).forEach(([catName, solutions]) => {
        const catNode = { name: catName, type: 'category', children: [], value: 0 };
        let totalShare = 0;
        const sorted = [...solutions].sort((a, b) => b.share - a.share);
        sorted.forEach((sol, index) => {
            const share = sol.share || 0; totalShare += share;
            const val = share <= 0 ? 0.1 : share;
            catNode.children.push({ name: sol.name, type: 'solution', value: val, share: share, data: sol, rank: index + 1 });
            catNode.value += val;
        });
        if (totalShare < 100) {
            const remainder = 100 - totalShare;
            catNode.children.push({ name: '미확인', type: 'solution', value: remainder, share: remainder, isUnknown: true });
            catNode.value += remainder;
        }
        if (catNode.value === 0) catNode.value = 10;
        domainNode.children.push(catNode); domainNode.value += catNode.value;
    });
    root.children.push(domainNode); root.value += domainNode.value;
    return root;
}

function splitLayout(children, rect) {
    if (children.length === 0) return [];
    if (children.length === 1) return [{ node: children[0], rect }];
    const half = Math.ceil(children.length / 2);
    const left = children.slice(0, half); const right = children.slice(half);
    const leftVal = left.reduce((s, c) => s + c.value, 0); const rightVal = right.reduce((s, c) => s + c.value, 0);
    const total = leftVal + rightVal;
    if (rect.width > rect.height) {
        const leftW = (rect.width * leftVal) / total;
        return [...splitLayout(left, { ...rect, width: leftW }), ...splitLayout(right, { ...rect, x: rect.x + leftW, width: rect.width - leftW })];
    } else {
        const topH = (rect.height * leftVal) / total;
        return [...splitLayout(left, { ...rect, height: topH }), ...splitLayout(right, { ...rect, y: rect.y + topH, height: rect.height - topH })];
    }
}

function computeLayout(node, rect) {
    const results = [{ node, rect }];
    if (!node.children || node.children.length === 0) return results;
    let contentRect = { ...rect };
    if (node.type === 'category') {
        const hh = CONFIG.category.headerHeight; contentRect.y += hh; contentRect.height = Math.max(0, contentRect.height - hh);
        const m = CONFIG.category.margin; contentRect.x += m; contentRect.y += m; contentRect.width -= (m * 2); contentRect.height -= (m * 2);
    }
    if (contentRect.width <= 0 || contentRect.height <= 0) return results;
    const childLayouts = splitLayout(node.children, contentRect);
    childLayouts.forEach(item => {
        const subResults = computeLayout(item.node, item.rect);
        subResults.forEach(r => results.push(r));
    });
    return results;
}

function renderNodes(container, layoutNodes) {
    const tooltip = document.getElementById('custom-tooltip');
    layoutNodes.forEach(({ node, rect }) => {
        if (node.type === 'category') {
            const el = document.createElement('div');
            el.className = "absolute bg-black text-white border-b border-slate-700 overflow-hidden flex items-center justify-center px-4 font-bold text-sm shadow-md z-10 rounded-t-lg tracking-wide uppercase";
            el.style.left = `${rect.x}px`; el.style.top = `${rect.y}px`; el.style.width = `${rect.width}px`; el.style.height = `${CONFIG.category.headerHeight}px`;
            el.innerHTML = `<span class="truncate">${node.name}</span>`;
            const bg = document.createElement('div');
            bg.className = "absolute bg-slate-900 rounded-lg shadow-lg border border-slate-800";
            bg.style.left = `${rect.x}px`; bg.style.top = `${rect.y}px`; bg.style.width = `${rect.width}px`; bg.style.height = `${rect.height}px`;
            container.appendChild(bg); container.appendChild(el);
        } else if (node.type === 'solution') {
            const el = document.createElement('div');
            const isUnknown = node.isUnknown;
            el.className = `absolute flex flex-col justify-center items-center text-center px-1 py-0.5 text-xs transition-all hover:z-20 hover:shadow-xl hover:scale-[1.02] cursor-pointer group rounded border border-slate-400 overflow-hidden`;
            el.style.left = `${rect.x}px`; el.style.top = `${rect.y}px`; el.style.width = `${rect.width}px`; el.style.height = `${rect.height}px`;
            if (isUnknown) {
                el.classList.add('bg-slate-300', 'text-slate-600');
                el.style.backgroundImage = 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.2) 5px, rgba(255,255,255,0.2) 10px)';
                el.innerHTML = `<span class="font-bold leading-none">미확인</span><span class="text-[10px] font-bold leading-none mt-0.5">${Math.round(node.share)}%</span>`;
            } else {
                const rankIndex = (node.rank || 1) - 1; const bgClass = RANK_COLORS[rankIndex] || 'bg-slate-100';
                el.classList.add(bgClass, 'text-slate-900');
                const canShowDetail = rect.height > 50 && rect.width > 60; const canShowShare = rect.height > 35;
                let content = `<span class="font-bold truncate w-full text-center leading-tight ${canShowDetail ? 'text-sm' : 'text-[11px]'}">${node.name}</span>`;
                if (canShowShare) content += `<span class="text-[10px] text-slate-700 font-bold leading-none mt-0.5">${node.share}%</span>`;
                if (canShowDetail && node.data?.manufacturer) content += `<span class="text-[10px] text-slate-500 truncate w-full text-center leading-none mt-0.5">${node.data.manufacturer}</span>`;
                if (node.data?.painPoints?.length > 0) content += `<div class="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" title="Pain Points"></div>`;
                el.innerHTML = content;
                el.addEventListener('click', () => showSolutionDetailModal(node.data));
                el.addEventListener('mouseenter', () => {
                    if (tooltip) {
                        tooltip.innerHTML = `<div class="flex flex-col gap-1 min-w-[140px]"><span class="text-xs text-slate-400 font-bold uppercase tracking-wide">${node.data?.manufacturer || 'Unknown'}</span><span class="text-lg font-bold text-white leading-tight">${node.name}</span><div class="mt-2 pt-2 border-t border-slate-600 flex justify-between items-end"><span class="text-xs text-slate-400">점유율</span><span class="text-2xl font-extrabold text-yellow-400">${node.share}%</span></div></div>`;
                        tooltip.classList.remove('hidden');
                    }
                });
                el.addEventListener('mousemove', (e) => {
                    if (tooltip && !tooltip.classList.contains('hidden')) {
                        const offset = 20; let left = e.clientX + offset, top = e.clientY + offset;
                        if (left + tooltip.offsetWidth > window.innerWidth) left = e.clientX - tooltip.offsetWidth - offset;
                        if (top + tooltip.offsetHeight > window.innerHeight) top = e.clientY - tooltip.offsetHeight - offset;
                        tooltip.style.left = `${left}px`; tooltip.style.top = `${top}px`;
                    }
                });
                el.addEventListener('mouseleave', () => { if (tooltip) tooltip.classList.add('hidden'); });
            }
            container.appendChild(el);
        }
    });
}