import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, LayoutList, Lock, Globe, Pencil, Copy } from 'lucide-react';
import BarraLateralProfessor from './BarraLateralProfessor';
import { SeletorTema, TemaEditorContext } from './TemaFundo';
import '../CSS/Dashboard.css';
import '../CSS/NovasAtividades.css';
import { API } from '../api';

/* ==========================================================================
   MOLDURA DE TODOS OS EDITORES DE ATIVIDADE

   O que é igual em todos mora aqui: menu lateral, cabeçalho com o nome do
   tipo, campo de título, validação antes de salvar, escolha de quem vê a
   atividade, mensagens de erro/ok e o rodapé com o botão de salvar. Cada
   editor cuida só do conteúdo dele.

   Três modos, decididos pelo que vem na navegação (location.state):

   - NOVA      → state.salaId. Cria do zero (POST).
   - EDITAR    → state.atividade com minha = true. O editor abre preenchido e
                 salva por cima da mesma atividade (PUT).
   - COPIAR    → state.atividade de outro professor, vinda da biblioteca. O
                 editor abre preenchido, mas salva como atividade NOVA (POST)
                 na turma que o professor escolher aqui no rodapé. Por isso
                 mexer na cópia nunca toca na original: são linhas diferentes.

   O editor passa:
   - validar():        devolve uma frase de erro, ou null se está tudo certo
   - montarConteudo(): devolve o objeto que vai para a coluna `conteudo`

   Quando o salvamento é diferente do normal (o V/F manda imagens, a pintura
   sobe o desenho antes), o editor passa `aoSalvar(titulo, salaId, extras)` e
   cuida do envio por conta própria. `extras` traz { publica, origemId,
   editandoId, tema } para o editor repassar ao servidor.

   TEMA DE FUNDO (25/10/2026): toda atividade pode ter um cenário de fundo
   (selva, fundo do mar...). A escolha mora aqui e vai junto em qualquer
   salvamento. O seletor aparece num cartão próprio, menos no quiz, que
   mostra o seletor no painel lateral dele (`temaNoPainel`) e lê/escreve o
   tema pelo TemaEditorContext.
   ========================================================================== */

/* O conteúdo que o editor usa para se preencher. Cada editor chama isto. */
export function usarConteudoInicial() {
  const { state } = useLocation();
  return state?.atividade?.conteudo ?? null;
}

/* A atividade inteira, para quem precisa de algo que não está no conteúdo —
   o V/F usa para recuperar o prazo, que mora numa coluna à parte. */
export function usarAtividadeInicial() {
  const { state } = useLocation();
  return state?.atividade ?? null;
}

