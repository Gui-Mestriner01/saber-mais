import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Dashboard.css';

function PerfilProfessor() {
  const navigate = useNavigate();
  const inputFoto = useRef(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [instituicao, setInstituicao] = useState('');
  const [materia, setMateria] = useState('');
  const [responsavelUnica, setResponsavelUnica] = useState(false);
  const [msgSucesso, setMsgSucesso] = useState(false);
  const [foto, setFoto] = useState(null);
  
  const [salasDoProf, setSalasDoProf] = useState([]); 

  // --- NOVOS ESTADOS PARA AS ESTATÍSTICAS ---
  const [totalSalas, setTotalSalas] = useState(0);
  const [totalAlunos, setTotalAlunos] = useState(0);

  useEffect(() => {
    buscarPerfil();
    buscarSalasEEstatisticas();
  }, []);

  const buscarPerfil = async () => {
    try {
      const res = await fetch('http://localhost:3001/professor/perfil', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setNome(data.nome || '');
      setEmail(data.email || '');
      setTelefone(data.telefone || '');
      setInstituicao(data.instituicao || '');
      setMateria(data.materia || '');
      // setFoto(data.foto || null);
    } catch {
      console.error('Erro ao buscar perfil');
    }
  };

  // Busca as salas para preencher a lista de códigos e contar as estatísticas
  const buscarSalasEEstatisticas = async () => {
    try {
      const res = await fetch('http://localhost:3001/professor/salas', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setSalasDoProf(data);
      setTotalSalas(data.length);

      // Aqui você poderia fazer uma chamada adicional para contar os alunos reais, 
      // mas para o visual, vamos simular que cada sala tem alguns alunos, ou se a API já retornar:
      setTotalAlunos(data.length * 15); // Exemplo visual provisório

    } catch {
      console.error('Erro ao buscar salas');
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/professor/perfil', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ nome, telefone, instituicao, materia })
      });

      if (res.ok) {
        setMsgSucesso(true);
        setTimeout(() => setMsgSucesso(false), 3000);
      }
    } catch {
      console.error('Erro ao salvar perfil');
    }
  };

  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setFoto(imageUrl);
    }
  };

  const copiarCodigo = (codigo) => {
    navigator.clipboard.writeText(codigo);
    alert(`Código ${codigo} copiado com sucesso!`);
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
          <button className="nav-item" onClick={() => navigate('/professor/criar-atividade')}>📝 Atividades</button>
          <button className="nav-item" onClick={() => navigate('/professor/relatorios')}>📊 Relatórios</button>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>⚙️ Meu Perfil</h1>
          <div className="header-avatar avatar-clicavel" onClick={() => inputFoto.current.click()}>
            {foto
              ? <img src={foto} alt="avatar" className="avatar-foto" />
              : '👨‍🏫'
            }
            <span className="avatar-hover-label">📷</span>
          </div>
          <input ref={inputFoto} type="file" accept="image/*" style={{display:'none'}} onChange={handleFoto} />
        </header>

        <div className="perfil-grid">

          {/* COLUNA ESQUERDA: Formulário */}
          <div className="form-card">
            <h2 className="form-section-title">Informações Pessoais</h2>

            <div className="foto-upload-area" onClick={() => inputFoto.current.click()}>
              <div className="foto-circulo">
                {foto
                  ? <img src={foto} alt="foto" className="avatar-foto" />
                  : <span style={{fontSize:'48px'}}>👨‍🏫</span>
                }
              </div>
              <button type="button" className="btn-alterar-foto">📷 Alterar Foto</button>
            </div>

            <form onSubmit={handleSalvar}>
              <div className="form-field">
                <div className="campo-label">Nome Completo</div>
                <div className="input-group">
                  <span className="input-icon">👤</span>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)} />
                </div>
              </div>

              <div className="form-field">
                <div className="campo-label">E-mail</div>
                <div className="input-group">
                  <span className="input-icon">@</span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled style={{backgroundColor: '#f0f5f9'}} />
                </div>
              </div>

              <div className="form-field">
                <div className="campo-label">Telefone</div>
                <div className="input-group">
                  <span className="input-icon">📱</span>
                  <input type="tel" placeholder="(00) 00000-0000" value={telefone} onChange={e => setTelefone(e.target.value)} />
                </div>
              </div>

              <div className="form-field">
                <div className="campo-label">Instituição que Trabalha</div>
                <div className="input-group">
                  <span className="input-icon">🏛️</span>
                  <input type="text" placeholder="Nome da escola / instituição" value={instituicao} onChange={e => setInstituicao(e.target.value)} />
                </div>
              </div>

              {!responsavelUnica && (
                <div className="form-field">
                  <div className="campo-label">Matéria que Leciona</div>
                  <div className="input-group">
                    <span className="input-icon">✏️</span>
                    <select value={materia} onChange={e => setMateria(e.target.value)}>
                      <option value="">Selecione a matéria</option>
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
              )}

              <div className="toggle-field">
                <label className="toggle-label">
                  <input type="checkbox" checked={responsavelUnica} onChange={e => setResponsavelUnica(e.target.checked)} />
                  <span className="toggle-text">Sou professor(a) responsável por uma única sala</span>
                </label>
              </div>

              {msgSucesso && <div className="msg-sucesso">✅ Perfil atualizado com sucesso!</div>}

              <button type="submit" className="btn-criar-sala">SALVAR ALTERAÇÕES</button>
            </form>
          </div>

          {/* COLUNA DIREITA: Dashboard/Estatísticas */}
          <div className="perfil-sidebar-direita">
            
            {/* NOVO CARD: Estatísticas */}
            <div className="form-card estatisticas-card">
              <h2 className="form-section-title">📊 Meu Desempenho</h2>
              <div className="stats-grid">
                <div className="stat-box">
                  <span className="stat-icon">🏫</span>
                  <div className="stat-info">
                    <span className="stat-num">{totalSalas}</span>
                    <span className="stat-label">Salas Ativas</span>
                  </div>
                </div>
                <div className="stat-box">
                  <span className="stat-icon">🎓</span>
                  <div className="stat-info">
                    <span className="stat-num">{totalAlunos}</span>
                    <span className="stat-label">Alunos</span>
                  </div>
                </div>
                <div className="stat-box full-width">
                  <span className="stat-icon">⭐</span>
                  <div className="stat-info">
                    <span className="stat-num">Profissional Saber+</span>
                    <span className="stat-label">Nível de Engajamento</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD ATUALIZADO: Códigos das salas */}
            <div className="form-card">
              <h2 className="form-section-title">📋 Acesso Rápido</h2>
              <p className="form-card-subtitle">
                Compartilhe o código para seus alunos entrarem na sala.
              </p>
              
              <div className="salas-codigos-list">
                {salasDoProf.length === 0 ? (
                  <div className="empty-state-mini">
                    <span>👻</span>
                    <p>Nenhuma sala criada ainda.</p>
                  </div>
                ) : (
                  salasDoProf.map(sala => (
                    <div key={sala.id} className="sala-codigo-card">
                      <div className="sala-codigo-info">
                        <strong>{sala.nome}</strong>
                        <span>{sala.serie} · {sala.materia}</span>
                      </div>
                      <div className="sala-codigo-actions">
                        <div className="sala-codigo-badge">{sala.codigo}</div>
                        <button 
                          className="btn-copiar-codigo" 
                          onClick={() => copiarCodigo(sala.codigo)}
                          title="Copiar Código"
                        >
                          📄
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}

export default PerfilProfessor;