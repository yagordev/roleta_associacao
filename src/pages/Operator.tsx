import { useEffect, useState } from 'react';
import { supabase, type Premio, type Doador } from '../services/supabase';
import { useRouletteLogic } from '../hooks/useRouletteLogic';
import { LogOut, Plus, RefreshCw, Trash2, Clock, ArrowDownToLine } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Operator() {
  const [premios, setPremios] = useState<Premio[]>([]);
  const [doadores, setDoadores] = useState<Doador[]>([]);
  const { logout } = useAuth();
  const { calculateSpins } = useRouletteLogic();

  // Formulário Prêmios
  const [novoPremio, setNovoPremio] = useState({ nome: '', qtd: 1, peso: 10 });
  // Formulário Doadores
  const [novoDoador, setNovoDoador] = useState({ nome: '', valor: 0 });

  useEffect(() => {
    fetchPremios();
    fetchDoadores();

    // Listen for spin events from the public screen to refresh the list automatically
    const channel = supabase.channel('operator-events')
      .on('broadcast', { event: 'queue_updated' }, () => {
        fetchPremios();
        fetchDoadores();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchPremios = async () => {
    const { data } = await supabase.from('premios').select('*').order('criado_em', { ascending: false });
    if (data) setPremios(data as Premio[]);
  };

  const fetchDoadores = async () => {
    const { data } = await supabase.from('doadores_giros').select('*').order('criado_em', { ascending: false });
    if (data) setDoadores(data as Doador[]);
  };

  const addPremio = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('premios').insert([{ 
      nome: novoPremio.nome, 
      quantidade_estoque: novoPremio.qtd, 
      peso: novoPremio.peso 
    }]);
    setNovoPremio({ nome: '', qtd: 1, peso: 10 });
    fetchPremios();
    supabase.channel('roulette-events').send({ type: 'broadcast', event: 'premios_updated', payload: {} });
  };

  const deletePremio = async (id: string) => {
    await supabase.from('premios').delete().eq('id', id);
    fetchPremios();
    supabase.channel('roulette-events').send({ type: 'broadcast', event: 'premios_updated', payload: {} });
  };

  const addDoador = async (e: React.FormEvent) => {
    e.preventDefault();
    const giros = calculateSpins(novoDoador.valor);
    const codigo = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    await supabase.from('doadores_giros').insert([{ 
      nome: novoDoador.nome, 
      valor_doado: novoDoador.valor,
      giros_totais: giros,
      giros_restantes: giros,
      codigo_acesso: codigo
    }]);
    setNovoDoador({ nome: '', valor: 0 });
    fetchDoadores();
  };

  const pularDoador = async (id: string) => {
    if (!window.confirm('Mover este jogador para o fim da fila? Ele não perderá os giros.')) return;
    
    await supabase.from('doadores_giros').update({ criado_em: new Date().toISOString() }).eq('id', id);
    fetchDoadores();
    supabase.channel('roulette-events').send({ type: 'broadcast', event: 'queue_updated', payload: {} });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm">
          <h1 className="text-2xl font-bold text-slate-800">Painel do Operador</h1>
          <button onClick={logout} className="flex items-center gap-2 text-slate-600 hover:text-red-500">
            <LogOut size={20} /> Sair
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Coluna de Entradas (Doadores) */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
                <Plus size={20} className="text-primary" /> Novo Doador / Venda
              </h2>
              <form onSubmit={addDoador} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Nome do Doador</label>
                  <input type="text" required value={novoDoador.nome} onChange={e => setNovoDoador({...novoDoador, nome: e.target.value})} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Valor Doado (R$)</label>
                  <input type="number" step="1" required min="10" value={novoDoador.valor} onChange={e => setNovoDoador({...novoDoador, valor: Number(e.target.value)})} className="w-full border rounded-lg p-2" />
                  <p className="text-xs text-slate-500 mt-1">A cada R$ 10 = 1 giro. (Ex: R$ 25 = 2 giros)</p>
                </div>
                <button type="submit" className="w-full bg-slate-800 text-white rounded-lg py-2 hover:bg-slate-700 transition">
                  Registrar Doação
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold mb-4 text-slate-800 flex justify-between items-center">
                Fila de Giros
                <button onClick={fetchDoadores} className="text-slate-400 hover:text-primary"><RefreshCw size={18} /></button>
              </h2>
              <div className="space-y-3">
                {doadores.filter(d => d.giros_restantes > 0).map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-800">{d.nome}</p>
                      <p className="text-sm text-slate-500">
                        {d.giros_restantes} giros restantes
                        <span className="ml-3 inline-block bg-slate-200 px-2 py-0.5 rounded text-xs font-mono font-bold text-slate-700">
                          CÓDIGO: {d.codigo_acesso || 'N/A'}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-100">
                        <Clock size={16} />
                        <span className="text-xs font-semibold">Aguardando</span>
                      </div>
                      <button 
                        onClick={() => pularDoador(d.id)}
                        title="Mover para o fim da fila"
                        className="p-2 text-slate-400 hover:text-[#0D47A1] hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <ArrowDownToLine size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {doadores.filter(d => d.giros_restantes > 0).length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">Nenhum doador na fila.</p>
                )}
              </div>
            </div>
          </div>

          {/* Coluna de Prêmios */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
                <Plus size={20} className="text-primary" /> Cadastrar Prêmio
              </h2>
              <form onSubmit={addPremio} className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-slate-600 mb-1">Nome do Prêmio</label>
                  <input type="text" required value={novoPremio.nome} onChange={e => setNovoPremio({...novoPremio, nome: e.target.value})} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Qtd Estoque</label>
                  <input type="number" required min="1" value={novoPremio.qtd} onChange={e => setNovoPremio({...novoPremio, qtd: Number(e.target.value)})} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Peso (Probabilidade)</label>
                  <input type="number" required min="1" value={novoPremio.peso} onChange={e => setNovoPremio({...novoPremio, peso: Number(e.target.value)})} className="w-full border rounded-lg p-2" />
                </div>
                <button type="submit" className="col-span-2 bg-slate-800 text-white rounded-lg py-2 hover:bg-slate-700 transition">
                  Adicionar Prêmio
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold mb-4 text-slate-800 flex justify-between items-center">
                Estoque de Prêmios
                <button onClick={fetchPremios} className="text-slate-400 hover:text-primary"><RefreshCw size={18} /></button>
              </h2>
              <div className="space-y-3">
                {premios.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className={`font-medium ${p.quantidade_estoque === 0 ? 'text-red-500 line-through' : 'text-slate-800'}`}>{p.nome}</p>
                      <p className="text-xs text-slate-500">Peso: {p.peso} | Estoque: {p.quantidade_estoque}</p>
                    </div>
                    <button onClick={() => deletePremio(p.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
