import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/AreaAluno.css';

const TEMAS = {
  frutas:   ['🍎','🍌','🍇','🍓','🍊','🍋','🍉','🍑','🍒','🥭','🍍','🥝'],
  animais:  ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮'],
  esportes: ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🎯'],
};

const SALAS = [
  { id: 1, codigo: '48321', nome: 'Turma da Manhã',   serie: '5º Ano', materia: 'Matemática', escola: 'E.E. Santos Dumont', cidade: 'São Paulo - SP',   tema: 'frutas',   senha: ['🍎','🍌','🍇','🍓'] },
  { id: 2, codigo: '71204', nome: 'Turma da Tarde',   serie: '3º Ano', materia: 'Português',  escola: 'Colégio COC',         cidade: 'Salvador - BA',   tema: 'animais',  senha: ['🐶','🐱','🐻','🦊'] },
  { id: 3, codigo: '39571', nome: 'Turma da Manhã B', serie: '4º Ano', materia: 'Ciências',   escola: 'E.A. Adventista',     cidade: 'Curitiba - PR',   tema: 'esportes', senha: ['⚽','🏀','🎾','🏓'] },
  { id: 4, codigo: '62840', nome: 'Turma Especial',   serie: '2º Ano', materia: 'Artes',      escola: 'Escola Municipal',    cidade: 'Fortaleza - CE',  tema: 'frutas',   senha: ['🍉','🍒','🥭','🍍'] },
];

const ETAPAS = { LISTA: 'lista', SENHA: 'senha', NOME: 'nome' };

