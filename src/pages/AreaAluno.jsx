import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Backpack, Search, X, SearchX, Hourglass, GraduationCap, Lock, CircleAlert, Delete, History, List } from 'lucide-react';
import '../CSS/AreaAluno.css';
import FundoAnimado from '../components/FundoAnimado';
import { API, salvarAcessoSala } from '../api';
import { aplicarTemaAluno } from '../temaAluno';

const TEMAS = {
  frutas:   ['🍎','🍌','🍇','🍓','🍊','🍋','🍉','🍑','🍒','🥭','🍍','🥝'],
  animais:  ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮'],
  esportes: ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🎯'],
};

const ETAPAS = { LISTA: 'lista', SENHA: 'senha' };

/* ==========================================================================
   ENTRAR PELO CÓDIGO (06/11/2026)

   Antes a tela abria com TODAS as salas do sistema, de todos os
   professores, e a criança tinha que achar a dela no meio. Com 20
   professores na escola seriam uns 100 cartões.

   Agora o caminho principal é o código que a professora escreve no quadro.
   Embaixo aparecem só as salas que já foram usadas neste aparelho (é o
   comum no dia a dia: o mesmo tablet, a mesma turma). A lista completa
   continua existindo, atrás do botão "Ver todas as salas", para ninguém
   ficar preso se esquecer o código.
   ========================================================================== */
const CHAVE_SALAS_USADAS = 'saberPlusSalasUsadas';

function salasUsadas() {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE_SALAS_USADAS) || '[]');
    return Array.isArray(lista) ? lista.map(String) : [];
  } catch { return []; }
}

function lembrarSala(id) {
  try {
    const lista = [String(id), ...salasUsadas().filter(x => x !== String(id))].slice(0, 6);
    localStorage.setItem(CHAVE_SALAS_USADAS, JSON.stringify(lista));
  } catch { /* sem memória no aparelho: tudo bem, só não lembra */ }
}

