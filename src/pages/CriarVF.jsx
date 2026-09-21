import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../CSS/CriarVF.css'; 
import { API } from '../api';

function CriarVF() {
  const navigate = useNavigate();
  const location = useLocation();
  const salaId = location.state?.salaId;

  const [titulo, setTitulo] = useState('');
  const [loading, setLoading] = useState(false);
  
  // --- NOVOS ESTADOS PARA O TEMPO/PRAZO ---
  const [temTempo, setTemTempo] = useState(false);
  const [tempoValor, setTempoValor] = useState(5);
  const [tempoUnidade, setTempoUnidade] = useState('minutos'); // Pode ser: minutos, horas, dias
  
  const [perguntas, setPerguntas] = useState([
    { id: Date.now(), texto: '', imagem: null, respostaCorreta: null }
  ]);
  const [perguntaAtiva, setPerguntaAtiva] = useState(0);

  if (!salaId) {
    navigate('/professor/criar-atividade');
    return null;
  }

  const adicionarPergunta = () => {
    setPerguntas([...perguntas, { id: Date.now(), texto: '', imagem: null, respostaCorreta: null }]);
    setPerguntaAtiva(perguntas.length);
  };

  const removerPergunta = (indexParaRemover, evento) => {
    evento.stopPropagation(); 

    if (perguntas.length === 1) {
      alert('A atividade precisa ter pelo menos uma afirmação.');
      return;
    }

    const novasPerguntas = perguntas.filter((_, index) => index !== indexParaRemover);
    setPerguntas(novasPerguntas);

    if (perguntaAtiva === indexParaRemover) {
      setPerguntaAtiva(Math.max(0, indexParaRemover - 1));
    } else if (perguntaAtiva > indexParaRemover) {
      setPerguntaAtiva(perguntaAtiva - 1);
    }
  };

  const atualizarPergunta = (campo, valor) => {
    const novasPerguntas = [...perguntas];
    novasPerguntas[perguntaAtiva][campo] = valor;
    setPerguntas(novasPerguntas);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      atualizarPergunta('imagem', e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const perguntaIncompleta = perguntas.find(p => !p.texto || !p.respostaCorreta);
    if (perguntaIncompleta) {
      alert('Por favor, preencha o texto e selecione Verdadeiro ou Falso em TODAS as afirmações antes de salvar.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('salaId', salaId);
    formData.append('tipo', 'v_f');
    formData.append('titulo', titulo || 'Verdadeiro ou Falso');
    
    // --- LÓGICA DE CONVERSÃO DO TEMPO ---
    // Converte horas ou dias para minutos, para o banco salvar sempre um número padrão
    let minutosCalculados = 0;
    if (temTempo) {
      const valor = parseInt(tempoValor) || 0;
      if (tempoUnidade === 'minutos') minutosCalculados = valor;
      if (tempoUnidade === 'horas')   minutosCalculados = valor * 60;
      if (tempoUnidade === 'dias')    minutosCalculados = valor * 24 * 60;
    }
    
    formData.append('tempo_limite', minutosCalculados);
    
    const perguntasParaSalvar = perguntas.map(p => ({ texto: p.texto, resposta_correta: p.respostaCorreta }));
    formData.append('perguntas', JSON.stringify(perguntasParaSalvar));
    
    perguntas.forEach((p, index) => {
      if (p.imagem) {
        formData.append(`imagem_${index}`, p.imagem);
      }
    });

    try {
      const res = await fetch(`${API}/professor/atividades/v_f`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (res.ok) {
        alert('Atividade criada com sucesso!');
        navigate('/professor/dashboard');
      } else {
        alert('Erro ao criar a atividade no servidor.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const perguntaAtual = perguntas[perguntaAtiva];

  return (
    <div className="criar-vf-container">
      
      <aside className="criar-vf-sidebar-left">
        <div className="criar-vf-brand">
          <span className="brand-saber">Saber</span>
          <span className="brand-plus">+</span>
        </div>

        <input 
          type="text" 
          placeholder="Título da Atividade..." 
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="criar-vf-input"
        />

        <div className="criar-vf-question-list">
          {perguntas.map((p, index) => (
            <div 
              key={p.id}
              onClick={() => setPerguntaAtiva(index)}
              className={`criar-vf-question-item ${perguntaAtiva === index ? 'active' : ''}`}
            >
              <div className="criar-vf-question-number">
                {index + 1}
              </div>
              
              <div className="criar-vf-question-text">
                {p.texto || 'Nova afirmação...'}
              </div>

              {perguntas.length > 1 && (
                <button
                  onClick={(e) => removerPergunta(index, e)}
                  title="Apagar afirmação"
                  className="criar-vf-btn-delete"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>

        <button 
          onClick={adicionarPergunta}
          className="criar-vf-btn-add"
        >
          + Adicionar Afirmação
        </button>

        <button 
          onClick={() => navigate('/professor/criar-atividade')}
          className="criar-vf-btn-exit"
        >
          ← Sair
        </button>
      </aside>

      <main className="criar-vf-main">
        
        <div className="criar-vf-main-input-wrapper">
          <input 
            type="text"
            placeholder="Comece a digitar a afirmação..."
            value={perguntaAtual.texto}
            onChange={(e) => atualizarPergunta('texto', e.target.value)}
            className="criar-vf-main-input"
          />
        </div>

        <label className="criar-vf-upload-box">
          <span className="criar-vf-upload-icon">🖼️</span>
          <span className="criar-vf-upload-text">
            {perguntaAtual.imagem ? perguntaAtual.imagem.name : 'Clique para adicionar uma imagem'}
          </span>
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>

        <div className="criar-vf-choices-wrapper">
          <button
            onClick={() => atualizarPergunta('respostaCorreta', 'V')}
            className={`criar-vf-choice-btn ${perguntaAtual.respostaCorreta === 'V' ? 'active-true' : ''}`}
          >
            <div className="criar-vf-choice-icon true">✓</div>
            <span className="criar-vf-choice-text">Verdadeiro</span>
            <div className="criar-vf-choice-radio"></div>
          </button>

          <button
            onClick={() => atualizarPergunta('respostaCorreta', 'F')}
            className={`criar-vf-choice-btn ${perguntaAtual.respostaCorreta === 'F' ? 'active-false' : ''}`}
          >
            <div className="criar-vf-choice-icon false">✕</div>
            <span className="criar-vf-choice-text">Falso</span>
            <div className="criar-vf-choice-radio"></div>
          </button>
        </div>
      </main>

      <aside className="criar-vf-sidebar-right">
        <h2 className="criar-vf-prop-header">Propriedades</h2>
        
        <div className="criar-vf-prop-group">
          <div className="criar-vf-prop-label">Afirmação Atual</div>
          <div className="criar-vf-prop-value-highlight">
            {perguntaAtiva + 1} <span className="criar-vf-prop-value-muted">de {perguntas.length}</span>
          </div>
        </div>

        <div className="criar-vf-prop-group">
          <div className="criar-vf-prop-label">Configuração</div>
          <div className="criar-vf-prop-value-dark">2 Opções (V/F)</div>
        </div>

        {/* ==============================================
            BLOCO DE PRAZO / TEMPO LIMITE ATUALIZADO
            ============================================== */}
        <div className="criar-vf-prop-group" style={{ marginTop: '32px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div className="criar-vf-prop-label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1rem' }}>⏳</span> PRAZO / TEMPO LIMITE
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <input 
              type="checkbox" 
              id="tem-tempo" 
              checked={temTempo} 
              onChange={(e) => setTemTempo(e.target.checked)} 
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }}
            />
            <label htmlFor="tem-tempo" style={{ color: '#334155', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}>
              Definir um prazo
            </label>
          </div>
          
          {temTempo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', animation: 'fadeIn 0.2s' }}>
              <input 
                type="number" 
                min="1"
                value={tempoValor}
                onChange={(e) => setTempoValor(e.target.value)}
                style={{ width: '70px', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', textAlign: 'center', fontSize: '1rem', color: '#334155', fontWeight: 'bold' }}
              />
              <select
                value={tempoUnidade}
                onChange={(e) => setTempoUnidade(e.target.value)}
                style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', color: '#334155', backgroundColor: 'white', cursor: 'pointer' }}
              >
                <option value="minutos">minutos</option>
                <option value="horas">horas</option>
                <option value="dias">dias</option>
              </select>
            </div>
          ) : (
             <div style={{ marginTop: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
               A atividade ficará disponível sem limite de tempo.
             </div>
          )}
        </div>

        <div className="criar-vf-spacer"></div>

        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="criar-vf-btn-save"
        >
          {loading ? 'SALVANDO...' : '💾 SALVAR ATIVIDADE'}
        </button>
      </aside>

    </div>
  );
}

export default CriarVF;