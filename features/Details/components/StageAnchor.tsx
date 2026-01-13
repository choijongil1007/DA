
import React from 'react';
import { StageId } from '../../../types';
import { STAGE_DEFINITIONS } from '../../../services/config.ts';

interface Props {
  currentStageId: StageId;
}

const StageAnchor: React.FC<Props> = ({ currentStageId }) => {
  const stages: StageId[] = ['awareness', 'consideration', 'evaluation', 'purchase'];
  const currentIndex = stages.indexOf(currentStageId);
  const currentDef = STAGE_DEFINITIONS[currentStageId];

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex w-full bg-slate-50">
          {stages.map((sid, idx) => {
            const isCompleted = idx < currentIndex;
            const isActive = idx === currentIndex;
            const label = STAGE_DEFINITIONS[sid].label.split('. ')[1].split(' (')[0];

            return (
              <div 
                key={sid}
                className={`flex-1 h-12 flex items-center justify-center font-black text-sm transition-all border-r border-slate-200 last:border-0 ${
                  isActive ? 'bg-slate-900 text-white z-10' : 
                  isCompleted ? 'bg-indigo-50 text-indigo-400' : 'text-slate-300'
                }`}
              >
                {idx + 1}. {label}
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-indigo-50/50 border-x border-b border-indigo-100 rounded-b-xl mx-3 p-2 text-center -mt-0.5 relative z-0">
        <p className="text-indigo-800 text-[11px] font-black uppercase tracking-widest">
          <i className="fa-solid fa-circle-question mr-2 opacity-50"></i>
          {currentDef.keyQuestion}
        </p>
      </div>
    </div>
  );
};

export default StageAnchor;
