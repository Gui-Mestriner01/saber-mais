import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AtSign, Lock, MailCheck } from 'lucide-react';
import '../CSS/Login.css';
import FundoAnimado from '../components/FundoAnimado';
import { API } from '../api';

/* ==========================================================================
   ESQUECI MINHA SENHA (27/10/2026)

   A mesma tela faz as duas partes:
   - /esqueci-senha            → o professor digita o e-mail e recebe o link;
   - /redefinir-senha?codigo=… → aberta pelo link do e-mail, escolhe a senha nova.
   ========================================================================== */

function PedirLink() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState('');
  const [carregando, setCarregando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const res = await fetch(`${API}/senha/esqueci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.erro || 'Não consegui enviar agora. Tente de novo.');
      setEnviado(dados.mensagem);
    } catch (err) {
      setErro(err.message === 'Failed to fetch' ? 'Não foi possível conectar ao servidor.' : err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-card">
      <h2>ESQUECI MINHA SENHA</h2>

      {enviado ? (
        <div className="recuperar-pronto">
          <MailCheck size={40} strokeWidth={1.6} />
          <p className="msg-sucesso">{enviado}</p>
          <p className="recuperar-dica">O link vale por 1 hora. Não chegou? Espere um minutinho e confira o spam.</p>
          <button className="btn-entrar" type="button" onClick={() => navigate('/login/professor')}>
            VOLTAR PARA O LOGIN
          </button>
        </div>
      ) : (
        <form onSubmit={enviar}>
          <p className="recuperar-dica">Digite o e-mail da sua conta. Vamos mandar um link para você criar uma senha nova.</p>
          <div className="input-group">
            <span className="input-icon"><AtSign size={18} strokeWidth={1.75} /></span>
            <input
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {erro && <div className="msg-erro">{erro}</div>}

          <button className="btn-entrar" type="submit" disabled={carregando}>
            {carregando ? 'Enviando...' : 'ENVIAR LINK'}
          </button>
        </form>
      )}

      <p className="cadastro-link">
        Lembrou a senha? <span onClick={() => navigate('/login/professor')}>Fazer login &gt;</span>
      </p>
    </div>
  );
}

function NovaSenha({ codigo }) {
  const navigate = useNavigate();
  const [valido, setValido] = useState(null); // null = conferindo
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    fetch(`${API}/senha/codigo/${encodeURIComponent(codigo)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setValido(!!d.valido))
      .catch(() => setValido(true)); // sem conferir, deixa tentar: o servidor confere de novo ao salvar
  }, [codigo]);

  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    if (senha.length < 8) { setErro('A senha precisa ter pelo menos 8 caracteres.'); return; }
    if (senha !== confirmar) { setErro('As senhas não são iguais.'); return; }
    setCarregando(true);
    try {
      const res = await fetch(`${API}/senha/redefinir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, senha }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.erro || 'Não consegui trocar a senha.');
      setPronto(dados.mensagem);
      setTimeout(() => navigate('/login/professor'), 2500);
    } catch (err) {
      setErro(err.message === 'Failed to fetch' ? 'Não foi possível conectar ao servidor.' : err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-card">
      <h2>CRIAR SENHA NOVA</h2>

      {valido === null && <p className="recuperar-dica">Conferindo o link…</p>}

      {valido === false && (
        <div className="recuperar-pronto">
          <div className="msg-erro">Este link expirou ou já foi usado.</div>
          <button className="btn-entrar" type="button" onClick={() => navigate('/esqueci-senha')}>
            PEDIR UM LINK NOVO
          </button>
        </div>
      )}

      {valido && pronto && (
        <div className="recuperar-pronto">
          <p className="msg-sucesso">{pronto}</p>
          <button className="btn-entrar" type="button" onClick={() => navigate('/login/professor')}>
            IR PARA O LOGIN
          </button>
        </div>
      )}

      {valido && !pronto && (
        <form onSubmit={salvar}>
          <p className="recuperar-dica">Escolha uma senha com pelo menos 8 caracteres.</p>
          <div className="input-group">
            <span className="input-icon"><Lock size={18} strokeWidth={1.75} /></span>
            <input
              type="password"
              placeholder="Senha nova"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="input-group">
            <span className="input-icon"><Lock size={18} strokeWidth={1.75} /></span>
            <input
              type="password"
              placeholder="Repita a senha nova"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {erro && <div className="msg-erro">{erro}</div>}

          <button className="btn-entrar" type="submit" disabled={carregando}>
            {carregando ? 'Salvando...' : 'SALVAR SENHA NOVA'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function RecuperarSenha() {
  const navigate = useNavigate();
  const [busca] = useSearchParams();
  const codigo = busca.get('codigo');

  return (
    <div className="login-container">
      <FundoAnimado />
      <div className="login-content">
        <div className="brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>

        {codigo ? <NovaSenha codigo={codigo} /> : <PedirLink />}

        <button className="back-btn" onClick={() => navigate('/')}>← Voltar</button>
      </div>
    </div>
  );
}
