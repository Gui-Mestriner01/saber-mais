import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Quiz.css';

const CORES = [
  { bg: '#E23F3F', icon: '▲' },
  { bg: '#1368CE', icon: '◆' },
  { bg: '#D89E00', icon: '●' },
  { bg: '#26890C', icon: '■' },
  { bg: '#8B44AC', icon: '★' },
  { bg: '#E07820', icon: '⬟' },
];

const novaAlternativa = () => ({ id: Date.now() + Math.random(), texto: '', correta: false });

const novaPergunta = () => ({
  id: Date.now(),
  texto: '',
  imagem: null,
  multiplaEscolha: false,
  alternativas: [1,2,3,4].map(() => novaAlternativa())
});

function CriarQuiz() {
  const navigate = useNavigate();
  const imgRef = useRef(null);

  const [titulo, setTitulo]         = useState('');
  const [perguntas, setPerguntas]   = useState([novaPergunta()]);
  const [idx, setIdx]               = useState(0);
  const [salvando, setSalvando]     = useState(false);
  const [modalSair, setModalSair]   = useState(false);
  const [msgSucesso, setMsgSucesso] = useState(false);

  const p = perguntas[idx];

  const setPergunta = (updates) => {
    setPerguntas(prev => prev.map((q, i) => i === idx ? { ...q, ...updates } : q));
  };

  const setAlt = (altIdx, updates) => {
    setPergunta({
      alternativas: p.alternativas.map((a, i) => i === altIdx ? { ...a, ...updates } : a)
    });
  };

  const toggleCorreta = (altIdx) => {
    if (!p.multiplaEscolha) {
      setPergunta({
        alternativas: p.alternativas.map((a, i) => ({ ...a, correta: i === altIdx }))
      });
    } else {
      setAlt(altIdx, { correta: !p.alternativas[altIdx].correta });
    }
  };

  const adicionarAlternativa = () => {
    if (p.alternativas.length >= 6) return;
    setPergunta({ alternativas: [...p.alternativas, novaAlternativa()] });
  };

  const removerAlternativa = (altIdx) => {
    if (p.alternativas.length <= 2) return;
    setPergunta({ alternativas: p.alternativas.filter((_, i) => i !== altIdx) });
  };

  const adicionarPergunta = () => {
    const nova = novaPergunta();
    setPerguntas(prev => [...prev, nova]);
    setIdx(perguntas.length);
  };

  const removerPergunta = (i, e) => {
    e.stopPropagation();
    if (perguntas.length === 1) return;
    const novas = perguntas.filter((_, pi) => pi !== i);
    setPerguntas(novas);
    setIdx(Math.min(idx, novas.length - 1));
  };

  const handleImagem = (e) => {
    const file = e.target.files[0];
    if (file) setPergunta({ imagem: URL.createObjectURL(file) });
  };

  const handleSalvar = async () => {
    setSalvando(true);
    // Aqui vai a chamada ao backend
    setTimeout(() => {
      setSalvando(false);
      setMsgSucesso(true);
      setTimeout(() => navigate('/professor/dashboard'), 1500);
    }, 1000);
  };

  const handleSairSemSalvar = () => {
    navigate('/professor/dashboard');
  };

  return (
    <div className="quiz-builder">

      {/* MODAL SAIR */}
      {modalSair && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Deseja salvar antes de sair?</h3>
            <p>Se sair sem salvar, as alterações serão perdidas.</p>
            <div className="modal-btns">
              <button className="modal-btn-salvar" onClick={() => { setModalSair(false); handleSalvar(); }}>
                💾 Salvar e Sair
              </button>
              <button className="modal-btn-sair" onClick={handleSairSemSalvar}>
                Sair sem Salvar
              </button>
              <button className="modal-btn-cancelar" onClick={() => setModalSair(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR ESQUERDA */}
      <aside className="quiz-sidebar">
        <div className="quiz-brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>

        <input
          className="quiz-titulo-input"
          type="text"
          placeholder="Título do Quiz..."
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
        />

        <div className="perguntas-lista">
          {perguntas.map((q, i) => (
            <div
              key={q.id}
              className={`pergunta-thumb ${i === idx ? 'ativa' : ''}`}
              onClick={() => setIdx(i)}
            >
              <span className="thumb-num">{i + 1}</span>
              <span className="thumb-texto">{q.texto || 'Pergunta...'}</span>
              {perguntas.length > 1 && (
                <button className="thumb-del" onClick={(e) => removerPergunta(i, e)}>🗑</button>
              )}
            </div>
          ))}
        </div>

        <button className="btn-add-pergunta" onClick={adicionarPergunta}>
          + Adicionar Pergunta
        </button>
        <button className="btn-sair-quiz" onClick={() => setModalSair(true)}>
          ← Sair
        </button>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="quiz-main">
        <div className="quiz-pergunta-wrap">
          <input
            className="quiz-pergunta-input"
            type="text"
            placeholder="Comece a digitar a pergunta..."
            value={p.texto}
            onChange={e => setPergunta({ texto: e.target.value })}
          />
        </div>

        <div className="quiz-imagem-area" onClick={() => imgRef.current.click()}>
          {p.imagem
            ? <img src={p.imagem} alt="imagem" className="quiz-img-preview" />
            : (
              <div className="quiz-imagem-placeholder">
                <span>🖼️</span>
                <p>Clique para adicionar uma imagem</p>
              </div>
            )
          }
        </div>
        <input ref={imgRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImagem} />

        <div className={`alternativas-grid ${p.alternativas.length > 4 ? 'grid-6' : ''}`}>
          {p.alternativas.map((alt, altIdx) => {
            const cor = CORES[altIdx];
            return (
              <div
                key={alt.id}
                className={`alternativa-card ${alt.correta ? 'correta' : ''}`}
                style={{'--cor': cor.bg}}
              >
                <div className="alt-icone" style={{background: cor.bg}}>
                  {cor.icon}
                </div>
                <input
                  type="text"
                  className="alt-input"
                  placeholder={`Alternativa ${altIdx + 1}${altIdx >= 4 ? ' (opcional)' : ''}`}
                  value={alt.texto}
                  onChange={e => setAlt(altIdx, { texto: e.target.value })}
                />
                <button
                  className={`alt-correta-btn ${alt.correta ? 'marcada' : ''}`}
                  onClick={() => toggleCorreta(altIdx)}
                  title="Marcar como correta"
                >
                  {alt.correta ? '✅' : '○'}
                </button>
                {altIdx >= 4 && (
                  <button className="alt-del-btn" onClick={() => removerAlternativa(altIdx)}>✕</button>
                )}
              </div>
            );
          })}
        </div>

        {p.alternativas.length < 6 && (
          <button className="btn-add-alternativa" onClick={adicionarAlternativa}>
            + Adicionar alternativa
          </button>
        )}
      </main>

      {/* PAINEL DIREITO */}
      <aside className="quiz-props">
        <h3>Propriedades</h3>

        <div className="prop-grupo">
          <label>Tipo de resposta</label>
          <div className="toggle-tipo">
            <button
              className={!p.multiplaEscolha ? 'ativo' : ''}
              onClick={() => setPergunta({ multiplaEscolha: false })}
            >
              Única
            </button>
            <button
              className={p.multiplaEscolha ? 'ativo' : ''}
              onClick={() => setPergunta({ multiplaEscolha: true })}
            >
              Múltipla
            </button>
          </div>
        </div>

        <div className="prop-grupo">
          <label>Pergunta</label>
          <span className="prop-info">{idx + 1} de {perguntas.length}</span>
        </div>

        <div className="prop-grupo">
          <label>Alternativas</label>
          <span className="prop-info">{p.alternativas.length} de 6</span>
        </div>

        {msgSucesso && <div className="msg-sucesso-quiz">✅ Quiz salvo!</div>}

        <button
          className="btn-salvar-quiz"
          onClick={handleSalvar}
          disabled={salvando}
        >
          {salvando ? 'Salvando...' : '💾 SALVAR QUIZ'}
        </button>
      </aside>

    </div>
  );
}

export default CriarQuiz;