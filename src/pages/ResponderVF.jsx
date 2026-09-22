import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import BotaoLeitura from '../acessibilidade/BotaoLeitura';
import '../CSS/ResponderVF.css'; 
import { API, cabecalhoAluno } from '../api';

function ResponderVF() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const sala = location.state?.sala;
  const nomeAluno = location.state?.nomeAluno;

  const [atividade, setAtividade] = useState(null);
  const [perguntaAtual, setPerguntaAtual] = useState(0);
  
  const [respostas, setRespostas] = useState({}); 
  
  const [showConfirmacao, setShowConfirmacao] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  // Novo estado para guardar os pontos ganhos
  const [pontos, setPontos] = useState(0);

  useEffect(() => {
    buscarAtividade();
  }, []);

  const buscarAtividade = async () => {
    try {
      const res = await fetch(`${API}/atividade/${id}`, { headers: cabecalhoAluno() });
      if (res.status === 401) { navigate('/aluno/area'); return; }
      if (res.ok) {
        const data = await res.json();
        setAtividade(data);
      } else {
        alert('Erro ao carregar a atividade.');
        navigate('/aluno/home', { state: { sala, nomeAluno } });
      }
    } catch {
      alert('Erro de conexão com o servidor.');
    }
  };

  const handleResponder = (respostaEscolhida) => {
    setRespostas(prev => ({ ...prev, [perguntaAtual]: respostaEscolhida }));

    setTimeout(() => {
      if (perguntaAtual + 1 < atividade.conteudo.length) {
        setPerguntaAtual(prev => prev + 1);
      } else {
        setShowConfirmacao(true);
      }
    }, 250);
  };

  const handleVoltar = () => {
    if (perguntaAtual > 0) {
      setPerguntaAtual(prev => prev - 1);
    }
  };

  const enviarRespostasParaServidor = async () => {
    setSalvando(true);
    
    // Vai só o que o aluno marcou (V ou F). O gabarito fica no servidor,
    // que corrige e devolve os pontos.
    try {
      const res = await fetch(`${API}/atividade/${id}/resposta`, {
        method: 'POST',
        headers: cabecalhoAluno({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ resposta: { respostas } })
      });
      const dados = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(dados.erro || 'Erro ao enviar as respostas.');
      } else {
        setPontos(dados.resultado?.pontos ?? 0);
        setFinalizado(true);
        setShowConfirmacao(false);
      }
    } catch {
      alert('Erro de comunicação com o servidor.');
    } finally {
      setSalvando(false);
    }
  };

  if (!atividade) {
    return (
      <div className="vf-loading">
        Carregando joguinho... 🎮
      </div>
    );
  }

  const perguntaExibida = atividade.conteudo[perguntaAtual];
  const respostaAtual = respostas[perguntaAtual]; 

  return (
    <div className="vf-container">
      
      {/* Cabeçalho do Jogo */}
      <header className="vf-header">
        <h1 className="vf-title">{atividade.titulo}</h1>
        <div className="vf-counter">
          {finalizado ? 'Finalizado! 🎉' : `Afirmação ${perguntaAtual + 1} de ${atividade.conteudo.length}`}
        </div>
      </header>

      {/* Área Central */}
      <main className="vf-main">
        
        {finalizado ? (
          // --- 1. TELA DE CONCLUSÃO (AGORA COM OS PONTOS!) ---
          <div className="vf-conclusion-card">
            <div className="vf-trophy">🏆</div>
            <h2 className="vf-conclusion-title">Você terminou!</h2>
            
            {/* Bloco de exibição de pontos */}
            <div style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '1.2rem', color: '#64748b', margin: '0 0 8px 0' }}>Você fez</p>
                <strong style={{ fontSize: '3rem', color: '#f59e0b', display: 'block', marginBottom: '8px' }}>{pontos}</strong>
                <p style={{ fontSize: '1.2rem', color: '#64748b', margin: 0 }}>de {atividade.conteudo.length * 10} pontos!</p>
            </div>

            <button 
              className="vf-btn-back"
              onClick={() => navigate('/aluno/home', { state: { sala, nomeAluno } })}
            >
              ← Voltar para as Atividades
            </button>
          </div>
        ) : showConfirmacao ? (
          // --- 2. TELA DE CONFIRMAÇÃO ---
          <div className="vf-conclusion-card">
            <h2 style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '16px' }}>Enviar atividade?</h2>
            <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '32px' }}>
              Após enviar você não poderá mais editar.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <button 
                onClick={enviarRespostasParaServidor}
                disabled={salvando}
                style={{ width: '100%', maxWidth: '300px', padding: '16px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold', cursor: salvando ? 'not-allowed' : 'pointer' }}
              >
                {salvando ? 'Enviando...' : '✓ Enviar'}
              </button>
              
              {!salvando && (
                <button 
                  onClick={() => setShowConfirmacao(false)}
                  style={{ width: '100%', maxWidth: '300px', padding: '16px', backgroundColor: 'transparent', color: '#3b82f6', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        ) : (
          // --- 3. TELA DA PERGUNTA ---
          <div className="vf-question-wrapper">
            
            {/* NOVO LAYOUT DA PERGUNTA + BOTAO (Em coluna) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              
              <h2 className="vf-question-text" style={{ margin: '0', textAlign: 'center' }}>
                {perguntaExibida.texto}
              </h2>
              
              <BotaoLeitura texto={perguntaExibida.texto} />
              
            </div>

            {perguntaExibida.imagem_url && (
              <img 
                src={perguntaExibida.imagem_url} 
                alt="Imagem de apoio" 
                className="vf-image"
              />
            )}

            <div className="vf-buttons-container">
              <button
                className={`vf-btn vf-btn-true ${respostaAtual === 'V' ? 'selecionado' : respostaAtual ? 'nao-selecionado' : ''}`}
                onClick={() => handleResponder('V')}
              >
                <div className="vf-btn-icon">✓</div>
                <span className="vf-btn-text">Verdadeiro</span>
              </button>

              <button
                className={`vf-btn vf-btn-false ${respostaAtual === 'F' ? 'selecionado' : respostaAtual ? 'nao-selecionado' : ''}`}
                onClick={() => handleResponder('F')}
              >
                <div className="vf-btn-icon">✕</div>
                <span className="vf-btn-text">Falso</span>
              </button>
            </div>

            {/* Botão de Voltar */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', marginTop: '16px' }}>
              {perguntaAtual > 0 && (
                <button 
                  onClick={handleVoltar}
                  style={{ padding: '12px 24px', backgroundColor: 'rgba(255,255,255,0.7)', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
                >
                  ← Voltar para a anterior
                </button>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default ResponderVF;