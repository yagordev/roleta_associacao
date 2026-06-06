import { Premio } from '../services/supabase';
import { Gift } from 'lucide-react';

interface Props {
  premios: Premio[];
}

export function AvailablePrizesFeed({ premios }: Props) {
  // Filtra "Tente Outra Vez" e "Perdeu a Vez" baseando-se no estoque infinito
  const physicalPrizes = premios.filter(p => 
    p.quantidade_estoque > 0 && 
    p.quantidade_estoque < 999999
  );

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex-1 flex flex-col relative overflow-hidden">
      {/* Accent glow line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FFC107] to-[#E53935]"></div>

      <div className="flex items-center gap-3 mb-6">
        <div className="bg-[#FFC107]/20 p-3 rounded-2xl text-[#E53935]">
          <Gift size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Prêmios em Estoque</h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
        {physicalPrizes.map((premio) => (
          <div key={premio.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:scale-[1.02]">
            <span className="font-bold text-slate-700">{premio.nome}</span>
            <span className="bg-[#43A047]/10 text-[#43A047] px-3 py-1 rounded-full text-sm font-black border border-[#43A047]/20">
              {premio.quantidade_estoque} un
            </span>
          </div>
        ))}
        {physicalPrizes.length === 0 && (
          <p className="text-slate-500 text-center mt-10">Nenhum prêmio cadastrado.</p>
        )}
      </div>
    </div>
  );
}
