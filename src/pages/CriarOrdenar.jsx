import { useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import EditorAtividade from '../components/EditorAtividade';

/* ==========================================================================
   EDITOR — COLOCAR EM ORDEM

   O professor escreve os itens JÁ na ordem certa. O aluno recebe embaralhado
   e arruma. Serve para ciclo da água, fases da vida, números, os passos de
   uma receita, a sequência de uma história...

   conteudo = { enunciado, itens: ['1º', '2º', '3º', ...] }
   ========================================================================== */

const MIN_ITENS = 3;
const MAX_ITENS = 8;

function CriarOrdenar() {
  const [enunciado, setEnunciado] = useState('');
  const [itens, setItens] = useState(['', '', '']);

  const mudar = (i, valor) => setItens(lista => lista.map((x, j) => (j === i ? valor : x)));

  const mover = (i, direcao) => {
    const destino = i + direcao;
    if (destino < 0 || destino >= itens.length) return;
    setItens(lista => {
      const nova = [...lista];
      [nova[i], nova[destino]] = [nova[destino], nova[i]];
      return nova;
    });
  };

  const validar = () => {
    const preenchidos = itens.map(t => t.trim());
    if (!enunciado.trim()) return 'Escreva o que o aluno precisa ordenar.';
    if (preenchidos.some(t => !t)) return 'Tem item em branco. Preencha ou apague.';
    if (new Set(preenchidos.map(t => t.toLowerCase())).size !== preenchidos.length) {
      return 'Dois itens estão iguais. Cada item precisa ser diferente, senão a correção fica ambígua.';
    }
    return null;
  };

  return (
    <EditorAtividade
      tipo="ordenar"
      nomeTipo="Colocar em ordem"
      explicacao="Escreva os itens na ordem certa. O aluno recebe tudo embaralhado e arruma."
      validar={validar}
      montarConteudo={() => ({ enunciado: enunciado.trim(), itens: itens.map(t => t.trim()) })}
    >
      <section className="editor-cartao">
        <label className="editor-campo">
          <span>O que o aluno vai ordenar?</span>
          <input
            className="editor-input"
            value={enunciado}
            onChange={e => setEnunciado(e.target.value)}
            placeholder="Ex.: Coloque as fases da vida da borboleta em ordem"
          />
        </label>
      </section>

      <section className="editor-cartao">
        <h2>Itens, do primeiro ao último</h2>
        <p className="editor-dica">
          De {MIN_ITENS} a {MAX_ITENS} itens. Use as setas se precisar trocar a posição de algum.
        </p>

        <div className="editor-linhas">
          {itens.map((texto, i) => (
            <div key={i} className="editor-linha">
              <span className="editor-numero">{i + 1}º</span>
              <input
                className="editor-input"
                value={texto}
                onChange={e => mudar(i, e.target.value)}
                placeholder={['Ovo', 'Lagarta', 'Casulo', 'Borboleta'][i] || 'Próximo item'}
                maxLength={80}
              />
              <button className="editor-icone-btn" onClick={() => mover(i, -1)} disabled={i === 0} title="Subir">
                <ArrowUp size={16} strokeWidth={2} />
              </button>
              <button className="editor-icone-btn" onClick={() => mover(i, 1)} disabled={i === itens.length - 1} title="Descer">
                <ArrowDown size={16} strokeWidth={2} />
              </button>
              <button
                className="editor-icone-btn perigo"
                onClick={() => setItens(lista => lista.filter((_, j) => j !== i))}
                disabled={itens.length <= MIN_ITENS}
                title="Apagar"
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>

        <button
          className="editor-adicionar"
          onClick={() => setItens(lista => [...lista, ''])}
          disabled={itens.length >= MAX_ITENS}
        >
          <Plus size={16} strokeWidth={2.2} /> Adicionar item
        </button>
      </section>
    </EditorAtividade>
  );
}

export default CriarOrdenar;
