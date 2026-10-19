import { useState, useRef } from 'react';
import { Plus, Trash2, Check, X, ImagePlus, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import EditorAtividade, { usarConteudoInicial, usarAtividadeInicial } from '../components/EditorAtividade';
import { API } from '../api';

/* ==========================================================================
   EDITOR — VERDADEIRO OU FALSO

   Uma afirmação por cartão, com a imagem opcional e os dois botões logo
   embaixo. O prazo é da atividade inteira, então fica no fim, sozinho.

   O envio continua por /professor/atividades/v_f, que recebe as imagens
   junto (FormData) e guarda o tempo limite já convertido em minutos.
   ========================================================================== */

let contador = 0;
const novaId = () => `vf${Date.now()}_${contador++}`;

const novaAfirmacao = () => ({ id: novaId(), texto: '', arquivo: null, previa: null, imagemUrl: null, resposta: null });

/* O V/F é guardado como uma lista pura: [{ texto, imagem_url, resposta_correta }].
   `imagemUrl` é a imagem que já está no servidor — enquanto o professor não
   escolher um arquivo novo, é ela que continua valendo. */
function deConteudo(conteudo) {
  const lista = Array.isArray(conteudo) ? conteudo : (conteudo?.perguntas || []);
  if (lista.length === 0) return null;

  return lista.map(p => ({
    id: novaId(),
    texto: String(p?.texto ?? ''),
    arquivo: null,
    previa: p?.imagem_url || p?.imagem || null,
    imagemUrl: p?.imagem_url || p?.imagem || null,
    resposta: p?.resposta_correta === 'V' || p?.resposta_correta === 'F' ? p.resposta_correta : null,
  }));
}

function CriarVF() {
  // Vem preenchido quando o professor está editando a própria atividade ou
  // copiando uma da biblioteca; vazio quando está criando do zero.
  const inicial = usarConteudoInicial();
  // O prazo não mora no conteúdo, e sim numa coluna só dele (em minutos).
  const minutosGuardados = Number(usarAtividadeInicial()?.tempo_limite) || 0;

  const [afirmacoes, setAfirmacoes] = useState(() => deConteudo(inicial) || [novaAfirmacao()]);
  const [temPrazo, setTemPrazo]     = useState(minutosGuardados > 0);
  // Mostra o prazo na maior unidade que der certinho: 120 min vira "2 horas".
  const [quanto, setQuanto]         = useState(() => {
    if (minutosGuardados <= 0) return 5;
    if (minutosGuardados % (24 * 60) === 0) return minutosGuardados / (24 * 60);
    if (minutosGuardados % 60 === 0) return minutosGuardados / 60;
    return minutosGuardados;
  });
  const [unidade, setUnidade]       = useState(() => {
    if (minutosGuardados <= 0) return 'minutos';
    if (minutosGuardados % (24 * 60) === 0) return 'dias';
    if (minutosGuardados % 60 === 0) return 'horas';
    return 'minutos';
  });
  const campos = useRef({});

  const mudar = (i, mudancas) =>
    setAfirmacoes(lista => lista.map((a, j) => (j === i ? { ...a, ...mudancas } : a)));

  const mover = (i, direcao) => {
    const destino = i + direcao;
    if (destino < 0 || destino >= afirmacoes.length) return;
    setAfirmacoes(lista => {
      const nova = [...lista];
      [nova[i], nova[destino]] = [nova[destino], nova[i]];
      return nova;
    });
  };

  const escolherImagem = (i, file) => {
    if (!file) return;
    mudar(i, { arquivo: file, previa: URL.createObjectURL(file), imagemUrl: null });
  };

  const emMinutos = () => {
    if (!temPrazo) return 0;
    const valor = parseInt(quanto, 10) || 0;
    if (unidade === 'horas') return valor * 60;
    if (unidade === 'dias') return valor * 24 * 60;
    return valor;
  };

  const validar = () => {
    for (let i = 0; i < afirmacoes.length; i++) {
      const a = afirmacoes[i];
      if (!a.texto.trim()) return `A afirmação ${i + 1} está em branco.`;
      if (!a.resposta) return `Diga se a afirmação ${i + 1} é verdadeira ou falsa.`;
    }
    if (temPrazo && (parseInt(quanto, 10) || 0) < 1) return 'O prazo precisa ser de pelo menos 1.';
    return null;
  };

  /* As imagens novas sobem primeiro, uma a uma, e o conteúdo vai em JSON —
     o mesmo caminho dos outros editores. Antes isso ia tudo junto num
     FormData por uma rota só do V/F, que não sabia editar nem reaproveitar
     imagem já enviada; o formato guardado no banco continua idêntico. */
  const aoSalvar = async (titulo, salaId, extras) => {
    const cracha = { Authorization: `Bearer ${localStorage.getItem('token')}` };

    const prontas = [];
    for (const a of afirmacoes) {
      let imagem = a.imagemUrl || null;
      if (a.arquivo) {
        const envelope = new FormData();
        envelope.append('imagem', a.arquivo);
        const envio = await fetch(`${API}/professor/pintura/upload`, { method: 'POST', headers: cracha, body: envelope });
        const dados = await envio.json();
        if (!envio.ok) throw new Error(dados.erro || 'Não consegui enviar uma das imagens.');
        imagem = dados.url;
      }
      prontas.push({ texto: a.texto.trim(), imagem_url: imagem, resposta_correta: a.resposta });
    }

    const cabecalho = { ...cracha, 'Content-Type': 'application/json' };

    const res = extras.editandoId
      ? await fetch(`${API}/professor/atividade/${extras.editandoId}`, {
          method: 'PUT',
          headers: cabecalho,
          body: JSON.stringify({ titulo, conteudo: prontas, publica: extras.publica, tempo_limite: emMinutos() }),
        })
      : await fetch(`${API}/professor/atividade`, {
          method: 'POST',
          headers: cabecalho,
          body: JSON.stringify({
            titulo, tipo: 'v_f', sala_id: salaId, conteudo: prontas,
            tempo_limite: emMinutos(), publica: extras.publica, origem_id: extras.origemId,
          }),
        });

    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro || 'Não consegui salvar.');
  };

  return (
    <EditorAtividade
      tipo="v_f"
      nomeTipo="Verdadeiro ou falso"
      explicacao="Escreva as afirmações e diga qual é verdadeira e qual é falsa. O aluno escolhe uma das duas."
      validar={validar}
      aoSalvar={aoSalvar}
    >
      <section className="editor-cartao">
        <h2>Afirmações</h2>
        <p className="editor-dica">
          {afirmacoes.length === 1 ? '1 afirmação' : `${afirmacoes.length} afirmações`} · marque a resposta certa de cada uma.
        </p>

        {afirmacoes.map((a, i) => (
          <div key={a.id} className="editor-item">
            <div className="editor-item-topo">
              <span className="editor-selo">{i + 1}</span>
              <h3>Afirmação {i + 1}</h3>

              <div className="editor-item-acoes">
                <button className="editor-icone-btn" onClick={() => mover(i, -1)} disabled={i === 0} title="Subir">
                  <ArrowUp size={16} strokeWidth={2} />
                </button>
                <button className="editor-icone-btn" onClick={() => mover(i, 1)} disabled={i === afirmacoes.length - 1} title="Descer">
                  <ArrowDown size={16} strokeWidth={2} />
                </button>
                <button
                  className="editor-icone-btn perigo"
                  onClick={() => setAfirmacoes(lista => lista.filter((_, j) => j !== i))}
                  disabled={afirmacoes.length === 1}
                  title="Apagar afirmação"
                >
                  <Trash2 size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            <label className="editor-campo">
              <span>A afirmação</span>
              <input
                className="editor-input"
                value={a.texto}
                onChange={e => mudar(i, { texto: e.target.value })}
                placeholder="Ex.: A água ferve a 100 graus"
                maxLength={200}
              />
            </label>

            <label className="editor-campo">
              <span>Imagem (opcional)</span>
              <div
                className={`editor-imagem pequena ${a.previa ? 'tem-foto' : ''}`}
                onClick={() => campos.current[a.id]?.click()}
              >
                {a.previa ? (
                  <>
                    <img src={a.previa} alt={`imagem da afirmação ${i + 1}`} />
                    <div className="editor-imagem-acoes">
                      <button className="editor-mini-btn" onClick={e => { e.stopPropagation(); campos.current[a.id]?.click(); }}>
                        <RefreshCw size={14} strokeWidth={2.2} /> Trocar
                      </button>
                      <button
                        className="editor-mini-btn perigo"
                        onClick={e => { e.stopPropagation(); mudar(i, { arquivo: null, previa: null, imagemUrl: null }); }}
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
                ref={el => { campos.current[a.id] = el; }}
                onChange={e => escolherImagem(i, e.target.files[0])}
              />
            </label>

            <label className="editor-campo">
              <span>Esta afirmação é…</span>
              <div className="editor-vf">
                <button
                  className={`editor-vf-btn sim ${a.resposta === 'V' ? 'ativo' : ''}`}
                  onClick={() => mudar(i, { resposta: 'V' })}
                >
                  <span className="editor-vf-icone"><Check size={17} strokeWidth={3} /></span>
                  <span>Verdadeira</span>
                </button>
                <button
                  className={`editor-vf-btn nao ${a.resposta === 'F' ? 'ativo' : ''}`}
                  onClick={() => mudar(i, { resposta: 'F' })}
                >
                  <span className="editor-vf-icone"><X size={17} strokeWidth={3} /></span>
                  <span>Falsa</span>
                </button>
              </div>
            </label>
          </div>
        ))}

        <button className="editor-adicionar" onClick={() => setAfirmacoes(lista => [...lista, novaAfirmacao()])}>
          <Plus size={16} strokeWidth={2.2} /> Adicionar afirmação
        </button>
      </section>

      <section className="editor-cartao">
        <h2>Prazo</h2>
        <p className="editor-dica">Sem prazo, a atividade fica disponível para a turma o tempo todo.</p>

        <div className="editor-prazo">
          <label className="editor-caixinha">
            <input type="checkbox" checked={temPrazo} onChange={e => setTemPrazo(e.target.checked)} />
            Definir um prazo
          </label>

          {temPrazo && (
            <>
              <input
                className="editor-input"
                type="number"
                min="1"
                value={quanto}
                onChange={e => setQuanto(e.target.value)}
              />
              <select value={unidade} onChange={e => setUnidade(e.target.value)}>
                <option value="minutos">minutos</option>
                <option value="horas">horas</option>
                <option value="dias">dias</option>
              </select>
            </>
          )}
        </div>
      </section>
    </EditorAtividade>
  );
}

export default CriarVF;
