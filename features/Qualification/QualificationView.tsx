
import React from 'react';
import { Deal } from '../../types.ts';
import { ASSESSMENT_CONFIG } from '../../services/config.ts';

interface Props {
  deal: Deal;
  onUpdate: () => void;
}

const QualificationView: React.FC<Props> = ({ deal, onUpdate }) => {
  const currentStageId = deal.currentStage;
  const effectiveStageId = (currentStageId === 'evaluation' || currentStageId === 'purchase') ? 'consideration' : currentStageId;
  const assessment = deal.assessment[effectiveStageId];

  return (
    <div className="animate-modal-in space-y-8">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Deal Qualification</h2>
        <p className="text-slate-400 text-sm">BANT 및 기술 적합성 평가 (Stage: {effectiveStageId})</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Business Fit */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-briefcase"></i> Business Fit
          </h3>
          <div className="space-y-4">
            {ASSESSMENT_CONFIG.biz.categories.map(cat => (
              <div key={cat.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-slate-700">{cat.label}</span>
                  <span className="text-xs font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                    Weight: {cat.defaultWeight}%
                  </span>
                </div>
                <div className="space-y-2">
                  {cat.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-500">
                      <span>{item}</span>
                      <span className="font-bold text-slate-900">
                        {assessment?.biz?.scores[`${cat.id}_${idx}`] || 3} / 5
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Fit */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-sky-600 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-microchip"></i> Technical Fit
          </h3>
          <div className="space-y-4">
            {ASSESSMENT_CONFIG.tech.categories.map(cat => (
              <div key={cat.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-slate-700">{cat.label}</span>
                  <span className="text-xs font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                    Weight: {cat.defaultWeight}%
                  </span>
                </div>
                <div className="space-y-2">
                  {cat.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-500">
                      <span>{item}</span>
                      <span className="font-bold text-slate-900">
                        {assessment?.tech?.scores[`${cat.id}_${idx}`] || 3} / 5
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 p-8 bg-slate-900 text-white rounded-3xl flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 text-indigo-400 border border-indigo-500/30">
          <i className="fa-solid fa-chart-line text-2xl"></i>
        </div>
        <h3 className="text-lg font-bold mb-2">Qualification Analysis</h3>
        <p className="text-slate-400 text-sm max-w-md">
          이 섹션의 전체 점수 계산 및 AI 추천 기능은 현재 React 컴포넌트로 마이그레이션 중입니다. 
          데이터는 Firestore에 안전하게 저장되어 있습니다.
        </p>
      </div>
    </div>
  );
};

export default QualificationView;
