import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Home.css';
import BotaoInstalar from '../components/BotaoInstalar';

/* As ilustrações da tela inicial mudam a cada visita.
   São várias versões dos mesmos dois cartões, com pessoas diferentes —
   quem abre o Saber+ deve conseguir se reconhecer ali.
   Para acrescentar mais, é só salvar o arquivo em public/imagens/ e
   aumentar o número aqui. */
const PROFESSORES = 5;
const ALUNOS = 4;

const sortear = (quantos) => 1 + Math.floor(Math.random() * quantos);

function Home() {
  const navigate = useNavigate();

  // useState com função: sorteia uma vez por carregamento da página,
  // e não a cada vez que o React redesenha a tela.
  const [professor] = useState(() => sortear(PROFESSORES));
  const [aluno]     = useState(() => sortear(ALUNOS));

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
              {/* srcset: no celular baixa a versão de 480px (13 KB) em vez da
                  de 960px. fetchpriority alto: é a maior imagem da tela, então
                  o navegador vai buscá-la antes das outras coisas. */}
              <img
                src={`/imagens/professor${professor}.webp`}
                srcSet={`/imagens/professor${professor}-480.webp 480w, /imagens/professor${professor}.webp 960w`}
                sizes="(max-width: 560px) 88vw, 420px"
                width="960" height="640"
                fetchPriority="high"
                alt="Dois professores sorrindo, com livros na mão"
                className="avatar-img"
              />
            </div>
            <button className="btn-blue" onClick={() => navigate('/login/professor')}>
              ACESSO PROFESSOR
            </button>
          </div>

          <div className="access-card">
            <div className="avatar">
              <img
                src={`/imagens/aluno${aluno}.webp`}
                srcSet={`/imagens/aluno${aluno}-480.webp 480w, /imagens/aluno${aluno}.webp 960w`}
                sizes="(max-width: 560px) 88vw, 420px"
                width="960" height="640"
                fetchPriority="high"
                alt="Dois alunos sorrindo, estudando no computador"
                className="avatar-img"
              />
            </div>
            <button className="btn-green" onClick={() => navigate('/aluno/area')}>
              ACESSO ALUNO
            </button>
          </div>
        </div>

        <BotaoInstalar />
      </div>
    </div>
  );
}

export default Home;
