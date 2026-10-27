import { useEffect } from 'react';
import { CircleCheck, CircleAlert, X } from 'lucide-react';

/* ==========================================================================
   AVISO FLUTUANTE ("toast") — 27/10/2026

   Aparece no canto da tela e some sozinho. Usado para confirmar que deu
   certo (atividade salva) sem o professor precisar adivinhar se a tela só
   mudou ou se salvou mesmo. O leitor de tela lê o texto (aria-live).

   <Aviso texto="Atividade salva!" tipo="ok" aoFechar={() => ...} />
   ========================================================================== */
function Aviso({ texto, tipo = 'ok', aoFechar, duracao = 4000 }) {
  useEffect(() => {
    if (!texto || !aoFechar) return;
    const t = setTimeout(aoFechar, duracao);
    return () => clearTimeout(t);
  }, [texto, aoFechar, duracao]);

  if (!texto) return null;
  const Icone = tipo === 'erro' ? CircleAlert : CircleCheck;

  return (
    <div className={`aviso-flutuante ${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'} aria-live="polite">
      <Icone size={20} strokeWidth={2.4} />
      <span>{texto}</span>
      {aoFechar && (
        <button type="button" onClick={aoFechar} aria-label="Fechar aviso">
          <X size={16} strokeWidth={2.4} />
        </button>
      )}
    </div>
  );
}

export default Aviso;
