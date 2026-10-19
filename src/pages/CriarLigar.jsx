import { useState, useRef } from 'react';
import { Plus, Trash2, Link2, Type, ImagePlus, RefreshCw } from 'lucide-react';
import EditorAtividade, { usarConteudoInicial } from '../components/EditorAtividade';
import { API } from '../api';

/* ==========================================================================
   EDITOR — LIGAR OS PARES

   Cada linha é um par: o que está na coluna A combina com o que está na
   coluna B. Os dois lados podem ser texto ou imagem.

   Duas coisas mudaram junto com o visual:
   - antes a tela deixava criar várias "atividades" na barra lateral, mas só
     a que estava aberta era salva — as outras sumiam sem avisar. Agora é
     uma atividade por vez, como o resto do sistema;
   - a imagem vai para o servidor em vez de ir inteira dentro do banco
     (antes ia em base64, o que deixava a atividade pesadíssima).

   conteudo = { pares: [{ ladoA: {tipo, conteudo}, ladoB: {tipo, conteudo} }] }
   ========================================================================== */

const MIN_PARES = 3;
const MAX_PARES = 10;

let contador = 0;
const novaId = () => `lp${Date.now()}_${contador++}`;

const novoLado = () => ({ tipo: 'texto', texto: '', arquivo: null, previa: null, imagemUrl: null });
const novoPar = () => ({ id: novaId(), ladoA: novoLado(), ladoB: novoLado() });

/* Converte o que está guardado no banco no estado que a tela usa.
   `imagemUrl` é a imagem que já está no servidor: enquanto o professor não
   escolher um arquivo novo, é ela que continua valendo. */
function deConteudo(conteudo) {
  const lista = conteudo?.pares || [];
  if (lista.length === 0) return null;

  const lado = (l) => (l?.tipo === 'imagem'
    ? { tipo: 'imagem', texto: '', arquivo: null, previa: l?.conteudo || null, imagemUrl: l?.conteudo || null }
    : { tipo: 'texto', texto: String(l?.conteudo ?? ''), arquivo: null, previa: null, imagemUrl: null });

  return lista.map(p => ({ id: novaId(), ladoA: lado(p?.ladoA), ladoB: lado(p?.ladoB) }));
}

