import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LoginProfessor from './pages/LoginProfessor';
import LoginAluno from './pages/LoginAluno';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login/professor" element={<LoginProfessor />} />
        <Route path="/login/aluno" element={<LoginAluno />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;