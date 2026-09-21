import { useState, useEffect, useRef } from 'react';
import {
  Accessibility, X, Type, Contrast, AlignJustify, Eye, Volume2,
  MousePointer2, Link as LinkIcon, Zap, RotateCcw, Minus, Plus, Check
} from 'lucide-react';
import './Acessibilidade.css';

/* ==========================================================================
   MENU DE ACESSIBILIDADE DO SABER+

   Tudo que o usuário liga aqui fica salvo no navegador, então ele não
   precisa configurar de novo a cada visita. Cada opção mexe em uma classe
   do <body>, e o CSS faz o resto.
   ========================================================================== */

const CHAVE = 'saberPlusAcessibilidade';

const PADRAO = {
  tamanhoTexto: 0,        // -1 menor, 0 normal, 1 e 2 maiores
  altoContraste: false,
  espacamento: false,
  cores: 'normal',        // normal | verde-vermelho | azul-amarelo
  fonteLegivel: false,
  leituraMouse: false,
  guiaLeitura: false,
  reduzirAnimacoes: false,
  destacarLinks: false,
};

// Os rótulos de tamanho que aparecem no menu
const TAMANHOS = ['Menor', 'Normal', 'Grande', 'Muito grande'];

const OPCOES_CORES = [
  {
    id: 'normal',
    nome: 'Cores normais',
    descricao: 'Sem ajuste',
  },
  {
    id: 'verde-vermelho',
    nome: 'Não distingo verde e vermelho',
    descricao: 'Protanopia e deuteranopia. Troca o verde por azul e o vermelho por laranja.',
  },
  {
    id: 'azul-amarelo',
    nome: 'Não distingo azul e amarelo',
    descricao: 'Tritanopia. Troca o verde por roxo e o amarelo por laranja.',
  },
];

