import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../CSS/LoginAluno.css';
import { API, acessoSala, comToken, salvarTokenAluno } from '../api';
import { aplicarTemaAluno } from '../temaAluno';

function LoginAluno() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const sala       = state?.sala;

  // lista | pin | novo | temporaria
  const [etapa, setEtapa]           = useState('lista');
  const [alunos, setAlunos]         = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);

  // Sala permanente
  const [pin, setPin]               = useState('');
  const [novoPin, setNovoPin]       = useState('');
  const [confirmarPin, setConfirmarPin] = useState('');
  const [passo, setPasso]           = useState('nome');   // nome | pin | confirmar
  const [salvando, setSalvando]     = useState(false);

  // Compartilhados
  const [novoNome, setNovoNome]     = useState('');
  const [erro, setErro]             = useState('');

  // Sala temporária (avatares)
  const [avatarSelecionado, setAvatarSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const campoNome = useRef(null);
  const avataresDisponiveis = Array.from({ length: 33 }, (_, i) => `img${i + 1}.PNG`);

  useEffect(() => {
    aplicarTemaAluno();
    if (!sala) { navigate('/aluno/area'); return; }

    if (sala.tipo_sala === 'temporaria') {
      setEtapa('temporaria');
      setCarregandoLista(false);
    } else {
      buscarAlunos();
    }
  }, []);

  // Ao abrir o passo do nome, o teclado do celular já aparece
  useEffect(() => {
    if (etapa === 'novo' && passo === 'nome') campoNome.current?.focus();
  }, [etapa, passo]);

  const buscarAlunos = async () => {
    try {
      const res  = await fetch(`${API}/sala/${sala.id}/alunos`, { headers: comToken(acessoSala(sala.id)) });
      if (res.status === 401 || res.status === 403) { navigate('/aluno/area'); return; } // precisa da senha da sala
      const data = await res.json();
      setAlunos(Array.isArray(data) ? data : []);
    } catch {
      setErro('Não consegui carregar a turma.');
    } finally {
      setCarregandoLista(false);
    }
  };

  /* ---------------- SALA PERMANENTE: entrar com PIN ---------------- */
  const handleSelecionarAluno = (aluno) => {
    setAlunoSelecionado(aluno);
    setPin('');
    setErro('');
    setEtapa('pin');
  };

  const handleDigitarPin = (num) => {
    if (pin.length >= 4) return;
    const atualizado = pin + num;
    setPin(atualizado);
    if (atualizado.length === 4) setTimeout(() => fazerLogin(atualizado), 250);
  };

  const fazerLogin = async (pinDigitado) => {
    try {
      const res = await fetch(`${API}/aluno/login`, {
        method: 'POST',
        headers: comToken(acessoSala(sala.id), { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ aluno_id: alunoSelecionado.id, pin: pinDigitado })
      });
      const data = await res.json();

      if (!res.ok) {
        setErro(data.erro || 'PIN incorreto!');
        setPin('');
        return;
      }

      salvarTokenAluno(data.token);
      navigate('/aluno/home', { state: { sala, nomeAluno: data.aluno.nome_aluno, alunoId: data.aluno.id, pontos: data.aluno.pontos } });
    } catch {
      setErro('Erro ao conectar.');
      setPin('');
    }
  };

  /* ---------------- SALA PERMANENTE: primeiro acesso ----------------
     Um passo por vez: nome → criar PIN → repetir o PIN. O passo que já
     foi preenchido fecha e vira uma linha com a resposta, então a tela
     nunca fica comprida a ponto de precisar rolar. */
  const irParaPasso = (destino) => { setErro(''); setPasso(destino); };

  const digitarNovoPin = (num) => {
    if (novoPin.length >= 4) return;
    const atualizado = novoPin + num;
    setNovoPin(atualizado);
    setErro('');
    if (atualizado.length === 4) setTimeout(() => setPasso('confirmar'), 200);
  };

  const digitarConfirmacao = (num) => {
    if (confirmarPin.length >= 4) return;
    const atualizado = confirmarPin + num;
    setConfirmarPin(atualizado);
    setErro('');
    if (atualizado.length === 4) {
      setTimeout(() => {
        if (atualizado !== novoPin) {
          setErro('Os PINs não são iguais. Tente de novo!');
          setConfirmarPin('');
          setNovoPin('');
          setPasso('pin');
          return;
        }
        cadastrar(atualizado);
      }, 250);
    }
  };

  const cadastrar = async (pinFinal) => {
    if (salvando) return;
    setSalvando(true);
    try {
      const res = await fetch(`${API}/aluno/cadastrar`, {
        method: 'POST',
        headers: comToken(acessoSala(sala.id), { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ nome_aluno: novoNome.trim(), sala_id: sala.id, pin: pinFinal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Não consegui criar sua conta.');

      salvarTokenAluno(data.token);
      navigate('/aluno/home', { state: { sala, nomeAluno: novoNome.trim(), alunoId: data.id, pontos: 0 } });
    } catch (err) {
      setErro(err.message);
      setConfirmarPin('');
      setPasso('confirmar');
      setSalvando(false);
    }
  };

  const confirmarNome = () => {
    if (novoNome.trim().length < 2) { setErro('Escreva seu nome para continuar.'); return; }
    irParaPasso('pin');
  };

  /* ---------------- SALA TEMPORÁRIA ---------------- */
  const handleEntrarTemporaria = (e) => {
    e.preventDefault();
    setErro('');

    if (!novoNome.trim())     { setErro('Digite seu nome!');   return; }
    if (!avatarSelecionado)   { setErro('Escolha um avatar!'); return; }

    setCarregando(true);

    localStorage.setItem('alunoTemporario', JSON.stringify({
      nome: novoNome.trim(),
      avatar: avatarSelecionado,
      salaId: sala.id,
      salaNome: sala.nome,
      codigoSala: sala.codigo,
      token: acessoSala(sala.id) // crachá da senha da sala: é ele que deixa entrar na partida
    }));

    navigate('/aluno/lobby');
  };

  /* ---------------- Teclado numérico reaproveitado ---------------- */
  const Teclado = ({ aoDigitar, aoApagar }) => (
    <div className="pin-teclado">
      {[1,2,3,4,5,6,7,8,9].map(n => (
        <button key={n} type="button" className="pin-tecla" onClick={() => aoDigitar(String(n))}>{n}</button>
      ))}
      <button type="button" className="pin-tecla apagar" onClick={aoApagar} aria-label="Apagar">⌫</button>
      <button type="button" className="pin-tecla" onClick={() => aoDigitar('0')}>0</button>
      <span className="pin-tecla-vazia" />
    </div>
  );

  const Bolinhas = ({ quantos, erro: comErro }) => (
    <div className="pin-dots">
      {[0,1,2,3].map(i => (
        <span key={i} className={`pin-dot ${quantos > i ? 'preenchido' : ''} ${comErro ? 'erro' : ''}`} />
      ))}
    </div>
  );

  return (
    <div className="login-aluno-container">
      <header className="login-aluno-header">
        <div className="login-aluno-brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>
        <h2>{sala?.nome}</h2>
      </header>

      <main className="login-aluno-main">

        {/* ---------- ESCOLHER QUEM É ---------- */}
        {etapa === 'lista' && (
          <div className="login-aluno-card">
            <h2>👋 Quem é você?</h2>
            <p>Toque no seu nome para entrar</p>

            {carregandoLista ? (
              <p className="login-carregando">Carregando a turma…</p>
            ) : (
              <div className="alunos-grid">
                {alunos.map(aluno => (
                  <button key={aluno.id} className="aluno-btn" onClick={() => handleSelecionarAluno(aluno)}>
                    <span className="aluno-btn-avatar">{aluno.nome_aluno.charAt(0).toUpperCase()}</span>
                    <span className="aluno-btn-nome">{aluno.nome_aluno}</span>
                    {aluno.pontos > 0 && <span className="aluno-btn-pts">⭐ {aluno.pontos}</span>}
                  </button>
                ))}

                <button className="aluno-btn aluno-btn-novo" onClick={() => { setEtapa('novo'); setPasso('nome'); setErro(''); }}>
                  <span className="aluno-btn-avatar novo">➕</span>
                  <span className="aluno-btn-nome">Sou novo!</span>
                </button>
              </div>
            )}

            {erro && <p className="pin-erro">{erro}</p>}
          </div>
        )}

        {/* ---------- ENTRAR COM O PIN ---------- */}
        {etapa === 'pin' && (
          <div className="login-aluno-card">
            <button className="login-voltar" onClick={() => { setEtapa('lista'); setErro(''); }}>← Voltar</button>
            <div className="pin-avatar">{alunoSelecionado?.nome_aluno?.charAt(0).toUpperCase()}</div>
            <h2>Olá, {alunoSelecionado?.nome_aluno}!</h2>
            <p>Digite seu PIN de 4 dígitos</p>

            <Bolinhas quantos={pin.length} erro={!!erro} />
            {erro && <p className="pin-erro">{erro}</p>}

            <Teclado aoDigitar={handleDigitarPin} aoApagar={() => setPin(p => p.slice(0, -1))} />
          </div>
        )}

        {/* ---------- PRIMEIRO ACESSO (um passo por vez) ---------- */}
        {etapa === 'novo' && (
          <div className="login-aluno-card">
            <button className="login-voltar" onClick={() => { setEtapa('lista'); setErro(''); }}>← Voltar</button>
            <h2>✨ Primeiro acesso</h2>
            <p>É rapidinho: nome, PIN e pronto</p>

            <div className="passos">
              {/* 1. Nome */}
              <section className={`passo ${passo === 'nome' ? 'aberto' : ''} ${novoNome.trim() && passo !== 'nome' ? 'pronto' : ''}`}>
                <button type="button" className="passo-cab" onClick={() => irParaPasso('nome')} aria-expanded={passo === 'nome'}>
                  <span className="passo-num">{novoNome.trim() && passo !== 'nome' ? '✓' : '1'}</span>
                  <span className="passo-titulo">Seu nome</span>
                  <span className="passo-valor">{passo !== 'nome' ? novoNome.trim() : ''}</span>
                </button>

                {passo === 'nome' && (
                  <div className="passo-corpo">
                    <input
                      ref={campoNome}
                      type="text"
                      className="novo-input"
                      placeholder="Como você se chama?"
                      value={novoNome}
                      maxLength={30}
                      autoComplete="off"
                      onChange={e => { setNovoNome(e.target.value); setErro(''); }}
                      onKeyDown={e => { if (e.key === 'Enter') confirmarNome(); }}
                    />
                    {erro && <p className="passo-erro">{erro}</p>}
                    <button type="button" className="btn-entrar-pin" onClick={confirmarNome} disabled={novoNome.trim().length < 2}>
                      Continuar
                    </button>
                  </div>
                )}
              </section>

              {/* 2. Criar o PIN */}
              <section className={`passo ${passo === 'pin' ? 'aberto' : ''} ${novoPin.length === 4 && passo !== 'pin' ? 'pronto' : ''}`}>
                <button
                  type="button"
                  className="passo-cab"
                  onClick={() => novoNome.trim().length >= 2 && irParaPasso('pin')}
                  disabled={novoNome.trim().length < 2}
                  aria-expanded={passo === 'pin'}
                >
                  <span className="passo-num">{novoPin.length === 4 && passo !== 'pin' ? '✓' : '2'}</span>
                  <span className="passo-titulo">Crie um PIN de 4 números</span>
                  <span className="passo-valor">{novoPin.length === 4 && passo !== 'pin' ? '••••' : ''}</span>
                </button>

                {passo === 'pin' && (
                  <div className="passo-corpo">
                    <p className={erro ? 'passo-erro' : 'passo-dica'}>
                      {erro || 'Use um PIN fácil de lembrar. Ele guarda os seus pontos.'}
                    </p>
                    <Bolinhas quantos={novoPin.length} />
                    <Teclado aoDigitar={digitarNovoPin} aoApagar={() => setNovoPin(p => p.slice(0, -1))} />
                  </div>
                )}
              </section>

              {/* 3. Repetir o PIN */}
              <section className={`passo ${passo === 'confirmar' ? 'aberto' : ''}`}>
                <button
                  type="button"
                  className="passo-cab"
                  onClick={() => novoPin.length === 4 && irParaPasso('confirmar')}
                  disabled={novoPin.length < 4}
                  aria-expanded={passo === 'confirmar'}
                >
                  <span className="passo-num">3</span>
                  <span className="passo-titulo">Digite o PIN de novo</span>
                  <span className="passo-valor" />
                </button>

                {passo === 'confirmar' && (
                  <div className="passo-corpo">
                    <p className={erro ? 'passo-erro' : 'passo-dica'}>
                      {erro || (salvando ? 'Criando sua conta…' : 'Só para confirmar que você lembra dele.')}
                    </p>
                    <Bolinhas quantos={confirmarPin.length} erro={!!erro} />
                    <Teclado aoDigitar={digitarConfirmacao} aoApagar={() => setConfirmarPin(p => p.slice(0, -1))} />
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* ---------- SALA TEMPORÁRIA ---------- */}
        {etapa === 'temporaria' && (
          <div className="login-aluno-card card-largo">
            <button className="login-voltar" onClick={() => navigate('/aluno/area')}>← Sair da sala</button>
            <h2>✨ Preparar para jogar!</h2>
            <p>Escolha seu nome e um avatar bem legal</p>

            <form onSubmit={handleEntrarTemporaria} className="form-temporaria">
              <div className="novo-campo">
                <label htmlFor="nome-temporario">Seu nome</label>
                <input
                  id="nome-temporario"
                  type="text"
                  placeholder="Como você se chama?"
                  value={novoNome}
                  onChange={e => { setNovoNome(e.target.value); setErro(''); }}
                  className="novo-input"
                  maxLength={15}
                  autoComplete="off"
                />
              </div>

              <div className="novo-campo">
                <label>Escolha seu avatar</label>
                <div className="login-grid-avatares">
                  {avataresDisponiveis.map(img => (
                    <button
                      key={img}
                      type="button"
                      className={`login-avatar-btn ${avatarSelecionado === img ? 'selecionado' : ''}`}
                      onClick={() => { setAvatarSelecionado(img); setErro(''); }}
                    >
                      <img src={`/avatares/${img}`} alt="Avatar" className="login-avatar-img" />
                    </button>
                  ))}
                </div>
              </div>

              {erro && <p className="pin-erro">{erro}</p>}

              <button
                type="submit"
                className="btn-entrar-pin btn-verde"
                disabled={!novoNome.trim() || !avatarSelecionado || carregando}
              >
                {carregando ? 'Entrando…' : 'Entrar na sala! 🚀'}
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}

export default LoginAluno;
