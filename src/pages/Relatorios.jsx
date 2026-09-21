import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area
} from 'recharts';
import { FileText, ArrowRight, Inbox, ListChecks, CheckCircle2, Link2, Palette, PenLine, ClipboardList, Flame, Send, Search, X, Calendar, ArrowDownUp, LayoutGrid, Shapes } from 'lucide-react';
import RelatorioAtividade from './RelatorioAtividade';
import BarraLateralProfessor from '../components/BarraLateralProfessor';
import '../CSS/Dashboard.css';
import '../CSS/Relatorios.css';
import { API } from '../api';

/* --------------------------------------------------------------------------
   Paleta dos gráficos.
   O azul e o laranja são os da marca; os outros três foram escolhidos para
   continuarem distinguíveis por quem enxerga cores de forma diferente
   (daltonismo) — a distância mínima entre as cores vizinhas foi medida.
   -------------------------------------------------------------------------- */
const AZUL_GRAFICO = '#1A6FC4';

const CORES_TIPO = {
  quiz:            '#1A6FC4',
  v_f:             '#F5812A',
  ligar:           '#1BAF7A',
  pintura:         '#6B4C9A',
  resposta_aberta: '#E87BA4',
  // Os três tipos novos. A paleta de 8 foi validada de novo para daltonismo
  // (script do dataviz: separação entre vizinhas ≥ 9 ΔE em protan).
  ordenar:         '#9C7A00',
  memoria:         '#0098B8',
  grupos:          '#C0392B',
};

