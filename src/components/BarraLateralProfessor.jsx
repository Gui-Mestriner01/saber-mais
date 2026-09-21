import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, School, FileText, BarChart3, Award, LogOut, Moon, Sun } from 'lucide-react';
import FestaInsignias from './FestaInsignias';
import '../CSS/Conquistas.css';
import { API } from '../api';

/* ==========================================================================
   MENU LATERAL DO PROFESSOR

   Estava copiado e colado em cinco telas. Agora fica só aqui: mexeu em um
   item, mudou em todas. A prop "ativo" diz qual item fica destacado.

   Ele também é quem comemora as insígnias do professor: como aparece em
   todas as telas, a festa acontece onde o professor estiver — por exemplo,
   logo depois de encerrar uma aula ao vivo e voltar para o painel.
   ========================================================================== */


// "curto" é o nome que aparece na barra de baixo do celular, onde cabe pouco.
const ITENS = [
  { chave: 'home',       rotulo: 'Página inicial', curto: 'Início',     rota: '/professor/dashboard',    Icone: Home },
  { chave: 'salas',      rotulo: 'Salas',          curto: 'Salas',      rota: '/professor/salas',        Icone: School },
  { chave: 'aulas',      rotulo: 'Minhas aulas',   curto: 'Aulas',      rota: '/professor/minhas-aulas', Icone: FileText },
  { chave: 'relatorios', rotulo: 'Relatórios',     curto: 'Relatórios', rota: '/professor/relatorios',   Icone: BarChart3 },
  { chave: 'conquistas', rotulo: 'Conquistas',     curto: 'Conquistas', rota: '/professor/conquistas',   Icone: Award },
];

// Preferência de tema do professor. É separada da do aluno
// ("saberPlusModoEscuro"), então um não muda o tema do outro.
const CHAVE_TEMA = 'saberPlusModoEscuroProfessor';

export function temaEscuroProfessorLigado() {
  try { return localStorage.getItem(CHAVE_TEMA) === 'true'; } catch { return false; }
}

function BarraLateralProfessor({ ativo }) {
  const navigate = useNavigate();
  const [novas, setNovas] = useState([]);
  const [escuro, setEscuro] = useState(temaEscuroProfessorLigado);

  const trocarTema = () => {
    const novo = !escuro;
    setEscuro(novo);
    try { localStorage.setItem(CHAVE_TEMA, String(novo)); } catch { /* sem memória, vale só agora */ }
    document.body.classList.toggle('modo-escuro-prof', novo);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let vivo = true;
    fetch(`${API}/professor/conquistas`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(dados => { if (vivo && dados) setNovas(dados.lista.filter(c => c.nova)); })
      .catch(() => { /* sem festa desta vez; tenta na próxima tela */ });

    return () => { vivo = false; };
  }, []);

  const fecharFesta = () => {
    setNovas([]);
    const token = localStorage.getItem('token');
    fetch(`${API}/professor/conquistas/vistas`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => { /* se falhar, a festa volta na próxima tela */ });
  };

  const sair = () => {
    const confirmar = window.confirm('Sair da sua conta?');
    if (!confirmar) return;

    // Tira a sessão do navegador. A foto de perfil fica guardada por id,
    // então continua lá quando o professor entrar de novo.
    localStorage.removeItem('token');
    localStorage.removeItem('nomeUsuario');
    localStorage.removeItem('idUsuario');
    localStorage.removeItem('tipoUsuario');
    localStorage.removeItem('fotoUsuario');

    navigate('/');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
      </div>

      <nav className="sidebar-nav">
        {ITENS.map(({ chave, rotulo, curto, rota, Icone }) => (
          <button
            key={chave}
            className={`nav-item ${ativo === chave ? 'active' : ''}`}
            onClick={() => { if (ativo !== chave) navigate(rota); }}
            aria-current={ativo === chave ? 'page' : undefined}
          >
            <Icone size={18} strokeWidth={1.75} />
            <span className="rotulo-longo">{rotulo}</span>
            <span className="rotulo-curto">{curto}</span>
          </button>
        ))}
      </nav>

      <button
        className="sidebar-tema"
        onClick={trocarTema}
        aria-pressed={escuro}
        title={escuro ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      >
        {escuro ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
        <span className="rotulo-botao">{escuro ? 'Tema claro' : 'Tema escuro'}</span>
      </button>

      <button className="sidebar-sair" onClick={sair} title="Sair da conta">
        <LogOut size={16} strokeWidth={1.75} /> <span className="rotulo-botao">Sair</span>
      </button>

      <FestaInsignias novas={novas} subtitulo="Conquista de professor" aoFechar={fecharFesta} />
    </aside>
  );
}

export default BarraLateralProfessor;
