import { createContext, useContext } from 'react';
import { Check, Ban } from 'lucide-react';

/* ==========================================================================
   TEMAS DE FUNDO DAS ATIVIDADES (25/10/2026)

   O professor escolhe um cenário para o fundo da atividade (selva, fundo do
   mar, espaço...) e o aluno responde "dentro" dele. "Sem tema" deixa o fundo
   normal de cada tela, que é como tudo funcionava antes.

   Tudo é desenhado aqui em SVG — nenhuma imagem para baixar, então não pesa
   no celular nem na nota do PageSpeed. O movimento (folhas balançando,
   bolhas subindo, neve caindo) é só CSS, em TemaFundo.css, e para quando o
   aluno liga "Reduzir animações" no menu de acessibilidade: o cenário
   continua, só que parado (ele faz parte da atividade, não é enfeite).

   Peças:
   - TEMAS ............. a lista que aparece no seletor
   - <CenaTema> ........ o desenho em si (tela cheia, caixa ou miniatura)
   - <FundoTema> ....... o cenário atrás da tela do aluno
   - classeTema(tema) .. a classe que deixa o container da tela transparente
   - <SeletorTema> ..... a grade de miniaturas do editor
   - TemaEditorContext . o editor de atividade guarda o tema escolhido aqui

   Os ids precisam bater com a lista TEMAS_DE_FUNDO do backend/server.js.
   ========================================================================== */

export const TEMAS = [
  { id: null,     nome: 'Sem tema' },
  { id: 'selva',  nome: 'Selva' },
  { id: 'mar',    nome: 'Fundo do mar' },
  { id: 'espaco', nome: 'Espaço' },
  { id: 'neve',   nome: 'Neve' },
  { id: 'praia',  nome: 'Praia' },
  { id: 'lousa',  nome: 'Lousa' },
];

const IDS = TEMAS.map(t => t.id).filter(Boolean);
export const temaExiste = (tema) => IDS.includes(tema);

// Cenários escuros: a tela do aluno usa letra clara no que fica direto no fundo.
const ESCUROS = ['mar', 'espaco', 'lousa'];

export function classeTema(tema) {
  if (!temaExiste(tema)) return '';
  return `com-tema${ESCUROS.includes(tema) ? ' com-tema-escuro' : ''}`;
}

export const TemaEditorContext = createContext({ tema: null, setTema: () => {} });
export const usarTemaEditor = () => useContext(TemaEditorContext);

/* Números "aleatórios" sempre iguais (estrelas, neve, bolhas): assim o
   desenho não muda a cada vez que a tela redesenha. */
