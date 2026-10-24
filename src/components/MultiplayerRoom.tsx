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
  isCreator,
  onLeave
}) => {
  const [roomData, setRoomData] = useState<any>(null);
  const [participants, setParticipants] = useState<HighwayRacer[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [raceStats, setRaceStats] = useState<RaceStats | null>(null);
  const [roomClosed, setRoomClosed] = useState(false);

  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const roomRef = doc(db, 'rooms', roomId);
    const unsubRoom = onSnapshot(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
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

  const handleProgressUpdate = React.useCallback(async (progress: number, wpm: number, accuracy: number, totalChars: number, errors: number) => {
    const now = Date.now();
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
      // ignore
    }
  }, [roomId, myId]);

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
      const targetMeters = roomData?.targetDistance || 100;
      const targetChars = targetMeters === 1000 ? 850 : targetMeters === 500 ? 450 : 100;
      await updateDoc(myRef, {
        progress: 100,
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
  }, [roomId, myId, roomData?.targetDistance]);

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
      <div className="w-full max-w-md mx-auto p-6 bg-[#0a0f1d] border border-rose-500/40 rounded-2xl text-center space-y-3 my-auto">
        <div className="w-10 h-10 rounded-full bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-bold text-white">Guruh Yakunlandi</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Ushbu xona yaratuvchi tomonidan yakunlandi va barcha maʼlumotlar toʻliq oʻchirildi.
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
    <div className="w-full h-full max-w-5xl mx-auto flex flex-col justify-between py-1 px-2 select-none">
      {/* 1. Xona Boshqaruv Qatori (Ixcham Arcade HUD) */}
      <div className="flex items-center justify-between gap-2 px-1 py-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-white font-mono truncate max-w-[150px]">
            {roomData?.name || 'Multiplayer Poyga'}
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-950/90 border border-emerald-600/70 rounded-md text-[11px] font-mono">
            <span className="text-emerald-400 font-bold">ID:</span>
            <strong className="text-white font-bold">{roomId}</strong>
            <button
              onClick={handleCopyId}
              className="ml-1 text-emerald-400 hover:text-white cursor-pointer"
              title="Nusxa olish"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <Users className="w-3 h-3 text-cyan-400" />
            <span>{participants.length}/10</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCreator && roomData?.status !== 'racing' && (
            <button
              onClick={handleStartRace}
              className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 text-black font-extrabold text-xs rounded-lg shadow-md cursor-pointer animate-pulse"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>START RACE</span>
            </button>
          )}

          {isCreator ? (
            <button
              onClick={handleDeleteRoom}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Yakunlash</span>
            </button>
          ) : (
            <button
              onClick={onLeave}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Chiqish</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Haqiqiy Arcade Poyga Trassasi (Barcha jonli o'yinchilar bilan) */}
      <div className="my-auto py-1 relative">
        <HighwayRaceTrack
          racers={participants}
          roomName={roomData?.name}
          roomId={roomId}
        />

        {/* 3... 2... 1... START! Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-xs z-30 rounded-2xl flex flex-col items-center justify-center animate-fade-in pointer-events-none">
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
              {countdown === 0 ? 'POYGA BOSHLANDI!' : 'BARCHA OʻYINCHILAR TAYYORLANSIN...'}
            </p>
          </div>
        )}
      </div>

      {/* 3. Spidometr va Bir Qatorlik Yozish Konsoli */}
      <div className="pt-1">
        {isRacing ? (
          <WordsTypingArena
            wordsList={wordsList}
            onProgressUpdate={handleProgressUpdate}
            onFinish={handleFinish}
            isGameActive={true}
            countdownActive={countdown !== null}
            selectedDistance={roomData?.targetDistance || 100}
          />
        ) : (
          <div className="p-3 bg-[#0d1420] border border-slate-800 rounded-xl text-center">
            <span className="text-xs sm:text-sm font-bold text-white font-mono">
              {isCreator
                ? '🎮 Oʻyinchilar qoʻshilishini kuting va yuqoridagi "START RACE" tugmasini bosing'
                : '⏳ Xona yaratuvchisi poygani boshlashini kuting...'}
            </span>
          </div>
        )}
      </div>

      {/* Natijalar modali */}
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
