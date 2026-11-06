/* Tutorial 1 — Criar uma sala e cuidar dos alunos.
   Gravado com uma conta nova em folha, para mostrar o "Comece por aqui". */
import { gravar, SITE } from './tutorial-motor.mjs';

const EMAIL = `ana.paula${Date.now() % 100000}@escola.com`;
const SENHA = 'escola2026';

const v = await gravar({ nome: '1-criar-sala', titulo: 'Saber+ · Criar uma sala' });
const { pg } = v;

/* conta nova, criada antes da gravação começar para valer */
await pg.goto(`${SITE}/cadastro/professor`);
await pg.waitForTimeout(1200);
await v.marca();

await v.diz('Vamos criar uma <b>sala</b> no Saber+ e deixar ela pronta para os alunos entrarem.');
await v.diz('Esta professora acabou de criar a conta dela. É a primeira vez que ela entra.');
await pg.fill('input[name="nome"]', 'Ana Paula Ribeiro');
await pg.fill('input[name="email"]', EMAIL);
await pg.fill('input[name="senha"]', SENHA);
await pg.fill('input[name="confirmarSenha"]', SENHA);
await v.clica('.btn-cadastrar-professor', 4500);
await v.festa();
await pg.waitForTimeout(1500);

await v.diz('Pronto: o Saber+ já entra direto, sem pedir a senha de novo.');
await v.diz('E a primeira tela não vem vazia — ela mostra o <b>caminho das pedras</b>, em três passos.');
await v.aponta('.inicio-guia, .dashboard-main').catch(() => {});
await pg.waitForTimeout(1400);

await v.diz('O passo 1 é justamente este: <b>criar a sala</b>.');
await v.clica(pg.locator('button', { hasText: 'Criar sala' }).first(), 2200);

await v.diz('Escolha o tipo. A <b>sala permanente</b> é a do dia a dia, que fica guardada o ano todo.');
await v.clica('.tipo-sala-card:has-text("Sala permanente")', 900);

await v.diz('Agora é só dar um <b>nome</b> para a sala.');
await v.escreve('input[placeholder*="Turma da manhã" i]', 'Turma da Manhã - 3º ano');

await v.diz('Preencha a <b>série</b> e a <b>matéria</b>, para você se achar depois na lista.');
const campos = pg.locator('.form-row select');
await v.aponta(campos.nth(0));
await campos.nth(0).selectOption('3º Ano');
await pg.waitForTimeout(700);
await v.aponta(campos.nth(1));
await campos.nth(1).selectOption('Ciências');
await pg.waitForTimeout(800);

await v.diz('Olhe aqui embaixo: o sistema já mostra o <b>código</b> que os alunos vão digitar.');
await v.aponta('.criar-previa');
await pg.waitForTimeout(900);

await v.diz('Agora é só clicar em <b>Criar sala</b>.');
await v.clica('.btn-criar-sala', 2600);

await v.diz('Sala criada! Esta tela é a mais importante de todas — <b>anote o que está aqui</b>.');
await v.aponta('.criar-acesso');
await v.diz('Este é o <b>código da sala</b>. É por ele que os alunos encontram a sua sala.');
await v.aponta('.criar-senha').catch(() => {});
await v.diz('E esta é a <b>senha de emojis</b>. As crianças entram tocando nos desenhos, sem digitar nada.');
await v.diz('Escreva o código e os emojis no quadro, para a turma toda ver.', 600);

await v.clica('.criar-sucesso-acoes .btn-acao-rapida.destaque', 2600);
await v.festa();

await v.diz('A sala nova já aparece na sua lista.');
const cartao = pg.locator('.sala-cartao', { hasText: 'Turma da Manhã' }).first();
await v.aponta(cartao);

await v.diz('No cartão você já vê o <b>código</b> e, clicando no olhinho, a <b>senha de emojis</b>.');
const olho = cartao.locator('.sala-dado:has-text("Senha") .btn-icone').first();
if (await olho.count()) await v.clica(olho, 1400);

await v.diz('Em <b>Ver detalhes</b> você acompanha quem já entrou na sala.');
await v.clica(cartao.locator('.sala-cartao-link').first(), 2400);

await v.diz('Aqui dentro ficam o código, a senha de emojis e a <b>lista de alunos</b>.', 900);
await v.diz('Se um aluno esquecer o PIN dele, você troca por aqui mesmo, em dois cliques.', 900);

await v.diz('Voltando para a página inicial, o guia já marcou o passo 1 como feito.');
await pg.goto(`${SITE}/professor/dashboard`);
await pg.waitForTimeout(2400);
await v.festa();
await pg.waitForTimeout(1200);

await v.diz('É isso! A sala está pronta. No próximo vídeo vamos <b>criar uma atividade</b>.', 1200);
const arquivo = await v.fim();
console.log(arquivo);
