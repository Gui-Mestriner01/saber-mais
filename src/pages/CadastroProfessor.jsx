import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Cadastro.css';

export default function CadastroProfessor() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmarSenha: '' });
  const [cndb, setCndb]       = useState(null);
  const [erro, setErro]       = useState('');
  const [sucesso, setSucesso] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (form.senha !== form.confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    if (form.senha.length < 8) {
      setErro('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (!cndb) {
      setErro('Por favor, anexe sua Carteira Nacional Docente (CNDB).');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:3001/cadastro/professor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:  form.nome,
          email: form.email,
          senha: form.senha,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);

      setSucesso(data.mensagem);
      setForm({ nome: '', email: '', senha: '', confirmarSenha: '' });
      setCndb(null);

    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cadastro-container">
      <div className="cadastro-content">
        <div className="brand">
          <span className="brand-saber">Saber</span>
          <span className="brand-plus">+</span>
        </div>

        <div className="cadastro-card">
          <div className="cadastro-avatar">👨‍🏫</div>
          <h2>CADASTRO DO PROFESSOR</h2>
          <p className="subtitulo">Crie sua conta para gerenciar suas turmas!</p>

          {erro    && <p className="msg-erro">{erro}</p>}
          {sucesso && <p className="msg-sucesso">{sucesso}</p>}

          <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:14}}>

            <span className="campo-label">Nome Completo</span>
            <div className="input-group">
              <span className="input-icon">👤</span>
              <input name="nome" value={form.nome} onChange={handleChange} required placeholder="Seu nome completo" />
            </div>

            <span className="campo-label">E-mail</span>
            <div className="input-group">
              <span className="input-icon">@</span>
              <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="seu@email.com" />
            </div>

            <span className="campo-label">Senha</span>
            <div className="input-group">
              <span className="input-icon">🔒</span>
              <input name="senha" type="password" value={form.senha} onChange={handleChange} required placeholder="Mínimo 8 caracteres" />
            </div>

            <span className="campo-label">Confirmar Senha</span>
            <div className="input-group">
              <span className="input-icon">🔒</span>
              <input name="confirmarSenha" type="password" value={form.confirmarSenha} onChange={handleChange} required placeholder="Repita sua senha" />
            </div>

            <span className="campo-label">
              Carteira Nacional Docente (CNDB)
              <span style={{color:'#E23F3F', marginLeft:4}}>*</span>
            </span>
            <div
              className={`cndb-upload ${cndb ? 'cndb-ok' : ''}`}
              onClick={() => document.getElementById('cndb-input').click()}
            >
              {cndb ? (
                <>
                  <span>✅</span>
                  <p>{cndb.name}</p>
                  <small>Clique para trocar</small>
                </>
              ) : (
                <>
                  <span>📄</span>
                  <p>Clique para anexar sua CNDB</p>
                  <small>PDF, JPG ou PNG</small>
                </>
              )}
            </div>
            <input
              id="cndb-input"
              type="file"
              accept=".pdf,image/*"
              style={{display:'none'}}
              onChange={e => setCndb(e.target.files[0])}
            />

            <div className="cndb-aviso">
              🔐 Seu cadastro será analisado por um administrador antes de ser aprovado.
            </div>

            <button type="submit" className="btn-cadastrar-professor" disabled={loading}>
              {loading ? 'Cadastrando...' : 'CRIAR CONTA →'}
            </button>
          </form>

          <hr className="divisor" />

          <p className="cadastro-link">
            Já tem conta? <span onClick={() => navigate('/login/professor')}>Fazer login &gt;</span>
          </p>
        </div>

        <button className="back-btn" onClick={() => navigate('/')}>← Voltar</button>
      </div>
    </div>
  );
}