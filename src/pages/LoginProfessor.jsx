import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Login.css';

function LoginProfessor() {
  const navigate = useNavigate();

  const [email, setEmail]           = useState('');
  const [senha, setSenha]           = useState('');
  const [erro, setErro]             = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const response = await fetch('http://localhost:3001/login/professor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || 'Erro ao fazer login.');
        setCarregando(false);
        return;
      }

      // Salva no localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('nomeUsuario', data.usuario.nome);
      localStorage.setItem('idUsuario', data.usuario.id);
      localStorage.setItem('tipoUsuario', data.usuario.tipo);

      // Redireciona baseado no tipo
      if (data.usuario.tipo === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/professor/dashboard');
      }

    } catch {
      setErro('Não foi possível conectar ao servidor.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>

        <div className="login-card">
          <h2>LOGIN DO PROFESSOR</h2>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <span className="input-icon">@</span>
              <input
                type="email"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <span className="input-icon">🔒</span>
              <input
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
              />
            </div>

            {erro && <div className="msg-erro">{erro}</div>}

            <button className="btn-entrar" type="submit" disabled={carregando}>
              {carregando ? 'Entrando...' : 'ENTRAR'}
            </button>
          </form>

          <p className="cadastro-link">
            Não tem login? <span onClick={() => navigate('/cadastro/professor')}>Cadastrar-se &gt;</span>
          </p>
        </div>

        <button className="back-btn" onClick={() => navigate('/')}>← Voltar</button>
      </div>
    </div>
  );
}

export default LoginProfessor;