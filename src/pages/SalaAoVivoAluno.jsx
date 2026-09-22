import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/AoVivo.css';
import { API, comToken, tokenAluno, acessoSala } from '../api';

// Crachá para falar com a partida: o do aluno logado ou o da senha da sala
const crachaDe = (dados) => (dados?.alunoId ? tokenAluno() : null) || dados?.token || acessoSala(dados?.salaId);


// Cada alternativa tem cor e símbolo. O símbolo existe para quem não
// distingue bem as cores continuar conseguindo jogar.
const ESTILOS = [
  { classe: 'alt-azul',   simbolo: '▲', nome: 'triângulo' },
  { classe: 'alt-laranja', simbolo: '◆', nome: 'losango'   },
  { classe: 'alt-verde',  simbolo: '●', nome: 'círculo'   },
  { classe: 'alt-roxo',   simbolo: '■', nome: 'quadrado'  }
];

function SalaAoVivoAluno() {
  const navigate = useNavigate();

  const [aluno, setAluno]       = useState(null);
  const [estado, setEstado]     = useState(null);
  const [erro, setErro]         = useState('');
  const [entrando, setEntrando] = useState(true);
  const [relogio, setRelogio]   = useState(0);

  // Guardo o id do jogador fora do state também, porque o loop de consulta
  // precisa do valor atualizado sem esperar o React redesenhar a tela.
  const jogadorRef = useRef(null);
  const alvoRef    = useRef(0);

  /* ---- entrar na sala ---- */
  useEffect(() => {
    const salvo = localStorage.getItem('alunoTemporario');
    if (!salvo) { navigate('/aluno/area'); return; }

    const dados = JSON.parse(salvo);
    setAluno(dados);

    const entrar = async () => {
      try {
        const res = await fetch(`${API}/live/entrar`, {
          method: 'POST',
          headers: comToken(crachaDe(dados), { 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            sala_id: dados.salaId,
            nome: dados.nome,
            avatar: dados.avatar,
            // Numa sala permanente o aluno já tem cadastro. Mandando o id,
            // o professor consegue casar quem entrou com a lista da turma.
            aluno_id: dados.alunoId || null,
            jogador_id: localStorage.getItem('jogadorLive') || null
          })
        });
        const corpo = await res.json();
        if (!res.ok) { setErro(corpo.erro || 'Não deu para entrar na sala.'); return; }

        localStorage.setItem('jogadorLive', corpo.jogadorId);
        jogadorRef.current = corpo.jogadorId;
      } catch {
        setErro('Não consegui falar com o servidor. Avise seu professor.');
      } finally {
        setEntrando(false);
      }
    };

    entrar();
  }, []);

  /* ---- ficar perguntando ao servidor o que mudou ---- */
  useEffect(() => {
    if (!aluno || !jogadorRef.current) return;

    let vivo = true;

    const consultar = async () => {
      try {
        const res  = await fetch(`${API}/live/sala/${aluno.salaId}?jogador=${jogadorRef.current}`, { headers: comToken(crachaDe(aluno)) });
        const novo = await res.json();
        if (!vivo) return;
        setEstado(novo);
        alvoRef.current = Date.now() + (novo.restanteMs || 0);
      } catch {
        /* silêncio: na próxima volta tenta de novo */
      }
    };

    consultar();
    const id = setInterval(consultar, 1000);
    return () => { vivo = false; clearInterval(id); };
  }, [aluno, entrando]);

  /* ---- cronômetro suave entre uma consulta e outra ---- */
  useEffect(() => {
    const id = setInterval(() => {
      setRelogio(Math.max(0, Math.ceil((alvoRef.current - Date.now()) / 1000)));
    }, 200);
    return () => clearInterval(id);
  }, []);

  const responder = async (indiceAlternativa) => {
    if (!estado || estado.estado !== 'pergunta' || estado.eu?.respondeu) return;

    // Pinta o botão na hora, sem esperar a resposta do servidor.
    setEstado(atual => ({ ...atual, eu: { ...atual.eu, respondeu: true, escolha: indiceAlternativa } }));

    try {
      await fetch(`${API}/live/responder`, {
        method: 'POST',
        headers: comToken(crachaDe(aluno), { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          sala_id: aluno.salaId,
          jogador_id: jogadorRef.current,
          indice: estado.indice,
          escolha: indiceAlternativa
        })
      });
    } catch {
      /* a próxima consulta corrige a tela */
    }
  };

  // O aluno de sala permanente volta para a página dele; o de sala
  // temporária não tem página nenhuma, então volta para a lista de salas.
  const voltar = () => {
    if (aluno?.voltar) navigate('/aluno/home', { state: aluno.voltar });
    else navigate('/aluno/area');
  };

  const sair = async () => {
    if (!window.confirm('Sair da aula ao vivo?')) return;
    try {
      await fetch(`${API}/live/sair`, {
        method: 'POST',
        headers: comToken(crachaDe(aluno), { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ sala_id: aluno.salaId, jogador_id: jogadorRef.current })
      });
    } catch { /* tudo bem */ }
    localStorage.removeItem('jogadorLive');
    localStorage.removeItem('alunoTemporario');
    voltar();
  };

  /* ================= telas ================= */

  if (entrando) {
    return <TelaAviso titulo="Entrando na sala…" texto="Só um instante." />;
  }

  if (erro) {
    return (
      <TelaAviso titulo="Opa!" texto={erro}>
        <button className="aovivo-btn" onClick={voltar}>Voltar</button>
      </TelaAviso>
    );
  }

  if (!estado || estado.ativa === false) {
    return (
      <TelaAviso titulo="A aula ao vivo terminou" texto="O professor encerrou esta sala.">
        <button className="aovivo-btn" onClick={() => { localStorage.removeItem('jogadorLive'); voltar(); }}>
          Voltar
        </button>
      </TelaAviso>
    );
  }

  return (
    <div className="aovivo-aluno">
      <header className="aovivo-topo">
        <div className="aovivo-marca">
          <span className="marca-saber">Saber</span><span className="marca-mais">+</span>
        </div>
        <span className="aovivo-sala-nome">{estado.salaNome}</span>
        <button className="aovivo-sair" onClick={sair}>Sair</button>
      </header>

      {estado.estado === 'lobby'   && <Espera estado={estado} aluno={aluno} />}
      {estado.estado === 'pergunta' && (
        <Pergunta estado={estado} relogio={relogio} responder={responder} />
      )}
      {estado.estado === 'revisao' && <Revisao estado={estado} />}
      {estado.estado === 'fim'     && <Fim estado={estado} />}
    </div>
  );
}

