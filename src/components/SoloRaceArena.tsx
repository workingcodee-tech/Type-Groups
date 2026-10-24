import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { HighwayRaceTrack, HighwayRacer } from './HighwayRaceTrack';
import { WordsTypingArena, DISTANCE_TARGETS } from './WordsTypingArena';
import { RaceResultsModal } from './RaceResultsModal';
import { generate5000Words } from '../data/words';
import { RaceStats, DifficultyLevel } from '../types';
import { LogOut } from 'lucide-react';
import { FAMOUS_CARS } from '../data/cars';
import { sounds } from '../utils/soundEffects';

interface SoloRaceArenaProps {
  userName: string;
  carId: string;
  initialDifficulty?: DifficultyLevel;
  onBack: () => void;
}

// 3 xil qiyinlik darajasidagi botlar parametrlari (foydalanuvchilar qulay yutishi uchun sezilarli sekinlashtirilgan)
const BOT_CONFIGS: Record<DifficultyLevel, { id: string; name: string; carId: string; wpm: number; accuracy: number }[]> = {
  easy: [
    { id: 'bot-1', name: 'Sokin Haydovchi', carId: 'malibu', wpm: 10, accuracy: 95 },
    { id: 'bot-2', name: 'Shahar Mashinasi', carId: 'kia', wpm: 14, accuracy: 96 },
    { id: 'bot-3', name: 'Asta Poygachi', carId: 'audi', wpm: 18, accuracy: 97 },
  ],
  medium: [
    { id: 'bot-1', name: 'Kruiz Poygachi', carId: 'bmw', wpm: 22, accuracy: 96 },
    { id: 'bot-2', name: 'Nitro Mustang', carId: 'mustang', wpm: 28, accuracy: 97 },
    { id: 'bot-3', name: 'Turbo AMG', carId: 'mers', wpm: 34, accuracy: 98 },
  ],
  hard: [
    { id: 'bot-1', name: 'Shadow Ferrari', carId: 'ferrari', wpm: 42, accuracy: 98 },
    { id: 'bot-2', name: 'Hyper 911', carId: 'porsche', wpm: 50, accuracy: 98 },
    { id: 'bot-3', name: 'Bugatti Phantom', carId: 'bugatti', wpm: 58, accuracy: 99 },
  ],
};

