import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, School, Timer, Check, BookOpen, Pencil, Calendar,
  KeyRound, Copy, CircleAlert, Plus, ArrowRight
} from 'lucide-react';
import BarraLateralProfessor from '../components/BarraLateralProfessor';
import '../CSS/Dashboard.css';
import { API } from '../api';

// Gera o código que o aluno digita para achar a sala
const gerarCodigo = () => Math.random().toString(36).substring(2, 8).toUpperCase();

function CriarSala() {
  const navigate = useNavigate();

  const [nomeSala, setNomeSala] = useState('');
  const [serie, setSerie]       = useState('');
  const [materia, setMateria]   = useState('');
  const [codigo, setCodigo]     = useState(() => gerarCodigo());

  const [tipoSala, setTipoSala] = useState('permanente');

  const [salaCriada, setSalaCriada]   = useState(false);
  const [erro, setErro]               = useState('');
  const [senhaGerada, setSenhaGerada] = useState('');
  const [salvando, setSalvando]       = useState(false);
  const [copiado, setCopiado]         = useState(null);

  const ANO_ATUAL = new Date().getFullYear();

  const handleCriarSala = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);

    try {
      const response = await fetch(`${API}/professor/sala`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ nome: nomeSala, serie, materia, codigo, tipo_sala: tipoSala })
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || 'Erro ao criar sala.');
        return;
      }

      setSenhaGerada(data.senha);
      setSalaCriada(true);
    } catch {
      setErro('Não foi possível conectar ao servidor.');
    } finally {
      setSalvando(false);
    }
  };

  // Limpa tudo para criar a próxima turma, com um código novo
  const criarOutra = () => {
    setNomeSala('');
    setSerie('');
    setMateria('');
    setCodigo(gerarCodigo());
    setSenhaGerada('');
    setSalaCriada(false);
    setErro('');
  };

  const copiar = (texto, qual) => {
    navigator.clipboard?.writeText(texto);
    setCopiado(qual);
    setTimeout(() => setCopiado(null), 1800);
  };

  const TIPOS = [
    {
      id: 'permanente',
      Icone: School,
      titulo: 'Sala permanente',
      descricao: 'Para o ano letivo inteiro. Cada aluno entra com um PIN próprio e os pontos dele ficam guardados.',
    },
    {
      id: 'temporaria',
      Icone: Timer,
      titulo: 'Sala temporária',
      descricao: 'Expira em 6 horas. Acesso rápido, sem senha — boa para uma atividade pontual ou uma aula avulsa.',
    },
  ];

  return (
    <div className="dashboard-container">
      <BarraLateralProfessor ativo="salas" />

      <main className="dashboard-main">
        <header className="dashboard-header-painel">
          <div className="header-boas-vindas">
            <h1>{salaCriada ? 'Sala criada' : 'Criar sala'}</h1>
            <p>
              {salaCriada
                ? 'Agora é só passar o acesso para a turma.'
                : 'Escolha o tipo de sala e preencha os dados da turma.'}
            </p>
          </div>

          <div className="header-acoes">
            <button className="btn-acao-rapida" onClick={() => navigate('/professor/salas')}>
              <ArrowLeft size={17} strokeWidth={1.75} /> Minhas salas
            </button>
          </div>
        </header>

        {/* ==================================================================
            SALA CRIADA — mostra o acesso e sai do caminho
            ================================================================== */}
        {salaCriada ? (
          <div className="criar-sucesso">
            <div className="criar-sucesso-selo">
              <Check size={26} strokeWidth={2.5} />
            </div>

            <h2>{nomeSala}</h2>
            <p className="criar-sucesso-sub">
              {serie} · {materia} · sala {tipoSala === 'temporaria' ? 'temporária' : 'permanente'}
            </p>

            <div className="criar-acessos">
              <div className="criar-acesso">
                <span className="criar-acesso-rotulo">Código da sala</span>
                <div className="criar-acesso-valor">
                  <strong>{codigo}</strong>
                  <button onClick={() => copiar(codigo, 'codigo')} title="Copiar código">
                    {copiado === 'codigo'
                      ? <Check size={16} strokeWidth={2.5} />
                      : <Copy size={16} strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              {tipoSala === 'permanente' && senhaGerada && (
                <div className="criar-acesso senha">
                  <span className="criar-acesso-rotulo">
                    <KeyRound size={13} strokeWidth={2} /> Senha da sala
                  </span>
                  <div className="criar-acesso-valor">
                    <strong className="criar-senha">{senhaGerada}</strong>
                    <button onClick={() => copiar(senhaGerada, 'senha')} title="Copiar senha">
                      {copiado === 'senha'
                        ? <Check size={16} strokeWidth={2.5} />
                        : <Copy size={16} strokeWidth={1.75} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="criar-sucesso-dica">
              {tipoSala === 'temporaria'
                ? 'Passe o código para a turma. A sala fica no ar por 6 horas.'
                : 'Passe o código e a senha para a turma. Você reencontra os dois em Minhas salas.'}
            </p>

            <div className="criar-sucesso-acoes">
              <button className="btn-acao-rapida destaque" onClick={() => navigate('/professor/salas')}>
                Ver minhas salas <ArrowRight size={16} strokeWidth={2} />
              </button>
              <button className="btn-acao-rapida" onClick={criarOutra}>
                <Plus size={16} strokeWidth={2} /> Criar outra sala
              </button>
            </div>
          </div>
        ) : (
          /* ================================================================
             FORMULÁRIO
             ================================================================ */
          <form className="criar-form" onSubmit={handleCriarSala}>

            <section className="form-card">
              <h2 className="form-section-title">Que tipo de sala você precisa?</h2>

              <div className="tipo-sala-container">
                {TIPOS.map(({ id, Icone, titulo, descricao }) => (
                  <button
                    type="button"
                    key={id}
                    className={`tipo-sala-card ${tipoSala === id ? 'ativo' : ''}`}
                    onClick={() => setTipoSala(id)}
                    aria-pressed={tipoSala === id}
                  >
                    <span className="tipo-sala-marca">
                      <Icone size={22} strokeWidth={1.75} />
                    </span>

                    <div className="tipo-sala-texto">
                      <h3>{titulo}</h3>
                      <p>{descricao}</p>
                    </div>

                    <span className="tipo-sala-check">
                      {tipoSala === id && <Check size={14} strokeWidth={3} />}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="form-card">
              <h2 className="form-section-title">Dados da turma</h2>

              <div className="form-field">
                <div className="campo-label">Nome da sala</div>
                <div className="input-group">
                  <span className="input-icon"><School size={18} strokeWidth={1.75} /></span>
                  <input
                    type="text"
                    placeholder="Ex: Turma da manhã"
                    value={nomeSala}
                    onChange={e => setNomeSala(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <div className="campo-label">Série</div>
                  <div className="input-group">
                    <span className="input-icon"><BookOpen size={18} strokeWidth={1.75} /></span>
                    <select value={serie} onChange={e => setSerie(e.target.value)} required>
                      <option value="">Selecione</option>
                      <option>1º Ano</option>
                      <option>2º Ano</option>
                      <option>3º Ano</option>
                      <option>4º Ano</option>
                      <option>5º Ano</option>
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <div className="campo-label">Matéria</div>
                  <div className="input-group">
                    <span className="input-icon"><Pencil size={18} strokeWidth={1.75} /></span>
                    <select value={materia} onChange={e => setMateria(e.target.value)} required>
                      <option value="">Selecione</option>
                      <option>Português</option>
                      <option>Matemática</option>
                      <option>Ciências</option>
                      <option>História</option>
                      <option>Geografia</option>
                      <option>Artes</option>
                      <option>Educação Física</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-field">
                <div className="campo-label">Ano letivo</div>
                <div className="input-group desativado">
                  <span className="input-icon"><Calendar size={18} strokeWidth={1.75} /></span>
                  <input type="number" value={ANO_ATUAL} readOnly />
                </div>
                <small className="campo-dica">Preenchido com o ano atual.</small>
              </div>
            </section>

            {/* Prévia do acesso que a turma vai receber */}
            <section className="criar-previa">
              <span className="criar-previa-rotulo">O código que seus alunos vão digitar</span>
              <strong>{codigo}</strong>
              <span className="criar-previa-nota">
                {tipoSala === 'permanente'
                  ? 'A senha em figurinhas é gerada quando você criar a sala.'
                  : 'Sala temporária não tem senha.'}
              </span>
            </section>

            {erro && (
              <div className="msg-erro">
                <CircleAlert size={16} strokeWidth={2} /> {erro}
              </div>
            )}

            <button type="submit" className="btn-criar-sala" disabled={salvando}>
              {salvando ? 'Criando...' : 'Criar sala'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

export default CriarSala;
