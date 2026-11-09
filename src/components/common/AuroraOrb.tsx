import React from 'react';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface AuroraOrbProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  state?: OrbState;
  isPulsing?: boolean; // legacy compatibility
}

export const AuroraOrb: React.FC<AuroraOrbProps> = ({ 
  size = 'hero', 
  state = 'idle',
  isPulsing = false 
}) => {
  const activeState: OrbState = isPulsing && state === 'idle' ? 'speaking' : state;

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-24 h-24',
    lg: 'w-48 h-48',
    hero: 'w-72 h-72 md:w-96 md:h-96',
  };

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses[size]}`}>
      {/* Outer diffuse aurora glow - Soft Sage & Light Peach */}
      <div 
        className={`absolute inset-0 rounded-full blur-3xl transition-all duration-1000 ${
          activeState === 'listening' 
            ? 'scale-125 opacity-90' 
            : activeState === 'speaking'
            ? 'scale-115 opacity-80 animate-pulse'
            : 'scale-100 opacity-60'
        }`}
        style={{
          background: 'radial-gradient(circle, rgba(168,195,160,0.55) 0%, rgba(244,177,131,0.4) 45%, rgba(251,229,212,0.3) 70%, transparent 85%)',
        }}
      />

      {/* Listening Expanding Rings */}
      {activeState === 'listening' && (
        <>
          <div 
            className="absolute inset-0 rounded-full border border-[#A8C3A0]/60 animate-ping"
            style={{ animationDuration: '2.5s' }}
          />
          <div 
            className="absolute -inset-4 rounded-full border border-[#F4B183]/50 animate-ping"
            style={{ animationDuration: '3.5s', animationDelay: '0.6s' }}
          />
        </>
      )}

      {/* Secondary rotating gradient ring - Thinking & Idle */}
      <div 
        className={`absolute inset-3 rounded-full blur-xl opacity-75 ${
          activeState === 'thinking' ? 'animate-spin' : 'animate-pulse'
        }`}
        style={{
          background: 'conic-gradient(from 0deg, #A8C3A0, #F4B183, #FBE5D4, #EEF3EA, #A8C3A0)',
          animationDuration: activeState === 'thinking' ? '4s' : '7s',
        }}
      />

      {/* Inner glass orb core: Warm ivory, gentle breathing */}
      <div 
        className="relative w-4/5 h-4/5 rounded-full backdrop-blur-md border border-white/80 shadow-sm flex items-center justify-center overflow-hidden transition-transform duration-700"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #FFFFFF, #F7F8F2 45%, #EEF3EA 80%, #E3EADF)',
          boxShadow: 'inset 0 0 30px rgba(168,195,160,0.35), 0 10px 40px -10px rgba(82,118,83,0.18)',
        }}
      >
        {/* Organic wavy pastel aurora streams */}
        <div 
          className="absolute inset-0 opacity-60 mix-blend-multiply"
          style={{
            backgroundImage: 'radial-gradient(circle at 40% 40%, rgba(168,195,160,0.7) 15%, transparent 60%), radial-gradient(circle at 75% 25%, rgba(244,177,131,0.65) 20%, transparent 55%), radial-gradient(circle at 50% 80%, rgba(245,235,199,0.7) 20%, transparent 60%)',
            transform: activeState === 'speaking' ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.4s ease',
          }}
        />

        {/* Delicate floating light center star */}
        <div className="w-4 h-4 rounded-full bg-[#FFFFFF] shadow-[0_0_16px_rgba(244,177,131,0.8)]" />
        <div className="absolute w-2 h-2 rounded-full bg-[#527653] opacity-40" />
      </div>
    </div>
  );
};
