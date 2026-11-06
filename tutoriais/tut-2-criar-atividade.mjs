/* Tutorial 2 — Criar uma atividade (quiz) */
import { gravar, SITE } from './tutorial-motor.mjs';

const v = await gravar({ nome: '2-criar-atividade', titulo: 'Saber+ · Criar uma atividade' });
const { pg } = v;

await pg.goto(`${SITE}/login/professor`);
await pg.waitForTimeout(1200);
await v.marca();

await v.diz('Agora vamos <b>criar uma atividade</b> para a turma responder.');
await v.escreve('input[type=email]', 'nova@escola.com');
await v.escreve('input[type=password]', 'senha12345');
await v.clica('.btn-entrar', 3500);
await v.festa();
await pg.waitForTimeout(1200);

await pg.goto(`${SITE}/professor/criar-atividade`);
await pg.waitForTimeout(2200);
await v.festa();

await v.diz('Esta é a tela de <b>criar atividade</b>. Comece escolhendo para qual turma ela vai.');
const turma = pg.locator('select').first();
await v.aponta(turma);
const opcoes = await turma.locator('option').allInnerTexts();
await turma.selectOption({ index: opcoes.findIndex(o => o.includes('Turma Teste')) });
await pg.waitForTimeout(1200);

await v.diz('Agora escolha o <b>tipo de atividade</b>. O Saber+ tem vários — quiz, ligar, ordenar, pintura e outros.');
await v.aponta('.tipo-card');
await pg.waitForTimeout(800);

await v.diz('Vamos fazer um <b>Quiz</b>, que é o mais usado: pergunta com alternativas.');
await v.clica('.tipo-card:has-text("Quiz")', 1200);
await v.clica('.btn-acao-rapida.destaque', 2600);

await v.diz('Entramos no <b>editor</b>. Comece dando um nome para a atividade.');
await v.escreve('.editor-nova input.editor-input', 'Quiz dos Animais', 900);

await v.diz('Escolha o tipo da primeira pergunta.');
await v.clica('.quiz-comecar-tipos button:has-text("Quiz")', 1400);

await v.diz('Escreva o <b>enunciado</b>, ou seja, a pergunta.');
await v.escreve('.quiz-enunciado', 'Qual desses animais é um mamífero?', 800);

await v.diz('Agora as <b>alternativas</b>. Pode usar duas, três ou quatro.');
await pg.mouse.wheel(0, 300);
await pg.waitForTimeout(600);
const resp = pg.locator('.quiz-resposta input');
await v.escreve(resp.nth(0), 'Tubarão', 400);
await v.escreve(resp.nth(1), 'Golfinho', 400);
await v.escreve(resp.nth(2), 'Sardinha', 700);

await v.diz('Atenção a este passo: é preciso <b>marcar qual é a resposta certa</b>.');
await v.clica(pg.locator('.quiz-resposta').nth(1).locator('.quiz-certa'), 1400);

await v.diz('Do lado direito dá para ajustar o <b>tempo</b> e os <b>pontos</b> da pergunta.');
await v.aponta('.quiz-prop');
await pg.waitForTimeout(1000);

await v.diz('Quer mais perguntas? É só clicar em <b>adicionar</b> e repetir.');
const addPergunta = pg.locator('button:has-text("Adicionar pergunta")').first();
if (await addPergunta.count()) await v.aponta(addPergunta);
await pg.waitForTimeout(600);

await v.diz('Antes de salvar, role até o fim: aqui você escolhe o <b>prazo para entregar</b>.');
await v.aponta('.prazo-atalhos');
await pg.waitForTimeout(700);

await v.diz('Pode deixar <b>Sem prazo</b>, ou dar 1 dia, 3 dias, 1 semana — o que combinar com a turma.');
await v.clica(pg.locator('.prazo-atalhos button', { hasText: '3 dias' }).first(), 1200);
await v.diz('Depois do prazo a atividade fecha sozinha e aparece como encerrada para os alunos.');
await pg.waitForTimeout(600);

await v.diz('Agora é só clicar em <b>salvar</b>. A atividade já vai para a turma.');
await v.clica('.editor-rodape button', 3000);
await v.festa();

await v.diz('Pronto — a atividade está publicada e os alunos já conseguem ver no celular deles.', 1400);
const arquivo = await v.fim();
console.log(arquivo);
