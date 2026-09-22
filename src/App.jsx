import { useLayoutEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
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

/* Troca de página animada.

   O endereço muda na hora, mas a página mostrada (`mostrada`) só troca dentro de
   document.startViewTransition: o navegador tira uma "foto" da página velha,
   o React desenha a nova e as duas se cruzam com a animação de Transicoes.css
   (a velha sai para um lado, a nova entra pelo outro). Voltar (botão do
   navegador) inverte o sentido.

   Navegador sem esse recurso, ou quem pediu "Reduzir animações": a página
   troca na hora e só a animação de entrada em CSS toca. */
const TEM_VIEW_TRANSITION = typeof document !== 'undefined' && 'startViewTransition' in document;

function semAnimacao() {
  return document.body.classList.contains('a11y-sem-animacao') ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Telas com painel (barra lateral + conteúdo): só o conteúdo desliza.
const temPainel = () => !!document.querySelector('.dashboard-main, .aluno-main');

function RotasAnimadas() {
  const location = useLocation();
  const tipoNavegacao = useNavigationType();
  const [mostrada, setMostrada] = useState(location);

  useLayoutEffect(() => {
    if (location.key === mostrada.key && location.pathname === mostrada.pathname) return;
    const html = document.documentElement;
    const trocar = (sincrono) => {
      if (sincrono) flushSync(() => setMostrada(location));
      else setMostrada(location);
      if (tipoNavegacao !== 'POP') window.scrollTo(0, 0);
    };

    // Mesma página (só mudou ?busca) ou sem animação: troca direto
    if (!TEM_VIEW_TRANSITION || semAnimacao() || location.pathname === mostrada.pathname) {
      trocar(false);
      return;
    }

    const painelAntes = temPainel();
    html.classList.toggle('vt-voltando', tipoNavegacao === 'POP');
    const transicao = document.startViewTransition(() => {
      trocar(true);
      // Painel nas duas pontas: a barra lateral fica parada e só o conteúdo anda
      html.classList.toggle('vt-painel', painelAntes && temPainel());
    });
    transicao.finished.finally(() => html.classList.remove('vt-voltando', 'vt-painel'));
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Modo escuro do professor: só vale nas telas /professor/*. Ao sair delas
     (login, telas do aluno) a classe é tirada e tudo volta ao normal.
     useLayoutEffect evita piscar a tela clara antes de escurecer. */
  useLayoutEffect(() => {
    const ligado = mostrada.pathname.startsWith('/professor') && temaEscuroProfessorLigado();
    document.body.classList.toggle('modo-escuro-prof', ligado);
  }, [mostrada.pathname]);

  return (
    <div key={mostrada.pathname} className={TEM_VIEW_TRANSITION ? 'pagina-animada com-vt' : 'pagina-animada'}>
      <Routes location={mostrada}>
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