const NOMES_TIPO = {
  quiz: 'Quiz',
  v_f: 'Verdadeiro ou falso',
  ligar: 'Ligar correspondentes',
  pintura: 'Pintura',
  resposta_aberta: 'Resposta aberta',
  ordenar: 'Colocar em ordem',
  memoria: 'Jogo da memória',
  grupos: 'Separar em grupos',
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// As datas do banco vêm como "2026-09-18 10:00:00"; o Safari só entende com o T
function formatarData(bruto) {
  if (!bruto) return 'data não registrada';
  const d = new Date(bruto.toString().replace(' ', 'T'));
  if (isNaN(d)) return 'data não registrada';
  return d.toLocaleDateString('pt-BR');
}

function Relatorios() {
  const navigate = useNavigate();

  const [atividades, setAtividades] = useState([]);
  const [atvSelecionada, setAtvSelecionada] = useState(null);
  const [respostas, setRespostas]   = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros da lista
  const [filtroTurma, setFiltroTurma]   = useState('todas');
  const [filtroTipo, setFiltroTipo]     = useState('todos');
  const [filtroMateria, setFiltroMateria] = useState('todas');
  const [busca, setBusca]               = useState('');

  useEffect(() => {
    buscarAtividades();
  }, []);

  const buscarAtividades = async () => {
    try {
      const res = await fetch(`${API}/professor/atividades`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();

      // As mais recentes primeiro — é o que o professor acabou de lançar
      const ordenadas = (Array.isArray(data) ? data : []).sort((a, b) => {
        const da = new Date((a.criado_em || '').toString().replace(' ', 'T'));
        const db = new Date((b.criado_em || '').toString().replace(' ', 'T'));
        return db - da;
      });

      setAtividades(ordenadas);
    } catch (error) {
      console.error('Erro ao buscar atividades', error);
    } finally {
      setCarregando(false);
    }
  };

  const verRespostas = async (atv) => {
    setAtvSelecionada(atv);
    try {
      const [resRes, atvRes] = await Promise.all([
        fetch(`${API}/professor/atividade/${atv.id}/respostas`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`${API}/atividade/${atv.id}`)
      ]);
      const respostasData = await resRes.json();
      const atvData       = await atvRes.json();

      setRespostas(Array.isArray(respostasData) ? respostasData : []);
      setAtvSelecionada({ ...atv, conteudo: atvData.conteudo });
    } catch {
      console.error('Erro ao buscar respostas');
    }
  };

  // Depois de salvar uma nota, atualiza só aquela linha na tela
  const atualizarResposta = (idResposta, campos) => {
    setRespostas(atual => atual.map(r => (r.id === idResposta ? { ...r, ...campos } : r)));
  };

  const IconeDoTipo = ({ tipo, size = 18 }) => {
    const props = { size, strokeWidth: 1.75 };
    if (tipo === 'quiz')            return <ListChecks {...props} />;
    if (tipo === 'v_f')             return <CheckCircle2 {...props} />;
    if (tipo === 'ligar')           return <Link2 {...props} />;
    if (tipo === 'pintura')         return <Palette {...props} />;
    if (tipo === 'resposta_aberta') return <PenLine {...props} />;
    if (tipo === 'ordenar')         return <ArrowDownUp {...props} />;
    if (tipo === 'memoria')         return <LayoutGrid {...props} />;
    if (tipo === 'grupos')          return <Shapes {...props} />;
    return <ClipboardList {...props} />;
  };

  /* ------------------------------------------------------------------------
     DADOS DOS GRÁFICOS
     ------------------------------------------------------------------------ */

  // Respostas por turma — quanto cada turma entregou
  const porTurma = Object.values(
    atividades.reduce((acc, atv) => {
      const turma = atv.nome_sala || 'Sem turma';
      if (!acc[turma]) acc[turma] = { turma, respostas: 0, atividades: 0 };
      acc[turma].respostas  += Number(atv.total_respostas) || 0;
      acc[turma].atividades += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.respostas - a.respostas);

  // Atividades por tipo — o que o professor mais usa
  const porTipo = Object.entries(
    atividades.reduce((acc, atv) => {
      acc[atv.tipo] = (acc[atv.tipo] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([tipo, qtd]) => ({ tipo, qtd, nome: NOMES_TIPO[tipo] || tipo, cor: CORES_TIPO[tipo] || '#7AAAC8' }))
    .sort((a, b) => b.qtd - a.qtd);

  const totalTipos = porTipo.reduce((s, t) => s + t.qtd, 0);

  // Atividades lançadas nos últimos 6 meses
  const hoje = new Date();
  const porMes = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
    return {
      chave: `${d.getFullYear()}-${d.getMonth()}`,
      mes: MESES[d.getMonth()],
      lancadas: 0,
    };
  });

  atividades.forEach(atv => {
    const bruto = atv.criado_em || atv.created_at;
    if (!bruto) return;
    const d = new Date(typeof bruto === 'string' ? bruto.replace(' ', 'T') : bruto);
    if (isNaN(d)) return;
    const alvo = porMes.find(m => m.chave === `${d.getFullYear()}-${d.getMonth()}`);
    if (alvo) alvo.lancadas += 1;
  });

  /* ------------------------------------------------------------------------
     FILTROS DA LISTA
     ------------------------------------------------------------------------ */
  const turmasDisponiveis   = [...new Set(atividades.map(a => a.nome_sala).filter(Boolean))].sort();
  const materiasDisponiveis = [...new Set(atividades.map(a => a.materia).filter(Boolean))].sort();
  const tiposDisponiveis    = [...new Set(atividades.map(a => a.tipo).filter(Boolean))];

  const filtroLigado =
    filtroTurma !== 'todas' || filtroTipo !== 'todos' || filtroMateria !== 'todas' || busca.trim() !== '';

  const passaNoFiltro = (a) => {
    if (filtroTurma !== 'todas' && a.nome_sala !== filtroTurma) return false;
    if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) return false;
    if (filtroMateria !== 'todas' && a.materia !== filtroMateria) return false;
    if (busca.trim() && !a.titulo?.toLowerCase().includes(busca.trim().toLowerCase())) return false;
    return true;
  };

  const limparFiltros = () => {
    setFiltroTurma('todas');
    setFiltroTipo('todos');
    setFiltroMateria('todas');
    setBusca('');
  };

  // A lista do fim é a única coisa que só existe aqui: abrir as correções.
  // Então ela mostra apenas atividades que já receberam resposta — a lista
  // completa de atividades é o trabalho da tela "Minhas aulas".
  const comRespostas = atividades
    .filter(a => (Number(a.total_respostas) || 0) > 0)
    .filter(passaNoFiltro);

  const aguardandoAlunos = atividades.filter(a => (Number(a.total_respostas) || 0) === 0).filter(passaNoFiltro).length;

  const totalAtividades = atividades.length;
  const totalRespostas  = atividades.reduce((acc, ativ) => acc + (Number(ativ.total_respostas) || 0), 0);
  const turmaMaisAtiva  = porTurma.length > 0 && porTurma[0].respostas > 0 ? porTurma[0].turma : 'Nenhuma';
  const temDados        = totalRespostas > 0 || totalAtividades > 0;

  /* ------------------------------------------------------------------------
     CAIXINHA QUE APARECE AO PASSAR O MOUSE
     ------------------------------------------------------------------------ */
  const Balao = ({ active, payload, label, sufixo }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="gr-balao">
        <strong>{label}</strong>
        <span>{payload[0].value} {sufixo}</span>
      </div>
    );
  };

  const eixo = { fontSize: 12, fontWeight: 700, fill: '#7AAAC8', fontFamily: 'Nunito, sans-serif' };

  return (
    <div className="dashboard-container">
      <BarraLateralProfessor ativo="relatorios" />

      <main className="dashboard-main">
        <header className="dashboard-header-painel">
          <div className="header-boas-vindas">
            <h1>Relatórios e desempenho</h1>
            <p>Como suas turmas estão respondendo às atividades.</p>
          </div>
        </header>

        {!atvSelecionada ? (
          <>
            {carregando ? (
              <div className="rel-vazio"><p>Carregando relatórios...</p></div>
            ) : !temDados ? (
              <div className="rel-vazio">
                <Inbox size={28} strokeWidth={1.5} />
                <p>Nenhuma atividade criada ainda.</p>
              </div>
            ) : (
              <>
                {/* NÚMEROS DO TOPO */}
                <div className="resumo-grid">
                  <div className="resumo-card turmas">
                    <div className="resumo-icone"><FileText size={20} strokeWidth={1.75} /></div>
                    <div className="resumo-texto">
                      <strong>{totalAtividades}</strong>
                      <p>{totalAtividades === 1 ? 'Atividade criada' : 'Atividades criadas'}</p>
                    </div>
                  </div>

                  <div className="resumo-card entregas">
                    <div className="resumo-icone"><Send size={20} strokeWidth={1.75} /></div>
                    <div className="resumo-texto">
                      <strong>{totalRespostas}</strong>
                      <p>{totalRespostas === 1 ? 'Resposta recebida' : 'Respostas recebidas'}</p>
                    </div>
                  </div>

                  <div className="resumo-card alunos">
                    <div className="resumo-icone"><Flame size={20} strokeWidth={1.75} /></div>
                    <div className="resumo-texto">
                      <strong className="resumo-texto-curto">{turmaMaisAtiva}</strong>
                      <p>Turma mais ativa</p>
                    </div>
                  </div>
                </div>

                {/* GRÁFICOS */}
                <div className="gr-grade">

                  {/* Respostas por turma */}
                  <section className="gr-card">
                    <div className="gr-cabecalho">
                      <h2>Respostas por turma</h2>
                      <p>Quantas atividades cada turma já entregou</p>
                    </div>

                    {porTurma.length === 0 ? (
                      <p className="gr-sem-dado">Ainda não há turmas com atividades.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={Math.max(160, porTurma.length * 46)}>
                        <BarChart
                          data={porTurma}
                          layout="vertical"
                          margin={{ top: 4, right: 36, bottom: 4, left: 4 }}
                          barCategoryGap={10}
                        >
                          <CartesianGrid horizontal={false} stroke="#EDF4FA" />
                          <XAxis type="number" tick={eixo} axisLine={false} tickLine={false} allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="turma"
                            tick={eixo}
                            axisLine={false}
                            tickLine={false}
                            width={132}
                            tickFormatter={t => (t.length > 17 ? t.slice(0, 16) + '…' : t)}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(26,111,196,0.06)' }}
                            content={<Balao sufixo="respostas" />}
                          />
                          <Bar
                            dataKey="respostas"
                            fill={AZUL_GRAFICO}
                            radius={[0, 4, 4, 0]}
                            barSize={18}
                            label={{ position: 'right', fill: '#5A7A9A', fontSize: 12, fontWeight: 800 }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </section>

                  {/* Atividades por tipo — barra de parte-do-todo */}
                  <section className="gr-card">
                    <div className="gr-cabecalho">
                      <h2>Atividades por tipo</h2>
                      <p>O formato que você mais usa com a turma</p>
                    </div>

                    {porTipo.length === 0 ? (
                      <p className="gr-sem-dado">Nenhuma atividade criada ainda.</p>
                    ) : (
                      <>
                        <div className="gr-barra-todo">
                          {porTipo.map(t => (
                            <div
                              key={t.tipo}
                              className="gr-fatia"
                              style={{ width: `${(t.qtd / totalTipos) * 100}%`, background: t.cor }}
                              title={`${t.nome}: ${t.qtd}`}
                            />
                          ))}
                        </div>

                        <ul className="gr-legenda">
                          {porTipo.map(t => (
                            <li key={t.tipo}>
                              <span className="gr-ponto" style={{ background: t.cor }} />
                              <span className="gr-legenda-nome">{t.nome}</span>
                              <span className="gr-legenda-valor">
                                {t.qtd} <em>({Math.round((t.qtd / totalTipos) * 100)}%)</em>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </section>

                  {/* Atividades lançadas por mês */}
                  <section className="gr-card gr-card-largo">
                    <div className="gr-cabecalho">
                      <h2>Atividades lançadas por mês</h2>
                      <p>Seu ritmo de postagem nos últimos 6 meses</p>
                    </div>

                    <ResponsiveContainer width="100%" height={210}>
                      <AreaChart data={porMes} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
                        <defs>
                          <linearGradient id="preenchimentoAzul" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={AZUL_GRAFICO} stopOpacity={0.22} />
                            <stop offset="100%" stopColor={AZUL_GRAFICO} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#EDF4FA" />
                        <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} />
                        <YAxis tick={eixo} axisLine={false} tickLine={false} allowDecimals={false} width={38} />
                        <Tooltip
                          cursor={{ stroke: '#C8DFF0', strokeWidth: 2 }}
                          content={<Balao sufixo="atividades" />}
                        />
                        <Area
                          type="monotone"
                          dataKey="lancadas"
                          stroke={AZUL_GRAFICO}
                          strokeWidth={2}
                          fill="url(#preenchimentoAzul)"
                          dot={{ r: 4, fill: '#fff', stroke: AZUL_GRAFICO, strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: AZUL_GRAFICO, stroke: '#fff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </section>

                </div>

                {/* LISTA DETALHADA */}
                <section className="painel-secao">
                  <div className="rel-filtros">
                    <label className="rel-busca">
                      <Search size={16} strokeWidth={1.75} />
                      <input
                        type="text"
                        placeholder="Buscar pelo título da atividade..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                      />
                    </label>

                    <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)}>
                      <option value="todas">Todas as turmas</option>
                      {turmasDisponiveis.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    <select value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)}>
                      <option value="todas">Todas as matérias</option>
                      {materiasDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                      <option value="todos">Todos os tipos</option>
                      {tiposDisponiveis.map(t => (
                        <option key={t} value={t}>{NOMES_TIPO[t] || t}</option>
                      ))}
                    </select>

                    {filtroLigado && (
                      <button className="rel-limpar" onClick={limparFiltros}>
                        <X size={15} strokeWidth={2} /> Limpar
                      </button>
                    )}
                  </div>

                  <div className="secao-header">
                    <h2>Respostas para corrigir</h2>
                    <span className="badge-contagem">{comRespostas.length}</span>
                    <button className="link-ver-todas" onClick={() => navigate('/professor/minhas-aulas')}>
                      Ver todas as atividades
                    </button>
                  </div>

                  {comRespostas.length === 0 ? (
                    <div className="rel-vazio">
                      <Inbox size={28} strokeWidth={1.5} />
                      <p>
                        {filtroLigado
                          ? 'Nenhuma atividade com resposta bate com esse filtro.'
                          : 'Nenhum aluno respondeu suas atividades ainda.'}
                      </p>
                    </div>
                  ) : (
                  <div className="rel-lista">
                    {comRespostas.map(atv => (
                      <div key={atv.id} className="rel-card">
                        <div className="rel-card-info">
                          <span
                            className="rel-tipo-icon"
                            style={{
                              background: (CORES_TIPO[atv.tipo] || '#7AAAC8') + '1F',
                              color: CORES_TIPO[atv.tipo] || '#7AAAC8'
                            }}
                          >
                            <IconeDoTipo tipo={atv.tipo} />
                          </span>
                          <div>
                            <h3>{atv.titulo}</h3>
                            <p>{atv.nome_sala} · {atv.serie} · {atv.materia}</p>
                            <div className="rel-selos">
                              <span className="rel-badge">
                                {atv.total_respostas} {atv.total_respostas === 1 ? 'resposta' : 'respostas'}
                              </span>
                              <span className="rel-data">
                                <Calendar size={13} strokeWidth={1.75} />
                                Lançada em {formatarData(atv.criado_em)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button className="rel-btn-ver" onClick={() => verRespostas(atv)}>
                          Ver correções <ArrowRight size={15} strokeWidth={1.75} />
                        </button>
                      </div>
                    ))}
                  </div>
                  )}

                  {aguardandoAlunos > 0 && (
                    <p className="rel-nota">
                      Mais {aguardandoAlunos} {aguardandoAlunos === 1 ? 'atividade ainda não recebeu' : 'atividades ainda não receberam'} nenhuma resposta.
                    </p>
                  )}
                </section>
              </>
            )}
          </>
        ) : (
          <RelatorioAtividade
            atividade={atvSelecionada}
            respostas={respostas}
            onVoltar={() => { setAtvSelecionada(null); setRespostas([]); }}
            onAtualizarResposta={atualizarResposta}
          />
        )}

      </main>
    </div>
  );
}

export default Relatorios;
