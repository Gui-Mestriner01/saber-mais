import { Component } from 'react';
import { RefreshCw, House } from 'lucide-react';
import { ehErroDeVersao, recarregarParaVersaoNova } from '../recarregarVersao';

/* ==========================================================================
   PROTEÇÃO CONTRA TELA EM BRANCO (27/10/2026)

   Sem isto, qualquer erro dentro de uma tela (ou um pedaço do site que não
   baixou) deixava a página inteira em branco, sem nenhuma pista. Foi o que
   aconteceu no "Ver resultado" do aluno.

   Dois casos:
   1. O site foi atualizado (novo deploy na Hostinger) com a aba aberta: os
      arquivos antigos das telas somem e o navegador não acha mais o pedaço
      que precisa. Aqui a página recarrega sozinha UMA vez e já pega a versão
      nova.
   2. Qualquer outro erro: aparece um aviso com o motivo e botões para tentar
      de novo ou voltar ao início, em vez da tela vazia.
   ========================================================================== */

export default class ErroDeTela extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro) {
    if (ehErroDeVersao(erro)) recarregarParaVersaoNova();
  }

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    const versao = ehErroDeVersao(erro);
    const inicio = window.location.pathname.startsWith('/professor') ? '/professor/dashboard'
      : window.location.pathname.startsWith('/aluno') ? '/aluno/area' : '/';

    return (
      <div className="erro-tela" role="alert">
        <div className="erro-tela-cartao">
          <h2>{versao ? 'O Saber+ foi atualizado' : 'Não consegui abrir esta tela'}</h2>
          <p>
            {versao
              ? 'Saiu uma versão nova do site enquanto esta página estava aberta. Recarregue para continuar.'
              : 'Aconteceu um erro inesperado. Tente de novo; se continuar, avise o professor.'}
          </p>
          {!versao && <code className="erro-tela-motivo">{String(erro?.message || erro).slice(0, 180)}</code>}
          <div className="erro-tela-botoes">
            <button className="erro-tela-btn principal" onClick={() => window.location.reload()}>
              <RefreshCw size={17} strokeWidth={2.2} /> Recarregar
            </button>
            <button className="erro-tela-btn" onClick={() => { window.location.href = inicio; }}>
              <House size={17} strokeWidth={2.2} /> Ir para o início
            </button>
          </div>
        </div>
      </div>
    );
  }
}
