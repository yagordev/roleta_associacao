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
      <div className="bg-white border-[6px] border-[#FFC107] rounded-3xl shadow-[0_0_50px_rgba(255,193,7,0.6)] p-12 text-center transform scale-110 relative overflow-hidden">
        {/* Adorno de coração da logo atrás do texto se quiser, mas mantendo simples: */}
        <h2 className="text-4xl font-extrabold text-[#E53935] mb-2 uppercase tracking-widest drop-shadow-sm">
          {isRare ? '🎉 GRANDE PRÊMIO! 🎉' : 'PARABÉNS!'}
        </h2>
        <p className="text-6xl font-black text-[#0D47A1] my-6 drop-shadow-sm">
          {donorName}
        </p>
        <p className="text-2xl text-slate-500 font-bold">você ganhou:</p>
        <p className="text-5xl font-black text-[#43A047] mt-4 mb-2 drop-shadow-sm uppercase">
          {prizeName}
        </p>
      </div>
    </div>
  );
}
