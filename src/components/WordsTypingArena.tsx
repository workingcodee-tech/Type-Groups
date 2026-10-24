import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sounds } from '../utils/soundEffects';
import { RotateCcw, Zap, Target, Clock, Hash, Timer } from 'lucide-react';
import { RaceStats } from '../types';

interface WordsTypingArenaProps {
  wordsList: string[]; // 5000 ta tasodifiy inglizcha so'zlar
  onProgressUpdate: (progress: number, wpm: number, accuracy: number, chars: number, errors: number) => void;
  onFinish: (stats: RaceStats) => void;
  isGameActive: boolean;
  onRestart?: () => void;
}

interface WordHistoryItem {
  input: string;
  isCorrect: boolean;
}

export const WordsTypingArena: React.FC<WordsTypingArenaProps> = ({
  wordsList,
  onProgressUpdate,
  onFinish,
  isGameActive,
  onRestart
}) => {
  // Tanlangan vaqt (15s, 30s, 60s)
  const [timeLimit, setTimeLimit] = useState<number>(30);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(true);

  // Statistika (Monkeytype uslubida)
  const [totalCorrectChars, setTotalCorrectChars] = useState<number>(0);
  const [totalIncorrectChars, setTotalIncorrectChars] = useState<number>(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState<number>(0);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);

  // Har bir oldingi so'zning kiritilgan varianti va to'g'ri/noto'g'riligi
  const [wordHistory, setWordHistory] = useState<Record<number, WordHistoryItem>>({});

  // Monkeytype multi-line smooth scrolling
  const [lineOffset, setLineOffset] = useState<number>(0);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const wordsWrapperRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);

  // Barqaror ref lar
  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Qayta boshlash
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
    setLineOffset(0);
    onProgressUpdateRef.current(0, 0, 100, 0, 0);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, []);

  useEffect(() => {
    handleReset();
  }, [wordsList, handleReset]);

  // Sinovni yakunlash
  const finishSession = useCallback((finalDuration: number) => {
    setIsFinished(true);
    sounds.playFinish();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const duration = Math.max(1, finalDuration);
    const minutes = duration / 60;
    const totalChars = totalCorrectChars + totalIncorrectChars;

    const finalWpm = totalChars > 0 ? Math.max(0, Math.round((totalCorrectChars / 5) / minutes)) : 0;
    const finalRawWpm = totalChars > 0 ? Math.round((totalChars / 5) / minutes) : 0;
    const accuracy = totalChars > 0 ? Math.round((totalCorrectChars / totalChars) * 100) : 0;
    const consistency = totalChars > 0 ? Math.max(60, Math.min(100, Math.round(100 - (totalIncorrectChars * 3)))) : 0;
    const efficiency = totalChars > 0 ? Math.round((finalWpm * 0.7) + (accuracy * 0.3)) : 0;

    const targetChars = (timeLimit === 15 ? 20 : timeLimit === 30 ? 40 : 75) * 5;
    const finalProgress = totalChars > 0 ? Math.min(100, Math.max(0, (totalCorrectChars / targetChars) * 100)) : 0;

    const finalStats: RaceStats = {
      wpm: finalWpm,
      rawWpm: finalRawWpm,
      accuracy,
      efficiency,
      correctChars: totalCorrectChars,
      incorrectChars: totalIncorrectChars,
      totalChars,
      timeSeconds: duration,
      timeLimitSeconds: timeLimit,
      wpmHistory: wpmHistory.length > 0 ? wpmHistory : [finalWpm],
      consistency,
      keystrokes: totalKeystrokes,
      errorsByChar: {},
      userRank: 1,
      totalRacers: 1
    };

    onProgressUpdateRef.current(finalProgress, finalWpm, accuracy, totalChars, totalIncorrectChars);
    onFinishRef.current(finalStats);
  }, [totalCorrectChars, totalIncorrectChars, timeLimit, wpmHistory, totalKeystrokes]);

  // Taymer hisobi
  useEffect(() => {
    if (startTime && !isFinished && isGameActive) {
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const seconds = (now - startTime) / 1000;
        setElapsedTime(seconds);

        if (seconds >= timeLimit) {
          finishSession(timeLimit);
          return;
        }

        const minutes = Math.max(0.01, seconds / 60);
        const liveWpm = Math.round((totalCorrectChars / 5) / minutes);
        setWpmHistory((prev) => [...prev, liveWpm].slice(-30));
      }, 200);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startTime, isFinished, isGameActive, timeLimit, totalCorrectChars, finishSession]);

  // Monkeytype multi-line scroll: joriy so'z har doim ko'rinib turishi uchun
  useEffect(() => {
    const activeEl = wordRefs.current[currentWordIndex];
    const containerEl = wordsContainerRef.current;
    if (activeEl && containerEl) {
      const activeTop = activeEl.offsetTop;
      // Agar joriy so'z 2-qator yoki undan pastda bo'lsa (taxminan 38px dan baland), silliq yuqoriga suramiz
      if (activeTop > 40) {
        setLineOffset(activeTop - 6);
      } else {
        setLineOffset(0);
      }
    }
  }, [currentWordIndex]);

  // Foydalanuvchi klaviaturada harf yozganda (harf darajasida fokus)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFinished || !isGameActive) return;
    const val = e.target.value;

    // Space belgisi bu yerda emas, handleKeyDown da boshqariladi
    if (val.endsWith(' ')) {
      return;
    }

    if (!startTime && val.length > 0) {
      setStartTime(Date.now());
    }

    setCurrentInput(val);

    // Joriy so'zdagi to'g'ri harflarni hisoblash
    const currentWord = wordsList[currentWordIndex] || '';
    let correctInCurrent = 0;
    for (let i = 0; i < Math.min(val.length, currentWord.length); i++) {
      if (val[i] === currentWord[i]) {
        correctInCurrent++;
      }
    }

    const effectiveCorrect = totalCorrectChars + correctInCurrent;
    const targetChars = (timeLimit === 15 ? 20 : timeLimit === 30 ? 40 : 75) * 5;
    const newProgress = Math.min(100, Math.max(0, (effectiveCorrect / targetChars) * 100));

    const now = Date.now();
    const seconds = startTime ? Math.max(0.1, (now - startTime) / 1000) : 0.1;
    const minutes = seconds / 60;
    const liveWpm = Math.max(0, Math.round((effectiveCorrect / 5) / minutes));
    const totalChars = effectiveCorrect + totalIncorrectChars;
    const liveAccuracy = totalChars > 0 ? Math.round((effectiveCorrect / totalChars) * 100) : 100;

    onProgressUpdateRef.current(
      newProgress,
      liveWpm,
      liveAccuracy,
      totalChars,
      totalIncorrectChars
    );
  };

  // Klaviatura tugmalari: Probel, Backspace va Harflar
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isFinished || !isGameActive) return;

    if (!startTime) {
      setStartTime(Date.now());
    }

    // 1. Monkeytype Backspace: agar so'z bo'sh bo'lsa va oldingi so'zga qaytish kerak bo'lsa
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

    // 2. Probel bosilganda keyingi so'zga o'tish (Monkeytype Space)
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      const currentWord = wordsList[currentWordIndex] || '';
      if (!currentInput) return; // Bo'sh bo'lsa o'tmaydi

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

      const targetChars = (timeLimit === 15 ? 20 : timeLimit === 30 ? 40 : 75) * 5;
      const newProgress = Math.min(100, Math.max(0, (nextCorrect / targetChars) * 100));
      const now = Date.now();
      const seconds = startTime ? Math.max(0.1, (now - startTime) / 1000) : 0.1;
      const minutes = seconds / 60;
      const liveWpm = Math.max(0, Math.round((nextCorrect / 5) / minutes));
      const totalChars = nextCorrect + nextIncorrect;
      const liveAccuracy = totalChars > 0 ? Math.round((nextCorrect / totalChars) * 100) : 100;

      onProgressUpdateRef.current(
        newProgress,
        liveWpm,
        liveAccuracy,
        totalChars,
        nextIncorrect
      );
      return;
    }

    // 3. Harf ovozi va hisob
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setTotalKeystrokes((prev) => prev + 1);
      const targetChar = (wordsList[currentWordIndex] || '')[currentInput.length];
      const isError = e.key !== targetChar;
      sounds.playKey(e.key, false, isError);
    }
  };

  // Tab tugmasi bilan qayta boshlash
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

  // Monkeytype render: 200 ta so'zdan iborat oqim
  const displayWords = wordsList.slice(0, 220);

  const remainingSeconds = Math.max(0, timeLimit - elapsedTime);
  const minutes = Math.max(0.01, elapsedTime / 60);
  const liveWpm = startTime && totalCorrectChars > 0 ? Math.round((totalCorrectChars / 5) / minutes) : 0;
  const totalChars = totalCorrectChars + totalIncorrectChars;
  const liveAccuracy = totalChars > 0 ? Math.round((totalCorrectChars / totalChars) * 100) : 100;

  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Vaqt va Jonli Metrikalar Tasmasi */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:p-2.5 bg-[#0a0f1d] border border-slate-800 rounded-xl text-xs">
        {/* Belgilangan Soniya tanlagichi */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
          <span className="text-slate-400 px-1.5 flex items-center gap-1 text-[11px] font-medium">
            <Timer className="w-3.5 h-3.5 text-cyan-400" />
            <span>Soniya:</span>
          </span>
          {[15, 30, 60].map((sec) => (
            <button
              key={sec}
              onClick={() => {
                setTimeLimit(sec);
                handleReset();
              }}
              className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                timeLimit === sec
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>

        {/* Jonli ko'rsatkichlar */}
        <div className="flex items-center gap-3 sm:gap-4 font-mono-numbers">
          <div className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 hidden sm:inline text-[11px]">Tezlik:</span>
            <span className="text-sm font-bold text-cyan-300">{liveWpm} WPM</span>
          </div>

          <div className="flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400 hidden sm:inline text-[11px]">Aniqlik:</span>
            <span className="text-sm font-bold text-white">{liveAccuracy}%</span>
          </div>

          <div className="flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 hidden sm:inline text-[11px]">Belgilar:</span>
            <span className="text-xs font-semibold text-slate-200">
              {totalChars} <span className="text-rose-400">({totalIncorrectChars} xato)</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 hidden sm:inline text-[11px]">Qoldi:</span>
            <span className={`text-sm font-bold ${
              remainingSeconds <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'
            }`}>
              {remainingSeconds.toFixed(1)}s
            </span>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs cursor-pointer"
          title="Qayta boshlash (Tab)"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Qayta</span>
        </button>
      </div>

      {/* MONKEYTYPE USLUBIDAGI YOZISH MAYDONI:
          - So'zning orqa foni o'zgarmaydi!
          - Fokus to'g'ridan-to'g'ri harf ustida turadi!
          - Caret har bir harf bo'ylab silliq harakatlanadi!
      */}
      <div
        ref={wordsContainerRef}
        onClick={() => inputRef.current?.focus()}
        className="relative h-28 sm:h-32 p-3 sm:p-4 bg-[#090e1c] border-2 border-slate-800/80 focus-within:border-cyan-500/60 rounded-2xl shadow-lg transition-all duration-200 cursor-text select-none overflow-hidden flex flex-col justify-start"
      >
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="absolute inset-0 opacity-0 cursor-default"
          autoFocus
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Inglizcha so'zlarni kiritish maydoni"
        />

        {/* Fokus yo'qolganda Monkeytype kabi ko'rsatma */}
        {!isFocused && !isFinished && (
          <div
            onClick={() => inputRef.current?.focus()}
            className="absolute inset-0 bg-[#090e1c]/80 backdrop-blur-[2px] flex items-center justify-center cursor-pointer z-30"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 text-xs font-mono shadow-xl animate-pulse">
              <span>👆 Yozishni boshlash uchun shu yerga bosing</span>
            </div>
          </div>
        )}

        {/* So'zlar oqimi (Monkeytype kabi orqa fonsiz, faqat harflar bo'yicha rang va Caret) */}
        <div
          ref={wordsWrapperRef}
          style={{ transform: `translateY(-${lineOffset}px)` }}
          className="transition-transform duration-200 ease-out flex flex-wrap text-lg sm:text-xl font-mono leading-relaxed tracking-normal"
        >
          {displayWords.map((word, actualIndex) => {
            const isCurrent = actualIndex === currentWordIndex;
            const isPast = actualIndex < currentWordIndex;
            const pastHistory = wordHistory[actualIndex];

            // 1. Joriy yozilayotgan so'z (Orqa foni MUTLAQO o'zgarmaydi, Caret harfma-harf yuradi)
            if (isCurrent) {
              return (
                <span
                  key={actualIndex}
                  ref={(el) => { wordRefs.current[actualIndex] = el; }}
                  className="relative inline-flex items-center mr-3 mb-2 select-none"
                >
                  {word.split('').map((char, cIdx) => {
                    const isTyped = cIdx < currentInput.length;
                    const typedChar = currentInput[cIdx];
                    const isCurrentChar = cIdx === currentInput.length;
                    const isCorrect = isTyped && typedChar === char;

                    return (
                      <span key={cIdx} className="relative inline-block leading-none">
                        {/* MONKEYTYPE CARET: Aynan yozilayotgan harfning oldida turadi */}
                        {isCurrentChar && (
                          <span className="absolute -left-[1.5px] top-[10%] bottom-[10%] w-[2.5px] bg-cyan-400 rounded-full shadow-[0_0_8px_#00E5FF] animate-pulse z-10" />
                        )}
                        <span
                          className={`transition-colors duration-75 ${
                            isTyped
                              ? isCorrect
                                ? 'text-slate-100 font-medium'
                                : 'text-rose-500 font-semibold'
                              : isCurrentChar
                              ? 'text-slate-200'
                              : 'text-slate-500'
                          }`}
                        >
                          {char}
                        </span>
                      </span>
                    );
                  })}

                  {/* Agar butun so'z yozilib, Space kutilayotgan bo'lsa, Caret so'z oxirida kutadi */}
                  {currentInput.length >= word.length && (
                    <span className="relative inline-block w-0 leading-none">
                      <span className="absolute -left-[1.5px] top-[10%] bottom-[10%] w-[2.5px] bg-cyan-400 rounded-full shadow-[0_0_8px_#00E5FF] animate-pulse z-10" />
                    </span>
                  )}

                  {/* Foydalanuvchi so'zdan ortiqcha harf yozganda (Monkeytype extra letters) */}
                  {currentInput.length > word.length && (
                    currentInput.slice(word.length).split('').map((extraChar, eIdx) => (
                      <span key={`extra-${eIdx}`} className="text-rose-500 underline decoration-rose-500 opacity-90 font-mono">
                        {extraChar}
                      </span>
                    ))
                  )}
                </span>
              );
            }

            // 2. Yozib bo'lingan oldingi so'zlar
            if (isPast) {
              const pastInput = pastHistory?.input || '';
              const pastMatched = pastHistory?.isCorrect ?? true;

              return (
                <span
                  key={actualIndex}
                  ref={(el) => { wordRefs.current[actualIndex] = el; }}
                  className={`relative inline-flex items-center mr-3 mb-2 select-none ${
                    !pastMatched ? 'border-b border-rose-500/50' : ''
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
                  {pastInput.length > word.length &&
                    pastInput.slice(word.length).split('').map((extraChar, eIdx) => (
                      <span key={`past-extra-${eIdx}`} className="text-rose-500 line-through opacity-75">
                        {extraChar}
                      </span>
                    ))}
                </span>
              );
            }

            // 3. Hali yozilmagan kelgusi so'zlar (Sokin kulrang)
            return (
              <span
                key={actualIndex}
                ref={(el) => { wordRefs.current[actualIndex] = el; }}
                className="relative inline-flex items-center mr-3 mb-2 select-none text-slate-500"
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
