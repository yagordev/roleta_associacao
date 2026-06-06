import { useEffect, useState, useRef } from 'react';
import { CustomWheel } from '../components/CustomWheel';
import { supabase, type Premio } from '../services/supabase';
import { RecentWinnersFeed } from '../components/RecentWinnersFeed';
import { AvailablePrizesFeed } from '../components/AvailablePrizesFeed';
import { WinnerModal } from '../components/WinnerModal';
import { useAudio } from '../hooks/useAudio';
import { useRouletteLogic } from '../hooks/useRouletteLogic';
import { Volume2, VolumeX, PlayCircle } from 'lucide-react';

export function PublicScreen() {
  const [premios, setPremios] = useState<Premio[]>([]);
  const premiosRef = useRef<Premio[]>([]);

  useEffect(() => {
    premiosRef.current = premios;
  }, [premios]);

  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [winnerInfo, setWinnerInfo] = useState({ donor: '', prize: '', isRare: false });

  const { isMuted, toggleMute, playSpin, playWin, playLose, playClick, playTick } = useAudio();
  const [hasInteracted, setHasInteracted] = useState(false);
  const [nextDonorName, setNextDonorName] = useState<string | null>(null);
  const [remoteSpinTrigger, setRemoteSpinTrigger] = useState(0);

  useEffect(() => {
    fetchPremios();
    fetchNextDonor();

    const eventsChannel = supabase.channel('roulette-events')
      .on('broadcast', { event: 'queue_updated' }, () => {
        fetchNextDonor();
      })
      .on('broadcast', { event: 'spin_now' }, () => {
        setRemoteSpinTrigger(prev => prev + 1);
      })
      .on('broadcast', { event: 'premios_updated' }, () => {
        fetchPremios();
      })
      .subscribe();

    return () => {
      eventsChannel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (remoteSpinTrigger > 0) {
      handlePublicSpinClick();
    }
  }, [remoteSpinTrigger]);

  const fetchNextDonor = async () => {
    const { data } = await supabase
      .from('doadores_giros')
      .select('nome')
      .gt('giros_restantes', 0)
      .order('criado_em', { ascending: true })
      .limit(1);

    if (data && data.length > 0) {
      setNextDonorName(data[0].nome);
    } else {
      setNextDonorName(null);
    }
  };

  const { drawPrize } = useRouletteLogic();
  const [isProcessing, setIsProcessing] = useState(false);

  // Busca os prêmios ativos para montar a roleta
  const fetchPremios = async () => {
    const { data } = await supabase.from('premios').select('*').gt('quantidade_estoque', 0).order('criado_em', { ascending: true });

    const tenteOutraVez: Premio = {
      id: 'tente-outra-vez',
      nome: 'Tente Outra Vez',
      quantidade_estoque: 999999, // Infinito
      peso: 15, // Peso para cair com certa frequência
      criado_em: ''
    };

    const perdeuAVez: Premio = {
      id: 'perdeu-a-vez',
      nome: 'Perdeu a Vez',
      quantidade_estoque: 999999, // Infinito
      peso: 10, // Menos frequente que o tente outra vez
      criado_em: ''
    };

    if (data && data.length > 0) {
      const todosPremios = [...(data as Premio[]), tenteOutraVez, perdeuAVez];
      setPremios(todosPremios);
      return todosPremios;
    } else {
      // Se não tiver prêmios, mocka um para não quebrar a roleta
      const mock = [{ id: 'mock', nome: 'Sem Prêmios', quantidade_estoque: 1, peso: 1, criado_em: '' }, tenteOutraVez, perdeuAVez];
      setPremios(mock);
      return mock;
    }
  };

  const handlePublicSpinClick = async () => {
    if (mustSpin || isProcessing) return; // Prevent multiple clicks
    if (premios.length === 0) return; // No prizes

    playClick(); // Toca o som de clique imediatamente
    setIsProcessing(true);
    let spinStarted = false;

    try {
      // 1. Verifica quem é o próximo da fila
      const { data: doadoresData } = await supabase
        .from('doadores_giros')
        .select('*')
        .gt('giros_restantes', 0)
        .order('criado_em', { ascending: true })
        .limit(1);

      if (!doadoresData || doadoresData.length === 0) {
        console.log("Fila vazia - ninguém para girar");
        return;
      }

      const doador = doadoresData[0];

      // 2. Busca prêmios mais recentes
      const currentPremios = await fetchPremios();
      const premiosDisponiveis = currentPremios.filter(p => p.quantidade_estoque > 0);

      if (premiosDisponiveis.length === 0) {
        console.log("Sem prêmios no estoque");
        return;
      }

      // 3. Sorteia o prêmio
      const ganhador = drawPrize(premiosDisponiveis);
      if (!ganhador) return;

      const prizeIndex = currentPremios.findIndex(p => p.id === ganhador.id);

      if (prizeIndex !== -1) {
        setPrizeNumber(prizeIndex);

        // 4. Atualiza BD
        if (ganhador.id !== 'tente-outra-vez') {
          await supabase.from('doadores_giros').update({
            giros_restantes: doador.giros_restantes - 1
          }).eq('id', doador.id);

          if (ganhador.id !== 'perdeu-a-vez') {
            await supabase.from('premios').update({
              quantidade_estoque: ganhador.quantidade_estoque - 1
            }).eq('id', ganhador.id);
          }
        }

        await supabase.from('ganhadores').insert([{
          doador_nome: doador.nome,
          premio_nome: ganhador.nome
        }]);

        // 5. Notifica tela do operador para atualizar
        supabase.channel('roulette-events').send({
          type: 'broadcast',
          event: 'queue_updated',
          payload: {}
        });

        // Atualiza a fila localmente também para ser rápido
        fetchNextDonor();

        // 6. Prepara estado visual para o modal
        setWinnerInfo({
          donor: doador.nome,
          prize: ganhador.nome,
          isRare: ganhador.peso <= 5
        });

        setModalOpen(false);

        // 7. Inicia o giro após pequeno delay pro React renderizar
        spinStarted = true;
        setTimeout(() => {
          setMustSpin(true);
          playSpin();
          setIsProcessing(false); // Libera o processamento apenas quando o giro efetivamente começar
        }, 100);
      }
    } finally {
      if (!spinStarted) {
        setIsProcessing(false);
      }
    }
  };

  const handleSpinStop = () => {
    setMustSpin(false);
    if (winnerInfo.prize === 'Perdeu a Vez 😢') {
      playLose();
    } else {
      playWin();
    }
    setModalOpen(true);
  };

  const handleFirstInteraction = () => {
    setHasInteracted(true);
    toggleMute(); // Will unmute and start BGM
  };

  // Cores dinâmicas para a roleta baseadas na paleta da Associação
  const backgroundColors = ['#0D47A1', '#43A047', '#0288D1', '#8BC34A', '#E53935', '#FFC107'];
  const textColors = ['#ffffff'];

  // Preparar dados para o react-custom-roulette
  const wheelData = premios.map((p, idx) => ({
    option: p.nome.length > 20 ? p.nome.substring(0, 20) + '...' : p.nome,
    style: { backgroundColor: backgroundColors[idx % backgroundColors.length], textColor: textColors[0] }
  }));

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-200 text-slate-800 overflow-hidden relative font-sans">

      {!hasInteracted && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center bg-white p-10 rounded-3xl shadow-2xl">
            <button
              onClick={handleFirstInteraction}
              className="bg-[#0D47A1] hover:bg-[#0288D1] text-white font-black text-2xl py-6 px-12 rounded-full shadow-lg transition flex items-center gap-4 mx-auto mb-6"
            >
              <PlayCircle size={40} /> INICIAR TELA PÚBLICA
            </button>
            <p className="text-slate-600 font-medium">Clique para habilitar o áudio e a tela cheia.</p>
          </div>
        </div>
      )}

      {/* Indicador de Próximo da Fila */}
      {nextDonorName && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur-md px-8 py-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#FFC107]/50 flex items-center gap-3 animate-bounce">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#43A047] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#43A047]"></span>
          </span>
          <span className="text-slate-600 font-bold uppercase tracking-wide text-sm">É a vez de:</span>
          <span className="text-[#0D47A1] font-black text-xl">{nextDonorName}</span>
        </div>
      )}

      {/* Botão de Som */}
      {hasInteracted && (
        <button
          onClick={toggleMute}
          className="absolute top-10 right-10 z-10 bg-white/80 p-4 rounded-full text-[#0D47A1] hover:bg-white backdrop-blur-md border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all"
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      )}

      {/* Layout Principal em 3 Colunas */}
      <div className="flex h-screen pt-10 pb-10 px-10 gap-8 relative z-10">
        
        {/* Lado Esquerdo: Header + Prêmios */}
        <div className="w-[380px] flex flex-col gap-6 shrink-0">
          {/* Header Institucional */}
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden shrink-0">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0D47A1] to-[#43A047]"></div>
            <h1 className="text-2xl font-black text-[#0D47A1] mb-2 tracking-tight">Roleta Solidária</h1>
            <p className="text-slate-600 text-sm leading-relaxed font-medium">
              Sua contribuição se transforma em saúde e esperança. A cada R$ 10 você ganha 1 chance!
            </p>
          </div>

          {/* Lista de Prêmios Disponíveis */}
          <AvailablePrizesFeed premios={premios} />
        </div>

        {/* Centro: A Roleta GIGANTE */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Brilho de fundo */}
          <div className="absolute inset-0 bg-[#FFC107]/20 blur-[120px] rounded-full"></div>

          <div
            className={`scale-[1.85] transform transition-all duration-300 z-10 shadow-2xl rounded-full bg-white p-1 ${(!mustSpin && !isProcessing) ? 'cursor-pointer hover:scale-[1.9] hover:shadow-[0_0_30px_rgba(255,193,7,0.5)]' : ''}`}
            onClick={handlePublicSpinClick}
          >
            {wheelData.length > 0 && (
              <CustomWheel
                key={premios.map(p => p.id).join('-')}
                mustStartSpinning={mustSpin}
                prizeNumber={prizeNumber}
                data={wheelData}
                onStopSpinning={handleSpinStop}
                onTick={playTick}
                spinDuration={6}
              />
            )}
          </div>
        </div>

        {/* Lado Direito: Feed Vencedores */}
        <div className="w-[380px] shrink-0">
          <RecentWinnersFeed isSpinning={mustSpin || isProcessing} />
        </div>
      </div>

      {/* Modal de Vitória */}
      <WinnerModal
        isOpen={modalOpen}
        donorName={winnerInfo.donor}
        prizeName={winnerInfo.prize}
        isRare={winnerInfo.isRare}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
