import { useEffect, useState, useRef } from 'react';
import { supabase, type Ganhador } from '../services/supabase';
import { Trophy } from 'lucide-react';

interface RecentWinnersFeedProps {
  isSpinning: boolean;
}

export function RecentWinnersFeed({ isSpinning }: RecentWinnersFeedProps) {
  const [winners, setWinners] = useState<Ganhador[]>([]);
  const [pendingWinners, setPendingWinners] = useState<Ganhador[]>([]);
  const isSpinningRef = useRef(isSpinning);

  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  useEffect(() => {
    fetchWinners();

    const subscription = supabase
      .channel('ganhadores_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ganhadores' }, (payload) => {
        const newWinner = payload.new as Ganhador;
        // Se a roleta estiver girando (ou prestes a), guardamos em pending
        if (isSpinningRef.current) {
          setPendingWinners(prev => [newWinner, ...prev]);
        } else {
          setWinners(prev => [newWinner, ...prev].slice(0, 5));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Executa apenas no mount

  // Esvazia os pendentes assim que a roleta parar
  useEffect(() => {
    if (!isSpinning && pendingWinners.length > 0) {
      setWinners(prev => [...pendingWinners, ...prev].slice(0, 5));
      setPendingWinners([]);
    }
  }, [isSpinning, pendingWinners]);

  const fetchWinners = async () => {
    const { data } = await supabase
      .from('ganhadores')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(5);
    if (data) setWinners(data as Ganhador[]);
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] h-full flex flex-col relative overflow-hidden">
      <div className="absolute -top-10 -right-10 text-slate-100 opacity-50 rotate-12">
        <Trophy size={180} />
      </div>
      <h3 className="text-xl font-black text-[#0D47A1] mb-6 flex items-center gap-2 relative z-10 tracking-tight">
        <Trophy size={24} className="text-[#FFC107]" /> ÚLTIMOS GANHADORES
      </h3>
      <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar relative z-10">
        {winners.length === 0 ? (
          <p className="text-slate-400 font-medium text-center mt-10">Nenhum ganhador ainda. Seja o primeiro!</p>
        ) : (
          winners.map((w) => (
            <div key={w.id} className="bg-white p-4 rounded-xl border-l-4 border-l-[#43A047] border border-slate-100 shadow-sm animate-pop-in">
              <p className="font-bold text-[#0D47A1] text-lg">{w.doador_nome}</p>
              <p className="text-[#43A047] text-sm font-bold mt-1">Ganhou: <span className="text-slate-600 font-medium">{w.premio_nome}</span></p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
