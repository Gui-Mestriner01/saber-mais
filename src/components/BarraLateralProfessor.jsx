import { useNavigate } from 'react-router-dom';
import { Home, School, FileText, BarChart3, LogOut } from 'lucide-react';

/* ==========================================================================
   MENU LATERAL DO PROFESSOR

   Estava copiado e colado em cinco telas. Agora fica só aqui: mexeu em um
   item, mudou em todas. A prop "ativo" diz qual item fica destacado.
   ========================================================================== */

const ITENS = [
  { chave: 'home',       rotulo: 'Página inicial', rota: '/professor/dashboard',    Icone: Home },
  { chave: 'salas',      rotulo: 'Salas',          rota: '/professor/salas',        Icone: School },
  { chave: 'aulas',      rotulo: 'Minhas aulas',   rota: '/professor/minhas-aulas', Icone: FileText },
  { chave: 'relatorios', rotulo: 'Relatórios',     rota: '/professor/relatorios',   Icone: BarChart3 },
];

function BarraLateralProfessor({ ativo }) {
  const navigate = useNavigate();

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
        {ITENS.map(({ chave, rotulo, rota, Icone }) => (
          <button
            key={chave}
            className={`nav-item ${ativo === chave ? 'active' : ''}`}
            onClick={() => { if (ativo !== chave) navigate(rota); }}
          >
            <Icone size={18} strokeWidth={1.75} /> {rotulo}
          </button>
        ))}
      </nav>

      <button className="sidebar-sair" onClick={sair}>
        <LogOut size={16} strokeWidth={1.75} /> Sair
      </button>
    </aside>
  );
}

export default BarraLateralProfessor;
