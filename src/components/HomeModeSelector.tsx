import React, { useState } from 'react';
import { Trophy, Users, PlusCircle, ArrowRight, Zap, Flag } from 'lucide-react';
import { ModeModal, ModeType } from './ModeModal';

interface HomeModeSelectorProps {
  onStartSolo: (userName: string, carId: string) => void;
  onJoinGroup: (roomId: string, userName: string, carId: string) => void;
  onCreateGroup: (groupName: string, userName: string, carId: string) => void;
}

export const HomeModeSelector: React.FC<HomeModeSelectorProps> = ({
  onStartSolo,
  onJoinGroup,
  onCreateGroup
}) => {
  const [activeModal, setActiveModal] = useState<ModeType | null>(null);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col justify-center">
      {/* 3 ta Arcade Poyga Rejimlari */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1-Bo'lim: Yakka Poyga (Solo) */}
        <button
          type="button"
          onClick={() => setActiveModal('solo')}
          className="relative p-4 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-[#0a1e17] to-[#06120e] hover:border-emerald-400 hover:from-[#0d2a20] hover:to-[#081a14] transition-all duration-200 flex flex-col justify-between text-left group shadow-xl shadow-black/60 cursor-pointer overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/60 flex items-center justify-center text-emerald-400 mb-2.5 group-hover:scale-105 transition-transform shadow-md">
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-black text-white mb-1 flex items-center justify-between">
              <span>1. Yakka Poyga</span>
              <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-700/80 px-2 py-0.5 rounded">
                SOLO
              </span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bot raqiblar bilan haqiqiy trassada tezlikni sinang va 5000 ta soʻz boʻyicha oʻzingizni chiniqtiring.
            </p>
          </div>
          <div className="mt-3.5 flex items-center text-xs font-black text-emerald-400 gap-1.5 group-hover:text-emerald-300">
            <span>POYGANI BOSHLASH</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 2-Bo'lim: Guruhga qo'shilish (Xona ID) */}
        <button
          type="button"
          onClick={() => setActiveModal('join')}
          className="relative p-4 rounded-2xl border-2 border-blue-500/40 bg-gradient-to-b from-[#08192b] to-[#050e18] hover:border-blue-400 hover:from-[#0c223a] hover:to-[#071322] transition-all duration-200 flex flex-col justify-between text-left group shadow-xl shadow-black/60 cursor-pointer overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-500/60 flex items-center justify-center text-blue-400 mb-2.5 group-hover:scale-105 transition-transform shadow-md">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-base font-black text-white mb-1 flex items-center justify-between">
              <span>2. Guruhga Qoʻshilish</span>
              <span className="text-[10px] font-mono font-bold text-blue-300 bg-blue-950/80 border border-blue-700/80 px-2 py-0.5 rounded">
                XONA ID
              </span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Doʻstingiz bergan 6 raqamli xona ID sini kiriting va jonli trassada birga poyga qiling.
            </p>
          </div>
          <div className="mt-3.5 flex items-center text-xs font-black text-blue-400 gap-1.5 group-hover:text-blue-300">
            <span>XONAGA ULАNISH</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 3-Bo'lim: Guruh yaratish (Host) */}
        <button
          type="button"
          onClick={() => setActiveModal('create')}
          className="relative p-4 rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-b from-[#071d24] to-[#041014] hover:border-cyan-400 hover:from-[#0b2933] hover:to-[#06171d] transition-all duration-200 flex flex-col justify-between text-left group shadow-xl shadow-black/60 cursor-pointer overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-cyan-400 mb-2.5 group-hover:scale-105 transition-transform shadow-md">
              <PlusCircle className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-base font-black text-white mb-1 flex items-center justify-between">
              <span>3. Yangi Xona Ochish</span>
              <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-700/80 px-2 py-0.5 rounded">
                MULTIPLAYER
              </span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Yangi poyga xonasi oching, 6 raqamlik ID oling va 10 tagacha ishtirokchi bilan oʻynang.
            </p>
          </div>
          <div className="mt-3.5 flex items-center text-xs font-black text-cyan-400 gap-1.5 group-hover:text-cyan-300">
            <span>XONA YARATISH</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Modal Oyna */}
      <ModeModal
        mode={activeModal}
        onClose={() => setActiveModal(null)}
        onStartSolo={(name, car) => {
          setActiveModal(null);
          onStartSolo(name, car);
        }}
        onJoinGroup={(id, name, car) => {
          setActiveModal(null);
          onJoinGroup(id, name, car);
        }}
        onCreateGroup={(gName, name, car) => {
          setActiveModal(null);
          onCreateGroup(gName, name, car);
        }}
      />
    </div>
  );
};