function MenuAcessibilidade() {
  const [aberto, setAberto] = useState(false);

  const [config, setConfig] = useState(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      return salvo ? { ...PADRAO, ...JSON.parse(salvo) } : PADRAO;
    } catch {
      return PADRAO;
    }
  });

  const timerLeitura = useRef(null);
  const painelRef = useRef(null);
  const botaoRef = useRef(null);

  const mudar = (campo, valor) => setConfig(atual => ({ ...atual, [campo]: valor }));
  const alternar = (campo) => setConfig(atual => ({ ...atual, [campo]: !atual[campo] }));
  const restaurar = () => setConfig(PADRAO);

  const algumaAtiva = JSON.stringify(config) !== JSON.stringify(PADRAO);

  /* ------------------------------------------------------------------------
     Aplica as classes no <body> e guarda a escolha
     ------------------------------------------------------------------------ */
  useEffect(() => {
    const body = document.body;

    body.classList.toggle('a11y-texto-menor',  config.tamanhoTexto === -1);
    body.classList.toggle('a11y-texto-grande', config.tamanhoTexto === 1);
    body.classList.toggle('a11y-texto-maior',  config.tamanhoTexto === 2);

    body.classList.toggle('a11y-alto-contraste', config.altoContraste);
    body.classList.toggle('a11y-espacamento',    config.espacamento);
    body.classList.toggle('a11y-fonte-legivel',  config.fonteLegivel);
    body.classList.toggle('a11y-sem-animacao',   config.reduzirAnimacoes);
    body.classList.toggle('a11y-destacar-links', config.destacarLinks);

    body.classList.toggle('a11y-cores-verde-vermelho', config.cores === 'verde-vermelho');
    body.classList.toggle('a11y-cores-azul-amarelo',   config.cores === 'azul-amarelo');

    try {
      localStorage.setItem(CHAVE, JSON.stringify(config));
    } catch {
      // Navegador sem espaço ou em modo anônimo: segue sem salvar
    }
  }, [config]);

  /* ------------------------------------------------------------------------
     Leitura em voz alta ao passar o mouse
     ------------------------------------------------------------------------ */
  useEffect(() => {
    if (!config.leituraMouse) {
      window.speechSynthesis?.cancel();
      return;
    }

    const aoPassar = (e) => {
      const elemento = e.target.closest('button, a, h1, h2, h3, h4, p, span, label, strong, li');
      if (!elemento) return;

      // Não lê o próprio menu de acessibilidade, senão vira eco
      if (elemento.closest('.menu-a11y')) return;

      if (timerLeitura.current) clearTimeout(timerLeitura.current);

      timerLeitura.current = setTimeout(() => {
        const texto = elemento.innerText || elemento.title || elemento.getAttribute('aria-label');
        if (!texto || !texto.trim()) return;

        window.speechSynthesis.cancel();

        const fala = new SpeechSynthesisUtterance(texto.trim());
        fala.lang = 'pt-BR';
        fala.rate = 0.95;

        const vozes = window.speechSynthesis.getVoices();
        const preferida = vozes.find(v =>
          v.lang.includes('pt-BR') &&
          (v.name.includes('Google') || v.name.includes('Francisca') || v.name.includes('Luciana'))
        );
        if (preferida) fala.voice = preferida;

        window.speechSynthesis.speak(fala);
      }, 400);
    };

    const aoSair = () => {
      if (timerLeitura.current) clearTimeout(timerLeitura.current);
    };

    document.addEventListener('mouseover', aoPassar);
    document.addEventListener('mouseout', aoSair);

    return () => {
      document.removeEventListener('mouseover', aoPassar);
      document.removeEventListener('mouseout', aoSair);
      if (timerLeitura.current) clearTimeout(timerLeitura.current);
      window.speechSynthesis?.cancel();
    };
  }, [config.leituraMouse]);

  /* ------------------------------------------------------------------------
     Régua de leitura: uma faixa clara que acompanha o mouse
     ------------------------------------------------------------------------ */
  useEffect(() => {
    if (!config.guiaLeitura) return;

    const regua = document.createElement('div');
    regua.className = 'a11y-regua';
    document.body.appendChild(regua);

    const mover = (e) => {
      regua.style.top = `${e.clientY - 24}px`;
    };

    document.addEventListener('mousemove', mover);

    return () => {
      document.removeEventListener('mousemove', mover);
      regua.remove();
    };
  }, [config.guiaLeitura]);

  /* ------------------------------------------------------------------------
     Fecha com Esc e ao clicar fora
     ------------------------------------------------------------------------ */
  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (e) => {
      if (e.key === 'Escape') {
        setAberto(false);
        botaoRef.current?.focus();
      }
    };

    const aoClicar = (e) => {
      if (
        painelRef.current && !painelRef.current.contains(e.target) &&
        botaoRef.current && !botaoRef.current.contains(e.target)
      ) {
        setAberto(false);
      }
    };

    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('mousedown', aoClicar);

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('mousedown', aoClicar);
    };
  }, [aberto]);

  /* ------------------------------------------------------------------------
     Pedacinhos reaproveitados
     ------------------------------------------------------------------------ */
  const Chave = ({ campo, Icone, titulo, descricao }) => (
    <button
      type="button"
      className="a11y-linha"
      role="switch"
      aria-checked={config[campo]}
      onClick={() => alternar(campo)}
    >
      <span className="a11y-linha-icone"><Icone size={18} strokeWidth={1.75} /></span>

      <span className="a11y-linha-texto">
        <strong>{titulo}</strong>
        {descricao && <small>{descricao}</small>}
      </span>

      <span className={`a11y-chave ${config[campo] ? 'ligada' : ''}`} aria-hidden="true">
        <span className="a11y-chave-bola" />
      </span>
    </button>
  );

  return (
    <div className="menu-a11y">

      {aberto && (
        <div className="a11y-painel" ref={painelRef} role="dialog" aria-label="Opções de acessibilidade">

          <div className="a11y-painel-topo">
            <h2><Accessibility size={19} strokeWidth={2} /> Acessibilidade</h2>
            <button
              type="button"
              className="a11y-fechar"
              onClick={() => setAberto(false)}
              aria-label="Fechar o menu de acessibilidade"
            >
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>

          <div className="a11y-conteudo">

            {/* ---------------- ENXERGAR ---------------- */}
            <section className="a11y-grupo">
              <h3>Enxergar melhor</h3>

              <div className="a11y-linha sem-clique">
                <span className="a11y-linha-icone"><Type size={18} strokeWidth={1.75} /></span>
                <span className="a11y-linha-texto">
                  <strong>Tamanho do texto</strong>
                  <small>{TAMANHOS[config.tamanhoTexto + 1]}</small>
                </span>

                <span className="a11y-passos">
                  <button
                    type="button"
                    onClick={() => mudar('tamanhoTexto', Math.max(config.tamanhoTexto - 1, -1))}
                    disabled={config.tamanhoTexto <= -1}
                    aria-label="Diminuir o texto"
                  >
                    <Minus size={15} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => mudar('tamanhoTexto', Math.min(config.tamanhoTexto + 1, 2))}
                    disabled={config.tamanhoTexto >= 2}
                    aria-label="Aumentar o texto"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>
                </span>
              </div>

              <Chave
                campo="altoContraste"
                Icone={Contrast}
                titulo="Alto contraste"
                descricao="Fundo escuro com texto claro"
              />

              <Chave
                campo="espacamento"
                Icone={AlignJustify}
                titulo="Mais espaço entre as letras"
                descricao="Linhas e palavras mais afastadas"
              />
            </section>

            {/* ---------------- CORES ---------------- */}
            <section className="a11y-grupo">
              <h3>Cores</h3>
              <p className="a11y-grupo-nota">
                Se você confunde algumas cores, escolha a opção que combina com o
                seu caso. As cores que indicam certo e errado mudam para um par
                mais fácil de separar.
              </p>

              <div className="a11y-cores" role="radiogroup" aria-label="Ajuste de cores">
                {OPCOES_CORES.map(op => (
                  <button
                    type="button"
                    key={op.id}
                    role="radio"
                    aria-checked={config.cores === op.id}
                    className={`a11y-cor-opcao ${config.cores === op.id ? 'ativa' : ''}`}
                    onClick={() => mudar('cores', op.id)}
                  >
                    <span className="a11y-cor-amostras" aria-hidden="true">
                      <i className="amostra-certo" />
                      <i className="amostra-errado" />
                    </span>

                    <span className="a11y-cor-texto">
                      <strong>{op.nome}</strong>
                      <small>{op.descricao}</small>
                    </span>

                    {config.cores === op.id && (
                      <span className="a11y-cor-check"><Check size={14} strokeWidth={3} /></span>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* ---------------- LEITURA ---------------- */}
            <section className="a11y-grupo">
              <h3>Leitura</h3>

              <Chave
                campo="fonteLegivel"
                Icone={Eye}
                titulo="Fonte mais fácil de ler"
                descricao="Letras desenhadas para não se confundirem entre si"
              />

              <Chave
                campo="leituraMouse"
                Icone={Volume2}
                titulo="Ler em voz alta"
                descricao="Passe o mouse sobre um texto e ouça"
              />

              <Chave
                campo="guiaLeitura"
                Icone={MousePointer2}
                titulo="Régua de leitura"
                descricao="Destaca a linha onde está o mouse"
              />
            </section>

            {/* ---------------- NAVEGAÇÃO ---------------- */}
            <section className="a11y-grupo">
              <h3>Navegação</h3>

              <Chave
                campo="destacarLinks"
                Icone={LinkIcon}
                titulo="Destacar links e botões"
                descricao="Sublinha e contorna o que dá para clicar"
              />

              <Chave
                campo="reduzirAnimacoes"
                Icone={Zap}
                titulo="Reduzir animações"
                descricao="Tira os movimentos da tela"
              />
            </section>

            {algumaAtiva && (
              <button type="button" className="a11y-restaurar" onClick={restaurar}>
                <RotateCcw size={15} strokeWidth={2} /> Voltar ao normal
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        ref={botaoRef}
        className={`a11y-botao ${algumaAtiva ? 'com-ajuste' : ''}`}
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        aria-label={aberto ? 'Fechar acessibilidade' : 'Abrir opções de acessibilidade'}
        title="Acessibilidade"
      >
        {aberto
          ? <X size={22} strokeWidth={2.2} />
          : <Accessibility size={22} strokeWidth={2} />
        }
      </button>

    </div>
  );
}

export default MenuAcessibilidade;
