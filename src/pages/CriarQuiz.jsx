import { useState, useRef, useEffect } from 'react';
import {
  Plus, Trash2, Check, X, ImagePlus, RefreshCw, ArrowUp, ArrowDown, Copy,
  ListChecks, ToggleLeft, ListOrdered, Timer, Award, LayoutGrid,
  SlidersHorizontal, Palette, ChevronDown, GripVertical, Info, CircleAlert,
} from 'lucide-react';
import EditorAtividade, { usarConteudoInicial } from '../components/EditorAtividade';
import { CenaTema, SeletorTema, usarTemaEditor } from '../components/TemaFundo';
import { FormaMarca, marca, COR_VERDADEIRO, COR_FALSO } from '../components/MarcasQuiz';
import { API } from '../api';

/* ==========================================================================
   EDITOR — QUIZ (refeito em 25/10/2026)

   Inspirado no jeito de montar quiz dos jogos de sala de aula, com a cara do
   Saber+: à esquerda a lista de perguntas, no meio a pergunta como o aluno
   vai ver (em cima do tema de fundo escolhido) e à direita as propriedades
   da pergunta e o tema.

   Agora o quiz mistura três tipos de pergunta:
   - Quiz ............... alternativas, uma ou várias certas
   - Verdadeiro ou falso  (antes era uma atividade separada)
   - Puzzle ............. o aluno põe os itens na ordem certa

   E cada pergunta tem seu tempo (ou "sem tempo") e quanto vale.

   conteudo = { perguntas: [{
     tipo: 'quiz' | 'v_f' | 'puzzle',
     texto, imagem, tempo (segundos, 0 = sem tempo), pontos ('padrao'|'dobro'|'nenhum'),
     multiplaEscolha, alternativas: [{ texto, correta }]   ← quiz e v_f
     itens: ['primeiro', 'segundo', ...]                  ← puzzle, na ordem certa
   }] }

   O V/F é guardado como um quiz de duas alternativas ("Verdadeiro" e
   "Falso"), então a correção, o modo ao vivo e os relatórios já entendem.
   ========================================================================== */

const MAX_ALTERNATIVAS = 6;
const MIN_ALTERNATIVAS = 2;
const MIN_ITENS = 3;
const MAX_ITENS = 6;

const TIPOS = [
  { id: 'quiz',   nome: 'Quiz',                Icone: ListChecks,  descricao: 'O aluno escolhe entre as alternativas.' },
  { id: 'v_f',    nome: 'Verdadeiro ou falso', Icone: ToggleLeft,  descricao: 'Uma afirmação: certa ou errada?' },
  { id: 'puzzle', nome: 'Puzzle',              Icone: ListOrdered, descricao: 'O aluno coloca os itens na ordem certa.' },
];
const tipoInfo = (id) => TIPOS.find(t => t.id === id) || TIPOS[0];

const TEMPOS = [
  { valor: 0,   nome: 'Sem tempo' },
  { valor: 5,   nome: '5 segundos' },
  { valor: 10,  nome: '10 segundos' },
  { valor: 15,  nome: '15 segundos' },
  { valor: 20,  nome: '20 segundos' },
  { valor: 30,  nome: '30 segundos' },
  { valor: 45,  nome: '45 segundos' },
  { valor: 60,  nome: '1 minuto' },
  { valor: 90,  nome: '1 minuto e 30 segundos' },
  { valor: 120, nome: '2 minutos' },
  { valor: 180, nome: '3 minutos' },
  { valor: 240, nome: '4 minutos' },
];
const TEMPO_PADRAO = 20;
const nomeTempo = (s) => (s > 0 ? (s < 60 ? `${s}s` : `${Math.floor(s / 60)}min${s % 60 ? ` ${s % 60}s` : ''}`) : 'Livre');

const PONTOS = [
  { id: 'padrao', nome: 'Padrão',          descricao: 'A resposta certa vale 10 pontos.' },
  { id: 'dobro',  nome: 'Pontos em dobro', descricao: 'A resposta certa vale 20 pontos.' },
  { id: 'nenhum', nome: 'Nenhum ponto',    descricao: 'Vale para treinar: conta o acerto, mas não dá pontos.' },
];

const RESPOSTAS = [
  { id: 'unica',    nome: 'Seleção única',    descricao: 'O aluno marca só uma resposta.' },
  { id: 'multipla', nome: 'Múltipla escolha', descricao: 'O aluno pode marcar mais de uma antes de enviar.' },
];

