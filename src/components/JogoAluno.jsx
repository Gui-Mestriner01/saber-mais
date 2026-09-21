import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import '../CSS/NovasAtividades.css';
import { API } from '../api';

/* ==========================================================================
   PEÇAS COMPARTILHADAS DAS ATIVIDADES NOVAS DO ALUNO

   - useAtividadeAluno(): carrega a atividade, envia a resposta e sabe voltar
     para a página do aluno sem perder quem ele é (o alunoId vai junto, é
     ele que faz as insígnias aparecerem).
   - JogoAluno: a moldura (barra de cima + palco).
   - ResultadoAtividade: a tela final com estrelas e pontos.
   ========================================================================== */


// Cores dos grupos — as mesmas no editor do professor e na tela do aluno
export const CORES_GRUPOS = ['var(--azul)', 'var(--laranja)', '#6B4C9A'];

// Embaralha sem viciar (Fisher–Yates). O `sort(() => Math.random() - .5)`
// comum deixa alguns itens quase sempre no mesmo lugar.
export function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// 3 estrelas acertando tudo, 2 acertando mais da metade, 1 no resto
export function estrelasPorAproveitamento(acertos, total) {
  if (total <= 0) return 1;
  const taxa = acertos / total;
  if (taxa >= 1) return 3;
  if (taxa >= 0.6) return 2;
  return 1;
}

export function useAtividadeAluno() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const atividade = state?.atividade;
  const nomeAluno = state?.nomeAluno;
  const sala = state?.sala;
  const alunoId = state?.alunoId;

  const [conteudo, setConteudo] = useState(null);
  const [erro, setErro] = useState('');

  const voltar = () => navigate('/aluno/home', { state: { sala, nomeAluno, alunoId } });

  useEffect(() => {
    if (!atividade || !nomeAluno || !sala) { navigate('/aluno/area'); return; }
    fetch(`${API}/atividade/${atividade.id}`)
      .then(r => r.json())
      .then(dados => setConteudo(dados.conteudo || {}))
      .catch(() => setErro('Não consegui abrir a atividade. Tente de novo.'));
  }, []);

  const enviar = async (resposta, pontos) => {
    const res = await fetch(`${API}/atividade/${atividade.id}/resposta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome_aluno: nomeAluno, sala_id: sala.id, resposta, pontos })
    });
    if (!res.ok) throw new Error('Não consegui enviar.');
  };

  return { atividade, conteudo, erro, enviar, voltar };
}

export function JogoAluno({ titulo, voltar, children }) {
  return (
    <div className="jogo-aluno">
      <header className="jogo-topo">
        <span><span className="marca-saber">Saber</span><span className="marca-mais">+</span></span>
        <h1>{titulo}</h1>
        <button className="jogo-voltar" onClick={voltar}>
          <ArrowLeft size={14} strokeWidth={2.4} /> Voltar
        </button>
      </header>
      <main className="jogo-palco">{children}</main>
    </div>
  );
}

export function JanelaConfirmar({ titulo, texto, aoConfirmar, aoCancelar, enviando }) {
  return (
    <div className="jogo-confirmar-fundo">
      <div className="jogo-confirmar" role="dialog" aria-labelledby="confirmar-titulo">
        <h2 id="confirmar-titulo">{titulo}</h2>
        <p>{texto}</p>
        <div className="jogo-acoes">
          <button className="jogo-btn secundario" onClick={aoCancelar} disabled={enviando}>Voltar e mexer</button>
          <button className="jogo-btn" onClick={aoConfirmar} disabled={enviando} autoFocus>
            {enviando ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ResultadoAtividade({ estrelas, pontos, titulo, subtitulo, voltar, children }) {
  return (
    <div className="resultado-cartao">
      <h2>{titulo}</h2>

      <div className="resultado-estrelas" aria-label={`${estrelas} de 3 estrelas`}>
        {[1, 2, 3].map(n => (
          <Star
            key={n}
            size={46}
            strokeWidth={1.8}
            className={`resultado-estrela ${n <= estrelas ? 'acesa' : ''}`}
            fill={n <= estrelas ? 'currentColor' : 'none'}
          />
        ))}
      </div>

      <p className="resultado-pontos">+{pontos}</p>
      <p className="resultado-sub">{subtitulo}</p>

      {children && <div className="resultado-correcao">{children}</div>}

      <div className="jogo-acoes">
        <button className="jogo-btn" onClick={voltar}>Voltar para as atividades</button>
      </div>
    </div>
  );
}
