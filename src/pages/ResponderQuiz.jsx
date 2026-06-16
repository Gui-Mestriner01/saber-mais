import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../CSS/ResponderQuiz.css';

function ResponderQuiz() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { atividade, nomeAluno, sala } = state || {};

  const [perguntas, setPerguntas]     = useState([]);
  const [idxAtual, setIdxAtual]       = useState(0);
  const [respostas, setRespostas]     = useState({});
  const [enviando, setEnviando]       = useState(false);
  const [finalizado, setFinalizado]   = useState(false);
  const [pontos, setPontos]           = useState(0);

  useEffect(() => {
    if (!atividade) { navigate('/aluno'); return; }
    buscarAtividade();
  }, []);

  const buscarAtividade = async () => {
    try {
      const res = await fetch(`http://localhost:3001/atividade/${atividade.id}`);
      const data = await res.json();
      setPerguntas(data.conteudo.perguntas || []);
    } catch {
      console.error('Erro ao buscar atividade');
    }
  };

  const perguntaAtual = perguntas[idxAtual];

  const selecionarResposta = (altIdx) => {
    if (finalizado) return;
    const p = perguntas[idxAtual];
    if (p.multiplaEscolha) {
      const atual = respostas[idxAtual] || [];
      if (atual.includes(altIdx)) {
        setRespostas({ ...respostas, [idxAtual]: atual.filter(i => i !== altIdx) });
      } else {
        setRespostas({ ...respostas, [idxAtual]: [...atual, altIdx] });
      }
    } else {
      setRespostas({ ...respostas, [idxAtual]: [altIdx] });
    }
  };

  const proxima = () => {
    if (idxAtual < perguntas.length - 1) setIdxAtual(idxAtual + 1);
  };

  const anterior = () => {
    if (idxAtual > 0) setIdxAtual(idxAtual - 1);
  };

  const calcularPontos = () => {
    let total = 0;
    perguntas.forEach((p, i) => {
      const corretas = p.alternativas
        .map((a, idx) => a.correta ? idx : null)
        .filter(v => v !== null);
      const selecionadas = respostas[i] || [];
      const acertou = corretas.length === selecionadas.length &&
        corretas.every(c => selecionadas.includes(c));
      if (acertou) total += 10;
    });
    return total;
  };

  const handleEnviar = async () => {
    setEnviando(true);
    const pts = calcularPontos();
    setPontos(pts);

    try {
      await fetch(`http://localhost:3001/atividade/${atividade.id}/resposta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_aluno: nomeAluno,
          sala_id: sala.id,
          resposta: { respostas, pontos: pts, total: perguntas.length * 10 }
        })
      });
      setFinalizado(true);
    } catch {
      console.error('Erro ao enviar resposta');
    } finally {
      setEnviando(false);
    }
  };

  const CORES = ['#E23F3F','#1368CE','#D89E00','#26890C','#8B44AC','#E07820'];
  const ICONS = ['▲','◆','●','■','★','⬟'];

  if (!perguntaAtual && !finalizado) return <div className="rq-loading">Carregando...</div>;

  if (finalizado) return (
    <div className="rq-container">
      <div className="rq-finalizado">
        <span>🎉</span>
        <h1>Quiz finalizado!</h1>
        <p>Você fez <strong>{pontos}</strong> de <strong>{perguntas.length * 10}</strong> pontos!</p>
        <div className="rq-pts-badge">⭐ {pontos} pts</div>
        <button className="rq-btn-voltar" onClick={() => navigate('/aluno/home', { state: { sala, nomeAluno } })}>
          Voltar para a sala
        </button>
      </div>
    </div>
  );

  return (
    <div className="rq-container">
      <header className="rq-header">
        <div className="rq-brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>
        <h2>{atividade.titulo}</h2>
        <span className="rq-progresso">{idxAtual + 1} / {perguntas.length}</span>
      </header>

      <main className="rq-main">
        <div className="rq-pergunta-card">
          <p className="rq-num">Pergunta {idxAtual + 1}</p>
          <h2 className="rq-pergunta-texto">{perguntaAtual.texto}</h2>
          {perguntaAtual.imagem && (
            <img src={perguntaAtual.imagem} alt="imagem" className="rq-imagem" />
          )}
          {perguntaAtual.multiplaEscolha && (
            <p className="rq-multipla-info">✏️ Selecione todas as corretas</p>
          )}
        </div>

        <div className="rq-alternativas">
          {perguntaAtual.alternativas.map((alt, altIdx) => {
            const selecionadas = respostas[idxAtual] || [];
            const selecionada = selecionadas.includes(altIdx);
            return (
              <button
                key={altIdx}
                className={`rq-alternativa ${selecionada ? 'selecionada' : ''}`}
                style={{'--cor': CORES[altIdx]}}
                onClick={() => selecionarResposta(altIdx)}
              >
                <div className="rq-alt-icone" style={{background: CORES[altIdx]}}>
                  {ICONS[altIdx]}
                </div>
                <span>{alt.texto}</span>
                {selecionada && <span className="rq-check">✓</span>}
              </button>
            );
          })}
        </div>

        <div className="rq-navegacao">
          <button className="rq-btn-nav" onClick={anterior} disabled={idxAtual === 0}>
            ← Anterior
          </button>

          {idxAtual < perguntas.length - 1 ? (
            <button className="rq-btn-nav próxima" onClick={proxima}>
              Próxima →
            </button>
          ) : (
            <button className="rq-btn-enviar" onClick={handleEnviar} disabled={enviando}>
              {enviando ? 'Enviando...' : '✅ Enviar Quiz'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default ResponderQuiz;