let contador = 0;
const novaId = () => `q${Date.now()}_${contador++}`;

const novaAlternativa = (texto = '') => ({ id: novaId(), texto, correta: false });
const novoItem = (texto = '') => ({ id: novaId(), texto });

/* Cada pergunta guarda os dados dos três tipos. Assim o professor pode
   trocar o tipo e voltar sem perder o que já tinha escrito; só o tipo
   escolhido vai para o banco. */
const novaPergunta = (tipo = 'quiz', tempo = TEMPO_PADRAO) => ({
  id: novaId(),
  tipo,
  texto: '',
  arquivo: null,
  previa: null,
  imagemUrl: null,
  tempo,
  pontos: 'padrao',
  multiplaEscolha: false,
  alternativas: [novaAlternativa(), novaAlternativa(), novaAlternativa(), novaAlternativa()],
  vf: null,
  itens: [novoItem(), novoItem(), novoItem(), novoItem()],
});

/* Do banco para a tela. Pergunta antiga, sem tipo/tempo/pontos, vira um
   quiz sem tempo valendo 10 — exatamente como ela funcionava. */
function deConteudo(conteudo) {
  const lista = Array.isArray(conteudo) ? conteudo : (conteudo?.perguntas || []);
  if (lista.length === 0) return null;

  return lista.map(p => {
    const tipo = p?.tipo === 'v_f' || p?.tipo === 'puzzle' ? p.tipo : 'quiz';
    const base = novaPergunta(tipo, Number(p?.tempo) > 0 ? Number(p.tempo) : 0);
    const alternativas = (p?.alternativas || []).map(a => ({
      id: novaId(),
      texto: typeof a === 'object' ? String(a?.texto ?? '') : String(a ?? ''),
      correta: !!(a && a.correta),
    }));

    return {
      ...base,
      texto: String(p?.texto ?? ''),
      previa: p?.imagem || null,
      imagemUrl: p?.imagem || null,
      pontos: ['padrao', 'dobro', 'nenhum'].includes(p?.pontos) ? p.pontos : 'padrao',
      multiplaEscolha: tipo === 'quiz' && (!!p?.multiplaEscolha || alternativas.filter(a => a.correta).length > 1),
      alternativas: tipo === 'quiz' && alternativas.length ? alternativas : base.alternativas,
      vf: tipo === 'v_f' ? (alternativas[0]?.correta ? 'V' : alternativas[1]?.correta ? 'F' : null) : null,
      itens: tipo === 'puzzle' && (p?.itens || []).length ? p.itens.map(t => novoItem(String(t ?? ''))) : base.itens,
    };
  });
}

/* --------------------------------------------------------------------------
   Lista suspensa com título e explicação em cada opção (tipo, pontos e
   opções de resposta). Fecha com Esc ou clicando fora.
   -------------------------------------------------------------------------- */
