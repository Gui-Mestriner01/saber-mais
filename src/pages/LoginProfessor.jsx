import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import '../CSS/Login.css';
import { API } from '../api';

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
      const response = await fetch(`${API}/login/professor`, {
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

      // Limpa a foto antiga (a chave sem id ficava valendo pra qualquer conta)
      localStorage.removeItem('fotoUsuario');
      if (data.usuario.fotoUrl) {
        localStorage.setItem(`fotoUsuario_${data.usuario.id}`, data.usuario.fotoUrl);
      } else {
        localStorage.removeItem(`fotoUsuario_${data.usuario.id}`);
      }

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

          {/* DIVISOR E BOTÃO DO GOOGLE ADICIONADOS AQUI */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e0e0e0' }}></div>
            <span style={{ margin: '0 10px', color: '#666', fontSize: '13px', fontWeight: '500' }}>ou entre com</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e0e0e0' }}></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <GoogleLogin
            onSuccess={async (credentialResponse) => {
              // Manda a credencial assinada pelo Google; quem confere é o servidor
              setCarregando(true);

              try {
                const response = await fetch(`${API}/login/google`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ credential: credentialResponse.credential }),
                });

                const data = await response.json();

                if (!response.ok) {
                  setErro(data.erro || 'Erro ao logar com o Google.');
                  setCarregando(false);
                  return;
                }

                localStorage.setItem('token', data.token);
                localStorage.setItem('nomeUsuario', data.usuario.nome);
                localStorage.setItem('idUsuario', data.usuario.id);
                localStorage.setItem('tipoUsuario', data.usuario.tipo);

                // A foto do Google fica salva com o id do professor, assim ela
                // nunca aparece na conta de outra pessoa
                localStorage.removeItem('fotoUsuario');
                if (data.usuario.fotoUrl) {
                  localStorage.setItem(`fotoUsuario_${data.usuario.id}`, data.usuario.fotoUrl);
                } else {
                  localStorage.removeItem(`fotoUsuario_${data.usuario.id}`);
                }

                navigate('/professor/dashboard');

              } catch {
                setErro('Não foi possível conectar ao servidor.');
              } finally {
                setCarregando(false);
              }
            }}
            onError={() => {
              setErro('O login com o Google falhou.');
            }}
            theme="outline" 
            size="large"    
          />
          </div>

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