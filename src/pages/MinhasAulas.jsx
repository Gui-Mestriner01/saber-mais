import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Copy, Calendar, ListChecks, CheckCircle2, Link2, Palette, ClipboardList, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import BarraLateralProfessor from '../components/BarraLateralProfessor';
import '../CSS/Dashboard.css';

function MinhasAulas() {
  const navigate = useNavigate();
  const [salas, setSalas] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [modalAberto, setModalAberto] = useState(false);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState(null);
  const [salaDestinoId, setSalaDestinoId] = useState('');
  const [clonando, setClonando] = useState(false);

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
      const resSalas = await fetch('http://localhost:3001/professor/salas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataSalas = await resSalas.json();
      setSalas(dataSalas);

      const resAtividades = await fetch('http://localhost:3001/professor/atividades', {
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
    return tipo;
  };

  // Cada tipo de atividade tem seu próprio ícone
  const IconeDoTipo = ({ tipo }) => {
    const props = { size: 17, strokeWidth: 1.75 };
    if (tipo === 'quiz')    return <ListChecks {...props} />;
    if (tipo === 'v_f')     return <CheckCircle2 {...props} />;
    if (tipo === 'ligar')   return <Link2 {...props} />;
    if (tipo === 'pintura') return <Palette {...props} />;
    return <ClipboardList {...props} />;
  };

  const abrirModalClonar = (atividade) => {
    setAtividadeSelecionada(atividade);
    setSalaDestinoId('');
    setModalAberto(true);
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
      const res = await fetch(`http://localhost:3001/professor/atividade/${atividadeSelecionada.id}/clonar`, {
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
                              </span>
                            </div>
                            <button
                              className="btn-clonar"
                              onClick={() => abrirModalClonar(ativ)}
                            >
                              <Copy size={15} strokeWidth={1.75} /> Copiar aula
                            </button>
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
