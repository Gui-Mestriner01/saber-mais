import { useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import LoginProfessor from './pages/LoginProfessor';
import CadastroProfessor from './pages/CadastroProfessor';
import DashboardProfessor from './pages/DashboardProfessor';
import CriarSala from './pages/CriarSala';
import CriarAtividade from './pages/CriarAtividade';
import PerfilProfessor from './pages/PerfilProfessor';
import CriarQuiz from './pages/CriarQuiz';
import CriarLigar from './pages/CriarLigar';
import PinturaAluno from './pages/PinturaAluno';
import CriarPintura from './pages/CriarPintura';
import CriarRespostaAberta from './pages/CriarRespostaAberta';
import AreaAluno from './pages/AreaAluno';
import AdminDashboard from './pages/AdminDashboard';
import AlunoHome from './pages/AlunoHome';
import ResponderQuiz from './pages/ResponderQuiz';
import Relatorios from './pages/Relatorios';
import LigarAluno from './pages/LigarAluno';
import Salas from './pages/Salas';
import LoginAluno from './pages/LoginAluno';
import CriarVF from "./pages/CriarVF";
import ResponderVF from './pages/ResponderVF';
import MinhasAulas from './pages/MinhasAulas';
import SalaAoVivoAluno from './pages/SalaAoVivoAluno';
import SalaAoVivoProfessor from './pages/SalaAoVivoProfessor';
import ConquistasProfessor from './pages/ConquistasProfessor';
import CriarOrdenar from './pages/CriarOrdenar';
import CriarMemoria from './pages/CriarMemoria';
import CriarGrupos from './pages/CriarGrupos';
import OrdenarAluno from './pages/OrdenarAluno';
import MemoriaAluno from './pages/MemoriaAluno';
import GruposAluno from './pages/GruposAluno';
import MenuAcessibilidade from './acessibilidade/MenuAcessibilidade';
import './CSS/Transicoes.css';
import './CSS/ModoEscuroProfessor.css';
import './CSS/Celular.css';
import { temaEscuroProfessorLigado } from './components/BarraLateralProfessor';

/* A cada troca de endereço a <div> ganha uma "key" nova, o React monta a
   página de novo e a animação de entrada (Transicoes.css) toca outra vez. */
function RotasAnimadas() {
  const location = useLocation();

  /* Modo escuro do professor: só vale nas telas /professor/*. Ao sair delas
     (login, telas do aluno) a classe é tirada e tudo volta ao normal.
     useLayoutEffect evita piscar a tela clara antes de escurecer. */
  useLayoutEffect(() => {
    const ligado = location.pathname.startsWith('/professor') && temaEscuroProfessorLigado();
    document.body.classList.toggle('modo-escuro-prof', ligado);
  }, [location.pathname]);

  return (
    <div key={location.pathname} className="pagina-animada">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/login/professor" element={<LoginProfessor />} />
        <Route path="/cadastro/professor" element={<CadastroProfessor />} />
        <Route path="/professor/dashboard" element={<DashboardProfessor />} />
        <Route path="/professor/criar-sala" element={<CriarSala />} />
        <Route path="/professor/criar-atividade" element={<CriarAtividade />} />
        <Route path="/professor/perfil" element={<PerfilProfessor />} />
        <Route path="/professor/criar-quiz" element={<CriarQuiz />} />
        <Route path="/professor/criar-ligar" element={<CriarLigar />} />
        <Route path="/professor/criar-pintura" element={<CriarPintura />} />
        <Route path="/professor/criar-resposta-aberta" element={<CriarRespostaAberta />} />
        <Route path="/aluno/pintura" element={<PinturaAluno />} />
        <Route path="/aluno/area" element={<AreaAluno />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/aluno/home" element={<AlunoHome />} />
        <Route path="/aluno/atividade/:id" element={<ResponderQuiz />} />
        <Route path="/professor/relatorios" element={<Relatorios />} />
        <Route path="/professor/minhas-aulas" element={<MinhasAulas />} />
        <Route path="/aluno/ligar/:id" element={<LigarAluno />} />
        <Route path="/professor/salas" element={<Salas />} />
        <Route path="/aluno/login" element={<LoginAluno />} />
        <Route path="/professor/criar-v-f" element={<CriarVF />} />
        <Route path="/aluno/atividade/v_f/:id" element={<ResponderVF />} />

        {/* Modo ao vivo: a sala temporária em que todo mundo joga junto */}
        <Route path="/aluno/lobby" element={<SalaAoVivoAluno />} />
        <Route path="/professor/ao-vivo/:salaId" element={<SalaAoVivoProfessor />} />
        <Route path="/professor/conquistas" element={<ConquistasProfessor />} />

        {/* Atividades novas: colocar em ordem, jogo da memória, separar em grupos */}
        <Route path="/professor/criar-ordenar" element={<CriarOrdenar />} />
        <Route path="/professor/criar-memoria" element={<CriarMemoria />} />
        <Route path="/professor/criar-grupos" element={<CriarGrupos />} />
        <Route path="/aluno/ordenar/:id" element={<OrdenarAluno />} />
        <Route path="/aluno/memoria/:id" element={<MemoriaAluno />} />
        <Route path="/aluno/grupos/:id" element={<GruposAluno />} />
        
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <MenuAcessibilidade />
      <RotasAnimadas />
    </BrowserRouter>
  );
}

export default App;