function sorteio(semente) {
  let x = semente;
  return () => {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
}

/* ---------------------------------------------------------------- SELVA */
function Folha({ x, y, giro, cor = '#2F8A43', escala = 1, atraso = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${giro}) scale(${escala})`}>
      <g className="tema-balanca" style={{ animationDelay: `${atraso}s` }}>
        <path d="M0 0 C70 -60 190 -60 260 0 C190 60 70 60 0 0Z" fill={cor} />
        <path d="M6 0 H250" stroke="#1F6B33" strokeWidth="5" strokeLinecap="round" />
        <path d="M70 0 L100 -30 M120 0 L150 -34 M170 0 L200 -28 M70 0 L100 30 M120 0 L150 34 M170 0 L200 28"
          stroke="#1F6B33" strokeWidth="4" strokeLinecap="round" opacity=".55" />
      </g>
    </g>
  );
}

function Cipo({ x, comprimento, atraso = 0 }) {
  const folhas = [];
  for (let y = 40; y < comprimento; y += 46) {
    const lado = (y / 46) % 2 ? 1 : -1;
    folhas.push(<ellipse key={y} cx={lado * 16} cy={y} rx="16" ry="9" fill="#3E9B4F" transform={`rotate(${lado * 30} ${lado * 16} ${y})`} />);
  }
  return (
    <g transform={`translate(${x} 0)`}>
      <g className="tema-cipo" style={{ animationDelay: `${atraso}s` }}>
        <path d={`M0 0 C14 ${comprimento * 0.3} -14 ${comprimento * 0.65} 0 ${comprimento}`} stroke="#2E7D3E" strokeWidth="6" fill="none" />
        {folhas}
      </g>
    </g>
  );
}

function CenaSelva() {
  return (
    <>
      <defs>
        <linearGradient id="selva-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#DDF5CF" />
          <stop offset=".55" stopColor="#A9DC8F" />
          <stop offset="1" stopColor="#5FA65A" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#selva-ceu)" />
      <circle cx="1180" cy="150" r="120" fill="#FFF7CF" opacity=".75" />
      <path d="M0 560 C200 470 380 520 560 480 C760 430 900 520 1100 470 C1300 420 1460 500 1600 460 V900 H0Z" fill="#86C478" />
      <path d="M0 650 C240 580 420 640 640 600 C860 560 1040 650 1260 610 C1420 580 1520 620 1600 600 V900H0Z" fill="#5DA75A" />
      {/* troncos e copas */}
      <rect x="150" y="230" width="52" height="600" rx="22" fill="#6E4B2F" />
      <rect x="1400" y="260" width="48" height="580" rx="22" fill="#6E4B2F" />
      <g fill="#2F7D3E">
        <circle cx="120" cy="230" r="110" /><circle cx="250" cy="200" r="100" /><circle cx="180" cy="120" r="95" />
        <circle cx="1370" cy="250" r="105" /><circle cx="1490" cy="220" r="110" /><circle cx="1430" cy="140" r="90" />
      </g>
      <g fill="#3E9A4B" opacity=".9">
        <circle cx="200" cy="160" r="60" /><circle cx="1450" cy="180" r="62" />
      </g>
      <path d="M0 790 C300 745 520 795 800 765 C1080 735 1300 795 1600 755 V900H0Z" fill="#3E8743" />
      <Cipo x={430} comprimento={260} />
      <Cipo x={560} comprimento={170} atraso={-2} />
      <Cipo x={1060} comprimento={230} atraso={-1} />
      <Cipo x={1180} comprimento={150} atraso={-3} />
      {/* folhas grandes nos cantos */}
      <Folha x={-30} y={860} giro={-40} escala={1.3} />
      <Folha x={10} y={900} giro={-15} cor="#3A9A4C" atraso={-2} />
      <Folha x={1630} y={870} giro={-145} escala={1.3} cor="#3A9A4C" atraso={-1} />
      <Folha x={1600} y={900} giro={-165} atraso={-3} />
      <Folha x={-20} y={40} giro={25} escala={0.9} cor="#3A9A4C" atraso={-4} />
      <Folha x={1620} y={30} giro={155} escala={0.9} atraso={-2.5} />
      {/* flores */}
      <g>
        <circle cx="330" cy="800" r="12" fill="#F5812A" /><circle cx="345" cy="788" r="9" fill="#FFC857" />
        <circle cx="1260" cy="812" r="12" fill="#E2556B" /><circle cx="1276" cy="800" r="9" fill="#FFC857" />
      </g>
    </>
  );
}

/* ---------------------------------------------------------------- MAR */
function Alga({ x, altura, cor = '#2E9E6A', atraso = 0 }) {
  return (
    <g transform={`translate(${x} 900)`}>
      <g className="tema-alga" style={{ animationDelay: `${atraso}s` }}>
        <path d={`M0 0 C-26 ${-altura * 0.25} 26 ${-altura * 0.5} 0 ${-altura * 0.72} S-18 ${-altura * 0.95} 6 ${-altura}`}
          stroke={cor} strokeWidth="16" fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
}

/* `x` é onde o peixe fica quando a animação está desligada. */
function Peixe({ x, y, cor, tamanho = 1, duracao, atraso, sentido = 1 }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <g className={sentido > 0 ? 'tema-peixe' : 'tema-peixe volta'}
        style={{ '--parado': `${x}px`, animationDuration: `${duracao}s`, animationDelay: `${atraso}s` }}>
        <g transform={`scale(${sentido * tamanho} ${tamanho})`}>
          <ellipse cx="0" cy="0" rx="46" ry="26" fill={cor} />
          <path d="M-40 0 L-76 -24 L-76 24Z" fill={cor} />
          <circle cx="24" cy="-6" r="6" fill="#fff" /><circle cx="26" cy="-6" r="3" fill="#123" />
        </g>
      </g>
    </g>
  );
}

function CenaMar() {
  const r = sorteio(7);
  const bolhas = Array.from({ length: 22 }, (_, i) => ({
    x: 60 + r() * 1480, y: 500 + r() * 420, raio: 5 + r() * 12, duracao: 9 + r() * 9, atraso: -r() * 18, k: i,
  }));
  return (
    <>
      <defs>
        <linearGradient id="mar-agua" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7FD6EC" />
          <stop offset=".5" stopColor="#2A8FC0" />
          <stop offset="1" stopColor="#0E4A78" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#mar-agua)" />
      <g fill="#fff" opacity=".09">
        <polygon points="200,0 330,0 620,900 380,900" />
        <polygon points="760,0 840,0 1060,900 900,900" />
        <polygon points="1260,0 1380,0 1560,900 1340,900" />
      </g>
      <path d="M0 800 C220 760 420 810 680 780 C940 750 1160 812 1400 782 C1500 770 1560 780 1600 776 V900H0Z" fill="#E6C88A" />
      <path d="M0 846 C300 820 600 858 900 836 C1200 816 1420 852 1600 834 V900H0Z" fill="#D6B06D" />
      <ellipse cx="520" cy="810" rx="70" ry="34" fill="#6F8FA6" /><ellipse cx="1180" cy="815" rx="90" ry="38" fill="#5E7F98" />
      <Alga x={90} altura={300} />
      <Alga x={140} altura={220} cor="#3BB37A" atraso={-2} />
      <Alga x={420} altura={180} atraso={-1} />
      <Alga x={1250} altura={260} cor="#3BB37A" atraso={-3} />
      <Alga x={1470} altura={320} atraso={-1.5} />
      <Alga x={1520} altura={210} cor="#3BB37A" atraso={-4} />
      {/* corais */}
      <g stroke="#FF8A65" strokeWidth="18" strokeLinecap="round" fill="none">
        <path d="M300 850 V760 M300 790 L262 748 M300 800 L340 752" />
      </g>
      <g stroke="#F06292" strokeWidth="16" strokeLinecap="round" fill="none">
        <path d="M1340 852 V770 M1340 800 L1306 762 M1340 810 L1378 766" />
      </g>
      <Peixe x={260} y={330} cor="#FFB74D" duracao={34} atraso={-6} />
      <Peixe x={1360} y={470} cor="#F06292" tamanho={0.8} duracao={42} atraso={-20} sentido={-1} />
      <Peixe x={1200} y={240} cor="#FFE082" tamanho={0.6} duracao={38} atraso={-30} />
      {bolhas.map(b => (
        <circle key={b.k} className="tema-bolha" cx={b.x} cy={b.y} r={b.raio}
          fill="#fff" fillOpacity=".18" stroke="#fff" strokeOpacity=".6" strokeWidth="2"
          style={{ animationDuration: `${b.duracao}s`, animationDelay: `${b.atraso}s` }} />
      ))}
    </>
  );
}

/* ---------------------------------------------------------------- ESPAÇO */
function CenaEspaco() {
  const r = sorteio(42);
  const estrelas = Array.from({ length: 90 }, (_, i) => ({
    x: r() * 1600, y: r() * 900, raio: 1 + r() * 2.6, pisca: r() < 0.35, atraso: -r() * 4, k: i,
  }));
  return (
    <>
      <defs>
        <linearGradient id="espaco-ceu" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0B1238" />
          <stop offset=".6" stopColor="#21175A" />
          <stop offset="1" stopColor="#3A1D6A" />
        </linearGradient>
        <radialGradient id="espaco-nebulosa">
          <stop offset="0" stopColor="#8E5BD8" stopOpacity=".45" />
          <stop offset="1" stopColor="#8E5BD8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="espaco-planeta" cx=".35" cy=".35">
          <stop offset="0" stopColor="#FFC07A" />
          <stop offset="1" stopColor="#E0663A" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#espaco-ceu)" />
      <circle cx="420" cy="620" r="360" fill="url(#espaco-nebulosa)" />
      <circle cx="1220" cy="260" r="300" fill="url(#espaco-nebulosa)" opacity=".7" />
      {estrelas.map(e => (
        <circle key={e.k} cx={e.x} cy={e.y} r={e.raio} fill="#fff"
          className={e.pisca ? 'tema-pisca' : undefined}
          style={e.pisca ? { animationDelay: `${e.atraso}s` } : undefined} />
      ))}
      {/* planeta com anel */}
      <g transform="translate(1310 700)">
        <ellipse rx="230" ry="46" fill="none" stroke="#F9D29A" strokeWidth="14" opacity=".55" transform="rotate(-14)" />
        <circle r="140" fill="url(#espaco-planeta)" />
        <path d="M-120 -40 C-40 -70 60 -60 130 -30" stroke="#F6A35E" strokeWidth="16" fill="none" opacity=".7" />
        <path d="M-136 30 C-40 10 70 20 136 40" stroke="#C9542E" strokeWidth="12" fill="none" opacity=".5" />
        {/* metade da frente do anel, por cima do planeta */}
        <path d="M-230 0 A230 46 0 0 0 230 0" fill="none" stroke="#F9D29A" strokeWidth="14" opacity=".95" transform="rotate(-14)" />
      </g>
      {/* planetinha */}
      <g transform="translate(250 210)">
        <circle r="52" fill="#4CC7B6" />
        <circle cx="-16" cy="-12" r="10" fill="#3AA898" /><circle cx="18" cy="14" r="7" fill="#3AA898" />
      </g>
      {/* lua */}
      <path d="M1460 110 a70 70 0 1 0 60 110 a56 56 0 1 1 -60 -110Z" fill="#F4F1D8" opacity=".9" />
      <g className="tema-cometa">
        <line x1="0" y1="0" x2="140" y2="60" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8" />
      </g>
    </>
  );
}

/* ---------------------------------------------------------------- NEVE */
function Pinheiro({ x, y, escala = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
      <rect x="-10" y="0" width="20" height="40" fill="#6E4B2F" />
      <polygon points="0,-190 -70,-90 70,-90" fill="#2F6B4F" />
      <polygon points="0,-140 -90,-20 90,-20" fill="#2F6B4F" />
      <polygon points="0,-90 -110,40 110,40" fill="#2F6B4F" transform="translate(0 -40)" />
      <polygon points="0,-190 -26,-152 26,-152" fill="#fff" />
      <path d="M-70 -90 Q-35 -100 0 -92 Q35 -100 70 -90 L60 -98 Q30 -108 0 -100 Q-30 -108 -60 -98Z" fill="#fff" />
    </g>
  );
}

function CenaNeve() {
  const r = sorteio(99);
  const flocos = Array.from({ length: 60 }, (_, i) => ({
    x: r() * 1600, y: r() * 900, raio: 2 + r() * 5, duracao: 10 + r() * 12, atraso: -r() * 22, k: i,
  }));
  return (
    <>
      <defs>
        <linearGradient id="neve-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B9DFF4" />
          <stop offset="1" stopColor="#EEF7FC" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#neve-ceu)" />
      <polygon points="0,620 260,300 470,520 700,250 980,560 1220,320 1600,640 1600,900 0,900" fill="#A9C8DE" />
      <g fill="#fff">
        <polygon points="260,300 205,368 240,360 270,382 300,352 320,358" />
        <polygon points="700,250 640,320 680,312 712,334 742,306 768,316" />
        <polygon points="1220,320 1166,382 1200,376 1232,396 1262,372 1284,380" />
      </g>
      <path d="M0 700 C260 640 520 700 800 670 C1080 640 1320 700 1600 660 V900H0Z" fill="#fff" />
      <path d="M0 790 C320 760 620 800 920 778 C1220 756 1420 796 1600 780 V900H0Z" fill="#E1EEF7" />
      <Pinheiro x={140} y={720} escala={1.1} />
      <Pinheiro x={290} y={760} escala={0.8} />
      <Pinheiro x={1330} y={740} escala={1} />
      <Pinheiro x={1480} y={710} escala={1.2} />
      {/* bonequinho de neve */}
      <g transform="translate(1180 760)">
        <circle r="44" fill="#fff" stroke="#D7E6F0" strokeWidth="3" />
        <circle cy="-66" r="30" fill="#fff" stroke="#D7E6F0" strokeWidth="3" />
        <circle cx="-10" cy="-72" r="4" fill="#2A4A6A" /><circle cx="10" cy="-72" r="4" fill="#2A4A6A" />
        <path d="M0 -64 L22 -60 L0 -58Z" fill="#F5812A" />
        <path d="M-26 -42 H26" stroke="#E2556B" strokeWidth="9" strokeLinecap="round" />
      </g>
      {flocos.map(f => (
        <circle key={f.k} className="tema-floco" cx={f.x} cy={f.y} r={f.raio} fill="#fff"
          style={{ animationDuration: `${f.duracao}s`, animationDelay: `${f.atraso}s` }} />
      ))}
    </>
  );
}

/* ---------------------------------------------------------------- PRAIA */
function CenaPraia() {
  return (
    <>
      <defs>
        <linearGradient id="praia-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#72C6EE" />
          <stop offset="1" stopColor="#D3F0FC" />
        </linearGradient>
        <linearGradient id="praia-mar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1E8FC0" />
          <stop offset="1" stopColor="#38B6D6" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#praia-ceu)" />
      <circle cx="1290" cy="170" r="130" fill="#FFE9A3" opacity=".6" />
      <circle cx="1290" cy="170" r="78" fill="#FFD54F" />
      <g fill="#fff" opacity=".9">
        <g className="tema-nuvem-praia"><circle cx="300" cy="150" r="40" /><circle cx="345" cy="130" r="52" /><circle cx="395" cy="152" r="38" /><rect x="300" y="150" width="96" height="40" rx="20" /></g>
        <g className="tema-nuvem-praia devagar"><circle cx="820" cy="220" r="30" /><circle cx="855" cy="204" r="40" /><circle cx="892" cy="222" r="28" /><rect x="820" y="220" width="72" height="30" rx="15" /></g>
      </g>
      <rect y="500" width="1600" height="230" fill="url(#praia-mar)" />
      <g className="tema-onda" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".6">
        <path d="M-200 560 q40 -16 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" />
        <path d="M-160 630 q40 -16 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" opacity=".7" />
      </g>
      <path d="M0 720 C260 690 520 730 820 706 C1120 682 1380 726 1600 700 V900H0Z" fill="#F6DCA0" />
      <path d="M0 720 C260 690 520 730 820 706 C1120 682 1380 726 1600 700" stroke="#fff" strokeWidth="10" fill="none" opacity=".7" />
      {/* coqueiro */}
      <path d="M210 900 C230 760 200 620 270 470" stroke="#9C6B3F" strokeWidth="34" fill="none" strokeLinecap="round" />
      <path d="M214 860 l26 -8 M216 800 l26 -8 M214 740 l26 -8 M220 680 l26 -8 M232 620 l26 -8 M246 560 l26 -8" stroke="#7E5230" strokeWidth="6" strokeLinecap="round" />
      <g transform="translate(270 470)">
        <g className="tema-balanca devagar">
          <path d="M0 0 C-60 -50 -150 -40 -210 20 C-140 -10 -70 -10 0 0Z" fill="#3C9D4E" />
          <path d="M0 0 C60 -60 160 -60 220 0 C150 -24 70 -20 0 0Z" fill="#2F8A43" />
          <path d="M0 0 C-30 -80 -110 -120 -170 -110 C-100 -90 -40 -60 0 0Z" fill="#2F8A43" />
          <path d="M0 0 C40 -90 120 -120 180 -100 C110 -86 50 -56 0 0Z" fill="#3C9D4E" />
          <path d="M0 0 C-20 60 -90 110 -150 120 C-90 90 -40 50 0 0Z" fill="#3C9D4E" />
          <circle cx="-8" cy="12" r="14" fill="#7E5230" /><circle cx="14" cy="10" r="13" fill="#6E4B2F" />
        </g>
      </g>
      {/* estrela-do-mar e concha */}
      <path d="M1180 800 l10 22 24 2 -18 16 6 24 -22 -13 -22 13 6 -24 -18 -16 24 -2Z" fill="#F5812A" />
      <path d="M1380 830 a30 30 0 0 1 60 0Z" fill="#F7A9B8" />
      <path d="M1410 830 L1394 806 M1410 830 L1410 802 M1410 830 L1426 806" stroke="#E2879A" strokeWidth="3" />
    </>
  );
}

/* ---------------------------------------------------------------- LOUSA */
function CenaLousa() {
  return (
    <>
      <defs>
        <radialGradient id="lousa-quadro" cx=".5" cy=".45" r=".75">
          <stop offset="0" stopColor="#3A6E57" />
          <stop offset="1" stopColor="#264D3D" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="#9A6237" />
      <rect x="34" y="34" width="1532" height="800" rx="10" fill="url(#lousa-quadro)" />
      <rect x="34" y="34" width="1532" height="800" rx="10" fill="none" stroke="#7A4A26" strokeWidth="8" />
      <g fill="#fff" fillOpacity=".2" fontFamily="Nunito, sans-serif" fontWeight="700">
        <text x="140" y="190" fontSize="70">2 + 3 = 5</text>
        <text x="1180" y="170" fontSize="66">A B C</text>
        <text x="150" y="720" fontSize="56">7 × 8 = 56</text>
        <text x="1180" y="730" fontSize="60">a e i o u</text>
      </g>
      <g stroke="#fff" strokeOpacity=".2" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* sol */}
        <circle cx="1400" cy="430" r="44" />
        <path d="M1400 360 V340 M1400 500 V520 M1330 430 H1310 M1470 430 H1490 M1350 380 L1336 366 M1450 480 L1464 494 M1450 380 L1464 366 M1350 480 L1336 494" />
        {/* casinha */}
        <path d="M150 470 L230 400 L310 470 V560 H150Z M210 560 V500 H250 V560" />
        {/* estrela */}
        <path d="M720 120 l14 30 33 4 -24 22 6 32 -29 -16 -29 16 6 -32 -24 -22 33 -4Z" />
        {/* lápis */}
        <path d="M880 760 l120 -40 l12 18 l-120 40Z M880 760 l-14 22 l26 -4" />
      </g>
      {/* parte de baixo: apoio do giz */}
      <rect x="20" y="836" width="1560" height="26" rx="6" fill="#7A4A26" />
      <rect x="260" y="826" width="60" height="12" rx="4" fill="#fff" />
      <rect x="340" y="828" width="44" height="10" rx="4" fill="#FFE082" />
      <rect x="1240" y="826" width="70" height="14" rx="4" fill="#E9EEF2" />
    </>
  );
}

const CENAS = {
  selva: CenaSelva,
  mar: CenaMar,
  espaco: CenaEspaco,
  neve: CenaNeve,
  praia: CenaPraia,
  lousa: CenaLousa,
};

/* O desenho. `modo`:
   - 'tela'      → fixo atrás da tela inteira (tela do aluno)
   - 'caixa'     → preenche o elemento pai (prévia no editor)
   - 'miniatura' → parado, para o seletor */
export function CenaTema({ tema, modo = 'caixa' }) {
  const Cena = CENAS[tema];
  if (!Cena) return null;
  return (
    <svg
      className={`cena-tema cena-${modo}`}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <Cena />
    </svg>
  );
}

/* O cenário atrás da tela do aluno. O container da tela recebe classeTema()
   para ficar transparente e deixar o cenário aparecer. */
export function FundoTema({ tema }) {
  if (!temaExiste(tema)) return null;
  return <CenaTema tema={tema} modo="tela" />;
}

/* A grade de escolha no editor. */
export function SeletorTema({ valor, aoMudar, compacto = false }) {
  return (
    <div className={`seletor-tema ${compacto ? 'compacto' : ''}`} role="radiogroup" aria-label="Tema de fundo">
      {TEMAS.map(t => {
        const ativo = (valor || null) === t.id;
        return (
          <button
            key={t.id || 'nenhum'}
            type="button"
            role="radio"
            aria-checked={ativo}
            className={`seletor-tema-opcao ${ativo ? 'ativo' : ''}`}
            onClick={() => aoMudar(t.id)}
          >
            <span className="seletor-tema-figura">
              {t.id ? <CenaTema tema={t.id} modo="miniatura" /> : <Ban size={26} strokeWidth={1.6} />}
              {ativo && <span className="seletor-tema-check"><Check size={14} strokeWidth={3} /></span>}
            </span>
            <span className="seletor-tema-nome">{t.nome}</span>
          </button>
        );
      })}
    </div>
  );
}
