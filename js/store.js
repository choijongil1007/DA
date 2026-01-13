
import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    getDoc, 
    doc, 
    setDoc, 
    deleteDoc, 
    query, 
    orderBy,
    serverTimestamp,
    writeBatch
} from "firebase/firestore";

const STORAGE_KEY = 'deal_architect_deals';
const COLLECTION_NAME = 'deals';

export const Store = {
    // Check if there is data in local storage
    hasLocalData: () => {
        const data = localStorage.getItem(STORAGE_KEY);
        return !!data && JSON.parse(data).length > 0;
    },

    // Clear local storage data
    clearLocalData: () => {
        localStorage.removeItem(STORAGE_KEY);
    },

    // Migrate data from LocalStorage to Firestore
    migrateToFirestore: async () => {
        const localData = localStorage.getItem(STORAGE_KEY);
        if (!localData) return 0;
        
        const deals = JSON.parse(localData);
        let count = 0;
        
        for (const deal of deals) {
            const dealId = deal.id || Date.now().toString(36);
            const dealDoc = doc(db, COLLECTION_NAME, dealId);
            const snapshot = await getDoc(dealDoc);
            
            // Only migrate if it doesn't exist in Firestore to prevent overwriting
            if (!snapshot.exists()) {
                await setDoc(dealDoc, {
                    ...Store.ensureDealStructure(deal),
                    updatedAt: serverTimestamp()
                });
                count++;
            }
        }
        return count;
    },

    getDeals: async () => {
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy("updatedAt", "desc"));
            const querySnapshot = await getDocs(q);
            let deals = [];
            querySnapshot.forEach((doc) => {
                deals.push({ id: doc.id, ...doc.data() });
            });
            return deals.map(deal => Store.ensureDealStructure(deal));
        } catch (error) {
            console.error("Firestore getDeals error:", error);
            return [];
        }
    },

    getDeal: async (id) => {
        if (!id) return null;
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return Store.ensureDealStructure({ id: docSnap.id, ...docSnap.data() });
            }
            return null;
        } catch (error) {
            console.error("Firestore getDeal error:", error);
            return null;
        }
    },

    saveDeal: async (deal) => {
        if (!deal.id) deal.id = Date.now().toString(36);
        try {
            const dealRef = doc(db, COLLECTION_NAME, deal.id);
            await setDoc(dealRef, {
                ...deal,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Firestore saveDeal error:", error);
            throw error;
        }
    },

    deleteDeal: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (error) {
            console.error("Firestore deleteDeal error:", error);
            throw error;
        }
    },

    resetDataPreserving: async (targetDealName) => {
        try {
            const deals = await Store.getDeals();
            const batch = writeBatch(db);
            let preservedCount = 0;
            
            for (const deal of deals) {
                if (deal.dealName.trim() === targetDealName.trim()) {
                    preservedCount++;
                    continue;
                }
                // Fix: Corrected double doc() call that caused a crash
                batch.delete(doc(db, COLLECTION_NAME, deal.id));
            }
            
            await batch.commit();
            return preservedCount;
        } catch (error) {
            console.error("Firestore resetData error:", error);
            return 0;
        }
    },

    createEmptyDeal: () => {
        return {
            id: null,
            currentStage: 'awareness', 
            status: 'active', // active, won, lost
            clientName: '',
            dealName: '',
            clientContact: '',
            internalContact: '',
            solution: '',
            dealSize: '표준 딜', 
            purchaseDate: '',
            memo: '',
            discovery: {
                awareness: { behavior: '', emotion: '', touchpoint: '', problem: '', result: null, frozen: false },
                consideration: { behavior: '', emotion: '', touchpoint: '', problem: '', result: null, frozen: false },
                evaluation: { behavior: '', emotion: '', touchpoint: '', problem: '', result: null, frozen: false },
                purchase: { behavior: '', emotion: '', touchpoint: '', problem: '', result: null, frozen: false },
            },
            assessment: {
                awareness: { 
                    biz: { scores: {}, weights: { budget: 20, authority: 25, need: 35, timeline: 20 } },
                    tech: { scores: {}, weights: { req: 30, arch: 25, data: 25, ops: 20 } },
                    recommendations: null,
                    isCompleted: false
                },
                consideration: {
                    biz: { scores: {}, weights: { budget: 20, authority: 25, need: 35, timeline: 20 } },
                    tech: { scores: {}, weights: { req: 30, arch: 25, data: 25, ops: 20 } },
                    recommendations: null,
                    isCompleted: false
                },
                evaluation: {
                    biz: { scores: {}, weights: { budget: 20, authority: 25, need: 35, timeline: 20 } },
                    tech: { scores: {}, weights: { req: 30, arch: 25, data: 25, ops: 20 } },
                    recommendations: null,
                    isCompleted: false
                },
                purchase: {
                    biz: { scores: {}, weights: { budget: 20, authority: 25, need: 35, timeline: 20 } },
                    tech: { scores: {}, weights: { req: 30, arch: 25, data: 25, ops: 20 } },
                    recommendations: null,
                    isCompleted: false
                }
            },
            competitive: {
                competitor: '',
                ourProduct: '',
                requirements: [], 
                functionalRequirements: [], 
                result: null, 
                updatedAt: null
            },
            decisionRisks: [], 
            solutionMapContent: {}, 
            savedMaps: [], 
            reports: [], 
            twsReport: null,
            dwsReport: null,
            closeResult: {
                type: '', // won, lost
                factors: [],
                otherReason: '',
                lessonsLearned: ''
            },
            updatedAt: new Date().toISOString()
        };
    },

    ensureDealStructure: (deal) => {
        const template = Store.createEmptyDeal();
        
        if (!deal.currentStage) deal.currentStage = 'awareness';
        if (!deal.status) deal.status = 'active';

        if (!deal.discovery) deal.discovery = JSON.parse(JSON.stringify(template.discovery));
        ['awareness', 'consideration', 'evaluation', 'purchase'].forEach(stage => {
            if (!deal.discovery[stage]) deal.discovery[stage] = { ...template.discovery[stage] };
        });

        if (!deal.assessment) deal.assessment = JSON.parse(JSON.stringify(template.assessment));
        ['awareness', 'consideration', 'evaluation', 'purchase'].forEach(stage => {
            if (!deal.assessment[stage]) {
                deal.assessment[stage] = JSON.parse(JSON.stringify(template.assessment[stage]));
            } else {
                if (!deal.assessment[stage].biz) deal.assessment[stage].biz = JSON.parse(JSON.stringify(template.assessment[stage].biz));
                if (!deal.assessment[stage].tech) deal.assessment[stage].tech = JSON.parse(JSON.stringify(template.assessment[stage].tech));
            }
        });

        if (!deal.competitive) deal.competitive = JSON.parse(JSON.stringify(template.competitive));
        if (deal.competitive.requirements === undefined) deal.competitive.requirements = [];
        if (deal.competitive.functionalRequirements === undefined) deal.competitive.functionalRequirements = [];

        if (!deal.decisionRisks) deal.decisionRisks = [];

        if (!deal.solutionMapContent) deal.solutionMapContent = {};
        if (!deal.savedMaps) deal.savedMaps = [];
        if (!deal.reports) deal.reports = [];
        
        if (deal.hasOwnProperty('strategyReport')) {
            if (deal.strategyReport) {
                if (!deal.twsReport && !deal.strategyReport.isDWS) deal.twsReport = deal.strategyReport;
                if (!deal.dwsReport && deal.strategyReport.isDWS) deal.dwsReport = deal.strategyReport;
            }
            delete deal.strategyReport;
        }

        if (deal.twsReport === undefined) deal.twsReport = null;
        if (deal.dwsReport === undefined) deal.dwsReport = null;
        if (!deal.dealSize) deal.dealSize = '표준 딜';

        if (!deal.closeResult) deal.closeResult = JSON.parse(JSON.stringify(template.closeResult));

        return deal;
    },

    getMapContent: async (dealId) => {
        const deal = await Store.getDeal(dealId);
        if (!deal) return {};
        if (!deal.solutionMapContent || Array.isArray(deal.solutionMapContent)) {
            deal.solutionMapContent = {};
            await Store.saveDeal(deal);
        }
        return JSON.parse(JSON.stringify(deal.solutionMapContent));
    },

    saveMapContent: async (dealId, content) => {
        const deal = await Store.getDeal(dealId);
        if (deal) {
            deal.solutionMapContent = content;
            await Store.saveDeal(deal);
        }
    },

    addSavedMap: async (dealId, title, content) => {
        const deal = await Store.getDeal(dealId);
        if (deal) {
            if (!deal.savedMaps) deal.savedMaps = [];
            const existingIndex = deal.savedMaps.findIndex(m => m.title === title);
            if (existingIndex >= 0) {
                deal.savedMaps[existingIndex].content = JSON.parse(JSON.stringify(content));
                deal.savedMaps[existingIndex].updatedAt = Date.now();
            } else {
                deal.savedMaps.push({
                    id: Date.now().toString(36),
                    title,
                    content: JSON.parse(JSON.stringify(content)), 
                    updatedAt: Date.now()
                });
            }
            await Store.saveDeal(deal);
        }
    },

    deleteSavedMap: async (dealId, mapId) => {
        const deal = await Store.getDeal(dealId);
        if (deal && deal.savedMaps) {
            deal.savedMaps = deal.savedMaps.filter(m => m.id !== mapId);
            await Store.saveDeal(deal);
        }
    },

    addDomain: async (dealId, name) => {
        const content = await Store.getMapContent(dealId);
        if (!name || content[name]) return false;
        content[name] = {};
        await Store.saveMapContent(dealId, content);
        return true;
    },

    renameDomain: async (dealId, oldName, newName) => {
        const content = await Store.getMapContent(dealId);
        if (!newName || oldName === newName) return true;
        if (content[newName]) return false;
        content[newName] = content[oldName];
        delete content[oldName];
        await Store.saveMapContent(dealId, content);
        return true;
    },

    deleteDomain: async (dealId, name) => {
        const content = await Store.getMapContent(dealId);
        if (content[name]) {
            delete content[name];
            await Store.saveMapContent(dealId, content);
        }
    },

    addCategory: async (dealId, domain, name) => {
        const content = await Store.getMapContent(dealId);
        if (!content[domain] || content[domain][name]) return false;
        content[domain][name] = [];
        await Store.saveMapContent(dealId, content);
        return true;
    },

    renameCategory: async (dealId, domain, oldName, newName) => {
        const content = await Store.getMapContent(dealId);
        if (!content[domain] || !newName || content[domain][newName]) return false;
        content[domain][newName] = content[oldName];
        delete content[domain][oldName];
        await Store.saveMapContent(dealId, content);
        return true;
    },

    deleteCategory: async (dealId, domain, name) => {
        const content = await Store.getMapContent(dealId);
        if (content[domain]) {
            delete content[domain][name];
            await Store.saveMapContent(dealId, content);
        }
    },

    addSolution: async (dealId, domain, category, name, share, manufacturer, painPoints, note) => {
        const content = await Store.getMapContent(dealId);
        const solutions = content[domain]?.[category];
        if (!solutions) return 'INVALID_TARGET';
        if (solutions.some(s => s.name === name)) return 'DUPLICATE';
        const total = solutions.reduce((sum, s) => sum + s.share, 0);
        if (total + share > 100) return 'OVERFLOW';
        solutions.push({ name, share, manufacturer, painPoints, note });
        await Store.saveMapContent(dealId, content);
        return 'SUCCESS';
    },

    updateSolution: async (dealId, domain, category, index, name, share, manufacturer, painPoints, note) => {
        const content = await Store.getMapContent(dealId);
        const solutions = content[domain]?.[category];
        if (!solutions || !solutions[index]) return 'INVALID_INDEX';
        if (solutions[index].name !== name && solutions.some(s => s.name === name)) return 'DUPLICATE';
        const otherSum = solutions.reduce((sum, s, i) => i === index ? sum : sum + s.share, 0);
        if (otherSum + share > 100) return 'OVERFLOW';
        solutions[index] = { name, share, manufacturer, painPoints, note };
        await Store.saveMapContent(dealId, content);
        return 'SUCCESS';
    },

    deleteSolution: async (dealId, domain, category, index) => {
        const content = await Store.getMapContent(dealId);
        if (content[domain]?.[category]) {
            content[domain][category].splice(index, 1);
            await Store.saveMapContent(dealId, content);
        }
    },

    addReport: async (dealId, title, contentHTML, type = 'competitive_insight') => {
        const deal = await Store.getDeal(dealId);
        if (deal) {
            if (!deal.reports) deal.reports = [];
            deal.reports.push({
                id: Date.now().toString(36),
                title,
                contentHTML,
                type,
                createdAt: Date.now()
            });
            await Store.saveDeal(deal);
        }
    },

    deleteReport: async (dealId, reportId) => {
        const deal = await Store.getDeal(dealId);
        if (deal && deal.reports) {
            deal.reports = deal.reports.filter(r => r.id !== reportId);
            await Store.saveDeal(deal);
        }
    }
};
