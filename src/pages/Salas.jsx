import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Dashboard.css';
import '../CSS/Salas.css';

function Salas() {
  const navigate = useNavigate();
  const [salas, setSalas]           = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salaSelecionada, setSalaSelecionada] = useState(null);
  const [alunos, setAlunos]         = useState([]);

  useEffect(() => {
    buscarSalas();
  }, []);

  const buscarSalas = async () => {
    try {
      const res = await fetch('http://localhost:3001/professor/salas', {
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
      const res = await fetch(`http://localhost:3001/professor/sala/${sala.id}/alunos`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setAlunos(data);
    } catch {
      console.error('Erro ao buscar alunos');
    }
  };

  const temaCor = (tema) => ({
    frutas:   'linear-gradient(135deg, #FF6B6B, #FF8E53)',
    animais:  'linear-gradient(135deg, #4ECDC4, #44A08D)',
    esportes: 'linear-gradient(135deg, #45B7D1, #2980B9)',
  }[tema] || 'linear-gradient(135deg, #1A6FC4, #2980B9)');

  const temaIcone = (tema) => ({
    frutas: '🍎', animais: '🐶', esportes: '⚽'
  }[tema] || '🏫');

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item" onClick={() => navigate('/professor/dashboard')}>🏠 Página Inicial</button>
          <button className="nav-item active">🏫 Salas</button>
          <button className="nav-item" onClick={() => navigate('/professor/criar-atividade')}>📝 Atividades</button>
          <button className="nav-item" onClick={() => navigate('/professor/relatorios')}>📊 Relatórios</button>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>🏫 Minhas Salas</h1>
          <div className="header-avatar" onClick={() => navigate('/professor/perfil')} style={{cursor:'pointer'}}>👨‍🏫</div>
        </header>

        {/* MODAL DETALHES */}
        {salaSelecionada && (
          <div className="modal-overlay" onClick={() => setSalaSelecionada(null)}>
            <div className="salas-modal" onClick={e => e.stopPropagation()}>
              <div className="salas-modal-header" style={{background: temaCor(salaSelecionada.tema_senha)}}>
                <span className="salas-modal-icon">{temaIcone(salaSelecionada.tema_senha)}</span>
                <div>
                  <h2>{salaSelecionada.nome}</h2>
                  <p>{salaSelecionada.serie} · {salaSelecionada.materia} · {salaSelecionada.ano_letivo}</p>
                </div>
                <button className="salas-modal-fechar" onClick={() => setSalaSelecionada(null)}>✕</button>
              </div>

              <div className="salas-modal-body">
                <div className="salas-modal-info">
                  <div className="salas-info-card">
                    <span>🔑</span>
                    <div>
                      <strong>Código</strong>
                      <p>{salaSelecionada.codigo}</p>
                    </div>
                  </div>
                  <div className="salas-info-card">
                    <span>🔒</span>
                    <div>
                      <strong>Senha</strong>
                      <p>{salaSelecionada.senha_emojis}</p>
                    </div>
                  </div>
                  <div className="salas-info-card">
                    <span>👥</span>
                    <div>
                      <strong>Alunos</strong>
                      <p>{alunos.length} aluno(s)</p>
                    </div>
                  </div>
                </div>

                <h3 className="salas-alunos-titulo">👥 Alunos da Sala</h3>
                {alunos.length === 0 ? (
                  <div className="salas-vazio">
                    <span>📭</span>
                    <p>Nenhum aluno entrou ainda.</p>
                  </div>
                ) : (
                  <div className="salas-alunos-lista">
                    {alunos.map((aluno, i) => (
                      <div key={i} className="salas-aluno-card">
                        <div className="salas-aluno-avatar">
                          {aluno.nome_aluno?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{aluno.nome_aluno}</strong>
                          <p>Entrou em {new Date(aluno.entrou_em).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {carregando ? (
          <div className="salas-loading">⏳ Carregando salas...</div>
        ) : salas.length === 0 ? (
          <div className="salas-empty">
            <span>🏫</span>
            <p>Você ainda não criou nenhuma sala.</p>
            <button className="btn-card-blue" onClick={() => navigate('/professor/criar-sala')}>
              + Criar primeira sala
            </button>
          </div>
        ) : (
          <>
            <div className="salas-banner-grid">
              {salas.map(sala => (
                <div key={sala.id} className="sala-banner">
                  <div className="sala-banner-topo" style={{background: temaCor(sala.tema_senha)}}>
                    <span className="sala-banner-icon">{temaIcone(sala.tema_senha)}</span>
                    <span className="sala-banner-codigo">{sala.codigo}</span>
                  </div>
                  <div className="sala-banner-corpo">
                    <h3>{sala.nome}</h3>
                    <p>{sala.serie}</p>
                    <p>{sala.materia}</p>
                    <div className="sala-banner-senha">
                      🔒 {sala.senha_emojis}
                    </div>
                  </div>
                  <button className="sala-banner-btn" onClick={() => verDetalhes(sala)}>
                    Ver detalhes →
                  </button>
                </div>
              ))}

              {/* Card criar nova sala */}
              <div className="sala-banner sala-banner-nova" onClick={() => navigate('/professor/criar-sala')}>
                <span>➕</span>
                <p>Criar nova sala</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Salas;