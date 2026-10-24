import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sounds } from '../utils/soundEffects';
import { RotateCcw, Flag } from 'lucide-react';
import { RaceStats } from '../types';
import { AnalogSpeedometer } from './AnalogSpeedometer';

interface WordsTypingArenaProps {
  wordsList: string[]; // 5000 ta tasodifiy inglizcha so'zlar
  onProgressUpdate: (progress: number, wpm: number, accuracy: number, chars: number, errors: number, currentMeters: number) => void;
  onFinish: (stats: RaceStats) => void;
  isGameActive: boolean;
  countdownActive?: boolean;
  selectedDistance?: number;
  onDistanceChange?: (meters: number) => void;
  onRestart?: () => void;
}

interface WordHistoryItem {
  input: string;
  isCorrect: boolean;
}

// Masofa bo'yicha talab qilinadigan to'g'ri belgilar soni
export const DISTANCE_TARGETS: Record<number, number> = {
  100: 100,  // ~20 so'z
  500: 450,  // ~80 so'z
  1000: 850  // ~160 so'z
};

export const WordsTypingArena: React.FC<WordsTypingArenaProps> = ({
  wordsList,
  onProgressUpdate,
  onFinish,
  isGameActive,
  countdownActive = false,
  selectedDistance: externalDistance,
  onDistanceChange,
  onRestart
}) => {
  const [distance, setDistance] = useState<number>(externalDistance || 100);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(true);

  // Statistika
  const [totalCorrectChars, setTotalCorrectChars] = useState<number>(0);
  const [totalIncorrectChars, setTotalIncorrectChars] = useState<number>(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState<number>(0);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);
  const [wordHistory, setWordHistory] = useState<Record<number, WordHistoryItem>>({});

  // Single-line gorizontal siljish (x-axis transform)
  const [scrollX, setScrollX] = useState<number>(0);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const wordsRowRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Tashqi masofa o'zgarganda yangilash
  useEffect(() => {
    if (externalDistance && externalDistance !== distance) {
      setDistance(externalDistance);
    }
  }, [externalDistance, distance]);

  const targetChars = DISTANCE_TARGETS[distance] || 100;

  const countdownActiveRef = useRef(countdownActive);
  countdownActiveRef.current = countdownActive;

  // Qayta boshlash (Faqat ichki holatni tozalaydi)
  const handleReset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCurrentWordIndex(0);
    setCurrentInput('');
    setStartTime(null);
    setElapsedTime(0);
    setIsFinished(false);
    setTotalCorrectChars(0);
    setTotalIncorrectChars(0);
    setTotalKeystrokes(0);
    setWpmHistory([]);
    setWordHistory({});
    setScrollX(0);

    setTimeout(() => {
      if (!countdownActiveRef.current) {
        inputRef.current?.focus();
      }
    }, 50);
  }, []);

  useEffect(() => {
    handleReset();
  }, [wordsList, handleReset]);

  // Foydalanuvchi qo'lda tugma bosganda qayta boshlash
  const handleManualRestart = useCallback(() => {
    handleReset();
    if (onRestart) {
      onRestart();
    }
  }, [handleReset, onRestart]);

  // Masofa o'zgarganda qayta boshlash
  const handleSelectDistance = (newDist: number) => {
    setDistance(newDist);
    if (onDistanceChange) {
      onDistanceChange(newDist);
    }
    handleReset();
  };

  // Sinovni yakunlash (Masofani bosib o'tganda)
  const finishSession = useCallback((finalDuration: number, finalCorrectChars: number) => {
    setIsFinished(true);
    sounds.playFinish();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const duration = Math.max(0.5, finalDuration);
    const minutes = duration / 60;
    const totalChars = finalCorrectChars + totalIncorrectChars;

    const finalWpm = totalChars > 0 ? Math.max(0, Math.round((finalCorrectChars / 5) / minutes)) : 0;
    const finalRawWpm = totalChars > 0 ? Math.round((totalChars / 5) / minutes) : 0;
    const accuracy = totalChars > 0 ? Math.round((finalCorrectChars / totalChars) * 100) : 0;
    const consistency = totalChars > 0 ? Math.max(60, Math.min(100, Math.round(100 - (totalIncorrectChars * 3)))) : 0;
    const efficiency = totalChars > 0 ? Math.round((finalWpm * 0.7) + (accuracy * 0.3)) : 0;

    const finalStats: RaceStats = {
      wpm: finalWpm,
      rawWpm: finalRawWpm,
      accuracy,
      efficiency,
      correctChars: finalCorrectChars,
      incorrectChars: totalIncorrectChars,
      totalChars,
      timeSeconds: Number(duration.toFixed(1)),
      distanceMeters: distance,
      wpmHistory: wpmHistory.length > 0 ? wpmHistory : [finalWpm],
      consistency,
      keystrokes: totalKeystrokes,
      errorsByChar: {},
      userRank: 1,
      totalRacers: 1
    };

    onProgressUpdateRef.current(100, finalWpm, accuracy, totalChars, totalIncorrectChars, distance);
    onFinishRef.current(finalStats);
  }, [totalIncorrectChars, distance, wpmHistory, totalKeystrokes]);

  // Taymer hisobi: Sekundomer 0:00.0 dan yuqoriga qarab sanaydi
  useEffect(() => {
    if (startTime && !isFinished && isGameActive && !countdownActive) {
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const seconds = (now - startTime) / 1000;
        setElapsedTime(seconds);

        const minutes = Math.max(0.01, seconds / 60);
        const liveWpm = Math.round((totalCorrectChars / 5) / minutes);
        setWpmHistory((prev) => [...prev, liveWpm].slice(-30));
      }, 100);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startTime, isFinished, isGameActive, countdownActive, totalCorrectChars]);

  // Single-line Gorizontal silliq siljish (Aktiv so'zni ~120px chapdan ushlab turadi)
  useEffect(() => {
    const activeEl = wordRefs.current[currentWordIndex];
    if (activeEl) {
      const activeLeft = activeEl.offsetLeft;
      // 130px masofa chapdan qoldiriladi, qolgan so'zlar o'ngdan kirib keladi
      const newScrollX = Math.max(0, activeLeft - 130);
      setScrollX(newScrollX);
    }
  }, [currentWordIndex]);

  // Harf kiritilganda
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFinished || !isGameActive || countdownActive) return;
    const val = e.target.value;

    if (val.endsWith(' ')) return;

    if (!startTime && val.length > 0) {
      setStartTime(Date.now());
    }

    setCurrentInput(val);

    const currentWord = wordsList[currentWordIndex] || '';
    let correctInCurrent = 0;
    for (let i = 0; i < Math.min(val.length, currentWord.length); i++) {
      if (val[i] === currentWord[i]) {
        correctInCurrent++;
      }
    }

    const effectiveCorrect = totalCorrectChars + correctInCurrent;
    const progressPercent = Math.min(100, Math.max(0, (effectiveCorrect / targetChars) * 100));
    const currentMeters = Math.min(distance, Math.round((progressPercent / 100) * distance));

    const now = Date.now();
    const seconds = startTime ? Math.max(0.1, (now - startTime) / 1000) : 0.1;
    const minutes = seconds / 60;
    const liveWpm = Math.max(0, Math.round((effectiveCorrect / 5) / minutes));
    const totalChars = effectiveCorrect + totalIncorrectChars;
    const liveAccuracy = totalChars > 0 ? Math.round((effectiveCorrect / totalChars) * 100) : 100;

    onProgressUpdateRef.current(
      progressPercent,
      liveWpm,
      liveAccuracy,
      totalChars,
      totalIncorrectChars,
      currentMeters
    );

    // Agar belgilangan masofa to'liq bosib o'tilsa (progress 100%)
    if (effectiveCorrect >= targetChars) {
      finishSession(seconds, effectiveCorrect);
    }
  };

  // Klaviatura hodisalari
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isFinished || !isGameActive || countdownActive) return;

    if (!startTime) {
      setStartTime(Date.now());
    }

    // Backspace: oldingi so'zga qaytish yoki harf o'chirish
    if (e.key === 'Backspace') {
      if (currentInput.length === 0 && currentWordIndex > 0) {
        e.preventDefault();
        const prevIdx = currentWordIndex - 1;
        const prevHistory = wordHistory[prevIdx];
        if (prevHistory) {
          sounds.playKey('Backspace', false, false);
          setCurrentWordIndex(prevIdx);
          setCurrentInput(prevHistory.input);
          setWordHistory((prev) => {
            const next = { ...prev };
            delete next[prevIdx];
            return next;
          });
        }
        return;
      }
      sounds.playKey('Backspace', false, false);
      return;
    }

    // Probel bosilganda keyingi so'zga o'tish
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      const currentWord = wordsList[currentWordIndex] || '';
      if (!currentInput) return;

      const isMatch = currentInput === currentWord;
      let wordCorrect = 0;
      let wordErrors = 0;

      for (let i = 0; i < currentWord.length; i++) {
        if (currentInput[i] === currentWord[i]) {
          wordCorrect++;
        } else {
          wordErrors++;
        }
      }
      if (currentInput.length > currentWord.length) {
        wordErrors += (currentInput.length - currentWord.length);
      }

      const nextCorrect = totalCorrectChars + wordCorrect + (isMatch ? 1 : 0);
      const nextIncorrect = totalIncorrectChars + wordErrors;

      setTotalCorrectChars(nextCorrect);
      setTotalIncorrectChars(nextIncorrect);
      setTotalKeystrokes((prev) => prev + currentInput.length + 1);

      setWordHistory((prev) => ({
        ...prev,
        [currentWordIndex]: {
          input: currentInput,
          isCorrect: isMatch
        }
      }));

      sounds.playKey(' ', true, !isMatch);
      const nextWordIdx = currentWordIndex + 1;
      setCurrentWordIndex(nextWordIdx);
      setCurrentInput('');

      const progressPercent = Math.min(100, Math.max(0, (nextCorrect / targetChars) * 100));
      const currentMeters = Math.min(distance, Math.round((progressPercent / 100) * distance));

      const now = Date.now();
      const seconds = startTime ? Math.max(0.1, (now - startTime) / 1000) : 0.1;
      const minutes = seconds / 60;
      const liveWpm = Math.max(0, Math.round((nextCorrect / 5) / minutes));
      const totalChars = nextCorrect + nextIncorrect;
      const liveAccuracy = totalChars > 0 ? Math.round((nextCorrect / totalChars) * 100) : 100;

      onProgressUpdateRef.current(
        progressPercent,
        liveWpm,
        liveAccuracy,
        totalChars,
        nextIncorrect,
        currentMeters
      );

      // Agar marraga yetib kelsa
      if (nextCorrect >= targetChars) {
        finishSession(seconds, nextCorrect);
      }
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setTotalKeystrokes((prev) => prev + 1);
      const targetChar = (wordsList[currentWordIndex] || '')[currentInput.length];
      const isError = e.key !== targetChar;
      sounds.playKey(e.key, false, isError);
    }
  };

  // Tab bilan qayta boshlash
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        handleReset();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleReset]);

  // Jonli hisob-kitoblar
  const minutes = Math.max(0.01, elapsedTime / 60);
  const liveWpm = startTime && totalCorrectChars > 0 ? Math.round((totalCorrectChars / 5) / minutes) : 0;
  const currentProgressPercent = Math.min(100, Math.max(0, (totalCorrectChars / targetChars) * 100));
  const currentMeters = Math.min(distance, Math.round((currentProgressPercent / 100) * distance));

  // Rasmdagi format: 0:01.9 (sekundomer ko'rinishida)
  const formatArcadeTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds * 10) % 10);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}.${tenths}`;
  };

  const displayWords = wordsList.slice(0, 200);

  return (
    <div className="w-full flex flex-col gap-1.5 shrink-0">
      {/* 1. TOP ARCADE HUD: WPM, MASOFA TANLASH (100m, 500m, 1000m), VA SEKUNDOMER */}
      <div className="flex items-center justify-between px-1">
        {/* Chapdagi WPM nishoni */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#111827]/90 border border-slate-700/80 rounded-xl shadow-lg backdrop-blur-xs">
          <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
            {liveWpm}
          </span>
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 font-mono tracking-wider">
            WPM
          </span>
        </div>

        {/* O'rtada Masofa tanlash tugmalari: 100m, 500m, 1000m */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 bg-slate-950/90 border border-slate-800 rounded-lg shadow-inner">
            {[100, 500, 1000].map((dist) => (
              <button
                key={dist}
                disabled={countdownActive || (startTime !== null && !isFinished)}
                onClick={() => handleSelectDistance(dist)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  distance === dist
                    ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {dist}m
              </button>
            ))}
            <button
              onClick={handleManualRestart}
              className="p-1 text-slate-400 hover:text-white ml-0.5 cursor-pointer"
              title="Qayta boshlash (Tab)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Jonli masofa ko'rsatkichi */}
          <div className="hidden xs:flex items-center gap-1 px-2.5 py-0.5 bg-[#0e1726] border border-cyan-500/40 rounded-lg text-[11px] font-mono font-bold text-cyan-300">
            <Flag className="w-3 h-3 text-cyan-400" />
            <span>{currentMeters}m</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{distance}m</span>
          </div>
        </div>

        {/* O'ngdagi vaqt nishoni (Rasmdagi 0:01.9 kabi arcade sekundomer) */}
        <div className="px-3 py-1 bg-[#111827]/90 border border-slate-700/80 rounded-xl shadow-lg backdrop-blur-xs">
          <span className="text-lg sm:text-xl font-black text-white font-mono tracking-wider">
            {formatArcadeTime(elapsedTime)}
          </span>
        </div>
      </div>

      {/* 2. PASTKI QISM: SPIDOMETR VA BIR QATORLIK YOZISH KONSOLI */}
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full">
        {/* Chapdagi Analog Spidometr */}
        <div className="shrink-0 flex items-center justify-center">
          <AnalogSpeedometer wpm={liveWpm} size={84} />
        </div>

        {/* O'ngdagi BIR QATORLIK monoxrom yozish maydoni (Foydalanuvchi talabi: faqat 1 qator bo'lsin) */}
        <div
          ref={wordsContainerRef}
          onClick={() => {
            if (!countdownActive) {
              inputRef.current?.focus();
            }
          }}
          className="relative flex-1 w-full h-14 sm:h-16 px-4 bg-[#141b27]/95 border-2 border-slate-700/80 focus-within:border-emerald-400 rounded-2xl shadow-xl transition-all cursor-text select-none overflow-hidden flex items-center"
        >
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={countdownActive || isFinished}
            className="absolute inset-0 opacity-0 cursor-default"
            autoFocus={!countdownActive}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="So'zlarni kiritish maydoni"
          />

          {/* Fokus yo'qolganda ko'rsatma */}
          {!isFocused && !isFinished && !countdownActive && (
            <div
              onClick={() => inputRef.current?.focus()}
              className="absolute inset-0 bg-[#0c121d]/85 backdrop-blur-[2px] flex items-center justify-center cursor-pointer z-30"
            >
              <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-950/90 border border-emerald-500/60 px-3 py-1 rounded-lg animate-pulse">
                🎮 Yozish uchun bosing
              </span>
            </div>
          )}

          {/* Countdown vaqtida ko'rsatma */}
          {countdownActive && (
            <div className="absolute inset-0 bg-[#0c121d]/90 backdrop-blur-xs flex items-center justify-center z-30 pointer-events-none">
              <span className="text-xs font-mono font-bold text-amber-400 animate-pulse tracking-wide">
                🚦 POYGA BOSHLANISHI KUTILMOQDA... (3-2-1)
              </span>
            </div>
          )}

          {/* SO'ZLAR GORIZONTAL STRIP (Faqat bitta qator, silliq chapga siljiydi) */}
          <div
            ref={wordsRowRef}
            style={{ transform: `translateX(-${scrollX}px)` }}
            className="transition-transform duration-150 ease-out whitespace-nowrap flex items-center text-xl sm:text-2xl font-mono leading-none tracking-normal"
          >
            {displayWords.map((word, actualIndex) => {
              const isCurrent = actualIndex === currentWordIndex;
              const isPast = actualIndex < currentWordIndex;
              const pastHistory = wordHistory[actualIndex];

              if (isCurrent) {
                return (
                  <span
                    key={actualIndex}
                    ref={(el) => { wordRefs.current[actualIndex] = el; }}
                    className="relative inline-flex items-center mr-3 select-none py-1"
                  >
                    {word.split('').map((char, cIdx) => {
                      const isTyped = cIdx < currentInput.length;
                      const typedChar = currentInput[cIdx];
                      const isCurrentChar = cIdx === currentInput.length;
                      const isCorrect = isTyped && typedChar === char;

                      return (
                        <span key={cIdx} className="relative inline-block leading-none">
                          {/* Aktiv harf ustida chaqnagan kursor */}
                          {isCurrentChar && (
                            <span className="absolute -left-[1.5px] top-0 bottom-0 w-[2.5px] bg-cyan-400 rounded-full shadow-[0_0_8px_#38bdf8] animate-pulse z-10" />
                          )}
                          <span
                            className={`transition-colors duration-75 ${
                              isTyped
                                ? isCorrect
                                ? 'text-white font-medium'
                                : 'text-rose-500 font-bold'
                                : isCurrentChar
                                ? 'text-slate-100 font-medium'
                                : 'text-slate-400'
                            }`}
                          >
                            {char}
                          </span>
                        </span>
                      );
                    })}

                    {currentInput.length >= word.length && (
                      <span className="relative inline-block w-0 leading-none">
                        <span className="absolute -left-[1.5px] top-0 bottom-0 w-[2.5px] bg-cyan-400 rounded-full shadow-[0_0_8px_#38bdf8] animate-pulse z-10" />
                      </span>
                    )}

                    {currentInput.length > word.length && (
                      currentInput.slice(word.length).split('').map((extraChar, eIdx) => (
                        <span key={`extra-${eIdx}`} className="text-rose-500 underline opacity-90 font-mono">
                          {extraChar}
                        </span>
                      ))
                    )}
                  </span>
                );
              }

              if (isPast) {
                const pastInput = pastHistory?.input || '';
                const pastMatched = pastHistory?.isCorrect ?? true;

                return (
                  <span
                    key={actualIndex}
                    ref={(el) => { wordRefs.current[actualIndex] = el; }}
                    className={`relative inline-flex items-center mr-3 select-none py-1 ${
                      !pastMatched ? 'border-b border-rose-500/60' : ''
                    }`}
                  >
                    {word.split('').map((char, cIdx) => {
                      const typedChar = pastInput[cIdx];
                      const isCorrect = typedChar === char;
                      return (
                        <span
                          key={cIdx}
                          className={
                            typedChar !== undefined
                              ? isCorrect
                                ? 'text-slate-300'
                                : 'text-rose-400 font-medium'
                              : 'text-rose-400/60'
                          }
                        >
                          {char}
                        </span>
                      );
                    })}
                  </span>
                );
              }

              return (
                <span
                  key={actualIndex}
                  ref={(el) => { wordRefs.current[actualIndex] = el; }}
                  className="relative inline-flex items-center mr-3 select-none py-1 text-slate-500"
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
