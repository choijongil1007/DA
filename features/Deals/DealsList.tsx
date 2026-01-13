
import React, { useState } from 'react';
import { Deal } from '../../types';
import { Store } from '../../services/store';
import { STAGE_DEFINITIONS } from '../../services/config.ts';

interface Props {
  deals: Deal[];
  onSelectDeal: (id: string) => void;
  onRefresh: () => void;
}

const DealsList: React.FC<Props> = ({ deals, onSelectDeal, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDeals = deals.filter(deal => 
    deal.dealName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (deal.internalContact && deal.internalContact.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeDeals = filteredDeals.filter(d => d.status === 'active');
  const closedDeals = filteredDeals.filter(d => d.status !== 'active');

  return (
    <div className="animate-modal-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">DEALS</h2>
          <p className="text-slate-500 font-medium">파이프라인 및 전략 설계 현황</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input 
              type="text" 
              placeholder="딜 또는 담당자 검색..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-600 transition-all flex items-center gap-2"
            onClick={() => {/* Implement Create Logic */}}
          >
            <i className="fa-solid fa-plus"></i> New Deal
          </button>
        </div>
      </div>

      <section className="mb-12">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
          <span className="w-8 h-px bg-slate-200"></span>
          In Progress ({activeDeals.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeDeals.map(deal => (
            <div 
              key={deal.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
              onClick={() => onSelectDeal(deal.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100 uppercase">
                  {deal.dealSize}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {STAGE_DEFINITIONS[deal.currentStage].label.split(' (')[0]}
                </span>
              </div>
              <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors mb-1 truncate">{deal.dealName}</h4>
              <p className="text-xs font-bold text-slate-500 mb-4">{deal.clientName}</p>
              <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-50">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                  <i className="fa-solid fa-user-tie"></i>
                </div>
                <span className="text-[11px] font-bold text-slate-400">{deal.internalContact || 'Unassigned'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DealsList;
