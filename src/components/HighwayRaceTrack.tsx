import React from 'react';
import { CarSprite } from './CarSprite';

export interface HighwayRacer {
  id: string;
  name: string;
  carId: string;
  progress: number;
  currentWpm: number;
  accuracy: number;
  finished: boolean;
  finishTime?: number;
  isUser: boolean;
  rank?: number;
}

interface HighwayRaceTrackProps {
  racers: HighwayRacer[];
  roomName?: string;
  roomId?: string;
}

export const HighwayRaceTrack: React.FC<HighwayRaceTrackProps> = ({
  racers,
  roomName,
  roomId
}) => {
  return (
    <div className="w-full bg-[#0d121f] border border-slate-800 rounded-2xl overflow-hidden shadow-xl shrink-0">
      {/* Trassa sarlavhasi */}
      <div className="px-3.5 py-1.5 bg-[#0a0f1d] border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-bold text-slate-200 uppercase tracking-wider font-mono text-[11px]">
            🏎️ Poyga Trassasi {roomName ? `· ${roomName}` : ''}
          </span>
          {roomId && (
            <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800/60 rounded font-mono font-bold text-[10px]">
              ID: {roomId}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 font-mono text-slate-400 text-[10px]">
          <span>{racers.filter(r => r.finished).length}/{racers.length} marraga yetdi</span>
        </div>
      </div>

      {/* Asosiy asfalt trassa */}
      <div className="relative bg-[#151a28] overflow-x-hidden">
        {/* Yuqori qizil-oq poyga bordyuri */}
        <div className="h-1 w-full bg-[repeating-linear-gradient(90deg,#ef4444,#ef4444_16px,#f8fafc_16px,#f8fafc_32px)] opacity-85" />

        {/* Trassa yo'laklari (Har bir ishtirokchi uchun bitta qat'iy yo'lak) */}
        <div className="relative divide-y divide-dashed divide-slate-700/40 max-h-[30vh] overflow-y-auto">
          {/* Start chizig'i */}
          <div className="absolute left-6 top-0 bottom-0 w-1 bg-white/30 z-10 pointer-events-none flex items-center justify-center">
            <span className="text-[7px] text-white/50 -rotate-90 uppercase font-mono font-bold">START</span>
          </div>

          {/* Marra chizig'i (Checkered finish line) */}
          <div className="absolute right-8 top-0 bottom-0 w-5 bg-[repeating-conic-gradient(#000000_0%_25%,#ffffff_0%_50%)] bg-[length:8px_8px] z-10 border-l border-r border-yellow-400/80 pointer-events-none shadow-md">
            <div className="h-full flex items-center justify-center bg-black/20">
              <span className="text-[7px] text-yellow-300 font-black rotate-90 tracking-widest font-mono">FINISH</span>
            </div>
          </div>

          {/* Har bir poygachining trassadagi yo'lagi (BARQAROR TARTIB, HECH QACHON O'RIN ALMASHTIRMAYDI) */}
          {racers.map((racer, index) => {
            const safeProgress = Math.min(100, Math.max(0, racer.progress));
            // 0 progress da mashina qat'iy 2% da (start chizig'ida) turadi
            const leftPercent = 2 + (safeProgress * 0.81);

            return (
              <div
                key={racer.id}
                className={`relative h-12 flex items-center px-4 transition-colors ${
                  racer.isUser ? 'bg-cyan-950/25' : ''
                }`}
              >
                {/* Yo'lak raqami */}
                <div className="absolute left-1.5 text-[9px] font-mono text-slate-500 font-bold select-none">
                  L{index + 1}
                </div>

                {/* Mashina harakati: Silliq, sakramaydigan va qaltiramaydigan silliq transition */}
                <div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    left: `${leftPercent}%`,
                    transition: 'left 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
                    willChange: 'left'
                  }}
                >
                  <CarSprite
                    carId={racer.carId}
                    playerName={racer.name}
                    currentWpm={racer.currentWpm}
                    isUser={racer.isUser}
                    rank={racer.rank}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pastki qizil-oq poyga bordyuri */}
        <div className="h-1 w-full bg-[repeating-linear-gradient(90deg,#ef4444,#ef4444_16px,#f8fafc_16px,#f8fafc_32px)] opacity-85" />
      </div>
    </div>
  );
};