function Escolha({ rotulo, Icone, opcoes, valor, aoMudar }) {
  const [aberta, setAberta] = useState(false);
  const caixa = useRef(null);
  const atual = opcoes.find(o => o.id === valor) || opcoes[0];

  useEffect(() => {
    if (!aberta) return;
    const fora = (e) => { if (!caixa.current?.contains(e.target)) setAberta(false); };
    const esc = (e) => { if (e.key === 'Escape') setAberta(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberta]);

  return (
    <div className="quiz-prop" ref={caixa}>
      <span className="quiz-prop-rotulo"><Icone size={16} strokeWidth={2} /> {rotulo}</span>
      <button type="button" className="quiz-escolha" aria-haspopup="listbox" aria-expanded={aberta} onClick={() => setAberta(a => !a)}>
        {atual.Icone && <atual.Icone size={17} strokeWidth={2} />}
        <span>{atual.nome}</span>
        <ChevronDown size={18} strokeWidth={2} className={aberta ? 'virado' : ''} />
      </button>

      {aberta && (
        <ul className="quiz-escolha-lista" role="listbox" aria-label={rotulo}>
          {opcoes.map(o => (
            <li key={o.id}>
              <button
                type="button"
                role="option"
                aria-selected={o.id === valor}
                className={o.id === valor ? 'ativo' : ''}
                onClick={() => { aoMudar(o.id); setAberta(false); }}
              >
                {o.Icone && <span className="quiz-escolha-icone"><o.Icone size={18} strokeWidth={2} /></span>}
                <span className="quiz-escolha-texto">
                  <strong>{o.nome}</strong>
                  {o.descricao && <em>{o.descricao}</em>}
                </span>
                {o.id === valor && <Check size={17} strokeWidth={2.6} className="quiz-escolha-check" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Campo de texto que cresce com o conteúdo (o enunciado). */
function TextoQueCresce({ valor, aoMudar, ...resto }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [valor]);
  return <textarea ref={ref} rows={1} value={valor} onChange={e => aoMudar(e.target.value)} {...resto} />;
}

/* --------------------------------------------------------------------------
   Miniatura da pergunta na lista da esquerda
   -------------------------------------------------------------------------- */
function Miniatura({ p, i, ativa, total, aoEscolher, aoMover, comProblema = false }) {
  const { Icone, nome } = tipoInfo(p.tipo);
  const barras = p.tipo === 'v_f' ? 2 : p.tipo === 'puzzle' ? p.itens.length : p.alternativas.length;

  return (
    <li className={`quiz-mini ${ativa ? 'ativa' : ''} ${comProblema ? 'com-problema' : ''}`}>
      <span className="quiz-mini-num">{i + 1}</span>
      <button type="button" className="quiz-mini-cartao" onClick={aoEscolher} aria-current={ativa ? 'true' : undefined}
        aria-label={`Pergunta ${i + 1}, ${nome}${p.texto ? `: ${p.texto}` : ''}`}>
        <span className="quiz-mini-topo">
          <Icone size={13} strokeWidth={2.2} /> {nome}
        </span>
        <span className="quiz-mini-texto">{p.texto.trim() || 'Pergunta sem texto'}</span>
        <span className="quiz-mini-meio">
          <span className="quiz-mini-tempo"><Timer size={11} strokeWidth={2.4} /> {nomeTempo(p.tempo)}</span>
          {p.previa ? <img src={p.previa} alt="" /> : <span className="quiz-mini-foto"><ImagePlus size={13} strokeWidth={2} /></span>}
        </span>
        <span className={`quiz-mini-barras ${p.tipo === 'puzzle' ? 'em-coluna' : ''}`}>
          {Array.from({ length: barras }, (_, k) => (
            <span key={k} style={{ background: p.tipo === 'v_f' ? (k === 0 ? COR_VERDADEIRO : COR_FALSO) : marca(k).cor }} />
          ))}
        </span>
      </button>
      <span className="quiz-mini-mover">
        <button type="button" onClick={() => aoMover(-1)} disabled={i === 0} title="Subir pergunta" aria-label={`Subir a pergunta ${i + 1}`}>
          <ArrowUp size={13} strokeWidth={2.4} />
        </button>
        <button type="button" onClick={() => aoMover(1)} disabled={i === total - 1} title="Descer pergunta" aria-label={`Descer a pergunta ${i + 1}`}>
          <ArrowDown size={13} strokeWidth={2.4} />
        </button>
      </span>
    </li>
  );
}

/* --------------------------------------------------------------------------
   A parte do quiz que mora dentro do EditorAtividade. Fica num componente
   separado porque precisa do tema, que o EditorAtividade guarda.
   -------------------------------------------------------------------------- */
function EstudioQuiz({ perguntas, setPerguntas, atual, setAtual, mostrarProblemas = false }) {
  const { tema, setTema } = usarTemaEditor();
  const [aba, setAba] = useState('pergunta');
  const [menuNova, setMenuNova] = useState(false);
  const campoImagem = useRef(null);
  const menuRef = useRef(null);

  const p = perguntas[atual] || perguntas[0];

  useEffect(() => {
    if (!menuNova) return;
    const fora = (e) => { if (!menuRef.current?.contains(e.target)) setMenuNova(false); };
    const esc = (e) => { if (e.key === 'Escape') setMenuNova(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [menuNova]);

  const mudar = (mudancas) => setPerguntas(lista => lista.map((q, j) => (j === atual ? { ...q, ...mudancas } : q)));

  const adicionar = (tipo) => {
    // A pergunta nova herda o tempo da atual: quem usa 30s em todas não precisa trocar uma por uma.
    const nova = novaPergunta(tipo, p ? p.tempo : TEMPO_PADRAO);
    // Lista vazia: a primeira entra na posição 0; senão, logo depois da atual.
    const posicao = perguntas.length ? atual + 1 : 0;
    setPerguntas(lista => [...lista.slice(0, posicao), nova, ...lista.slice(posicao)]);
    setAtual(posicao);
    setMenuNova(false);
  };

  const duplicar = () => {
    const copia = {
      ...p,
      id: novaId(),
      alternativas: p.alternativas.map(a => ({ ...a, id: novaId() })),
      itens: p.itens.map(it => ({ ...it, id: novaId() })),
    };
    setPerguntas(lista => [...lista.slice(0, atual + 1), copia, ...lista.slice(atual + 1)]);
    setAtual(atual + 1);
  };

  const excluir = () => {
    if (perguntas.length === 1) return;
    setPerguntas(lista => lista.filter((_, j) => j !== atual));
    setAtual(Math.max(0, atual - 1));
  };

  const mover = (i, direcao) => {
    const destino = i + direcao;
    if (destino < 0 || destino >= perguntas.length) return;
    setPerguntas(lista => {
      const nova = [...lista];
      [nova[i], nova[destino]] = [nova[destino], nova[i]];
      return nova;
    });
    if (atual === i) setAtual(destino);
    else if (atual === destino) setAtual(i);
  };

  const escolherImagem = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    mudar({ arquivo: file, previa: URL.createObjectURL(file), imagemUrl: null });
  };

  /* ---- alternativas (quiz) ---- */
  const mudarAlternativa = (k, mudancas) =>
    mudar({ alternativas: p.alternativas.map((a, j) => (j === k ? { ...a, ...mudancas } : a)) });

  const marcarCerta = (k) => {
    if (p.multiplaEscolha) mudarAlternativa(k, { correta: !p.alternativas[k].correta });
    else mudar({ alternativas: p.alternativas.map((a, j) => ({ ...a, correta: j === k })) });
  };

  const trocarRespostas = (id) => {
    if (id === 'multipla') { mudar({ multiplaEscolha: true }); return; }
    // Voltando para seleção única, só a primeira marcada continua marcada.
    const primeira = p.alternativas.findIndex(a => a.correta);
    mudar({ multiplaEscolha: false, alternativas: p.alternativas.map((a, j) => ({ ...a, correta: j === primeira })) });
  };

  /* ---- itens (puzzle) ---- */
  const mudarItem = (k, texto) => mudar({ itens: p.itens.map((it, j) => (j === k ? { ...it, texto } : it)) });
  const moverItem = (k, direcao) => {
    const destino = k + direcao;
    if (destino < 0 || destino >= p.itens.length) return;
    const nova = [...p.itens];
    [nova[k], nova[destino]] = [nova[destino], nova[k]];
    mudar({ itens: nova });
  };

  const aplicarTempoEmTodas = () => setPerguntas(lista => lista.map(q => ({ ...q, tempo: p.tempo })));

  /* Quiz novo, ainda sem pergunta: o tipo é escolhido aqui, uma vez só.
     (Antes o tipo aparecia em dois lugares — no "Adicionar pergunta" e no
     painel da direita. Agora o tipo é escolhido só na hora de criar.) */
  if (!p) {
    return (
      <section className="quiz-estudio quiz-estudio-vazio" aria-label="Montagem do quiz">
        <div className={`quiz-palco ${tema ? 'com-cenario' : ''}`}>
          <CenaTema tema={tema} modo="caixa" />
          <div className="quiz-palco-conteudo quiz-comecar">
            <h2>Qual vai ser a primeira pergunta?</h2>
            <p>Escolha o tipo. Depois, use “Adicionar pergunta” para as próximas — dá para misturar os três.</p>
            <div className="quiz-comecar-tipos">
              {TIPOS.map(t => (
                <button key={t.id} type="button" onClick={() => adicionar(t.id)}>
                  <span className={`quiz-tipo-icone tipo-${t.id}`}><t.Icone size={26} strokeWidth={2} /></span>
                  <strong>{t.nome}</strong>
                  <em>{t.descricao}</em>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }
  const { nome: nomeDoTipo } = tipoInfo(p.tipo);

  return (
    <section className="quiz-estudio" aria-label="Montagem do quiz">
      {/* ---------------------------------------------------- lista */}
      <aside className="quiz-lista">
        <div className="quiz-lista-topo">
          <strong>Perguntas</strong>
          <span>{perguntas.length}</span>
        </div>

        <ol className="quiz-lista-itens">
          {perguntas.map((q, i) => (
            <Miniatura
              key={q.id}
              p={q}
              i={i}
              total={perguntas.length}
              ativa={i === atual}
              comProblema={mostrarProblemas && !!problemaDaPergunta(q)}
              aoEscolher={() => setAtual(i)}
              aoMover={(d) => mover(i, d)}
            />
          ))}
        </ol>

        <div className="quiz-nova" ref={menuRef}>
          <button type="button" className="quiz-nova-btn" onClick={() => setMenuNova(m => !m)} aria-expanded={menuNova}>
            <Plus size={18} strokeWidth={2.4} /> Adicionar pergunta
          </button>
          {menuNova && (
            <div className="quiz-nova-menu" role="menu">
              <p>Que tipo de pergunta?</p>
              {TIPOS.map(t => (
                <button key={t.id} type="button" role="menuitem" onClick={() => adicionar(t.id)}>
                  <span className={`quiz-tipo-icone tipo-${t.id}`}><t.Icone size={20} strokeWidth={2} /></span>
                  <span><strong>{t.nome}</strong><em>{t.descricao}</em></span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ---------------------------------------------------- palco */}
      <div className={`quiz-palco ${tema ? 'com-cenario' : ''}`}>
        <CenaTema tema={tema} modo="caixa" />

        <div className="quiz-palco-conteudo">
          {/* Depois de tentar salvar: o que falta NESTA pergunta, ao vivo
              (some sozinho quando corrigir). */}
          {mostrarProblemas && problemaDaPergunta(p) && (
            <div className="quiz-problema" role="alert" data-erro-inline>
              <CircleAlert size={18} strokeWidth={2.4} />
              <span><strong>Falta arrumar:</strong> {problemaDaPergunta(p)}</span>
            </div>
          )}

          <div className="quiz-palco-selo">
            Pergunta {atual + 1} de {perguntas.length} · {nomeDoTipo}
          </div>

          <TextoQueCresce
            className="quiz-enunciado"
            valor={p.texto}
            aoMudar={(texto) => mudar({ texto })}
            placeholder={p.tipo === 'v_f' ? 'Escreva a afirmação' : 'Comece a digitar a pergunta'}
            maxLength={240}
            aria-label={`Texto da pergunta ${atual + 1}`}
          />

          <div className={`quiz-corpo tipo-${p.tipo}`}>
            {/* imagem */}
            <div
              className={`quiz-midia ${p.previa ? 'tem-foto' : ''}`}
              onClick={() => !p.previa && campoImagem.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); escolherImagem(e.dataTransfer.files[0]); }}
              role={p.previa ? undefined : 'button'}
              tabIndex={p.previa ? undefined : 0}
              onKeyDown={e => { if (!p.previa && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); campoImagem.current?.click(); } }}
              aria-label={p.previa ? undefined : 'Adicionar uma imagem à pergunta'}
            >
              {p.previa ? (
                <>
                  <img src={p.previa} alt={`Imagem da pergunta ${atual + 1}`} />
                  <div className="quiz-midia-acoes">
                    <button type="button" className="editor-mini-btn" onClick={() => campoImagem.current?.click()}>
                      <RefreshCw size={14} strokeWidth={2.2} /> Trocar
                    </button>
                    <button type="button" className="editor-mini-btn perigo" onClick={() => mudar({ arquivo: null, previa: null, imagemUrl: null })}>
                      <Trash2 size={14} strokeWidth={2.2} /> Tirar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="quiz-midia-icone"><ImagePlus size={26} strokeWidth={1.7} /></span>
                  <strong>Adicionar imagem</strong>
                  <small>Clique ou arraste uma imagem até aqui (opcional)</small>
                </>
              )}
              <input
                ref={campoImagem}
                type="file"
                accept="image/*"
                hidden
                onChange={e => { escolherImagem(e.target.files[0]); e.target.value = ''; }}
              />
            </div>

            {/* ---------- respostas do QUIZ ---------- */}
            {p.tipo === 'quiz' && (
              <div className="quiz-respostas-area">
                <div className="quiz-respostas">
                  {p.alternativas.map((a, k) => (
                    <div key={a.id} className={`quiz-resposta ${a.correta ? 'certa' : ''}`} style={{ '--cor': marca(k).cor }}>
                      <span className="quiz-resposta-marca" title={marca(k).nome}><FormaMarca indice={k} /></span>
                      <input
                        value={a.texto}
                        onChange={e => mudarAlternativa(k, { texto: e.target.value })}
                        placeholder={`Resposta ${k + 1}${k >= MIN_ALTERNATIVAS ? ' (opcional)' : ''}`}
                        maxLength={120}
                        aria-label={`Resposta ${k + 1} (${marca(k).nome})`}
                      />
                      {k >= MIN_ALTERNATIVAS && p.alternativas.length > MIN_ALTERNATIVAS && (
                        <button type="button" className="quiz-resposta-tirar" title="Tirar esta resposta"
                          aria-label={`Tirar a resposta ${k + 1}`}
                          onClick={() => mudar({ alternativas: p.alternativas.filter((_, j) => j !== k) })}>
                          <X size={15} strokeWidth={2.4} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="quiz-certa"
                        aria-pressed={a.correta}
                        title={a.correta ? 'Esta é a certa' : 'Marcar como certa'}
                        aria-label={`Marcar a resposta ${k + 1} como certa`}
                        onClick={() => marcarCerta(k)}
                      >
                        {a.correta && <Check size={18} strokeWidth={3} />}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="quiz-respostas-rodape">
                  <span className="quiz-dica-certa">
                    <Info size={14} strokeWidth={2.2} />
                    {p.multiplaEscolha ? 'Marque todas as respostas certas no círculo.' : 'Marque a resposta certa no círculo.'}
                  </span>
                  {p.alternativas.length < MAX_ALTERNATIVAS && (
                    <button type="button" className="quiz-mais" onClick={() => mudar({ alternativas: [...p.alternativas, novaAlternativa()] })}>
                      <Plus size={15} strokeWidth={2.4} /> Adicionar resposta
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ---------- VERDADEIRO OU FALSO ---------- */}
            {p.tipo === 'v_f' && (
              <div className="quiz-respostas-area">
                <div className="quiz-vf" role="radiogroup" aria-label="Qual é a resposta certa?">
                  {[
                    { id: 'V', nome: 'Verdadeiro', cor: COR_VERDADEIRO, Icone: Check },
                    { id: 'F', nome: 'Falso',      cor: COR_FALSO,      Icone: X },
                  ].map(o => (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={p.vf === o.id}
                      className={`quiz-vf-opcao ${p.vf === o.id ? 'certa' : ''}`}
                      style={{ '--cor': o.cor }}
                      onClick={() => mudar({ vf: o.id })}
                    >
                      <span className="quiz-vf-icone"><o.Icone size={26} strokeWidth={3} /></span>
                      <span className="quiz-vf-nome">{o.nome}</span>
                      <span className="quiz-vf-radio">{p.vf === o.id && <Check size={20} strokeWidth={3} />}</span>
                    </button>
                  ))}
                </div>
                <div className="quiz-respostas-rodape">
                  <span className="quiz-dica-certa"><Info size={14} strokeWidth={2.2} /> Clique na resposta certa da afirmação.</span>
                </div>
              </div>
            )}

            {/* ---------- PUZZLE ---------- */}
            {p.tipo === 'puzzle' && (
              <div className="quiz-respostas-area">
                <ol className="quiz-puzzle">
                  {p.itens.map((it, k) => (
                    <li key={it.id} className="quiz-puzzle-item" style={{ '--cor': marca(k).cor }}>
                      <span className="quiz-resposta-marca"><FormaMarca indice={k} /></span>
                      <span className="quiz-puzzle-pos">{k + 1}º</span>
                      <input
                        value={it.texto}
                        onChange={e => mudarItem(k, e.target.value)}
                        placeholder={`Item ${k + 1}${k >= MIN_ITENS ? ' (opcional)' : ''}`}
                        maxLength={100}
                        aria-label={`Item na posição ${k + 1}`}
                      />
                      <span className="quiz-puzzle-acoes">
                        <button type="button" onClick={() => moverItem(k, -1)} disabled={k === 0} title="Subir" aria-label={`Subir o item ${k + 1}`}>
                          <ArrowUp size={15} strokeWidth={2.4} />
                        </button>
                        <button type="button" onClick={() => moverItem(k, 1)} disabled={k === p.itens.length - 1} title="Descer" aria-label={`Descer o item ${k + 1}`}>
                          <ArrowDown size={15} strokeWidth={2.4} />
                        </button>
                        {p.itens.length > MIN_ITENS && (
                          <button type="button" className="perigo" title="Tirar item" aria-label={`Tirar o item ${k + 1}`}
                            onClick={() => mudar({ itens: p.itens.filter((_, j) => j !== k) })}>
                            <X size={15} strokeWidth={2.4} />
                          </button>
                        )}
                      </span>
                      <GripVertical size={16} strokeWidth={2} className="quiz-puzzle-alca" aria-hidden="true" />
                    </li>
                  ))}
                </ol>
                <div className="quiz-respostas-rodape">
                  <span className="quiz-dica-certa">
                    <Info size={14} strokeWidth={2.2} /> Escreva na ordem certa, de cima para baixo. O aluno recebe os itens embaralhados.
                  </span>
                  {p.itens.length < MAX_ITENS && (
                    <button type="button" className="quiz-mais" onClick={() => mudar({ itens: [...p.itens, novoItem()] })}>
                      <Plus size={15} strokeWidth={2.4} /> Adicionar item
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- painel */}
      <aside className="quiz-painel">
        <div className="quiz-abas" role="tablist">
          <button type="button" role="tab" aria-selected={aba === 'pergunta'} className={aba === 'pergunta' ? 'ativa' : ''} onClick={() => setAba('pergunta')}>
            <SlidersHorizontal size={16} strokeWidth={2} /> Pergunta
          </button>
          <button type="button" role="tab" aria-selected={aba === 'tema'} className={aba === 'tema' ? 'ativa' : ''} onClick={() => setAba('tema')}>
            <Palette size={16} strokeWidth={2} /> Tema
          </button>
        </div>

        {aba === 'pergunta' ? (
          <div className="quiz-painel-corpo" role="tabpanel">
            <div className="quiz-prop">
              <label className="quiz-prop-rotulo" htmlFor="quiz-tempo"><Timer size={16} strokeWidth={2} /> Limite de tempo</label>
              <div className="quiz-select">
                <select id="quiz-tempo" value={p.tempo} onChange={e => mudar({ tempo: Number(e.target.value) })}>
                  {TEMPOS.map(t => <option key={t.valor} value={t.valor}>{t.nome}</option>)}
                </select>
                <ChevronDown size={18} strokeWidth={2} />
              </div>
              {perguntas.length > 1 && (
                <button type="button" className="quiz-link" onClick={aplicarTempoEmTodas}>Usar este tempo em todas as perguntas</button>
              )}
            </div>

            <Escolha
              rotulo="Pontos"
              Icone={Award}
              opcoes={PONTOS}
              valor={p.pontos}
              aoMudar={(pontos) => mudar({ pontos })}
            />

            {p.tipo === 'quiz' && (
              <Escolha
                rotulo="Opções de resposta"
                Icone={LayoutGrid}
                opcoes={RESPOSTAS}
                valor={p.multiplaEscolha ? 'multipla' : 'unica'}
                aoMudar={trocarRespostas}
              />
            )}

            <div className="quiz-painel-acoes">
              <button type="button" className="quiz-acao perigo" onClick={excluir} disabled={perguntas.length === 1}>
                <Trash2 size={16} strokeWidth={2} /> Excluir
              </button>
              <button type="button" className="quiz-acao" onClick={duplicar}>
                <Copy size={16} strokeWidth={2} /> Duplicar
              </button>
            </div>
          </div>
        ) : (
          <div className="quiz-painel-corpo" role="tabpanel">
            <p className="quiz-painel-dica">O cenário aparece atrás das perguntas, aqui e na tela do aluno.</p>
            <SeletorTema valor={tema} aoMudar={setTema} compacto />
          </div>
        )}
      </aside>
    </section>
  );
}

/* O que falta em UMA pergunta (ou null se está tudo certo). */
function problemaDaPergunta(p) {
  if (!p.texto.trim()) return p.tipo === 'v_f' ? 'escreva a afirmação.' : 'escreva o enunciado.';

  if (p.tipo === 'quiz') {
    const usadas = p.alternativas.filter(a => a.texto.trim());
    if (usadas.length < MIN_ALTERNATIVAS) return `escreva pelo menos ${MIN_ALTERNATIVAS} respostas.`;
    const certas = usadas.filter(a => a.correta);
    if (p.alternativas.some(a => a.correta && !a.texto.trim())) return 'uma resposta marcada como certa está em branco.';
    if (certas.length === 0) return 'marque a resposta certa no círculo.';
    if (!p.multiplaEscolha && certas.length > 1) return 'é de seleção única, mas tem mais de uma marcada.';
    if (p.multiplaEscolha && certas.length === usadas.length) return 'todas as respostas estão certas — assim não há o que escolher.';
    const textos = usadas.map(a => a.texto.trim().toLowerCase());
    if (new Set(textos).size !== textos.length) return 'tem duas respostas iguais.';
  }

  if (p.tipo === 'v_f' && !p.vf) return 'diga se a afirmação é verdadeira ou falsa.';

  if (p.tipo === 'puzzle') {
    const usados = p.itens.filter(it => it.texto.trim());
    if (usados.length < MIN_ITENS) return `escreva pelo menos ${MIN_ITENS} itens para pôr em ordem.`;
    const textos = usados.map(it => it.texto.trim().toLowerCase());
    if (new Set(textos).size !== textos.length) return 'tem dois itens iguais — o aluno não saberia a ordem.';
  }
  return null;
}

function CriarQuiz() {
  // Vem preenchido quando o professor está editando a própria atividade ou
  // copiando uma da biblioteca; vazio quando está criando do zero.
  const inicial = usarConteudoInicial();

  const [perguntas, setPerguntas] = useState(() => deConteudo(inicial) || []);
  const [atual, setAtual] = useState(0);

  /* Achou problema? Já leva o professor até a pergunta. */
  /* Validação (27/10/2026): o problema aparece NA pergunta (faixa vermelha
     no palco) e some sozinho quando o professor corrige. O EditorAtividade
     chama validar({ silencioso: true }) para conferir de novo sem pular de
     pergunta; só no clique de salvar ele leva até a pergunta com problema. */
  const [tentouSalvar, setTentouSalvar] = useState(false);

  const validar = ({ silencioso = false } = {}) => {
    if (perguntas.length === 0) return 'Escolha o tipo da primeira pergunta para começar o quiz.';
    for (let i = 0; i < perguntas.length; i++) {
      const problema = problemaDaPergunta(perguntas[i]);
      if (problema) {
        if (!silencioso) { setAtual(i); setTentouSalvar(true); }
        return `Pergunta ${i + 1}: ${problema}`;
      }
    }
    return null;
  };

  /* Sobe as imagens novas e só então salva, para o banco guardar o endereço
     real. Imagem que já estava no servidor é reaproveitada sem subir de novo. */
  const aoSalvar = async (titulo, salaId, extras) => {
    const cracha = { Authorization: `Bearer ${localStorage.getItem('token')}` };

    const prontas = [];
    for (const p of perguntas) {
      let imagem = p.imagemUrl || null;
      if (p.arquivo) {
        const pacote = new FormData();
        pacote.append('imagem', p.arquivo);
        const envio = await fetch(`${API}/professor/pintura/upload`, { method: 'POST', headers: cracha, body: pacote });
        const dados = await envio.json();
        if (!envio.ok) throw new Error(dados.erro || 'Não consegui enviar uma das imagens.');
        imagem = dados.url;
      }

      const comum = { tipo: p.tipo, texto: p.texto.trim(), imagem, tempo: p.tempo, pontos: p.pontos };

      if (p.tipo === 'v_f') {
        prontas.push({
          ...comum,
          multiplaEscolha: false,
          alternativas: [
            { texto: 'Verdadeiro', correta: p.vf === 'V' },
            { texto: 'Falso', correta: p.vf === 'F' },
          ],
        });
      } else if (p.tipo === 'puzzle') {
        prontas.push({ ...comum, itens: p.itens.map(it => it.texto.trim()).filter(Boolean) });
      } else {
        prontas.push({
          ...comum,
          multiplaEscolha: p.multiplaEscolha,
          alternativas: p.alternativas
            .filter(a => a.texto.trim())
            .map(a => ({ texto: a.texto.trim(), correta: a.correta })),
        });
      }
    }

    const conteudo = { perguntas: prontas };
    const cabecalho = { ...cracha, 'Content-Type': 'application/json' };

    const res = extras.editandoId
      ? await fetch(`${API}/professor/atividade/${extras.editandoId}`, {
          method: 'PUT',
          headers: cabecalho,
          body: JSON.stringify({ titulo, conteudo, publica: extras.publica, tema: extras.tema }),
        })
      : await fetch(`${API}/professor/atividade`, {
          method: 'POST',
          headers: cabecalho,
          body: JSON.stringify({
            titulo, tipo: 'quiz', sala_id: salaId, conteudo,
            publica: extras.publica, tema: extras.tema, origem_id: extras.origemId,
          }),
        });

    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro || 'Não consegui salvar.');
  };

  return (
    <EditorAtividade
      tipo="quiz"
      nomeTipo="Quiz"
      explicacao="Monte as perguntas: misture quiz, verdadeiro ou falso e puzzle, escolha o tempo e quanto cada uma vale."
      validar={validar}
      aoSalvar={aoSalvar}
      temaNoPainel
      largo
    >
      <EstudioQuiz perguntas={perguntas} setPerguntas={setPerguntas} atual={atual} setAtual={setAtual} mostrarProblemas={tentouSalvar} />
    </EditorAtividade>
  );
}

export default CriarQuiz;
