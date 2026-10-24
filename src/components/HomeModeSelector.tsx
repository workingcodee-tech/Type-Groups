import React, { useState } from 'react';
import { User, Users, PlusCircle, ArrowRight } from 'lucide-react';
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
      {/* 3 ta bo'lim tanlash kartalari (Foydalanuvchi talabi 4 va 8) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1-Bo'lim: Bir o'zim yozaman */}
        <button
          type="button"
          onClick={() => setActiveModal('solo')}
          className="p-3.5 sm:p-4 rounded-2xl border border-slate-800 bg-[#090e1c]/90 hover:border-cyan-400/80 hover:bg-[#0c162c] transition-all duration-200 flex flex-col justify-between text-left group shadow-lg shadow-black/40 cursor-pointer"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-2 group-hover:scale-105 transition-transform">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white mb-1 flex items-center justify-between">
              <span>1. Bir Oʻzim Yozaman</span>
              <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-1.5 py-0.2 rounded">
                Solo
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Mustaqil mashq: 5000 ta tasodifiy soʻzlar orqali oʻz tezligingiz ustida ishlang.
            </p>
          </div>
          <div className="mt-3 flex items-center text-xs font-semibold text-cyan-400 gap-1.5 group-hover:text-cyan-300">
            <span>Tanlash va Boshlash</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 2-Bo'lim: Guruhga qo'shilish */}
        <button
          type="button"
          onClick={() => setActiveModal('join')}
          className="p-3.5 sm:p-4 rounded-2xl border border-slate-800 bg-[#090e1c]/90 hover:border-blue-400/80 hover:bg-[#0c162c] transition-all duration-200 flex flex-col justify-between text-left group shadow-lg shadow-black/40 cursor-pointer"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-2 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white mb-1 flex items-center justify-between">
              <span>2. Guruhga Qoʻshilish</span>
              <span className="text-[9px] font-mono text-blue-300 bg-blue-950/70 border border-blue-800/60 px-1.5 py-0.2 rounded">
                ID orqali
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              6 raqamli xona ID sini kiriting va boshqalar ochgan guruhga qoʻshiling.
            </p>
          </div>
          <div className="mt-3 flex items-center text-xs font-semibold text-blue-400 gap-1.5 group-hover:text-blue-300">
            <span>Tanlash va Ulanish</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 3-Bo'lim: Guruh yaratish */}
        <button
          type="button"
          onClick={() => setActiveModal('create')}
          className="p-3.5 sm:p-4 rounded-2xl border border-slate-800 bg-[#090e1c]/90 hover:border-emerald-400/80 hover:bg-[#0c162c] transition-all duration-200 flex flex-col justify-between text-left group shadow-lg shadow-black/40 cursor-pointer"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-105 transition-transform">
              <PlusCircle className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white mb-1 flex items-center justify-between">
              <span>3. Guruh Yaratish</span>
              <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                Yangi Xona
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Guruh oching, 6 raqamlik ID oling va 10 tagacha ishtirokchi bilan poyga qiling.
            </p>
          </div>
          <div className="mt-3 flex items-center text-xs font-semibold text-emerald-400 gap-1.5 group-hover:text-emerald-300">
            <span>Tanlash va Yaratish</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Tanlangan bo'lim uchun Modal Oyna (Foydalanuvchi talabi: 3 ta bo'limdan biri tanlanganda mos modal oyna chiqsin) */}
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