/* ---------- sala de espera ---------- */
function Espera({ estado, aluno }) {
  const total = estado.jogadores.length;
  return (
    <main className="aovivo-palco">
      <div className="espera-cartao">
        <span className="espera-selo">Sala {estado.codigo}</span>
        <h1>Você está dentro!</h1>
        <p className="espera-texto">
          Esperando o professor começar. Fica de olho na tela — quando a primeira
          pergunta aparecer, quem responde mais rápido ganha mais pontos.
        </p>

        <div className="espera-eu">
          <img src={`/avatares/${aluno.avatar}`} alt="" />
          <strong>{aluno.nome}</strong>
        </div>

        <div className="espera-contador">
          <strong>{total}</strong> {total === 1 ? 'aluno na sala' : 'alunos na sala'}
        </div>

        <ul className="espera-lista">
          {estado.jogadores.map(j => (
            <li key={j.id} className={j.nome === aluno.nome ? 'eu' : ''}>
              <img src={`/avatares/${j.avatar}`} alt="" />
              <span>{j.nome}</span>
            </li>
          ))}
        </ul>

        <div className="espera-pontinhos" aria-hidden="true"><i /><i /><i /></div>
      </div>
    </main>
  );
}

/* ---------- pergunta ---------- */
function Pergunta({ estado, relogio, responder }) {
  const p = estado.pergunta;
  if (!p) return null;

  const respondeu = estado.eu?.respondeu;
  const fracao = estado.segundos > 0 ? Math.max(0, Math.min(1, relogio / estado.segundos)) : 0;

  return (
    <main className="aovivo-palco">
      <div className="pergunta-barra">
        <span className="pergunta-passo">Pergunta {estado.indice + 1} de {estado.total}</span>
        <span className={`pergunta-relogio ${relogio <= 5 ? 'apertando' : ''}`}>{relogio}s</span>
        <span className="pergunta-pontos">{estado.eu?.pontos ?? 0} pts</span>
      </div>

      <div className="pergunta-tempo"><span style={{ width: `${fracao * 100}%` }} /></div>

      <h1 className="pergunta-texto">{p.texto}</h1>
      {p.imagem && <img className="pergunta-imagem" src={p.imagem} alt="" />}

      {respondeu ? (
        <div className="pergunta-enviada">
          <span className="enviada-simbolo" aria-hidden="true">
            {ESTILOS[estado.eu.escolha % ESTILOS.length].simbolo}
          </span>
          <h2>Resposta enviada!</h2>
          <p>Agora é esperar os colegas. Quanto mais cedo você respondeu, mais pontos vale.</p>
        </div>
      ) : (
        <div className={`alternativas ${p.alternativas.length === 2 ? 'duas' : ''}`}>
          {p.alternativas.map((texto, i) => {
            const estilo = ESTILOS[i % ESTILOS.length];
            return (
              <button
                key={i}
                className={`alternativa ${estilo.classe}`}
                onClick={() => responder(i)}
              >
                <span className="alternativa-simbolo" aria-hidden="true">{estilo.simbolo}</span>
                <span className="alternativa-texto">{texto}</span>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}

/* ---------- entre uma pergunta e outra ---------- */
function Revisao({ estado }) {
  const eu = estado.eu || {};
  const gabarito = estado.gabarito || [];
  const certa = estado.pergunta?.alternativas?.[gabarito[0]];

  return (
    <main className="aovivo-palco">
      <div className={`revisao-cartao ${eu.acertou ? 'acertou' : eu.respondeu ? 'errou' : 'passou'}`}>
        <h1>
          {eu.acertou ? 'Acertou!' : eu.respondeu ? 'Passou perto' : 'Tempo esgotado'}
        </h1>

        {eu.acertou
          ? <p className="revisao-ganho animar-pop">+{eu.ganhou} pontos</p>
          : <p className="revisao-certa">Resposta certa: <strong>{certa}</strong></p>
        }

        <div className="revisao-numeros">
          <div><span>{eu.pontos ?? 0}</span><small>pontos</small></div>
          <div><span>{eu.posicao || '—'}º</span><small>lugar</small></div>
          <div><span>{eu.acertos ?? 0}</span><small>acertos</small></div>
        </div>

        <p className="revisao-espera">Esperando o professor liberar a próxima…</p>
      </div>
    </main>
  );
}

/* ---------- pódio final ----------
   A festa é de propósito: são crianças, e o fim da partida é o momento que
   elas esperam. O pódio sobe do 3º para o 1º, os pontos vão subindo no
   contador e o confete só cai depois que o campeão aparece. Quem liga
   "reduzir animações" no menu de acessibilidade vê tudo parado, na hora. */

// Atraso (em ms) de cada degrau, para o pódio montar de baixo para cima.
const ATRASO_LUGAR = { 3: 200, 2: 900, 1: 1600 };

function Fim({ estado }) {
  const eu = estado.eu || {};
  const podio = estado.ranking.slice(0, 3);
  const resto = estado.ranking.slice(3);

  return (
    <main className="aovivo-palco fim-palco">
      <Confete />

      <h1 className="fim-titulo animar-surgir">Fim de jogo!</h1>
      <p className="fim-subtitulo animar-surgir">{estado.titulo}</p>

      <div className="podio">
        {podio.map(j => {
          const atraso = ATRASO_LUGAR[j.posicao] ?? 0;
          return (
            <div
              key={j.id}
              className={`podio-lugar lugar-${j.posicao} ${j.id === eu.id ? 'sou-eu' : ''}`}
              style={{ animationDelay: `${atraso}ms` }}
            >
              {j.posicao === 1 && <Coroa />}
              <img src={`/avatares/${j.avatar}`} alt="" />
              <strong>{j.nome}</strong>
              <span className="podio-pts"><Pontos valor={j.pontos} atraso={atraso + 400} /> pts</span>
              <div className="podio-degrau">{j.posicao}º</div>
            </div>
          );
        })}
      </div>

      <div className="fim-eu animar-subir">
        Você terminou em <strong>{eu.posicao || '—'}º lugar</strong> com{' '}
        <strong>{eu.pontos ?? 0} pontos</strong> e {eu.acertos ?? 0} de {estado.total} acertos.
      </div>

      {resto.length > 0 && (
        <ol className="fim-lista">
          {resto.map((j, i) => (
            <li
              key={j.id}
              className={`animar-subir ${j.id === eu.id ? 'eu' : ''}`}
              style={{ animationDelay: `${2300 + i * 90}ms` }}
            >
              <span className="fim-pos">{j.posicao}º</span>
              <img src={`/avatares/${j.avatar}`} alt="" />
              <span className="fim-nome">{j.nome}</span>
              <span className="fim-pts">{j.pontos}</span>
            </li>
          ))}
        </ol>
      )}

      <p className="fim-aviso">Fique aqui — o professor pode começar outra atividade.</p>
    </main>
  );
}

/* Número que sobe de 0 até o valor final, desacelerando no fim. */
function Pontos({ valor, atraso = 0, duracao = 900 }) {
  const [mostrado, setMostrado] = useState(0);

  useEffect(() => {
    const parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.body.classList.contains('a11y-sem-animacao');
    if (parado) { setMostrado(valor); return; }

    let quadro;
    let inicio;
    const comecar = setTimeout(() => {
      const passo = (agora) => {
        if (!inicio) inicio = agora;
        const p = Math.min(1, (agora - inicio) / duracao);
        setMostrado(Math.round(valor * (1 - Math.pow(1 - p, 3))));
        if (p < 1) quadro = requestAnimationFrame(passo);
      };
      quadro = requestAnimationFrame(passo);
    }, atraso);

    return () => { clearTimeout(comecar); cancelAnimationFrame(quadro); };
  }, [valor, atraso, duracao]);

  return <>{mostrado}</>;
}

/* Coroa do primeiro lugar. Desenhada em SVG para não virar emoji. */
function Coroa() {
  return (
    <svg className="podio-coroa" viewBox="0 0 48 34" aria-hidden="true">
      <path d="M4 30 L2 8 L14 16 L24 2 L34 16 L46 8 L44 30 Z" />
      <circle cx="24" cy="12" r="3" className="coroa-joia" />
    </svg>
  );
}

/* Confete de CSS: papeizinhos caindo, cada um com cor, giro e atraso
   próprios. Sorteados uma vez só (useMemo) para não mudarem a cada
   atualização da tela. */
function Confete() {
  const pecas = useMemo(() => {
    const cores = ['var(--laranja)', 'var(--azul)', 'var(--verde)', 'var(--amarelo)', '#6B4C9A', '#E87BA4'];
    return Array.from({ length: 42 }, (_, i) => ({
      id: i,
      esquerda: Math.random() * 100,
      atraso: 1900 + Math.random() * 2600,
      duracao: 2600 + Math.random() * 1800,
      giro: Math.random() * 360,
      cor: cores[i % cores.length],
      largura: 7 + Math.random() * 6,
      altura: 10 + Math.random() * 8
    }));
  }, []);

  return (
    <div className="confete" aria-hidden="true">
      {pecas.map(p => (
        <i
          key={p.id}
          style={{
            left: `${p.esquerda}%`,
            background: p.cor,
            width: `${p.largura}px`,
            height: `${p.altura}px`,
            animationDelay: `${p.atraso}ms`,
            animationDuration: `${p.duracao}ms`,
            transform: `rotate(${p.giro}deg)`
          }}
        />
      ))}
    </div>
  );
}

function TelaAviso({ titulo, texto, children }) {
  return (
    <div className="aovivo-aluno">
      <main className="aovivo-palco">
        <div className="espera-cartao">
          <h1>{titulo}</h1>
          <p className="espera-texto">{texto}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

export default SalaAoVivoAluno;
