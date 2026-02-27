import React, { useState, useMemo, useEffect } from 'react';
import { ToleranceData, CalculationResult, FitType, DeviationRange } from './types';
import { sampleData } from './data/tolerance_data_sample';

const FIT_GUIDE = [
  { hole: 'H7', shaft: 'g6', type: '헐거운 끼움', desc: '미끄럼 운동, 회전 운동' },
  { hole: 'H7', shaft: 'h6', type: '중간 끼움', desc: '기어, 풀리, 위치 정밀 필요' },
  { hole: 'H7', shaft: 'p6', type: '억지 끼움', desc: '베어링 압입, 영구 고정' },
  { hole: 'H6', shaft: 'k5', type: '중간 끼움', desc: '때려서 끼우는 조립(타합)' },
  { hole: 'H7', shaft: 's6', type: '억지 끼움', desc: '강력 압입, 냉각/가열 조립' },
  { hole: 'H7', shaft: 't6', type: '억지 끼움', desc: '강력 압입, 냉각/가열 조립' },
  { hole: 'H8', shaft: 'f7', type: '헐거운 끼움', desc: '일반 슬라이딩 부품' },
  { hole: 'H7', shaft: 'js6', type: '중간 끼움', desc: '정밀 부품 위치 결정' },
  { hole: 'H7', shaft: 'm6', type: '중간/억지 사이', desc: '체결부, 키 맞춤' },
  { hole: 'H6', shaft: 'g5', type: '정밀 헐거움', desc: '고정밀 회전축' },
  { hole: 'H7', shaft: 'h9', type: '일반 끼움', desc: '허용 오차 큰 범용 부품' }
];

const ISO2768_GRADES = [
  { id: 'f', label: 'f (정밀급)' },
  { id: 'm', label: 'm (중간급)' },
  { id: 'c', label: 'c (거친급)' },
  { id: 'v', label: 'v (매우 거친급)' }
];

const ISO2768_DESCRIPTIONS = [
  { id: 'f (fine)', desc: '높은 정밀도가 요구되는 경우 사용됩니다. 주로 정밀 기계 부품에 적용됩니다.' },
  { id: 'm (medium)', desc: '중간 정도의 정밀도가 요구되는 경우로, 일반적인 기계 부품에 널리 사용됩니다.' },
  { id: 'c (coarse)', desc: '정밀도가 덜 요구되는 경우로, 큰 기계 부품이나 구조물에 적용됩니다.' },
  { id: 'v (very coarse)', desc: '정밀도가 거의 요구되지 않는 경우로, 대형 구조물이나 비중요 부품에 사용됩니다.' }
];

