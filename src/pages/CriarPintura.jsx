import { useState, useRef } from 'react';
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import EditorAtividade from '../components/EditorAtividade';
import { API } from '../api';

/* ==========================================================================
   EDITOR — PINTURA

   O professor sobe um desenho e escreve o que o aluno deve pintar. A imagem
   vai para o servidor antes de a atividade ser salva, porque o endereço que
   fica no banco precisa ser o do Cloudinary, não um endereço temporário do
   navegador.

   conteudo = { url_imagem, instrucao }
   ========================================================================== */

function CriarPintura() {
  const campoArquivo = useRef(null);

  const [instrucao, setInstrucao] = useState('');
  const [arquivo, setArquivo]     = useState(null);
  const [previa, setPrevia]       = useState(null);

  const escolher = (file) => {
    if (!file) return;
    setArquivo(file);
    setPrevia(URL.createObjectURL(file));
  };

  const soltar = (e) => {
    e.preventDefault();
    escolher(e.dataTransfer.files[0]);
  };

  const tirar = (e) => {
    e.stopPropagation();
    setArquivo(null);
    setPrevia(null);
  };

  const validar = () => {
    if (!instrucao.trim()) return 'Escreva o que o aluno precisa pintar.';
    if (!arquivo) return 'Escolha o desenho que a turma vai pintar.';
    return null;
  };

  /* A pintura salva em dois passos: primeiro a imagem, depois a atividade. */
  const aoSalvar = async (titulo, salaId) => {
    const cracha = { Authorization: `Bearer ${localStorage.getItem('token')}` };

    const pacote = new FormData();
    pacote.append('imagem', arquivo);
    const envio = await fetch(`${API}/professor/pintura/upload`, { method: 'POST', headers: cracha, body: pacote });
    const dadosEnvio = await envio.json();
    if (!envio.ok) throw new Error(dadosEnvio.erro || 'Não consegui enviar o desenho.');

    const res = await fetch(`${API}/professor/atividade`, {
      method: 'POST',
      headers: { ...cracha, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo,
        tipo: 'pintura',
        sala_id: salaId,
        conteudo: { url_imagem: dadosEnvio.url, instrucao: instrucao.trim() },
      }),
    });
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro || 'Não consegui salvar.');
  };

  return (
    <EditorAtividade
      tipo="pintura"
      nomeTipo="Pintura"
      explicacao="Suba um desenho. O aluno pinta na tela e manda de volta para você."
      validar={validar}
      aoSalvar={aoSalvar}
    >
      <section className="editor-cartao">
        <label className="editor-campo">
          <span>O que o aluno vai pintar?</span>
          <input
            className="editor-input"
            value={instrucao}
            onChange={e => setInstrucao(e.target.value)}
            placeholder="Ex.: Pinte o cachorro de marrom e a grama de verde"
            maxLength={160}
          />
        </label>
      </section>

      <section className="editor-cartao">
        <h2>O desenho</h2>
        <p className="editor-dica">Vale PNG, JPG ou WEBP, até 10 MB. Desenho com traço grosso fica melhor para pintar.</p>

        <div
          className={`editor-imagem ${previa ? 'tem-foto' : ''}`}
          onClick={() => campoArquivo.current?.click()}
          onDrop={soltar}
          onDragOver={e => e.preventDefault()}
        >
          {previa ? (
            <>
              <img src={previa} alt="desenho escolhido" />
              <div className="editor-imagem-acoes">
                <button className="editor-mini-btn" onClick={e => { e.stopPropagation(); campoArquivo.current?.click(); }}>
                  <RefreshCw size={14} strokeWidth={2.2} /> Trocar
                </button>
                <button className="editor-mini-btn perigo" onClick={tirar}>
                  <Trash2 size={14} strokeWidth={2.2} /> Tirar
                </button>
              </div>
            </>
          ) : (
            <>
              <ImagePlus size={30} strokeWidth={1.6} />
              <p>Clique ou arraste um desenho até aqui</p>
              <small>PNG, JPG ou WEBP</small>
            </>
          )}
        </div>

        <input
          ref={campoArquivo}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => escolher(e.target.files[0])}
        />
      </section>
    </EditorAtividade>
  );
}

export default CriarPintura;
