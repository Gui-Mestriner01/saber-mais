import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Dashboard.css';

const ANO_ATUAL = 2026;

function gerarCodigo() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function CriarSala() {
  const navigate = useNavigate();
  const [nomeSala, setNomeSala]     = useState('');
  const [serie, setSerie]           = useState('');
  const [materia, setMateria]       = useState('');
  const [codigo]                    = useState(() => gerarCodigo());
  const [salaCriada, setSalaCriada] = useState(false);

  const handleCriarSala = (e) => {
    e.preventDefault();
    setSalaCriada(true);
  };

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
          <h1>Criar Sala</h1>
          <div className="header-avatar" onClick={() => navigate('/professor/perfil')} style={{cursor:'pointer'}}>👨‍🏫</div>
        </header>

        <div className="centralizar">
          <div className="form-card form-card-lg">
            <form onSubmit={handleCriarSala}>

              <div className="form-field">
                <div className="campo-label">Nome da Sala</div>
                <div className="input-group">
                  <span className="input-icon">🏫</span>
                  <input
                    type="text"
                    placeholder="Ex: Turma da Manhã"
                    value={nomeSala}
                    onChange={e => setNomeSala(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <div className="campo-label">Série</div>
                  <div className="input-group">
                    <span className="input-icon">📚</span>
                    <select value={serie} onChange={e => setSerie(e.target.value)} required>
                      <option value="">Selecione</option>
                      <option>1º Ano</option>
                      <option>2º Ano</option>
                      <option>3º Ano</option>
                      <option>4º Ano</option>
                      <option>5º Ano</option>
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <div className="campo-label">Matéria</div>
                  <div className="input-group">
                    <span className="input-icon">✏️</span>
                    <select value={materia} onChange={e => setMateria(e.target.value)} required>
                      <option value="">Selecione</option>
                      <option>Português</option>
                      <option>Matemática</option>
                      <option>Ciências</option>
                      <option>História</option>
                      <option>Geografia</option>
                      <option>Artes</option>
                      <option>Educação Física</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-field">
                <div className="campo-label">Ano Letivo</div>
                <div className="input-group">
                  <span className="input-icon">📅</span>
                  <input
                    type="number"
                    value={ANO_ATUAL}
                    readOnly
                    style={{color:'#7AAAC8', cursor:'not-allowed'}}
                  />
                </div>
              </div>

              {!salaCriada ? (
                <button type="submit" className="btn-criar-sala">CRIAR SALA</button>
              ) : (
                <>
                  <div className="codigo-sala">
                    ✏️ Código da Sala: <strong>{codigo}</strong>
                  </div>
                  <div className="msg-sucesso">
                    ✅ Sala criada! Compartilhe o código com seus alunos.
                  </div>
                </>
              )}

            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CriarSala;