function AreaAluno() {
  const navigate = useNavigate();

  const [busca, setBusca]           = useState('');
  const [etapa, setEtapa]           = useState(ETAPAS.LISTA);
  const [salaSelecionada, setSalaSelecionada] = useState(null);
  const [senhaDigitada, setSenhaDigitada]     = useState([]);
  const [erroSenha, setErroSenha]   = useState(false);
  const [nome, setNome]             = useState('');
  const [erroNome, setErroNome]     = useState(false);

  const salasFiltradas = SALAS.filter(s =>
    busca === '' ||
    s.codigo.includes(busca) ||
    s.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const entrarNaSala = (sala) => {
    setSalaSelecionada(sala);
    setSenhaDigitada([]);
    setErroSenha(false);
    setEtapa(ETAPAS.SENHA);
  };

  const adicionarEmoji = (emoji) => {
    if (senhaDigitada.length >= 4) return;
    const nova = [...senhaDigitada, emoji];
    setSenhaDigitada(nova);

    if (nova.length === 4) {
      setTimeout(() => {
        const correta = salaSelecionada.senha.every((e, i) => e === nova[i]);
        if (correta) {
          setErroSenha(false);
          setEtapa(ETAPAS.NOME);
        } else {
          setErroSenha(true);
          setSenhaDigitada([]);
        }
      }, 400);
    }
  };

  const handleEntrar = () => {
    if (!nome.trim()) { setErroNome(true); return; }
    navigate('/aluno/home', { state: { sala: salaSelecionada, nomeAluno: nome } });
  };

  return (
    <div className="area-aluno-container">

      {/* HEADER */}
      <header className="area-aluno-header">
        <div className="area-aluno-brand" onClick={() => navigate('/')}>
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>
        <h1 className="area-aluno-titulo">🎒 Área do Aluno</h1>
        <div style={{width: 120}} />
      </header>

      {/* LISTA DE SALAS */}
      {etapa === ETAPAS.LISTA && (
        <main className="area-aluno-main">
          <div className="busca-sala-wrap">
            <div className="busca-sala-input">
              <span>🔍</span>
              <input
                type="text"
                placeholder="Digite o código da sala..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
              {busca && (
                <button className="busca-limpar" onClick={() => setBusca('')}>✕</button>
              )}
            </div>
          </div>

          {salasFiltradas.length === 0 ? (
            <div className="salas-vazio">
              <span>😕</span>
              <p>Nenhuma sala encontrada!</p>
              <small>Verifique o código com seu professor</small>
            </div>
          ) : (
            <div className="salas-grid">
              {salasFiltradas.map(sala => (
                <div key={sala.id} className="sala-card" onClick={() => entrarNaSala(sala)}>
                  <div className="sala-card-header" style={{background: temaCor(sala.tema)}}>
                    <span className="sala-tema-icon">{temaIcone(sala.tema)}</span>
                    <span className="sala-codigo-tag">{sala.codigo}</span>
                  </div>
                  <div className="sala-card-body">
                    <h3>{sala.nome}</h3>
                    <p className="sala-materia">{sala.serie} · {sala.materia}</p>
                    <p className="sala-escola">🏫 {sala.escola}</p>
                    <p className="sala-cidade">📍 {sala.cidade}</p>
                  </div>
                  <button className="sala-entrar-btn">Entrar →</button>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* TECLADO VIRTUAL */}
      {etapa === ETAPAS.SENHA && salaSelecionada && (
        <main className="area-aluno-main centralizado">
          <div className="senha-card">
            <button className="senha-voltar" onClick={() => setEtapa(ETAPAS.LISTA)}>← Voltar</button>

            <div className="senha-info-sala">
              <span className="senha-tema-icon">{temaIcone(salaSelecionada.tema)}</span>
              <h2>{salaSelecionada.nome}</h2>
              <p>{salaSelecionada.escola}</p>
            </div>

            <p className="senha-instrucao">🔒 Digite a senha da sala!</p>

            {/* Indicador de emojis digitados */}
            <div className="senha-digitada">
              {[0,1,2,3].map(i => (
                <div key={i} className={`senha-slot ${senhaDigitada[i] ? 'preenchido' : ''} ${erroSenha ? 'erro' : ''}`}>
                  {senhaDigitada[i] || ''}
                </div>
              ))}
            </div>

            {erroSenha && (
              <p className="senha-erro">❌ Senha errada! Tente de novo.</p>
            )}

            {/* Teclado virtual */}
            <div className="teclado-virtual">
              {TEMAS[salaSelecionada.tema].map((emoji, i) => (
                <button
                  key={i}
                  className="tecla-emoji"
                  onClick={() => adicionarEmoji(emoji)}
                  disabled={senhaDigitada.length >= 4}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {senhaDigitada.length > 0 && !erroSenha && (
              <button className="senha-apagar" onClick={() => setSenhaDigitada(prev => prev.slice(0, -1))}>
                ⌫ Apagar
              </button>
            )}
          </div>
        </main>
      )}

      {/* NOME DO ALUNO */}
      {etapa === ETAPAS.NOME && (
        <main className="area-aluno-main centralizado">
          <div className="nome-card">
            <span className="nome-icon">👋</span>
            <h2>Olá! Qual é o seu nome?</h2>
            <p>Antes de entrar na sala, me diz como te chamar!</p>

            <input
              className={`nome-input ${erroNome ? 'erro' : ''}`}
              type="text"
              placeholder="Digite seu nome..."
              value={nome}
              onChange={e => { setNome(e.target.value); setErroNome(false); }}
              onKeyDown={e => e.key === 'Enter' && handleEntrar()}
              autoFocus
            />

            {erroNome && <p className="nome-erro">Por favor, digite seu nome!</p>}

            <button className="btn-entrar-sala" onClick={handleEntrar}>
              Entrar na Sala 🚀
            </button>
          </div>
        </main>
      )}
    </div>
  );
}

// Helpers
function temaCor(tema) {
  return { frutas: '#FF6B6B', animais: '#4ECDC4', esportes: '#45B7D1' }[tema] || '#1A6FC4';
}

function temaIcone(tema) {
  return { frutas: '🍎', animais: '🐶', esportes: '⚽' }[tema] || '🏫';
}

export default AreaAluno;