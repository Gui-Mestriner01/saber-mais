import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, Plus, Eye, EyeOff, Copy, Check, ArrowRight, Trash2, Users, X, KeyRound, Inbox, Search, Power, RotateCcw, Radio } from 'lucide-react';
import BarraLateralProfessor from '../components/BarraLateralProfessor';
import '../CSS/Dashboard.css';
import '../CSS/Salas.css';
import { API } from '../api';

// Cada matéria ganha uma cor sóbria, sempre a mesma
const CORES_MATERIA = [
  { fundo: '#EDF3FA', traco: '#1A6FC4' },
  { fundo: '#FBF0E4', traco: '#C4661B' },
  { fundo: '#EBF3ED', traco: '#3C8659' },
  { fundo: '#F3EEF8', traco: '#6B4C9A' },
  { fundo: '#FAF3E0', traco: '#A07508' },
  { fundo: '#FAEDEC', traco: '#B8453C' },
];

function corDaMateria(materia = '') {
  let soma = 0;
  for (let i = 0; i < materia.length; i++) soma += materia.charCodeAt(i);
  return CORES_MATERIA[soma % CORES_MATERIA.length];
}

function Salas() {
  const navigate = useNavigate();

  const nomeProfessor = localStorage.getItem('nomeUsuario') || 'Professor(a)';
  const idProfessor   = localStorage.getItem('idUsuario');
  const fotoProfessor = idProfessor ? localStorage.getItem(`fotoUsuario_${idProfessor}`) : null;

  const iniciais = nomeProfessor
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  const [salas, setSalas]           = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salaSelecionada, setSalaSelecionada] = useState(null);
  const [alunos, setAlunos]         = useState([]);
  const [senhasVisiveis, setSenhasVisiveis] = useState({});
  const [codigoCopiado, setCodigoCopiado]   = useState(null);
  const [mudandoStatus, setMudandoStatus]   = useState(null);

  // Filtros da lista
  const [busca, setBusca]                 = useState('');
  const [filtroStatus, setFiltroStatus]   = useState('todas');
  const [filtroSerie, setFiltroSerie]     = useState('todas');
  const [filtroMateria, setFiltroMateria] = useState('todas');

  useEffect(() => {
    buscarSalas();
  }, []);

  const buscarSalas = async () => {
    try {
      const res = await fetch(`${API}/professor/salas`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setSalas(data);
    } catch {
      console.error('Erro ao buscar salas');
    } finally {
      setCarregando(false);
    }
  };

  const verDetalhes = async (sala) => {
    setSalaSelecionada(sala);
    try {
      const res = await fetch(`${API}/professor/sala/${sala.id}/alunos`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setAlunos(data);
    } catch {
      console.error('Erro ao buscar alunos');
    }
  };

  const removerAluno = async (idAluno) => {
    if (!window.confirm("Tem certeza que deseja remover este aluno da sala?")) return;

    try {
      const res = await fetch(`${API}/professor/sala/${salaSelecionada.id}/aluno/${idAluno}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (res.ok) {
        setAlunos(alunos.filter(aluno => aluno.id !== idAluno));
      } else {
        alert("Erro ao remover aluno.");
      }
    } catch {
      console.error('Erro de conexão ao tentar remover aluno');
    }
  };

  // Mostra ou esconde a senha de uma sala específica
  const alternarSenha = (idSala) => {
    setSenhasVisiveis(atual => ({ ...atual, [idSala]: !atual[idSala] }));
  };

  // Encerrar tira a sala do ar: o aluno não consegue mais entrar nem fazer login
  const alternarStatus = async (sala) => {
    const encerrada = sala.status === 'encerrada';
    const acao = encerrada ? 'reativar' : 'encerrar';

    if (!encerrada) {
      const ok = window.confirm(
        `Encerrar a sala "${sala.nome}"?\n\n` +
        `Os alunos não conseguirão mais entrar nem responder atividades. ` +
        `As respostas e os pontos ficam guardados, e você pode reabrir quando quiser.`
      );
      if (!ok) return;
    }

    setMudandoStatus(sala.id);
    try {
      const res = await fetch(`${API}/professor/sala/${sala.id}/${acao}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (res.ok) {
        setSalas(atuais => atuais.map(s =>
          s.id === sala.id ? { ...s, status: encerrada ? 'ativa' : 'encerrada' } : s
        ));
      } else {
        alert('Não foi possível mudar o status da sala.');
      }
    } catch {
      alert('Sem conexão com o servidor.');
    } finally {
      setMudandoStatus(null);
    }
  };

  const copiarCodigo = (codigo, idSala) => {
    navigator.clipboard?.writeText(codigo);
    setCodigoCopiado(idSala);
    setTimeout(() => setCodigoCopiado(null), 1800);
  };

  const seriesDisponiveis   = [...new Set(salas.map(s => s.serie).filter(Boolean))].sort();
  const materiasDisponiveis = [...new Set(salas.map(s => s.materia).filter(Boolean))].sort();

  const estaEncerrada = (s) => s.status === 'encerrada';

  const filtroLigado =
    busca.trim() !== '' || filtroStatus !== 'todas' || filtroSerie !== 'todas' || filtroMateria !== 'todas';

  const salasFiltradas = salas.filter(s => {
    if (filtroStatus === 'ativas' && estaEncerrada(s)) return false;
    if (filtroStatus === 'encerradas' && !estaEncerrada(s)) return false;
    if (filtroSerie !== 'todas' && s.serie !== filtroSerie) return false;
    if (filtroMateria !== 'todas' && s.materia !== filtroMateria) return false;

    if (busca.trim()) {
      const t = busca.trim().toLowerCase();
      const achou = (s.nome || '').toLowerCase().includes(t) || (s.codigo || '').toLowerCase().includes(t);
      if (!achou) return false;
    }
    return true;
  });

  const limparFiltros = () => {
    setBusca('');
    setFiltroStatus('todas');
    setFiltroSerie('todas');
    setFiltroMateria('todas');
  };

  const totalEncerradas = salas.filter(estaEncerrada).length;

  return (
    <div className="dashboard-container">
      <BarraLateralProfessor ativo="salas" />

      <main className="dashboard-main">
        <header className="dashboard-header-painel">
          <div className="header-boas-vindas">
            <h1>Minhas salas</h1>
            <p>Suas turmas, com o código e a senha que os alunos usam para entrar.</p>
          </div>

          <div className="header-acoes">
            <button className="btn-acao-rapida destaque" onClick={() => navigate('/professor/criar-sala')}>
              <Plus size={17} strokeWidth={2} /> Nova sala
            </button>

            <div className="header-avatar-prof" onClick={() => navigate('/professor/perfil')} title="Meu perfil">
              {fotoProfessor
                ? <img src={fotoProfessor} alt={nomeProfessor} />
                : <span>{iniciais}</span>
              }
            </div>
          </div>
        </header>

        {salaSelecionada && (
          <div className="modal-overlay" onClick={() => setSalaSelecionada(null)}>
            <div className="salas-modal" onClick={e => e.stopPropagation()}>
              <div className="salas-modal-header">
                <div>
                  <h2>{salaSelecionada.nome}</h2>
                  <p>{salaSelecionada.serie} · {salaSelecionada.materia}</p>
                </div>
                <button className="salas-modal-fechar" onClick={() => setSalaSelecionada(null)}>
                  <X size={18} strokeWidth={2} />
                </button>
              </div>

              <div className="salas-modal-body">
                <div className="salas-modal-info">
                  <div className="salas-info-card">
                    <KeyRound size={18} strokeWidth={1.75} />
                    <div><strong>Código</strong><p>{salaSelecionada.codigo}</p></div>
                  </div>

                  <div className="salas-info-card">
                    <Eye size={18} strokeWidth={1.75} />
                    <div>
                      <strong>Senha</strong>
                      <p>
                        {senhasVisiveis[salaSelecionada.id]
                          ? salaSelecionada.senha_emojis
                          : <span className="senha-oculta">••••</span>
                        }
                      </p>
                    </div>
                    <button
                      className="btn-icone"
                      onClick={() => alternarSenha(salaSelecionada.id)}
                      title={senhasVisiveis[salaSelecionada.id] ? 'Esconder a senha' : 'Mostrar a senha'}
                    >
                      {senhasVisiveis[salaSelecionada.id]
                        ? <EyeOff size={16} strokeWidth={1.75} />
                        : <Eye size={16} strokeWidth={1.75} />
                      }
                    </button>
                  </div>

                  <div className="salas-info-card">
                    <Users size={18} strokeWidth={1.75} />
                    <div><strong>Alunos</strong><p>{alunos.length}</p></div>
                  </div>
                </div>

                <h3 className="salas-alunos-titulo">Alunos da sala</h3>
                {alunos.length === 0 ? (
                  <div className="salas-vazio">
                    <Inbox size={26} strokeWidth={1.5} />
                    <p>Nenhum aluno entrou ainda.</p>
                  </div>
                ) : (
                  <div className="salas-alunos-lista">
                    {alunos.map((aluno, i) => (
                      <div key={i} className="salas-aluno-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div className="salas-aluno-avatar">{aluno.nome_aluno?.charAt(0).toUpperCase()}</div>
                          <div>
                            <strong>{aluno.nome_aluno}</strong>
                            <p>Entrou em {new Date(aluno.entrou_em).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <button className="btn-remover-aluno" onClick={() => removerAluno(aluno.id)} title="Remover da sala">
                          <Trash2 size={16} strokeWidth={1.75} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {carregando ? (
          <div className="salas-loading">Carregando salas...</div>
        ) : salas.length === 0 ? (
          <div className="salas-empty">
            <School size={34} strokeWidth={1.3} />
            <p>Você ainda não criou nenhuma sala.</p>
            <button className="btn-acao-rapida destaque" onClick={() => navigate('/professor/criar-sala')}>
              <Plus size={17} strokeWidth={2} /> Criar primeira sala
            </button>
          </div>
        ) : (
          <>
            <div className="rel-filtros">
              <label className="rel-busca">
                <Search size={16} strokeWidth={1.75} />
                <input
                  type="text"
                  placeholder="Buscar pelo nome da turma ou pelo código..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                />
              </label>

              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                <option value="todas">Ativas e encerradas</option>
                <option value="ativas">Só as ativas</option>
                <option value="encerradas">Só as encerradas{totalEncerradas > 0 ? ` (${totalEncerradas})` : ''}</option>
              </select>

              <select value={filtroSerie} onChange={e => setFiltroSerie(e.target.value)}>
                <option value="todas">Todas as séries</option>
                {seriesDisponiveis.map(serie => <option key={serie} value={serie}>{serie}</option>)}
              </select>

              <select value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)}>
                <option value="todas">Todas as matérias</option>
                {materiasDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              {filtroLigado && (
                <button className="rel-limpar" onClick={limparFiltros}>
                  <X size={15} strokeWidth={2} /> Limpar
                </button>
              )}
            </div>

            {salasFiltradas.length === 0 ? (
              <div className="salas-empty">
                <Search size={30} strokeWidth={1.4} />
                <p>Nenhuma sala bate com esse filtro.</p>
                <button className="btn-acao-rapida" onClick={limparFiltros}>Limpar filtros</button>
              </div>
            ) : (
          <div className="salas-grade">
            {salasFiltradas.map(sala => {
              const cor = corDaMateria(sala.materia);
              const visivel = senhasVisiveis[sala.id];
              const encerrada = estaEncerrada(sala);

              return (
                <article key={sala.id} className={`sala-cartao ${encerrada ? 'encerrada' : ''}`}>
                  <span className="sala-faixa" style={{ background: encerrada ? '#A0B8CC' : cor.traco }} />

                  <div className="sala-cartao-topo">
                    <span
                      className="sala-marca"
                      style={{ background: cor.fundo, color: cor.traco }}
                    >
                      {(sala.materia || sala.nome || '?').charAt(0).toUpperCase()}
                    </span>
                    <div className="sala-cartao-titulo">
                      <h3>{sala.nome}</h3>
                      <p>{sala.serie} · {sala.materia}</p>
                    </div>

                    <div className="sala-selos">
                      {sala.tipo_sala === 'temporaria' && (
                        <span className="sala-selo tempo">Temporária</span>
                      )}
                      <span className={`sala-selo ${encerrada ? 'off' : 'on'}`}>
                        {encerrada ? 'Encerrada' : 'Ativa'}
                      </span>
                    </div>
                  </div>

                  <div className="sala-dados">
                    <div className="sala-dado">
                      <span className="sala-dado-rotulo">Código</span>
                      <span className="sala-dado-valor">
                        <code>{sala.codigo}</code>
                        <button
                          className="btn-icone"
                          onClick={() => copiarCodigo(sala.codigo, sala.id)}
                          title="Copiar código"
                        >
                          {codigoCopiado === sala.id
                            ? <Check size={15} strokeWidth={2} />
                            : <Copy size={15} strokeWidth={1.75} />
                          }
                        </button>
                      </span>
                    </div>

                    <div className="sala-dado">
                      <span className="sala-dado-rotulo">Senha</span>
                      <span className="sala-dado-valor">
                        {visivel
                          ? <span className="senha-emojis">{sala.senha_emojis}</span>
                          : <span className="senha-oculta">••••</span>
                        }
                        <button
                          className="btn-icone"
                          onClick={() => alternarSenha(sala.id)}
                          title={visivel ? 'Esconder a senha' : 'Mostrar a senha'}
                        >
                          {visivel
                            ? <EyeOff size={15} strokeWidth={1.75} />
                            : <Eye size={15} strokeWidth={1.75} />
                          }
                        </button>
                      </span>
                    </div>
                  </div>

                  {encerrada && (
                    <p className="sala-aviso">Os alunos não conseguem entrar nesta sala.</p>
                  )}

                  {!encerrada && (
                    <button
                      className="sala-btn-aovivo"
                      onClick={() => navigate(`/professor/ao-vivo/${sala.id}`)}
                      title="Abrir a sala de espera e jogar com a turma em tempo real"
                    >
                      <Radio size={16} strokeWidth={2.2} /> Começar aula ao vivo
                    </button>
                  )}

                  <div className="sala-cartao-acoes">
                    <button className="sala-cartao-link" onClick={() => verDetalhes(sala)}>
                      Ver detalhes <ArrowRight size={15} strokeWidth={1.75} />
                    </button>

                    <button
                      className={`sala-btn-status ${encerrada ? 'reativar' : ''}`}
                      onClick={() => alternarStatus(sala)}
                      disabled={mudandoStatus === sala.id}
                      title={encerrada ? 'Reabrir a sala para os alunos' : 'Encerrar a sala'}
                    >
                      {encerrada
                        ? <><RotateCcw size={15} strokeWidth={2} /> Reativar</>
                        : <><Power size={15} strokeWidth={2} /> Encerrar</>
                      }
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Salas;
