/* Tema (claro/escuro) das telas do aluno que ficam fora da Home.
 *
 * O aluno escolhe o tema na Home (botão sol/lua), e a escolha fica em
 * localStorage.saberPlusModoEscuro. A Área do Aluno e o Login são telas de
 * antes do login, então elas só LEEM essa escolha — quem nunca escolheu segue
 * o tema do próprio celular.
 *
 * O <meta name="color-scheme"> avisa o navegador que o site tem tema escuro
 * de verdade. Sem isso, o "modo escuro" do navegador (Samsung Internet, por
 * exemplo) inverte as cores por conta própria e a tela fica com aquele visual
 * estranho, de caixa vermelha e texto sem contraste.
 */
export function aplicarTemaAluno() {
  let escuro = false;
  try {
    const salvo = localStorage.getItem('saberPlusModoEscuro');
    escuro = salvo === null
      ? window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
      : salvo === 'true';
  } catch { /* navegador sem armazenamento: fica no tema claro */ }

  document.body.classList.toggle('modo-escuro', escuro);

  let meta = document.querySelector('meta[name="color-scheme"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'color-scheme';
    document.head.appendChild(meta);
  }
  meta.content = 'light dark';
  document.documentElement.style.colorScheme = escuro ? 'dark' : 'light';

  return escuro;
}
