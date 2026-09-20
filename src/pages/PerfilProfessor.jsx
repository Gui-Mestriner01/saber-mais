import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, ArrowLeft, Camera, UserRound, AtSign, Phone, Building2, BookOpen, Users, ClipboardList, Check, KeyRound, Save } from 'lucide-react';
import BarraLateralProfessor from '../components/BarraLateralProfessor';
import '../CSS/Dashboard.css';

function PerfilProfessor() {
  const navigate = useNavigate();
  const inputFoto = useRef(null);

  const idProfessor = localStorage.getItem('idUsuario');

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [instituicao, setInstituicao] = useState('');
  const [materia, setMateria] = useState('');
  const [responsavelUnica, setResponsavelUnica] = useState(false);
  const [msgSucesso, setMsgSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [foto, setFoto] = useState(
    idProfessor ? localStorage.getItem(`fotoUsuario_${idProfessor}`) : null
  );

  const [salasDoProf, setSalasDoProf] = useState([]);

  // Números reais, vindos do banco
  const [totais, setTotais] = useState({ total_alunos: 0, total_atividades: 0 });

  useEffect(() => {
    buscarPerfil();
    buscarSalas();
    buscarTotais();
  }, []);

  const buscarPerfil = async () => {
    try {
      const res = await fetch('http://localhost:3001/professor/perfil', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setNome(data.nome || '');
      setEmail(data.email || '');
      setTelefone(data.telefone || '');
      setInstituicao(data.instituicao || '');
      setMateria(data.materia || '');
    } catch {
      console.error('Erro ao buscar perfil');
    }
  };

  const buscarSalas = async () => {
    try {
      const res = await fetch('http://localhost:3001/professor/salas', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setSalasDoProf(Array.isArray(data) ? data : []);
    } catch {
      console.error('Erro ao buscar salas');
    }
  };

  // Quantidade real de alunos e de atividades — nada de número estimado
  const buscarTotais = async () => {
    try {
      const res = await fetch('http://localhost:3001/professor/dashboard-resumo', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.totais) setTotais(data.totais);
    } catch {
      console.error('Erro ao buscar totais');
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetch('http://localhost:3001/professor/perfil', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ nome, telefone, instituicao, materia })
      });

      if (res.ok) {
        localStorage.setItem('nomeUsuario', nome);
        setMsgSucesso(true);
        setTimeout(() => setMsgSucesso(false), 3000);
      }
    } catch {
      console.error('Erro ao salvar perfil');
    } finally {
      setSalvando(false);
    }
  };

  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setFoto(imageUrl);
    if (idProfessor) localStorage.setItem(`fotoUsuario_${idProfessor}`, imageUrl);
  };

  const iniciais = (nome || 'P')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  const salasAtivas = salasDoProf.filter(s => s.status !== 'encerrada').length;

  return (
    <div className="dashboard-container">
      <BarraLateralProfessor />

      <main className="dashboard-main">

        <header className="dashboard-header-painel">
          <div className="header-boas-vindas">
            <h1>Meu perfil</h1>
            <p>Seus dados de cadastro e um resumo do seu trabalho no Saber+.</p>
          </div>

          <div className="header-acoes">
            <button className="btn-acao-rapida" onClick={() => navigate('/professor/dashboard')}>
              <ArrowLeft size={17} strokeWidth={1.75} /> Voltar ao painel
            </button>
          </div>
        </header>

        {/* FAIXA DE APRESENTAÇÃO */}
        <section className="perfil-capa">
          <div className="perfil-capa-foto" onClick={() => inputFoto.current.click()} title="Trocar foto">
            {foto
              ? <img src={foto} alt={nome} />
              : <span>{iniciais}</span>
            }
            <span className="perfil-capa-camera"><Camera size={15} strokeWidth={2} /></span>
          </div>

          <div className="perfil-capa-texto">
            <h2>{nome || 'Professor(a)'}</h2>
            <p>{[materia, instituicao].filter(Boolean).join(' · ') || 'Complete seu perfil abaixo'}</p>
          </div>

          <div className="perfil-capa-numeros">
            <div className="perfil-numero">
              <School size={17} strokeWidth={1.75} />
              <strong>{salasAtivas}</strong>
              <span>{salasAtivas === 1 ? 'sala ativa' : 'salas ativas'}</span>
            </div>
            <div className="perfil-numero">
              <Users size={17} strokeWidth={1.75} />
              <strong>{totais.total_alunos}</strong>
              <span>{totais.total_alunos === 1 ? 'aluno' : 'alunos'}</span>
            </div>
            <div className="perfil-numero">
              <ClipboardList size={17} strokeWidth={1.75} />
              <strong>{totais.total_atividades}</strong>
              <span>{totais.total_atividades === 1 ? 'atividade' : 'atividades'}</span>
            </div>
          </div>

          <input ref={inputFoto} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFoto} />
        </section>

        <div className="perfil-grid">

          {/* COLUNA ESQUERDA: formulário */}
          <div className="form-card">
            <h2 className="form-section-title">Informações pessoais</h2>

            <form onSubmit={handleSalvar}>
              <div className="form-field">
                <div className="campo-label">Nome completo</div>
                <div className="input-group">
                  <span className="input-icon"><UserRound size={18} strokeWidth={1.75} /></span>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)} />
                </div>
              </div>

              <div className="form-field">
                <div className="campo-label">E-mail</div>
                <div className="input-group desativado">
                  <span className="input-icon"><AtSign size={18} strokeWidth={1.75} /></span>
                  <input type="email" value={email} disabled />
                </div>
                <small className="campo-dica">O e-mail é o seu login e não pode ser alterado.</small>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <div className="campo-label">Telefone</div>
                  <div className="input-group">
                    <span className="input-icon"><Phone size={18} strokeWidth={1.75} /></span>
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={telefone}
                      onChange={e => setTelefone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <div className="campo-label">Matéria que leciona</div>
                  <div className="input-group">
                    <span className="input-icon"><BookOpen size={18} strokeWidth={1.75} /></span>
                    <select
                      value={materia}
                      onChange={e => setMateria(e.target.value)}
                      disabled={responsavelUnica}
                    >
                      <option value="">Selecione a matéria</option>
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
                <div className="campo-label">Instituição onde trabalha</div>
                <div className="input-group">
                  <span className="input-icon"><Building2 size={18} strokeWidth={1.75} /></span>
                  <input
                    type="text"
                    placeholder="Nome da escola"
                    value={instituicao}
                    onChange={e => setInstituicao(e.target.value)}
                  />
                </div>
              </div>

              <div className="toggle-field">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={responsavelUnica}
                    onChange={e => setResponsavelUnica(e.target.checked)}
                  />
                  <span className="toggle-text">
                    Sou professor(a) responsável por uma única sala
                    <small>Quem dá todas as matérias para a mesma turma, como no fundamental I.</small>
                  </span>
                </label>
              </div>

              {msgSucesso && (
                <div className="msg-sucesso">
                  <Check size={16} strokeWidth={2.5} /> Perfil atualizado com sucesso
                </div>
              )}

              <button type="submit" className="btn-criar-sala" disabled={salvando}>
                <Save size={17} strokeWidth={2} /> {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </form>
          </div>

          {/* Os códigos e as senhas ficam na tela Salas, para não repetir */}
          <aside className="perfil-atalho">
            <KeyRound size={22} strokeWidth={1.6} />
            <div>
              <strong>Códigos e senhas das salas</strong>
              <p>
                O código e a senha em figurinhas de cada turma ficam na tela Salas,
                com o botão de copiar.
              </p>
            </div>
            <button className="btn-acao-rapida" onClick={() => navigate('/professor/salas')}>
              <School size={17} strokeWidth={1.75} /> Ir para Salas
            </button>
          </aside>

        </div>
      </main>
    </div>
  );
}

export default PerfilProfessor;
