import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../CSS/LigarAluno.css';
import '../CSS/ResponderVF.css'; // <-- Importando o CSS para usarmos as telas bonitas de troféu e confirmação
import { API, cabecalhoAluno } from '../api';

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
      // As duas colunas chegam do servidor já misturadas e com códigos
      // diferentes de cada lado: o navegador não sabe quem combina com quem.
      const res  = await fetch(`${API}/atividade/${atividade.id}`, { headers: cabecalhoAluno() });
      if (res.status === 401) { navigate('/aluno/area'); return; }
      const data = await res.json();
      setParesA((data.conteudo?.itensA || []).map(item => ({ ...item, parId: item.id })));
      setParesB((data.conteudo?.itensB || []).map(item => ({ ...item, parId: item.id })));
    } catch {
      setParesA([]); setParesB([]);
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

  // Quem confere as ligações é o servidor, que devolve acertos e pontos
  const handleEnviar = async () => {
    setEnviando(true);

    try {
      const res = await fetch(`${API}/atividade/${atividade.id}/resposta`, {
        method: 'POST',
        headers: cabecalhoAluno({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          resposta: { conexoes: conexoes.map(c => ({ a: c.parIdA, b: c.parIdB })) }
        })
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) { alert(dados.erro || 'Não consegui enviar.'); return; }
      setResultado(dados.resultado);
      setFinalizado(true);
      setModalEnviar(false);
    } catch {
      alert('Não consegui falar com o servidor. Confira a internet.');
    } finally {
      setEnviando(false);
    }
  };

  const getCor = (parIdA) => {
    const cores = ['#E23F3F','#1368CE','#D89E00','#26890C','#8B44AC','#E07820','#E91E8C','#00BCD4','#795548','#F5812A'];
    const posicao = Math.max(0, paresA.findIndex(p => p.parId === parIdA));
    return cores[posicao % cores.length];
  };

  // ==========================================
  // 1. TELA DE CONCLUSÃO (Com Design do Troféu)
  // ==========================================
  if (finalizado && resultado) return (
    <div className="vf-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="vf-conclusion-card">
        <div className="vf-trophy">🏆</div>
        <h2 className="vf-conclusion-title">Você terminou!</h2>
        
        <div style={{ marginBottom: '32px' }}>
            <p style={{ fontSize: '1.2rem', color: '#64748b', margin: '0 0 8px 0' }}>Você fez</p>
            <strong style={{ fontSize: '3rem', color: '#f59e0b', display: 'block', marginBottom: '8px' }}>{resultado.pontos}</strong>
            <p style={{ fontSize: '1.2rem', color: '#64748b', margin: 0 }}>de {resultado.total * 10} pontos!</p>
        </div>

        <button 
          className="vf-btn-back"
          onClick={() => navigate('/aluno/home', { state: { sala, nomeAluno } })}
        >
          ← Voltar para as Atividades
        </button>
      </div>
    </div>
  );

  return (
    <div className="ligar-container">

      {/* ==========================================
          2. TELA DE CONFIRMAÇÃO (Sobreposta ao jogo)
          ========================================== */}
      {modalEnviar && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="vf-conclusion-card" style={{ animation: 'none' }}>
            <h2 style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '16px' }}>Enviar atividade?</h2>
            <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '32px' }}>
              Após enviar você não poderá mais editar.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <button 
                onClick={handleEnviar}
                disabled={enviando}
                style={{ width: '100%', maxWidth: '300px', padding: '16px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold', cursor: enviando ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s' }}
              >
                {enviando ? 'Enviando...' : '✓ Enviar'}
              </button>
              
              {!enviando && (
                <button 
                  onClick={() => setModalEnviar(false)}
                  style={{ width: '100%', maxWidth: '300px', padding: '16px', backgroundColor: 'transparent', color: '#3b82f6', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Restante do jogo intocado */}
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