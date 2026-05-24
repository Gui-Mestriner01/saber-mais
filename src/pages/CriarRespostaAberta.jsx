import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Quiz.css';

const novaPergunta = () => ({
  id: Date.now() + Math.random(),
  texto: '',
  imagem: null,
});

function CriarRespostaAberta() {
  const navigate = useNavigate();
  const imgRefs = useRef({});

  const [titulo, setTitulo]         = useState('');
  const [perguntas, setPerguntas]   = useState([novaPergunta()]);
  const [idx, setIdx]               = useState(0);
  const [salvando, setSalvando]     = useState(false);
  const [msgSucesso, setMsgSucesso] = useState(false);
  const [modalSair, setModalSair]   = useState(false);

  const p = perguntas[idx];

  const setPergunta = (updates) => {
    setPerguntas(prev => prev.map((q, i) => i === idx ? { ...q, ...updates } : q));
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

  const removerImagem = (e) => {
    e.stopPropagation();
    setPergunta({ imagem: null });
  };

  const handleSalvar = () => {
    setSalvando(true);
    setTimeout(() => {
      setSalvando(false);
      setMsgSucesso(true);
      setTimeout(() => navigate('/professor/dashboard'), 1500);
    }, 1000);
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
              <button className="modal-btn-sair" onClick={() => navigate('/professor/dashboard')}>
                Sair sem Salvar
              </button>
              <button className="modal-btn-cancelar" onClick={() => setModalSair(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="quiz-sidebar">
        <div className="quiz-brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>

        <input
          className="quiz-titulo-input"
          type="text"
          placeholder="Título da Atividade..."
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

      {/* MAIN */}
      <main className="quiz-main">

        {/* PERGUNTA */}
        <div className="quiz-pergunta-wrap">
          <textarea
            className="quiz-pergunta-input resposta-aberta-textarea"
            placeholder="Digite a pergunta aqui..."
            value={p.texto}
            onChange={e => setPergunta({ texto: e.target.value })}
            rows={3}
          />
        </div>

        {/* IMAGEM OPCIONAL */}
        <div
          className="quiz-imagem-area"
          onClick={() => imgRefs.current[idx]?.click()}
        >
          {p.imagem ? (
            <>
              <img src={p.imagem} alt="imagem da pergunta" className="quiz-img-preview" />
              <button className="pintura-trocar-btn" onClick={removerImagem}>
                🗑️ Remover imagem
              </button>
            </>
          ) : (
            <div className="quiz-imagem-placeholder">
              <span>🖼️</span>
              <p>Clique para adicionar uma imagem (opcional)</p>
            </div>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          style={{display:'none'}}
          ref={el => imgRefs.current[idx] = el}
          onChange={handleImagem}
        />

        {/* PREVIEW DA RESPOSTA DO ALUNO */}
        <div className="resposta-preview-card">
          <div className="resposta-preview-label">✍️ O aluno verá um campo assim para responder:</div>
          <div className="resposta-preview-campo">
            <span>Digite sua resposta aqui...</span>
          </div>
          <div className="resposta-preview-info">
            📋 A correção será feita manualmente pelo professor
          </div>
        </div>

      </main>

      {/* PROPS */}
      <aside className="quiz-props">
        <h3>Propriedades</h3>

        <div className="prop-grupo">
          <label>Tipo</label>
          <span className="prop-info">✍️ Resposta Aberta</span>
        </div>

        <div className="prop-grupo">
          <label>Pergunta</label>
          <span className="prop-info">{idx + 1} de {perguntas.length}</span>
        </div>

        <div className="prop-grupo">
          <label>Imagem</label>
          <span className="prop-info">{p.imagem ? '✅ Adicionada' : '➖ Nenhuma'}</span>
        </div>

        <div className="prop-grupo">
          <label>Correção</label>
          <span className="prop-info">👨‍🏫 Manual</span>
        </div>

        {msgSucesso && <div className="msg-sucesso-quiz">✅ Salvo com sucesso!</div>}

        <button
          className="btn-salvar-quiz"
          onClick={handleSalvar}
          disabled={salvando || !titulo}
        >
          {salvando ? 'Salvando...' : '💾 SALVAR'}
        </button>
      </aside>
    </div>
  );
}

export default CriarRespostaAberta;