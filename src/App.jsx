import { useLayoutEffect, useState, lazy, Suspense } from 'react';
import { flushSync } from 'react-dom';
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import Home from './pages/Home';
import MenuAcessibilidade from './acessibilidade/MenuAcessibilidade';

/* Cada tela vira um pedacinho separado, baixado só quando o usuário entra
   nela. Antes o celular baixava o site inteiro (todas as telas do professor,
   todos os jogos) só para mostrar a tela de escolher o acesso. */
const LoginProfessor = lazy(() => import('./pages/LoginProfessor'));
const CadastroProfessor = lazy(() => import('./pages/CadastroProfessor'));
const DashboardProfessor = lazy(() => import('./pages/DashboardProfessor'));
const CriarSala = lazy(() => import('./pages/CriarSala'));
const CriarAtividade = lazy(() => import('./pages/CriarAtividade'));
const PerfilProfessor = lazy(() => import('./pages/PerfilProfessor'));
const CriarQuiz = lazy(() => import('./pages/CriarQuiz'));
const CriarLigar = lazy(() => import('./pages/CriarLigar'));
const PinturaAluno = lazy(() => import('./pages/PinturaAluno'));
const CriarPintura = lazy(() => import('./pages/CriarPintura'));
const CriarRespostaAberta = lazy(() => import('./pages/CriarRespostaAberta'));
const AreaAluno = lazy(() => import('./pages/AreaAluno'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AlunoHome = lazy(() => import('./pages/AlunoHome'));
const ResponderQuiz = lazy(() => import('./pages/ResponderQuiz'));
const Relatorios = lazy(() => import('./pages/Relatorios'));
const LigarAluno = lazy(() => import('./pages/LigarAluno'));
const Salas = lazy(() => import('./pages/Salas'));
const LoginAluno = lazy(() => import('./pages/LoginAluno'));
const CriarVF = lazy(() => import('./pages/CriarVF'));
const ResponderVF = lazy(() => import('./pages/ResponderVF'));
const MinhasAulas = lazy(() => import('./pages/MinhasAulas'));
const SalaAoVivoAluno = lazy(() => import('./pages/SalaAoVivoAluno'));
const SalaAoVivoProfessor = lazy(() => import('./pages/SalaAoVivoProfessor'));
const ConquistasProfessor = lazy(() => import('./pages/ConquistasProfessor'));
const CriarOrdenar = lazy(() => import('./pages/CriarOrdenar'));
const CriarMemoria = lazy(() => import('./pages/CriarMemoria'));
const CriarGrupos = lazy(() => import('./pages/CriarGrupos'));
const OrdenarAluno = lazy(() => import('./pages/OrdenarAluno'));
const MemoriaAluno = lazy(() => import('./pages/MemoriaAluno'));
const GruposAluno = lazy(() => import('./pages/GruposAluno'));
import './CSS/ordem.js';          // todas as folhas das telas, antes das globais
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
      <Suspense fallback={<div className="carregando-tela" />}>
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
      </Suspense>
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