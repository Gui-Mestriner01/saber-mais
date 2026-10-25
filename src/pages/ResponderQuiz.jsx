import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Check, X, Send, Timer, Award, ListChecks,
  ToggleLeft, ListOrdered, CircleAlert,
} from 'lucide-react';
import BotaoLeitura from '../acessibilidade/BotaoLeitura';
import {
  useAtividadeAluno, JogoAluno, JanelaConfirmar, ResultadoAtividade, estrelasPorAproveitamento,
} from '../components/JogoAluno';
import { FormaMarca, marca, COR_VERDADEIRO, COR_FALSO } from '../components/MarcasQuiz';
import '../CSS/ResponderQuiz.css';

/* ==========================================================================
   ALUNO — QUIZ (refeito em 25/10/2026)

   O quiz agora mistura três tipos de pergunta:
   - Quiz ............... toca na(s) alternativa(s)
   - Verdadeiro ou falso  dois botões grandes
   - Puzzle ............. sobe e desce os itens até ficar na ordem certa

   CRONÔMETRO: cada pergunta pode ter um tempo. Ele começa quando a pergunta
   aparece; quando acaba, a pergunta trava e o quiz passa para a próxima
   sozinho (na última, abre o "enviar"). Pergunta com tempo também trava
   quando o aluno avança — senão bastaria voltar para ganhar mais tempo.
   Pergunta "sem tempo" funciona como antes: dá para voltar e trocar.

   O gabarito não vem para o navegador: o servidor corrige e devolve os
   pontos, quais acertou e as respostas certas para a tela de correção.
   ========================================================================== */

const NOME_DO_TIPO = {
  quiz:   { nome: 'Quiz', Icone: ListChecks },
  v_f:    { nome: 'Verdadeiro ou falso', Icone: ToggleLeft },
  puzzle: { nome: 'Puzzle', Icone: ListOrdered },
};

const tipoDe = (p) => (p?.tipo === 'v_f' || p?.tipo === 'puzzle' ? p.tipo : 'quiz');

function textoValor(p) {
  if (p?.pontos === 'dobro') return 'Vale o dobro: 20 pontos';
  if (p?.pontos === 'nenhum') return 'Só para treinar';
  return '10 pontos';
}

/* Relógio redondo que vai esvaziando. */
function Cronometro({ restanteMs, totalMs }) {
  const segundos = Math.max(0, Math.ceil(restanteMs / 1000));
  const fracao = totalMs > 0 ? Math.max(0, Math.min(1, restanteMs / totalMs)) : 0;
  const nivel = segundos <= 5 ? 'pouco' : segundos <= 10 ? 'atencao' : '';
  const R = 22;
  const volta = 2 * Math.PI * R;
  return (
    <div className={`qa-relogio ${nivel}`} role="timer" aria-label={`${segundos} segundos restantes`}>
      <svg viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r={R} className="qa-relogio-fundo" />
        <circle cx="26" cy="26" r={R} className="qa-relogio-anel"
          strokeDasharray={volta} strokeDashoffset={volta * (1 - fracao)} />
      </svg>
      <span>{segundos}</span>
    </div>
  );
}

