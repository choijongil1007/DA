
import React, { useState, useEffect } from 'react';
import { Deal, StageId } from './types';
import { Store } from './services/store';
import DealsList from './features/Deals/DealsList';
import DealDetails from './features/Details/DealDetails';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'list' | 'details'>('list');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    setIsLoading(true);
    const data = await Store.getDeals();
    setDeals(data);
    setIsLoading(false);
  };

  const handleSelectDeal = (id: string) => {
    setSelectedDealId(id);
    setCurrentView('details');
  };

  const handleBackToList = () => {
    setSelectedDealId(null);
    setCurrentView('list');
    loadDeals();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={handleBackToList}
          >
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:bg-indigo-600 transition-colors">
              <i className="fa-solid fa-compass-drafting text-lg"></i>
            </div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase">
              Deal <span className="text-indigo-600">Architect</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={loadDeals}
              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <i className="fa-solid fa-arrows-rotate"></i>
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-500 overflow-hidden">
                <i className="fa-solid fa-user text-xs"></i>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="spinner border-indigo-600 w-12 h-12 mb-4"></div>
            <p className="text-slate-500 font-bold">데이터를 동기화 중입니다...</p>
          </div>
        ) : (
          currentView === 'list' ? (
            <DealsList deals={deals} onSelectDeal={handleSelectDeal} onRefresh={loadDeals} />
          ) : (
            selectedDealId && <DealDetails dealId={selectedDealId} onBack={handleBackToList} />
          )
        )}
      </main>

      {/* Global Toast Container */}
      <div id="toast-container" className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3"></div>
    </div>
  );
};

export default App;
