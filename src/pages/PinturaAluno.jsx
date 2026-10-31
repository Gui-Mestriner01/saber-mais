import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Brush, Eraser, Trash2, Check, ArrowLeft } from 'lucide-react';
import '../CSS/Pintura.css';
import { FundoTema, classeTema } from '../components/TemaFundo';
import { API, cabecalhoAluno } from '../api';

/* ==========================================================================
   ALUNO — PINTAR O DESENHO (refeito em 31/10/2026)

   DUAS CAMADAS. Antes o desenho do professor era pintado DENTRO do mesmo
   canvas em que a criança pintava, e a borracha passava branco por cima.
   Resultado: apagar o próprio risco apagava junto o desenho de baixo, e ele
   não voltava mais.

   Agora o desenho do professor é uma imagem comum (<img>) e os riscos da
   criança ficam num canvas transparente em cima dela. A borracha usa
   'destination-out', que tira só a tinta da criança e deixa o desenho
   aparecer de novo — como uma borracha de verdade.

   Na hora de enviar, as duas camadas são juntadas numa imagem só, para o
   professor ver (e baixar) exatamente o que a criança viu na tela.

   O tamanho de verdade do canvas acompanha o tamanho da imagem, então o
   risco cai no lugar certo e sai nítido.
   ========================================================================== */

const CORES = [
  '#E23F3F', '#E07820', '#D89E00', '#3DAA5C',
  '#1A6FC4', '#8B44AC', '#E91E8C', '#00BCD4',
  '#795548', '#000000', '#FFFFFF', '#9E9E9E',
];

const LARGURA_PADRAO = 1200;
const ALTURA_PADRAO = 800;
const MAIOR_LADO = 1600;   // nem a imagem mais grandona vira um canvas gigante

