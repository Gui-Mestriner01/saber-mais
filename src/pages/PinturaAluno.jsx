import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Pintura.css';

const CORES = [
  '#E23F3F', '#E07820', '#D89E00', '#3DAA5C',
  '#1A6FC4', '#8B44AC', '#E91E8C', '#00BCD4',
  '#795548', '#000000', '#FFFFFF', '#9E9E9E',
];

function PinturaAluno() {
  const navigate = useNavigate();
  const canvasRef     = useRef(null);
  const imgRef        = useRef(null);
  const pintando      = useRef(false);
  const ultimoPonto   = useRef(null);

  const [corAtual, setCorAtual]       = useState('#E23F3F');
  const [tamanho, setTamanho]         = useState(12);
  const [ferramenta, setFerramenta]   = useState('pincel'); // pincel | borracha
  const [enviado, setEnviado]         = useState(false);
  const [modalEnviar, setModalEnviar] = useState(false);

  // Imagem mockada — virá do backend
  const imagemFundo = null;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (imagemFundo) {
      const img = new Image();
      img.src = imagemFundo;
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else {
      // Placeholder para testar sem imagem do backend
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      ctx.font = '18px Nunito';
      ctx.fillStyle = '#aaa';
      ctx.textAlign = 'center';
      ctx.fillText('Desenho do professor aparece aqui', canvas.width / 2, canvas.height / 2);
    }
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const iniciarPintura = (e) => {
    e.preventDefault();
    pintando.current = true;
    ultimoPonto.current = getPos(e);
  };

  const pintar = (e) => {
    e.preventDefault();
    if (!pintando.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);

    ctx.beginPath();
    ctx.moveTo(ultimoPonto.current.x, ultimoPonto.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = ferramenta === 'borracha' ? '#ffffff' : corAtual;
    ctx.lineWidth = ferramenta === 'borracha' ? tamanho * 3 : tamanho;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ultimoPonto.current = pos;
  };

  const pararPintura = () => {
    pintando.current = false;
    ultimoPonto.current = null;
  };

  const limparCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleEnviar = () => {
    setEnviado(true);
    setModalEnviar(false);
    // Aqui vai enviar o canvas como imagem pro backend
    // canvasRef.current.toDataURL('image/png')
    setTimeout(() => navigate('/aluno/dashboard'), 1500);
  };

  return (
    <div className="pintura-container">

      {/* MODAL ENVIAR */}
      {modalEnviar && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Enviar pintura?</h3>
            <p>Após enviar você não poderá mais editar.</p>
            <div className="modal-btns">
              <button className="modal-btn-salvar" onClick={handleEnviar}>✅ Enviar</button>
              <button className="modal-btn-cancelar" onClick={() => setModalEnviar(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="pintura-header">
        <div className="pintura-brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>
        <h2 className="pintura-titulo">🎨 Pinte o desenho!</h2>
        <div className="pintura-header-acoes">
          <button className="btn-limpar" onClick={limparCanvas}>🗑️ Limpar</button>
          <button className="btn-enviar-pintura" onClick={() => setModalEnviar(true)}>
            ✅ Enviar
          </button>
        </div>
      </header>

      <div className="pintura-workspace">

        {/* TOOLBAR ESQUERDA */}
        <aside className="pintura-toolbar">

          <div className="toolbar-secao">
            <span className="toolbar-label">Ferramenta</span>
            <button
              className={`tool-btn ${ferramenta === 'pincel' ? 'ativo' : ''}`}
              onClick={() => setFerramenta('pincel')}
              title="Pincel"
            >🖌️</button>
            <button
              className={`tool-btn ${ferramenta === 'borracha' ? 'ativo' : ''}`}
              onClick={() => setFerramenta('borracha')}
              title="Borracha"
            >🧹</button>
          </div>

          <div className="toolbar-secao">
            <span className="toolbar-label">Tamanho</span>
            <input
              type="range"
              min="2"
              max="40"
              value={tamanho}
              onChange={e => setTamanho(Number(e.target.value))}
              className="pintura-range"
            />
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

          {/* Preview do pincel */}
          <div className="pincel-preview">
            <div
              style={{
                width: Math.min(tamanho, 40),
                height: Math.min(tamanho, 40),
                background: ferramenta === 'borracha' ? '#ddd' : corAtual,
                borderRadius: '50%',
                border: '2px solid #C8DFF0',
              }}
            />
          </div>
        </aside>

        {/* CANVAS */}
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