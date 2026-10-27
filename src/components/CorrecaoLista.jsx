import { Check, X, Minus } from 'lucide-react';

/* ==========================================================================
   CORREÇÃO ITEM A ITEM (27/10/2026)

   A lista "o que você respondeu × o certo" usada na tela final do quiz e na
   revisão de qualquer atividade já feita (RevisaoAtividade). Os itens vêm
   prontos do servidor (GET /aluno/atividade/:id/revisao):
   { pergunta, sua, certa, acertou, emBranco, foraDoAoVivo, imagem }
   ========================================================================== */
function CorrecaoLista({ itens }) {
  if (!itens || itens.length === 0) return null;

  return (
    <ol className="correcao-lista">
      {itens.map((it, i) => {
        if (it.foraDoAoVivo) {
          return (
            <li key={i} className="fora">
              <span className="correcao-icone"><Minus size={16} strokeWidth={3} /></span>
              <span className="correcao-texto">
                <strong>{it.pergunta}</strong>
                <em>Esta pergunta não entrou na aula ao vivo.</em>
              </span>
            </li>
          );
        }

        const estado = it.acertou ? 'certo' : it.emBranco ? 'branco' : 'errado';
        return (
          <li key={i} className={estado}>
            <span className="correcao-icone" aria-label={it.acertou ? 'Certo' : it.emBranco ? 'Em branco' : 'Errado'}>
              {it.acertou ? <Check size={16} strokeWidth={3} /> : it.emBranco ? <Minus size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
            </span>
            <span className="correcao-texto">
              <strong>{it.pergunta}</strong>
              <span className="correcao-linha">
                <span className="correcao-rotulo">Sua resposta:</span>{' '}
                {it.sua ? <b className={it.acertou ? 'ok' : 'nao'}>{it.sua}</b> : <i>ficou em branco</i>}
              </span>
              {!it.acertou && it.certa && (
                <span className="correcao-linha">
                  <span className="correcao-rotulo">Resposta certa:</span> <b className="ok">{it.certa}</b>
                </span>
              )}
            </span>
            {it.imagem && <img className="correcao-imagem" src={it.imagem} alt="" />}
          </li>
        );
      })}
    </ol>
  );
}

export default CorrecaoLista;