function ResponderQuiz() {
  const { atividade, conteudo, erro, enviar, voltar, tema } = useAtividadeAluno();

  const [perguntas, setPerguntas] = useState([]);
  const [idx, setIdx]             = useState(0);
  const [respostas, setRespostas] = useState({});   // quiz/v_f: [índices]; puzzle: [ids na ordem do aluno]
  const [inicio, setInicio]       = useState({});   // quando cada pergunta com tempo começou
  const [travadas, setTravadas]   = useState({});   // perguntas que não dá mais para mexer
  const [agora, setAgora]         = useState(Date.now());
  const [esgotou, setEsgotou]     = useState(false); // aviso "o tempo acabou"
  const [mexido, setMexido]       = useState(null);  // item do puzzle que acabou de mexer (brilha)
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando]   = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erroEnvio, setErroEnvio] = useState('');
  const avancando = useRef(false);
  const timerFim = useRef(null);

  useEffect(() => {
    const lista = Array.isArray(conteudo) ? conteudo : (conteudo?.perguntas || []);
    if (!lista.length) return;
    setPerguntas(lista);
    // O puzzle começa na ordem embaralhada que veio do servidor.
    const iniciais = {};
    lista.forEach((p, i) => { if (tipoDe(p) === 'puzzle') iniciais[i] = (p.itens || []).map(it => it.id); });
    setRespostas(iniciais);
  }, [conteudo]);

  const p = perguntas[idx];
  const tipo = tipoDe(p);
  const tempoMs = (Number(p?.tempo) || 0) * 1000;
  const travada = !!travadas[idx];
  const ultima = idx === perguntas.length - 1;

  /* Liga o relógio da pergunta na primeira vez que ela aparece. */
  useEffect(() => {
    if (!p || tempoMs <= 0 || travadas[idx] || inicio[idx]) return;
    setInicio(atual => ({ ...atual, [idx]: Date.now() }));
  }, [idx, p, tempoMs]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Faz o relógio andar só enquanto tem uma pergunta com tempo na tela. */
  useEffect(() => {
    if (tempoMs <= 0 || travada || resultado || confirmar) return;
    const t = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(t);
  }, [idx, tempoMs, travada, resultado, confirmar]);

  const restanteMs = tempoMs > 0 && inicio[idx] ? Math.max(0, tempoMs - (agora - inicio[idx])) : tempoMs;

  /* Acabou o tempo: trava, avisa e segue. O timeout fica guardado num ref
     (e não na limpeza do efeito): travar a pergunta muda as dependências, e
     a limpeza cancelaria o "seguir para a próxima" no meio do caminho. */
  useEffect(() => () => clearTimeout(timerFim.current), []);
  useEffect(() => {
    if (tempoMs <= 0 || travada || !inicio[idx] || restanteMs > 0 || avancando.current) return;
    avancando.current = true;
    setTravadas(atual => ({ ...atual, [idx]: true }));
    setEsgotou(true);
    const daVez = idx;
    timerFim.current = setTimeout(() => {
      setEsgotou(false);
      avancando.current = false;
      if (daVez < perguntas.length - 1) setIdx(daVez + 1);
      else setConfirmar(true);
    }, 1400);
  }, [restanteMs, tempoMs, travada, idx, perguntas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const escolher = (k) => {
    if (travada) return;
    const atual = respostas[idx] || [];
    if (tipo === 'quiz' && p.multiplaEscolha) {
      setRespostas({ ...respostas, [idx]: atual.includes(k) ? atual.filter(x => x !== k) : [...atual, k] });
    } else {
      setRespostas({ ...respostas, [idx]: [k] });
    }
  };

  const moverItem = (k, direcao) => {
    if (travada) return;
    const ordem = [...(respostas[idx] || [])];
    const destino = k + direcao;
    if (destino < 0 || destino >= ordem.length) return;
    [ordem[k], ordem[destino]] = [ordem[destino], ordem[k]];
    setRespostas({ ...respostas, [idx]: ordem });
    setMexido(ordem[destino]);
  };

  const proxima = () => {
    // Na última, só abre o "enviar": se o aluno cancelar, ainda pode mexer
    // (o relógio fica parado enquanto a janela está aberta).
    if (ultima) { setConfirmar(true); return; }
    // Pergunta com tempo não volta: senão era só voltar para ganhar mais tempo.
    if (tempoMs > 0) setTravadas(atual => ({ ...atual, [idx]: true }));
    setIdx(idx + 1);
  };

  const anterior = () => { if (idx > 0 && !travadas[idx - 1]) setIdx(idx - 1); };

  const semResposta = perguntas.filter((q, i) => tipoDe(q) !== 'puzzle' && !(respostas[i] || []).length).length;

  const enviarTudo = async () => {
    setEnviando(true);
    setErroEnvio('');
    try {
      const corrigido = await enviar({ respostas });
      setResultado(corrigido);
      setConfirmar(false);
    } catch (e) {
      setErroEnvio(e.message || 'Não consegui enviar. Confira a internet e tente de novo.');
      setConfirmar(false);
    } finally {
      setEnviando(false);
    }
  };

  /* ---------------------------------------------------------------- */
  if (erro) {
    return (
      <JogoAluno titulo={atividade?.titulo} voltar={voltar} tema={tema}>
        <p className="jogo-carregando">{erro}</p>
      </JogoAluno>
    );
  }

  if (!p) {
    return (
      <JogoAluno titulo={atividade?.titulo} voltar={voltar} tema={tema}>
        <p className="jogo-carregando">Preparando as perguntas…</p>
      </JogoAluno>
    );
  }

  /* ---------------------------------------------------------- resultado */
  if (resultado) {
    const total = resultado.total ?? perguntas.length;
    return (
      <JogoAluno titulo={atividade?.titulo} voltar={voltar} tema={tema}>
        <ResultadoAtividade
          estrelas={estrelasPorAproveitamento(resultado.acertos, total)}
          pontos={resultado.pontos}
          titulo={resultado.acertos === total ? 'Acertou tudo!' : 'Você terminou!'}
          subtitulo={`Você acertou ${resultado.acertos} de ${total} ${total === 1 ? 'pergunta' : 'perguntas'}.`}
          voltar={voltar}
        >
          <ol className="qa-correcao">
            {perguntas.map((q, i) => {
              const certo = resultado.acertou?.[i];
              const certas = resultado.corretas?.[i] || [];
              let resposta = '';
              if (tipoDe(q) === 'puzzle') {
                const textoDe = Object.fromEntries((q.itens || []).map(it => [it.id, it.texto]));
                resposta = certas.map(id => textoDe[id]).filter(Boolean).join(' → ');
              } else {
                resposta = certas.map(k => q.alternativas?.[k]?.texto).filter(Boolean).join(', ');
              }
              return (
                <li key={i} className={certo ? 'certo' : 'errado'}>
                  <span className="qa-correcao-icone">{certo ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}</span>
                  <span className="qa-correcao-texto">
                    <strong>{q.texto}</strong>
                    {!certo && resposta && <em>Resposta certa: {resposta}</em>}
                  </span>
                </li>
              );
            })}
          </ol>
        </ResultadoAtividade>
      </JogoAluno>
    );
  }

  /* ---------------------------------------------------------- pergunta */
  const escolhidas = respostas[idx] || [];
  const { nome: nomeTipo, Icone: IconeTipo } = NOME_DO_TIPO[tipo];

  let leitura = `${p.texto}. `;
  if (tipo === 'v_f') leitura += 'Verdadeiro ou falso?';
  else if (tipo === 'puzzle') leitura += 'Coloque em ordem: ' + (p.itens || []).map(it => it.texto).join(', ') + '.';
  else leitura += 'As opções são: ' + (p.alternativas || []).map((a, k) => `${marca(k).nome}, ${a.texto}`).join('. ') + '.';

  const itensPorId = Object.fromEntries((p.itens || []).map(it => [it.id, it]));

  return (
    <JogoAluno titulo={atividade?.titulo} voltar={voltar} tema={tema}>
      <div className="qa">
        {/* barra: progresso, valor e relógio */}
        <div className="qa-barra">
          <div className="qa-barra-texto">
            <span className="qa-contador">Pergunta {idx + 1} de {perguntas.length}</span>
            <span className={`qa-valor ${p.pontos === 'dobro' ? 'dobro' : p.pontos === 'nenhum' ? 'nenhum' : ''}`}>
              <Award size={14} strokeWidth={2.4} /> {textoValor(p)}
            </span>
          </div>
          <div className="qa-progresso" aria-hidden="true">
            <span style={{ width: `${((idx + 1) / perguntas.length) * 100}%` }} />
          </div>
          {tempoMs > 0 && !travada && <Cronometro restanteMs={restanteMs} totalMs={tempoMs} />}
          {tempoMs > 0 && travada && <span className="qa-relogio-fim"><Timer size={16} strokeWidth={2.4} /> Encerrada</span>}
        </div>

        {/* enunciado */}
        <div className="qa-pergunta">
          <span className={`qa-tipo tipo-${tipo}`}><IconeTipo size={14} strokeWidth={2.4} /> {nomeTipo}</span>
          <h2>{p.texto}</h2>
          <div className="qa-leitura"><BotaoLeitura texto={leitura} /></div>
          {p.imagem && <img src={p.imagem} alt="Imagem da pergunta" className="qa-imagem" />}
          {tipo === 'quiz' && p.multiplaEscolha && <p className="qa-aviso">Pode ter mais de uma certa: marque todas.</p>}
          {tipo === 'puzzle' && <p className="qa-aviso">Use as setas para deixar na ordem certa, de cima para baixo.</p>}
        </div>

        {/* respostas */}
        <div className={`qa-area ${travada ? 'travada' : ''}`}>
          {tipo === 'quiz' && (
            <div className="qa-alternativas">
              {(p.alternativas || []).map((a, k) => {
                const marcada = escolhidas.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    className={`qa-alt ${marcada ? 'marcada' : ''} ${escolhidas.length && !marcada && !p.multiplaEscolha ? 'apagada' : ''}`}
                    style={{ '--cor': marca(k).cor }}
                    aria-pressed={marcada}
                    disabled={travada}
                    onClick={() => escolher(k)}
                  >
                    <span className="qa-alt-marca"><FormaMarca indice={k} tamanho={26} /></span>
                    <span className="qa-alt-texto">{a.texto}</span>
                    <span className="qa-alt-check">{marcada && <Check size={18} strokeWidth={3} />}</span>
                  </button>
                );
              })}
            </div>
          )}

          {tipo === 'v_f' && (
            <div className="qa-vf">
              {[
                { k: 0, nome: 'Verdadeiro', cor: COR_VERDADEIRO, Icone: Check },
                { k: 1, nome: 'Falso',      cor: COR_FALSO,      Icone: X },
              ].map(o => {
                const marcada = escolhidas.includes(o.k);
                return (
                  <button
                    key={o.k}
                    type="button"
                    className={`qa-vf-btn ${marcada ? 'marcada' : ''} ${escolhidas.length && !marcada ? 'apagada' : ''}`}
                    style={{ '--cor': o.cor }}
                    aria-pressed={marcada}
                    disabled={travada}
                    onClick={() => escolher(o.k)}
                  >
                    <span className="qa-vf-icone"><o.Icone size={34} strokeWidth={3} /></span>
                    <span>{o.nome}</span>
                  </button>
                );
              })}
            </div>
          )}

          {tipo === 'puzzle' && (
            <ol className="qa-puzzle">
              {escolhidas.map((id, k) => (
                <li key={id} className={`qa-puzzle-item ${mexido === id ? 'mexido' : ''}`} style={{ '--cor': marca(k).cor }}>
                  <span className="qa-puzzle-pos">{k + 1}º</span>
                  <span className="qa-alt-marca"><FormaMarca indice={k} tamanho={22} /></span>
                  <span className="qa-puzzle-texto">{itensPorId[id]?.texto}</span>
                  <span className="qa-puzzle-setas">
                    <button type="button" onClick={() => moverItem(k, -1)} disabled={travada || k === 0}
                      aria-label={`Subir ${itensPorId[id]?.texto}`}>
                      <ArrowUp size={20} strokeWidth={2.6} />
                    </button>
                    <button type="button" onClick={() => moverItem(k, 1)} disabled={travada || k === escolhidas.length - 1}
                      aria-label={`Descer ${itensPorId[id]?.texto}`}>
                      <ArrowDown size={20} strokeWidth={2.6} />
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          )}

          {esgotou && (
            <div className="qa-esgotou" role="alert">
              <Timer size={30} strokeWidth={2.4} />
              <strong>O tempo acabou!</strong>
              <span>{ultima ? 'Vamos enviar as respostas.' : 'Indo para a próxima…'}</span>
            </div>
          )}
        </div>

        {erroEnvio && <p className="qa-erro"><CircleAlert size={16} strokeWidth={2.4} /> {erroEnvio}</p>}

        <div className="qa-nav">
          <button type="button" className="jogo-btn secundario" onClick={anterior}
            disabled={idx === 0 || !!travadas[idx - 1] || esgotou}
            title={idx > 0 && travadas[idx - 1] ? 'A pergunta anterior tinha tempo e já foi encerrada' : undefined}>
            <ArrowLeft size={18} strokeWidth={2.4} /> Anterior
          </button>

          <div className="qa-pontinhos" aria-hidden="true">
            {perguntas.map((q, i) => (
              <span key={i} className={`${i === idx ? 'atual' : ''} ${(tipoDe(q) === 'puzzle' || (respostas[i] || []).length) ? 'feita' : ''}`} />
            ))}
          </div>

          <button type="button" className={`jogo-btn ${ultima ? '' : 'azul'}`} onClick={proxima} disabled={esgotou}>
            {ultima ? <><Send size={18} strokeWidth={2.4} /> Enviar</> : <>Próxima <ArrowRight size={18} strokeWidth={2.4} /></>}
          </button>
        </div>
      </div>

      {confirmar && (
        <JanelaConfirmar
          titulo="Enviar suas respostas?"
          texto={semResposta > 0
            ? `Ainda ${semResposta === 1 ? 'tem 1 pergunta' : `tem ${semResposta} perguntas`} sem resposta. Depois de enviar não dá para mudar.`
            : 'Depois de enviar não dá para mudar. Valendo!'}
          aoConfirmar={enviarTudo}
          aoCancelar={() => setConfirmar(false)}
          enviando={enviando}
        />
      )}
    </JogoAluno>
  );
}

export default ResponderQuiz;
