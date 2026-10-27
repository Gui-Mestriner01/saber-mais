import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Copy, Calendar, ListChecks, CheckCircle2, Link2, Palette, PenLine, ClipboardList, ChevronDown, Maximize2, Minimize2, ArrowDownUp, LayoutGrid, Shapes, Pencil, Globe, Lock, BarChart3 } from 'lucide-react';
import BarraLateralProfessor from '../components/BarraLateralProfessor';
import '../CSS/Dashboard.css';
import '../CSS/NovasAtividades.css';
import { API } from '../api';
import Aviso from '../components/Aviso';

function MinhasAulas() {
  const navigate = useNavigate();
  const location = useLocation();
  // Aviso "Atividade salva!" vindo do editor. Some sozinho e não volta no F5.
  const [aviso, setAviso] = useState(location.state?.aviso || null);
  useEffect(() => {
    if (location.state?.aviso) window.history.replaceState({ ...window.history.state, usr: {} }, '');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [salas, setSalas] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [modalAberto, setModalAberto] = useState(false);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState(null);
  const [salaDestinoId, setSalaDestinoId] = useState('');
  const [clonando, setClonando] = useState(false);
  const [mudandoVisibilidade, setMudandoVisibilidade] = useState(null);

  // Quais turmas estão abertas. Com poucas atividades abre tudo; com muitas
  // começa fechado, senão o professor desce a página inteira para achar uma.
  const [turmasAbertas, setTurmasAbertas] = useState(null);

  useEffect(() => {
    carregarTudo();
  }, []);

  const carregarTudo = async () => {
    setCarregando(true);
    const token = localStorage.getItem('token');
    try {
      const resSalas = await fetch(`${API}/professor/salas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataSalas = await resSalas.json();
      setSalas(dataSalas);

      const resAtividades = await fetch(`${API}/professor/atividades`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataAtividades = await resAtividades.json();
      setAtividades(dataAtividades);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setCarregando(false);
    }
  };

  const formatarData = (dataBanco) => {
    if (!dataBanco) return 'Data desconhecida';
    const data = new Date(dataBanco);
    return data.toLocaleDateString('pt-BR');
  };

  const formatarTipo = (tipo) => {
    if (tipo === 'quiz') return 'Quiz (Múltipla Escolha)';
    if (tipo === 'v_f') return 'Quiz (V/F)';
    if (tipo === 'ligar') return 'Ligue os Animais';
    if (tipo === 'pintura') return 'Pintura Livre';
    if (tipo === 'resposta_aberta') return 'Resposta aberta';
    if (tipo === 'ordenar') return 'Colocar em ordem';
    if (tipo === 'memoria') return 'Jogo da memória';
    if (tipo === 'grupos') return 'Separar em grupos';
    return tipo;
  };

  // Cada tipo de atividade tem seu próprio ícone
  const IconeDoTipo = ({ tipo }) => {
    const props = { size: 17, strokeWidth: 1.75 };
    if (tipo === 'quiz')    return <ListChecks {...props} />;
    if (tipo === 'v_f')     return <CheckCircle2 {...props} />;
    if (tipo === 'ligar')   return <Link2 {...props} />;
    if (tipo === 'pintura') return <Palette {...props} />;
    if (tipo === 'resposta_aberta') return <PenLine {...props} />;
    if (tipo === 'ordenar') return <ArrowDownUp {...props} />;
    if (tipo === 'memoria') return <LayoutGrid {...props} />;
    if (tipo === 'grupos')  return <Shapes {...props} />;
    return <ClipboardList {...props} />;
  };

  const abrirModalClonar = (atividade) => {
    setAtividadeSelecionada(atividade);
    setSalaDestinoId('');
    setModalAberto(true);
  };

  // Para onde cada tipo abre no editor.
  const ROTA_DO_TIPO = {
    quiz: '/professor/criar-quiz',
    v_f: '/professor/criar-v-f',
    ligar: '/professor/criar-ligar',
    pintura: '/professor/criar-pintura',
    resposta_aberta: '/professor/criar-resposta-aberta',
    ordenar: '/professor/criar-ordenar',
    memoria: '/professor/criar-memoria',
    grupos: '/professor/criar-grupos',
  };

  /* Editar: busca a atividade inteira (com gabarito) e abre o editor do tipo
     dela já preenchido. Como a atividade é do próprio professor, o editor
     salva por cima dela mesma em vez de criar outra. */
  const editarAtividade = async (ativ) => {
    const rota = ROTA_DO_TIPO[ativ.tipo];
    if (!rota) return alert('Esse tipo de atividade ainda não abre no editor.');

    try {
      const res = await fetch(`${API}/professor/biblioteca/${ativ.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const completa = await res.json();
      if (!res.ok) throw new Error(completa.erro || 'Não consegui abrir a atividade.');
      navigate(rota, { state: { atividade: completa, salaId: ativ.sala_id } });
    } catch (e) {
      alert(e.message);
    }
  };

  /* Publicar ou tirar da biblioteca, sem sair da tela. */
  const trocarVisibilidade = async (ativ) => {
    const virandoPublica = !ativ.publica;
    setMudandoVisibilidade(ativ.id);
    try {
      const res = await fetch(`${API}/professor/atividade/${ativ.id}/visibilidade`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ publica: virandoPublica })
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.erro || 'Não consegui mudar a visibilidade.');
      setAtividades(lista => lista.map(a => (a.id === ativ.id ? { ...a, publica: virandoPublica ? 1 : 0 } : a)));
    } catch (e) {
      alert(e.message);
    } finally {
      setMudandoVisibilidade(null);
    }
  };

  const abertasIniciais = atividades.length <= 6 ? salas.map(s => s.id) : [];
  const abertas = turmasAbertas ?? abertasIniciais;

  const alternarTurma = (id) => {
    setTurmasAbertas(abertas.includes(id) ? abertas.filter(x => x !== id) : [...abertas, id]);
  };

  const abrirTodas   = () => setTurmasAbertas(salas.map(s => s.id));
  const fecharTodas  = () => setTurmasAbertas([]);
  const todasAbertas = salas.length > 0 && abertas.length === salas.length;

  const confirmarClonagem = async () => {
    if (!salaDestinoId) return alert("Selecione uma turma de destino!");

    setClonando(true);
    try {
      const res = await fetch(`${API}/professor/atividade/${atividadeSelecionada.id}/clonar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ sala_destino_id: salaDestinoId })
      });

      if (res.ok) {
        setModalAberto(false);
        carregarTudo();
      } else {
        alert('Erro ao copiar a aula.');
      }
    } catch (error) {
      console.error('Erro ao clonar:', error);
    } finally {
      setClonando(false);
    }
  };

  return (
    <div className="dashboard-container">
      <BarraLateralProfessor ativo="aulas" />

      <main className="dashboard-main">
        <header className="dashboard-header-painel">
          <div className="header-boas-vindas">
            <h1>Minhas aulas e planejamento</h1>
            <p>As atividades de cada turma, para reaproveitar o que já deu certo.</p>
          </div>
        </header>

        {carregando ? (
          <div className="loading-container">
            <h2>Carregando seu planejamento...</h2>
          </div>
        ) : (
          <div className="lista-turmas-container">
            {salas.length > 1 && (
              <div className="perguntas-barra">
                <span className="perguntas-barra-titulo">
                  Suas turmas
                  <em>{atividades.length} {atividades.length === 1 ? 'atividade no total' : 'atividades no total'}</em>
                </span>
                <button className="perguntas-barra-btn" onClick={todasAbertas ? fecharTodas : abrirTodas}>
                  {todasAbertas
                    ? <><Minimize2 size={15} strokeWidth={2} /> Recolher todas</>
                    : <><Maximize2 size={15} strokeWidth={2} /> Expandir todas</>
                  }
                </button>
              </div>
            )}

            {salas.length === 0 ? (
              <div className="form-card"><p>Você ainda não tem turmas cadastradas.</p></div>
            ) : (
              salas.map(sala => {
                const atividadesDaSala = atividades.filter(ativ => ativ.nome_sala === sala.nome);

                const aberta = abertas.includes(sala.id);

                return (
                  <div key={sala.id} className={`form-card turma-card ${aberta ? 'aberta' : ''}`}>
                    <div className="turma-header">
                      <button className="turma-header-botao" onClick={() => alternarTurma(sala.id)}>
                        <ChevronDown className="turma-seta" size={19} strokeWidth={2.2} />
                        <h2>{sala.nome} <span>{sala.serie} · {sala.materia}</span></h2>
                        <span className="turma-contador">
                          {atividadesDaSala.length} {atividadesDaSala.length === 1 ? 'atividade' : 'atividades'}
                        </span>
                      </button>

                      <button
                        className="btn-acao-rapida destaque"
                        onClick={() => navigate('/professor/criar-atividade')}
                      >
                        <Plus size={17} strokeWidth={2} /> Nova aula
                      </button>
                    </div>

                    {aberta && (
                      atividadesDaSala.length === 0 ? (
                      <p className="msg-vazia">Nenhuma atividade postada para esta turma ainda.</p>
                    ) : (
                      <div className="lista-atividades-turma">
                        {atividadesDaSala.map(ativ => (
                          <div key={ativ.id} className="atividade-item-row">
                            <div className="atividade-info-left">
                              <h3>
                                <IconeDoTipo tipo={ativ.tipo} />
                                {ativ.titulo}
                              </h3>
                              <span className="badge-data">
                                <Calendar size={13} strokeWidth={1.75} />
                                {formatarTipo(ativ.tipo)} · postado em {formatarData(ativ.criado_em)}
                                <span className={`aula-selo ${ativ.publica ? 'publica' : ''}`}>
                                  {ativ.publica
                                    ? <><Globe size={11} strokeWidth={2.4} /> Na biblioteca</>
                                    : <><Lock size={11} strokeWidth={2.4} /> Só minha</>}
                                </span>
                              </span>
                            </div>
                            <div className="atividade-acoes">
                              {/* Atalho para o relatório da atividade (por aluno e por questão) */}
                              {Number(ativ.total_respostas) > 0 && (
                                <button
                                  className="btn-clonar"
                                  onClick={() => navigate('/professor/relatorios', { state: { abrirAtividade: ativ.id } })}
                                  title={ativ.media_acerto !== null && ativ.media_acerto !== undefined ? `${ativ.media_acerto}% de acerto na turma` : undefined}
                                >
                                  <BarChart3 size={15} strokeWidth={1.75} /> Relatório
                                  {ativ.media_acerto !== null && ativ.media_acerto !== undefined && <em className="btn-media">{ativ.media_acerto}%</em>}
                                </button>
                              )}
                              <button className="btn-clonar" onClick={() => editarAtividade(ativ)}>
                                <Pencil size={15} strokeWidth={1.75} /> Editar
                              </button>
                              <button
                                className="btn-clonar"
                                onClick={() => trocarVisibilidade(ativ)}
                                disabled={mudandoVisibilidade === ativ.id}
                              >
                                {ativ.publica
                                  ? <><Lock size={15} strokeWidth={1.75} /> Tornar só minha</>
                                  : <><Globe size={15} strokeWidth={1.75} /> Publicar</>}
                              </button>
                              <button className="btn-clonar" onClick={() => abrirModalClonar(ativ)}>
                                <Copy size={15} strokeWidth={1.75} /> Copiar aula
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
      <Aviso texto={aviso} tipo="ok" aoFechar={() => setAviso(null)} />

      {/* MODAL DE CÓPIA */}
      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Copiar aula</h2>
            <p>Para qual turma você deseja copiar a aula <strong>"{atividadeSelecionada?.titulo}"</strong>?</p>

            <select
              className="form-input"
              value={salaDestinoId}
              onChange={(e) => setSalaDestinoId(e.target.value)}
            >
              <option value="">Selecione a turma de destino...</option>
              {salas
                .filter(sala => sala.nome !== atividadeSelecionada?.nome_sala)
                .map(sala => (
                  <option key={sala.id} value={sala.id}>{sala.nome} ({sala.serie})</option>
              ))}
            </select>

            <div className="modal-actions">
              <button
                className="btn-secundario"
                onClick={() => setModalAberto(false)}
                disabled={clonando}
              >
                Cancelar
              </button>
              <button
                className="btn-primario"
                onClick={confirmarClonagem}
                disabled={clonando}
              >
                {clonando ? 'Copiando...' : 'Confirmar cópia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MinhasAulas;
