/* Tutorial 4 — Ver os relatórios e corrigir as entregas */
import { gravar, SITE } from './tutorial-motor.mjs';

const v = await gravar({ nome: '4-relatorios', titulo: 'Saber+ · Relatórios e correção' });
const { pg } = v;

await pg.goto(`${SITE}/login/professor`);
await pg.waitForTimeout(1200);
await v.marca();

await v.diz('Os alunos responderam. Agora vamos ver o <b>resultado da turma</b>.');
await v.escreve('input[type=email]', 'nova@escola.com');
await v.escreve('input[type=password]', 'senha12345');
await v.clica('.btn-entrar', 3500);
await v.festa();
await pg.waitForTimeout(1200);

await pg.goto(`${SITE}/professor/relatorios`);
await pg.waitForTimeout(2600);
await v.festa();

await v.diz('Esta é a tela de <b>Relatórios</b>. Cada cartão é uma atividade que você publicou.');
await pg.waitForTimeout(800);

await v.diz('O cartão já responde a pergunta do dia a dia: <b>quantos fizeram e quantos faltam</b>.');
const cartao = pg.locator('.rel-card', { hasText: 'Quiz do Sistema Solar' }).first();
await v.aponta(cartao);
await pg.waitForTimeout(900);

await v.diz('Mais embaixo tem os <b>gráficos</b>, que mostram o desempenho geral das suas turmas.');
await pg.mouse.wheel(0, 520);
await pg.waitForTimeout(1600);
await pg.mouse.wheel(0, -520);
await pg.waitForTimeout(900);

await v.diz('Para olhar uma atividade de perto, clique em <b>Ver relatório</b>.');
await v.clica(cartao.locator('.rel-btn-ver').first(), 3000);
await v.festa();

await v.diz('Aqui o sistema mostra <b>item por item</b>: qual pergunta a turma acertou e qual deu trabalho.');
await pg.waitForTimeout(1600);

await v.diz('Essa é a parte mais útil: se todo mundo errou a mesma pergunta, o assunto precisa ser revisto.');
await pg.waitForTimeout(600);

await v.diz('Agora troque para a aba <b>Por aluno</b>.');
await v.clica(pg.locator('button', { hasText: 'Por aluno' }).first(), 2200);

await v.diz('Cada criança aparece com a <b>nota</b> e o <b>tempo</b> que levou para responder.');
await pg.waitForTimeout(1200);

await v.diz('E, logo abaixo, a lista <b>Ainda não fizeram</b> — com o nome de quem você precisa cobrar.');
await v.aponta('.rel-faltam-bloco').catch(() => {});
await pg.waitForTimeout(1600);

await v.diz('Clicando no nome, você abre a resposta dela.');
await v.clica('.aluno-card-topo', 2000);

await v.diz('Nas atividades automáticas, como o quiz, a <b>nota já vem pronta</b>.');
await pg.waitForTimeout(1000);

const campoNota = pg.locator('.aluno-card input[type=number], .aluno-card input').first();
if (await campoNota.count()) {
  await v.diz('Mas você pode mudar a nota e escrever um <b>comentário</b> para o aluno.');
  await v.aponta(campoNota);
  await pg.waitForTimeout(900);
  const salvar = pg.locator('button', { hasText: 'Salvar correção' }).first();
  if (await salvar.count()) await v.aponta(salvar);
  await pg.waitForTimeout(800);
}

await v.diz('Nas atividades de <b>pintura</b> aparece a imagem do aluno, com botão para ampliar e baixar.', 1200);

await v.diz('É assim que você acompanha a turma: tudo registrado, sem precisar corrigir no papel.', 1400);
const arquivo = await v.fim();
console.log(arquivo);
