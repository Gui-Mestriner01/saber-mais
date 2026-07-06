import { useNavigate } from 'react-router-dom';
import '../CSS/Home.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>
        <p className="subtitle">Escolha seu tipo de acesso:</p>

        <div className="cards-row">
          <div className="access-card">
            <div className="avatar">
              {/* Substitua pelo nome exato da imagem que você salvou na pasta public */}
              <img src="/imagens/professor.png" alt="Avatar Professor" className="avatar-img" />
            </div>
            <button className="btn-blue" onClick={() => navigate('/login/professor')}>
              ACESSO PROFESSOR
            </button>
          </div>
          <div className="access-card">
            <div className="avatar">
              {/* Substitua pelo nome exato da imagem que você salvou na pasta public */}
              <img src="/imagens/aluno.png" alt="Avatar Aluno" className="avatar-img" />
            </div>
            <button className="btn-green" onClick={() => navigate('/aluno/area')}>
              ACESSO ALUNO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;