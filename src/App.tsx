import React, { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeModeSelector } from './components/HomeModeSelector';
import { SoloRaceArena } from './components/SoloRaceArena';
import { MultiplayerRoom } from './components/MultiplayerRoom';
import { generate5000Words } from './data/words';
import { SwitchSoundType, sounds } from './utils/soundEffects';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  // Tovush sozlamalari
  const [soundType, setSoundType] = useState<SwitchSoundType>('thock');

  // Ilova holati: 'home' | 'solo' | 'room'
  const [viewState, setViewState] = useState<'home' | 'solo' | 'room'>('home');

  // Foydalanuvchi ma'lumotlari
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    carId: string;
  }>({
    id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: '',
    carId: 'bmw'
  });

  // Faol xona ma'lumotlari
  const [activeRoom, setActiveRoom] = useState<{
    id: string;
    isCreator: boolean;
  } | null>(null);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Tovushni almashtirish
  const handleToggleSound = () => {
    const cycle: SwitchSoundType[] = ['thock', 'blue', 'brown', 'red', 'off'];
    const nextIdx = (cycle.indexOf(soundType) + 1) % cycle.length;
    const nextSound = cycle[nextIdx];
    setSoundType(nextSound);
    sounds.setSoundType(nextSound);
    if (nextSound !== 'off') {
      sounds.playKey('Space', true, false);
    }
  };

  // 1-Bo'lim: Bir o'zim yozaman (Solo)
  const handleStartSolo = (userName: string, carId: string) => {
    setCurrentUser((prev) => ({
      ...prev,
      name: userName,
      carId
    }));
    setViewState('solo');
  };

  // 2-Bo'lim: Guruhga qo'shilish (6 raqamli ID orqali)
  const handleJoinGroup = async (roomId: string, userName: string, carId: string) => {
    setLoadingAction('Xonaga ulanilmoqda...');
    setGlobalError(null);

    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        setGlobalError(`"${roomId}" raqamli xona topilmadi. ID toʻgʻri kiritilganini tekshiring.`);
        setLoadingAction(null);
        return;
      }

      // Xonadagi ishtirokchilar sonini tekshirish (ko'pi bilan 10 ta)
      const participantsRef = collection(db, 'rooms', roomId, 'participants');
      const participantsSnap = await getDocs(participantsRef);

      if (participantsSnap.size >= 10) {
        setGlobalError('Kechirasiz, ushbu guruh toʻlgan (maksimal 10 ta ishtirokchi).');
        setLoadingAction(null);
        return;
      }

      const myId = currentUser.id;
      // Ishtirokchi sifatida ro'yxatdan o'tish
      await setDoc(doc(db, 'rooms', roomId, 'participants', myId), {
        id: myId,
        name: userName,
        carId,
        progress: 0,
        currentWpm: 0,
        accuracy: 100,
        totalChars: 0,
        errors: 0,
        finished: false,
        isCreator: false,
        joinedAt: new Date().toISOString()
      });

      setCurrentUser((prev) => ({
        ...prev,
        name: userName,
        carId
      }));

      setActiveRoom({
        id: roomId,
        isCreator: false
      });

      setViewState('room');
    } catch (e: any) {
      console.error("Guruhga qo'shilishda xatolik:", e);
      setGlobalError('Guruhga qoʻshilishda xatolik yuz berdi. Iltimos, qayta urinib koʻring.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 3-Bo'lim: Yangi guruh yaratish (vaqtinchalik 6 raqamlik ID)
  const handleCreateGroup = async (groupName: string, userName: string, carId: string) => {
    setLoadingAction('Yangi xona va 6 raqamlik ID yaratilmoqda...');
    setGlobalError(null);

    try {
      // 6 raqamli vaqtinchalik tasodifiy xona ID si (masalan: 749215)
      const random6DigitId = String(Math.floor(100000 + Math.random() * 900000));
      // Xona uchun 5000 ta tasodifiy inglizcha so'zlar
      const roomWords = generate5000Words();
      const myId = currentUser.id;

      // Xona hujjatini yaratish
      const roomRef = doc(db, 'rooms', random6DigitId);
      await setDoc(roomRef, {
        id: random6DigitId,
        name: groupName,
        creatorId: myId,
        creatorName: userName,
        status: 'waiting',
        words: roomWords,
        maxMembers: 10,
        createdAt: new Date().toISOString()
      });

      // Yaratuvchini ishtirokchi sifatida qo'shish
      await setDoc(doc(db, 'rooms', random6DigitId, 'participants', myId), {
        id: myId,
        name: userName,
        carId,
        progress: 0,
        currentWpm: 0,
        accuracy: 100,
        totalChars: 0,
        errors: 0,
        finished: false,
        isCreator: true,
        joinedAt: new Date().toISOString()
      });

      setCurrentUser((prev) => ({
        ...prev,
        name: userName,
        carId
      }));

      setActiveRoom({
        id: random6DigitId,
        isCreator: true
      });

      setViewState('room');
    } catch (e: any) {
      console.error("Guruh yaratishda xatolik:", e);
      setGlobalError('Guruh yaratishda xatolik yuz berdi. Iltimos, qayta urinib koʻring.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleLeaveCurrentRoom = () => {
    setActiveRoom(null);
    setViewState('home');
  };

  return (
    // Foydalanuvchi talabi 8: Sayt umuman scrol bo'lmasin. Hamma ma'lumot scrol qilmasa ham chiroyli ko'rinsin!
    <div className="h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Sarlavha (Header: Barcha qo'shimcha bo'limlar va admin paneli o'chirilgan) */}
      <Header
        soundType={soundType}
        onToggleSound={handleToggleSound}
        activeRoomId={activeRoom?.id}
        onLeaveRoom={handleLeaveCurrentRoom}
        onGoHome={() => setViewState('home')}
      />

      {/* Asosiy maydon - Scrol bo'lmaydigan, to'liq ekranga moslashgan */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col justify-center max-w-6xl w-full mx-auto px-3 sm:px-6 py-2">
        {/* Yuklanmoqda bildirishnomasi */}
        {loadingAction && (
          <div className="mb-2 p-2 bg-cyan-950/60 border border-cyan-500/50 rounded-xl text-cyan-300 text-xs text-center font-medium animate-pulse flex items-center justify-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>{loadingAction}</span>
          </div>
        )}

        {/* Global xatolik */}
        {globalError && (
          <div className="mb-2 p-2 bg-rose-950/70 border border-rose-500/60 rounded-xl text-rose-300 text-xs text-center font-medium shrink-0">
            {globalError}
          </div>
        )}

        {/* Bosh sahifa: 3 ta bo'lim tanlovi */}
        {viewState === 'home' && (
          <div className="space-y-4 my-auto">
            {/* Rasmiy logotip va brend bloki (Ixcham, yuqori sifatli va scrolsiz) */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#0c1427] to-[#080d19] border border-cyan-500/20 p-4 sm:p-5 shadow-xl">
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] text-cyan-400 font-semibold tracking-wider uppercase font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span>Jonli Avtomobil Trassasi va Tez Yozish Platformasi</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                    Type <span className="text-cyan-400">Groups</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
                    Mashhur sport avtomobillari bilan poyga trassasida klaviatura tezligingizni sinang.
                    Ishlab chiquvchi: <strong className="text-cyan-300 font-semibold">WORKING CODE</strong>.
                  </p>
                </div>

                {/* Rasmiy doiraviy logotip (Asl mutanosiblik, begona ramkasiz) */}
                <div className="shrink-0 flex flex-col items-center">
                  <img
                    src="/type-groups-logo.png"
                    alt="Type Groups Rasmiy Logotipi"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-full transition-transform hover:scale-105 duration-300"
                    width={96}
                    height={96}
                  />
                  <span className="text-[10px] text-cyan-400/90 font-mono font-medium mt-1">
                    WORKING CODE
                  </span>
                </div>
              </div>
            </div>

            {/* 3 ta bo'lim orqali tanlov (Modal oynani chaqiradi) */}
            <HomeModeSelector
              onStartSolo={handleStartSolo}
              onJoinGroup={handleJoinGroup}
              onCreateGroup={handleCreateGroup}
            />
          </div>
        )}

        {/* 1-Bo'lim: Bir o'zim yozaman (Solo) */}
        {viewState === 'solo' && (
          <SoloRaceArena
            userName={currentUser.name}
            carId={currentUser.carId}
            onBack={() => setViewState('home')}
          />
        )}

        {/* 2 & 3-Bo'lim: Vaqtinchalik multiplayer xona */}
        {viewState === 'room' && activeRoom && (
          <MultiplayerRoom
            roomId={activeRoom.id}
            myId={currentUser.id}
            myName={currentUser.name}
            myCarId={currentUser.carId}
            isCreator={activeRoom.isCreator}
            onLeave={handleLeaveCurrentRoom}
          />
        )}
      </main>

      {/* Sokin Futer */}
      <Footer />
    </div>
  );
}