function PinturaAluno() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const canvasRef = useRef(null);
  const palcoRef = useRef(null);
  const baseRef = useRef(null);          // <img> com o desenho do professor
  const inicio = useRef(0);              // tempo gasto, para o relatório
  const desenhando = useRef(false);
  const ultimo = useRef(null);

  const atividade = state?.atividade;
  const nomeAluno = state?.nomeAluno;
  const sala = state?.sala;

  const [urlImagem, setUrlImagem] = useState(null);
  const [instrucao, setInstrucao] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erroImagem, setErroImagem] = useState('');
  const [medidas, setMedidas] = useState({ largura: LARGURA_PADRAO, altura: ALTURA_PADRAO });
  const [caixa, setCaixa] = useState({ largura: 0, altura: 0 });

  const [cor, setCor] = useState('#E23F3F');
  const [tamanho, setTamanho] = useState(12);
  const [ferramenta, setFerramenta] = useState('pincel');
  const [temRisco, setTemRisco] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [sair, setSair] = useState(false);

  /* ---------- buscar o desenho do professor ---------- */
  useEffect(() => {
    if (!atividade) { navigate('/aluno/area'); return; }
    inicio.current = Date.now();
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`${API}/atividade/${atividade.id}`, { headers: cabecalhoAluno() });
        if (res.status === 401) { navigate('/aluno/area'); return; }
        const dados = await res.json().catch(() => ({}));
        if (!vivo) return;
        if (!res.ok) throw new Error(dados.erro || 'Não consegui abrir a atividade.');
        setUrlImagem(dados.conteudo?.url_imagem || null);
        setInstrucao(dados.conteudo?.instrucao || '');
        if (!dados.conteudo?.url_imagem) setCarregando(false);  // folha em branco
      } catch (e) {
        if (vivo) { setErroImagem(e.message); setCarregando(false); }
      }
    })();
    return () => { vivo = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* O canvas dos riscos nasce do tamanho da imagem: assim o risco fica no
     lugar certo e com a mesma nitidez do desenho. */
  const aoCarregarImagem = (e) => {
    const img = e.target;
    const l = img.naturalWidth || LARGURA_PADRAO;
    const a = img.naturalHeight || ALTURA_PADRAO;
    const escala = Math.min(1, MAIOR_LADO / Math.max(l, a));
    setMedidas({ largura: Math.round(l * escala), altura: Math.round(a * escala) });
    setCarregando(false);
    setErroImagem('');
  };

  const aoFalharImagem = () => {
    setCarregando(false);
    setErroImagem('Não consegui carregar o desenho. Você ainda pode pintar numa folha em branco.');
  };

  /* O quadro precisa de tamanho em pixels de verdade. Só com aspect-ratio e
     largura/altura automáticas o navegador resolvia tudo para zero (o quadro
     sumia). Aqui medimos o espaço livre e calculamos a maior caixa que cabe
     sem deformar o desenho — e refazemos a conta quando a tela vira ou o
     teclado do celular abre. */
  useEffect(() => {
    const palco = palcoRef.current;
    if (!palco) return;
    const ajustar = () => {
      const r = palco.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const razao = medidas.largura / medidas.altura;
      let l = r.width;
      let a = l / razao;
      if (a > r.height) { a = r.height; l = a * razao; }
      const nova = { largura: Math.floor(l), altura: Math.floor(a) };
      // só mexe no estado se mudou mesmo: evita ficar remedindo em círculo
      setCaixa(atual => (atual.largura === nova.largura && atual.altura === nova.altura ? atual : nova));
    };
    ajustar();
    const observador = new ResizeObserver(ajustar);
    observador.observe(palco);
    window.addEventListener('orientationchange', ajustar);
    return () => { observador.disconnect(); window.removeEventListener('orientationchange', ajustar); };
  }, [medidas]);

  /* ---------- desenhar ---------- */
  const pincelNoContexto = useCallback((ctx) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (ferramenta === 'borracha') {
      // tira a tinta em vez de pintar de branco: o desenho de baixo reaparece
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = tamanho * 2;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = cor;
      ctx.fillStyle = cor;
      ctx.lineWidth = tamanho;
    }
  }, [ferramenta, cor, tamanho]);

  const ponto = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width / r.width),
      y: (e.clientY - r.top) * (c.height / r.height),
    };
  };

  const comecar = (e) => {
    if (enviado) return;
    e.preventDefault();
    const c = canvasRef.current;
    c.setPointerCapture?.(e.pointerId);
    desenhando.current = true;
    const p = ponto(e);
    ultimo.current = p;

    // um toque curto também pinta: vira uma bolinha
    const ctx = c.getContext('2d');
    pincelNoContexto(ctx);
    ctx.beginPath();
    ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    setTemRisco(true);
  };

  const mover = (e) => {
    if (!desenhando.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = ponto(e);
    pincelNoContexto(ctx);
    ctx.beginPath();
    ctx.moveTo(ultimo.current.x, ultimo.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ultimo.current = p;
  };

  const parar = (e) => {
    if (!desenhando.current) return;
    desenhando.current = false;
    ultimo.current = null;
    canvasRef.current?.releasePointerCapture?.(e.pointerId);
  };

  /* Limpar tira só a tinta da criança — o desenho do professor fica. */
  const limpar = () => {
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    setTemRisco(false);
  };

  /* ---------- juntar as camadas e enviar ---------- */
  const montarImagem = () => new Promise((resolve, reject) => {
    const c = canvasRef.current;
    const folha = document.createElement('canvas');
    folha.width = c.width;
    folha.height = c.height;
    const ctx = folha.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, folha.width, folha.height);
    const base = baseRef.current;
    if (base && base.complete && base.naturalWidth > 0) {
      try { ctx.drawImage(base, 0, 0, folha.width, folha.height); } catch { /* segue sem o fundo */ }
    }
    ctx.drawImage(c, 0, 0);
    folha.toBlob(b => (b ? resolve(b) : reject(new Error('Não consegui montar a imagem.'))), 'image/png');
  });

  const enviar = async () => {
    setEnviando(true);
    try {
      const blob = await montarImagem();
      const pacote = new FormData();
      pacote.append('pintura', blob, `pintura_${nomeAluno}_${Date.now()}.png`);
      pacote.append('nome_aluno', nomeAluno);
      pacote.append('sala_id', sala.id);
      pacote.append('duracao_s', String(Math.max(1, Math.round((Date.now() - (inicio.current || Date.now())) / 1000))));

      const res = await fetch(`${API}/atividade/${atividade.id}/resposta/pintura`, {
        method: 'POST',
        headers: cabecalhoAluno(),
        body: pacote,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.erro || 'Não consegui enviar.');
      }
      setEnviado(true);
      setConfirmar(false);
      setTimeout(() => navigate('/aluno/home', { state: { sala, nomeAluno } }), 1600);
    } catch (e) {
      setConfirmar(false);
      setErroImagem(`Não consegui enviar: ${e.message}`);
    } finally {
      setEnviando(false);
    }
  };

  const voltar = () => (temRisco && !enviado ? setSair(true) : navigate('/aluno/home', { state: { sala, nomeAluno } }));

  return (
    <div className={`pint-tela ${classeTema(atividade?.tema)}`}>
      <FundoTema tema={atividade?.tema} />

      <header className="pint-topo">
        <button className="pint-voltar" onClick={voltar} aria-label="Voltar para as atividades">
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>
        <h1 className="pint-titulo">{atividade?.titulo || 'Pinte o desenho'}</h1>
        <div className="pint-topo-acoes">
          <button className="pint-btn apagar" onClick={limpar} disabled={!temRisco}>
            <Trash2 size={17} strokeWidth={2.2} /> <span>Limpar</span>
          </button>
          <button className="pint-btn enviar" onClick={() => setConfirmar(true)} disabled={enviando || enviado}>
            <Check size={18} strokeWidth={2.6} /> <span>Enviar</span>
          </button>
        </div>
      </header>

      {instrucao && <p className="pint-instrucao">{instrucao}</p>}
      {erroImagem && <p className="pint-aviso" role="alert">{erroImagem}</p>}

      <main className="pint-palco" ref={palcoRef}>
        <div
          className="pint-quadro"
          style={caixa.largura ? { width: caixa.largura, height: caixa.altura } : { visibility: 'hidden' }}
        >
          {carregando && <p className="pint-carregando">Abrindo o desenho…</p>}
          {urlImagem && (
            <img
              ref={baseRef}
              className="pint-base"
              src={urlImagem}
              alt=""
              crossOrigin="anonymous"
              onLoad={aoCarregarImagem}
              onError={aoFalharImagem}
            />
          )}
          <canvas
            ref={canvasRef}
            width={medidas.largura}
            height={medidas.altura}
            className={`pint-traco ${ferramenta}`}
            onPointerDown={comecar}
            onPointerMove={mover}
            onPointerUp={parar}
            onPointerCancel={parar}
            onPointerLeave={parar}
          />
        </div>
      </main>

      <footer className="pint-ferramentas">
        <div className="pint-grupo pint-grupo-tipo">
          <button
            className={`pint-tool ${ferramenta === 'pincel' ? 'ativo' : ''}`}
            onClick={() => setFerramenta('pincel')}
            aria-pressed={ferramenta === 'pincel'}
          >
            <Brush size={20} strokeWidth={2} /> <span>Pincel</span>
          </button>
          <button
            className={`pint-tool ${ferramenta === 'borracha' ? 'ativo' : ''}`}
            onClick={() => setFerramenta('borracha')}
            aria-pressed={ferramenta === 'borracha'}
          >
            <Eraser size={20} strokeWidth={2} /> <span>Borracha</span>
          </button>
        </div>

        <div className="pint-grupo pint-grupo-tamanho">
          <span className="pint-rotulo">Espessura</span>
          <div className="pint-tamanho-linha">
            <input
              type="range"
              min="2"
              max="40"
              value={tamanho}
              onChange={e => setTamanho(Number(e.target.value))}
              className="pint-range"
              aria-label="Espessura do traço"
            />
            <span className="pint-bolinha" aria-hidden="true">
              <i style={{
                width: Math.max(4, Math.min(tamanho, 34)),
                height: Math.max(4, Math.min(tamanho, 34)),
                background: ferramenta === 'borracha' ? 'transparent' : cor,
                border: ferramenta === 'borracha' ? '2px dashed #7AAAC8' : '1px solid rgba(0,0,0,.15)',
              }} />
            </span>
          </div>
        </div>

        <div className="pint-grupo pint-grupo-cores">
          <span className="pint-rotulo">Cores</span>
          <div className="pint-cores">
            {CORES.map(c => (
              <button
                key={c}
                className={`pint-cor ${cor === c && ferramenta === 'pincel' ? 'ativa' : ''}`}
                style={{ '--cor': c }}
                onClick={() => { setCor(c); setFerramenta('pincel'); }}
                aria-label={`Cor ${c}`}
                aria-pressed={cor === c && ferramenta === 'pincel'}
              />
            ))}
            <label className="pint-cor-livre" title="Escolher outra cor">
              <input
                type="color"
                value={cor}
                onChange={e => { setCor(e.target.value); setFerramenta('pincel'); }}
                aria-label="Escolher outra cor"
              />
            </label>
          </div>
        </div>
      </footer>

      {confirmar && (
        <div className="pint-janela" role="dialog" aria-label="Enviar pintura">
          <div className="pint-janela-cartao">
            <h3>Enviar sua pintura?</h3>
            <p>Depois de enviar não dá para mexer mais.</p>
            <div className="pint-janela-btns">
              <button className="pint-btn enviar" onClick={enviar} disabled={enviando}>
                {enviando ? 'Enviando…' : 'Sim, enviar'}
              </button>
              <button className="pint-btn simples" onClick={() => setConfirmar(false)} disabled={enviando}>
                Voltar a pintar
              </button>
            </div>
          </div>
        </div>
      )}

      {sair && (
        <div className="pint-janela" role="dialog" aria-label="Sair da pintura">
          <div className="pint-janela-cartao">
            <h3>Sair sem enviar?</h3>
            <p>Sua pintura vai se perder.</p>
            <div className="pint-janela-btns">
              <button className="pint-btn simples" onClick={() => setSair(false)}>Continuar pintando</button>
              <button className="pint-btn apagar" onClick={() => navigate('/aluno/home', { state: { sala, nomeAluno } })}>
                Sair mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}

      {enviado && <div className="pint-pronto">Pintura enviada! Muito bem 🎉</div>}
    </div>
  );
}

export default PinturaAluno;
