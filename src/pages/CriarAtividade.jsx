import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, School, Check,
  ListChecks, PenLine, Link2, Palette, CircleCheck
} from 'lucide-react';
import BarraLateralProfessor from '../components/BarraLateralProfessor';
import '../CSS/Dashboard.css';

const tiposAtividade = [
  { id: 'quiz',            Icone: ListChecks,  nome: 'Quiz',                  desc: 'Perguntas de múltipla escolha' },
  { id: 'resposta_aberta', Icone: PenLine,     nome: 'Resposta aberta',       desc: 'O aluno digita a resposta' },
  { id: 'ligar',           Icone: Link2,       nome: 'Ligar correspondentes', desc: 'Conectar as duas colunas' },
  { id: 'pintar',          Icone: Palette,     nome: 'Pintar cenário',        desc: 'O aluno pinta os elementos da cena' },
  { id: 'v_f',             Icone: CircleCheck, nome: 'Verdadeiro ou falso',   desc: 'Julgar se a afirmação está certa' },
];

function CriarAtividade() {
  const navigate = useNavigate();
  const [salas, setSalas]                     = useState([]);
  const [salaSelecionada, setSalaSelecionada] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState('');

  useEffect(() => {
    buscarSalas();
  }, []);

  const buscarSalas = async () => {
    try {
      const res = await fetch('http://localhost:3001/professor/salas', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setSalas(Array.isArray(data) ? data : []);
    } catch {
      console.error('Erro ao buscar salas');
    }
  };

  const handleContinuar = () => {
    if (tipoSelecionado === 'quiz')
      navigate('/professor/criar-quiz', { state: { salaId: salaSelecionada } });
    if (tipoSelecionado === 'ligar')
      navigate('/professor/criar-ligar', { state: { salaId: salaSelecionada } });
    if (tipoSelecionado === 'pintar')
      navigate('/professor/criar-pintura', { state: { salaId: salaSelecionada } });
    if (tipoSelecionado === 'resposta_aberta')
      navigate('/professor/criar-resposta-aberta', { state: { salaId: salaSelecionada } });
    if (tipoSelecionado === 'v_f')
      navigate('/professor/criar-v-f', { state: { salaId: salaSelecionada } });
  };

  const salaAtual = salas.find(s => String(s.id) === String(salaSelecionada));

  return (
    <div className="dashboard-container">
      <BarraLateralProfessor ativo="aulas" />

      <main className="dashboard-main">
        <header className="dashboard-header-painel">
          <div className="header-boas-vindas">
            <h1>Criar atividade</h1>
            <p>Escolha para qual turma é e que tipo de atividade você quer montar.</p>
          </div>

          <div className="header-acoes">
            <button className="btn-acao-rapida" onClick={() => navigate('/professor/minhas-aulas')}>
              <ArrowLeft size={17} strokeWidth={1.75} /> Minhas aulas
            </button>
          </div>
        </header>

        <div className="nova-atividade">

          {/* PASSO 1 — TURMA */}
          <section className="form-card">
            <div className="passo-titulo">
              <span className="passo-num">1</span>
              <h2 className="form-section-title">Para qual turma?</h2>
            </div>

            <div className="input-group">
              <span className="input-icon"><School size={18} strokeWidth={1.75} /></span>
              <select value={salaSelecionada} onChange={e => setSalaSelecionada(e.target.value)}>
                <option value="">Escolha uma sala...</option>
                {salas.length === 0
                  ? <option disabled>Nenhuma sala cadastrada</option>
                  : salas.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nome} — {s.serie} · {s.materia}
                      </option>
                    ))
                }
              </select>
            </div>

            {salas.length === 0 && (
              <p className="campo-dica">
                Você precisa de pelo menos uma sala para lançar atividades.{' '}
                <button className="link-ver-todas" onClick={() => navigate('/professor/criar-sala')}>
                  Criar uma sala
                </button>
              </p>
            )}
          </section>

          {/* PASSO 2 — TIPO */}
          <section className={`form-card ${!salaSelecionada ? 'passo-bloqueado' : ''}`}>
            <div className="passo-titulo">
              <span className="passo-num">2</span>
              <h2 className="form-section-title">Que tipo de atividade?</h2>
            </div>

            {!salaSelecionada ? (
              <p className="campo-dica">Escolha a turma acima para liberar os tipos.</p>
            ) : (
              <div className="tipos-grid">
                {tiposAtividade.map(({ id, Icone, nome, desc }) => (
                  <button
                    type="button"
                    key={id}
                    className={`tipo-card ${tipoSelecionado === id ? 'selecionado' : ''}`}
                    onClick={() => setTipoSelecionado(id)}
                    aria-pressed={tipoSelecionado === id}
                  >
                    <span className="tipo-card-marca">
                      <Icone size={22} strokeWidth={1.75} />
                    </span>
                    <strong>{nome}</strong>
                    <p>{desc}</p>

                    {tipoSelecionado === id && (
                      <span className="tipo-card-check"><Check size={13} strokeWidth={3} /></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* CONTINUAR */}
          {salaSelecionada && tipoSelecionado && (
            <div className="nova-atividade-rodape">
              <p>
                <strong>{tiposAtividade.find(t => t.id === tipoSelecionado)?.nome}</strong>
                {salaAtual && <> para a turma <strong>{salaAtual.nome}</strong></>}
              </p>
              <button className="btn-acao-rapida destaque" onClick={handleContinuar}>
                Montar atividade <ArrowRight size={17} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default CriarAtividade;
