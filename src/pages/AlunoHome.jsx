import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../CSS/AlunoHome.css';

const AVATARES = [
  '/avatares/avatar.png',
  '/avatares/avatar2.PNG',
  '/avatares/avatar3.PNG',
  '/avatares/avatar4.PNG',
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

  useEffect(() => {
  if (!nomeAluno || !sala) { navigate('/aluno'); return; }
  buscarAtividades();
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
            <div className="avatares-grid">
              {AVATARES.map((av, i) => (
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
              <div className="aluno-header-texto">
                <h1>Olá, {nomeAluno}! 👋</h1>
                <p>Que bom te ver por aqui!</p>
                <p>Vamos aprender e conquistar novas estrelas hoje?</p>
              </div>
              <div className="aluno-header-ilustracao">📚✏️🌟</div>
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
                      onClick={() => navigate(`/aluno/atividade/${atv.id}`, {
                      state: { atividade: atv, nomeAluno, sala }
                      })}
                    > Fazer → </button>
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
                  <button className="aluno-sala-btn" onClick={() => { setSalas([s]); setPagina('atividades'); }}>
                    Ver Atividades →
                  </button>
                </div>
              ))}
              <div className="aluno-sala-card nova-sala" onClick={() => navigate('/aluno')}>
                <span>➕</span>
                <p>Entrar em outra sala</p>
              </div>
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
                    <button className="atv-btn">Fazer →</button>
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