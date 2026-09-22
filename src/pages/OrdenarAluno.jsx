import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Check, X } from 'lucide-react';
import {
  useAtividadeAluno, JogoAluno, JanelaConfirmar, ResultadoAtividade,
  estrelasPorAproveitamento
} from '../components/JogoAluno';

/* ==========================================================================
   ALUNO — COLOCAR EM ORDEM

   Os itens chegam do servidor JÁ embaralhados e com um código no lugar da
   posição — a ordem certa nunca vem para o navegador. O aluno sobe e desce
   com as setas (mouse, toque e teclado) e manda só a ordem dos códigos.
   O servidor corrige (10 pontos por item no lugar certo) e devolve
   { itens: [{ texto, posicaoAluno, posicaoCerta }], acertos, total, pontos }.
   ========================================================================== */

function OrdenarAluno() {
  const { atividade, conteudo, erro, enviar, voltar } = useAtividadeAluno();

  const [ordem, setOrdem] = useState([]);          // { id, texto }, na ordem do aluno
  const [mexido, setMexido] = useState(null);      // último item movido (brilha)
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erroEnvio, setErroEnvio] = useState('');

  useEffect(() => {
    if (conteudo?.itens) setOrdem(conteudo.itens);
  }, [conteudo]);

  const mover = (i, direcao) => {
    const destino = i + direcao;
    if (destino < 0 || destino >= ordem.length) return;
    const nova = [...ordem];
    [nova[i], nova[destino]] = [nova[destino], nova[i]];
    setOrdem(nova);
    setMexido(nova[destino].id);
  };

  const conferir = async () => {
    setEnviando(true);
    setErroEnvio('');
    try {
      const corrigido = await enviar({ ordem: ordem.map(it => it.id) });
      setResultado(corrigido);
      setConfirmar(false);
    } catch (e) {
      setErroEnvio(e.message || 'Não consegui enviar. Confira a internet e tente de novo.');
      setConfirmar(false);
    } finally {
      setEnviando(false);
    }
  };

  if (resultado) {
    const tudo = resultado.acertos === resultado.total;
    return (
      <JogoAluno titulo={atividade?.titulo} voltar={voltar}>
        <ResultadoAtividade
          titulo={tudo ? 'Ordem perfeita!' : 'Quase lá!'}
          estrelas={estrelasPorAproveitamento(resultado.acertos, resultado.total)}
          pontos={resultado.pontos}
          subtitulo={`${resultado.acertos} de ${resultado.total} no lugar certo`}
          voltar={voltar}
        >
          <h3>A ordem que você montou</h3>
          <ol className="ordem-lista">
            {resultado.itens.map(it => {
              const acertou = it.posicaoAluno === it.posicaoCerta;
              return (
                <li key={it.texto} className={`ordem-item ${acertou ? 'certo' : 'errado'}`}>
                  <span className="ordem-posicao">{it.posicaoAluno}</span>
                  <span className="ordem-texto">
                    {it.texto}
                    {!acertou && <span className="ordem-certa">O lugar certo era o {it.posicaoCerta}º</span>}
                  </span>
                  {acertou ? <Check size={22} strokeWidth={3} color="var(--verde)" /> : <X size={22} strokeWidth={3} color="var(--vermelho)" />}
                </li>
              );
            })}
          </ol>
        </ResultadoAtividade>
      </JogoAluno>
    );
  }

  return (
    <JogoAluno titulo={atividade?.titulo} voltar={voltar}>
      {erro && <p className="editor-erro">{erro}</p>}
      {!conteudo && !erro && <p className="jogo-carregando">Preparando a atividade…</p>}

      {conteudo && (
        <>
          <div className="jogo-enunciado">
            <h2>{conteudo.enunciado || 'Coloque em ordem'}</h2>
            <p>Use as setas para subir e descer. O 1º é o que vem primeiro.</p>
          </div>

          <ol className="ordem-lista">
            {ordem.map(({ id, texto }, i) => (
              <li key={id} className={`ordem-item ${mexido === id ? 'mexeu' : ''}`}>
                <span className="ordem-posicao">{i + 1}</span>
                <span className="ordem-texto">{texto}</span>
                <span className="ordem-setas">
                  <button className="ordem-seta" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${texto}`}>
                    <ArrowUp size={18} strokeWidth={2.4} />
                  </button>
                  <button className="ordem-seta" onClick={() => mover(i, 1)} disabled={i === ordem.length - 1} aria-label={`Descer ${texto}`}>
                    <ArrowDown size={18} strokeWidth={2.4} />
                  </button>
                </span>
              </li>
            ))}
          </ol>

          {erroEnvio && <p className="editor-erro" style={{ marginTop: 16 }}>{erroEnvio}</p>}

          <div className="jogo-acoes">
            <button className="jogo-btn" onClick={() => setConfirmar(true)}>
              <Check size={20} strokeWidth={2.6} /> Terminei!
            </button>
          </div>
        </>
      )}

      {confirmar && (
        <JanelaConfirmar
          titulo="Enviar sua ordem?"
          texto="Depois de enviar não dá mais para mudar."
          aoConfirmar={conferir}
          aoCancelar={() => setConfirmar(false)}
          enviando={enviando}
        />
      )}
    </JogoAluno>
  );
}

export default OrdenarAluno;