function AreaAluno() {
  const navigate = useNavigate();

  const [salas, setSalas]           = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca]           = useState('');
  const [etapa, setEtapa]           = useState(ETAPAS.LISTA);
  const [salaSelecionada, setSalaSelecionada] = useState(null);
  const [senhaDigitada, setSenhaDigitada]     = useState([]);
  const [erroSenha, setErroSenha]   = useState(false);
  const [verTodas, setVerTodas]     = useState(false);
  const [usadas]                    = useState(salasUsadas);

  useEffect(() => { aplicarTemaAluno(); buscarSalas(); }, []);

  const buscarSalas = async () => {
    try {
      const res  = await fetch(`${API}/salas`);
      const data = await res.json();
      setSalas(data);
    } catch {
      setSalas([]);
    } finally {
      setCarregando(false);
    }
  };

  /* O código é sempre em maiúsculas (NOVO01). Antes, "novo01" digitado no
     celular — que começa em minúscula — não achava nada. */
  const termo = busca.trim().toUpperCase();
  const salasFiltradas = salas.filter(s =>
    termo === '' ||
    String(s.codigo || '').toUpperCase().includes(termo) ||
    String(s.nome || '').toUpperCase().includes(termo)
  );
  const achouExata = termo.length >= 4 && salas.find(s => String(s.codigo || '').toUpperCase() === termo);

  const minhasSalas = usadas
    .map(id => salas.find(s => String(s.id) === id))
    .filter(Boolean);

  // O que aparece na tela, nesta ordem de prioridade
  const listaVisivel = termo !== ''
    ? (achouExata ? [achouExata] : salasFiltradas)
    : verTodas ? salas : minhasSalas;

  const entrarNaSala = (sala) => {
    setSalaSelecionada(sala);
    setSenhaDigitada([]);
    setErroSenha(false);
    setEtapa(ETAPAS.SENHA);
  };

  const adicionarEmoji = (emoji) => {
    if (senhaDigitada.length >= 4) return;
    setErroSenha(false);
    const nova = [...senhaDigitada, emoji];
    setSenhaDigitada(nova);

    if (nova.length === 4) {
      // Quem confere a senha é o servidor: ela não vem mais para o navegador.
      setTimeout(async () => {
        try {
          const res = await fetch(`${API}/aluno/sala/entrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sala_id: salaSelecionada.id, senha: nova.join('') })
          });
          const data = await res.json();
          if (!res.ok) {
            setErroSenha(data.erro || true);
            setSenhaDigitada([]);
            return;
          }
          salvarAcessoSala(data.sala.id, data.token);
          lembrarSala(data.sala.id);
          navigate('/aluno/login', { state: { sala: data.sala } });
        } catch {
          setErroSenha('Não consegui falar com o servidor.');
          setSenhaDigitada([]);
        }
      }, 300);
    }
  };

  return (
    <div className="area-aluno-container">
      <FundoAnimado />
      <header className="area-aluno-header">
        <div className="area-aluno-brand" onClick={() => navigate('/')}>
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>
        <h1 className="area-aluno-titulo"><Backpack size={22} strokeWidth={1.75} /> Área do Aluno</h1>
        <div style={{width: 120}} />
      </header>

      {/* LISTA DE SALAS */}
      {etapa === ETAPAS.LISTA && (
        <main className="area-aluno-main">
          <div className="busca-sala-wrap">
            <label className="busca-sala-rotulo" htmlFor="codigo-sala">
              Qual é o código da sua sala?
              <small>Está escrito no quadro. Ex.: ABC123</small>
            </label>
            <div className="busca-sala-input">
              <span className="busca-icone"><Search size={20} strokeWidth={1.75} /></span>
              <input
                id="codigo-sala"
                type="text"
                placeholder="Digite o código aqui"
                value={busca}
                onChange={e => setBusca(e.target.value.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                maxLength={20}
              />
              {busca && (
                <button className="busca-limpar" onClick={() => setBusca('')} title="Limpar a busca" aria-label="Limpar o código">
                  <X size={18} strokeWidth={2.2} />
                </button>
              )}
            </div>
          </div>

          {!carregando && termo === '' && !verTodas && minhasSalas.length > 0 && (
            <h2 className="salas-secao-titulo"><History size={18} strokeWidth={2} /> Salas que você já usou aqui</h2>
          )}
          {!carregando && achouExata && (
            <h2 className="salas-secao-titulo achou">Achamos! Toque na sua sala:</h2>
          )}

          {carregando ? (
            <div className="salas-vazio"><span><Hourglass size={48} strokeWidth={1.5} /></span><p>Carregando salas...</p></div>
          ) : termo !== '' && listaVisivel.length === 0 ? (
            <div className="salas-vazio">
              <span><SearchX size={48} strokeWidth={1.5} /></span>
              <p>Nenhuma sala com esse código.</p>
              <small>Confira as letras e os números no quadro, ou pergunte para a sua professora.</small>
            </div>
          ) : listaVisivel.length === 0 ? null : (
            <div className="salas-grid">
              {listaVisivel.map(sala => (
                <div key={sala.id} className="sala-card" onClick={() => entrarNaSala(sala)}>
                  <div className="sala-card-header" style={{background: temaCor(sala.tema_senha)}}>
                    <span className="sala-tema-icon">{temaIcone(sala.tema_senha)}</span>
                    <span className="sala-codigo-tag">{sala.codigo}</span>
                  </div>
                  <div className="sala-card-body">
                    <h3>{sala.nome}</h3>
                    <p className="sala-materia">{sala.serie} · {sala.materia}</p>
                    <p className="sala-escola"><GraduationCap size={14} strokeWidth={2} /> {sala.professor}</p>
                  </div>
                  <button className="sala-entrar-btn">Entrar →</button>
                </div>
              ))}
            </div>
          )}

          {/* Para quem esqueceu o código: a lista completa continua aqui. */}
          {!carregando && termo === '' && salas.length > 0 && (
            <button className="ver-todas-salas" onClick={() => setVerTodas(v => !v)}>
              <List size={17} strokeWidth={2} />
              {verTodas ? 'Esconder a lista de salas' : 'Não sei o código — ver todas as salas'}
            </button>
          )}
        </main>
      )}

      {/* TECLADO VIRTUAL */}
      {etapa === ETAPAS.SENHA && salaSelecionada && (
        <main className="area-aluno-main centralizado">
          <div className="senha-card">
            <button className="senha-voltar" onClick={() => setEtapa(ETAPAS.LISTA)}>← Voltar</button>

            <div className="senha-info-sala">
              <span className="senha-tema-icon">{temaIcone(salaSelecionada.tema_senha)}</span>
              <h2>{salaSelecionada.nome}</h2>
              <p>{salaSelecionada.professor}</p>
            </div>

            <p className="senha-instrucao"><Lock size={17} strokeWidth={2} /> Digite a senha da sala!</p>

            <div className="senha-digitada">
              {[0,1,2,3].map(i => (
                <div key={i} className={`senha-slot ${senhaDigitada[i] ? 'preenchido' : ''} ${erroSenha ? 'erro' : ''}`}>
                  {senhaDigitada[i] || ''}
                </div>
              ))}
            </div>

            {erroSenha && <p className="senha-erro"><CircleAlert size={16} strokeWidth={2.2} /> {typeof erroSenha === 'string' ? erroSenha : 'Senha errada! Tente de novo.'}</p>}

            <div className="teclado-virtual">
              {TEMAS[salaSelecionada.tema_senha]?.map((emoji, i) => (
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

            {senhaDigitada.length > 0 && (
              <button className="senha-apagar" onClick={() => setSenhaDigitada(prev => prev.slice(0, -1))}>
                <Delete size={16} strokeWidth={2} /> Apagar
              </button>
            )}
          </div>
        </main>
      )}
    </div>
  );
}

function temaCor(tema) {
  return { frutas: '#FF6B6B', animais: '#4ECDC4', esportes: '#45B7D1' }[tema] || '#1A6FC4';
}

function temaIcone(tema) {
  return { frutas: '🍎', animais: '🐶', esportes: '⚽' }[tema] || '🏫';
}

export default AreaAluno;