import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LoginProfessor from './pages/LoginProfessor';
import LoginAluno from './pages/LoginAluno';
import CadastroAluno from './pages/CadastroAluno';
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login/professor" element={<LoginProfessor />} />
        <Route path="/login/aluno" element={<LoginAluno />} />
        <Route path="/cadastro/aluno" element={<CadastroAluno />} />
        <Route path="/cadastro/professor" element={<CadastroProfessor />} />
        <Route path="/professor/dashboard" element={<DashboardProfessor />} />
        <Route path="/professor/criar-sala" element={<CriarSala />} />
        <Route path="/professor/criar-atividade" element={<CriarAtividade />} />
        <Route path="/professor/perfil" element={<PerfilProfessor />} />
        <Route path="/professor/criar-quiz" element={<CriarQuiz />} />
        <Route path="/professor/criar-ligar" element={<CriarLigar />} />
        <Route path="/aluno/pintura" element={<PinturaAluno />} />
        <Route path="/professor/criar-pintura" element={<CriarPintura />} />
        <Route path="/professor/criar-resposta-aberta" element={<CriarRespostaAberta />} /> 
      </Routes>
    </BrowserRouter>
  );
}

export default App;