import { useState, useEffect, useRef } from 'react';
import {
  useAtividadeAluno, JogoAluno, ResultadoAtividade, embaralhar
} from '../components/JogoAluno';

/* ==========================================================================
   ALUNO — JOGO DA MEMÓRIA

   Cada par do professor vira duas cartas. O aluno vira duas por vez: se
   formam par, ficam abertas; se não, desviram depois de um instante.
   Terminou quando achou todos. Não tem "errar a atividade": o desafio é
   gastar poucas tentativas, e é isso que dá as estrelas e os pontos.

   resposta = { tentativas, pares, estrelas, acertos, total, pontos }
   ========================================================================== */

// Estrelas pelo número de tentativas, comparado com o mínimo possível (1 por par)
function estrelasDaMemoria(tentativas, pares) {
  if (tentativas <= Math.ceil(pares * 1.5)) return 3;
  if (tentativas <= Math.ceil(pares * 2.5)) return 2;
  return 1;
}

const PONTOS_POR_ESTRELAS = { 3: 10, 2: 8, 1: 6 }; // por par encontrado

function MemoriaAluno() {
  const { atividade, conteudo, erro, enviar, voltar } = useAtividadeAluno();

  const [cartas, setCartas] = useState([]);      // { id, par, texto }
  const [viradas, setViradas] = useState([]);    // ids viradas agora (0, 1 ou 2)
  const [achadas, setAchadas] = useState([]);    // números dos pares já achados
  const [errou, setErrou] = useState([]);        // ids que acabaram de errar (tremem)
  const [tentativas, setTentativas] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [erroEnvio, setErroEnvio] = useState('');
  const travado = useRef(false);

  const pares = conteudo?.pares || [];

  useEffect(() => {
    if (pares.length === 0) return;
    const baralho = pares.flatMap((p, i) => [
      { id: `${i}a`, par: i, texto: p.a },
      { id: `${i}b`, par: i, texto: p.b }
    ]);
    setCartas(embaralhar(baralho));
  }, [conteudo]);

  const virar = (carta) => {
    if (travado.current || viradas.includes(carta.id) || achadas.includes(carta.par)) return;

    const agora = [...viradas, carta.id];
    setViradas(agora);
    if (agora.length < 2) return;

    // Duas viradas: confere
    setTentativas(t => t + 1);
    const [primeira, segunda] = agora.map(id => cartas.find(c => c.id === id));

    if (primeira.par === segunda.par) {
      const novasAchadas = [...achadas, primeira.par];
      setAchadas(novasAchadas);
      setViradas([]);
      if (novasAchadas.length === pares.length) terminar(tentativas + 1);
    } else {
      travado.current = true;
      setErrou(agora);
      setTimeout(() => {
        setViradas([]);
        setErrou([]);
        travado.current = false;
      }, 900);
    }
  };

  const terminar = async (totalTentativas) => {
    const estrelas = estrelasDaMemoria(totalTentativas, pares.length);
    const pontos = pares.length * PONTOS_POR_ESTRELAS[estrelas];
    const resposta = {
      tentativas: totalTentativas,
      pares: pares.length,
      estrelas,
      acertos: pares.length,
      total: pares.length,
      pontos
    };

    // Deixa o último par aparecer antes de trocar de tela
    setTimeout(async () => {
      try {
        await enviar(resposta, pontos);
      } catch {
        setErroEnvio('Seu jogo terminou, mas não consegui salvar. Avise o professor.');
      }
      setResultado(resposta);
    }, 700);
  };

  if (resultado) {
    return (
      <JogoAluno titulo={atividade?.titulo} voltar={voltar}>
        {erroEnvio && <p className="editor-erro">{erroEnvio}</p>}
        <ResultadoAtividade
          titulo={resultado.estrelas === 3 ? 'Memória de elefante!' : 'Você achou todos!'}
          estrelas={resultado.estrelas}
          pontos={resultado.pontos}
          subtitulo={`${resultado.pares} pares em ${resultado.tentativas} tentativas`}
          voltar={voltar}
        />
      </JogoAluno>
    );
  }

  return (
    <JogoAluno titulo={atividade?.titulo} voltar={voltar}>
      {erro && <p className="editor-erro">{erro}</p>}
      {!conteudo && !erro && <p className="jogo-carregando">Embaralhando as cartas…</p>}

      {conteudo && (
        <>
          <div className="jogo-enunciado">
            <h2>{conteudo.instrucao || 'Ache os pares!'}</h2>
            <p>Vire duas cartas por vez. Menos tentativas, mais estrelas.</p>
          </div>

          <div className="memoria-placar" aria-live="polite">
            <span>Pares: <strong>{achadas.length}</strong> de {pares.length}</span>
            <span>Tentativas: <strong>{tentativas}</strong></span>
          </div>

          <div className="memoria-grade">
            {cartas.map(carta => {
              const achada = achadas.includes(carta.par);
              const virada = viradas.includes(carta.id);
              return (
                <button
                  key={carta.id}
                  className={`memoria-carta ${virada ? 'virada' : ''} ${achada ? 'achada' : ''} ${errou.includes(carta.id) ? 'errou' : ''}`}
                  onClick={() => virar(carta)}
                  disabled={achada}
                  aria-label={virada || achada ? carta.texto : 'Carta virada para baixo'}
                >
                  <span className="memoria-miolo">
                    <span className="memoria-face memoria-costas" aria-hidden="true">?</span>
                    <span className="memoria-face memoria-frente">{carta.texto}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </JogoAluno>
  );
}

export default MemoriaAluno;
