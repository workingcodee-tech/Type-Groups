import React, { useState } from 'react';
import { User, Users, PlusCircle, X, ArrowRight, AlertCircle } from 'lucide-react';
import { CarSelector } from './CarSelector';

export type ModeType = 'solo' | 'join' | 'create';

interface ModeModalProps {
  mode: ModeType | null;
  onClose: () => void;
  onStartSolo: (userName: string, carId: string) => void;
  onJoinGroup: (roomId: string, userName: string, carId: string) => void;
  onCreateGroup: (groupName: string, userName: string, carId: string) => void;
}

export const ModeModal: React.FC<ModeModalProps> = ({
  mode,
  onClose,
  onStartSolo,
  onJoinGroup,
  onCreateGroup
}) => {
  if (!mode) return null;

  const [userName, setUserName] = useState<string>(() => {
    try {
      return localStorage.getItem('tg_user_name') || '';
    } catch {
      return '';
    }
  });
  const [selectedCarId, setSelectedCarId] = useState<string>('bmw');
  const [groupName, setGroupName] = useState<string>('');
  const [roomIdInput, setRoomIdInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleNameChange = (val: string) => {
    setUserName(val);
    try {
      localStorage.setItem('tg_user_name', val);
    } catch {
      // ignore
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setErrorMsg('Iltimos, ismingizni kiriting!');
      return;
    }

    if (mode === 'solo') {
      onStartSolo(userName.trim(), selectedCarId);
    } else if (mode === 'join') {
      const cleanId = roomIdInput.trim();
      if (!cleanId || cleanId.length !== 6) {
        setErrorMsg('Iltimos, 6 raqamli xona ID sini toʻliq kiriting (masalan: 749201)');
        return;
      }
      onJoinGroup(cleanId, userName.trim(), selectedCarId);
    } else if (mode === 'create') {
      if (!groupName.trim()) {
        setErrorMsg('Iltimos, yangi guruh nomini kiriting!');
        return;
      }
      onCreateGroup(groupName.trim(), userName.trim(), selectedCarId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#090e1c] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/70 p-4 sm:p-5 text-slate-100 max-h-[90vh] flex flex-col justify-between overflow-hidden">
        {/* Yopish tugmasi */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Modalni yopish"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Sarlavhasi */}
        <div className="flex items-center gap-3 pb-2.5 mb-2.5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            {mode === 'solo' && <User className="w-4 h-4" />}
            {mode === 'join' && <Users className="w-4 h-4 text-blue-400" />}
            {mode === 'create' && <PlusCircle className="w-4 h-4 text-emerald-400" />}
          </div>
          <div>
            <h3 className="text-base font-black text-white leading-tight">
              {mode === 'solo' && '1. Bir Oʻzim Yozaman (Mustaqil Mashq)'}
              {mode === 'join' && '2. Guruhga Qoʻshilish'}
              {mode === 'create' && '3. Yangi Guruh Yaratish'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {mode === 'solo' && 'Ismingiz va poyga mashinangizni tanlang'}
              {mode === 'join' && '6 raqamli xona ID sini kiriting va qoʻshiling'}
              {mode === 'create' && 'Guruh nomini kiriting va 6 raqamlik ID oling'}
            </p>
          </div>
        </div>

        {/* Xatolik xabari */}
        {errorMsg && (
          <div className="mb-2 p-2 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Asosiy Forma */}
        <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto pr-1">
          {mode === 'create' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Guruh Nomi:
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Masalan: Samarqand Shiddatkorlari"
                required
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}

          {mode === 'join' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                6 Raqamli Xona ID si:
              </label>
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Masalan: 489201"
                maxLength={6}
                required
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-center tracking-widest text-base font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Sizning Ismingiz:
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ismingizni kiriting..."
              required
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Mashina tanlash */}
          <CarSelector
            selectedCarId={selectedCarId}
            onSelectCar={setSelectedCarId}
          />

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 rounded-xl cursor-pointer"
            >
              Bekor Qilish
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <span>
                {mode === 'solo' && 'Poygani Boshlash'}
                {mode === 'join' && 'Xonaga Kirish'}
                {mode === 'create' && 'Guruhni Yaratish'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
