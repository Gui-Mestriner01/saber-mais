import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Dashboard.css';
import '../CSS/Relatorios.css';

function Relatorios() {
  const navigate = useNavigate();
  const [atividades, setAtividades] = useState([]);
  const [atvSelecionada, setAtvSelecionada] = useState(null);
  const [respostas, setRespostas]   = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [respostaSelecionada, setRespostaSelecionada] = useState(null);
  const [ativRespostas, setAtivRespostas]             = useState(null);

  useEffect(() => {
    buscarAtividades();
  }, []);

  const buscarAtividades = async () => {
    try {
      const res = await fetch('http://localhost:3001/professor/atividades', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setAtividades(data);
    } catch {
      console.error('Erro ao buscar atividades');
    } finally {
      setCarregando(false);
    }
  };

  const verRespostas = async (atv) => {
    setAtvSelecionada(atv);
    try {
      // Busca conteúdo completo da atividade
      const [resRes, atvRes] = await Promise.all([
        fetch(`http://localhost:3001/professor/atividade/${atv.id}/respostas`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`http://localhost:3001/atividade/${atv.id}`)
      ]);
      const respostasData = await resRes.json();
      const atvData       = await atvRes.json();
      
      setRespostas(respostasData);
      setAtvSelecionada({ ...atv, conteudo: atvData.conteudo });
    } catch {
      console.error('Erro ao buscar respostas');
    }
  };

  const tipoIcon = (tipo) => ({ quiz: '🎯', resposta_aberta: '✍️', ligar: '🔗', pintura: '🎨' }[tipo] || '📝');

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item" onClick={() => navigate('/professor/dashboard')}>🏠 Página Inicial</button>
          <button className="nav-item" onClick={() => navigate('/professor/salas')}>🏫 Salas</button>
          <button className="nav-item" onClick={() => navigate('/professor/criar-atividade')}>📝 Atividades</button>
          <button className="nav-item active">📊 Relatórios</button>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>📊 Relatórios</h1>
          <div className="header-avatar" onClick={() => navigate('/professor/perfil')} style={{cursor:'pointer'}}>👨‍🏫</div>
        </header>

        {!atvSelecionada ? (
          <>
            {carregando ? (
              <div className="rel-vazio"><span>⏳</span><p>Carregando...</p></div>
            ) : atividades.length === 0 ? (
              <div className="rel-vazio"><span>📭</span><p>Nenhuma atividade criada ainda.</p></div>
            ) : (
              <div className="rel-lista">
                {atividades.map(atv => (
                  <div key={atv.id} className="rel-card">
                    <div className="rel-card-info">
                      <span className="rel-tipo-icon">{tipoIcon(atv.tipo)}</span>
                      <div>
                        <h3>{atv.titulo}</h3>
                        <p>{atv.nome_sala} · {atv.serie} · {atv.materia}</p>
                        <span className="rel-badge">{atv.total_respostas} resposta(s)</span>
                      </div>
                    </div>
                    <button className="rel-btn-ver" onClick={() => verRespostas(atv)}>
                      Acessar →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <button className="rel-voltar" onClick={() => { setAtvSelecionada(null); setRespostas([]); }}>
              ← Voltar
            </button>

            <div className="rel-detalhe-header">
              <h2>{tipoIcon(atvSelecionada.tipo)} {atvSelecionada.titulo}</h2>
              <p>{atvSelecionada.nome_sala} · {atvSelecionada.serie} · {atvSelecionada.materia}</p>
            </div>

            {respostas.length === 0 ? (
              <div className="rel-vazio"><span>📭</span><p>Nenhum aluno respondeu ainda.</p></div>
            ) : (
              <div className="rel-lista">
                {respostas.map(r => (
                  <div key={r.id} className="rel-card">
                    <div className="rel-card-info">
                      <span className="rel-tipo-icon">👤</span>
                      <div>
                        <h3>{r.nome_aluno}</h3>
                        <p>🏫 {r.nome_sala} · {r.serie}</p>
                        <span className="rel-badge">
                          ⭐ {r.resposta.pontos} / {r.resposta.total} pts
                        </span>
                      </div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:12}}>
                      <span className="rel-data">
                        {new Date(r.criado_em).toLocaleDateString('pt-BR')}
                      </span>
                      <button className="rel-btn-ver" onClick={() => { setRespostaSelecionada(r); setAtivRespostas(atvSelecionada); }}>
                        Ver Respostas
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Modal renderizado no final do fluxo, dentro da main */}
        {respostaSelecionada && ativRespostas && (
          <div className="modal-overlay" onClick={() => setRespostaSelecionada(null)}>
            <div className="modal-respostas-card" onClick={e => e.stopPropagation()}>
              <div className="modal-respostas-header">
                <div>
                  <h3>Respostas de {respostaSelecionada.nome_aluno}</h3>
                  <p>{respostaSelecionada.nome_sala} · {respostaSelecionada.serie} · ⭐ {respostaSelecionada.resposta.pontos}/{respostaSelecionada.resposta.total} pts</p>
                </div>
                <button onClick={() => setRespostaSelecionada(null)}>✕</button>
              </div>

              <div className="modal-respostas-lista">
                {respostaSelecionada.resposta.respostas && Object.entries(respostaSelecionada.resposta.respostas).map(([pergIdx, selecionadas]) => {
                  const perg = ativRespostas?.conteudo?.perguntas?.[pergIdx];
                  if (!perg) return null;
                  const corretas = perg.alternativas.map((a, i) => a.correta ? i : null).filter(v => v !== null);
                  const acertou = corretas.length === selecionadas.length && corretas.every(c => selecionadas.includes(c));
                  return (
                    <div key={pergIdx} className={`modal-perg-card ${acertou ? 'acertou' : 'errou'}`}>
                      <div className="modal-perg-header">
                        <span>{acertou ? '✅' : '❌'}</span>
                        <strong>Pergunta {Number(pergIdx) + 1}: {perg.texto}</strong>
                      </div>
                      <div className="modal-perg-respostas">
                        {perg.alternativas.map((alt, altIdx) => {
                          const marcada  = selecionadas.includes(altIdx);
                          const correta  = alt.correta;
                          return (
                            <div
                              key={altIdx}
                              className={`modal-alt ${marcada && correta ? 'correta-marcada' : marcada && !correta ? 'errada-marcada' : correta ? 'correta-nao-marcada' : ''}`}
                            >
                              {marcada && correta ? '✅' : marcada && !correta ? '❌' : correta ? '⭕' : '○'} {alt.texto}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Relatorios;