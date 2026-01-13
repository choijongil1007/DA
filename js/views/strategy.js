
import { Store } from '../store.js';
import { renderTWS } from './tws.js';
import { renderDWS } from './dws.js';

/**
 * Strategy View Entry Point
 * Decides whether to render Technical Win Strategy (TWS) or Deal Win Strategy (DWS)
 */
export async function renderStrategy(container, dealId, isReadOnly = false, forceMode = null) {
    const deal = await Store.getDeal(dealId);
    if (!deal) {
        container.innerHTML = `<div class="p-4 text-center text-slate-500">Deal not found.</div>`;
        return;
    }

    // Determine which strategy to show
    // In evaluation/consideration stage, we always show TWS.
    // In purchase stage, we show DWS by default unless forceMode is 'standard'.
    const showTWS = forceMode === 'standard' || deal.currentStage === 'evaluation' || deal.currentStage === 'consideration';

    if (showTWS) {
        renderTWS(container, deal, isReadOnly);
    } else {
        renderDWS(container, deal, isReadOnly);
    }
}
