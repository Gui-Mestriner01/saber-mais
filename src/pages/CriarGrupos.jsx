import { useState } from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import EditorAtividade from '../components/EditorAtividade';
import { CORES_GRUPOS } from '../components/JogoAluno';

/* ==========================================================================
   EDITOR — SEPARAR EM GRUPOS

   De 2 a 3 grupos, cada um com seus itens. O aluno recebe todos os itens
   misturados e coloca cada um no grupo certo. Ex.: Animal / Planta,
   Par / Ímpar, Substantivo / Verbo / Adjetivo.

   conteudo = { enunciado, grupos: [{ nome, itens: ['...', ...] }, ...] }
   ========================================================================== */

const MAX_GRUPOS = 3;
const MAX_ITENS_POR_GRUPO = 8;

const grupoVazio = () => ({ nome: '', itens: [], rascunho: '' });

function CriarGrupos() {
  const [enunciado, setEnunciado] = useState('');
  const [grupos, setGrupos] = useState([grupoVazio(), grupoVazio()]);

  const mudarGrupo = (i, mudancas) =>
    setGrupos(lista => lista.map((g, j) => (j === i ? { ...g, ...mudancas } : g)));

  const adicionarItem = (i) => {
    const g = grupos[i];
    const texto = g.rascunho.trim();
    if (!texto || g.itens.length >= MAX_ITENS_POR_GRUPO) return;
    mudarGrupo(i, { itens: [...g.itens, texto], rascunho: '' });
  };

  const validar = () => {
    if (!enunciado.trim()) return 'Escreva o que o aluno precisa separar.';
    const esquecido = grupos.find(g => g.rascunho.trim());
    if (esquecido) return `Você digitou "${esquecido.rascunho.trim()}" mas não apertou o + para adicionar.`;
    if (grupos.some(g => !g.nome.trim())) return 'Todo grupo precisa de um nome.';
    if (grupos.some(g => g.itens.length === 0)) return 'Todo grupo precisa de pelo menos um item.';
    const todos = grupos.flatMap(g => g.itens.map(t => t.toLowerCase()));
    if (new Set(todos).size !== todos.length) {
      return 'Tem item repetido. Se o mesmo item estiver em dois grupos, o aluno não tem como acertar.';
    }
    if (todos.length < 4) return 'Coloque pelo menos 4 itens no total, senão fica fácil demais.';
    return null;
  };

  return (
    <EditorAtividade
      tipo="grupos"
      nomeTipo="Separar em grupos"
      explicacao="Crie os grupos e os itens de cada um. O aluno recebe tudo misturado e separa."
      validar={validar}
      montarConteudo={() => ({
        enunciado: enunciado.trim(),
        grupos: grupos.map(g => ({ nome: g.nome.trim(), itens: g.itens }))
      })}
    >
      <section className="editor-cartao">
        <label className="editor-campo">
          <span>O que o aluno vai separar?</span>
          <input
            className="editor-input"
            value={enunciado}
            onChange={e => setEnunciado(e.target.value)}
            placeholder="Ex.: Separe os seres vivos em animais e plantas"
          />
        </label>
      </section>

      <section className="editor-cartao">
        <h2>Grupos e seus itens</h2>
        <p className="editor-dica">
          2 ou 3 grupos. Escreva o item e aperte Enter (ou o +) para adicionar.
        </p>

        <div className="editor-grupos">
          {grupos.map((g, i) => (
            <div key={i} className="editor-grupo" style={{ '--cor-grupo': CORES_GRUPOS[i] }}>
              <div className="editor-grupo-topo">
                <input
                  className="editor-input"
                  value={g.nome}
                  onChange={e => mudarGrupo(i, { nome: e.target.value })}
                  placeholder={['Animais', 'Plantas', 'Fungos'][i]}
                  maxLength={30}
                  aria-label={`Nome do grupo ${i + 1}`}
                />
                <button
                  className="editor-icone-btn perigo"
                  onClick={() => setGrupos(lista => lista.filter((_, j) => j !== i))}
                  disabled={grupos.length <= 2}
                  title="Apagar grupo"
                >
                  <Trash2 size={16} strokeWidth={2} />
                </button>
              </div>

              <div className="editor-chips">
                {g.itens.map((item, k) => (
                  <span key={k} className="editor-chip">
                    {item}
                    <button
                      onClick={() => mudarGrupo(i, { itens: g.itens.filter((_, m) => m !== k) })}
                      aria-label={`Tirar ${item}`}
                    >
                      <X size={12} strokeWidth={2.6} />
                    </button>
                  </span>
                ))}
              </div>

              <div className="editor-novo-item">
                <input
                  className="editor-input"
                  value={g.rascunho}
                  onChange={e => mudarGrupo(i, { rascunho: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarItem(i); } }}
                  placeholder={g.itens.length >= MAX_ITENS_POR_GRUPO ? 'Grupo cheio' : 'Novo item'}
                  disabled={g.itens.length >= MAX_ITENS_POR_GRUPO}
                  maxLength={30}
                  aria-label={`Novo item do grupo ${i + 1}`}
                />
                <button className="editor-icone-btn" onClick={() => adicionarItem(i)} title="Adicionar item">
                  <Plus size={16} strokeWidth={2.2} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          className="editor-adicionar"
          onClick={() => setGrupos(lista => [...lista, grupoVazio()])}
          disabled={grupos.length >= MAX_GRUPOS}
        >
          <Plus size={16} strokeWidth={2.2} /> Adicionar grupo
        </button>
      </section>
    </EditorAtividade>
  );
}

export default CriarGrupos;
