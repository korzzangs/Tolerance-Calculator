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
    const hNom = parseFloat(limHoleNominal);
    const hUp = parseFloat(limHoleMax);
    const hLo = parseFloat(limHoleMin);
    const sNom = parseFloat(limShaftNominal);
    const sUp = parseFloat(limShaftMax);
    const sLo = parseFloat(limShaftMin);

    if (isNaN(hNom) || isNaN(hUp) || isNaN(hLo) || isNaN(sNom) || isNaN(sUp) || isNaN(sLo)) {
      alert("모든 기준치수 및 공차값을 입력해주세요.");
      return;
    }

    const hMax = hNom + hUp;
    const hMin = hNom + hLo;
    const sMax = sNom + sUp;
    const sMin = sNom + sLo;

    setLimitResult({
      calcHoleMax: hMax,
      calcHoleMin: hMin,
      calcShaftMax: sMax,
      calcShaftMin: sMin,
      res1: hMax - sMin, // 최대틈새: HOLE 최대 - SHAFT 최소
      res2: hMax - sMax, // 최소틈새: HOLE 최대 - SHAFT 최대
      res3: hMin - sMin, // 최소틈새: HOLE 최소 - SHAFT 최소
      res4: hMin - sMax  // 최대틈새: HOLE 최소 - SHAFT 최대
    });
  };

  const formatValue = (val: number) => val.toFixed(4);
  const formatDeviation = (val: number) => (val >= 0 ? `+${val.toFixed(4)}` : val.toFixed(4));

  const getResultColorClass = (val: number) => {
    return val < 0 ? 'text-rose-600' : 'text-blue-600';
  };

  return (
    <div className="flex justify-center items-center p-2 md:p-4 min-h-screen bg-slate-100 font-sans antialiased text-slate-900">
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Main Calculator */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col h-full">
          <div className="bg-slate-900 px-6 py-4 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                {activeTab === 'fit' ? 'ISO 286 끼워맞춤 계산기' : 'ISO 2768 일반공차 계산기'}
              </h1>
              <p className="text-slate-400 text-base uppercase tracking-widest">Precision Engineering Tool</p>
            </div>
            
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 w-full md:w-auto">
              <button onClick={() => setActiveTab('fit')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'fit' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>끼워맞춤</button>
              <button onClick={() => setActiveTab('general')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'general' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>일반공차</button>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-4 flex-1">
            {activeTab === 'fit' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-base font-bold text-slate-500 uppercase tracking-widest">기준 치수 (mm)</label>
                    <div className="relative">
                      <input type="number" step="0.001" value={nominal} onChange={(e) => setNominal(parseFloat(e.target.value))} className="w-full pl-4 pr-10 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-mono text-xl font-bold" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-base font-black">mm</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-base font-bold text-slate-500 uppercase tracking-widest">Hole 등급</label>
                    <select value={holeGrade} onChange={(e) => setHoleGrade(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-lg text-blue-800 appearance-none">
                      {holeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-base font-bold text-slate-500 uppercase tracking-widest">Shaft 등급</label>
                    <select value={shaftGrade} onChange={(e) => setShaftGrade(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-lg text-orange-800 appearance-none">
                      {shaftOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                <button onClick={calculateFit} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 text-xl">정밀 계산 실행</button>

                {result && (
                  <div className="animate-in fade-in zoom-in-95 duration-300 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-2"><span className="px-3 py-0.5 bg-blue-600 text-white rounded-full text-sm font-black uppercase">Hole</span><span className="text-2xl font-black text-blue-900">{result.holeGrade}</span></div>
                        <div className="space-y-1 border-b border-blue-100 pb-2">
                          <div className="flex justify-between items-baseline"><span className="text-slate-500 font-bold text-lg">최대 치수</span><span className="font-mono font-black text-2xl text-blue-700">{formatValue(result.holeMax)}</span></div>
                          <div className="flex justify-between items-baseline"><span className="text-slate-500 font-bold text-lg">최소 치수</span><span className="font-mono font-black text-2xl text-blue-700">{formatValue(result.holeMin)}</span></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div className="text-center"><p className="text-sm font-bold text-slate-400 uppercase">상한</p><p className="font-mono font-bold text-lg text-blue-600">{formatDeviation(result.holeES)}</p></div>
                          <div className="text-center"><p className="text-sm font-bold text-slate-400 uppercase">하한</p><p className="font-mono font-bold text-lg text-blue-600">{formatDeviation(result.holeEI)}</p></div>
                        </div>
                      </div>
                      <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-2"><span className="px-3 py-0.5 bg-orange-600 text-white rounded-full text-sm font-black uppercase">Shaft</span><span className="text-2xl font-black text-orange-900">{result.shaftGrade}</span></div>
                        <div className="space-y-1 border-b border-orange-100 pb-2">
                          <div className="flex justify-between items-baseline"><span className="text-slate-500 font-bold text-lg">최대 치수</span><span className="font-mono font-black text-2xl text-orange-700">{formatValue(result.shaftMax)}</span></div>
                          <div className="flex justify-between items-baseline"><span className="text-slate-500 font-bold text-lg">최소 치수</span><span className="font-mono font-black text-2xl text-orange-700">{formatValue(result.shaftMin)}</span></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div className="text-center"><p className="text-sm font-bold text-slate-400 uppercase">상한</p><p className="font-mono font-bold text-lg text-orange-600">{formatDeviation(result.shaftes)}</p></div>
                          <div className="text-center"><p className="text-sm font-bold text-slate-400 uppercase">하한</p><p className="font-mono font-bold text-lg text-orange-600">{formatDeviation(result.shaftei)}</p></div>
                        </div>
                      </div>
                    </div>
                    <div className={`p-5 rounded-2xl border-2 text-center shadow-lg transition-all ${result.fitType === FitType.CLEARANCE ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : result.fitType === FitType.INTERFERENCE ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                      <p className="text-base font-black uppercase tracking-widest opacity-50 mb-1">끼워맞춤 종합 판별</p>
                      <p className="text-3xl font-black mb-2">{result.fitType}</p>
                      <p className="text-xl font-bold opacity-80 mb-4 bg-white/40 py-1 px-4 rounded-full inline-block">{result.description}</p>
                      <div className="flex justify-center gap-12 border-t border-current/10 pt-4">
                        {result.fitType === FitType.CLEARANCE && (<><div><p className="text-base font-bold opacity-60 uppercase">최대 틈새</p><p className="font-mono text-2xl font-black">{formatValue(result.maxClearance)}</p></div><div><p className="text-base font-bold opacity-60 uppercase">최소 틈새</p><p className="font-mono text-2xl font-black">{formatValue(result.minClearance)}</p></div></>)}
                        {result.fitType === FitType.INTERFERENCE && (<><div><p className="text-base font-bold opacity-60 uppercase">최대 죔새</p><p className="font-mono text-2xl font-black">{formatValue(result.maxInterference)}</p></div><div><p className="text-base font-bold opacity-60 uppercase">최소 죔새</p><p className="font-mono text-2xl font-black">{formatValue(result.minInterference)}</p></div></>)}
                        {result.fitType === FitType.TRANSITION && (<><div><p className="text-base font-bold opacity-60 uppercase">최대 틈새</p><p className="font-mono text-2xl font-black">{formatValue(result.maxClearance)}</p></div><div><p className="text-base font-bold opacity-60 uppercase">최대 죔새</p><p className="font-mono text-2xl font-black">{formatValue(result.maxInterference)}</p></div></>)}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-3 py-0.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-base font-bold text-slate-500 uppercase tracking-widest">기준 치수 (mm) (0.5 ~ 4000)</label>
                    <div className="relative">
                      <input type="number" step="0.001" min="0.5" max="4000" value={genNominal} onChange={(e) => setGenNominal(parseFloat(e.target.value))} className="w-full pl-5 pr-12 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-mono text-xl font-bold transition-all" />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">mm</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-base font-bold text-slate-500 uppercase tracking-widest">공차 등급 (Tolerance Class)</label>
                    <select value={isoGrade} onChange={(e) => setIsoGrade(e.target.value)} className="w-full px-5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-lg text-blue-700 appearance-none cursor-pointer transition-all">
                      {ISO2768_GRADES.map(grade => <option key={grade.id} value={grade.id}>{grade.label}</option>)}
                    </select>
                  </div>
                </div>

                <button onClick={calculateGeneral} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-3 text-lg">일반공차 산출</button>

                <div className="space-y-2">
                  {genResult ? (
                    <div className="bg-slate-800 rounded-2xl py-3 px-4 text-white shadow-md relative overflow-hidden text-center border-b-4 border-blue-500">
                      <p className="text-sm font-black uppercase tracking-[0.4em] opacity-50 mb-0.5">ISO 2768-1 RESULT</p>
                      <h3 className="text-lg font-black mb-1">{isoGrade} 등급 ({genNominal}mm)</h3>
                      {genResult.valMm !== null ? (
                        <div className="max-w-[200px] mx-auto bg-white/10 backdrop-blur-sm rounded-xl py-2 px-4 border border-white/20">
                          <p className="text-3xl font-black font-mono">±{genResult.valMm.toFixed(2)}</p>
                          <p className="text-sm opacity-40 uppercase">mm</p>
                        </div>
                      ) : (
                        <div className="max-w-[200px] mx-auto bg-rose-500/20 rounded-xl py-2 px-4 border border-rose-500/30"><p className="text-lg font-bold">데이터 없음</p></div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-lg italic">기준 치수와 등급을 입력하세요.</div>
                  )}
                </div>

                {/* ISO 2768-1 Tables */}
                <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Tolerance Table - Optimized Column Widths */}
                  <div className="bg-amber-50/30 border border-amber-100 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-amber-50 px-4 py-2 border-b border-amber-100">
                      <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">ISO 2768-1 기본 크기 범위 허용편차 (mm)</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-center border-collapse table-fixed">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                            <th className="px-2 py-2 border-r border-slate-200 w-16">등급</th>
                            {ISO2768_STEPS.slice(0, -1).map((step, idx) => (
                              <th key={idx} className="px-1 py-2 border-r border-slate-200">
                                {step}~{ISO2768_STEPS[idx+1]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ISO2768_GRADES.map(grade => (
                            <tr key={grade.id} className="hover:bg-white transition-colors">
                              <td className="px-2 py-2 font-black text-slate-700 bg-slate-50 border-r border-slate-200 uppercase">{grade.id}</td>
                              {ISO2768_DATA[grade.id].map((val, idx) => (
                                <td key={idx} className="px-1 py-2 font-mono text-slate-600 border-r border-slate-200">
                                  {val !== null ? `±${val.toFixed(2)}` : '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Description Section */}
                  <div className="bg-blue-50/30 border border-blue-100 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-blue-50 px-4 py-2 border-b border-blue-100">
                      <h3 className="text-sm font-black text-blue-900 uppercase tracking-tight">ISO 2768-1 공차 등급별 설명</h3>
                    </div>
                    <div className="divide-y divide-blue-100 overflow-x-auto">
                      {ISO2768_DESCRIPTIONS.map(item => (
                        <div key={item.id} className="flex items-center hover:bg-white transition-colors min-w-fit">
                          <div className="px-4 py-2.5 font-black text-blue-800 bg-blue-50/50 text-sm border-r border-blue-100 w-32 shrink-0 whitespace-nowrap">{item.id}</div>
                          <div className="px-4 py-2.5 text-sm text-slate-600 flex-1 whitespace-nowrap">{item.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Compact Layout while keeping font sizes */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-full">
          <div className="bg-slate-100 px-5 py-3 border-b border-slate-200">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {activeTab === 'fit' ? '끼워맞춤 권장 가이드' : '한계치수 공차 가이드'}
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            {activeTab === 'fit' ? (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  <tr><th className="px-4 py-2.5">Hole/Shaft</th><th className="px-4 py-2.5">종류</th><th className="px-4 py-2.5">용도 및 설명</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {FIT_GUIDE.map((g, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50 transition-colors cursor-pointer ${holeGrade === g.hole && shaftGrade === g.shaft && activeTab === 'fit' ? 'bg-blue-50' : ''}`} onClick={() => { setActiveTab('fit'); setHoleGrade(g.hole); setShaftGrade(g.shaft); }}>
                      <td className="px-4 py-3.5 font-bold whitespace-nowrap"><span className="text-blue-600">{g.hole}</span> / <span className="text-orange-600">{g.shaft}</span></td>
                      <td className="px-4 py-3.5 font-medium text-slate-600 whitespace-nowrap text-xs">{g.type}</td>
                      <td className="px-4 py-3.5 text-slate-500 leading-tight text-xs line-clamp-2 min-w-[120px]">{g.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 space-y-3 animate-in fade-in slide-in-from-right-4">
                <p className="text-base text-slate-600 font-bold leading-snug">
                  수치를 입력하여 실측 한계치수와 <br/>끼워맞춤 상태를 즉시 확인하십시오.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Hole Inputs - Tighter Padding */}
                  <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-3">
                    <p className="text-xs font-black text-blue-800 uppercase text-center border-b border-blue-200 pb-1">HOLE</p>
                    <div className="space-y-0.5">
                      <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest">기준치수</label>
                      <input type="number" step="0.001" value={limHoleNominal} onChange={(e) => setLimHoleNominal(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded-lg focus:border-blue-500 outline-none font-mono text-base font-bold" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest">상한공차</label>
                      <input type="number" step="0.001" placeholder="+0.000" value={limHoleMax} onChange={(e) => setLimHoleMax(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded-lg focus:border-blue-500 outline-none font-mono text-base font-bold" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest">하한공차</label>
                      <input type="number" step="0.001" placeholder="0.000" value={limHoleMin} onChange={(e) => setLimHoleMin(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded-lg focus:border-blue-500 outline-none font-mono text-base font-bold" />
                    </div>
                  </div>
                  
                  {/* Shaft Inputs - Tighter Padding */}
                  <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 space-y-3">
                    <p className="text-xs font-black text-orange-800 uppercase text-center border-b border-orange-200 pb-1">SHAFT</p>
                    <div className="space-y-0.5">
                      <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest">기준치수</label>
                      <input type="number" step="0.001" value={limShaftNominal} onChange={(e) => setLimShaftNominal(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-orange-200 rounded-lg focus:border-orange-500 outline-none font-mono text-base font-bold" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest">상한공차</label>
                      <input type="number" step="0.001" placeholder="0.000" value={limShaftMax} onChange={(e) => setLimShaftMax(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-orange-200 rounded-lg focus:border-orange-500 outline-none font-mono text-base font-bold" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest">하한공차</label>
                      <input type="number" step="0.001" placeholder="0.000" value={limShaftMin} onChange={(e) => setLimShaftMin(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-orange-200 rounded-lg focus:border-orange-500 outline-none font-mono text-base font-bold" />
                    </div>
                  </div>
                </div>

                <button onClick={handleLimitCalculate} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md active:scale-[0.98] text-lg">가이드 계산 실행</button>
                
                {limitResult && (
                  <div className="space-y-3 animate-in fade-in zoom-in-95">
                    {/* Step 1: Actual Limits - Compacted */}
                    <div className="bg-slate-800 rounded-xl p-3.5 text-white">
                      <p className="text-[10px] font-black text-slate-400 uppercase text-center border-b border-slate-700 pb-1.5 mb-2.5">실측 한계치수 (Max / Min)</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 border-r border-slate-700 pr-2">
                          <p className="text-xs font-bold text-blue-400">HOLE</p>
                          <div className="flex justify-between text-sm font-mono"><span className="opacity-50">최대:</span><span>{limitResult.calcHoleMax.toFixed(4)}</span></div>
                          <div className="flex justify-between text-sm font-mono"><span className="opacity-50">최소:</span><span>{limitResult.calcHoleMin.toFixed(4)}</span></div>
                        </div>
                        <div className="space-y-1 pl-2">
                          <p className="text-xs font-bold text-orange-400">SHAFT</p>
                          <div className="flex justify-between text-sm font-mono"><span className="opacity-50">최대:</span><span>{limitResult.calcShaftMax.toFixed(4)}</span></div>
                          <div className="flex justify-between text-sm font-mono"><span className="opacity-50">최소:</span><span>{limitResult.calcShaftMin.toFixed(4)}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Custom Formulas Results - Compacted Grid */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase text-center border-b border-slate-200 pb-1.5">분석 결과</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">최대틈새</p>
                          <p className="text-[9px] text-slate-400 leading-none">H최대-S최소</p>
                          <p className={`font-mono text-xl font-black mt-0.5 ${getResultColorClass(limitResult.res1)}`}>{limitResult.res1.toFixed(4)}</p>
                        </div>
                        <div className="text-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">최소틈새</p>
                          <p className="text-[9px] text-slate-400 leading-none">H최대-S최대</p>
                          <p className={`font-mono text-xl font-black mt-0.5 ${getResultColorClass(limitResult.res2)}`}>{limitResult.res2.toFixed(4)}</p>
                        </div>
                        <div className="text-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">최소틈새</p>
                          <p className="text-[9px] text-slate-400 leading-none">H최소-S최소</p>
                          <p className={`font-mono text-xl font-black mt-0.5 ${getResultColorClass(limitResult.res3)}`}>{limitResult.res3.toFixed(4)}</p>
                        </div>
                        <div className="text-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">최대틈새</p>
                          <p className="text-[9px] text-slate-400 leading-none">H최소-S최대</p>
                          <p className={`font-mono text-xl font-black mt-0.5 ${getResultColorClass(limitResult.res4)}`}>{limitResult.res4.toFixed(4)}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-rose-500 font-bold text-center">※ 마이너스 값(-)은 간섭을 의미</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-400 font-bold text-center leading-tight italic">※ 가이드 외 등급은 설계 원칙에 따라 분석됨</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
