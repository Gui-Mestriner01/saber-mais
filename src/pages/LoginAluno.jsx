import { useNavigate } from 'react-router-dom';
import '../CSS/Login.css';

function LoginAluno() {
  const navigate = useNavigate();

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>

        <div className="login-card">
          <h2>LOGIN DO ALUNO</h2>

          <div className="input-group">
            <span className="input-icon">@</span>
            <input type="email" placeholder="Digite seu e-mail" />
          </div>

          <div className="input-group">
            <span className="input-icon">🔒</span>
            <input type="password" placeholder="Digite sua senha" />
          </div>

          <button className="btn-entrar">ENTRAR</button>

          <p className="cadastro-link">
            Não tem login? <span onClick={() => navigate('/cadastro/aluno')}>Cadastrar-se &gt;</span>
          </p>
        </div>

        <button className="back-btn" onClick={() => navigate('/')}>← Voltar</button>
      </div>
    </div>
  );
}

export default LoginAluno;