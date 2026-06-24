import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../CSS/Quiz.css';
import '../CSS/Pintura.css';

function CriarPintura() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const salaId    = location.state?.salaId;
  const imgRef    = useRef(null);

  const [titulo, setTitulo]         = useState('');
  const [imagem, setImagem]         = useState(null);
  const [imagemFile, setImagemFile] = useState(null);
  const [salvando, setSalvando]     = useState(false);
  const [msgSucesso, setMsgSucesso] = useState(false);
  const [modalSair, setModalSair]   = useState(false);

  const handleImagem = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagem(URL.createObjectURL(file));
      setImagemFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setImagem(URL.createObjectURL(file));
      setImagemFile(file);
    }
  };

  const handleSalvar = async () => {
    if (!titulo) { alert('Adicione um título!'); return; }
    if (!imagemFile) { alert('Adicione uma imagem!'); return; }

    setSalvando(true);
    try {
      // 1. Faz upload da imagem
      const formData = new FormData();
      formData.append('imagem', imagemFile);

      const uploadRes = await fetch('http://localhost:3001/professor/pintura/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.erro);

      // 2. Salva a atividade com a URL da imagem
      const atvRes = await fetch('http://localhost:3001/professor/atividade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          titulo,
          tipo: 'pintura',
          sala_id: salaId,
          conteudo: { url_imagem: uploadData.url, instrucao: titulo }
        })
      });

      const atvData = await atvRes.json();
      if (!atvRes.ok) throw new Error(atvData.erro);

      setMsgSucesso(true);
      setTimeout(() => navigate('/professor/dashboard'), 1500);
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="quiz-builder">

      {modalSair && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Deseja salvar antes de sair?</h3>
            <p>Se sair sem salvar, as alterações serão perdidas.</p>
            <div className="modal-btns">
              <button className="modal-btn-salvar" onClick={() => { setModalSair(false); handleSalvar(); }}>💾 Salvar e Sair</button>
              <button className="modal-btn-sair" onClick={() => navigate('/professor/dashboard')}>Sair sem Salvar</button>
              <button className="modal-btn-cancelar" onClick={() => setModalSair(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

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
        <div style={{flex:1}} />
        <button className="btn-sair-quiz" onClick={() => setModalSair(true)}>← Sair</button>
      </aside>

      <main className="quiz-main">
        <div className="quiz-pergunta-wrap">
          <input
            className="quiz-pergunta-input"
            type="text"
            placeholder="Instrução para o aluno... Ex: Pinte o cachorro!"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
          />
        </div>

        <div
          className="pintura-upload-area"
          onClick={() => imgRef.current.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          {imagem ? (
            <>
              <img src={imagem} alt="desenho" className="pintura-preview" />
              <button
                className="pintura-trocar-btn"
                onClick={e => { e.stopPropagation(); imgRef.current.click(); }}
              >
                🔄 Trocar imagem
              </button>
            </>
          ) : (
            <div className="pintura-placeholder">
              <span>🎨</span>
              <p>Clique ou arraste uma imagem aqui</p>
              <small>Aceita PNG, JPEG, JPG, WEBP</small>
            </div>
          )}
        </div>
        <input ref={imgRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImagem} />
      </main>

      <aside className="quiz-props">
        <h3>Propriedades</h3>
        <div className="prop-grupo">
          <label>Tipo</label>
          <span className="prop-info">🎨 Pintura</span>
        </div>
        <div className="prop-grupo">
          <label>Imagem</label>
          <span className="prop-info">{imagem ? '✅ Adicionada' : '❌ Nenhuma'}</span>
        </div>
        {msgSucesso && <div className="msg-sucesso-quiz">✅ Salvo!</div>}
        <button className="btn-salvar-quiz" onClick={handleSalvar} disabled={salvando || !imagem}>
          {salvando ? 'Salvando...' : '💾 SALVAR'}
        </button>
      </aside>
    </div>
  );
}

export default CriarPintura;