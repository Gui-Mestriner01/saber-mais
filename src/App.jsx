import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LoginProfessor from './pages/LoginProfessor';
import LoginAluno from './pages/LoginAluno';
import CadastroAluno from './pages/CadastroAluno';
import CadastroProfessor from './pages/CadastroProfessor';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login/professor" element={<LoginProfessor />} />
        <Route path="/login/aluno" element={<LoginAluno />} />
        <Route path="/cadastro/aluno" element={<CadastroAluno />} />
        <Route path="/cadastro/professor" element={<CadastroProfessor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;