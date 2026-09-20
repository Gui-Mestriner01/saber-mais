import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home, School, Target, Users, Trophy, Sun, Moon, UserRound, Star, Shield,
  CheckCircle2, Clock, Lock, Search, ListChecks, Link2, Palette, PenLine,
  ClipboardList, Inbox, LogOut, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import '../CSS/AlunoHome.css';

// Avatares para os alunos
const AVATARES = [
  '/avatares/img1.PNG', '/avatares/img2.PNG', '/avatares/img3.PNG', '/avatares/img4.PNG',
  '/avatares/img5.PNG', '/avatares/img6.PNG', '/avatares/img7.PNG', '/avatares/img8.PNG',
  '/avatares/img9.PNG', '/avatares/img10.PNG', '/avatares/img11.PNG', '/avatares/img12.PNG',
  '/avatares/img13.PNG', '/avatares/img14.PNG', '/avatares/img15.PNG', '/avatares/img16.PNG',
  '/avatares/img17.PNG', '/avatares/img18.PNG', '/avatares/img19.PNG', '/avatares/img20.PNG',
  '/avatares/img21.PNG', '/avatares/img22.PNG', '/avatares/img23.PNG', '/avatares/img24.PNG',
  '/avatares/img25.PNG', '/avatares/img26.PNG', '/avatares/img27.PNG', '/avatares/img28.PNG',
  '/avatares/img29.PNG', '/avatares/img30.PNG', '/avatares/img31.PNG', '/avatares/img32.PNG',
  '/avatares/img33.PNG',
];

// Banners de boas vindas
const ILUSTRACOES_BEM_VINDO = [
  '/ilustracoes/banner1.png',
  '/ilustracoes/banner2.png',
  '/ilustracoes/banner3.png',
  '/ilustracoes/banner4.png',
];

// Cada tipo de atividade tem seu ícone
function IconeTipo({ tipo, size = 20 }) {
  const props = { size, strokeWidth: 1.75 };
  if (tipo === 'quiz')            return <ListChecks {...props} />;
  if (tipo === 'v_f')             return <CheckCircle2 {...props} />;
  if (tipo === 'ligar')           return <Link2 {...props} />;
  if (tipo === 'pintura')         return <Palette {...props} />;
  if (tipo === 'resposta_aberta') return <PenLine {...props} />;
  return <ClipboardList {...props} />;
}

