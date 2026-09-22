import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../CSS/LoginAluno.css';
import { API, acessoSala, comToken, salvarTokenAluno } from '../api';

function LoginAluno() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const sala       = state?.sala;

  // Adicionamos a etapa 'temporaria' para o modo Kahoot
  const [etapa, setEtapa]           = useState('lista'); // lista | pin | novo | temporaria
  const [alunos, setAlunos]         = useState([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  
  // Estados para Sala Permanente
  const [pin, setPin]               = useState('');
  const [novoPin, setNovoPin]       = useState('');
  const [confirmarPin, setConfirmarPin] = useState('');
  
  // Estados compartilhados
  const [novoNome, setNovoNome]     = useState('');
  const [erro, setErro]             = useState('');
  
  // Estado para Sala Temporária (Avatares)
  const [avatarSelecionado, setAvatarSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(false);

  // Array gerando de img1.PNG até img33.PNG
  const avataresDisponiveis = Array.from({ length: 33 }, (_, i) => `img${i + 1}.PNG`);

  useEffect(() => {
    if (!sala) { navigate('/aluno/area'); return; }
    
    // Se for temporária, vai direto para a tela de Nome + Avatar
    if (sala.tipo_sala === 'temporaria') {
      setEtapa('temporaria');
    } else {
      buscarAlunos();
    }
  }, []);

  const buscarAlunos = async () => {
    try {
      const res  = await fetch(`${API}/sala/${sala.id}/alunos`, { headers: comToken(acessoSala(sala.id)) });
      if (res.status === 401 || res.status === 403) { navigate('/aluno/area'); return; } // precisa da senha da sala
      const data = await res.json();
      setAlunos(Array.isArray(data) ? data : []);
    } catch {
      setErro('Não consegui carregar a turma.');
    }
  };

  // --- LÓGICA DA SALA PERMANENTE ---
  const handleSelecionarAluno = (aluno) => {
    setAlunoSelecionado(aluno);
    setPin('');
    setErro('');
    setEtapa('pin');
  };

  const handleDigitarPin = (num) => {
    if (pin.length >= 4) return;
    const novoPinAtualizado = pin + num;
    setPin(novoPinAtualizado);

    if (novoPinAtualizado.length === 4) {
      setTimeout(() => fazerLogin(novoPinAtualizado), 300);
    }
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
        setErro(data.erro);
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

  const handleCadastrarPin = async () => {
    if (!novoNome.trim()) { setErro('Digite seu nome!'); return; }
    if (novoPin.length !== 4) { setErro('PIN deve ter 4 dígitos!'); return; }
    if (novoPin !== confirmarPin) { setErro('PINs não coincidem!'); return; }

    try {
      const res = await fetch(`${API}/aluno/cadastrar`, {
        method: 'POST',
        headers: comToken(acessoSala(sala.id), { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ nome_aluno: novoNome, sala_id: sala.id, pin: novoPin })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);

      salvarTokenAluno(data.token);
      navigate('/aluno/home', { state: { sala, nomeAluno: novoNome, alunoId: data.id, pontos: 0 } });
    } catch (err) {
      setErro(err.message);
    }
  };

  // --- LÓGICA DA SALA TEMPORÁRIA (KAHOOT) ---
  const handleEntrarTemporaria = (e) => {
    e.preventDefault();
    setErro('');

    if (!novoNome.trim()) {
      setErro('Digite seu nome!');
      return;
    }
    if (!avatarSelecionado) {
      setErro('Escolha um avatar!');
      return;
    }

    setCarregando(true);
    
    // Salva na memória do navegador (Não vai pro banco de dados)
    const dadosAlunoTemp = {
      nome: novoNome.trim(),
      avatar: avatarSelecionado,
      salaId: sala.id,
      salaNome: sala.nome,
      codigoSala: sala.codigo,
      token: acessoSala(sala.id) // crachá da senha da sala: é ele que deixa entrar na partida
    };
    
    localStorage.setItem('alunoTemporario', JSON.stringify(dadosAlunoTemp));
    
    // Pula para a tela de espera do jogo!
    navigate('/aluno/lobby');
  };

  return (
    <div className="login-aluno-container">
      <header className="login-aluno-header">
        <div className="login-aluno-brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>
        <h2>{sala?.nome}</h2>
        <div style={{width: 80}} />
      </header>

      <main className="login-aluno-main">

        {/* =========================================
            FLUXOS ORIGINAIS (SALA PERMANENTE)
            ========================================= */}
        
        {etapa === 'lista' && (
          <div className="login-aluno-card">
            <h2>👋 Quem é você?</h2>
            <p>Clique no seu nome para entrar!</p>

            <div className="alunos-grid">
              {alunos.map(aluno => (
                <button key={aluno.id} className="aluno-btn" onClick={() => handleSelecionarAluno(aluno)}>
                  <div className="aluno-btn-avatar">
                    {aluno.nome_aluno.charAt(0).toUpperCase()}
                  </div>
                  <span>{aluno.nome_aluno}</span>
                  {aluno.pontos > 0 && <span className="aluno-btn-pts">⭐ {aluno.pontos}</span>}
                </button>
              ))}

              <button className="aluno-btn aluno-btn-novo" onClick={() => { setEtapa('novo'); setErro(''); }}>
                <div className="aluno-btn-avatar novo">➕</div>
                <span>Sou novo!</span>
              </button>
            </div>
          </div>
        )}

        {etapa === 'pin' && (
          <div className="login-aluno-card">
            <button className="login-voltar" onClick={() => { setEtapa('lista'); setErro(''); }}>← Voltar</button>
            <div className="pin-avatar">{alunoSelecionado?.nome_aluno?.charAt(0).toUpperCase()}</div>
            <h2>Olá, {alunoSelecionado?.nome_aluno}! 👋</h2>
            <p>Digite seu PIN de 4 dígitos</p>

            <div className="pin-dots">
              {[0,1,2,3].map(i => (
                <div key={i} className={`pin-dot ${pin.length > i ? 'preenchido' : ''} ${erro ? 'erro' : ''}`} />
              ))}
            </div>

            {erro && <p className="pin-erro">{erro}</p>}

            <div className="pin-teclado">
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button key={n} className="pin-tecla" onClick={() => handleDigitarPin(String(n))}>{n}</button>
              ))}
              <button className="pin-tecla apagar" onClick={() => setPin(prev => prev.slice(0,-1))}>⌫</button>
              <button className="pin-tecla" onClick={() => handleDigitarPin('0')}>0</button>
              <div />
            </div>
          </div>
        )}

        {etapa === 'novo' && (
          <div className="login-aluno-card">
            <button className="login-voltar" onClick={() => { setEtapa('lista'); setErro(''); }}>← Voltar</button>
            <h2>✨ Primeiro acesso!</h2>
            <p>Digite seu nome e crie um PIN para não perder seus pontos!</p>

            <div className="novo-campo">
              <label>Seu nome</label>
              <input type="text" placeholder="Como você se chama?" value={novoNome} onChange={e => { setNovoNome(e.target.value); setErro(''); }} className="novo-input" />
            </div>

            <div className="novo-campo">
              <label>Crie um PIN de 4 dígitos</label>
              <div className="pin-dots">
                {[0,1,2,3].map(i => <div key={i} className={`pin-dot ${novoPin.length > i ? 'preenchido' : ''}`} /> )}
              </div>
              <div className="pin-teclado">
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <button key={n} className="pin-tecla" onClick={() => { if (novoPin.length < 4) setNovoPin(prev => prev + n); }}>{n}</button>
                ))}
                <button className="pin-tecla apagar" onClick={() => setNovoPin(prev => prev.slice(0,-1))}>⌫</button>
                <button className="pin-tecla" onClick={() => { if (novoPin.length < 4) setNovoPin(prev => prev + '0'); }}>0</button>
                <div />
              </div>
            </div>

            <div className="novo-campo">
              <label>Confirme seu PIN</label>
              <div className="pin-dots">
                {[0,1,2,3].map(i => <div key={i} className={`pin-dot ${confirmarPin.length > i ? 'preenchido' : ''}`} /> )}
              </div>
              <div className="pin-teclado">
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <button key={n} className="pin-tecla" onClick={() => { if (confirmarPin.length < 4) setConfirmarPin(prev => prev + n); }}>{n}</button>
                ))}
                <button className="pin-tecla apagar" onClick={() => setConfirmarPin(prev => prev.slice(0,-1))}>⌫</button>
                <button className="pin-tecla" onClick={() => { if (confirmarPin.length < 4) setConfirmarPin(prev => prev + '0'); }}>0</button>
                <div />
              </div>
            </div>

            {erro && <p className="pin-erro">{erro}</p>}

            <button className="btn-entrar-pin" onClick={handleCadastrarPin} disabled={!novoNome || novoPin.length < 4 || confirmarPin.length < 4}>
              Criar conta e entrar! 🚀
            </button>
          </div>
        )}

        {/* =========================================
            NOVO FLUXO: SALA TEMPORÁRIA
            ========================================= */}
        {etapa === 'temporaria' && (
          <div className="login-aluno-card" style={{ maxWidth: '600px' }}>
            <button className="login-voltar" onClick={() => navigate('/aluno/area')}>← Sair da Sala</button>
            <h2>✨ Preparar para jogar!</h2>
            <p>Escolha seu nome e um avatar bem legal!</p>

            <form onSubmit={handleEntrarTemporaria} style={{ width: '100%', marginTop: '20px' }}>
              
              <div className="novo-campo" style={{ marginBottom: '20px' }}>
                <label>Seu nome</label>
                <input 
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
                <label className="login-avatares-titulo">Escolha seu avatar</label>
                <div className="login-grid-avatares">
                  {avataresDisponiveis.map((img) => (
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

              {erro && <p className="pin-erro" style={{ marginTop: '15px' }}>{erro}</p>}

              <button 
                type="submit" 
                className="btn-entrar-pin" 
                style={{ marginTop: '20px', background: '#3DAA5C' }}
                disabled={!novoNome.trim() || !avatarSelecionado || carregando}
              >
                {carregando ? 'Entrando...' : 'Entrar na Sala! 🚀'}
              </button>

            </form>
          </div>
        )}

      </main>
    </div>
  );
}

export default LoginAluno;