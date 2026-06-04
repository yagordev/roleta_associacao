import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

interface WinnerModalProps {
  isOpen: boolean;
  donorName: string;
  prizeName: string;
  isRare: boolean;
  onClose: () => void;
}

export function WinnerModal({ isOpen, donorName, prizeName, isRare, onClose }: WinnerModalProps) {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (isOpen) {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      const timer = setTimeout(() => {
        onClose();
      }, 6000); // Close after 6 seconds
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-pop-in">
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={isRare ? 800 : 300}
        gravity={isRare ? 0.2 : 0.4}
        colors={['#0D47A1', '#43A047', '#0288D1', '#8BC34A', '#E53935', '#FFC107']}
      />
      <div className="bg-white/95 backdrop-blur-2xl border-[6px] border-[#FFC107] rounded-3xl shadow-[0_0_50px_rgba(255,193,7,0.6)] p-12 text-center transform scale-110 relative overflow-hidden">
        {/* Glow de fundo no modal */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#43A047]/10 to-transparent"></div>
        
        <h2 className="text-4xl font-extrabold text-[#E53935] mb-2 uppercase tracking-widest drop-shadow-sm relative z-10">
          {isRare ? '🎉 GRANDE PRÊMIO! 🎉' : 'PARABÉNS!'}
        </h2>
        <p className="text-6xl font-black text-[#0D47A1] my-6 drop-shadow-sm relative z-10">
          {donorName}
        </p>
        <p className="text-2xl text-slate-500 font-bold relative z-10">você ganhou:</p>
        <p className="text-5xl font-black text-[#43A047] mt-4 mb-2 drop-shadow-sm uppercase relative z-10">
          {prizeName}
        </p>
      </div>
    </div>
  );
}
