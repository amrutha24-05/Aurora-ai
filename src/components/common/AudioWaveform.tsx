import React from 'react';

interface AudioWaveformProps {
  isActive: boolean;
  amplitude?: number;
  barCount?: number;
  heightClass?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isActive,
  amplitude = 0.5,
  barCount = 14,
  heightClass = 'h-8',
}) => {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#EEF3EA] rounded-full border border-[#E3EADF] shadow-xs ${heightClass}`}>
      {bars.map(i => {
        const distanceToCenter = Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
        const dynamicFactor = isActive 
          ? Math.max(20, Math.sin(Date.now() / 150 + i * 0.5) * 40 * amplitude + 35 * (1 - distanceToCenter * 0.4)) 
          : 15;

        return (
          <span
            key={i}
            className="w-1 rounded-full transition-all duration-100"
            style={{
              height: `${Math.min(100, Math.max(12, dynamicFactor))}%`,
              background: isActive
                ? 'linear-gradient(to top, #527653, #F4B183)'
                : '#A8C3A0',
              opacity: isActive ? 1 : 0.4,
            }}
          />
        );
      })}
    </div>
  );
};
