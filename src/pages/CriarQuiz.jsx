import { useState, useRef } from 'react';
import { Plus, Trash2, Check, ImagePlus, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import EditorAtividade from '../components/EditorAtividade';
import { API } from '../api';

/* ==========================================================================
   EDITOR — QUIZ

   As perguntas ficam uma embaixo da outra, cada uma no seu cartão, igual
   aos outros editores. Antes elas moravam numa barra lateral e só uma
   aparecia por vez, o que escondia metade do trabalho do professor.

   A imagem agora sobe para o servidor na hora de salvar. Antes ia para o
   banco o endereço temporário do navegador (blob:...), que morre assim que
   a aba fecha — a atividade ficava sem imagem para o aluno.

   conteudo = { perguntas: [{ texto, imagem, multiplaEscolha, alternativas }] }
   ========================================================================== */

const MAX_ALTERNATIVAS = 6;
const MIN_ALTERNATIVAS = 2;

/* Cada alternativa tem cor e símbolo próprios: o aluno que ainda lê devagar
   se guia pela forma, e quem não enxerga cor bem não fica sem referência. */
const MARCAS = [
  { cor: '#E23F3F', simbolo: '▲' },
  { cor: '#1368CE', simbolo: '◆' },
  { cor: '#D89E00', simbolo: '●' },
  { cor: '#26890C', simbolo: '■' },
  { cor: '#8B44AC', simbolo: '★' },
  { cor: '#E07820', simbolo: '⬟' },
];

let contador = 0;
const novaId = () => `q${Date.now()}_${contador++}`;

const novaAlternativa = () => ({ id: novaId(), texto: '', correta: false });

const novaPergunta = () => ({
  id: novaId(),
  texto: '',
  arquivo: null,
  previa: null,
  multiplaEscolha: false,
  alternativas: [novaAlternativa(), novaAlternativa(), novaAlternativa(), novaAlternativa()],
});

function CriarQuiz() {
  const [perguntas, setPerguntas] = useState([novaPergunta()]);
  const campos = useRef({});

  const mudarPergunta = (i, mudancas) =>
    setPerguntas(lista => lista.map((p, j) => (j === i ? { ...p, ...mudancas } : p)));

  const mudarAlternativa = (i, a, mudancas) =>
    setPerguntas(lista => lista.map((p, j) => (
      j !== i ? p : { ...p, alternativas: p.alternativas.map((alt, k) => (k === a ? { ...alt, ...mudancas } : alt)) }
    )));

  /* Resposta única: marcar uma desmarca as outras. Múltipla: liga e desliga. */
  const marcarCerta = (i, a) => setPerguntas(lista => lista.map((p, j) => {
    if (j !== i) return p;
    if (p.multiplaEscolha) {
      return { ...p, alternativas: p.alternativas.map((alt, k) => (k === a ? { ...alt, correta: !alt.correta } : alt)) };
    }
    return { ...p, alternativas: p.alternativas.map((alt, k) => ({ ...alt, correta: k === a })) };
  }));

  /* Ao voltar para resposta única, só a primeira marcada continua marcada. */
  const trocarTipoResposta = (i, multipla) => setPerguntas(lista => lista.map((p, j) => {
    if (j !== i) return p;
    if (multipla) return { ...p, multiplaEscolha: true };
    const primeira = p.alternativas.findIndex(a => a.correta);
    return { ...p, multiplaEscolha: false, alternativas: p.alternativas.map((a, k) => ({ ...a, correta: k === primeira })) };
  }));

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
    mudarPergunta(i, { arquivo: file, previa: URL.createObjectURL(file) });
  };

  const validar = () => {
    for (let i = 0; i < perguntas.length; i++) {
      const p = perguntas[i];
      const n = i + 1;
      if (!p.texto.trim()) return `A pergunta ${n} está sem enunciado.`;

      const usadas = p.alternativas.filter(a => a.texto.trim());
      if (usadas.length < MIN_ALTERNATIVAS) return `A pergunta ${n} precisa de pelo menos ${MIN_ALTERNATIVAS} alternativas escritas.`;

      const certas = usadas.filter(a => a.correta);
      if (certas.length === 0) return `Marque a resposta certa da pergunta ${n}.`;
      if (!p.multiplaEscolha && certas.length > 1) return `A pergunta ${n} é de resposta única, mas tem mais de uma marcada.`;
      if (p.multiplaEscolha && certas.length === usadas.length) return `Na pergunta ${n} todas as alternativas estão certas — assim não há o que escolher.`;

      const textos = usadas.map(a => a.texto.trim().toLowerCase());
      if (new Set(textos).size !== textos.length) return `A pergunta ${n} tem duas alternativas iguais.`;
    }
    return null;
  };

  /* Sobe as imagens e só então salva, para o banco guardar o endereço real. */
  const aoSalvar = async (titulo, salaId) => {
    const cracha = { Authorization: `Bearer ${localStorage.getItem('token')}` };

    const prontas = [];
    for (const p of perguntas) {
      let imagem = null;
      if (p.arquivo) {
        const pacote = new FormData();
        pacote.append('imagem', p.arquivo);
        const envio = await fetch(`${API}/professor/pintura/upload`, { method: 'POST', headers: cracha, body: pacote });
        const dados = await envio.json();
        if (!envio.ok) throw new Error(dados.erro || 'Não consegui enviar uma das imagens.');
        imagem = dados.url;
      }
      prontas.push({
        texto: p.texto.trim(),
        imagem,
        multiplaEscolha: p.multiplaEscolha,
        alternativas: p.alternativas
          .filter(a => a.texto.trim())
          .map(a => ({ texto: a.texto.trim(), correta: a.correta })),
      });
    }

    const res = await fetch(`${API}/professor/atividade`, {
      method: 'POST',
      headers: { ...cracha, 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, tipo: 'quiz', sala_id: salaId, conteudo: { perguntas: prontas } }),
    });
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro || 'Não consegui salvar.');
  };

  return (
    <EditorAtividade
      tipo="quiz"
      nomeTipo="Quiz"
      explicacao="Escreva as perguntas e marque a resposta certa de cada uma. O aluno escolhe entre as alternativas."
      validar={validar}
      aoSalvar={aoSalvar}
    >
      <section className="editor-cartao">
        <h2>Perguntas</h2>
        <p className="editor-dica">
          {perguntas.length === 1 ? '1 pergunta' : `${perguntas.length} perguntas`} · de {MIN_ALTERNATIVAS} a {MAX_ALTERNATIVAS} alternativas em cada.
        </p>

        {perguntas.map((p, i) => (
          <div key={p.id} className="editor-item">
            <div className="editor-item-topo">
              <span className="editor-selo">{i + 1}</span>
              <h3>Pergunta {i + 1}</h3>

              <div className="editor-segmentado">
                <button className={!p.multiplaEscolha ? 'ativo' : ''} onClick={() => trocarTipoResposta(i, false)}>
                  Uma resposta
                </button>
                <button className={p.multiplaEscolha ? 'ativo' : ''} onClick={() => trocarTipoResposta(i, true)}>
                  Várias
                </button>
              </div>

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
                onChange={e => mudarPergunta(i, { texto: e.target.value })}
                placeholder="Ex.: Qual é a capital do Brasil?"
                maxLength={200}
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
                        onClick={e => { e.stopPropagation(); mudarPergunta(i, { arquivo: null, previa: null }); }}
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

            <label className="editor-campo">
              <span>Alternativas — clique no ✓ para marcar a certa</span>
              <div className="editor-alternativas">
                {p.alternativas.map((alt, a) => {
                  const marca = MARCAS[a];
                  return (
                    <div
                      key={alt.id}
                      className={`editor-alt ${alt.correta ? 'certa' : ''}`}
                      style={{ '--cor': marca.cor }}
                    >
                      <span className="editor-alt-marca">{marca.simbolo}</span>
                      <input
                        className="editor-input"
                        value={alt.texto}
                        onChange={e => mudarAlternativa(i, a, { texto: e.target.value })}
                        placeholder={`Alternativa ${a + 1}${a >= 4 ? ' (opcional)' : ''}`}
                        maxLength={140}
                      />
                      <button
                        className={`editor-alt-certa ${alt.correta ? 'marcada' : ''}`}
                        onClick={() => marcarCerta(i, a)}
                        title={alt.correta ? 'Esta é a resposta certa' : 'Marcar como certa'}
                      >
                        <Check size={16} strokeWidth={3} />
                      </button>
                      {p.alternativas.length > MIN_ALTERNATIVAS && (
                        <button
                          className="editor-icone-btn perigo"
                          onClick={() => mudarPergunta(i, { alternativas: p.alternativas.filter((_, k) => k !== a) })}
                          title="Apagar alternativa"
                        >
                          <Trash2 size={15} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </label>

            <button
              className="editor-adicionar"
              onClick={() => mudarPergunta(i, { alternativas: [...p.alternativas, novaAlternativa()] })}
              disabled={p.alternativas.length >= MAX_ALTERNATIVAS}
            >
              <Plus size={16} strokeWidth={2.2} /> Adicionar alternativa
            </button>
          </div>
        ))}

        <button className="editor-adicionar" onClick={() => setPerguntas(lista => [...lista, novaPergunta()])}>
          <Plus size={16} strokeWidth={2.2} /> Adicionar pergunta
        </button>
      </section>
    </EditorAtividade>
  );
}

export default CriarQuiz;
