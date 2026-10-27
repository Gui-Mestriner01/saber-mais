import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Check, X, Send, Timer, Award, ListChecks,
  ToggleLeft, ListOrdered, CircleAlert, Play, CornerDownRight,
} from 'lucide-react';
import BotaoLeitura from '../acessibilidade/BotaoLeitura';
import {
  useAtividadeAluno, JogoAluno, JanelaConfirmar, ResultadoAtividade, estrelasPorAproveitamento,
} from '../components/JogoAluno';
import { FormaMarca, marca, COR_VERDADEIRO, COR_FALSO } from '../components/MarcasQuiz';
import CorrecaoLista from '../components/CorrecaoLista';
import { API, cabecalhoAluno } from '../api';
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

   27/10/2026 (relatório de usabilidade):
   - Tela de preparo: nada corre antes do aluno tocar em "Começar".
   - Os pontinhos mostram quais perguntas já foram respondidas e quais
     ficaram puladas, e dão para tocar (ir direto para a pergunta).
   - O "Enviar" lista as perguntas em branco e leva até a primeira.
   - Sair no meio pede confirmação (JogoAluno, emAndamento).
   - A correção final mostra o que o aluno respondeu ao lado do certo.
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

function textoDoTempo(perguntas) {
  const tempos = perguntas.map(q => Number(q.tempo) || 0);
  const com = tempos.filter(t => t > 0);
  if (com.length === 0) return 'Sem tempo: responda no seu ritmo.';
  const fmt = (s) => (s < 60 ? `${s} segundos` : `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60}s` : ''}`);
  const min = Math.min(...com), max = Math.max(...com);
  const quanto = min === max ? fmt(min) : `de ${fmt(min)} a ${fmt(max)}`;
  return com.length === tempos.length
    ? `Cada pergunta tem ${quanto} para responder.`
    : `Algumas perguntas têm tempo (${quanto}). As outras são no seu ritmo.`;
}

function ResponderQuiz() {
  const { atividade, conteudo, erro, enviar, voltar, tema, marcarInicio } = useAtividadeAluno();
  const [comecou, setComecou]     = useState(false);   // passou da tela de preparo
  const [visitadas, setVisitadas] = useState({});      // perguntas que já apareceram na tela
  const [revisao, setRevisao]     = useState(null);    // correção completa, vinda do servidor

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

  /* Liga o relógio da pergunta na primeira vez que ela aparece — só depois
     do "Começar". Também marca a pergunta como vista (para os pontinhos). */
  useEffect(() => {
    if (!p || !comecou) return;
    setVisitadas(atual => (atual[idx] ? atual : { ...atual, [idx]: true }));
    if (tempoMs <= 0 || travadas[idx] || inicio[idx]) return;
    setInicio(atual => ({ ...atual, [idx]: Date.now() }));
  }, [idx, p, tempoMs, comecou]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Faz o relógio andar só enquanto tem uma pergunta com tempo na tela. */
  useEffect(() => {
    if (!comecou || tempoMs <= 0 || travada || resultado || confirmar) return;
    const t = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(t);
  }, [idx, tempoMs, travada, resultado, confirmar, comecou]);

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

  /* Ir direto para uma pergunta (pontinhos e "ir para a pergunta X").
     Sair de uma pergunta com tempo encerra ela, igual ao "Próxima". */
  const irPara = (i) => {
    if (i === idx || travadas[i] || esgotou) return;
    if (tempoMs > 0) setTravadas(atual => ({ ...atual, [idx]: true }));
    setIdx(i);
  };

  const respondida = (i) => (tipoDe(perguntas[i]) === 'puzzle' ? !!visitadas[i] : (respostas[i] || []).length > 0);
  const pendentes = perguntas.map((_, i) => i).filter(i => !respondida(i));
  const semResposta = pendentes.length;
  // A primeira em branco que ainda dá para responder (as com tempo encerrado, não).
  const primeiraAberta = pendentes.find(i => !travadas[i]);

  const enviarTudo = async () => {
    setEnviando(true);
    setErroEnvio('');
    try {
      const corrigido = await enviar({ respostas });
      setResultado(corrigido);
      setConfirmar(false);
      // A correção completa (sua resposta × certa) vem da mesma rota da revisão.
      fetch(`${API}/aluno/atividade/${atividade.id}/revisao`, { headers: cabecalhoAluno() })
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (d?.itens) setRevisao(d.itens); })
        .catch(() => {});
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
          {revisao ? <CorrecaoLista itens={revisao} /> : (
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
          )}
        </ResultadoAtividade>
      </JogoAluno>
    );
  }

  /* ---------------------------------------------------------- preparo */
  if (!comecou) {
    const tipos = [...new Set(perguntas.map(tipoDe))];
    const valeTotal = perguntas.reduce((soma, q) => soma + ({ padrao: 10, dobro: 20, nenhum: 0 }[q.pontos] ?? 10), 0);
    return (
      <JogoAluno titulo={atividade?.titulo} voltar={voltar} tema={tema}>
        <div className="qa-preparo">
          <h2>Prepare-se!</h2>
          <p className="qa-preparo-sub">{atividade?.titulo}</p>
          <ul className="qa-preparo-lista">
            <li><ListChecks size={20} strokeWidth={2.2} /> {perguntas.length} {perguntas.length === 1 ? 'pergunta' : 'perguntas'}
              {tipos.length > 1 && ` (${tipos.map(t => NOME_DO_TIPO[t].nome.toLowerCase()).join(', ')})`}</li>
            <li><Timer size={20} strokeWidth={2.2} /> {textoDoTempo(perguntas)}</li>
            <li><Award size={20} strokeWidth={2.2} /> Vale até {valeTotal} pontos</li>
          </ul>
          <p className="qa-preparo-dica">O tempo só começa a contar quando você tocar em “Começar”.</p>
          <button type="button" className="jogo-btn qa-comecar" autoFocus
            onClick={() => { marcarInicio(); setComecou(true); }}>
            <Play size={20} strokeWidth={2.6} fill="currentColor" /> Começar
          </button>
        </div>
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
    <JogoAluno titulo={atividade?.titulo} voltar={voltar} tema={tema} emAndamento={!resultado}>
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

          {/* Verde = respondida · laranja = pulada (já apareceu e ficou em
              branco) · cinza = ainda não vista. Tocar leva até a pergunta. */}
          <div className="qa-pontinhos" role="group" aria-label="Perguntas">
            {perguntas.map((q, i) => {
              const estado = respondida(i) ? 'feita' : visitadas[i] ? 'pulada' : '';
              const fechada = !!travadas[i] && i !== idx;
              return (
                <button
                  key={i}
                  type="button"
                  className={`${estado} ${i === idx ? 'atual' : ''} ${fechada ? 'fechada' : ''}`}
                  onClick={() => irPara(i)}
                  disabled={fechada || esgotou}
                  aria-current={i === idx ? 'step' : undefined}
                  aria-label={`Pergunta ${i + 1}: ${estado === 'feita' ? 'respondida' : estado === 'pulada' ? 'sem resposta' : 'ainda não vista'}${fechada ? ', tempo encerrado' : ''}`}
                  title={`Pergunta ${i + 1}`}
                >
                  {estado === 'feita' && <Check size={10} strokeWidth={4} />}
                </button>
              );
            })}
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
            ? `${semResposta === 1 ? 'Uma pergunta ficou' : `${semResposta} perguntas ficaram`} sem resposta. Depois de enviar não dá para mudar.`
            : 'Depois de enviar não dá para mudar. Valendo!'}
          textoConfirmar={semResposta > 0 ? 'Enviar assim mesmo' : 'Enviar'}
          aoConfirmar={enviarTudo}
          aoCancelar={() => setConfirmar(false)}
          enviando={enviando}
        >
          {semResposta > 0 && (
            <div className="qa-pendentes">
              <p>
                Sem resposta: {pendentes.map(i => `pergunta ${i + 1}${travadas[i] ? ' (tempo encerrado)' : ''}`).join(', ')}.
              </p>
              {primeiraAberta !== undefined && (
                <button type="button" className="qa-ir-pendente"
                  onClick={() => { setConfirmar(false); irPara(primeiraAberta); }}>
                  <CornerDownRight size={16} strokeWidth={2.6} /> Ir para a pergunta {primeiraAberta + 1}
                </button>
              )}
            </div>
          )}
        </JanelaConfirmar>
      )}
    </JogoAluno>
  );
}

export default ResponderQuiz;
