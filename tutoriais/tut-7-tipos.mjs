/* Tutorial 7 — Os tipos de atividade do Saber+ */
import { gravar, SITE } from './tutorial-motor.mjs';

const v = await gravar({ nome: '7-tipos-de-atividade', titulo: 'Saber+ · Tipos de atividade' });
const { pg } = v;

await pg.goto(`${SITE}/login/professor`);
await pg.waitForTimeout(1200);
await v.marca();

await v.diz('O Saber+ não tem só quiz. Vamos ver <b>todos os tipos de atividade</b> e para que serve cada um.');
await v.escreve('input[type=email]', 'nova@escola.com');
await v.escreve('input[type=password]', 'senha12345');
await v.clica('.btn-entrar', 3500);
await v.festa();
await pg.waitForTimeout(1200);

await pg.goto(`${SITE}/professor/criar-atividade`);
await pg.waitForTimeout(2400);
await v.festa();

await v.diz('Todos ficam nesta tela. Primeiro escolha a turma, depois o tipo.');
const turma = pg.locator('select').first();
const ops = await turma.locator('option').allInnerTexts();
await turma.selectOption({ index: ops.findIndex(o => o.includes('Turma Teste')) });
await pg.waitForTimeout(1000);

const passear = async (nomeTipo, fala) => {
  const card = pg.locator('.tipo-card', { hasText: nomeTipo }).first();
  await card.scrollIntoViewIfNeeded().catch(() => {});
  await pg.waitForTimeout(500);
  await v.aponta(card);          // o anel aparece antes da fala
  await card.click();
  await v.diz(fala);             // aí sim a legenda, com o cartão já na tela
  await pg.waitForTimeout(400);
};

await passear('Quiz',
  '<b>Quiz</b> — perguntas com alternativas. Dentro dele também cabem verdadeiro ou falso e puzzle.');

await v.diz('<b>Resposta aberta</b> aparece marcada como <b>Em breve</b>: a tela do aluno ainda está sendo feita, então ela nem deixa escolher.');
await v.aponta(pg.locator('.tipo-card', { hasText: 'Resposta aberta' }).first());
await pg.waitForTimeout(900);

await passear('Ligar correspondentes',
  '<b>Ligar correspondentes</b> — duas colunas para o aluno conectar. Ótimo para animal e foto, palavra e desenho.');

await passear('Pintar cenário',
  '<b>Pintar cenário</b> — você sobe um desenho e a criança pinta na tela, com pincel e borracha.');

await passear('Colocar em ordem',
  '<b>Colocar em ordem</b> — o aluno arruma os itens na sequência certa. Bom para fases de uma história.');

await passear('Jogo da memória',
  '<b>Jogo da memória</b> — virar as cartas e achar os pares. As crianças pedem para repetir.');

await passear('Separar em grupos',
  '<b>Separar em grupos</b> — cada item vai para a caixa dele. Serve para classificar qualquer coisa.');

await v.diz('Escolhido o tipo, é só clicar em <b>continuar</b> e montar a atividade no editor.');
await v.aponta('.btn-acao-rapida.destaque');
await pg.waitForTimeout(1200);

await v.diz('Quase todos corrigem sozinhos. Só a <b>pintura</b> precisa do seu olhar.', 1200);

await v.diz('Dica: misture os tipos. A turma cansa menos e você enxerga melhor quem aprendeu.', 1400);

const arquivo = await v.fim();
console.log(arquivo);
