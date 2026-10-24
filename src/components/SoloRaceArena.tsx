import React, { useState, useMemo } from 'react';
import { HighwayRaceTrack, HighwayRacer } from './HighwayRaceTrack';
import { WordsTypingArena } from './WordsTypingArena';
import { RaceResultsModal } from './RaceResultsModal';
import { generate5000Words } from '../data/words';
import { RaceStats } from '../types';
import { ArrowLeft } from 'lucide-react';
import { FAMOUS_CARS } from '../data/cars';

interface SoloRaceArenaProps {
  userName: string;
  carId: string;
  onBack: () => void;
}

export const SoloRaceArena: React.FC<SoloRaceArenaProps> = ({
  userName,
  carId,
  onBack
}) => {
  // Har doim kirganda 5000 ta so'zlar har xil bo'lib random chiqib keladi (Foydalanuvchi talabi 3)
  const wordsList = useMemo(() => generate5000Words(), []);

  const [raceStats, setRaceStats] = useState<RaceStats | null>(null);

  // Tanlangan mashina
  const selectedCar = FAMOUS_CARS.find(c => c.id === carId) || FAMOUS_CARS[0];

  // 1-Bo'lim: Bir o'zim yozaman (Mustaqil mashq - faqat foydalanuvchining o'z mashinasi)
  // Hech qanday soxta botlar yo'q, mashina rangi o'zgarmaydi va foydalanuvchi yozmaguncha umuman qimirlamaydi!
  const [racers, setRacers] = useState<HighwayRacer[]>([
    {
      id: 'user-solo',
      name: userName || 'Siz',
      carId: selectedCar.id,
      progress: 0,
      currentWpm: 0,
      accuracy: 100,
      finished: false,
      isUser: true,
      rank: 1
    }
  ]);

  // Trassadagi harakatni yangilash: FAQAT foydalanuvchi yozganda progress oshadi
  const handleProgressUpdate = React.useCallback((progress: number, wpm: number, accuracy: number) => {
    setRacers((prev) => [
      {
        ...prev[0],
        progress,
        currentWpm: wpm,
        accuracy,
        finished: progress >= 100
      }
    ]);
  }, []);

  const handleFinish = React.useCallback((stats: RaceStats) => {
    setRaceStats({
      ...stats,
      userRank: 1,
      totalRacers: 1
    });
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 justify-center">
      {/* Sarlavha tasmasi */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl transition-colors border border-slate-700 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Bosh Sahifaga Qaytish</span>
        </button>

        <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full border border-slate-600 inline-block"
              style={{ backgroundColor: selectedCar.bodyColor }}
            />
            Mashina: <strong className="text-cyan-300">{selectedCar.name}</strong>
          </span>
          <span className="text-slate-600">·</span>
          <span>Haydovchi: <strong className="text-white">{userName}</strong></span>
        </div>
      </div>

      {/* Haqiqiy Trassa (Asphalt Highway) - Bitta silliq yo'lak */}
      <HighwayRaceTrack
        racers={racers}
        roomName="Mustaqil Mashq Trassasi"
      />

      {/* 5000 ta so'zlar bo'yicha yozish maydoni (Faqat yozadigan qismi ingliz tilida) */}
      <WordsTypingArena
        wordsList={wordsList}
        onProgressUpdate={handleProgressUpdate}
        onFinish={handleFinish}
        isGameActive={true}
      />

      {/* Sinov yakunidagi batafsil natijalar modal oynasi */}
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
            rank: 1,
            color: selectedCar.bodyColor
          }))}
          onRestart={() => setRaceStats(null)}
          onNextQuote={() => setRaceStats(null)}
          onSaveScore={() => {}}
          hasSaved={true}
        />
      )}
    </div>
  );
};
