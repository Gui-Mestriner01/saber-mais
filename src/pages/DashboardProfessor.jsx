import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, Plus, Users, Inbox, Trophy, Star } from 'lucide-react';
import BarraLateralProfessor from '../components/BarraLateralProfessor';
import '../CSS/Dashboard.css';
import { API } from '../api';

function DashboardProfessor() {
  const navigate = useNavigate();
  const nomeProfessor = localStorage.getItem('nomeUsuario') || 'Professor(a)';
  const idProfessor = localStorage.getItem('idUsuario');

  // A foto fica guardada por usuário, então a conta do Google de um professor
  // nunca aparece no painel de outro
  const fotoProfessor = idProfessor ? localStorage.getItem(`fotoUsuario_${idProfessor}`) : null;

  const [salas, setSalas]           = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [destaques, setDestaques]   = useState([]);
  const [feed, setFeed]             = useState([]);
  const [totais, setTotais]         = useState({ total_alunos: 0, total_respostas: 0, total_atividades: 0 });
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarDadosDoBanco();
  }, []);

  const carregarDadosDoBanco = async () => {
    setCarregando(true);
    const token = localStorage.getItem('token');

    try {
      const resSalas = await fetch(`${API}/professor/salas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resSalas.ok) {
        const dataSalas = await resSalas.json();
        setSalas(dataSalas);
      }

      const resDash = await fetch(`${API}/professor/dashboard-resumo`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resDash.ok) {
        const dataDash = await resDash.json();
        setAtividades(dataDash.atividades || []);
        setDestaques(dataDash.destaques || []);
        setFeed(dataDash.feed || []);
        if (dataDash.totais) setTotais(dataDash.totais);
      }
    } catch (error) {
      console.error('Erro de conexão com o Node.js:', error);
    } finally {
      setCarregando(false);
    }
  };

  const tempoAtras = (dataBanco) => {
    if (!dataBanco) return '';
    const data = new Date(dataBanco);
    const agora = new Date();
    const diffMinutos = Math.floor((agora - data) / 60000);

    if (diffMinutos < 1) return 'Agora mesmo';
    if (diffMinutos < 60) return `Há ${diffMinutos} min`;
    const diffHoras = Math.floor(diffMinutos / 60);
    if (diffHoras < 24) return `Há ${diffHoras} horas`;
    return `Há ${Math.floor(diffHoras / 24)} dias`;
  };

  // Iniciais do nome, usadas quando o professor não tem foto
  const iniciais = nomeProfessor
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  const salasAtivas = salas.filter(s => s.status !== 'encerrada').length;

  const saudacao = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="dashboard-container">
      {/* MENU LATERAL */}
      <BarraLateralProfessor ativo="home" />

      <main className="dashboard-main">

        {/* CABEÇALHO */}
        <header className="dashboard-header-painel">
          <div className="header-boas-vindas">
            <h1>{saudacao()}, {nomeProfessor.split(' ')[0]}</h1>
            <p>Confira o resumo das suas turmas e o engajamento dos alunos.</p>
          </div>

          <div className="header-acoes">
            <button className="btn-acao-rapida" onClick={() => navigate('/professor/criar-sala')}>
              <School size={17} strokeWidth={1.75} /> Nova turma
            </button>
            <button className="btn-acao-rapida destaque" onClick={() => navigate('/professor/criar-atividade')}>
              <Plus size={17} strokeWidth={2} /> Criar atividade
            </button>

            <div className="header-avatar-prof" onClick={() => navigate('/professor/perfil')} title="Meu perfil">
              {fotoProfessor
                ? <img src={fotoProfessor} alt={nomeProfessor} />
                : <span>{iniciais}</span>
              }
            </div>
          </div>
        </header>

        {carregando ? (
          <div className="painel-carregando">
            <p>Carregando seu painel...</p>
          </div>
        ) : (
          <>
            {/* NÚMEROS DO PROFESSOR */}
            <div className="resumo-grid">
              <div className="resumo-card turmas">
                <div className="resumo-icone"><School size={20} strokeWidth={1.75} /></div>
                <div className="resumo-texto">
                  <strong>{salasAtivas}</strong>
                  <p>{salasAtivas === 1 ? 'Turma ativa' : 'Turmas ativas'}</p>
                </div>
              </div>

              <div className="resumo-card alunos">
                <div className="resumo-icone"><Users size={20} strokeWidth={1.75} /></div>
                <div className="resumo-texto">
                  <strong>{totais.total_alunos}</strong>
                  <p>{totais.total_alunos === 1 ? 'Aluno nas turmas' : 'Alunos nas turmas'}</p>
                </div>
              </div>

              <div className="resumo-card entregas">
                <div className="resumo-icone"><Inbox size={20} strokeWidth={1.75} /></div>
                <div className="resumo-texto">
                  <strong>{totais.total_respostas}</strong>
                  <p>{totais.total_respostas === 1 ? 'Atividade entregue' : 'Atividades entregues'}</p>
                </div>
              </div>
            </div>

            {/* ATIVIDADES RECENTES */}
            <section className="painel-secao">
              <div className="secao-header">
                <h2>Atividades recentes</h2>
                {totais.total_atividades > 0 && (
                  <span className="badge-contagem">{totais.total_atividades} no total</span>
                )}
                <button className="link-ver-todas" onClick={() => navigate('/professor/minhas-aulas')}>
                  Ver todas
                </button>
              </div>

              {atividades.length === 0 ? (
                <div className="empty-state-mini">
                  <span><Inbox size={26} strokeWidth={1.5} /></span>
                  <p>Você ainda não criou atividades.</p>
                </div>
              ) : (
                <div className="progresso-grid">
                  {atividades.map(ativ => {
                    const total     = Number(ativ.total) || 0;
                    const entregues = Number(ativ.entregues) || 0;
                    const pct       = total > 0 ? Math.round((entregues / total) * 100) : 0;

                    const cor = pct === 100 ? 'var(--verde)' : pct > 0 ? 'var(--azul)' : '#DEDBD3';

                    const detalhe = total === 0
                      ? 'Nenhum aluno entrou nesta turma ainda'
                      : entregues === 0
                        ? `Aguardando as entregas de ${total} ${total === 1 ? 'aluno' : 'alunos'}`
                        : `${entregues} de ${total} já entregaram`;

                    return (
                      <div key={ativ.id} className="progresso-card">
                        <div className="progresso-info">
                          <div className="progresso-textos">
                            <h3>{ativ.titulo}</h3>
                            <span>{ativ.sala}</span>
                          </div>
                          <div className="progresso-numeros">
                            <strong style={{ color: pct > 0 ? cor : 'var(--tinta-clara)' }}>{pct}%</strong>
                          </div>
                        </div>

                        <div className="barra-fundo">
                          <div className="barra-preenchida" style={{ width: `${pct}%`, background: cor }} />
                        </div>

                        <p className="progresso-detalhe">{detalhe}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* FEED + PÓDIO */}
            <div className="dashboard-grid-duplo">

              <div className="card-feed">
                <div className="secao-header">
                  <h2>Últimas respostas</h2>
                </div>

                {feed.length === 0 ? (
                  <div className="empty-state-mini">
                    <span><Inbox size={26} strokeWidth={1.5} /></span>
                    <p>Nenhuma atividade respondida ainda.</p>
                  </div>
                ) : (
                  <>
                    <div className="feed-lista">
                      {feed.map(item => (
                        <div key={item.id} className="feed-item">
                          <div className="feed-icon"><Star size={17} strokeWidth={1.75} /></div>
                          <div className="feed-conteudo">
                            <p><strong>{item.nome_aluno}</strong> respondeu “{item.atividade}”</p>
                            <span>{item.sala} • {tempoAtras(item.criado_em)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="btn-ver-tudo" onClick={() => navigate('/professor/relatorios')}>
                      Ver todos os relatórios
                    </button>
                  </>
                )}
              </div>

              <div className="card-podio">
                <div className="secao-header">
                  <h2>Top alunos</h2>
                </div>

                {destaques.length === 0 ? (
                  <div className="empty-state-mini">
                    <span><Trophy size={26} strokeWidth={1.5} /></span>
                    <p>Os alunos ainda não pontuaram.</p>
                  </div>
                ) : (
                  <div className="podio-lista">
                    {destaques.map((aluno, index) => (
                      <div key={aluno.id} className={`podio-item ${index === 0 ? 'primeiro-lugar' : ''}`}>
                        <div className="podio-aluno">
                          <span className="podio-badge">{index + 1}</span>
                          <strong>{aluno.nome}</strong>
                        </div>
                        <span className="podio-pontos">{aluno.pontos || 0} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default DashboardProfessor;
