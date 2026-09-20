import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BotaoLeitura from '../acessibilidade/BotaoLeitura';
import '../CSS/ResponderQuiz.css';
import '../CSS/ResponderVF.css'; 

function ResponderQuiz() {
  const { state } = useLocation();
  const navigate = useNavigate();
  
  // 🛠️ Recebe os dados da Sala Temporária
  const { atividade, nomeAluno, sala, aluno, modoLive } = state || {};

  // 🛠️ LÓGICA DE PASSAPORTE: Aceita tanto alunos fixos quanto os da Live!
  const nomeFinal = nomeAluno || (aluno ? aluno.nome : 'Anônimo');
  const salaIdFinal = sala?.id || null;

  const [perguntas, setPerguntas]     = useState([]);
  const [idxAtual, setIdxAtual]       = useState(0);
  const [respostas, setRespostas]     = useState({});
  const [enviando, setEnviando]       = useState(false);
  const [finalizado, setFinalizado]   = useState(false);
  const [pontos, setPontos]           = useState(0);
  
  const [showConfirmacao, setShowConfirmacao] = useState(false); 

  useEffect(() => {
    // Se não tiver bagagem nenhuma, expulsa
    if (!atividade && !aluno && !nomeAluno) { 
      navigate('/aluno'); 
      return; 
    }

    // 🚀 A MÁGICA AQUI: Se a atividade já veio completa do Lobby, não precisa de Fetch!
    if (atividade && atividade.conteudo) {
      // Tenta ler como .perguntas (Quiz) ou direto o array (V/F)
      const listaPerguntas = atividade.conteudo.perguntas || atividade.conteudo;
      
      if (Array.isArray(listaPerguntas) && listaPerguntas.length > 0) {
        setPerguntas(listaPerguntas);
      } else {
        buscarAtividade(); // Fallback de emergência
      }
    } else if (atividade) {
      buscarAtividade();
    }
  }, []);

  const buscarAtividade = async () => {
    try {
      const res = await fetch(`http://localhost:3001/atividade/${atividade.id}`);
      const data = await res.json();
      const lista = data.conteudo?.perguntas || data.conteudo || [];
      setPerguntas(Array.isArray(lista) ? lista : []);
    } catch {
      console.error('Erro ao buscar atividade');
    }
  };

  const perguntaAtual = perguntas[idxAtual];

  // ==========================================
  // TEXTO INTELIGENTE PARA O LEITOR DE VOZ
  // ==========================================
  let textoParaLeitura = '';
  if (perguntaAtual && perguntaAtual.alternativas) {
    textoParaLeitura = `${perguntaAtual.texto}. As opções de resposta são: `;
    perguntaAtual.alternativas.forEach((alt, index) => {
      textoParaLeitura += `Opção ${index + 1}: ${alt.texto}. `;
    });
  }
  // ==========================================

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
      if (!p.alternativas) return;
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
          nome_aluno: nomeFinal, 
          sala_id: salaIdFinal,  
          resposta: { respostas, pontos: pts, total: perguntas.length * 10 }
        })
      });
      setFinalizado(true);
      setShowConfirmacao(false); 
    } catch {
      console.error('Erro ao enviar resposta');
    } finally {
      setEnviando(false);
    }
  };

  const CORES = ['#E23F3F','#1368CE','#D89E00','#26890C','#8B44AC','#E07820'];
  const ICONS = ['▲','◆','●','■','★','⬟'];

  if (!perguntaAtual && !finalizado) return (
    <div className="rq-container" style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <h2>⏳ Carregando a atividade... (Prepare-se!)</h2>
    </div>
  );

  if (finalizado) return (
    <div className="vf-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="vf-conclusion-card">
        <div className="vf-trophy">🏆</div>
        <h2 className="vf-conclusion-title">Você terminou!</h2>
        
        <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '1.2rem', color: '#64748b', margin: 0 }}>Você fez</p>
            <strong style={{ fontSize: '2.5rem', color: '#f59e0b' }}>{pontos}</strong>
            <p style={{ fontSize: '1.2rem', color: '#64748b', margin: 0 }}>de {perguntas.length * 10} pontos!</p>
        </div>

        <button 
          className="vf-btn-back"
          onClick={() => {
            if (modoLive || aluno) {
              navigate('/aluno/lobby');
            } else {
              navigate('/aluno/home', { state: { sala, nomeAluno } });
            }
          }}
        >
          {aluno ? '← Voltar para a Sala de Espera' : '← Voltar para as Atividades'}
        </button>
      </div>
    </div>
  );

  if (showConfirmacao) return (
    <div className="vf-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="vf-conclusion-card">
        <h2 style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '16px' }}>Enviar atividade?</h2>
        <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '32px' }}>
          Após enviar você não poderá mais editar.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <button 
            onClick={handleEnviar}
            disabled={enviando}
            style={{ width: '100%', maxWidth: '300px', padding: '16px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold', cursor: enviando ? 'not-allowed' : 'pointer' }}
          >
            {enviando ? 'Enviando...' : '✓ Enviar'}
          </button>
          
          {!enviando && (
            <button 
              onClick={() => setShowConfirmacao(false)}
              style={{ width: '100%', maxWidth: '300px', padding: '16px', backgroundColor: 'transparent', color: '#3b82f6', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          )}
        </div>
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
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <h2 className="rq-pergunta-texto" style={{ margin: '0', textAlign: 'center' }}>
              {perguntaAtual.texto}
            </h2>
            <BotaoLeitura texto={textoParaLeitura} />
          </div>

          {perguntaAtual.imagem && (
            <img src={perguntaAtual.imagem} alt="imagem" className="rq-imagem" />
          )}
          {perguntaAtual.multiplaEscolha && (
            <p className="rq-multipla-info">✏️ Selecione todas as corretas</p>
          )}
        </div>

        <div className="rq-alternativas">
          {perguntaAtual.alternativas && perguntaAtual.alternativas.map((alt, altIdx) => {
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
            <button 
               className="rq-btn-enviar" 
               onClick={() => setShowConfirmacao(true)} 
               disabled={enviando}
            >
              ✅ Enviar Quiz
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default ResponderQuiz;