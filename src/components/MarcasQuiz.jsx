/* ==========================================================================
   MARCAS DAS ALTERNATIVAS DO QUIZ (25/10/2026)

   Cada alternativa tem uma cor E uma forma. A forma é o que guia o aluno que
   ainda lê devagar ("a da estrela") e quem não enxerga bem as cores.

   As formas são do próprio Saber+ (estrela, coração, nuvem, lua, gota e
   folha), nas cores da marca, escurecidas o bastante para a forma branca
   aparecer bem em cima (contraste de pelo menos 3:1).

   Usado no editor do quiz, na tela do aluno e no modo ao vivo — assim a
   "alternativa da estrela" é a mesma em todo lugar.
   ========================================================================== */

const FORMAS = {
  estrela: <polygon points="12 2.5 14.9 8.6 21.5 9.4 16.6 13.9 17.9 20.5 12 17.2 6.1 20.5 7.4 13.9 2.5 9.4 9.1 8.6" />,
  coracao: <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" />,
  nuvem:   <path d="M7 19a4.6 4.6 0 0 1-.7-9.1A6.2 6.2 0 0 1 18 11.3 3.9 3.9 0 0 1 17.6 19z" />,
  lua:     <path d="M15.5 2.8a9 9 0 1 0 5.7 15.4A7.3 7.3 0 0 1 15.5 2.8z" />,
  gota:    <path d="M12 2.5c3.6 4.7 6.6 8.4 6.6 12.1a6.6 6.6 0 0 1-13.2 0c0-3.7 3-7.4 6.6-12.1z" />,
  folha:   <path d="M20.5 3.5C10.5 3.5 4 8.6 4 15.8c0 1.6.4 3 1 4.2 1-4.2 4-7.6 9-9.2-4 2.6-6.3 5.6-7 9.2 1 .4 2 .5 3 .5 7.2 0 10.5-6.6 10.5-17z" />,
};

export const MARCAS = [
  { cor: '#1A6FC4', forma: 'estrela', nome: 'estrela' },
  { cor: '#E36C12', forma: 'coracao', nome: 'coração' },
  { cor: '#2E9A50', forma: 'nuvem',   nome: 'nuvem' },
  { cor: '#8150CF', forma: 'lua',     nome: 'lua' },
  { cor: '#D9435C', forma: 'gota',    nome: 'gota' },
  { cor: '#12918E', forma: 'folha',   nome: 'folha' },
];

// Verdadeiro e falso têm cores fixas: verde para "verdadeiro", vermelho para "falso".
export const COR_VERDADEIRO = '#2E9A50';
export const COR_FALSO = '#D9435C';

export const marca = (i) => MARCAS[i % MARCAS.length];

export function FormaMarca({ indice, tamanho = 22 }) {
  const m = marca(indice);
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} fill="#fff" aria-hidden="true" focusable="false">
      {FORMAS[m.forma]}
    </svg>
  );
}
