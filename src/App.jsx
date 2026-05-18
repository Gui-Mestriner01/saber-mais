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
      </Routes>
    </BrowserRouter>
  );
}

export default App;