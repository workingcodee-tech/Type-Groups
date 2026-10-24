import React from 'react';
import { FAMOUS_CARS, RacingCar } from '../data/cars';

interface CarSpriteProps {
  carId: string;
  playerName: string;
  currentWpm: number;
  isUser: boolean;
  rank?: number;
}

export const CarSprite: React.FC<CarSpriteProps> = ({
  carId,
  playerName,
  currentWpm,
  isUser,
  rank
}) => {
  const car: RacingCar = FAMOUS_CARS.find((c) => c.id === carId) || FAMOUS_CARS[0];

  return (
    <div className="relative flex flex-col items-center select-none pointer-events-none">
      {/* Egasining ismi kichkina qilib mashina ustiga yozilgan (Foydalanuvchi talabi 7) */}
      <div className={`mb-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold tracking-tight whitespace-nowrap flex items-center gap-1 shadow-sm border ${
        isUser
          ? 'bg-cyan-950/90 text-cyan-200 border-cyan-400 ring-1 ring-cyan-400/40'
          : 'bg-slate-900/90 text-slate-200 border-slate-700'
      }`}>
        <span className="truncate max-w-[70px]">{playerName}</span>
        {rank !== undefined && rank > 0 && (
          <span className="text-[8px] px-1 bg-amber-400/20 text-amber-300 rounded font-mono font-bold">
            #{rank}
          </span>
        )}
        <span className="text-[8px] text-cyan-400 font-mono font-semibold">
          {Math.round(currentWpm)}wpm
        </span>
      </div>

      {/* Barqaror, qaltiramaydigan haqiqiy sport mashinasi SVG */}
      <div className="relative w-14 h-7 flex items-center justify-center filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
        <svg
          viewBox="0 0 160 80"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Headlight beams */}
          <polygon
            points="140,24 165,16 165,30 140,26"
            fill={car.glowColor}
            opacity="0.3"
          />
          <polygon
            points="140,54 165,50 165,64 140,56"
            fill={car.glowColor}
            opacity="0.3"
          />

          {/* 4 Wheels */}
          <rect x="110" y="8" width="22" height="10" rx="3" fill="#090d16" stroke="#1e293b" strokeWidth="1" />
          <rect x="110" y="62" width="22" height="10" rx="3" fill="#090d16" stroke="#1e293b" strokeWidth="1" />
          <rect x="25" y="8" width="24" height="10" rx="3" fill="#090d16" stroke="#1e293b" strokeWidth="1" />
          <rect x="25" y="62" width="24" height="10" rx="3" fill="#090d16" stroke="#1e293b" strokeWidth="1" />

          {/* Main Car Body Chassis */}
          <path
            d="M 15 22 
               C 10 24, 8 32, 8 40 
               C 8 48, 10 56, 15 58 
               L 40 60 
               L 70 62 
               C 95 62, 120 59, 142 52 
               C 148 48, 150 44, 150 40 
               C 150 36, 148 32, 142 28 
               C 120 21, 95 18, 70 18 
               L 40 20 Z"
            fill={car.bodyColor}
            stroke="#0f172a"
            strokeWidth="1.5"
          />

          {/* Racing Center Stripe */}
          <path
            d="M 12 37 L 148 37 L 148 43 L 12 43 Z"
            fill={car.stripeColor}
            opacity="0.9"
          />

          {/* Windshield & Cockpit */}
          <path
            d="M 55 26 
               C 70 26, 92 28, 100 32 
               L 100 48 
               C 92 52, 70 54, 55 54 
               C 46 54, 42 48, 42 40 
               C 42 32, 46 26, 55 26 Z"
            fill={car.glassColor}
            stroke="#334155"
            strokeWidth="1.2"
          />

          {/* Driver Helmet View */}
          <circle cx="68" cy="40" r="5" fill="#f8fafc" />
          <circle cx="70" cy="40" r="3" fill="#0284c7" />

          {/* Front Hood Scoop Lines */}
          <line x1="110" y1="34" x2="135" y2="35" stroke="#000000" strokeWidth="1" opacity="0.4" />
          <line x1="110" y1="46" x2="135" y2="45" stroke="#000000" strokeWidth="1" opacity="0.4" />

          {/* Rear Spoiler */}
          <rect x="6" y="20" width="6" height="40" rx="2" fill="#020617" stroke="#334155" strokeWidth="1" />

          {/* Taillights */}
          <rect x="9" y="24" width="2" height="6" rx="1" fill="#ef4444" />
          <rect x="9" y="50" width="2" height="6" rx="1" fill="#ef4444" />

          {/* Headlights */}
          <ellipse cx="143" cy="27" rx="3" ry="2" fill="#ffffff" />
          <ellipse cx="143" cy="53" rx="3" ry="2" fill="#ffffff" />
        </svg>
      </div>

      {/* Mashina modeli nomi kichkina */}
      <span className="text-[8px] text-slate-400 font-mono tracking-tight leading-none truncate max-w-[80px]">
        {car.shortLabel}
      </span>
    </div>
  );
};
