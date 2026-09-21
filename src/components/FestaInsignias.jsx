import { createPortal } from 'react-dom';
import Insignia from './Insignia';

/* ==========================================================================
   COMEMORAÇÃO DE INSÍGNIA NOVA

   A mesma festa serve para o aluno e para o professor: medalhas pulando,
   raios de luz girando atrás e um botão para fechar. Quem chama decide o
   subtítulo e o que acontece ao fechar (avisar o servidor que já viu).

   Ela é desenhada direto no <body> (createPortal). Sem isso, quando a festa
   é chamada de dentro do menu lateral, ela ficava presa na largura do menu:
   um elemento com `position: fixed` passa a medir pelo pai quando o pai tem
   efeitos como `backdrop-filter` ou `transform`.
   ========================================================================== */

function FestaInsignias({ novas, subtitulo, aoFechar }) {
  if (!novas || novas.length === 0) return null;

  return createPortal(
    <div className="festa-insignia-fundo">
      <div className="festa-insignia" role="dialog" aria-labelledby="festa-titulo">
        <h2 id="festa-titulo">
          {novas.length === 1 ? 'Nova insígnia!' : `Você ganhou ${novas.length} insígnias!`}
        </h2>
        {subtitulo && <p className="festa-subtitulo">{subtitulo}</p>}

        <div className={`festa-medalhas ${novas.length > 1 ? 'varias' : ''}`}>
          {novas.map(c => (
            <Insignia key={c.codigo} insignia={c} tamanho="grande" />
          ))}
        </div>

        <button className="festa-botao" onClick={aoFechar} autoFocus>Oba!</button>
      </div>
    </div>,
    document.body
  );
}

export default FestaInsignias;
