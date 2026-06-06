import { useEffect, useState } from 'react';
import { supabase, type Doador } from '../services/supabase';

export function ClientRemote() {
  const [codigo, setCodigo] = useState('');
  const [doador, setDoador] = useState<Doador | null>(null);
  const [isFirst, setIsFirst] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [spinStatus, setSpinStatus] = useState<'idle' | 'spinning' | 'done'>('idle');

  // Verifica a posição na fila constantemente
  useEffect(() => {
    if (!doador?.id) return;

    let isMounted = true;

    const checkQueue = async () => {
      // 1. Atualiza os dados locais do doador atual para saber se os giros acabaram
      const { data: currentDoador } = await supabase
        .from('doadores_giros')
        .select('*')
        .eq('id', doador.id)
        .single();
        
      if (isMounted && currentDoador) {
        setDoador(currentDoador as Doador);
      }

      // 2. Verifica quem é o primeiro da fila para liberar o botão
      const { data: nextInLine } = await supabase
        .from('doadores_giros')
        .select('*')
        .gt('giros_restantes', 0)
        .order('criado_em', { ascending: true })
        .limit(1);

      if (isMounted) {
        if (nextInLine && nextInLine.length > 0) {
          setIsFirst(nextInLine[0].id === doador.id);
        } else {
          setIsFirst(false);
        }
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 2000); // Poll a cada 2s
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [doador?.id]);

  // Se os giros chegarem a 0, finaliza
  useEffect(() => {
    if (doador && doador.giros_restantes === 0 && spinStatus !== 'spinning') {
      setSpinStatus('done');
    }
  }, [doador, spinStatus]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { data } = await supabase
      .from('doadores_giros')
      .select('*')
      .eq('codigo_acesso', codigo.toUpperCase())
      .single();

    setIsLoading(false);

    if (data) {
      if (data.giros_restantes > 0) {
        setDoador(data as Doador);
      } else {
        setError('Este código já não possui mais giros disponíveis.');
      }
    } else {
      setError('Código inválido ou não encontrado.');
    }
  };

  const handleSpinClick = () => {
    if (!isFirst || spinStatus === 'spinning') return;
    
    // Dispara o evento para a TV
    supabase.channel('roulette-events').send({
      type: 'broadcast',
      event: 'spin_now',
      payload: { codigo: doador?.codigo_acesso }
    });

    setSpinStatus('spinning');

    // Libera o botão novamente após 8 segundos (dá tempo da TV rodar e atualizar o banco)
    setTimeout(() => {
      setSpinStatus('idle');
    }, 8000);
  };

  const handleReset = () => {
    setDoador(null);
    setCodigo('');
    setSpinStatus('idle');
    setError('');
  };

  if (!doador) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl">
          <h1 className="text-3xl font-black text-center text-[#FFC107] mb-2 uppercase tracking-wide">Roleta Solidária</h1>
          <p className="text-center text-slate-300 mb-8 font-medium">Digite seu código de acesso para jogar.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="text" 
                maxLength={4}
                required 
                value={codigo} 
                onChange={e => setCodigo(e.target.value.toUpperCase())} 
                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-center text-4xl font-black text-white placeholder-white/20 uppercase tracking-widest focus:outline-none focus:border-[#FFC107] transition-all"
                placeholder="ABCD"
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center font-bold">{error}</p>}
            <button 
              type="submit" 
              disabled={isLoading || codigo.length < 4}
              className="w-full bg-[#43A047] hover:bg-[#2E7D32] disabled:opacity-50 text-white font-bold rounded-xl py-4 transition-all uppercase tracking-wider text-lg"
            >
              {isLoading ? 'Conectando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (spinStatus === 'done' || doador.giros_restantes === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans text-center">
         <div className="w-full max-w-sm">
            <h1 className="text-5xl mb-4">🎉</h1>
            <h2 className="text-3xl font-black text-[#FFC107] mb-2 uppercase tracking-wide">Giros Finalizados!</h2>
            <p className="text-slate-300 text-lg mb-6">Todos os seus giros foram realizados!<br/>Olhe para a TV para ver o seu prêmio.</p>
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <p className="text-slate-200 text-sm font-medium">Quer continuar jogando e ajudando?</p>
              <p className="text-[#FFC107] font-bold text-base mt-1">Vá até o balcão e recarregue seus giros!</p>
            </div>
            <button 
              onClick={handleReset}
              className="mt-8 w-full bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl py-4 transition-all uppercase tracking-wider text-lg shadow-lg border border-slate-600"
            >
              Inserir Novo Código
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="w-full max-w-sm flex flex-col items-center">
        <h2 className="text-xl font-bold text-slate-300 mb-1">Olá, <span className="text-white">{doador.nome}</span></h2>
        <div className="bg-[#0D47A1]/30 border border-[#0D47A1] rounded-full px-6 py-2 mb-12">
          <p className="font-bold text-xl text-[#64B5F6]">{doador.giros_restantes} Giros Disponíveis</p>
        </div>

        {spinStatus === 'spinning' ? (
          <div className="text-center animate-pulse">
            <div className="w-64 h-64 mx-auto rounded-full bg-[#FFC107]/20 border-4 border-[#FFC107] flex items-center justify-center shadow-[0_0_50px_rgba(255,193,7,0.4)]">
               <span className="text-3xl font-black text-[#FFC107] uppercase">Sorteando...</span>
            </div>
            <p className="mt-8 text-2xl font-bold text-white">Olhe para a TV!</p>
          </div>
        ) : isFirst ? (
          <div className="text-center w-full">
            <button 
              onClick={handleSpinClick}
              className="w-64 h-64 mx-auto rounded-full bg-gradient-to-br from-[#E53935] to-[#B71C1C] border-8 border-white/10 shadow-[0_20px_50px_rgba(229,57,53,0.5)] flex items-center justify-center active:scale-95 transition-transform group"
            >
               <span className="text-4xl font-black text-white uppercase tracking-widest drop-shadow-md group-hover:scale-110 transition-transform">Girar</span>
            </button>
            <p className="mt-8 text-xl font-bold text-[#FFC107] animate-bounce">Sua vez! Aperte o botão!</p>
          </div>
        ) : (
          <div className="text-center opacity-50">
            <div className="w-64 h-64 mx-auto rounded-full bg-slate-800 border-4 border-slate-600 flex items-center justify-center">
               <span className="text-xl font-bold text-slate-400 uppercase">Aguarde...</span>
            </div>
            <p className="mt-8 text-lg font-bold text-slate-400">Tem gente na sua frente na fila.</p>
          </div>
        )}
      </div>
    </div>
  );
}
