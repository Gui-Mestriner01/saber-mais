import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Dashboard.css';

// Função auxiliar criada fora do componente para gerar o código aleatório
const gerarCodigo = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

function CriarSala() {
  const navigate = useNavigate();
  
  // 1. TODOS OS ESTADOS AQUI DENTRO DAA FUNÇÃO
  const [nomeSala, setNomeSala]     = useState('');
  const [serie, setSerie]           = useState('');
  const [materia, setMateria]       = useState('');
  const [codigo]                    = useState(() => gerarCodigo());
  const [salaCriada, setSalaCriada] = useState(false);
  const [erro, setErro]             = useState('');
  const [senhaGerada, setSenhaGerada] = useState(''); // <- Movido para cá!

  // Criando a constante do ano atual para o seu input
  const ANO_ATUAL = new Date().getFullYear();

  // 2. FUNÇÃO DE SUBMIT MOVIDA PARA DENTRO
  const handleCriarSala = async (e) => {
    e.preventDefault();
    setErro('');

    try {
      const response = await fetch('http://localhost:3001/professor/sala', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ nome: nomeSala, serie, materia, codigo })
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || 'Erro ao criar sala.');
        return;
      }

      setSenhaGerada(data.senha);
      setSalaCriada(true);
    } catch {
      setErro('Não foi possível conectar ao servidor.');
    }
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

              {erro && <div className="msg-erro">{erro}</div>}
              
              {salaCriada && (
                <>
                  <div className="codigo-sala">
                    ✏️ Código da Sala: <strong>{codigo}</strong>
                  </div>
                  <div className="codigo-sala" style={{background:'#EBF4FF', borderColor:'#1A6FC4', color:'#1A6FC4'}}>
                    🔑 Senha da Sala: <strong>{senhaGerada}</strong>
                  </div>
                  <div className="msg-sucesso">
                    ✅ Sala criada! Compartilhe o código e a senha com seus alunos.
                  </div>
                </>
              )}

              {/* Adicionei um botão de submit para que a função seja chamada ao clicar */}
              {!salaCriada && (
                <button type="submit" className="btn-criar-sala" style={{marginTop: '20px'}}>
                  CRIAR SALA
                </button>
              )}

            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CriarSala;