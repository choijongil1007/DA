
import React, { useState, useEffect } from 'react';
import { Deal } from '../../types.ts';
import { Store } from '../../services/store.ts';
import { STAGE_DEFINITIONS, MENU_ITEMS, FUNCTION_ACCESS_MATRIX } from '../../services/config.ts';
import StageAnchor from './components/StageAnchor.tsx';
import DiscoveryView from '../Discovery/DiscoveryView.tsx';
import QualificationView from '../Qualification/QualificationView.tsx';

interface Props {
  dealId: string;
  onBack: () => void;
}

const DealDetails: React.FC<Props> = ({ dealId, onBack }) => {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activeFeature, setActiveFeature] = useState<string>('dashboard');

  useEffect(() => {
    loadDeal();
  }, [dealId]);

  const loadDeal = async () => {
    const data = await Store.getDeal(dealId);
    setDeal(data);
  };

  if (!deal) return null;

  const currentStage = STAGE_DEFINITIONS[deal.currentStage];

  const renderContent = () => {
    switch (activeFeature) {
      case 'dashboard':
        return (
          <div className="animate-modal-in">
            <h2 className="text-2xl font-black text-slate-900 mb-2">{currentStage.label}</h2>
            <p className="text-indigo-600 font-bold italic mb-8">"{currentStage.keyQuestion}"</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 border-l-4 border-indigo-500 pl-3 uppercase tracking-wider text-xs">Stage Focus</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{currentStage.description}</p>
              </div>
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl">
                 <h3 className="font-bold text-indigo-400 mb-4 border-l-4 border-indigo-500 pl-3 uppercase tracking-wider text-xs">Internal Context</h3>
                 <div className="space-y-2 text-sm text-slate-300">
                   <p><span className="text-slate-500">Client:</span> {deal.clientName}</p>
                   <p><span className="text-slate-500">Solution:</span> {deal.solution || 'Not specified'}</p>
                 </div>
              </div>
            </div>
          </div>
        );
      case 'discovery':
        return <DiscoveryView deal={deal} onUpdate={loadDeal} />;
      case 'assessment':
        return <QualificationView deal={deal} onUpdate={loadDeal} />;
      default:
        return (
          <div className="flex items-center justify-center py-24 text-slate-400 italic">
            Feature "{activeFeature}" is under migration to React.
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
        <button onClick={onBack} className="hover:text-indigo-600 flex items-center gap-1">
          <i className="fa-solid fa-arrow-left"></i> Deals
        </button>
        <i className="fa-solid fa-chevron-right text-[8px]"></i>
        <span className="font-bold text-slate-600">{deal.dealName}</span>
      </div>

      <StageAnchor currentStageId={deal.currentStage} />

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <aside className="w-full md:w-64 flex-shrink-0 space-y-1">
          {MENU_ITEMS.map(item => {
            const access = FUNCTION_ACCESS_MATRIX[item.id][deal.currentStage];
            if (access === 'hide') return null;

            const isActive = activeFeature === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveFeature(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  isActive 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent'
                }`}
              >
                <i className={`${item.icon} w-5 opacity-70`}></i>
                {item.label}
                {access === 'view' && (
                  <span className="ml-auto text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase font-black">View</span>
                )}
              </button>
            );
          })}
        </aside>

        <section className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[600px] p-8">
          {renderContent()}
        </section>
      </div>
    </div>
  );
};

export default DealDetails;
