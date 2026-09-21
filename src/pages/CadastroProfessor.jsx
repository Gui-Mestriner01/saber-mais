import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Cadastro.css';
import { API } from '../api';

export default function CadastroProfessor() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmarSenha: '' });
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

    setLoading(true);

    try {
      const res = await fetch(`${API}/cadastro/professor`, {
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

      // Não tem mais fila de aprovação: a conta já nasce liberada,
      // então é só levar o professor para o login.
      setSucesso(data.mensagem);
      setForm({ nome: '', email: '', senha: '', confirmarSenha: '' });
      setTimeout(() => navigate('/login/professor'), 1500);

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