import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import {
  useAtividadeAluno, JogoAluno, JanelaConfirmar, ResultadoAtividade,
  embaralhar, estrelasPorAproveitamento, CORES_GRUPOS
} from '../components/JogoAluno';

/* ==========================================================================
   ALUNO — SEPARAR EM GRUPOS

   Dois jeitos de jogar, os dois valendo:
   - toque/clique: toca na ficha (ela sobe) e depois toca no grupo;
   - arrastar: pega a ficha com o mouse e solta em cima do grupo.
   Para tirar uma ficha de um grupo, é só tocar nela de novo.

   resposta = { itens: [{ texto, grupoAluno, grupoCerto }], acertos, total, pontos }
   ========================================================================== */

function GruposAluno() {
  const { atividade, conteudo, erro, enviar, voltar } = useAtividadeAluno();

  const [lugar, setLugar] = useState({});         // texto -> índice do grupo (ou ausente = no monte)
  const [ordemBanco, setOrdemBanco] = useState([]);
  const [escolhida, setEscolhida] = useState(null);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erroEnvio, setErroEnvio] = useState('');

  const grupos = conteudo?.grupos || [];

  useEffect(() => {
    if (grupos.length === 0) return;
    setOrdemBanco(embaralhar(grupos.flatMap(g => g.itens)));
  }, [conteudo]);

  const grupoCertoDe = (texto) => grupos.findIndex(g => g.itens.includes(texto));
  const noMonte = ordemBanco.filter(t => lugar[t] === undefined);

  const colocar = (texto, grupo) => {
    setLugar(atual => ({ ...atual, [texto]: grupo }));
    setEscolhida(null);
  };

  const devolver = (texto) => {
    setLugar(atual => {
      const novo = { ...atual };
      delete novo[texto];
      return novo;
    });
  };

  const tocarGrupo = (i) => { if (escolhida) colocar(escolhida, i); };

  const conferir = async () => {
    const itens = ordemBanco.map(texto => ({ texto, grupoAluno: lugar[texto], grupoCerto: grupoCertoDe(texto) }));
    const acertos = itens.filter(it => it.grupoAluno === it.grupoCerto).length;
    const total = itens.length;
    const pontos = acertos * 10;

    setEnviando(true);
    setErroEnvio('');
    try {
      await enviar({ itens, acertos, total, pontos, grupos: grupos.map(g => g.nome) }, pontos);
      setResultado({ itens, acertos, total, pontos });
      setConfirmar(false);
    } catch {
      setErroEnvio('Não consegui enviar. Confira a internet e tente de novo.');
      setConfirmar(false);
    } finally {
      setEnviando(false);
    }
  };

  if (resultado) {
    return (
      <JogoAluno titulo={atividade?.titulo} voltar={voltar}>
        <ResultadoAtividade
          titulo={resultado.acertos === resultado.total ? 'Tudo no lugar certo!' : 'Boa tentativa!'}
          estrelas={estrelasPorAproveitamento(resultado.acertos, resultado.total)}
          pontos={resultado.pontos}
          subtitulo={`${resultado.acertos} de ${resultado.total} no grupo certo`}
          voltar={voltar}
        >
          <h3>Como ficou</h3>
          <div className="grupos-caixas">
            {grupos.map((g, i) => (
              <div key={g.nome} className="grupos-caixa" style={{ '--cor-grupo': CORES_GRUPOS[i], cursor: 'default', minHeight: 0 }}>
                <h3>{g.nome}</h3>
                <div className="grupos-caixa-fichas">
                  {resultado.itens.filter(it => it.grupoAluno === i).map(it => (
                    <span key={it.texto} className={`grupos-ficha ${it.grupoAluno === it.grupoCerto ? 'certo' : 'errado'}`}>
                      {it.texto}
                      {it.grupoAluno !== it.grupoCerto && <small>era de {grupos[it.grupoCerto]?.nome}</small>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ResultadoAtividade>
      </JogoAluno>
    );
  }

  return (
    <JogoAluno titulo={atividade?.titulo} voltar={voltar}>
      {erro && <p className="editor-erro">{erro}</p>}
      {!conteudo && !erro && <p className="jogo-carregando">Misturando os itens…</p>}

      {conteudo && (
        <>
          <div className="jogo-enunciado">
            <h2>{conteudo.enunciado || 'Separe nos grupos'}</h2>
            <p>Toque num item e depois no grupo dele. Pode arrastar também.</p>
          </div>

          <div className="grupos-banco" aria-label="Itens para separar">
            {noMonte.length === 0
              ? <span className="grupos-banco-vazio">Tudo separado! Confira e aperte Terminei.</span>
              : noMonte.map(texto => (
                <button
                  key={texto}
                  className={`grupos-ficha ${escolhida === texto ? 'escolhida' : ''}`}
                  onClick={() => setEscolhida(escolhida === texto ? null : texto)}
                  draggable
                  onDragStart={e => { e.dataTransfer.setData('text/plain', texto); setEscolhida(texto); }}
                  aria-pressed={escolhida === texto}
                >
                  {texto}
                </button>
              ))}
          </div>

          <div className="grupos-caixas">
            {grupos.map((g, i) => (
              <div
                key={g.nome}
                role="button"
                tabIndex={0}
                className={`grupos-caixa ${escolhida ? 'pode-soltar' : ''}`}
                style={{ '--cor-grupo': CORES_GRUPOS[i] }}
                onClick={() => tocarGrupo(i)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tocarGrupo(i); } }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); colocar(e.dataTransfer.getData('text/plain'), i); }}
                aria-label={escolhida ? `Colocar ${escolhida} em ${g.nome}` : g.nome}
              >
                <h3>{g.nome}</h3>
                <div className="grupos-caixa-fichas">
                  {ordemBanco.filter(t => lugar[t] === i).map(texto => (
                    <button
                      key={texto}
                      className="grupos-ficha"
                      onClick={e => { e.stopPropagation(); devolver(texto); }}
                      title="Tocar para tirar daqui"
                    >
                      {texto}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {erroEnvio && <p className="editor-erro" style={{ marginTop: 16 }}>{erroEnvio}</p>}

          <div className="jogo-acoes">
            <button className="jogo-btn" onClick={() => setConfirmar(true)} disabled={noMonte.length > 0}>
              <Check size={20} strokeWidth={2.6} /> Terminei!
            </button>
          </div>
        </>
      )}

      {confirmar && (
        <JanelaConfirmar
          titulo="Enviar sua separação?"
          texto="Depois de enviar não dá mais para mudar."
          aoConfirmar={conferir}
          aoCancelar={() => setConfirmar(false)}
          enviando={enviando}
        />
      )}
    </JogoAluno>
  );
}

export default GruposAluno;
