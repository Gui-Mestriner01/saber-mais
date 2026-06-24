import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../CSS/Pintura.css';

const CORES = [
  '#E23F3F', '#E07820', '#D89E00', '#3DAA5C',
  '#1A6FC4', '#8B44AC', '#E91E8C', '#00BCD4',
  '#795548', '#000000', '#FFFFFF', '#9E9E9E',
];

function PinturaAluno() {
  const { state }   = useLocation();
  const navigate    = useNavigate();
  const canvasRef   = useRef(null);
  const imgRef      = useRef(null);
  const pintando    = useRef(false);
  const ultimoPonto = useRef(null);

  const atividade  = state?.atividade;
  const nomeAluno  = state?.nomeAluno;
  const sala       = state?.sala;

  const [corAtual, setCorAtual]       = useState('#E23F3F');
  const [tamanho, setTamanho]         = useState(12);
  const [ferramenta, setFerramenta]   = useState('pincel');
  const [enviando, setEnviando]       = useState(false);
  const [enviado, setEnviado]         = useState(false);
  const [modalEnviar, setModalEnviar] = useState(false);

  useEffect(() => {
    if (!atividade) { navigate('/aluno'); return; }
    carregarImagem();
  }, []);

  const carregarImagem = async () => {
    try {
      const res  = await fetch(`http://localhost:3001/atividade/${atividade.id}`);
      const data = await res.json();
      const urlImagem = data.conteudo?.url_imagem;

      const canvas = canvasRef.current;
      const ctx    = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (urlImagem) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = urlImagem;
        img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    } catch {
      console.error('Erro ao carregar imagem');
    }
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    };
  };

  const iniciarPintura = (e) => {
    e.preventDefault();
    pintando.current    = true;
    ultimoPonto.current = getPos(e);
  };

  const pintar = (e) => {
    e.preventDefault();
    if (!pintando.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const pos    = getPos(e);

    ctx.beginPath();
    ctx.moveTo(ultimoPonto.current.x, ultimoPonto.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = ferramenta === 'borracha' ? '#ffffff' : corAtual;
    ctx.lineWidth   = ferramenta === 'borracha' ? tamanho * 3 : tamanho;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();

    ultimoPonto.current = pos;
  };

  const pararPintura = () => {
    pintando.current    = false;
    ultimoPonto.current = null;
  };

  const limparCanvas = () => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    carregarImagem();
  };

  const handleEnviar = async () => {
    setEnviando(true);
    try {
      const canvas = canvasRef.current;

      // Converte canvas para blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

      const formData = new FormData();
      formData.append('pintura', blob, `pintura_${nomeAluno}_${Date.now()}.png`);
      formData.append('nome_aluno', nomeAluno);
      formData.append('sala_id', sala.id);

      const res = await fetch(`http://localhost:3001/atividade/${atividade.id}/resposta/pintura`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Erro ao enviar');

      setEnviado(true);
      setModalEnviar(false);
      setTimeout(() => navigate('/aluno/home', { state: { sala, nomeAluno } }), 1500);
    } catch (err) {
      alert('Erro ao enviar pintura: ' + err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pintura-container">

      {modalEnviar && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Enviar pintura?</h3>
            <p>Após enviar você não poderá mais editar.</p>
            <div className="modal-btns">
              <button className="modal-btn-salvar" onClick={handleEnviar} disabled={enviando}>
                {enviando ? 'Enviando...' : '✅ Enviar'}
              </button>
              <button className="modal-btn-cancelar" onClick={() => setModalEnviar(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <header className="pintura-header">
        <div className="pintura-brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>
        <h2 className="pintura-titulo">🎨 {atividade?.titulo || 'Pinte o desenho!'}</h2>
        <div className="pintura-header-acoes">
          <button className="btn-limpar" onClick={limparCanvas}>🗑️ Limpar</button>
          <button className="btn-enviar-pintura" onClick={() => setModalEnviar(true)}>
            ✅ Enviar
          </button>
        </div>
      </header>

      <div className="pintura-workspace">
        <aside className="pintura-toolbar">
          <div className="toolbar-secao">
            <span className="toolbar-label">Ferramenta</span>
            <button className={`tool-btn ${ferramenta === 'pincel'  ? 'ativo' : ''}`} onClick={() => setFerramenta('pincel')}>🖌️</button>
            <button className={`tool-btn ${ferramenta === 'borracha' ? 'ativo' : ''}`} onClick={() => setFerramenta('borracha')}>🧹</button>
          </div>

          <div className="toolbar-secao">
            <span className="toolbar-label">Tamanho</span>
            <input type="range" min="2" max="40" value={tamanho} onChange={e => setTamanho(Number(e.target.value))} className="pintura-range" />
            <span className="tamanho-valor">{tamanho}px</span>
          </div>

          <div className="toolbar-secao">
            <span className="toolbar-label">Cores</span>
            <div className="cores-grid">
              {CORES.map(cor => (
                <button
                  key={cor}
                  className={`cor-btn ${corAtual === cor ? 'ativa' : ''}`}
                  style={{background: cor}}
                  onClick={() => { setCorAtual(cor); setFerramenta('pincel'); }}
                />
              ))}
            </div>
            <div className="cor-custom">
              <span className="toolbar-label">Personalizada</span>
              <input
                type="color"
                value={corAtual}
                onChange={e => { setCorAtual(e.target.value); setFerramenta('pincel'); }}
                className="color-picker"
              />
            </div>
          </div>

          <div className="pincel-preview">
            <div style={{
              width:  Math.min(tamanho, 40),
              height: Math.min(tamanho, 40),
              background: ferramenta === 'borracha' ? '#ddd' : corAtual,
              borderRadius: '50%',
              border: '2px solid #C8DFF0',
            }} />
          </div>
        </aside>

        <div className="pintura-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={900}
            height={600}
            className="pintura-canvas"
            onMouseDown={iniciarPintura}
            onMouseMove={pintar}
            onMouseUp={pararPintura}
            onMouseLeave={pararPintura}
            onTouchStart={iniciarPintura}
            onTouchMove={pintar}
            onTouchEnd={pararPintura}
            style={{cursor: ferramenta === 'borracha' ? 'cell' : 'crosshair'}}
          />
        </div>
      </div>

      {enviado && (
        <div className="pintura-enviado">✅ Pintura enviada com sucesso!</div>
      )}
    </div>
  );
}

export default PinturaAluno;