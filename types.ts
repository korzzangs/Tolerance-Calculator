
export interface DeviationRange {
  min_dia: number;
  max_dia: number;
  upper: number; // in mm
  lower: number; // in mm
}

export interface ToleranceData {
  holes: Record<string, DeviationRange[]>;
  shafts: Record<string, DeviationRange[]>;
}

export enum FitType {
  CLEARANCE = '헐거운 끼워맞춤 (Clearance Fit)',
  TRANSITION = '중간 끼워맞춤 (Transition Fit)',
  INTERFERENCE = '억지 끼워맞춤 (Interference Fit)',
  UNKNOWN = '알 수 없음'
}

export interface CalculationResult {
  nominal: number;
  holeGrade: string;
  shaftGrade: string;
  holeMax: number;
  holeMin: number;
  shaftMax: number;
  shaftMin: number;
  holeES: number;
  holeEI: number;
  shaftes: number;
  shaftei: number;
  maxClearance: number;
  minClearance: number;
  maxInterference: number;
  minInterference: number;
  fitType: FitType;
  description?: string; // 추가: 가이드 설명
}
