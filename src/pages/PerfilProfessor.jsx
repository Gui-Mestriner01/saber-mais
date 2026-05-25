import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Dashboard.css';

function PerfilProfessor() {
  const navigate = useNavigate();
  const inputFoto = useRef(null);

  // --- DECLARAÇÃO DE ESTADOS ---
  // Inferidos com base nos inputs e variáveis que você usa no JSX
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [instituicao, setInstituicao] = useState('');
  const [materia, setMateria] = useState('');
  const [responsavelUnica, setResponsavelUnica] = useState(false);
  const [msgSucesso, setMsgSucesso] = useState(false);
  const [foto, setFoto] = useState(null);
  
  // Array vazio por padrão para não quebrar o .map() das salas
  const [salasDoProf, setSalasDoProf] = useState([]); 

  useEffect(() => {
    buscarPerfil();
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
      // Se a API retornar as salas e a foto, você pode atualizar os estados aqui também:
      // setSalasDoProf(data.salas || []);
      // setFoto(data.foto || null);
    } catch {
      console.error('Erro ao buscar perfil');
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

  // Função para exibir a foto selecionada na tela
  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setFoto(imageUrl);
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
          <button className="nav-item" onClick={() => navigate('/professor/salas')}>🏫 Salas</button>
          <button className="nav-item" onClick={() => navigate('/professor/criar-atividade')}>📝 Atividades</button>
          <button className="nav-item" onClick={() => navigate('/professor/relatorios')}>📊 Relatórios</button>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>⚙️ Meu Perfil</h1>
          {/* Avatar clicável com foto */}
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

          {/* Formulário */}
          <div className="form-card">
            <h2 className="form-section-title">Informações Pessoais</h2>

            {/* Upload de foto centralizado */}
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
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
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

          {/* Códigos das salas */}
          <div className="form-card">
            <h2 className="form-section-title">📋 Códigos das Minhas Salas</h2>
            <p style={{fontSize:'13px', color:'#7AAAC8', fontWeight:700, marginBottom:'16px'}}>
              Compartilhe o código com seus alunos para entrar na sala.
            </p>
            <div className="salas-codigos-list">
              {salasDoProf.map(sala => (
                <div key={sala.id} className="sala-codigo-card">
                  <div className="sala-codigo-info">
                    <strong>{sala.nome}</strong>
                    <span>{sala.serie} · {sala.materia}</span>
                  </div>
                  <div className="sala-codigo-badge">{sala.codigo}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default PerfilProfessor;