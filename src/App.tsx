import React, { useState } from 'react';
import { RacingBackground } from './components/RacingBackground';
import { SoloRaceArena } from './components/SoloRaceArena';
import { MultiplayerRoom } from './components/MultiplayerRoom';
import { ModeModal, ModeType } from './components/ModeModal';
import { generate5000Words } from './data/words';
import { SwitchSoundType, sounds } from './utils/soundEffects';
import { DifficultyLevel } from './types';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  // Tovush sozlamalari
  const [soundType, setSoundType] = useState<SwitchSoundType>('thock');

  // Ilova holati: Foydalanuvchi talabiga ko'ra saytga kirgandan TO'G'RIDAN-TO'G'RI O'YIN BO'LIB OCHILADI ('solo')
  const [viewState, setViewState] = useState<'solo' | 'room'>('solo');
  const [soloDifficulty, setSoloDifficulty] = useState<DifficultyLevel>(() => {
    try {
      return (localStorage.getItem('tg_user_diff') as DifficultyLevel) || 'easy';
    } catch {
      return 'easy';
    }
  });

  // Foydalanuvchi ma'lumotlari (Avtomatik saqlangan yoki standart "Poygachi")
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    carId: string;
  }>(() => {
    let savedName = 'Poygachi';
    let savedCar = 'bmw';
    try {
      savedName = localStorage.getItem('tg_user_name') || 'Poygachi';
      savedCar = localStorage.getItem('tg_user_car') || 'bmw';
    } catch {
      // ignore
    }
    return {
      id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: savedName,
      carId: savedCar
    };
  });

  // Guruh multiplayer modali holati ('join' | 'create' | null)
  const [multiplayerModalMode, setMultiplayerModalMode] = useState<ModeType | null>(null);

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

  // Yakka poyga boshlash
  const handleStartSolo = (userName: string, carId: string, difficulty: DifficultyLevel = 'easy') => {
    setCurrentUser((prev) => ({
      ...prev,
      name: userName,
      carId
    }));
    setSoloDifficulty(difficulty);
    setViewState('solo');
    setMultiplayerModalMode(null);
  };

  // Guruhga qo'shilish (6 raqamli ID orqali)
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
      setMultiplayerModalMode(null);
    } catch (e: any) {
      console.error("Guruhga qo'shilishda xatolik:", e);
      setGlobalError('Guruhga qoʻshilishda xatolik yuz berdi. Iltimos, qayta urinib koʻring.');
    } finally {
      setLoadingAction(null);
    }
  };

  // Yangi guruh yaratish (vaqtinchalik 6 raqamlik ID)
  const handleCreateGroup = async (groupName: string, userName: string, carId: string) => {
    setLoadingAction('Yangi xona va 6 raqamlik ID yaratilmoqda...');
    setGlobalError(null);

    try {
      const random6DigitId = String(Math.floor(100000 + Math.random() * 900000));
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
        createdAt: new Date().toISOString(),
        words: roomWords,
        countdown: null,
        targetDistance: 100
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
      setMultiplayerModalMode(null);
    } catch (e: any) {
      console.error("Guruh yaratishda xatolik:", e);
      setGlobalError('Guruh yaratishda xatolik yuz berdi. Iltimos, qayta urinib koʻring.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleLeaveCurrentRoom = () => {
    setActiveRoom(null);
    setViewState('solo');
  };

  return (
    // Foydalanuvchi talabi: sayt emas bu o'yin bo'lsin, tashrif buyurganda o'yin bo'lib ochilsin va orqa fon poygadek bo'lsin
    <RacingBackground>
      <div className="h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
        {/* Yuklanmoqda bildirishnomasi */}
        {loadingAction && (
          <div className="m-2 p-2 bg-emerald-950/90 border border-emerald-500/70 rounded-xl text-emerald-300 text-xs text-center font-bold animate-pulse flex items-center justify-center gap-2 z-40 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{loadingAction}</span>
          </div>
        )}

        {/* Global xatolik */}
        {globalError && (
          <div className="m-2 p-2 bg-rose-950/90 border border-rose-500/80 rounded-xl text-rose-300 text-xs text-center font-bold z-40 shrink-0">
            {globalError}
          </div>
        )}

        {/* Asosiy O'yin Maydoni */}
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col justify-center w-full max-w-6xl mx-auto px-2 sm:px-4 py-1">
          {viewState === 'solo' && (
            <SoloRaceArena
              userName={currentUser.name}
              carId={currentUser.carId}
              initialDifficulty={soloDifficulty}
              onOpenMultiplayer={() => setMultiplayerModalMode('join')}
              onChangeCar={(newCarId) => setCurrentUser(prev => ({ ...prev, carId: newCarId }))}
              onChangeName={(newName) => setCurrentUser(prev => ({ ...prev, name: newName }))}
              soundType={soundType}
              onToggleSound={handleToggleSound}
            />
          )}

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

        {/* Guruhga qo'shilish / yaratish modali */}
        {multiplayerModalMode && (
          <ModeModal
            mode={multiplayerModalMode}
            onClose={() => setMultiplayerModalMode(null)}
            onStartSolo={handleStartSolo}
            onJoinGroup={handleJoinGroup}
            onCreateGroup={handleCreateGroup}
          />
        )}
      </div>
    </RacingBackground>
  );
}
