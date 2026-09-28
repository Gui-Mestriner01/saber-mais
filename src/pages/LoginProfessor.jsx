import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';

const CLIENTE_GOOGLE = '17269757270-gk04h1b82ljnu5ep0fdnctn7gru3aca1.apps.googleusercontent.com';
import '../CSS/Login.css';
import { API } from '../api';

/* O "crachá do aparelho": depois de confirmar o código uma vez, o navegador
   guarda esse valor e não precisa mais de código por 60 dias. Ele sozinho não
   dá acesso a nada — só diz ao servidor "este aparelho já foi confirmado". */
const CHAVE_APARELHO = 'saberPlusAparelho';
const aparelhoSalvo = () => { try { return localStorage.getItem(CHAVE_APARELHO) || null; } catch { return null; } };

function LoginProfessor() {
  const navigate = useNavigate();

  const [email, setEmail]           = useState('');
  const [senha, setSenha]           = useState('');
  const [erro, setErro]             = useState('');
  const [carregando, setCarregando] = useState(false);

  // Etapa da confirmação por e-mail (aparelho novo)
  const [confirmacao, setConfirmacao] = useState(null);   // { loginId, email, aparelho }
  const [codigo, setCodigo]           = useState('');
  const [aviso, setAviso]             = useState('');

  /* Guarda o login e entra. Usado pelos três caminhos: senha, Google e código. */
  const entrar = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('nomeUsuario', data.usuario.nome);
    localStorage.setItem('idUsuario', data.usuario.id);
    localStorage.setItem('tipoUsuario', data.usuario.tipo);
    if (data.dispositivo) localStorage.setItem(CHAVE_APARELHO, data.dispositivo);

    localStorage.removeItem('fotoUsuario');
    if (data.usuario.fotoUrl) {
      localStorage.setItem(`fotoUsuario_${data.usuario.id}`, data.usuario.fotoUrl);
    } else {
      localStorage.removeItem(`fotoUsuario_${data.usuario.id}`);
    }

    navigate(data.usuario.tipo === 'admin' ? '/admin/dashboard' : '/professor/dashboard');
  };

  /* O servidor pediu confirmação: mostra a tela do código de 6 dígitos. */
  const pedirCodigo = (data) => {
    setConfirmacao({ loginId: data.loginId, email: data.email, aparelho: data.aparelho });
    setCodigo('');
    setErro('');
    setAviso(`Enviamos um código para ${data.email}.`);
  };

  const confirmarCodigo = async (e) => {
    e.preventDefault();
    if (codigo.length < 6) return;
    setErro(''); setCarregando(true);
    try {
      const res = await fetch(`${API}/login/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: confirmacao.loginId, codigo, lembrar: true }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.erro || 'Código incorreto.'); setCodigo(''); return; }
      entrar(data);
    } catch {
      setErro('Não foi possível conectar ao servidor.');
    } finally {
      setCarregando(false);
    }
  };

  const reenviarCodigo = async () => {
    setErro(''); setAviso('Enviando...'); setCarregando(true);
    try {
      const res = await fetch(`${API}/login/reenviar-codigo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: confirmacao.loginId }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.erro || 'Não consegui reenviar.'); setAviso(''); return; }
      setConfirmacao(c => ({ ...c, loginId: data.loginId }));
      setAviso(`Código novo enviado para ${data.email}.`);
      setCodigo('');
    } catch {
      setErro('Não foi possível conectar ao servidor.');
      setAviso('');
    } finally {
      setCarregando(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const response = await fetch(`${API}/login/professor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha, dispositivo: aparelhoSalvo() }),
      });

      const data = await response.json();

      if (response.status === 202 && data.precisaConfirmar) { pedirCodigo(data); return; }

      if (!response.ok) {
        setErro(data.erro || 'Erro ao fazer login.');
        setCarregando(false);
        return;
      }

      entrar(data);

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
          <h2>{confirmacao ? 'CONFIRME O ACESSO' : 'LOGIN DO PROFESSOR'}</h2>

          {/* ---------- aparelho novo: código que chegou no e-mail ---------- */}
          {confirmacao ? (
            <form onSubmit={confirmarCodigo} className="form-codigo">
              <p className="codigo-explica">
                Para proteger sua conta, mandamos um código de 6 dígitos para <strong>{confirmacao.email}</strong>.
                Ele vale por 10 minutos.
              </p>

              <input
                className="campo-codigo"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={codigo}
                onChange={e => { setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6)); setErro(''); }}
                autoFocus
              />

              {erro && <div className="msg-erro">{erro}</div>}
              {!erro && aviso && <div className="msg-aviso">{aviso}</div>}

              <button className="btn-entrar" type="submit" disabled={carregando || codigo.length < 6}>
                {carregando ? 'Confirmando...' : 'CONFIRMAR'}
              </button>

              <p className="cadastro-link">
                Não chegou? <span onClick={reenviarCodigo}>Enviar de novo</span>
                {' · '}
                <span onClick={() => { setConfirmacao(null); setErro(''); setAviso(''); }}>Voltar</span>
              </p>

              <p className="codigo-rodape">
                Este aparelho ({confirmacao.aparelho}) fica confirmado por 60 dias.
              </p>
            </form>
          ) : (
          <>
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
            <GoogleOAuthProvider clientId={CLIENTE_GOOGLE}>
            <GoogleLogin
            onSuccess={async (credentialResponse) => {
              // Manda a credencial assinada pelo Google; quem confere é o servidor
              setCarregando(true);

              try {
                const response = await fetch(`${API}/login/google`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    credential: credentialResponse.credential,
                    dispositivo: aparelhoSalvo(),
                  }),
                });

                const data = await response.json();

                if (response.status === 202 && data.precisaConfirmar) { pedirCodigo(data); setCarregando(false); return; }

                if (!response.ok) {
                  setErro(data.erro || 'Erro ao logar com o Google.');
                  setCarregando(false);
                  return;
                }

                entrar(data);

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
            </GoogleOAuthProvider>
          </div>

          <p className="cadastro-link">
            Não tem login? <span onClick={() => navigate('/cadastro/professor')}>Cadastrar-se &gt;</span>
          </p>
          </>
          )}
        </div>

        <button className="back-btn" onClick={() => navigate('/')}>← Voltar</button>
      </div>
    </div>
  );
}

export default LoginProfessor;