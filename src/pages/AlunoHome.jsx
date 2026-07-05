import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

function AlunoHome() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const sala = state?.sala;
  const nomeAluno = state?.nomeAluno;

  const [atividades, setAtividades]               = useState([]);
  const [pontos, setPontos]                       = useState(0);
  const [pagina, setPagina]                       = useState('home');
  const [salas, setSalas]                         = useState([sala]);
  const [avatarSelecionado, setAvatarSelecionado] = useState(null);
  const [modalAvatar, setModalAvatar]             = useState(false);
  
  // Estado para a paginação do carrossel de avatares
  const [paginaAvatar, setPaginaAvatar]           = useState(0);
  
  // Estado para armazenar a imagem sorteada do banner
  const [imagemBanner, setImagemBanner]           = useState('');

  useEffect(() => {
    if (!nomeAluno || !sala) { navigate('/aluno'); return; }
    buscarAtividades();

    // Sorteia a imagem quando o componente carregar
    const imagemSorteada = ILUSTRACOES_BEM_VINDO[Math.floor(Math.random() * ILUSTRACOES_BEM_VINDO.length)];
    setImagemBanner(imagemSorteada);
  }, []);

  const buscarAtividades = async () => {
    try {
      const res = await fetch(`http://localhost:3001/sala/${sala.id}/atividades`);
      const data = await res.json();
      setAtividades(data);
    } catch {
      console.error('Erro ao buscar atividades');
    }
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

  const rankingMock = [
    { nome: nomeAluno, pontos },
    { nome: 'Maria',   pontos: 850 },
    { nome: 'João',    pontos: 720 },
    { nome: 'Pedro',   pontos: 650 },
    { nome: 'Ana',     pontos: 500 },
  ].sort((a, b) => b.pontos - a.pontos).map((a, i) => ({ ...a, posicao: i + 1 }));

  // Lógica de paginação dos avatares
  const itensPorPagina = 12; // Mostra 12 avatares por vez (3 linhas de 4)
  const totalPaginasAvatar = Math.ceil(AVATARES.length / itensPorPagina);
  const avataresAtuais = AVATARES.slice(
    paginaAvatar * itensPorPagina, 
    (paginaAvatar + 1) * itensPorPagina
  );

  return (
    <div className="aluno-container">

      {/* MODAL AVATAR */}
      {modalAvatar && (
        <div className="modal-overlay" onClick={() => setModalAvatar(false)}>
          <div className="modal-avatar-card" onClick={e => e.stopPropagation()}>
            <div className="modal-avatar-header">
              <h3>Escolha seu avatar</h3>
              <button onClick={() => setModalAvatar(false)}>✕</button>
            </div>
            <p>Escolha um avatar para te representar no Saber+</p>
            
            {/* Container do Carrossel */}
            <div className="carrossel-avatares-container">
              
              <button 
                className="carrossel-btn" 
                onClick={() => setPaginaAvatar(prev => Math.max(prev - 1, 0))}
                disabled={paginaAvatar === 0}
              >
                ◀
              </button>

              <div className="avatares-grid">
                {avataresAtuais.map((av, i) => (
                  <div
                    key={i}
                    className={`avatar-opcao ${avatarSelecionado === av ? 'selecionado' : ''}`}
                    onClick={() => { setAvatarSelecionado(av); setModalAvatar(false); }}
                  >
                    <img src={av} alt={`avatar ${i + 1}`} />
                    {avatarSelecionado === av && <span className="avatar-check">✅</span>}
                  </div>
                ))}
              </div>

              <button 
                className="carrossel-btn" 
                onClick={() => setPaginaAvatar(prev => Math.min(prev + 1, totalPaginasAvatar - 1))}
                disabled={paginaAvatar === totalPaginasAvatar - 1}
              >
                ▶
              </button>
            </div>

            {/* Indicadores de Página (Bolinhas) */}
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
            🏠 Página Inicial
          </button>
          <button className={`aluno-nav-btn ${pagina === 'salas' ? 'ativo' : ''}`} onClick={() => setPagina('salas')}>
            🏫 Minhas Salas
          </button>
          <button className={`aluno-nav-btn ${pagina === 'atividades' ? 'ativo' : ''}`} onClick={() => setPagina('atividades')}>
            🎯 Atividades
          </button>
          <button className={`aluno-nav-btn ${pagina === 'ranking' ? 'ativo' : ''}`} onClick={() => setPagina('ranking')}>
            🏆 Ranking
          </button>
        </nav>
        <button className="aluno-sair" onClick={() => navigate('/aluno')}>← Sair</button>
      </aside>

      {/* MAIN */}
      <main className="aluno-main">

        {/* HEADER COM AVATAR */}
        <header className="aluno-header-top">
          <h2 className="aluno-header-pagina">
            {pagina === 'home'       ? '🏠 Página Inicial' :
             pagina === 'salas'      ? '🏫 Minhas Salas'   :
             pagina === 'atividades' ? '🎯 Atividades'      :
             pagina === 'ranking'    ? '🏆 Ranking'         : ''}
          </h2>
          <div className="aluno-avatar-btn" onClick={() => setModalAvatar(true)}>
            {avatarSelecionado
              ? <img src={avatarSelecionado} alt="avatar" className="aluno-avatar-img" />
              : <span>👤</span>
            }
          </div>
        </header>

        {/* HOME */}
        {pagina === 'home' && (
          <>
            <div className="aluno-header-card">
              {/* IMAGEM DE FUNDO RENDERIZADA PRIMEIRO */}
              {imagemBanner && (
                <img src={imagemBanner} alt="Ilustração de boas-vindas" className="aluno-header-imagem-bg" />
              )}
              
              {/* TEXTO RENDERIZADO POR CIMA */}
              <div className="aluno-header-texto">
                <h1>Olá, {nomeAluno}! <span className="emoji-acenando">👋</span></h1>
                <p>Que bom te ver por aqui!</p>
                <p>Vamos aprender e conquistar novas estrelas hoje?</p>
              </div>
            </div>

            <div className="aluno-stats">
              <div className="stat-card">
                <span className="stat-icon">⭐</span>
                <div>
                  <strong>{pontos}</strong>
                  <p>pontos</p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">🛡️</span>
                <div>
                  <strong>Nível {nivelAtual}</strong>
                  <p>{titulo}</p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">🏫</span>
                <div>
                  <strong>{salas.length}</strong>
                  <p>{salas.length === 1 ? 'sala' : 'salas'}</p>
                </div>
              </div>
            </div>

            {atividades.length === 0 ? (
              <div className="aluno-vazio">
                <span>📭</span>
                <p>Nenhuma atividade disponível ainda!</p>
                <small>Seu professor vai lançar atividades em breve.</small>
              </div>
            ) : (
              <div className="aluno-atividades-lista">
                <h2>Atividades Disponíveis</h2>
                {atividades.map(atv => (
                  <div key={atv.id} className="aluno-atividade-card">
                    <div className="atv-icon">{tipoIcon(atv.tipo)}</div>
                    <div className="atv-info">
                      <strong>{atv.titulo}</strong>
                      <p>{tipoNome(atv.tipo)}</p>
                    </div>
                    <button
                      className="atv-btn"
                      onClick={() => navigate(
                        atv.tipo === 'pintura' ? `/aluno/pintura` :
                        atv.tipo === 'ligar'   ? `/aluno/ligar/${atv.id}` :
                        `/aluno/atividade/${atv.id}`,
                        { state: { atividade: atv, nomeAluno, sala } }
                      )}
                    >
                      Fazer →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* MINHAS SALAS */}
          {pagina === 'salas' && (
            <div className="aluno-secao">
              <div className="aluno-salas-grid">
                {salas.map((s, i) => (
                  <div key={i} className="aluno-sala-card">
                    <div className="aluno-sala-header">
                      <span>{temaIcone(s.tema_senha)}</span>
                    </div>
                    <div className="aluno-sala-body">
                      <h3>{s.nome}</h3>
                      <p>{s.serie} · {s.materia}</p>
                      <p>👨‍🏫 {s.professor}</p>
                    </div>
                    <button className="aluno-sala-btn" onClick={() => setPagina('atividades')}>
                      Ver Atividades →
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
                <span>📭</span>
                <p>Nenhuma atividade disponível ainda!</p>
                <small>Seu professor vai lançar atividades em breve.</small>
              </div>
            ) : (
              <div className="aluno-atividades-lista">
                {atividades.map(atv => (
                  <div key={atv.id} className="aluno-atividade-card">
                    <div className="atv-icon">{tipoIcon(atv.tipo)}</div>
                    <div className="atv-info">
                      <strong>{atv.titulo}</strong>
                      <p>{tipoNome(atv.tipo)}</p>
                    </div>
                    <button
                      className="atv-btn"
                      onClick={() => navigate(
                        atv.tipo === 'pintura' ? `/aluno/pintura` :
                        atv.tipo === 'ligar'   ? `/aluno/ligar/${atv.id}` :
                        `/aluno/atividade/${atv.id}`,
                        { state: { atividade: atv, nomeAluno, sala } }
                      )}
                    >
                      Fazer →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RANKING */}
        {pagina === 'ranking' && (
          <div className="aluno-secao">
            <div className="ranking-lista">
              {rankingMock.map((aluno, i) => (
                <div key={i} className={`ranking-card ${aluno.nome === nomeAluno ? 'eu' : ''}`}>
                  <span className="ranking-pos">
                    {aluno.posicao === 1 ? '🥇' : aluno.posicao === 2 ? '🥈' : aluno.posicao === 3 ? '🥉' : `#${aluno.posicao}`}
                  </span>
                  <span className="ranking-nome">{aluno.nome} {aluno.nome === nomeAluno ? '(você)' : ''}</span>
                  <span className="ranking-pontos">⭐ {aluno.pontos} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function tipoIcon(tipo) {
  return { quiz: '🎯', resposta_aberta: '✍️', ligar: '🔗', pintura: '🎨' }[tipo] || '📝';
}

function tipoNome(tipo) {
  return { quiz: 'Quiz', resposta_aberta: 'Resposta Aberta', ligar: 'Ligar Correspondentes', pintura: 'Pintar Cenário' }[tipo] || tipo;
}

function temaIcone(tema) {
  return { frutas: '🍎', animais: '🐶', esportes: '⚽' }[tema] || '🏫';
}

export default AlunoHome;