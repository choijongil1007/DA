
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  serverTimestamp 
} from "firebase/firestore";
import { Deal } from '../types';

const COLLECTION_NAME = 'deals';

export const Store = {
  getDeals: async (): Promise<Deal[]> => {
    const q = query(collection(db, COLLECTION_NAME), orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deal));
  },

  getDeal: async (id: string): Promise<Deal | null> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Deal) : null;
  },

  saveDeal: async (deal: Deal): Promise<void> => {
    const dealRef = doc(db, COLLECTION_NAME, deal.id);
    await setDoc(dealRef, {
      ...deal,
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  deleteDeal: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  },

  createEmptyDeal: (id: string): Deal => ({
    id,
    currentStage: 'awareness',
    status: 'active',
    clientName: '',
    dealName: '',
    dealSize: '표준 딜',
    discovery: {
      awareness: createEmptyDiscovery(),
      consideration: createEmptyDiscovery(),
      evaluation: createEmptyDiscovery(),
      purchase: createEmptyDiscovery(),
    },
    assessment: {
      awareness: createEmptyAssessment(),
      consideration: createEmptyAssessment(),
      evaluation: createEmptyAssessment(),
      purchase: createEmptyAssessment(),
    },
    competitive: {
      competitor: '',
      ourProduct: '',
      requirements: [],
      functionalRequirements: [],
      result: null
    },
    solutionMapContent: {},
    updatedAt: null
  })
};

function createEmptyDiscovery() {
  return { behavior: '', emotion: '', touchpoint: '', problem: '', result: null, frozen: false };
}

function createEmptyAssessment() {
  return {
    biz: { scores: {}, weights: { budget: 20, authority: 25, need: 35, timeline: 20 } },
    tech: { scores: {}, weights: { req: 30, arch: 25, data: 25, ops: 20 } },
    aiRecommendations: {},
    isCompleted: false
  };
}
