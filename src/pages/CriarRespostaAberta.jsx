import { useState, useRef } from 'react';
import { Plus, Trash2, ImagePlus, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import EditorAtividade from '../components/EditorAtividade';

/* ==========================================================================
   EDITOR — RESPOSTA ABERTA

   ⚠️ Esta é a única atividade que ainda não tem a tela do aluno. O professor
   monta as perguntas aqui, mas quem for responder cairia na tela do quiz,
   que espera alternativas — por isso o salvar está travado de propósito.

   Até a tela do aluno existir, é melhor avisar na cara do que deixar o botão
   dizer "salvo com sucesso" sem salvar nada, que era o que acontecia antes.

   Quando a tela do aluno ficar pronta, basta trocar o `validar` e o
   `montarConteudo` abaixo — o resto já está no formato do servidor
   (tipo 'resposta_aberta', conteudo = { perguntas: [{ texto, imagem }] }).
   ========================================================================== */

let contador = 0;
const novaId = () => `ra${Date.now()}_${contador++}`;

const novaPergunta = () => ({ id: novaId(), texto: '', arquivo: null, previa: null });

function CriarRespostaAberta() {
  const [perguntas, setPerguntas] = useState([novaPergunta()]);
  const campos = useRef({});

  const mudar = (i, mudancas) =>
    setPerguntas(lista => lista.map((p, j) => (j === i ? { ...p, ...mudancas } : p)));

  const mover = (i, direcao) => {
    const destino = i + direcao;
    if (destino < 0 || destino >= perguntas.length) return;
    setPerguntas(lista => {
      const nova = [...lista];
      [nova[i], nova[destino]] = [nova[destino], nova[i]];
      return nova;
    });
  };

  const escolherImagem = (i, file) => {
    if (!file) return;
    mudar(i, { arquivo: file, previa: URL.createObjectURL(file) });
  };

  const validar = () =>
    'A resposta aberta ainda não está liberada para a turma: falta a tela em que o aluno escreve. Por enquanto use outro tipo de atividade.';

  const montarConteudo = () => ({
    perguntas: perguntas.map(p => ({ texto: p.texto.trim(), imagem: null })),
  });

  return (
    <EditorAtividade
      tipo="resposta_aberta"
      nomeTipo="Resposta aberta"
      explicacao="O aluno escreve a resposta com as próprias palavras e você corrige depois, uma por uma."
      validar={validar}
      montarConteudo={montarConteudo}
      rodapeExtra="Ainda em construção: dá para montar as perguntas, mas não para enviar à turma."
    >
      <section className="editor-cartao">
        <p className="editor-aviso">
          <strong>Esta atividade ainda está em construção.</strong> Falta a tela em que o aluno
          escreve a resposta, então ela não pode ser enviada para a turma. Você já pode montar as
          perguntas aqui para ver como fica.
        </p>

        <h2>Perguntas</h2>
        <p className="editor-dica">
          {perguntas.length === 1 ? '1 pergunta' : `${perguntas.length} perguntas`} · a correção é feita por você, à mão.
        </p>

        {perguntas.map((p, i) => (
          <div key={p.id} className="editor-item">
            <div className="editor-item-topo">
              <span className="editor-selo">{i + 1}</span>
              <h3>Pergunta {i + 1}</h3>

              <div className="editor-item-acoes">
                <button className="editor-icone-btn" onClick={() => mover(i, -1)} disabled={i === 0} title="Subir">
                  <ArrowUp size={16} strokeWidth={2} />
                </button>
                <button className="editor-icone-btn" onClick={() => mover(i, 1)} disabled={i === perguntas.length - 1} title="Descer">
                  <ArrowDown size={16} strokeWidth={2} />
                </button>
                <button
                  className="editor-icone-btn perigo"
                  onClick={() => setPerguntas(lista => lista.filter((_, j) => j !== i))}
                  disabled={perguntas.length === 1}
                  title="Apagar pergunta"
                >
                  <Trash2 size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            <label className="editor-campo">
              <span>Enunciado</span>
              <input
                className="editor-input"
                value={p.texto}
                onChange={e => mudar(i, { texto: e.target.value })}
                placeholder="Ex.: Conte com as suas palavras o que aconteceu na história"
                maxLength={300}
              />
            </label>

            <label className="editor-campo">
              <span>Imagem (opcional)</span>
              <div
                className={`editor-imagem pequena ${p.previa ? 'tem-foto' : ''}`}
                onClick={() => campos.current[p.id]?.click()}
              >
                {p.previa ? (
                  <>
                    <img src={p.previa} alt={`imagem da pergunta ${i + 1}`} />
                    <div className="editor-imagem-acoes">
                      <button className="editor-mini-btn" onClick={e => { e.stopPropagation(); campos.current[p.id]?.click(); }}>
                        <RefreshCw size={14} strokeWidth={2.2} /> Trocar
                      </button>
                      <button
                        className="editor-mini-btn perigo"
                        onClick={e => { e.stopPropagation(); mudar(i, { arquivo: null, previa: null }); }}
                      >
                        <Trash2 size={14} strokeWidth={2.2} /> Tirar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <ImagePlus size={24} strokeWidth={1.6} />
                    <p>Clique para adicionar uma imagem</p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                ref={el => { campos.current[p.id] = el; }}
                onChange={e => escolherImagem(i, e.target.files[0])}
              />
            </label>
          </div>
        ))}

        <button className="editor-adicionar" onClick={() => setPerguntas(lista => [...lista, novaPergunta()])}>
          <Plus size={16} strokeWidth={2.2} /> Adicionar pergunta
        </button>
      </section>
    </EditorAtividade>
  );
}

export default CriarRespostaAberta;
