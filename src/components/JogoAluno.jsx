import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import '../CSS/NovasAtividades.css';
import { FundoTema, classeTema } from './TemaFundo';
import { API, cabecalhoAluno } from '../api';

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

// 3 estrelas acertando tudo, 2 acertando mais da metade, 1 no resto.
// Nenhum acerto não ganha estrela (antes ganhava uma dourada).
export function estrelasPorAproveitamento(acertos, total) {
  if (total <= 0) return 1;
  if (!acertos || acertos <= 0) return 0;
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
  // Cenário de fundo escolhido pelo professor (vem na lista e na atividade).
  const [tema, setTema] = useState(atividade?.tema || null);
  // Quando o aluno começou: vai junto no envio para o professor ver quanto
  // tempo ele levou. O quiz reinicia no "Começar" (marcarInicio).
  const inicio = useRef(Date.now());
  const marcarInicio = () => { inicio.current = Date.now(); };

  const voltar = () => navigate('/aluno/home', { state: { sala, nomeAluno, alunoId } });

  useEffect(() => {
    if (!atividade || !nomeAluno || !sala) { navigate('/aluno/area'); return; }
    fetch(`${API}/atividade/${atividade.id}`, { headers: cabecalhoAluno() })
      .then(async r => {
        if (r.status === 401) { navigate('/aluno/area'); return null; } // crachá venceu
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(dados => { if (dados) { setConteudo(dados.conteudo || {}); setTema(dados.tema || null); } })
      .catch(() => setErro('Não consegui abrir a atividade. Tente de novo.'));
  }, []);

  /* Manda só o que o aluno fez. A correção e os pontos são calculados no
     servidor, que devolve o resultado (com a correção) para a tela mostrar. */
  const enviar = async (resposta) => {
    const res = await fetch(`${API}/atividade/${atividade.id}/resposta`, {
      method: 'POST',
      headers: cabecalhoAluno({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ resposta, duracao_s: Math.round((Date.now() - inicio.current) / 1000) })
    });
    const dados = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(dados.erro || 'Não consegui enviar.');
    return dados.resultado;
  };

  return { atividade, conteudo, erro, enviar, voltar, tema, marcarInicio };
}

/* `emAndamento`: o aluno já começou e ainda não enviou. Aí o "Voltar"
   pergunta antes de sair (e o navegador também avisa se fechar a aba),
   porque o que ele fez até ali se perde. */
export function JogoAluno({ titulo, voltar, tema, emAndamento = false, children }) {
  const [perguntarSaida, setPerguntarSaida] = useState(false);

  useEffect(() => {
    if (!emAndamento) return;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [emAndamento]);

  return (
    <div className={`jogo-aluno ${classeTema(tema)}`}>
      <FundoTema tema={tema} />
      <header className="jogo-topo">
        <span><span className="marca-saber">Saber</span><span className="marca-mais">+</span></span>
        <h1>{titulo}</h1>
        <button className="jogo-voltar" onClick={() => (emAndamento ? setPerguntarSaida(true) : voltar())}>
          <ArrowLeft size={14} strokeWidth={2.4} /> Voltar
        </button>
      </header>
      <main className="jogo-palco">{children}</main>

      {perguntarSaida && (
        <JanelaConfirmar
          titulo="Sair sem enviar?"
          texto="Você ainda não enviou esta atividade. Se sair agora, o que você fez até aqui não fica salvo."
          textoConfirmar="Sair mesmo assim"
          textoCancelar="Continuar fazendo"
          perigo
          aoConfirmar={voltar}
          aoCancelar={() => setPerguntarSaida(false)}
        />
      )}
    </div>
  );
}

export function JanelaConfirmar({
  titulo, texto, aoConfirmar, aoCancelar, enviando,
  textoConfirmar = 'Enviar', textoCancelar = 'Voltar e mexer', perigo = false, children,
}) {
  return (
    <div className="jogo-confirmar-fundo">
      <div className="jogo-confirmar" role="dialog" aria-modal="true" aria-labelledby="confirmar-titulo">
        <h2 id="confirmar-titulo">{titulo}</h2>
        <p>{texto}</p>
        {children}
        <div className="jogo-acoes">
          <button className="jogo-btn secundario" onClick={aoCancelar} disabled={enviando}>{textoCancelar}</button>
          <button className={`jogo-btn ${perigo ? 'perigo' : ''}`} onClick={aoConfirmar} disabled={enviando} autoFocus>
            {enviando ? 'Enviando…' : textoConfirmar}
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
