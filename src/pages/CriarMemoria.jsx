import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import EditorAtividade from '../components/EditorAtividade';

/* ==========================================================================
   EDITOR — JOGO DA MEMÓRIA

   Cada par vira duas cartas. O par pode ser igual dos dois lados (bom para
   os pequenos) ou diferente, que é onde fica educativo: conta e resultado,
   palavra em inglês e em português, animal e o som que ele faz...

   conteudo = { instrucao, pares: [{ a, b }, ...] }
   ========================================================================== */

const MIN_PARES = 3;
const MAX_PARES = 8;

function CriarMemoria() {
  const [instrucao, setInstrucao] = useState('');
  const [pares, setPares] = useState([{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }]);

  const mudar = (i, lado, valor) =>
    setPares(lista => lista.map((p, j) => (j === i ? { ...p, [lado]: valor } : p)));

  const validar = () => {
    if (pares.some(p => !p.a.trim() || !p.b.trim())) return 'Tem carta em branco. Preencha os dois lados de cada par.';
    // Se duas cartas diferentes tiverem o mesmo texto, o aluno não teria como
    // saber qual é o par certo.
    const cartas = pares.flatMap((p, i) => [{ t: p.a.trim().toLowerCase(), i }, { t: p.b.trim().toLowerCase(), i }]);
    const repetida = cartas.find((c, k) => cartas.some((o, m) => m !== k && o.t === c.t && o.i !== c.i));
    if (repetida) return `O texto "${repetida.t}" aparece em dois pares diferentes. Cada par precisa ser único.`;
    return null;
  };

  return (
    <EditorAtividade
      tipo="memoria"
      nomeTipo="Jogo da memória"
      explicacao="Cada par vira duas cartas. O aluno vira de duas em duas até achar todos os pares."
      validar={validar}
      montarConteudo={() => ({
        instrucao: instrucao.trim(),
        pares: pares.map(p => ({ a: p.a.trim(), b: p.b.trim() }))
      })}
    >
      <section className="editor-cartao">
        <label className="editor-campo">
          <span>Instrução para o aluno (opcional)</span>
          <input
            className="editor-input"
            value={instrucao}
            onChange={e => setInstrucao(e.target.value)}
            placeholder="Ex.: Ache a conta e o resultado dela"
          />
        </label>
      </section>

      <section className="editor-cartao">
        <h2>Pares de cartas</h2>
        <p className="editor-dica">
          De {MIN_PARES} a {MAX_PARES} pares. Pode usar emoji também: "Cachorro" ↔ "🐶".
        </p>

        <div className="editor-linhas">
          {pares.map((par, i) => (
            <div key={i} className="editor-linha">
              <span className="editor-numero">{i + 1}</span>
              <input
                className="editor-input"
                value={par.a}
                onChange={e => mudar(i, 'a', e.target.value)}
                placeholder={['2 + 2', 'Dog', 'Sol'][i] || 'Carta 1'}
                maxLength={30}
                aria-label={`Par ${i + 1}, primeira carta`}
              />
              <span className="editor-par-seta" aria-hidden="true">↔</span>
              <input
                className="editor-input"
                value={par.b}
                onChange={e => mudar(i, 'b', e.target.value)}
                placeholder={['4', 'Cachorro', 'Estrela'][i] || 'Carta 2'}
                maxLength={30}
                aria-label={`Par ${i + 1}, segunda carta`}
              />
              <button
                className="editor-icone-btn perigo"
                onClick={() => setPares(lista => lista.filter((_, j) => j !== i))}
                disabled={pares.length <= MIN_PARES}
                title="Apagar par"
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>

        <button
          className="editor-adicionar"
          onClick={() => setPares(lista => [...lista, { a: '', b: '' }])}
          disabled={pares.length >= MAX_PARES}
        >
          <Plus size={16} strokeWidth={2.2} /> Adicionar par
        </button>
      </section>
    </EditorAtividade>
  );
}

export default CriarMemoria;