export const SoloRaceArena: React.FC<SoloRaceArenaProps> = ({
  userName,
  carId,
  initialDifficulty = 'medium',
  onBack
}) => {
  const [wordsList, setWordsList] = useState<string[]>(() => generate5000Words());
  const [raceStats, setRaceStats] = useState<RaceStats | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<number>(100);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialDifficulty);

  // 3-2-1 Countdown holati
  const [countdown, setCountdown] = useState<number | null>(3);
  const [isRaceActive, setIsRaceActive] = useState<boolean>(false);
  const raceStartTimeRef = useRef<number | null>(null);

  const selectedCar = FAMOUS_CARS.find(c => c.id === carId) || FAMOUS_CARS[0];

  // 4 ta poygachi (Foydalanuvchi + tanlangan darajadagi 3 ta bot raqib)
  const initialRacers = useMemo<HighwayRacer[]>(() => {
    const currentBots = BOT_CONFIGS[difficulty].map((bot, index) => ({
      id: bot.id,
      name: bot.name,
      carId: bot.carId,
      progress: 0,
      currentWpm: bot.wpm,
      accuracy: bot.accuracy,
      finished: false,
      isUser: false,
      rank: index + 2
    }));

    return [
      {
        id: 'user-player',
        name: userName || 'Siz (Oʻyinchi)',
        carId: selectedCar.id,
        progress: 0,
        currentWpm: 0,
        accuracy: 100,
        finished: false,
        isUser: true,
        rank: 1
      },
      ...currentBots
    ];
  }, [userName, selectedCar.id, difficulty]);

  const [racers, setRacers] = useState<HighwayRacer[]>(initialRacers);
  const botIntervalRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  // Poygani 3-2-1 hisoblagich bilan boshlash
  const startCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (botIntervalRef.current) {
      clearInterval(botIntervalRef.current);
      botIntervalRef.current = null;
    }

    setCountdown(3);
    setIsRaceActive(false);
    raceStartTimeRef.current = null;
    setRacers(initialRacers);

    // Ovoz effektlari: 3
    sounds.playCountdown(3);

    let count = 3;
    countdownTimerRef.current = window.setInterval(() => {
      count -= 1;
      if (count >= 0) {
        setCountdown(count);
        sounds.playCountdown(count);
      } else {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        setCountdown(null);
        setIsRaceActive(true);
        raceStartTimeRef.current = Date.now();
      }
    }, 1000);
  }, [initialRacers]);

  // Sahifa yuklanganda yoki difficulty/distance o'zgarganda 3-2-1 bilan boshlanadi
  useEffect(() => {
    startCountdown();
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (botIntervalRef.current) {
        clearInterval(botIntervalRef.current);
      }
    };
  }, [startCountdown]);

  // Botlarning masofaga va qiyinlik darajasiga qarab harakatlanishi
  useEffect(() => {
    if (!isRaceActive || raceStats) {
      if (botIntervalRef.current) {
        clearInterval(botIntervalRef.current);
        botIntervalRef.current = null;
      }
      return;
    }

    const targetWords = (DISTANCE_TARGETS[selectedDistance] || 100) / 5;
    const botSpeeds: Record<string, number> = {};
    BOT_CONFIGS[difficulty].forEach(b => {
      botSpeeds[b.id] = b.wpm;
    });

    botIntervalRef.current = window.setInterval(() => {
      if (!raceStartTimeRef.current) return;
      const elapsedSeconds = (Date.now() - raceStartTimeRef.current) / 1000;

      setRacers((prev) => {
        const updated = prev.map((racer) => {
          if (racer.isUser || racer.finished) return racer;

          const wpm = botSpeeds[racer.id] || 45;
          // Soniya boshiga so'z: wpm / 60
          const wordsTyped = elapsedSeconds * (wpm / 60);
          const progress = Math.min(100, Math.round((wordsTyped / targetWords) * 100));

          return {
            ...racer,
            progress,
            currentWpm: wpm,
            finished: progress >= 100,
            finishTime: progress >= 100 && !racer.finishTime ? Number(elapsedSeconds.toFixed(1)) : racer.finishTime
          };
        });

        // O'rinlarni hisoblash
        const sorted = [...updated].sort((a, b) => {
          if (a.finished && b.finished) {
            return (a.finishTime || 999) - (b.finishTime || 999);
          }
          return (b.progress - a.progress) || (b.currentWpm - a.currentWpm);
        });

        const rankMap = new Map(sorted.map((r, i) => [r.id, i + 1]));

        return updated.map((r) => ({
          ...r,
          rank: rankMap.get(r.id) || 1
        }));
      });
    }, 200);

    return () => {
      if (botIntervalRef.current) {
        clearInterval(botIntervalRef.current);
      }
    };
  }, [isRaceActive, raceStats, selectedDistance, difficulty]);

  // Foydalanuvchi klaviaturada yozganda progress yangilanishi
  const handleProgressUpdate = useCallback((
    userProgress: number,
    wpm: number,
    accuracy: number,
    _chars: number,
    _errors: number,
    _currentMeters: number
  ) => {
    setRacers((prev) => {
      const updated = prev.map((racer) => {
        if (!racer.isUser) return racer;
        return {
          ...racer,
          progress: userProgress,
          currentWpm: wpm,
          accuracy,
          finished: userProgress >= 100
        };
      });

      const sorted = [...updated].sort((a, b) => {
        if (a.finished && b.finished) {
          return (a.finishTime || 999) - (b.finishTime || 999);
        }
        return (b.progress - a.progress) || (b.currentWpm - a.currentWpm);
      });

      const rankMap = new Map(sorted.map((r, i) => [r.id, i + 1]));

      return updated.map((r) => ({
        ...r,
        rank: rankMap.get(r.id) || 1
      }));
    });
  }, []);

  const handleFinish = useCallback((stats: RaceStats) => {
    setRacers((current) => {
      const userRank = current.find(r => r.isUser)?.rank || 1;
      setRaceStats({
        ...stats,
        distanceMeters: selectedDistance,
        difficulty,
        userRank,
        totalRacers: current.length
      });
      return current;
    });
    setIsRaceActive(false);
  }, [selectedDistance, difficulty]);

  const handleRestartRace = useCallback(() => {
    setRaceStats(null);
    setWordsList(generate5000Words());
    startCountdown();
  }, [startCountdown]);

  const handleDistanceChange = useCallback((dist: number) => {
    setSelectedDistance(dist);
    setRaceStats(null);
    startCountdown();
  }, [startCountdown]);

  const handleDifficultyChange = useCallback((newDiff: DifficultyLevel) => {
    setDifficulty(newDiff);
    setRaceStats(null);
    setWordsList(generate5000Words());
  }, []);

  return (
    <div className="w-full h-full max-w-5xl mx-auto flex flex-col justify-between py-1 px-2 select-none relative">
      {/* 1. Kichik chiqish tugmasi, qiyinlik darajasi va poyga sozlamalari */}
      <div className="flex items-center justify-between px-1 py-0.5 flex-wrap gap-1">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3 h-3 text-rose-400" />
            <span>Chiqish</span>
          </button>

          {/* Qiyinlik darajasini almashtirish: Oson / O'rta / Qiyin */}
          <div className="flex items-center p-0.5 bg-slate-950/90 border border-slate-800 rounded-lg text-[10px] font-bold">
            <span className="px-1.5 text-slate-400 font-semibold hidden sm:inline">Daraja:</span>
            <button
              type="button"
              onClick={() => handleDifficultyChange('easy')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                difficulty === 'easy'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🟢 Oson
            </button>
            <button
              type="button"
              onClick={() => handleDifficultyChange('medium')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                difficulty === 'medium'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm shadow-amber-400/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🟡 Oʻrta
            </button>
            <button
              type="button"
              onClick={() => handleDifficultyChange('hard')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                difficulty === 'hard'
                  ? 'bg-rose-500 text-white font-black shadow-sm shadow-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔴 Qiyin
            </button>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <span>🏎️ <strong className="text-white">{selectedCar.name}</strong></span>
          <span className="text-slate-600">·</span>
          <span>👤 <strong className="text-cyan-300">{userName}</strong></span>
          <span className="text-slate-600">·</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-bold">
            🏁 {selectedDistance}m
          </span>
        </div>
      </div>

      {/* 2. Haqiqiy Arcade Poyga Trassasi va 3-2-1 Countdown Overlay */}
      <div className="my-auto py-1 relative">
        <HighwayRaceTrack
          racers={racers}
          roomName={
            difficulty === 'easy'
              ? 'Yakka Poyga (Oson Trassa · ~10-18 WPM)'
              : difficulty === 'medium'
              ? 'Yakka Poyga (Oʻrta Trassa · ~22-34 WPM)'
              : 'Yakka Poyga (Qiyin Trassa · ~42-58 WPM)'
          }
        />

        {/* 3... 2... 1... START! Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-30 rounded-2xl flex flex-col items-center justify-center animate-fade-in pointer-events-none">
            {/* Chiroqlar (Traffic Light) */}
            <div className="flex items-center gap-3 mb-2 p-2 bg-slate-950/90 border border-slate-800 rounded-full shadow-2xl">
              <span className={`w-5 h-5 rounded-full transition-all duration-200 ${
                countdown === 3 ? 'bg-rose-500 shadow-[0_0_15px_#f43f5e] scale-125' : 'bg-rose-950/40 border border-rose-900/60'
              }`} />
              <span className={`w-5 h-5 rounded-full transition-all duration-200 ${
                countdown === 2 ? 'bg-amber-400 shadow-[0_0_15px_#fbbf24] scale-125' : 'bg-amber-950/40 border border-amber-900/60'
              }`} />
              <span className={`w-5 h-5 rounded-full transition-all duration-200 ${
                countdown <= 1 ? 'bg-emerald-400 shadow-[0_0_15px_#34d399] scale-125' : 'bg-emerald-950/40 border border-emerald-900/60'
              }`} />
            </div>

            {/* Raqam yoki GO! */}
            <div className="text-5xl sm:text-7xl font-black font-mono tracking-wider drop-shadow-[0_0_25px_rgba(52,211,153,0.8)] text-white scale-110 animate-bounce">
              {countdown === 0 ? (
                <span className="text-emerald-400">GO! 🏁</span>
              ) : (
                <span className={countdown === 3 ? 'text-rose-400' : countdown === 2 ? 'text-amber-400' : 'text-emerald-400'}>
                  {countdown}
                </span>
              )}
            </div>

            <p className="text-[11px] sm:text-xs font-mono font-bold text-slate-300 mt-2 tracking-widest uppercase bg-slate-900/90 px-3 py-0.5 rounded-md border border-slate-700">
              {countdown === 0 ? 'POYGA BOSHLANDI!' : 'TAYYOR BOʻLING...'}
            </p>
          </div>
        )}
      </div>

      {/* 3. Spidometr va Bir Qatorlik Yozish Maydoni */}
      <div className="pt-1">
        <WordsTypingArena
          wordsList={wordsList}
          onProgressUpdate={handleProgressUpdate}
          onFinish={handleFinish}
          isGameActive={isRaceActive}
          countdownActive={countdown !== null}
          selectedDistance={selectedDistance}
          onDistanceChange={handleDistanceChange}
          onRestart={handleRestartRace}
        />
      </div>

      {/* Natijalar modali */}
      {raceStats && (
        <RaceResultsModal
          stats={raceStats}
          participants={racers.map(r => ({
            id: r.id,
            name: r.name,
            avatar: '🏎️',
            isUser: r.isUser,
            progress: r.progress,
            currentWpm: r.currentWpm,
            rawWpm: r.currentWpm,
            accuracy: r.accuracy,
            finished: r.finished,
            finishTimeSeconds: r.finishTime,
            rank: r.rank,
            color: selectedCar.bodyColor
          }))}
          onRestart={handleRestartRace}
          onNextQuote={handleRestartRace}
          onSaveScore={() => {}}
          hasSaved={true}
        />
      )}
    </div>
  );
};
