import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Dashboard.css';

function DashboardProfessor() {
  const navigate = useNavigate();
  const nomeProfessor = localStorage.getItem('nomeUsuario') || 'Professor(a)';
  const [salas, setSalas] = useState([]);

  // --- DADOS SIMULADOS PARA VISUALIZAÇÃO DO DASHBOARD ---
  const atividadesEmAndamento = [
    { id: 1, titulo: 'Ligue os Animais', sala: 'Turma da Bagunça', entregues: 18, total: 20, cor: '#3DAA5C' },
    { id: 2, titulo: 'Atualidade', sala: '5º Ano - História', entregues: 12, total: 30, cor: '#F5812A' },
  ];

  const destaques = [
    { id: 1, nome: 'João Pedro', pontos: 1250, badge: '🥇' },
    { id: 2, nome: 'Maria Clara', pontos: 980, badge: '🥈' },
    { id: 3, nome: 'Enzo Gabriel', pontos: 850, badge: '🥉' },
  ];

  const feedMovimentacoes = [
    { id: 1, icon: '🟢', texto: 'Lucas entrou na sala "Turma da Bagunça"', tempo: 'Há 10 min' },
    { id: 2, icon: '⭐', texto: 'Ana finalizou a atividade "Atualidade" com nota máxima', tempo: 'Há 45 min' },
    { id: 3, icon: '📝', texto: 'Você criou a atividade "Ligue os Animais"', tempo: 'Há 2 horas' },
  ];
  // --------------------------------------------------------

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
        {/* HEADER E AÇÕES RÁPIDAS */}
        <header className="dashboard-header-painel">
          <div className="header-boas-vindas">
            <h1>Bem-vindo, {nomeProfessor}! 👋</h1>
            <p>Aqui está o resumo do progresso das suas turmas hoje.</p>
          </div>
          
          <div className="header-acoes">
            <button className="btn-acao-rapida" onClick={() => navigate('/professor/criar-sala')}>
              <span className="acao-icon">➕</span> Nova Sala
            </button>
            <button className="btn-acao-rapida destaque" onClick={() => navigate('/professor/criar-atividade')}>
              <span className="acao-icon">🎯</span> Nova Atividade
            </button>
            <div className="header-avatar" onClick={() => navigate('/professor/perfil')} style={{cursor:'pointer', marginLeft: '16px'}}>
              👨‍🏫
            </div>
          </div>
        </header>

        {/* SEÇÃO 1: PROGRESSO DE ATIVIDADES */}
        <section className="painel-secao">
          <div className="secao-header">
            <h2>📈 Atividades em Andamento</h2>
            <span className="badge-contagem">{salas.length} salas ativas</span>
          </div>
          
          <div className="progresso-grid">
            {atividadesEmAndamento.map(ativ => {
              const porcentagem = Math.round((ativ.entregues / ativ.total) * 100);
              return (
                <div key={ativ.id} className="progresso-card">
                  <div className="progresso-info">
                    <div className="progresso-textos">
                      <h3>{ativ.titulo}</h3>
                      <span>{ativ.sala}</span>
                    </div>
                    <div className="progresso-numeros" style={{ color: ativ.cor }}>
                      <strong>{porcentagem}%</strong>
                    </div>
                  </div>
                  <div className="barra-fundo">
                    <div className="barra-preenchida" style={{ width: `${porcentagem}%`, backgroundColor: ativ.cor }}></div>
                  </div>
                  <p className="progresso-detalhe">{ativ.entregues} de {ativ.total} alunos concluíram</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* SEÇÃO 2: GRID INFERIOR (FEED E GAMIFICAÇÃO) */}
        <div className="dashboard-grid-duplo">
          
          {/* FEED DE MOVIMENTAÇÕES */}
          <div className="form-card card-feed">
            <h2 className="form-section-title">🔔 Últimas Movimentações</h2>
            <div className="feed-lista">
              {feedMovimentacoes.map(item => (
                <div key={item.id} className="feed-item">
                  <div className="feed-icon">{item.icon}</div>
                  <div className="feed-conteudo">
                    <p>{item.texto}</p>
                    <span>{item.tempo}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-ver-tudo" onClick={() => navigate('/professor/relatorios')}>Ver histórico completo →</button>
          </div>

          {/* PÓDIO E DESTAQUES */}
          <div className="form-card card-podio">
            <h2 className="form-section-title">🏆 Destaques da Semana</h2>
            <p style={{fontSize: '13px', color: '#7AAAC8', fontWeight: 700, marginBottom: '16px'}}>
              Alunos com maior pontuação e engajamento.
            </p>
            <div className="podio-lista">
              {destaques.map((aluno, index) => (
                <div key={aluno.id} className={`podio-item ${index === 0 ? 'primeiro-lugar' : ''}`}>
                  <div className="podio-aluno">
                    <span className="podio-badge">{aluno.badge}</span>
                    <strong>{aluno.nome}</strong>
                  </div>
                  <div className="podio-pontos">
                    ⭐ {aluno.pontos} pts
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}

export default DashboardProfessor;