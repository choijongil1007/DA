
import React, { useState } from 'react';
import { Deal, StageId, DiscoveryStageData } from '../../types.ts';
import { Store } from '../../services/store.ts';
import { DISCOVERY_STAGES } from '../../services/config.ts';
import { callGemini } from '../../services/ai.ts';

interface Props {
  deal: Deal;
  onUpdate: () => void;
}

const DiscoveryView: React.FC<Props> = ({ deal, onUpdate }) => {
  const [isAnalyzing, setIsAnalyzing] = useState<Record<string, boolean>>({});

  const handleInputChange = async (stageId: StageId, key: keyof DiscoveryStageData, value: string) => {
    const updatedDeal = { ...deal };
    (updatedDeal.discovery[stageId] as any)[key] = value;
    updatedDeal.discovery[stageId].frozen = false;
    await Store.saveDeal(updatedDeal);
    onUpdate();
  };

  const analyzeStage = async (stageId: StageId) => {
    const stageData = deal.discovery[stageId];
    if (!stageData.problem && !stageData.behavior) return;

    setIsAnalyzing({ ...isAnalyzing, [stageId]: true });
    
    try {
      const prompt = `Role: Senior B2B Sales Strategist. Stage: ${stageId}.
Analyze following signals for "${deal.dealName}":
- Behavior: ${stageData.behavior}
- Problem: ${stageData.problem}
Return JSON only: { "jtbd": ["list", "of", "jobs"], "sc": ["success", "criteria"] } in Korean.`;

      const result = await callGemini(prompt, true);
      
      const updatedDeal = { ...deal };
      updatedDeal.discovery[stageId].result = result;
      updatedDeal.discovery[stageId].frozen = true;
      await Store.saveDeal(updatedDeal);
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing({ ...isAnalyzing, [stageId]: false });
    }
  };

  return (
    <div className="animate-modal-in space-y-8">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Discovery Engine</h2>
        <p className="text-slate-400 text-sm">고객 신호를 해석하여 JTBD 및 성공 기준 도출</p>
      </div>

      {DISCOVERY_STAGES.map(stage => {
        const data = deal.discovery[stage.id as StageId];
        const isAnalyzingThis = isAnalyzing[stage.id];
        const hasChanges = !data.frozen && data.result;

        return (
          <div key={stage.id} className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden">
            <div className={`px-6 py-4 flex justify-between items-center ${stage.iconStyle}`}>
              <h3 className="font-bold text-sm tracking-tight">{stage.label}</h3>
              {data.frozen ? (
                <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-1 rounded-full uppercase">Frozen</span>
              ) : hasChanges ? (
                <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-1 rounded-full uppercase animate-pulse">Needs Refresh</span>
              ) : null}
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Behavior & Context</label>
                  <textarea 
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm min-h-[100px] focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    placeholder="고객이 현재 어떤 상황에서 무엇을 하고 있나요?"
                    value={data.behavior}
                    onChange={(e) => handleInputChange(stage.id as StageId, 'behavior', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Pain Point & Problem</label>
                  <textarea 
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm min-h-[100px] focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    placeholder="가장 결정적인 한계나 불편함은 무엇인가요?"
                    value={data.problem}
                    onChange={(e) => handleInputChange(stage.id as StageId, 'problem', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200/50">
                <button 
                  onClick={() => analyzeStage(stage.id as StageId)}
                  disabled={!!isAnalyzingThis || (data.frozen && !!data.result)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-md ${
                    isAnalyzingThis ? 'bg-slate-400 text-white cursor-not-allowed' :
                    (data.frozen && data.result) ? 'bg-slate-100 text-slate-400 cursor-default' :
                    'bg-slate-900 text-white hover:bg-indigo-600 active:scale-95'
                  }`}
                >
                  {isAnalyzingThis ? (
                    <><i className="fa-solid fa-circle-notch fa-spin"></i> 분석 중...</>
                  ) : (
                    <><i className="fa-solid fa-wand-magic-sparkles"></i> {data.result ? '인사이트 갱신' : 'AI 인사이트 생성'}</>
                  )}
                </button>
              </div>

              {data.result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                  <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
                    <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-4">JTBD (Jobs To Be Done)</h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      {data.result.jtbd.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
                    <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-4">Success Criteria</h4>
                    <ul className="space-y-2 text-sm text-slate-700">
                      {data.result.sc.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DiscoveryView;
