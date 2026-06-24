import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../CSS/LigarAluno.css';

function embaralhar(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function LigarAluno() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const atividade  = state?.atividade;
  const nomeAluno  = state?.nomeAluno;
  const sala       = state?.sala;

  const [paresA, setParesA]         = useState([]);
  const [paresB, setParesB]         = useState([]);
  const [conexoes, setConexoes]     = useState([]);
  const [selecionadoA, setSelecionadoA] = useState(null);
  const [enviando, setEnviando]     = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const [resultado, setResultado]   = useState(null);
  const [modalEnviar, setModalEnviar] = useState(false);
  const [posicoes, setPosicoes]     = useState({});

  const refsA = useRef({});
  const refsB = useRef({});
  const containerRef = useRef(null);

  useEffect(() => {
    if (!atividade) { navigate('/aluno'); return; }
    buscarAtividade();
  }, []);

  const buscarAtividade = async () => {
    try {
      const res  = await fetch(`http://localhost:3001/atividade/${atividade.id}`);
      const data = await res.json();
      const pares = data.conteudo?.pares || [];
      setParesA(embaralhar(pares.map((p, i) => ({ ...p.ladoA, parId: i }))));
      setParesB(embaralhar(pares.map((p, i) => ({ ...p.ladoB, parId: i }))));
    } catch {
      console.error('Erro ao buscar atividade');
    }
  };

  // Atualiza posições dos elementos para desenhar os fios
  const atualizarPosicoes = () => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const novas = {};

    Object.entries(refsA.current).forEach(([id, el]) => {
      if (el) {
        const r = el.getBoundingClientRect();
        novas[`A-${id}`] = {
          x: r.right - rect.left,
          y: r.top + r.height / 2 - rect.top,
        };
      }
    });

    Object.entries(refsB.current).forEach(([id, el]) => {
      if (el) {
        const r = el.getBoundingClientRect();
        novas[`B-${id}`] = {
          x: r.left - rect.left,
          y: r.top + r.height / 2 - rect.top,
        };
      }
    });

    setPosicoes(novas);
  };

  useEffect(() => {
    const timer = setTimeout(atualizarPosicoes, 100);
    window.addEventListener('resize', atualizarPosicoes);
    return () => { clearTimeout(timer); window.removeEventListener('resize', atualizarPosicoes); };
  }, [paresA, paresB, conexoes]);

  const clicarA = (item) => {
    if (finalizado) return;
    if (conexoes.find(c => c.parIdA === item.parId)) {
      // Remove conexão existente
      setConexoes(prev => prev.filter(c => c.parIdA !== item.parId));
      return;
    }
    setSelecionadoA(item);
  };

  const clicarB = (item) => {
    if (finalizado) return;
    if (!selecionadoA) return;

    // Remove conexão anterior do B se existir
    const novas = conexoes.filter(c => c.parIdB !== item.parId && c.parIdA !== selecionadoA.parId);

    novas.push({ parIdA: selecionadoA.parId, parIdB: item.parId });
    setConexoes(novas);
    setSelecionadoA(null);
    atualizarPosicoes();
  };

  const todosConectados = paresA.length > 0 && conexoes.length === paresA.length;

  const calcularResultado = () => {
    let acertos = 0;
    conexoes.forEach(c => {
      if (c.parIdA === c.parIdB) acertos++;
    });
    return { acertos, total: paresA.length, pontos: acertos * 10 };
  };

  const handleEnviar = async () => {
    setEnviando(true);
    const res = calcularResultado();
    setResultado(res);

    try {
      await fetch(`http://localhost:3001/atividade/${atividade.id}/resposta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_aluno: nomeAluno,
          sala_id: sala.id,
          resposta: { conexoes, acertos: res.acertos, total: res.total, pontos: res.pontos }
        })
      });
      setFinalizado(true);
      setModalEnviar(false);
    } catch {
      console.error('Erro ao enviar');
    } finally {
      setEnviando(false);
    }
  };

  const getCor = (parIdA) => {
    const cores = ['#E23F3F','#1368CE','#D89E00','#26890C','#8B44AC','#E07820','#E91E8C','#00BCD4','#795548','#F5812A'];
    return cores[parIdA % cores.length];
  };

  if (finalizado && resultado) return (
    <div className="ligar-container">
      <div className="ligar-finalizado">
        <span>🎉</span>
        <h1>Atividade finalizada!</h1>
        <p>Você acertou <strong>{resultado.acertos}</strong> de <strong>{resultado.total}</strong> pares!</p>
        <div className="ligar-pts-badge">⭐ {resultado.pontos} pts</div>
        <button className="ligar-btn-voltar" onClick={() => navigate('/aluno/home', { state: { sala, nomeAluno } })}>
          Voltar para a sala
        </button>
      </div>
    </div>
  );

  return (
    <div className="ligar-container">

      {modalEnviar && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Enviar atividade?</h3>
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

      <header className="ligar-header">
        <div className="ligar-brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>
        <h2>{atividade?.titulo || 'Ligar Correspondentes'}</h2>
        <button
          className={`ligar-btn-enviar ${todosConectados ? 'ativo' : ''}`}
          onClick={() => todosConectados && setModalEnviar(true)}
          disabled={!todosConectados}
        >
          ✅ Enviar
        </button>
      </header>

      {selecionadoA && (
        <div className="ligar-instrucao">
          Agora clique em um item da <strong>Coluna B</strong> para conectar!
        </div>
      )}

      <div className="ligar-workspace" ref={containerRef}>

        {/* SVG dos fios */}
        <svg className="ligar-svg">
          {conexoes.map((c, i) => {
            const posA = posicoes[`A-${c.parIdA}`];
            const posB = posicoes[`B-${c.parIdB}`];
            if (!posA || !posB) return null;
            const cor = getCor(c.parIdA);
            const cx  = (posA.x + posB.x) / 2;
            return (
              <path
                key={i}
                d={`M ${posA.x} ${posA.y} C ${cx} ${posA.y}, ${cx} ${posB.y}, ${posB.x} ${posB.y}`}
                stroke={cor}
                strokeWidth="3"
                fill="none"
                strokeDasharray="0"
                style={{filter: `drop-shadow(0 2px 4px ${cor}66)`}}
              />
            );
          })}
        </svg>

        {/* COLUNA A */}
        <div className="ligar-coluna">
          <h3 className="ligar-coluna-titulo">Coluna A</h3>
          {paresA.map((item) => {
            const conectado  = conexoes.find(c => c.parIdA === item.parId);
            const selecionado = selecionadoA?.parId === item.parId;
            const cor = conectado ? getCor(item.parId) : null;
            return (
              <div
                key={item.parId}
                ref={el => refsA.current[item.parId] = el}
                className={`ligar-item ${selecionado ? 'selecionado' : ''} ${conectado ? 'conectado' : ''}`}
                style={cor ? { borderColor: cor, boxShadow: `0 0 0 3px ${cor}33` } : {}}
                onClick={() => clicarA(item)}
              >
                {item.tipo === 'imagem'
                  ? <img src={item.conteudo} alt="item" className="ligar-item-img" />
                  : <span>{item.conteudo}</span>
                }
                {conectado && (
                  <div className="ligar-dot" style={{background: getCor(item.parId)}} />
                )}
              </div>
            );
          })}
        </div>

        {/* COLUNA B */}
        <div className="ligar-coluna">
          <h3 className="ligar-coluna-titulo">Coluna B</h3>
          {paresB.map((item) => {
            const conectado = conexoes.find(c => c.parIdB === item.parId);
            const cor = conectado ? getCor(conectado.parIdA) : null;
            return (
              <div
                key={item.parId}
                ref={el => refsB.current[item.parId] = el}
                className={`ligar-item lado-b ${conectado ? 'conectado' : ''} ${selecionadoA ? 'destacado' : ''}`}
                style={cor ? { borderColor: cor, boxShadow: `0 0 0 3px ${cor}33` } : {}}
                onClick={() => clicarB(item)}
              >
                {conectado && (
                  <div className="ligar-dot esquerda" style={{background: getCor(conectado.parIdA)}} />
                )}
                {item.tipo === 'imagem'
                  ? <img src={item.conteudo} alt="item" className="ligar-item-img" />
                  : <span>{item.conteudo}</span>
                }
              </div>
            );
          })}
        </div>
      </div>

      <div className="ligar-footer">
        <span>{conexoes.length} de {paresA.length} pares conectados</span>
      </div>
    </div>
  );
}

export default LigarAluno;