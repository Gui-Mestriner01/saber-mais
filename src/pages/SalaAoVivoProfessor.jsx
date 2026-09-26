import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, SkipForward, Square, Timer, Users, Check, BellRing, UserCheck } from 'lucide-react';
import BarraLateralProfessor from '../components/BarraLateralProfessor';
import '../CSS/Dashboard.css';
import '../CSS/AoVivo.css';
import { API } from '../api';


const ESTILOS = [
  { classe: 'alt-azul',    simbolo: '▲' },
  { classe: 'alt-laranja', simbolo: '◆' },
  { classe: 'alt-verde',   simbolo: '●' },
  { classe: 'alt-roxo',    simbolo: '■' }
];

const TIPOS_AO_VIVO = ['quiz', 'v_f'];

function SalaAoVivoProfessor() {
  const navigate = useNavigate();
  const { salaId } = useParams();
  const token = localStorage.getItem('token');

  const nomeProfessor = localStorage.getItem('nomeUsuario') || 'Professor(a)';
  const idProfessor   = localStorage.getItem('idUsuario');
  const fotoProfessor = idProfessor ? localStorage.getItem(`fotoUsuario_${idProfessor}`) : null;
  const iniciais = nomeProfessor.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

  const [estado, setEstado]         = useState(null);
  const [sala, setSala]             = useState(null);
  const [atividades, setAtividades] = useState([]);
  const [escolhida, setEscolhida]   = useState('');
  const [segundos, setSegundos]     = useState(20);
  const [erro, setErro]             = useState('');
  const [ocupado, setOcupado]       = useState(false);
  const [relogio, setRelogio]       = useState(0);
  const [turma, setTurma]           = useState([]);   // só nas salas permanentes
  const [aviso, setAviso]           = useState('');

  const alvoRef = useRef(0);

  const permanente = sala && sala.tipo_sala !== 'temporaria';

  const cabecalho = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  /* ---- fica consultando o estado da partida ---- */
  useEffect(() => {
    if (!token) { navigate('/login/professor'); return; }
    let vivo = true;

    const consultar = async () => {
      try {
        const res = await fetch(`${API}/live/professor/${salaId}`, { headers: cabecalho });
        const dados = await res.json();
        if (!vivo) return;
        if (!res.ok) { setErro(dados.erro || 'Não consegui abrir esta sala.'); return; }
        setEstado(dados);
        setSala(dados.sala);
        alvoRef.current = Date.now() + (dados.restanteMs || 0);
      } catch {
        /* na próxima volta tenta de novo */
      }
    };

    consultar();
    const id = setInterval(consultar, 1000);
    return () => { vivo = false; clearInterval(id); };
  }, [salaId]);

  /* ---- lista de atividades desta sala ---- */
  useEffect(() => {
    fetch(`${API}/sala/${salaId}/atividades`, { headers: cabecalho })
      .then(r => r.json())
      .then(lista => {
        const validas = Array.isArray(lista) ? lista.filter(a => TIPOS_AO_VIVO.includes(a.tipo)) : [];
        setAtividades(validas);
        if (validas.length > 0) setEscolhida(String(validas[0].id));
      })
      .catch(() => setAtividades([]));
  }, [salaId]);

  /* ---- numa sala permanente, a turma inteira já está cadastrada ----
     É essa lista que deixa o professor ver quem ainda não entrou e chamar
     de novo. Numa sala temporária não existe cadastro, então não busca. */
  useEffect(() => {
    if (!permanente || !token) return;

    const buscar = () => {
      fetch(`${API}/professor/sala/${salaId}/alunos`, { headers: cabecalho })
        .then(r => (r.ok ? r.json() : []))
        .then(lista => setTurma(Array.isArray(lista) ? lista : []))
        .catch(() => setTurma([]));
    };

    buscar();
    const id = setInterval(buscar, 15000); // muda pouco: não precisa correr
    return () => clearInterval(id);
  }, [permanente, salaId]);

  /* ---- cronômetro suave ---- */
  useEffect(() => {
    const id = setInterval(() => {
      setRelogio(Math.max(0, Math.ceil((alvoRef.current - Date.now()) / 1000)));
    }, 200);
    return () => clearInterval(id);
  }, []);

  const comandar = async (rota, corpo = {}) => {
    setOcupado(true);
    setErro('');
    try {
      const res = await fetch(`${API}/live/${rota}`, {
        method: 'POST',
        headers: cabecalho,
        body: JSON.stringify({ sala_id: Number(salaId), ...corpo })
      });
      const dados = await res.json();
      if (!res.ok) { setErro(dados.erro || 'Não deu certo.'); return false; }
      setEstado(atual => ({ ...atual, ...dados }));
      alvoRef.current = Date.now() + (dados.restanteMs || 0);
      return dados;
    } catch {
      setErro('Não consegui falar com o servidor.');
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const chamar = async (alunos = null) => {
    const resposta = await comandar('chamar', { alunos });
    if (resposta === false) return;
    setAviso(alunos
      ? `Convite enviado para ${alunos.length} ${alunos.length === 1 ? 'aluno' : 'alunos'}.`
      : 'Convite enviado para a turma toda.');
    setTimeout(() => setAviso(''), 4000);
  };

  const comecar = () => {
    if (!escolhida) { setErro('Escolha uma atividade.'); return; }
    comandar('iniciar', { atividade_id: Number(escolhida), segundos });
  };

  const encerrar = () => {
    if (!window.confirm('Encerrar a partida? As notas vão para os Relatórios e os alunos voltam para a sala de espera.')) return;
    comandar('encerrar');
  };

  const fecharSala = async () => {
    if (!window.confirm('Fechar a sala ao vivo? Todos os alunos serão desconectados.')) return;
    await comandar('fechar-sala');
    navigate('/professor/salas');
  };

  if (erro && !estado) {
    return (
      <div className="dashboard-container">
        <BarraLateralProfessor ativo="salas" />
        <main className="dashboard-main">
          <div className="aovivo-prof">
            <div className="prof-erro">
              <h2>{erro}</h2>
              <button className="aovivo-btn" onClick={() => navigate('/professor/salas')}>Voltar para as salas</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!estado) {
    return (
      <div className="dashboard-container">
        <BarraLateralProfessor ativo="salas" />
        <main className="dashboard-main">
          <div className="aovivo-prof"><div className="prof-erro"><h2>Abrindo a sala…</h2></div></div>
        </main>
      </div>
    );
  }

  const totalAlunos = estado.jogadores?.length || 0;

  // Quem da turma já está na aula (o id do cadastro viaja junto do jogador)
  const presentes = new Set(
    (estado.jogadores || []).filter(j => j.alunoId).map(j => String(j.alunoId))
  );
  const faltando = turma.filter(a => !presentes.has(String(a.id)));

  return (
    <div className="dashboard-container">
      <BarraLateralProfessor ativo="salas" />

      <main className="dashboard-main">
        <header className="dashboard-header-painel">
          <div className="header-boas-vindas">
            <h1>Partida ao vivo</h1>
            <p>
              {sala?.nome || estado.salaNome} · código <code className="prof-codigo-inline">{estado.codigo}</code>
            </p>
          </div>

          <div className="header-acoes">
            <span className="prof-presentes">
              <Users size={16} strokeWidth={1.9} /> {totalAlunos} {totalAlunos === 1 ? 'aluno' : 'alunos'}
            </span>

            <button className="btn-acao-rapida" onClick={() => navigate('/professor/salas')}>
              <ArrowLeft size={16} strokeWidth={2} /> Salas
            </button>

            <div className="header-avatar-prof" onClick={() => navigate('/professor/perfil')} title="Meu perfil">
              {fotoProfessor
                ? <img src={fotoProfessor} alt={nomeProfessor} />
                : <span>{iniciais}</span>
              }
            </div>
          </div>
        </header>

        <div className="aovivo-prof">
        {erro && <p className="prof-alerta">{erro}</p>}

      {/* ---------------- SALA DE ESPERA ---------------- */}
      {estado.estado === 'lobby' && (
        <div className="prof-palco">
          <section className="prof-painel">
            <h2>Sala de espera</h2>
            <p className="prof-ajuda">
              {permanente
                ? <>Clique em <strong>Chamar a turma</strong>: quem estiver com o Saber+ aberto
                    recebe um aviso na tela e entra com um clique. Dá para chamar quantas vezes
                    quiser enquanto espera.</>
                : <>Peça para a turma abrir a Área do Aluno, procurar o código <strong>{estado.codigo}</strong>,
                    digitar a senha da sala e escolher um avatar. Os nomes aparecem aqui na hora.</>
              }
            </p>

            <div className="prof-campos">
              <label className="prof-campo">
                <span>Atividade</span>
                <select value={escolhida} onChange={e => setEscolhida(e.target.value)}>
                  {atividades.length === 0 && <option value="">Nenhuma atividade compatível</option>}
                  {atividades.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.titulo} · {a.tipo === 'quiz' ? 'Quiz' : 'Verdadeiro ou Falso'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="prof-campo estreito">
                <span><Timer size={14} strokeWidth={1.9} /> Tempo por pergunta</span>
                <select value={segundos} onChange={e => setSegundos(Number(e.target.value))}>
                  {[10, 15, 20, 30, 45, 60].map(s => <option key={s} value={s}>{s} segundos</option>)}
                </select>
              </label>
            </div>

            {atividades.length === 0 && (
              <p className="prof-vazio-aviso">
                O modo ao vivo funciona com Quiz e Verdadeiro ou Falso. Crie uma dessas
                atividades nesta sala para começar a partida.
              </p>
            )}

            <div className="prof-acoes">
              {permanente && (
                <button className="aovivo-btn chamar" onClick={() => chamar(null)} disabled={ocupado}>
                  <BellRing size={17} strokeWidth={2.2} /> Chamar a turma
                </button>
              )}

              <button
                className="aovivo-btn principal"
                onClick={comecar}
                disabled={ocupado || totalAlunos === 0 || atividades.length === 0}
              >
                <Play size={17} strokeWidth={2.2} /> Começar a partida
              </button>
              <button className="aovivo-btn discreto" onClick={fecharSala} disabled={ocupado}>
                Fechar a sala
              </button>
            </div>

            {aviso && <p className="prof-aviso-ok">{aviso}</p>}
            {totalAlunos === 0 && <p className="prof-ajuda pequena">Assim que o primeiro aluno entrar, o botão libera.</p>}
          </section>

          <div className="prof-colunas">
            <section className="prof-painel">
              <h2><UserCheck size={17} strokeWidth={2} /> Na aula ao vivo ({totalAlunos})</h2>
              {totalAlunos === 0 ? (
                <div className="prof-vazio">
                  <span className="prof-pulso" aria-hidden="true" />
                  <p>Ninguém ainda. A lista se enche sozinha.</p>
                </div>
              ) : (
                <ul className="prof-lobby">
                  {estado.jogadores.map(j => (
                    <li key={j.id}>
                      <img src={`/avatares/${j.avatar}`} alt="" />
                      <span>{j.nome}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {permanente && (
              <section className="prof-painel">
                <h2>Turma ({turma.length})</h2>

                {faltando.length > 0 && (
                  <button
                    className="aovivo-btn chamar largo"
                    onClick={() => chamar(faltando.map(a => a.id))}
                    disabled={ocupado}
                  >
                    <BellRing size={16} strokeWidth={2.2} />
                    Chamar os {faltando.length} que faltam
                  </button>
                )}

                {turma.length === 0 ? (
                  <p className="prof-ajuda pequena">Nenhum aluno cadastrado nesta sala ainda.</p>
                ) : (
                  <ul className="prof-chamada">
                    {turma.map(aluno => {
                      const presente = presentes.has(String(aluno.id));
                      return (
                        <li key={aluno.id} className={presente ? 'presente' : ''}>
                          <span className="chamada-nome">{aluno.nome_aluno}</span>
                          {presente ? (
                            <span className="chamada-selo"><Check size={13} strokeWidth={2.6} /> na aula</span>
                          ) : (
                            <button
                              className="chamada-btn"
                              onClick={() => chamar([aluno.id])}
                              disabled={ocupado}
                              title={`Chamar ${aluno.nome_aluno}`}
                            >
                              <BellRing size={13} strokeWidth={2.2} /> Chamar
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}
          </div>
        </div>
      )}

      {/* ---------------- PERGUNTA E REVISÃO ---------------- */}
      {(estado.estado === 'pergunta' || estado.estado === 'revisao') && (
        <div className="prof-palco unico">
          <section className="prof-painel">
            <div className="prof-linha-topo">
              <span className="pergunta-passo">Pergunta {estado.indice + 1} de {estado.total}</span>
              {estado.estado === 'pergunta'
                ? <span className={`pergunta-relogio ${relogio <= 5 ? 'apertando' : ''}`}>{relogio}s</span>
                : <span className="pergunta-relogio fechado">Encerrada</span>
              }
              <span className="prof-respondidos">
                <Check size={15} strokeWidth={2.2} /> {estado.confirmados ?? estado.respondidos ?? 0} de {totalAlunos} confirmaram
              </span>
            </div>

            <h2 className="prof-pergunta">{estado.pergunta?.texto}</h2>
            {estado.pergunta?.imagem && (
              <img className="pergunta-imagem" src={estado.pergunta.imagem} alt="" />
            )}

            <ul className="prof-contagem">
              {estado.pergunta?.alternativas.map((texto, i) => {
                const estilo = ESTILOS[i % ESTILOS.length];
                const quantos = estado.contagem?.[i] || 0;
                const porcento = totalAlunos > 0 ? Math.round((quantos / totalAlunos) * 100) : 0;
                const certa = estado.estado !== 'pergunta' && (estado.gabarito || []).includes(i);

                return (
                  <li key={i} className={certa ? 'certa' : ''}>
                    <span className={`contagem-marca ${estilo.classe}`}>{estilo.simbolo}</span>
                    <span className="contagem-texto">{texto}</span>
                    {estado.estado !== 'pergunta' && (
                      <>
                        <span className="contagem-barra">
                          <span className={estilo.classe} style={{ width: `${porcento}%` }} />
                        </span>
                        <span className="contagem-numero">{quantos}</span>
                      </>
                    )}
                    {certa && <span className="contagem-selo">certa</span>}
                  </li>
                );
              })}
            </ul>

            <div className="prof-acoes">
              {estado.estado === 'pergunta' ? (
                <button className="aovivo-btn" onClick={() => comandar('fechar-pergunta')} disabled={ocupado}>
                  Encerrar o tempo agora
                </button>
              ) : (
                <button className="aovivo-btn principal" onClick={() => comandar('proxima')} disabled={ocupado}>
                  <SkipForward size={17} strokeWidth={2.2} />
                  {estado.indice + 1 >= estado.total ? 'Ver o resultado final' : 'Próxima pergunta'}
                </button>
              )}
              <button className="aovivo-btn discreto" onClick={encerrar} disabled={ocupado}>
                <Square size={15} strokeWidth={2.2} /> Encerrar partida
              </button>
            </div>
          </section>

          {estado.estado !== 'pergunta' && estado.ranking?.length > 0 && (
            <section className="prof-painel">
              <h2>Placar</h2>
              <ol className="prof-placar">
                {estado.ranking.slice(0, 10).map(j => (
                  <li key={j.id}>
                    <span className="fim-pos">{j.posicao}º</span>
                    <img src={`/avatares/${j.avatar}`} alt="" />
                    <span className="fim-nome">{j.nome}</span>
                    <span className="fim-pts">{j.pontos}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}

      {/* ---------------- FIM ---------------- */}
      {estado.estado === 'fim' && (
        <div className="prof-palco unico">
          <section className="prof-painel">
            <h2>Resultado de "{estado.titulo}"</h2>
            <p className="prof-ajuda">
              As notas já foram guardadas e aparecem em Relatórios, junto com as atividades normais.
            </p>

            <div className="podio">
              {estado.ranking.slice(0, 3).map(j => (
                <div key={j.id} className={`podio-lugar lugar-${j.posicao}`}>
                  <img src={`/avatares/${j.avatar}`} alt="" />
                  <strong>{j.nome}</strong>
                  <span className="podio-pts">{j.pontos} pts</span>
                  <div className="podio-degrau">{j.posicao}º</div>
                </div>
              ))}
            </div>

            <ol className="prof-placar">
              {estado.ranking.map(j => (
                <li key={j.id}>
                  <span className="fim-pos">{j.posicao}º</span>
                  <img src={`/avatares/${j.avatar}`} alt="" />
                  <span className="fim-nome">{j.nome}</span>
                  <span className="fim-acertos">{j.acertos} de {estado.total}</span>
                  <span className="fim-pts">{j.pontos}</span>
                </li>
              ))}
            </ol>

            <div className="prof-acoes">
              <button className="aovivo-btn principal" onClick={encerrar} disabled={ocupado}>
                Voltar para a sala de espera
              </button>
              <button className="aovivo-btn discreto" onClick={() => navigate('/professor/relatorios')}>
                Abrir os relatórios
              </button>
            </div>
          </section>
        </div>
      )}
        </div>
      </main>
    </div>
  );
}

export default SalaAoVivoProfessor;
