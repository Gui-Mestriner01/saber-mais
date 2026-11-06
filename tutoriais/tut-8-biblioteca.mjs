/* Tutorial 8 — Biblioteca: usar uma atividade que outro professor já montou */
import { gravar, SITE } from './tutorial-motor.mjs';

const v = await gravar({ nome: '8-biblioteca', titulo: 'Saber+ · Biblioteca' });
const { pg } = v;

await pg.goto(`${SITE}/login/professor`);
await pg.waitForTimeout(1200);
await v.marca();

await v.diz('Nem sempre dá tempo de montar atividade do zero. Para isso existe a <b>Biblioteca</b>.');
await v.escreve('input[type=email]', 'nova@escola.com');
await v.escreve('input[type=password]', 'senha12345');
await v.clica('.btn-entrar', 3500);
await v.festa();
await pg.waitForTimeout(1200);

await pg.goto(`${SITE}/professor/biblioteca`);
await pg.waitForTimeout(2800);
await v.festa();

await v.diz('Aqui ficam as atividades que outros professores deixaram <b>públicas</b> para todo mundo usar.');
await pg.waitForTimeout(1200);

await v.diz('Cada cartão mostra o tipo, a série, a matéria e <b>quem publicou</b>.');
await v.aponta('.bib-card');
await pg.waitForTimeout(1200);

await v.diz('Dá para procurar pelo assunto que você vai dar na aula.');
await v.escreve('.rel-busca input, input[placeholder*="Buscar" i]', 'ciclo da água', 1800);

const cartao = pg.locator('.bib-card').first();
await v.aponta(cartao);
await v.diz('Achou uma que serve? Você tem <b>dois caminhos</b>.');

await v.diz('O primeiro é <b>Usar na minha sala</b>: traz a atividade pronta, do jeito que está.');
await v.clica(cartao.locator('button', { hasText: 'Usar na minha sala' }).first(), 2000);

await v.diz('Você só escolhe <b>para qual sala</b> ela vai.');
const destino = pg.locator('.modal-content select').first();
await v.aponta(destino);
const salas = await destino.locator('option').allInnerTexts();
const i = salas.findIndex(o => o.includes('Turma Teste'));
await destino.selectOption({ index: i >= 0 ? i : 0 });
await pg.waitForTimeout(1200);

await v.clica(pg.locator('.modal-actions .btn-primario').first(), 3500);
await v.festa();
await v.diz('Pronto: a atividade já está na sua sala, e os alunos conseguem fazer.', 1400);

await v.diz('O segundo caminho é <b>Adaptar</b>: ela abre no editor e você muda o que quiser antes de salvar.');
await pg.waitForTimeout(1000);
const adaptar = pg.locator('.bib-card').first().locator('button', { hasText: /Adaptar|Editar/ }).first();
if (await adaptar.count()) {
  await v.aponta(adaptar);
  await pg.waitForTimeout(1200);
}

await v.diz('E o contrário também vale: ao criar a sua atividade, marque <b>Pública</b> para ajudar outros professores.', 1600);

await v.diz('Isso economiza muito tempo — principalmente no começo do ano.', 1300);

const arquivo = await v.fim();
console.log(arquivo);
