import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Dashboard.css';

const salas = [
  { id: 1, nome: '5º Ano A', materia: 'Matemática' },
  { id: 2, nome: '3º Ano B', materia: 'Português' },
];

const tiposAtividade = [
  { id: 'quiz', icon: '🎯', nome: 'Quiz', desc: 'Perguntas de múltipla escolha' },
  { id: 'resposta_aberta', icon: '✍️', nome: 'Resposta Aberta', desc: 'Aluno digita a resposta' },
  { id: 'ligar', icon: '🔗', nome: 'Ligar Correspondentes', desc: 'Conectar colunas relacionadas' },
  { id: 'pintar', icon: '🎨', nome: 'Pintar Cenário', desc: 'Aluno pinta elementos da cena' },
];

function CriarAtividade() {
  const navigate = useNavigate();
  const [salaSelecionada, setSalaSelecionada] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState('');

  const handleContinuar = () => {
    if (tipoSelecionado === 'quiz') navigate('/professor/criar-quiz');
    if (tipoSelecionado === 'ligar')  navigate('/professor/criar-ligar');
    if (tipoSelecionado === 'pintar')  navigate('/professor/criar-pintura');
    if (tipoSelecionado === 'resposta_aberta') navigate('/professor/criar-resposta-aberta');

    // outros tipos serão adicionados futuramente
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item" onClick={() => navigate('/professor/dashboard')}>🏠 Página Inicial</button>
          <button className="nav-item" onClick={() => navigate('/professor/salas')}>🏫 Salas</button>
          <button className="nav-item active">📝 Atividades</button>
          <button className="nav-item" onClick={() => navigate('/professor/relatorios')}>📊 Relatórios</button>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>Criar Atividade</h1>
          <div className="header-avatar" onClick={() => navigate('/professor/perfil')} style={{cursor:'pointer'}}>👨‍🏫</div>
        </header>

        <div className="form-card">
          <div className="campo-label">Selecione a Turma</div>
          <div className="input-group">
            <span className="input-icon">🏫</span>
            <select value={salaSelecionada} onChange={e => setSalaSelecionada(e.target.value)}>
              <option value="">Escolha uma sala...</option>
              {salas.map(s => (
                <option key={s.id} value={s.id}>{s.nome} — {s.materia}</option>
              ))}
            </select>
          </div>

          {salaSelecionada && (
            <>
              <div className="campo-label" style={{marginTop: '24px'}}>Tipo de Atividade</div>
              <div className="tipos-grid">
                {tiposAtividade.map(tipo => (
                  <div
                    key={tipo.id}
                    className={`tipo-card ${tipoSelecionado === tipo.id ? 'selecionado' : ''}`}
                    onClick={() => setTipoSelecionado(tipo.id)}
                  >
                    <span className="tipo-icon">{tipo.icon}</span>
                    <strong>{tipo.nome}</strong>
                    <p>{tipo.desc}</p>
                  </div>
                ))}
              </div>

              {tipoSelecionado && (
                <button
                  className="btn-criar-sala"
                  style={{marginTop: '24px'}}
                  onClick={handleContinuar}
                >
                  CONTINUAR
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default CriarAtividade;