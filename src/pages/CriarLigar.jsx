import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Ligar.css';

const novoPar = () => ({
  id: Date.now() + Math.random(),
  ladoA: { tipo: 'texto', conteudo: '' },
  ladoB: { tipo: 'texto', conteudo: '' },
});

const novaAtividade = () => ({
  id: Date.now(),
  titulo: '',
  pares: [novoPar(), novoPar(), novoPar()],
});

function CriarLigar() {
  const navigate = useNavigate();
  const [titulo, setTitulo]       = useState('');
  const [atividades, setAtividades] = useState([novaAtividade()]);
  const [idx, setIdx]             = useState(0);
  const [salvando, setSalvando]   = useState(false);
  const [msgSucesso, setMsgSucesso] = useState(false);
  const [modalSair, setModalSair] = useState(false);

  const imgRefs = useRef({});
  const ativ = atividades[idx];

  const setAtiv = (updates) => {
    setAtividades(prev => prev.map((a, i) => i === idx ? { ...a, ...updates } : a));
  };

  const setPar = (parIdx, lado, updates) => {
    setAtiv({
      pares: ativ.pares.map((p, i) =>
        i === parIdx ? { ...p, [lado]: { ...p[lado], ...updates } } : p
      )
    });
  };

  const adicionarPar = () => {
    if (ativ.pares.length >= 10) return;
    setAtiv({ pares: [...ativ.pares, novoPar()] });
  };

  const removerPar = (parIdx) => {
    if (ativ.pares.length <= 3) return;
    setAtiv({ pares: ativ.pares.filter((_, i) => i !== parIdx) });
  };

  const adicionarAtividade = () => {
    const nova = novaAtividade();
    setAtividades(prev => [...prev, nova]);
    setIdx(atividades.length);
  };

  const removerAtividade = (i, e) => {
    e.stopPropagation();
    if (atividades.length === 1) return;
    const novas = atividades.filter((_, ai) => ai !== i);
    setAtividades(novas);
    setIdx(Math.min(idx, novas.length - 1));
  };

  const handleImagem = (parIdx, lado, e) => {
    const file = e.target.files[0];
    if (file) setPar(parIdx, lado, { tipo: 'imagem', conteudo: URL.createObjectURL(file) });
  };

  const toggleTipo = (parIdx, lado) => {
    const atual = ativ.pares[parIdx][lado].tipo;
    setPar(parIdx, lado, { tipo: atual === 'texto' ? 'imagem' : 'texto', conteudo: '' });
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
    <div className="ligar-builder">

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
      <aside className="ligar-sidebar">
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
          {atividades.map((a, i) => (
            <div
              key={a.id}
              className={`pergunta-thumb ${i === idx ? 'ativa' : ''}`}
              onClick={() => setIdx(i)}
            >
              <span className="thumb-num">{i + 1}</span>
              <span className="thumb-texto">{a.titulo || 'Atividade...'}</span>
              {atividades.length > 1 && (
                <button className="thumb-del" onClick={(e) => removerAtividade(i, e)}>🗑</button>
              )}
            </div>
          ))}
        </div>

        <button className="btn-add-pergunta" onClick={adicionarAtividade}>
          + Adicionar Atividade
        </button>
        <button className="btn-sair-quiz" onClick={() => setModalSair(true)}>
          ← Sair
        </button>
      </aside>

      {/* MAIN */}
      <main className="ligar-main">
        <input
          className="ligar-titulo-ativ"
          type="text"
          placeholder="Título desta atividade..."
          value={ativ.titulo}
          onChange={e => setAtiv({ titulo: e.target.value })}
        />

        <div className="ligar-header-colunas">
          <span>Coluna A</span>
          <span></span>
          <span>Coluna B</span>
        </div>

        <div className="pares-lista">
          {ativ.pares.map((par, parIdx) => (
            <div key={par.id} className="par-row">
              <span className="par-num">{parIdx + 1}</span>

              {/* LADO A */}
              <div className="par-lado">
                <div className="par-tipo-toggle">
                  <button
                    className={par.ladoA.tipo === 'texto' ? 'ativo' : ''}
                    onClick={() => toggleTipo(parIdx, 'ladoA')}
                  >📝 Texto</button>
                  <button
                    className={par.ladoA.tipo === 'imagem' ? 'ativo' : ''}
                    onClick={() => toggleTipo(parIdx, 'ladoA')}
                  >🖼️ Imagem</button>
                </div>

                {par.ladoA.tipo === 'texto' ? (
                  <input
                    className="par-input"
                    type="text"
                    placeholder="Texto A..."
                    value={par.ladoA.conteudo}
                    onChange={e => setPar(parIdx, 'ladoA', { conteudo: e.target.value })}
                  />
                ) : (
                  <div
                    className="par-img-area"
                    onClick={() => imgRefs.current[`${parIdx}-A`]?.click()}
                  >
                    {par.ladoA.conteudo
                      ? <img src={par.ladoA.conteudo} alt="lado A" />
                      : <span>+ Imagem</span>
                    }
                    <input
                      type="file"
                      accept="image/*"
                      style={{display:'none'}}
                      ref={el => imgRefs.current[`${parIdx}-A`] = el}
                      onChange={e => handleImagem(parIdx, 'ladoA', e)}
                    />
                  </div>
                )}
              </div>

              {/* CONECTOR */}
              <div className="par-conector">🔗</div>

              {/* LADO B */}
              <div className="par-lado">
                <div className="par-tipo-toggle">
                  <button
                    className={par.ladoB.tipo === 'texto' ? 'ativo' : ''}
                    onClick={() => toggleTipo(parIdx, 'ladoB')}
                  >📝 Texto</button>
                  <button
                    className={par.ladoB.tipo === 'imagem' ? 'ativo' : ''}
                    onClick={() => toggleTipo(parIdx, 'ladoB')}
                  >🖼️ Imagem</button>
                </div>

                {par.ladoB.tipo === 'texto' ? (
                  <input
                    className="par-input"
                    type="text"
                    placeholder="Texto B..."
                    value={par.ladoB.conteudo}
                    onChange={e => setPar(parIdx, 'ladoB', { conteudo: e.target.value })}
                  />
                ) : (
                  <div
                    className="par-img-area"
                    onClick={() => imgRefs.current[`${parIdx}-B`]?.click()}
                  >
                    {par.ladoB.conteudo
                      ? <img src={par.ladoB.conteudo} alt="lado B" />
                      : <span>+ Imagem</span>
                    }
                    <input
                      type="file"
                      accept="image/*"
                      style={{display:'none'}}
                      ref={el => imgRefs.current[`${parIdx}-B`] = el}
                      onChange={e => handleImagem(parIdx, 'ladoB', e)}
                    />
                  </div>
                )}
              </div>

              {/* REMOVER PAR */}
              {ativ.pares.length > 3 && (
                <button className="par-del" onClick={() => removerPar(parIdx)}>✕</button>
              )}
            </div>
          ))}
        </div>

        {ativ.pares.length < 10 && (
          <button className="btn-add-par" onClick={adicionarPar}>
            + Adicionar Par
          </button>
        )}
      </main>

      {/* PROPS */}
      <aside className="quiz-props">
        <h3>Propriedades</h3>

        <div className="prop-grupo">
          <label>Atividade</label>
          <span className="prop-info">{idx + 1} de {atividades.length}</span>
        </div>

        <div className="prop-grupo">
          <label>Pares</label>
          <span className="prop-info">{ativ.pares.length} de 10</span>
        </div>

        {msgSucesso && <div className="msg-sucesso-quiz">✅ Salvo com sucesso!</div>}

        <button className="btn-salvar-quiz" onClick={handleSalvar} disabled={salvando}>
          {salvando ? 'Salvando...' : '💾 SALVAR'}
        </button>
      </aside>
    </div>
  );
}

export default CriarLigar;