function EditorAtividade({
  tipo,
  nomeTipo,
  explicacao,
  validar,
  montarConteudo,
  aoSalvar,
  rodapeExtra,
  semMenu,
  temaNoPainel,
  largo,
  children,
}) {
  const navigate = useNavigate();
  const { state } = useLocation();

  const original = state?.atividade || null;
  const editando = !!(original && original.minha && original.id);
  const copiando = !!(original && !original.minha && original.id);

  const [salaId, setSalaId]     = useState(state?.salaId || '');
  const [salas, setSalas]       = useState([]);
  const [titulo, setTitulo]     = useState(original?.titulo || '');
  const [publica, setPublica]   = useState(!!original?.publica && !copiando);
  // A cópia leva o cenário junto; quem copiou troca se quiser.
  const [tema, setTema]         = useState(original?.tema || null);
  const [erro, setErro]         = useState('');
  const [salvo, setSalvo]       = useState(false);
  const [salvando, setSalvando] = useState(false);

  /* Quem chega pela biblioteca não trouxe turma nenhuma: precisa escolher
     para qual das turmas dele a cópia vai. */
  const precisaEscolherTurma = !state?.salaId;

  useEffect(() => {
    if (!precisaEscolherTurma) return;
    fetch(`${API}/professor/salas`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => (r.ok ? r.json() : []))
      .then(lista => setSalas(Array.isArray(lista) ? lista : []))
      .catch(() => setSalas([]));
  }, [precisaEscolherTurma]);

  const salvar = async () => {
    setErro('');
    if (!editando && !salaId) { setErro('Escolha a turma que vai receber esta atividade.'); return; }
    if (!titulo.trim()) { setErro('Dê um título para a atividade.'); return; }

    const problema = validar?.();
    if (problema) { setErro(problema); return; }

    setSalvando(true);
    try {
      const cracha = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      };

      if (aoSalvar) {
        await aoSalvar(titulo.trim(), salaId, {
          publica,
          origemId: copiando ? original.id : null,
          editandoId: editando ? original.id : null,
          tema,
        });
      } else if (editando) {
        const res = await fetch(`${API}/professor/atividade/${original.id}`, {
          method: 'PUT',
          headers: cracha,
          body: JSON.stringify({ titulo: titulo.trim(), conteudo: montarConteudo(), publica, tema }),
        });
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.erro || 'Não consegui salvar as alterações.');
      } else {
        const res = await fetch(`${API}/professor/atividade`, {
          method: 'POST',
          headers: cracha,
          body: JSON.stringify({
            titulo: titulo.trim(),
            tipo,
            sala_id: salaId,
            conteudo: montarConteudo(),
            publica,
            origem_id: copiando ? original.id : null,
            tema,
          }),
        });
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.erro || 'Não consegui salvar.');
      }

      setSalvo(true);
      setTimeout(() => navigate('/professor/minhas-aulas'), 1400);
    } catch (e) {
      setErro(e.message || 'Não consegui salvar.');
    } finally {
      setSalvando(false);
    }
  };

  /* O cabeçalho conta em que modo o professor está, para ninguém achar que
     está mexendo na atividade de outra pessoa. */
  const subtitulo =
    editando ? 'Você está editando esta atividade. O que mudar vale para a turma que já a recebeu.'
    : copiando ? `Cópia de uma atividade de ${original.autor || 'outro professor'}. Mexa à vontade: a original não muda.`
    : explicacao;

  return (
    <div className={`dashboard-container ${semMenu ? 'editor-sem-menu' : ''}`}>
      {!semMenu && <BarraLateralProfessor ativo="aulas" />}

      <main className="dashboard-main">
        <header className="dashboard-header-painel">
          <div className="header-boas-vindas">
            <h1>
              {nomeTipo}
              {editando && <span className="editor-marca"><Pencil size={13} strokeWidth={2.4} /> Editando</span>}
              {copiando && <span className="editor-marca copia"><Copy size={13} strokeWidth={2.4} /> Cópia</span>}
            </h1>
            <p>{subtitulo}</p>
          </div>
          <div className="header-acoes">
            {semMenu && (
              <button className="btn-acao-rapida" onClick={() => navigate('/professor/minhas-aulas')}>
                <LayoutList size={17} strokeWidth={1.75} /> Minhas aulas
              </button>
            )}
            <button
              className="btn-acao-rapida"
              onClick={() => navigate(copiando ? '/professor/biblioteca' : '/professor/criar-atividade')}
            >
              <ArrowLeft size={17} strokeWidth={1.75} /> {copiando ? 'Voltar à biblioteca' : 'Trocar o tipo'}
            </button>
          </div>
        </header>

        <TemaEditorContext.Provider value={{ tema, setTema }}>
        <div className={`editor-nova ${largo ? 'editor-larga' : ''}`}>
          <section className="editor-cartao">
            <label className="editor-campo">
              <span>Título da atividade</span>
              <input
                className="editor-input"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ex.: Ciclo da água"
                maxLength={120}
              />
            </label>

            {/* Só aparece para quem não veio de uma turma (cópia da biblioteca). */}
            {precisaEscolherTurma && !editando && (
              <label className="editor-campo">
                <span>Turma que vai receber</span>
                <select className="editor-input" value={salaId} onChange={e => setSalaId(e.target.value)}>
                  <option value="">Escolha a turma…</option>
                  {salas.map(s => (
                    <option key={s.id} value={s.id}>{s.nome} — {s.serie} · {s.materia}</option>
                  ))}
                </select>
              </label>
            )}
          </section>

          {children}

          {!temaNoPainel && (
            <section className="editor-cartao">
              <h2>Tema de fundo</h2>
              <p className="editor-dica">
                O cenário que aparece atrás da atividade quando o aluno for responder. Sem tema, fica o fundo de sempre.
              </p>
              <SeletorTema valor={tema} aoMudar={setTema} />
            </section>
          )}

          <section className="editor-cartao">
            <h2>Quem pode ver esta atividade?</h2>
            <p className="editor-dica">
              Isso não muda nada para a sua turma: os alunos dela fazem a atividade dos dois jeitos.
              Muda só se outros professores encontram a atividade na biblioteca.
            </p>

            <div className="editor-visibilidade">
              <button
                type="button"
                className={`editor-visib-btn ${!publica ? 'ativo' : ''}`}
                onClick={() => setPublica(false)}
              >
                <span className="editor-visib-icone privada"><Lock size={17} strokeWidth={2.2} /></span>
                <span>
                  <strong>Só minha</strong>
                  <em>Fica guardada com você e com a sua turma.</em>
                </span>
              </button>

              <button
                type="button"
                className={`editor-visib-btn ${publica ? 'ativo' : ''}`}
                onClick={() => setPublica(true)}
              >
                <span className="editor-visib-icone publica"><Globe size={17} strokeWidth={2.2} /></span>
                <span>
                  <strong>Pública</strong>
                  <em>Entra na biblioteca. Outros professores podem copiar e adaptar.</em>
                </span>
              </button>
            </div>
          </section>

          <section className="editor-cartao editor-rodape">
            {erro ? <p className="editor-erro">{erro}</p>
              : salvo ? <p className="editor-ok">
                  {editando ? 'Alterações salvas!' : 'Atividade salva!'} Levando você para Minhas aulas…
                </p>
              : <p>{rodapeExtra || (editando
                  ? 'Confira tudo e salve. A turma vê a versão nova na hora.'
                  : 'Confira tudo e salve. A turma já vê a atividade na hora.')}</p>}

            <button className="btn-acao-rapida destaque" onClick={salvar} disabled={salvando || salvo}>
              <Save size={17} strokeWidth={2} />
              {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar atividade'}
            </button>
          </section>
        </div>
        </TemaEditorContext.Provider>
      </main>
    </div>
  );
}

export default EditorAtividade;
