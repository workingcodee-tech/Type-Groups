import React, { useState, useEffect, useRef } from 'react';
import { doc, collection, onSnapshot, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { HighwayRaceTrack, HighwayRacer } from './HighwayRaceTrack';
import { WordsTypingArena } from './WordsTypingArena';
import { RaceResultsModal } from './RaceResultsModal';
import { RaceStats } from '../types';
import { Play, LogOut, Copy, Check, Users, Trash2, AlertCircle } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

interface MultiplayerRoomProps {
  roomId: string;
  myId: string;
  myName: string;
  myCarId: string;
  isCreator: boolean;
  onLeave: () => void;
}

export const MultiplayerRoom: React.FC<MultiplayerRoomProps> = ({
  roomId,
  myId,
  myName,
  myCarId,
  isCreator,
  onLeave
}) => {
  const [roomData, setRoomData] = useState<any>(null);
  const [participants, setParticipants] = useState<HighwayRacer[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [raceStats, setRaceStats] = useState<RaceStats | null>(null);
  const [roomClosed, setRoomClosed] = useState(false);

  // Firestore update throttle ref
  const lastUpdateRef = useRef<number>(0);

  // Xona va ishtirokchilarni Firestore orqali real-vaqtda kuzatish
  useEffect(() => {
    const roomRef = doc(db, 'rooms', roomId);
    const unsubRoom = onSnapshot(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Xona yaratuvchi tomonidan o'chirilgan
        setRoomClosed(true);
        return;
      }
      const data = snapshot.data();
      setRoomData(data);

      if (data.status === 'starting' && data.countdown !== undefined) {
        setCountdown(data.countdown);
        if (data.countdown >= 0) {
          sounds.playCountdown(data.countdown);
        }
      } else if (data.status === 'racing') {
        setCountdown(null);
      }
    }, (error) => {
      console.warn("Xonani kuzatishda xatolik:", error);
    });

    const participantsRef = collection(db, 'rooms', roomId, 'participants');
    const unsubParticipants = onSnapshot(participantsRef, (snapshot) => {
      const list: HighwayRacer[] = [];
      snapshot.forEach((docSnap) => {
        const p = docSnap.data();
        list.push({
          id: p.id,
          name: p.name,
          carId: p.carId || 'bmw',
          progress: p.progress || 0,
          currentWpm: p.currentWpm || 0,
          accuracy: p.accuracy || 100,
          finished: !!p.finished,
          finishTime: p.finishTime,
          isUser: p.id === myId,
          joinedAt: p.joinedAt || p.id
        } as any);
      });

      // O'rinlarni hisoblash (Rank faqat ko'krak nishoni uchun hisoblanadi)
      const sortedBySpeed = [...list].sort((a, b) => {
        if (a.finished && b.finished) {
          return (a.finishTime || 999) - (b.finishTime || 999);
        }
        return (b.progress - a.progress) || (b.currentWpm - a.currentWpm);
      });

      const rankMap = new Map();
      sortedBySpeed.forEach((r, idx) => {
        rankMap.set(r.id, idx + 1);
      });

      // DIQQAT: Ishtirokchilar yo'lagi (Lane) har doim o'zgarishsiz qat'iy saqlanadi (joinedAt/ID bo'yicha)
      // Hech qanday mashina rangini o'zgartirmaydi yoki yo'lakdan sakramaydi!
      const stableList = [...list].sort((a: any, b: any) => (a.joinedAt || a.id).localeCompare(b.joinedAt || b.id));
      const withRank = stableList.map((r) => ({
        ...r,
        rank: rankMap.get(r.id) || 1
      }));

      setParticipants(withRank);
    }, (error) => {
      console.warn("Ishtirokchilarni olishda xatolik:", error);
    });

    return () => {
      unsubRoom();
      unsubParticipants();
    };
  }, [roomId, myId]);

  // Ishtirokchining o'z natijasini Firestore ga yangilash (silliq va tejamkor)
  const handleProgressUpdate = React.useCallback(async (progress: number, wpm: number, accuracy: number, totalChars: number, errors: number) => {
    const now = Date.now();
    // 250ms dan tez-tez bo'lmagan yangilanish (agar marraga yetmagan bo'lsa)
    if (progress < 100 && now - lastUpdateRef.current < 250) {
      return;
    }
    lastUpdateRef.current = now;

    try {
      const myRef = doc(db, 'rooms', roomId, 'participants', myId);
      await updateDoc(myRef, {
        progress,
        currentWpm: wpm,
        accuracy,
        totalChars,
        errors,
        finished: progress >= 100,
        updatedAt: new Date().toISOString()
      });
    } catch {
      // update error ignore
    }
  }, [roomId, myId]);

  // Sinov yakunlanganda
  const handleFinish = React.useCallback(async (stats: RaceStats) => {
    setParticipants((currentParticipants) => {
      const sorted = [...currentParticipants].sort((a, b) => (b.currentWpm || 0) - (a.currentWpm || 0));
      const userRank = sorted.findIndex((p) => p.isUser) + 1;

      setRaceStats({
        ...stats,
        userRank: userRank || 1,
        totalRacers: currentParticipants.length
      });
      return currentParticipants;
    });

    try {
      const myRef = doc(db, 'rooms', roomId, 'participants', myId);
      await updateDoc(myRef, {
        progress: Math.min(100, (stats.correctChars / 40) * 100),
        currentWpm: stats.wpm,
        accuracy: stats.accuracy,
        totalChars: stats.totalChars,
        errors: stats.incorrectChars,
        finished: true,
        finishTime: stats.timeSeconds,
        updatedAt: new Date().toISOString()
      });
    } catch {
      // ignore
    }
  }, [roomId, myId]);

  // Guruh yaratuvchisi poygani boshlashi (Countdown 3, 2, 1, GO)
  const handleStartRace = async () => {
    if (!isCreator) return;
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        status: 'starting',
        countdown: 3
      });

      let count = 3;
      const interval = setInterval(async () => {
        count -= 1;
        if (count >= 0) {
          await updateDoc(roomRef, { countdown: count });
        } else {
          clearInterval(interval);
          await updateDoc(roomRef, {
            status: 'racing',
            countdown: null
          });
        }
      }, 1000);
    } catch (e) {
      console.warn("Poygani boshlashda xatolik:", e);
    }
  };

  // Guruhni butunlay yakunlash va o'chirish (Foydalanuvchi talabi 4: guruh yakunlash tugmasi bosilgach guruh butunlayga o'chib ketadi)
  const handleDeleteRoom = async () => {
    if (!window.confirm('Haqiqatan ham guruhni yakunlab, xonani butunlay oʻchirmoqchimisiz?')) return;
    try {
      const participantsRef = collection(db, 'rooms', roomId, 'participants');
      const snap = await getDocs(participantsRef);
      const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);

      await deleteDoc(doc(db, 'rooms', roomId));
      onLeave();
    } catch (e) {
      console.warn("Guruhni o'chirishda xatolik:", e);
      onLeave();
    }
  };

  const handleCopyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (roomClosed) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-[#0a0f1d] border border-rose-500/40 rounded-2xl text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-bold text-white">Guruh Yakunlandi</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Ushbu xona yaratuvchi tomonidan yakunlandi va guruhga tegishli barcha vaqtinchalik maʼlumotlar toʻliq oʻchirildi.
        </p>
        <button
          onClick={onLeave}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
        >
          Bosh Sahifaga Qaytish
        </button>
      </div>
    );
  }

  const isRacing = roomData?.status === 'racing';
  const wordsList = roomData?.words || [];

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-2.5 justify-center">
      {/* Xona Boshqaruv Qatori (Ixcham) */}
      <div className="p-2 sm:p-2.5 bg-[#090e1c] border border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-black text-white truncate max-w-[140px] sm:max-w-[200px]">
            {roomData?.name || 'Poyga Guruhi'}
          </h2>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-cyan-950/80 border border-cyan-800/80 rounded-md text-xs font-mono">
            <span className="text-slate-400 text-[10px]">ID:</span>
            <strong className="text-cyan-300 font-bold">{roomId}</strong>
            <button
              onClick={handleCopyId}
              className="ml-1 text-slate-400 hover:text-white cursor-pointer"
              title="ID dan nusxa olish"
            >
              {copied ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 ml-2">
            <Users className="w-3 h-3 text-cyan-400" />
            <span>{participants.length}/10 ta</span>
          </div>
        </div>

        {/* Tugmalar */}
        <div className="flex items-center gap-2 shrink-0">
          {isCreator && roomData?.status !== 'racing' && (
            <button
              onClick={handleStartRace}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Poygani Boshlash</span>
            </button>
          )}

          {isCreator ? (
            <button
              onClick={handleDeleteRoom}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 rounded-xl text-xs font-semibold cursor-pointer"
              title="Guruhni butunlay yakunlash va o'chirish"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Guruhni Yakunlash</span>
            </button>
          ) : (
            <button
              onClick={onLeave}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Chiqish</span>
            </button>
          )}
        </div>
      </div>

      {/* Ortga sanash ekrani */}
      {countdown !== null && (
        <div className="p-3 bg-cyan-950/60 border border-cyan-500/60 rounded-xl text-center">
          <div className="text-3xl sm:text-4xl font-black text-cyan-300 font-mono animate-bounce">
            {countdown === 0 ? 'START! 🏁' : countdown}
          </div>
          <p className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">
            Barcha ishtirokchilar uchun poyga boshlanmoqda!
          </p>
        </div>
      )}

      {/* Haqiqiy poyga trassasi (Barcha mashinalar jonli va barqaror harakatlanadi) */}
      <HighwayRaceTrack
        racers={participants}
        roomName={roomData?.name}
        roomId={roomId}
      />

      {/* Yozish maydoni */}
      {isRacing ? (
        <WordsTypingArena
          wordsList={wordsList}
          onProgressUpdate={handleProgressUpdate}
          onFinish={handleFinish}
          isGameActive={true}
        />
      ) : (
        <div className="p-4 bg-[#090e1c] border border-slate-800 rounded-xl text-center space-y-1.5">
          <div className="text-xs sm:text-sm font-bold text-white">
            {isCreator
              ? 'Ishtirokchilar qoʻshilishini kuting yoki yuqoridagi "Poygani Boshlash" tugmasini bosing'
              : 'Guruh yaratuvchisi poygani boshlashini kuting...'}
          </div>
          <p className="text-[11px] text-slate-400">
            Doʻstlaringizga xona ID si: <strong className="text-cyan-400 font-mono px-1 py-0.5 bg-cyan-950/60 rounded border border-cyan-800/60">{roomId}</strong> ni bering (10 tagacha ishtirokchi).
          </p>
        </div>
      )}

      {/* Sinov yakunidagi batafsil natijalar modal oynasi */}
      {raceStats && (
        <RaceResultsModal
          stats={raceStats}
          participants={participants.map(p => ({
            id: p.id,
            name: p.name,
            avatar: '🏎️',
            isUser: p.isUser,
            progress: p.progress,
            currentWpm: p.currentWpm,
            rawWpm: p.currentWpm,
            accuracy: p.accuracy,
            finished: p.finished,
            finishTimeSeconds: p.finishTime,
            rank: p.rank,
            color: '#00E5FF'
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
