
export type StageId = 'awareness' | 'consideration' | 'evaluation' | 'purchase';
export type DealStatus = 'active' | 'won' | 'lost';

export interface DiscoveryResult {
  jtbd: string[];
  sc: string[];
}

export interface DiscoveryStageData {
  behavior: string;
  emotion: string;
  touchpoint: string;
  problem: string;
  result: DiscoveryResult | null;
  frozen: boolean;
}

export interface AssessmentScores {
  [key: string]: number;
}

export interface AIRecommendation {
  score: number;
  reason: string;
}

export interface AssessmentStageData {
  biz: {
    scores: AssessmentScores;
    weights: Record<string, number>;
  };
  tech: {
    scores: AssessmentScores;
    weights: Record<string, number>;
  };
  aiRecommendations: Record<string, AIRecommendation>;
  isCompleted: boolean;
}

export interface Deal {
  id: string;
  currentStage: StageId;
  status: DealStatus;
  clientName: string;
  dealName: string;
  clientContact?: string;
  internalContact?: string;
  solution?: string;
  dealSize: '기회성 딜' | '표준 딜' | '전략 딜';
  purchaseDate?: string;
  memo?: string;
  discovery: Record<StageId, DiscoveryStageData>;
  assessment: Record<StageId, AssessmentStageData>;
  competitive: {
    competitor: string;
    ourProduct: string;
    requirements: string[];
    functionalRequirements: string[];
    result: string | null;
  };
  solutionMapContent: any;
  updatedAt: any;
}

export interface StageDefinition {
  id: StageId;
  label: string;
  keyQuestion: string;
  description: string;
  nextStage: StageId | null;
}