function CriarLigar() {
  // Vem preenchido quando o professor está editando a própria atividade ou
  // copiando uma da biblioteca; vazio quando está criando do zero.
  const inicial = usarConteudoInicial();

  const [pares, setPares] = useState(() => deConteudo(inicial) || [novoPar(), novoPar(), novoPar()]);
  const campos = useRef({});

  const mudarLado = (i, lado, mudancas) =>
    setPares(lista => lista.map((p, j) => (j === i ? { ...p, [lado]: { ...p[lado], ...mudancas } } : p)));

  const trocarTipo = (i, lado, tipo) => mudarLado(i, lado, { tipo, texto: '', arquivo: null, previa: null, imagemUrl: null });

  const escolherImagem = (i, lado, file) => {
    if (!file) return;
    mudarLado(i, lado, { arquivo: file, previa: URL.createObjectURL(file), imagemUrl: null });
  };

  const vazio = lado => (lado.tipo === 'texto' ? !lado.texto.trim() : !lado.arquivo && !lado.imagemUrl);

  const validar = () => {
    for (let i = 0; i < pares.length; i++) {
      const p = pares[i];
      if (vazio(p.ladoA)) return `Falta preencher a coluna A do par ${i + 1}.`;
      if (vazio(p.ladoB)) return `Falta preencher a coluna B do par ${i + 1}.`;
    }
    const textosA = pares.filter(p => p.ladoA.tipo === 'texto').map(p => p.ladoA.texto.trim().toLowerCase());
    if (new Set(textosA).size !== textosA.length) return 'Dois itens da coluna A estão iguais — o aluno não teria como escolher.';
    const textosB = pares.filter(p => p.ladoB.tipo === 'texto').map(p => p.ladoB.texto.trim().toLowerCase());
    if (new Set(textosB).size !== textosB.length) return 'Dois itens da coluna B estão iguais — o aluno não teria como escolher.';
    return null;
  };

  const aoSalvar = async (titulo, salaId, extras) => {
    const cracha = { Authorization: `Bearer ${localStorage.getItem('token')}` };

    const subir = async (lado) => {
      if (lado.tipo === 'texto') return { tipo: 'texto', conteudo: lado.texto.trim() };
      // Imagem que já está no servidor é reaproveitada sem subir de novo.
      if (!lado.arquivo && lado.imagemUrl) return { tipo: 'imagem', conteudo: lado.imagemUrl };
      const pacote = new FormData();
      pacote.append('imagem', lado.arquivo);
      const envio = await fetch(`${API}/professor/pintura/upload`, { method: 'POST', headers: cracha, body: pacote });
      const dados = await envio.json();
      if (!envio.ok) throw new Error(dados.erro || 'Não consegui enviar uma das imagens.');
      return { tipo: 'imagem', conteudo: dados.url };
    };

    const prontos = [];
    for (const p of pares) {
      prontos.push({ ladoA: await subir(p.ladoA), ladoB: await subir(p.ladoB) });
    }

    const conteudo = { pares: prontos };
    const cabecalho = { ...cracha, 'Content-Type': 'application/json' };

    const res = extras.editandoId
      ? await fetch(`${API}/professor/atividade/${extras.editandoId}`, {
          method: 'PUT',
          headers: cabecalho,
          body: JSON.stringify({ titulo, conteudo, publica: extras.publica }),
        })
      : await fetch(`${API}/professor/atividade`, {
          method: 'POST',
          headers: cabecalho,
          body: JSON.stringify({
            titulo, tipo: 'ligar', sala_id: salaId, conteudo,
            publica: extras.publica, origem_id: extras.origemId,
          }),
        });

    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro || 'Não consegui salvar.');
  };

  /* Os dois lados são iguais por dentro, então desenham pelo mesmo pedaço. */
  const desenharLado = (par, i, lado, letra) => {
    const dados = par[lado];
    const chave = `${par.id}-${lado}`;
    return (
      <div className="editor-par-lado">
        <div className="editor-segmentado">
          <button className={dados.tipo === 'texto' ? 'ativo' : ''} onClick={() => trocarTipo(i, lado, 'texto')}>
            <Type size={14} strokeWidth={2.2} /> Texto
          </button>
          <button className={dados.tipo === 'imagem' ? 'ativo' : ''} onClick={() => trocarTipo(i, lado, 'imagem')}>
            <ImagePlus size={14} strokeWidth={2.2} /> Imagem
          </button>
        </div>

        {dados.tipo === 'texto' ? (
          <input
            className="editor-input"
            value={dados.texto}
            onChange={e => mudarLado(i, lado, { texto: e.target.value })}
            placeholder={`Coluna ${letra}…`}
            maxLength={120}
          />
        ) : (
          <>
            <div
              className={`editor-imagem pequena ${dados.previa ? 'tem-foto' : ''}`}
              onClick={() => campos.current[chave]?.click()}
            >
              {dados.previa ? (
                <>
                  <img src={dados.previa} alt={`coluna ${letra} do par ${i + 1}`} />
                  <div className="editor-imagem-acoes">
                    <button className="editor-mini-btn" onClick={e => { e.stopPropagation(); campos.current[chave]?.click(); }}>
                      <RefreshCw size={14} strokeWidth={2.2} /> Trocar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <ImagePlus size={22} strokeWidth={1.6} />
                  <p>Escolher imagem</p>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              ref={el => { campos.current[chave] = el; }}
              onChange={e => escolherImagem(i, lado, e.target.files[0])}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <EditorAtividade
      tipo="ligar"
      nomeTipo="Ligar os pares"
      explicacao="Monte os pares que combinam. O aluno recebe as duas colunas embaralhadas e liga uma na outra."
      validar={validar}
      aoSalvar={aoSalvar}
    >
      <section className="editor-cartao">
        <h2>Pares</h2>
        <p className="editor-dica">
          De {MIN_PARES} a {MAX_PARES} pares. Cada lado pode ser uma palavra ou uma imagem.
        </p>

        <div className="editor-colunas">
          <span />
          <span>Coluna A</span>
          <span />
          <span>Coluna B</span>
          <span />
        </div>

        <div className="editor-pares">
          {pares.map((par, i) => (
            <div key={par.id} className="editor-par">
              <span className="editor-selo">{i + 1}</span>
              {desenharLado(par, i, 'ladoA', 'A')}
              <span className="editor-par-no"><Link2 size={18} strokeWidth={2} /></span>
              {desenharLado(par, i, 'ladoB', 'B')}
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
          onClick={() => setPares(lista => [...lista, novoPar()])}
          disabled={pares.length >= MAX_PARES}
        >
          <Plus size={16} strokeWidth={2.2} /> Adicionar par
        </button>
      </section>
    </EditorAtividade>
  );
}

export default CriarLigar;