function AlunoHome() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const sala = state?.sala;
  const nomeAluno = state?.nomeAluno;

  const [atividades, setAtividades]               = useState([]);
  const [pontos, setPontos]                       = useState(0);
  const [pagina, setPagina]                       = useState('home');
  const [salas]                                   = useState([sala]);
  const [colegas, setColegas]                     = useState([]);
  const [avatarSelecionado, setAvatarSelecionado] = useState(null);
  const [modalAvatar, setModalAvatar]             = useState(false);

  const [paginaAvatar, setPaginaAvatar]           = useState(0);
  const [imagemBanner, setImagemBanner]           = useState('');

  // Filtros das atividades
  const [filtroStatus, setFiltroStatus]   = useState('todas');
  const [filtroMateria, setFiltroMateria] = useState('todas');
  const [filtroTipo, setFiltroTipo]       = useState('todos');
  const [busca, setBusca]                 = useState('');

  // Relógio rodando a cada 1 segundo para atualizar os segundos na tela
  const [horaAtual, setHoraAtual] = useState(new Date());

  const [modoEscuro, setModoEscuro] = useState(() => {
    return localStorage.getItem('saberPlusModoEscuro') === 'true';
  });

  useEffect(() => {
    if (modoEscuro) {
      document.body.classList.add('modo-escuro');
    } else {
      document.body.classList.remove('modo-escuro');
    }
    localStorage.setItem('saberPlusModoEscuro', modoEscuro);
  }, [modoEscuro]);

  useEffect(() => {
    if (!nomeAluno || !sala) { navigate('/aluno/area'); return; }
    buscarAtividades();
    buscarColegas();

    // Recupera o avatar que o aluno já tinha escolhido antes
    const avatarSalvo = localStorage.getItem(`saberPlusAvatar_${nomeAluno}`);
    if (avatarSalvo) setAvatarSelecionado(avatarSalvo);

    const imagemSorteada = ILUSTRACOES_BEM_VINDO[Math.floor(Math.random() * ILUSTRACOES_BEM_VINDO.length)];
    setImagemBanner(imagemSorteada);

    const timerCronometro = setInterval(() => {
      setHoraAtual(new Date());
    }, 1000);

    return () => clearInterval(timerCronometro);
  }, []);

  const buscarAtividades = async () => {
    try {
      const res = await fetch(`http://localhost:3001/sala/${sala.id}/atividades?aluno=${encodeURIComponent(nomeAluno)}&t=${Date.now()}`);
      const data = await res.json();
      if (Array.isArray(data)) setAtividades(data);
    } catch (error) {
      console.error('Erro ao buscar atividades:', error);
    }
  };

  // Busca a turma inteira (nome + pontos) para montar o pódio
  const buscarColegas = async () => {
    try {
      const res = await fetch(`http://localhost:3001/sala/${sala.id}/alunos?t=${Date.now()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setColegas(data);
        const eu = data.find(a => a.nome_aluno === nomeAluno);
        if (eu) setPontos(Number(eu.pontos) || 0);
      }
    } catch (error) {
      console.error('Erro ao buscar colegas:', error);
    }
  };

  const sair = () => {
    if (!window.confirm('Sair da sala e voltar para o início?')) return;

    // O personagem escolhido continua salvo, para o aluno reencontrar da
    // próxima vez. Sai só o que é da sessão.
    localStorage.removeItem('alunoTemporario');
    navigate('/');
  };

  const escolherAvatar = (av) => {
    setAvatarSelecionado(av);
    localStorage.setItem(`saberPlusAvatar_${nomeAluno}`, av);
    setModalAvatar(false);
  };

  const calcularNivel = (pts) => {
    if (pts < 100)  return { nivel: 1, titulo: 'Iniciante' };
    if (pts < 300)  return { nivel: 2, titulo: 'Aprendiz' };
    if (pts < 600)  return { nivel: 3, titulo: 'Explorador' };
    if (pts < 1000) return { nivel: 4, titulo: 'Aventureiro' };
    if (pts < 1500) return { nivel: 5, titulo: 'Especialista' };
    return { nivel: 6, titulo: 'Mestre' };
  };

  const { nivel: nivelAtual, titulo } = calcularNivel(pontos);

  // ==========================================
  // PÓDIO / RANKING (dados reais da sala)
  // ==========================================
  const ranking = [...colegas]
    .map(c => ({ nome: c.nome_aluno, pontos: Number(c.pontos) || 0 }))
    .sort((a, b) => b.pontos - a.pontos)
    .map((a, i) => ({ ...a, posicao: i + 1 }));

  const top5 = ranking.slice(0, 5);
  const minhaPosicao = ranking.find(a => a.nome === nomeAluno)?.posicao || '-';

  // ==========================================
  // RESUMO DAS ATIVIDADES
  // ==========================================
  const resumo = atividades.reduce((acc, atv) => {
    const st = obterStatusAtividade(atv, horaAtual);
    acc.total++;
    if (st.chave === 'concluida')      acc.concluidas++;
    else if (st.chave === 'encerrada') acc.encerradas++;
    else                               acc.abertas++;
    return acc;
  }, { total: 0, concluidas: 0, abertas: 0, encerradas: 0 });

  const percentual = resumo.total > 0 ? Math.round((resumo.concluidas / resumo.total) * 100) : 0;

  // ==========================================
  // FILTROS
  // ==========================================
  const materiasDisponiveis = [...new Set(salas.filter(Boolean).map(s => s.materia).filter(Boolean))];
  const tiposDisponiveis    = [...new Set(atividades.map(a => a.tipo))];

  const atividadesFiltradas = atividades.filter(atv => {
    const st = obterStatusAtividade(atv, horaAtual);

    if (filtroStatus !== 'todas' && st.chave !== filtroStatus) return false;
    if (filtroTipo !== 'todos' && atv.tipo !== filtroTipo) return false;

    if (filtroMateria !== 'todas') {
      const materiaDaAtividade = atv.materia || sala?.materia || '';
      if (materiaDaAtividade !== filtroMateria) return false;
    }

    if (busca.trim() && !atv.titulo?.toLowerCase().includes(busca.trim().toLowerCase())) return false;

    return true;
  });

  const itensPorPagina = 12;
  const totalPaginasAvatar = Math.ceil(AVATARES.length / itensPorPagina);
  const avataresAtuais = AVATARES.slice(
    paginaAvatar * itensPorPagina,
    (paginaAvatar + 1) * itensPorPagina
  );

  // Bloco de filtros reaproveitado na Home e na aba Atividades
  const renderFiltros = () => (
    <div className="filtros-barra">
      <div className="filtros-chips">
        {[
          { id: 'todas',     rotulo: 'Todas',       icone: <ClipboardList size={15} strokeWidth={1.75} />, cont: resumo.total },
          { id: 'aberta',    rotulo: 'Em aberto',   icone: <Clock size={15} strokeWidth={1.75} />,         cont: resumo.abertas },
          { id: 'concluida', rotulo: 'Finalizadas', icone: <CheckCircle2 size={15} strokeWidth={1.75} />,  cont: resumo.concluidas },
          { id: 'encerrada', rotulo: 'Encerradas',  icone: <Lock size={15} strokeWidth={1.75} />,          cont: resumo.encerradas },
        ].map(chip => (
          <button
            key={chip.id}
            className={`filtro-chip ${filtroStatus === chip.id ? 'ativo' : ''}`}
            onClick={() => setFiltroStatus(chip.id)}
          >
            {chip.icone} {chip.rotulo} <span className="filtro-chip-num">{chip.cont}</span>
          </button>
        ))}
      </div>

      <div className="filtros-selects">
        <label className="filtro-busca">
          <Search size={16} strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Buscar atividade..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </label>

        <select className="filtro-select" value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)}>
          <option value="todas">Todas as matérias</option>
          {materiasDisponiveis.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select className="filtro-select" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          {tiposDisponiveis.map(t => (
            <option key={t} value={t}>{tipoNome(t)}</option>
          ))}
        </select>
      </div>
    </div>
  );

  // Card de atividade reaproveitado
  const renderCardAtividade = (atv) => {
    const status = obterStatusAtividade(atv, horaAtual);

    return (
      <div key={atv.id} className={`aluno-atividade-card status-${status.chave}`}>
        <div className="atv-icon"><IconeTipo tipo={atv.tipo} /></div>
        <div className="atv-info">
          <strong>{atv.titulo}</strong>
          <p>
            {tipoNome(atv.tipo)}
            {sala?.materia && ` · ${sala.materia}`}
            {(atv.created_at || atv.criado_em) && ` · lançada em ${formatarData(atv.created_at || atv.criado_em)}`}
          </p>
          <p className={`atv-prazo prazo-${status.chave}`}>{status.msgTempo}</p>
        </div>

        {status.bloqueado ? (
          <button className="atv-btn desativado" disabled>
            {status.textoBotao}
          </button>
        ) : (
          <button
            className="atv-btn"
            onClick={() => navigate(
              atv.tipo === 'pintura' ? `/aluno/pintura` :
              atv.tipo === 'ligar'   ? `/aluno/ligar/${atv.id}` :
              atv.tipo === 'v_f'     ? `/aluno/atividade/v_f/${atv.id}` :
              `/aluno/atividade/${atv.id}`,
              { state: { atividade: atv, nomeAluno, sala } }
            )}
          >
            {status.textoBotao}
          </button>
        )}
      </div>
    );
  };

  const tituloDaPagina = {
    home: 'Página inicial',
    salas: 'Minhas salas',
    atividades: 'Atividades',
    colegas: 'Sala de colegas',
  }[pagina] || '';

  return (
    <div className="aluno-container">

      {/* MODAL AVATAR */}
      {modalAvatar && (
        <div className="modal-overlay" onClick={() => setModalAvatar(false)}>
          <div className="modal-avatar-card" onClick={e => e.stopPropagation()}>
            <div className="modal-avatar-header">
              <h3>Escolha seu personagem</h3>
              <button onClick={() => setModalAvatar(false)}><X size={18} strokeWidth={2} /></button>
            </div>
            <p>Ele vai te representar no Saber+ e no pódio da turma.</p>

            <div className="carrossel-avatares-container">
              <button
                className="carrossel-btn"
                onClick={() => setPaginaAvatar(prev => Math.max(prev - 1, 0))}
                disabled={paginaAvatar === 0}
              >
                <ChevronLeft size={22} strokeWidth={1.75} />
              </button>

              <div className="avatares-grid">
                {avataresAtuais.map((av, i) => (
                  <div
                    key={i}
                    className={`avatar-opcao ${avatarSelecionado === av ? 'selecionado' : ''}`}
                    onClick={() => escolherAvatar(av)}
                  >
                    <img src={av} alt={`Personagem ${i + 1}`} />
                  </div>
                ))}
              </div>

              <button
                className="carrossel-btn"
                onClick={() => setPaginaAvatar(prev => Math.min(prev + 1, totalPaginasAvatar - 1))}
                disabled={paginaAvatar === totalPaginasAvatar - 1}
              >
                <ChevronRight size={22} strokeWidth={1.75} />
              </button>
            </div>

            <div className="carrossel-indicadores">
              {Array.from({ length: totalPaginasAvatar }).map((_, index) => (
                <div
                  key={index}
                  className={`indicador-bolinha ${paginaAvatar === index ? 'ativo' : ''}`}
                />
              ))}
            </div>

          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="aluno-sidebar">
        <div className="aluno-brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>

        <nav className="aluno-nav">
          <button className={`aluno-nav-btn ${pagina === 'home' ? 'ativo' : ''}`} onClick={() => setPagina('home')}>
            <Home size={18} strokeWidth={1.75} /> Página inicial
          </button>
          <button className={`aluno-nav-btn ${pagina === 'salas' ? 'ativo' : ''}`} onClick={() => setPagina('salas')}>
            <School size={18} strokeWidth={1.75} /> Minhas salas
          </button>
          <button className={`aluno-nav-btn ${pagina === 'atividades' ? 'ativo' : ''}`} onClick={() => setPagina('atividades')}>
            <Target size={18} strokeWidth={1.75} /> Atividades
          </button>
          <button className={`aluno-nav-btn ${pagina === 'colegas' ? 'ativo' : ''}`} onClick={() => setPagina('colegas')}>
            <Users size={18} strokeWidth={1.75} /> Sala de colegas
          </button>
        </nav>

        {/* PERFIL DO ALUNO NO RODAPÉ DA SIDEBAR */}
        <div className="aluno-perfil-rodape" onClick={() => setModalAvatar(true)} title="Trocar meu personagem">
          <div className="perfil-rodape-foto">
            {avatarSelecionado
              ? <img src={avatarSelecionado} alt="Meu personagem" />
              : <UserRound size={26} strokeWidth={1.5} />
            }
          </div>
          <div className="perfil-rodape-info">
            <strong>{nomeAluno}</strong>
            <p>Nível {nivelAtual} · {titulo}</p>
          </div>
        </div>

        <button className="aluno-sair" onClick={sair}>
          <LogOut size={15} strokeWidth={1.75} /> Sair
        </button>
      </aside>

      {/* MAIN */}
      <main className="aluno-main">

        <header className="aluno-header-top">
          <h2 className="aluno-header-pagina">{tituloDaPagina}</h2>

          <div className="aluno-header-acoes">

            {/* TOP 5 DO PÓDIO NO CANTO */}
            {top5.length > 0 && (
              <div className="header-podio" onClick={() => setPagina('colegas')} title="Ver a sala de colegas">
                {top5.map((a) => (
                  <div key={a.nome} className={`header-podio-item pos-${a.posicao}`}>
                    <img src={avatarDoAluno(a.nome)} alt={a.nome} />
                    <span className="header-podio-medalha">{a.posicao}</span>
                  </div>
                ))}
                <span className="header-podio-texto">Top 5 da turma</span>
              </div>
            )}

            <button
              className="botao-tema"
              onClick={() => setModoEscuro(!modoEscuro)}
              title={modoEscuro ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
            >
              {modoEscuro
                ? <Sun size={19} strokeWidth={1.75} />
                : <Moon size={19} strokeWidth={1.75} />
              }
            </button>

          </div>
        </header>

        {/* HOME */}
        {pagina === 'home' && (
          <>
            <div className="aluno-header-card">
              {imagemBanner && (
                <img src={imagemBanner} alt="" className="aluno-header-imagem-bg" />
              )}

              <div className="aluno-header-texto">
                <h1>Olá, {nomeAluno}!</h1>
                <p>Que bom te ver por aqui. Vamos aprender e conquistar novas estrelas hoje?</p>
              </div>
            </div>

            {/* RESUMO DO ALUNO */}
            <section className="dash-aluno">
              <div className="dash-progresso">
                <div className="dash-progresso-topo">
                  <h3>Meu progresso</h3>
                  <strong>{percentual}%</strong>
                </div>
                <div className="dash-barra">
                  <div className="dash-barra-preenchida" style={{ width: `${percentual}%` }} />
                </div>
                <p className="dash-progresso-texto">
                  Você já fez <strong>{resumo.concluidas}</strong> de <strong>{resumo.total}</strong> atividades
                  {resumo.abertas > 0 ? ` — faltam ${resumo.abertas} para terminar.` : ' — tudo em dia.'}
                </p>
              </div>

              <div className="dash-cards">
                <button className="dash-card feito" onClick={() => { setFiltroStatus('concluida'); setPagina('atividades'); }}>
                  <span className="dash-card-icone"><CheckCircle2 size={19} strokeWidth={1.75} /></span>
                  <strong>{resumo.concluidas}</strong>
                  <p>Já fiz</p>
                </button>
                <button className="dash-card pendente" onClick={() => { setFiltroStatus('aberta'); setPagina('atividades'); }}>
                  <span className="dash-card-icone"><Clock size={19} strokeWidth={1.75} /></span>
                  <strong>{resumo.abertas}</strong>
                  <p>Falta fazer</p>
                </button>
                <button className="dash-card expirada" onClick={() => { setFiltroStatus('encerrada'); setPagina('atividades'); }}>
                  <span className="dash-card-icone"><Lock size={19} strokeWidth={1.75} /></span>
                  <strong>{resumo.encerradas}</strong>
                  <p>Perdi o prazo</p>
                </button>
                <button className="dash-card posicao" onClick={() => setPagina('colegas')}>
                  <span className="dash-card-icone"><Trophy size={19} strokeWidth={1.75} /></span>
                  <strong>{minhaPosicao}º</strong>
                  <p>Minha posição</p>
                </button>
              </div>
            </section>

            <div className="aluno-stats">
              <div className="stat-card">
                <span className="stat-icon"><Star size={22} strokeWidth={1.75} /></span>
                <div>
                  <strong>{pontos}</strong>
                  <p>pontos</p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon"><Shield size={22} strokeWidth={1.75} /></span>
                <div>
                  <strong>Nível {nivelAtual}</strong>
                  <p>{titulo}</p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon"><School size={22} strokeWidth={1.75} /></span>
                <div>
                  <strong>{salas.length}</strong>
                  <p>{salas.length === 1 ? 'sala' : 'salas'}</p>
                </div>
              </div>
            </div>

            {atividades.length === 0 ? (
              <div className="aluno-vazio">
                <Inbox size={30} strokeWidth={1.4} />
                <p>Nenhuma atividade disponível ainda.</p>
                <small>Seu professor vai lançar atividades em breve.</small>
              </div>
            ) : (
              <div className="aluno-atividades-lista">
                <h2>Atividades disponíveis</h2>
                {renderFiltros()}
                {atividadesFiltradas.length === 0 ? (
                  <div className="aluno-vazio">
                    <Search size={30} strokeWidth={1.4} />
                    <p>Nenhuma atividade com esse filtro.</p>
                    <small>Tente escolher outro filtro ali em cima.</small>
                  </div>
                ) : (
                  atividadesFiltradas.map(atv => renderCardAtividade(atv))
                )}
              </div>
            )}
          </>
        )}

        {/* MINHAS SALAS */}
        {pagina === 'salas' && (
          <div className="aluno-secao">
            <div className="aluno-salas-grid">
              {salas.filter(Boolean).map((s, i) => (
                <div key={i} className="aluno-sala-card">
                  <div className="aluno-sala-body">
                    <h3>{s.nome}</h3>
                    <p>{s.serie} · {s.materia}</p>
                    <p>Professor(a): {s.professor}</p>
                  </div>
                  <button className="aluno-sala-btn" onClick={() => setPagina('atividades')}>
                    Ver atividades
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ATIVIDADES */}
        {pagina === 'atividades' && (
          <div className="aluno-secao">
            {atividades.length === 0 ? (
              <div className="aluno-vazio">
                <Inbox size={30} strokeWidth={1.4} />
                <p>Nenhuma atividade disponível ainda.</p>
                <small>Seu professor vai lançar atividades em breve.</small>
              </div>
            ) : (
              <div className="aluno-atividades-lista">
                {renderFiltros()}
                {atividadesFiltradas.length === 0 ? (
                  <div className="aluno-vazio">
                    <Search size={30} strokeWidth={1.4} />
                    <p>Nenhuma atividade com esse filtro.</p>
                    <small>Tente escolher outro filtro ali em cima.</small>
                  </div>
                ) : (
                  atividadesFiltradas.map(atv => renderCardAtividade(atv))
                )}
              </div>
            )}
          </div>
        )}

        {/* SALA DE COLEGAS — PÓDIO DE CIMA PARA BAIXO */}
        {pagina === 'colegas' && (
          <div className="aluno-secao">
            {ranking.length === 0 ? (
              <div className="aluno-vazio">
                <Users size={30} strokeWidth={1.4} />
                <p>Ninguém entrou na sala ainda.</p>
                <small>Assim que a turma entrar, ela aparece aqui.</small>
              </div>
            ) : (
              <>
                <div className="colegas-titulo">
                  <h2>Pódio da turma</h2>
                  <p>{sala?.nome} · {ranking.length} {ranking.length === 1 ? 'aluno' : 'alunos'}</p>
                </div>

                <div className="podio-vertical">
                  {ranking.map((a, i) => (
                    <div
                      key={a.nome}
                      className={`podio-degrau lugar-${a.posicao <= 3 ? a.posicao : 'comum'} ${a.nome === nomeAluno ? 'eu' : ''}`}
                      style={{ width: `${Math.max(100 - i * 5, 68)}%` }}
                    >
                      <span className="podio-lugar">{a.posicao}º</span>
                      <img className="podio-foto" src={avatarDoAluno(a.nome)} alt={a.nome} />
                      <div className="podio-dados">
                        <strong>{a.nome}{a.nome === nomeAluno && <span className="podio-voce">você</span>}</strong>
                        <p>Nível {calcularNivel(a.pontos).nivel} · {calcularNivel(a.pontos).titulo}</p>
                      </div>
                      <span className="podio-pontos">{a.pontos} pts</span>
                    </div>
                  ))}
                </div>

                <div className="colegas-titulo">
                  <h2>Toda a turma</h2>
                  <p>Todo mundo que está estudando com você</p>
                </div>

                <div className="turma-grid">
                  {ranking.map(a => (
                    <div key={a.nome} className={`turma-card-aluno ${a.nome === nomeAluno ? 'eu' : ''}`}>
                      <img src={avatarDoAluno(a.nome)} alt={a.nome} />
                      <strong>{a.nome}</strong>
                      <p>{a.posicao}º · {a.pontos} pts</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

// --- FUNÇÕES AUXILIARES ---
function tipoNome(tipo) {
  return {
    quiz: 'Quiz',
    resposta_aberta: 'Resposta aberta',
    ligar: 'Ligar correspondentes',
    pintura: 'Pintar cenário',
    v_f: 'Verdadeiro ou falso'
  }[tipo] || tipo;
}

// Cada aluno recebe sempre o mesmo personagem, calculado a partir do nome
function avatarDoAluno(nome) {
  const salvo = localStorage.getItem(`saberPlusAvatar_${nome}`);
  if (salvo) return salvo;

  let soma = 0;
  for (let i = 0; i < (nome || '').length; i++) soma += nome.charCodeAt(i);
  return AVATARES[soma % AVATARES.length];
}

function formatarData(dataStr) {
  if (!dataStr) return '';
  const data = new Date(dataStr);
  if (isNaN(data)) return '';
  return data.toLocaleDateString('pt-BR');
}

// Mostra dias, horas, minutos e segundos ao vivo
function obterStatusAtividade(atv, horaAtual) {
  const concluida = atv.concluida || atv.respondida || false;
  const dataStr = atv.created_at || atv.criado_em || atv.data_criacao;
  const tempoLimite = Number(atv.tempo_limite);

  if (concluida) {
    return {
      chave: 'concluida',
      bloqueado: true,
      textoBotao: 'Concluída',
      msgTempo: 'Enviada para o professor'
    };
  }

  if (!dataStr || isNaN(tempoLimite) || tempoLimite === 0) {
    return {
      chave: 'aberta',
      bloqueado: false,
      textoBotao: 'Fazer',
      msgTempo: 'Sem limite de tempo'
    };
  }

  let dataSegura = dataStr;
  if (typeof dataStr === 'string' && dataStr.includes(' ') && !dataStr.includes('T')) {
    dataSegura = dataStr.replace(' ', 'T');
  }

  const dataCriacao = new Date(dataSegura);
  if (isNaN(dataCriacao)) {
    return { chave: 'aberta', bloqueado: false, textoBotao: 'Fazer', msgTempo: '' };
  }

  const dataLimite = new Date(dataCriacao.getTime() + tempoLimite * 60000);
  const diff = dataLimite - horaAtual;

  if (diff <= 0) {
    return {
      chave: 'encerrada',
      bloqueado: true,
      textoBotao: 'Encerrado',
      msgTempo: 'O prazo desta atividade expirou'
    };
  }

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutos = Math.floor((diff / 1000 / 60) % 60);
  const segundos = Math.floor((diff / 1000) % 60);

  let txtTempo = '';
  if (dias > 0) {
    txtTempo += `${dias} dia${dias > 1 ? 's' : ''} `;
    if (horas > 0) txtTempo += `${horas}h `;
  } else if (horas > 0) {
    txtTempo += `${horas}h ${minutos}m `;
  } else {
    txtTempo += `${minutos} min ${segundos < 10 ? '0' : ''}${segundos}s `;
  }

  return {
    chave: 'aberta',
    bloqueado: false,
    textoBotao: 'Fazer',
    msgTempo: `Faltam ${txtTempo.trim()}`
  };
}

export default AlunoHome;
