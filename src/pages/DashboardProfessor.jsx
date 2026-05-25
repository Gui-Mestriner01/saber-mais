import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Dashboard.css';

function DashboardProfessor() {
  const navigate = useNavigate();
  const nomeProfessor = localStorage.getItem('nomeUsuario') || 'Professor(a)';
  const [salas, setSalas] = useState([]);

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
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item active">🏠 Página Inicial</button>
          <button className="nav-item" onClick={() => navigate('/professor/salas')}>🏫 Salas</button>
          <button className="nav-item" onClick={() => navigate('/professor/criar-atividade')}>📝 Atividades</button>
          <button className="nav-item" onClick={() => navigate('/professor/relatorios')}>📊 Relatórios</button>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>Bem-vindo, {nomeProfessor}! 👋</h1>
          <div className="header-avatar" onClick={() => navigate('/professor/perfil')} style={{cursor:'pointer'}}>
            👨‍🏫
          </div>
        </header>

        <div className="cards-grid">
          {/* Card Minhas Salas */}
          <div className="dash-card card-salas">
            <div className="card-illustration">🏫</div>
            <div className="card-info">
              <h2>Minhas Salas</h2>
              <p>
                {salas.length === 0
                  ? 'Você ainda não tem salas criadas.'
                  : `Você tem ${salas.length} sala(s) ativa(s).`
                }
              </p>
            </div>
            <button className="btn-card-blue" onClick={() => navigate('/professor/criar-sala')}>
              CRIAR NOVA SALA
            </button>
          </div>

          {/* Card Criar Atividade */}
          <div className="dash-card card-atividade" onClick={() => navigate('/professor/criar-atividade')}>
            <div className="card-illustration">🎯</div>
            <h2>Criar Atividade</h2>
            <p>Desenvolva atividades interativas para engajar seus alunos.</p>
          </div>

          {/* Card Relatórios */}
          <div className="dash-card card-relatorio" onClick={() => navigate('/professor/relatorios')}>
            <div className="card-illustration">📊</div>
            <h2>Relatórios</h2>
            <p>Acompanhe o desempenho e evolução de cada aluno.</p>
          </div>
        </div>

        {/* Lista de salas */}
        {salas.length > 0 && (
          <div className="salas-recentes">
            <h2 className="form-section-title">Suas Salas</h2>
            <div className="salas-recentes-lista">
              {salas.map(sala => (
                <div key={sala.id} className="sala-recente-card">
                  <div className="sala-recente-info">
                    <strong>{sala.nome}</strong>
                    <span>{sala.serie} · {sala.materia}</span>
                  </div>
                  <div className="sala-codigo-badge">{sala.codigo}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default DashboardProfessor;