import { BrowserRouter, Routes, Route } from 'react-router-dom';
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



function App() {
  return (
    <BrowserRouter>
      <Routes>
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



      </Routes>
    </BrowserRouter>
  );
}

export default App;