const ISO2768_STEPS = [0.5, 3, 6, 30, 120, 400, 1000, 2000, 4000];
const ISO2768_DATA: Record<string, (number | null)[]> = {
  f: [0.05, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5, null],
  m: [0.1, 0.1, 0.2, 0.3, 0.5, 0.8, 1.2, 2.0],
  c: [0.2, 0.3, 0.5, 0.8, 1.2, 2.0, 3.0, 4.0],
  v: [null, 0.5, 1.0, 1.5, 2.5, 4.0, 6.0, 8.0]
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fit' | 'general'>('fit');
  const [data] = useState<ToleranceData>(sampleData);
  
  const [nominal, setNominal] = useState<number>(20);
  const [holeGrade, setHoleGrade] = useState<string>('H7');
  const [shaftGrade, setShaftGrade] = useState<string>('h6');
  const [result, setResult] = useState<CalculationResult | null>(null);

  const [genNominal, setGenNominal] = useState<number>(20);
  const [isoGrade, setIsoGrade] = useState<string>('m');
  const [genResult, setGenResult] = useState<{ valMm: number | null } | null>(null);

  // 한계치수 가이드용 상태
  const [limHoleNominal, setLimHoleNominal] = useState<string>('20');
  const [limHoleMax, setLimHoleMax] = useState<string>('0.021');
  const [limHoleMin, setLimHoleMin] = useState<string>('0.000');
  const [limShaftNominal, setLimShaftNominal] = useState<string>('20');
  const [limShaftMax, setLimShaftMax] = useState<string>('-0.007');
  const [limShaftMin, setLimShaftMin] = useState<string>('-0.020');
  
  const [limitResult, setLimitResult] = useState<{
    calcHoleMax: number;
    calcHoleMin: number;
    calcShaftMax: number;
    calcShaftMin: number;
    res1: number; // 최대틈새: HOLE 최대 - SHAFT 최소
    res2: number; // 최소틈새: HOLE 최대 - SHAFT 최대
    res3: number; // 최소틈새: HOLE 최소 - SHAFT 최소
    res4: number; // 최대틈새: HOLE 최소 - SHAFT 최대
  } | null>(null);

  const holeOptions = useMemo(() => Object.keys(data.holes).sort(), [data]);
  const shaftOptions = useMemo(() => Object.keys(data.shafts).sort(), [data]);

  useEffect(() => {
    calculateFit();
    calculateGeneral();
  }, []);

  const calculateFit = () => {
    if (!nominal || nominal <= 0 || nominal > 500) {
      alert("기준 치수는 0.001mm 초과 500mm 이하의 값을 입력해주세요.");
      return;
    }

    const findDeviation = (grade: string, type: 'holes' | 'shafts'): DeviationRange | undefined => {
      const ranges = data[type][grade];
      if (!ranges) return undefined;
      return ranges.find(r => (r.min_dia === 0 ? nominal >= 0 && nominal <= r.max_dia : nominal > r.min_dia && nominal <= r.max_dia));
    };

    const holeDev = findDeviation(holeGrade, 'holes');
    const shaftDev = findDeviation(shaftGrade, 'shafts');

    if (!holeDev) {
      alert(`Hole 등급 ${holeGrade}에 대한 데이터를 찾을 수 없습니다.`);
      return;
    }
    if (!shaftDev) {
      alert(`Shaft 등급 ${shaftGrade}에 대한 데이터를 찾을 수 없습니다.`);
      return;
    }

    const holeMax = nominal + holeDev.upper;
    const holeMin = nominal + holeDev.lower;
    const shaftMax = nominal + shaftDev.upper;
    const shaftMin = nominal + shaftDev.lower;

    const maxClearance = holeMax - shaftMin;
    const minClearance = holeMin - shaftMax;
    const maxInterference = shaftMax - holeMin;
    const minInterference = shaftMin - holeMax;

    let fitType = FitType.UNKNOWN;
    if (minClearance >= 0) fitType = FitType.CLEARANCE;
    else if (maxInterference >= 0 && maxClearance <= 0) fitType = FitType.INTERFERENCE;
    else fitType = FitType.TRANSITION;

    const guideMatch = FIT_GUIDE.find(g => g.hole === holeGrade && g.shaft === shaftGrade);
    let description = guideMatch ? `${guideMatch.type} (${guideMatch.desc})` : undefined;

    if (!description) {
      if (fitType === FitType.CLEARANCE) description = "헐거운 상태 (운동 부품, 슬라이딩, 자유 회전용)";
      else if (fitType === FitType.INTERFERENCE) description = "억지 상태 (고정 부품, 압입 조립, 영구 결합용)";
      else description = "중간 상태 (정밀 위치 결정, 분해 조립이 잦은 고정용)";
    }

    setResult({
      nominal, holeGrade, shaftGrade, holeMax, holeMin, shaftMax, shaftMin,
      holeES: holeDev.upper, holeEI: holeDev.lower, shaftes: shaftDev.upper, shaftei: shaftDev.lower,
      maxClearance, minClearance, maxInterference, minInterference, fitType, description
    });
  };

  const calculateGeneral = () => {
    if (isNaN(genNominal) || genNominal < 0.5 || genNominal > 4000) {
      setGenResult(null);
      return;
    }
    
    let rangeIdx = -1;
    for (let i = 0; i < ISO2768_STEPS.length - 1; i++) {
      if (genNominal > ISO2768_STEPS[i] && genNominal <= ISO2768_STEPS[i+1]) {
        rangeIdx = i;
        break;
      }
    }
    if (genNominal === 0.5) rangeIdx = 0;

    const toleranceVal = rangeIdx !== -1 ? ISO2768_DATA[isoGrade][rangeIdx] : null;
    setGenResult({ valMm: toleranceVal });
  };

  const handleLimitCalculate = () => {
    const hNom = parseFloat(limHoleNom
