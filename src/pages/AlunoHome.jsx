import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home, School, Target, Users, Trophy, Sun, Moon, UserRound, Star, Shield,
  CheckCircle2, Clock, Lock, Search, ListChecks, Link2, Palette, PenLine,
  ClipboardList, Inbox, LogOut, X, ChevronLeft, ChevronRight, Radio, Award,
  ArrowDownUp, LayoutGrid, Shapes
} from 'lucide-react';
import Insignia from '../components/Insignia';
import FestaInsignias from '../components/FestaInsignias';
import '../CSS/AlunoHome.css';
import '../CSS/AoVivo.css';
import '../CSS/Conquistas.css';
import { API, cabecalhoAluno, tokenAluno, sairAluno } from '../api';

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
  '/ilustracoes/banner1.webp',
  '/ilustracoes/banner2.webp',
  '/ilustracoes/banner3.webp',
  '/ilustracoes/banner4.webp',
];

// Cada tipo de atividade tem seu ícone
function IconeTipo({ tipo, size = 20 }) {
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
}

function AlunoHome() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const sala = state?.sala;
  const nomeAluno = state?.nomeAluno;
  // Algumas telas de atividade antigas voltam para cá só com sala e nome.
  // Quando o id não vem, ele é descoberto pela lista da turma (colegas),
  // senão as insígnias e o aviso da aula ao vivo não saberiam quem é o aluno.
  const alunoIdDoEstado = state?.alunoId;

  const [atividades, setAtividades]               = useState([]);
  const [pontos, setPontos]                       = useState(0);
  const [pagina, setPagina]                       = useState('home');
  const [salas]                                   = useState([sala]);
  const [colegas, setColegas]                     = useState([]);
  const alunoId = alunoIdDoEstado ?? colegas.find(c => c.nome_aluno === nomeAluno)?.id;
  const [avatarSelecionado, setAvatarSelecionado] = useState(null);
  const [modalAvatar, setModalAvatar]             = useState(false);

  const [paginaAvatar, setPaginaAvatar]           = useState(0);
  const [imagemBanner, setImagemBanner]           = useState('');

  // Filtros das atividades
  const [filtroStatus, setFiltroStatus]   = useState('todas');
  const [filtroMateria, setFiltroMateria] = useState('todas');
  const [filtroTipo, setFiltroTipo]       = useState('todos');
  const [busca, setBusca]                 = useState('');

  // Aviso de aula ao vivo: o professor chamou a turma
  const [convite, setConvite] = useState(null);

  // Insígnias do aluno nesta turma, e as que ele acabou de ganhar
  const [conquistas, setConquistas]   = useState(null);
  const [insigniasColegas, setInsigniasColegas] = useState({});

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
    // Sem crachá (aba nova, sessão vencida) volta para escolher a sala
    if (!nomeAluno || !sala || !tokenAluno()) { navigate('/aluno/area'); return; }
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

  /* --------------------------------------------------------------------
     O professor chamou para a aula ao vivo?

     Perguntamos ao servidor de 5 em 5 segundos. A rota é de propósito bem
     leve (responde da memória, sem tocar no banco), porque isso roda o
     tempo todo enquanto o aluno está na plataforma.

     Cada chamada do professor tem um número que só cresce. Guardamos o
     último número que o aluno dispensou: assim, se ele fechar o aviso e o
     professor chamar de novo, o aviso volta a aparecer.
     -------------------------------------------------------------------- */
  useEffect(() => {
    if (!sala?.id) return;

    const chave = `saberPlusConviteVisto_${sala.id}`;
    let vivo = true;

    const consultar = async () => {
      try {
        const res = await fetch(`${API}/live/convite/${sala.id}`, { headers: cabecalhoAluno() });
        const dados = await res.json();
        if (!vivo) return;

        const dispensado = Number(localStorage.getItem(chave) || 0);
        setConvite(dados.chamando && dados.conviteId > dispensado ? dados : null);
      } catch {
        /* sem internet agora: tenta de novo na próxima volta */
      }
    };

    consultar();
    const id = setInterval(consultar, 5000);
    return () => { vivo = false; clearInterval(id); };
  }, [sala?.id, alunoId]);

  const entrarAoVivo = () => {
    const avatar = avatarDoAluno(nomeAluno).replace('/avatares/', '');

    localStorage.setItem('alunoTemporario', JSON.stringify({
      nome: nomeAluno,
      avatar,
      salaId: sala.id,
      salaNome: sala.nome,
      codigoSala: sala.codigo,
      alunoId,
      token: tokenAluno(), // crachá do aluno: é com ele que a partida sabe quem entrou
      // Guardado para o botão "Sair" da aula trazer o aluno de volta para
      // esta página do jeito que ela estava, sem pedir login de novo.
      voltar: { sala, nomeAluno, alunoId, pontos }
    }));
    localStorage.removeItem('jogadorLive');
    navigate('/aluno/lobby');
  };

  const dispensarConvite = () => {
    if (convite) localStorage.setItem(`saberPlusConviteVisto_${sala.id}`, convite.conviteId);
    setConvite(null);
  };

  /* --------------------------------------------------------------------
     Insígnias. O servidor mede tudo e já grava o que o aluno conquistou,
     então aqui é só buscar e mostrar. As marcadas como "nova" são as que
     ainda não ganharam comemoração.
     -------------------------------------------------------------------- */
  const buscarConquistas = async () => {
    if (!alunoId) return;
    try {
      const res = await fetch(`${API}/aluno/${alunoId}/conquistas?t=${Date.now()}`, { headers: cabecalhoAluno() });
      if (res.ok) setConquistas(await res.json());
    } catch {
      /* sem conquistas por enquanto: a página continua funcionando */
    }

    // Quantas insígnias cada colega tem, para a sala de colegas
    try {
      const res = await fetch(`${API}/sala/${sala.id}/conquistas`, { headers: cabecalhoAluno() });
      if (res.ok) {
        const dados = await res.json();
        setInsigniasColegas(Object.fromEntries(
          (dados.porAluno || []).map(l => [String(l.aluno_id), Number(l.total)])
        ));
      }
    } catch { /* tudo bem */ }
  };

  useEffect(() => {
    if (alunoId) buscarConquistas();
  }, [alunoId]);

  const fecharFesta = async () => {
    // Some da tela na hora; o servidor é avisado em seguida
    setConquistas(atual => atual && ({
      ...atual,
      lista: atual.lista.map(c => ({ ...c, nova: false }))
    }));
    try {
      await fetch(`${API}/aluno/${alunoId}/conquistas/vistas`, { method: 'POST', headers: cabecalhoAluno() });
    } catch { /* se falhar, a festa só aparece de novo na próxima visita */ }
  };

  const buscarAtividades = async () => {
    try {
      const res = await fetch(`${API}/sala/${sala.id}/atividades?t=${Date.now()}`, { headers: cabecalhoAluno() });
      if (res.status === 401) { sairAluno(); navigate('/aluno/area'); return; } // crachá venceu: entra de novo
      const data = await res.json();
      if (Array.isArray(data)) setAtividades(data);
    } catch {
      /* sem internet agora: a lista continua como estava */
    }
  };

  // Busca a turma inteira (nome + pontos) para montar o pódio
  const buscarColegas = async () => {
    try {
      const res = await fetch(`${API}/sala/${sala.id}/alunos?t=${Date.now()}`, { headers: cabecalhoAluno() });
      const data = await res.json();
      if (Array.isArray(data)) {
        setColegas(data);
        const eu = data.find(a => a.nome_aluno === nomeAluno);
        if (eu) setPontos(Number(eu.pontos) || 0);
      }
    } catch {
      /* sem internet agora */
    }
  };

  const sair = () => {
    if (!window.confirm('Sair da sala e voltar para o início?')) return;

    // O personagem escolhido continua salvo, para o aluno reencontrar da
    // próxima vez. Sai só o que é da sessão.
    localStorage.removeItem('alunoTemporario');
    sairAluno();
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
    .map(c => ({ id: c.id, nome: c.nome_aluno, pontos: Number(c.pontos) || 0 }))
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
              atv.tipo === 'ordenar' ? `/aluno/ordenar/${atv.id}` :
              atv.tipo === 'memoria' ? `/aluno/memoria/${atv.id}` :
              atv.tipo === 'grupos'  ? `/aluno/grupos/${atv.id}` :
              `/aluno/atividade/${atv.id}`,
              { state: { atividade: atv, nomeAluno, sala, alunoId } }
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
    conquistas: 'Minhas conquistas',
  }[pagina] || '';

  const novasInsignias = conquistas?.lista.filter(c => c.nova) || [];

  // Agrupa o catálogo na ordem em que o servidor mandou
  const gruposInsignias = [];
  (conquistas?.lista || []).forEach(c => {
    let grupo = gruposInsignias.find(g => g.nome === c.grupo);
    if (!grupo) { grupo = { nome: c.grupo, itens: [] }; gruposInsignias.push(grupo); }
    grupo.itens.push(c);
  });

  return (
    <div className="aluno-container">

      {/* AVISO DE AULA AO VIVO */}
      {convite && (
        <div className="aovivo-chamado-fundo">
          <div className="aovivo-chamado">
            <span className="chamado-luz" aria-hidden="true"><Radio size={30} strokeWidth={2} /></span>

            <h2>Sua aula ao vivo começou!</h2>
            <p className="chamado-sala">{convite.salaNome}</p>
            <p className="chamado-texto">
              {convite.estado === 'lobby'
                ? 'O professor está esperando a turma na sala. Entre para participar!'
                : 'A turma já está jogando — entre agora para não perder o resto!'}
            </p>

            {convite.naSala > 0 && (
              <p className="chamado-quantos">
                {convite.naSala} {convite.naSala === 1 ? 'colega já entrou' : 'colegas já entraram'}
              </p>
            )}

            <button className="chamado-entrar" onClick={entrarAoVivo}>Entrar na aula</button>
            <button className="chamado-depois" onClick={dispensarConvite}>Agora não</button>
          </div>
        </div>
      )}

      {/* COMEMORAÇÃO DE INSÍGNIA NOVA
          Espera o aviso da aula ao vivo sair da tela, para não empilhar. */}
      {!convite && (
        <FestaInsignias
          novas={novasInsignias}
          subtitulo={`Conquistada em ${sala?.nome}`}
          aoFechar={fecharFesta}
        />
      )}

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
            <Home size={18} strokeWidth={1.75} />
            <span className="rotulo-longo">Página inicial</span>
            <span className="rotulo-curto">Início</span>
          </button>
          <button className={`aluno-nav-btn ${pagina === 'salas' ? 'ativo' : ''}`} onClick={() => setPagina('salas')}>
            <School size={18} strokeWidth={1.75} />
            <span className="rotulo-longo">Minhas salas</span>
            <span className="rotulo-curto">Salas</span>
          </button>
          <button className={`aluno-nav-btn ${pagina === 'atividades' ? 'ativo' : ''}`} onClick={() => setPagina('atividades')}>
            <Target size={18} strokeWidth={1.75} />
            <span className="rotulo-longo">Atividades</span>
            <span className="rotulo-curto">Atividades</span>
          </button>
          <button className={`aluno-nav-btn ${pagina === 'colegas' ? 'ativo' : ''}`} onClick={() => setPagina('colegas')}>
            <Users size={18} strokeWidth={1.75} />
            <span className="rotulo-longo">Sala de colegas</span>
            <span className="rotulo-curto">Colegas</span>
          </button>
          <button className={`aluno-nav-btn ${pagina === 'conquistas' ? 'ativo' : ''}`} onClick={() => setPagina('conquistas')}>
            <Award size={18} strokeWidth={1.75} />
            <span className="rotulo-longo">Conquistas</span>
            <span className="rotulo-curto">Conquistas</span>
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
          <LogOut size={15} strokeWidth={1.75} /> <span className="rotulo-botao">Sair</span>
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
              <button
                className={`stat-card stat-insignias ${novasInsignias.length > 0 ? 'tem-nova' : ''}`}
                onClick={() => setPagina('conquistas')}
                title="Ver minhas conquistas"
              >
                <span className="stat-icon"><Award size={22} strokeWidth={1.75} /></span>
                <div>
                  <strong>{conquistas ? `${conquistas.conquistadas} de ${conquistas.total}` : '—'}</strong>
                  <p>insígnias</p>
                </div>
              </button>
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

        {/* CONQUISTAS */}
        {pagina === 'conquistas' && (
          <div className="aluno-secao">
            {!conquistas ? (
              <div className="aluno-vazio">
                <Award size={30} strokeWidth={1.4} />
                <p>Carregando suas insígnias…</p>
              </div>
            ) : (
              <>
                <div className="conquistas-resumo">
                  <div className="conquistas-contador">
                    {conquistas.conquistadas}<small> / {conquistas.total}</small>
                  </div>
                  <div className="conquistas-resumo-texto">
                    <h3>Suas insígnias em {sala?.nome}</h3>
                    <p>
                      {conquistas.conquistadas === 0
                        ? 'Faça sua primeira atividade para ganhar a primeira!'
                        : conquistas.conquistadas === conquistas.total
                          ? 'Você conquistou todas. Que demais!'
                          : 'Cada turma tem as suas: aqui você coleciona as desta.'}
                    </p>
                    <div className="conquistas-barra">
                      <i style={{ width: `${Math.round((conquistas.conquistadas / conquistas.total) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                {gruposInsignias.map(grupo => (
                  <section key={grupo.nome} className="conquistas-grupo">
                    <h3>{grupo.nome}</h3>
                    <div className="conquistas-grade">
                      {grupo.itens.map(c => (
                        <div key={c.codigo} className={`conquistas-cartao ${c.conquistada ? 'conquistada' : ''}`}>
                          <Insignia insignia={c} />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </>
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
                        <strong>
                          {a.nome}{a.nome === nomeAluno && <span className="podio-voce">você</span>}
                          {insigniasColegas[String(a.id)] > 0 && (
                            <span className="colegas-insignias" title="Insígnias nesta turma">
                              <Award size={11} strokeWidth={2.4} /> {insigniasColegas[String(a.id)]}
                            </span>
                          )}
                        </strong>
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
    v_f: 'Verdadeiro ou falso',
    ordenar: 'Colocar em ordem',
    memoria: 'Jogo da memória',
    grupos: 'Separar em grupos'
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
