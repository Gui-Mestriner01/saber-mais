/* ==========================================================================
   FUNDO ANIMADO

   Nuvens passando devagar pelo céu e algumas formas de sala de aula (lápis,
   livro, estrela, lâmpada...) flutuando nas bordas. É só enfeite: fica atrás
   dos cartões, não recebe clique e o leitor de tela pula (aria-hidden).

   Aparece nas telas de entrada, que têm o mesmo céu azul:
   Home, login e cadastro do professor, área do aluno e login do aluno.
   Para usar em outra tela, basta colocar <FundoAnimado /> como primeiro
   filho do container da página e pôr o container na lista do
   FundoAnimado.css.

   Tudo é SVG escrito aqui mesmo e animado só com CSS — nenhuma imagem a mais
   para baixar e nenhum JavaScript rodando, para a nota do PageSpeed não cair.

   Quem clicar em "desativar animações" no menu de acessibilidade (ou já usa
   "reduzir movimento" no aparelho) fica só com o degradê de sempre.
   No celular o fundo também não aparece.
   ========================================================================== */

function Nuvem({ classe }) {
  return (
    <svg className={`nuvem ${classe}`} viewBox="0 0 220 110" aria-hidden="true" focusable="false">
      <g fill="#fff">
        <circle cx="62" cy="70" r="34" />
        <circle cx="106" cy="50" r="45" />
        <circle cx="156" cy="70" r="32" />
        <rect x="62" y="68" width="94" height="36" rx="18" />
      </g>
    </svg>
  );
}

/* Desenhos em traço fino, no mesmo estilo dos ícones do resto do sistema. */
const DESENHOS = {
  lapis:   <><path d="M4 20l4-1L19 8l-3-3L5 16z" /><path d="M14 7l3 3" /></>,
  livro:   <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /><path d="M8 7h8" /></>,
  estrela: <polygon points="12 2.5 14.9 8.6 21.5 9.4 16.6 13.9 17.9 20.5 12 17.2 6.1 20.5 7.4 13.9 2.5 9.4 9.1 8.6" />,
  mais:    <path d="M12 4v16M4 12h16" />,
  letra:   <><path d="M5 20L12 4l7 16" /><path d="M8.2 13.5h7.6" /></>,
  lampada: <><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.4c.8.8 1 1.6 1 2.6h6c0-1 .2-1.8 1-2.6A6 6 0 0 0 12 3z" /></>,
  circulo: <circle cx="12" cy="12" r="8" />,
  regua:   <><rect x="3" y="8" width="18" height="8" rx="1.5" /><path d="M7 8v3M11 8v4M15 8v3M19 8v2" /></>,
};

/* Onde cada forma fica: sempre nas laterais e nos cantos, longe dos cartões. */
const FORMAS = [
  { desenho: 'lapis',   classe: 'forma-1' },
  { desenho: 'estrela', classe: 'forma-2' },
  { desenho: 'livro',   classe: 'forma-3' },
  { desenho: 'mais',    classe: 'forma-4' },
  { desenho: 'letra',   classe: 'forma-5' },
  { desenho: 'lampada', classe: 'forma-6' },
  { desenho: 'circulo', classe: 'forma-7' },
  { desenho: 'regua',   classe: 'forma-8' },
];

function FundoAnimado() {
  return (
    <div className="fundo-animado" aria-hidden="true">
      <Nuvem classe="nuvem-1" />
      <Nuvem classe="nuvem-2" />
      <Nuvem classe="nuvem-3" />

      {FORMAS.map(({ desenho, classe }) => (
        <svg
          key={classe}
          className={`forma ${classe}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          {DESENHOS[desenho]}
        </svg>
      ))}
    </div>
  );
}

export default FundoAnimado;
