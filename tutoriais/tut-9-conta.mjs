/* Tutorial 9 — Criar a conta de professor e recuperar a senha por e-mail */
import { gravar, SITE } from './tutorial-motor.mjs';
import fs from 'fs';

const EMAIL = 'professora.marina@escola.com';
const SENHA = 'escola2026';
const SENHA_NOVA = 'novaSenha2026';
const LOG = '/tmp/claude-0/srv.log';

const v = await gravar({ nome: '9-conta-e-senha', titulo: 'Saber+ · Conta e senha' });
const { pg } = v;

await pg.goto(`${SITE}/cadastro/professor`);
await pg.waitForTimeout(2000);
await v.marca();

await v.diz('Vamos do comecinho: <b>criar a conta</b> de um professor no Saber+.');
await v.diz('Só o professor faz cadastro. As crianças entram pela sala, sem e-mail e sem senha de verdade.');

await v.diz('Primeiro, o <b>nome completo</b>.');
await v.escreve('input[name="nome"]', 'Marina Alves de Souza', 700);

await v.diz('Depois o <b>e-mail</b>. É por ele que você entra e recupera a senha se esquecer.');
await v.escreve('input[name="email"]', EMAIL, 700);

await v.diz('E a <b>senha</b>, com pelo menos 8 caracteres.');
await v.escreve('input[name="senha"]', SENHA, 500);
await v.escreve('input[name="confirmarSenha"]', SENHA, 800);

await v.diz('Agora é só <b>criar a conta</b>.');
await v.clica('.btn-cadastrar-professor', 4500);
await v.festa();
await pg.waitForTimeout(1500);

await v.diz('Conta criada — e o Saber+ <b>já entra direto</b>, sem pedir a senha outra vez.', 1200);
await v.diz('A primeira tela mostra os três passos para começar: criar a sala, criar a atividade e passar o acesso.', 1400);

/* ---------- esqueci minha senha ---------- */
await pg.goto(`${SITE}/login/professor`);
await pg.waitForTimeout(2200);

await v.diz('Agora a parte que todo mundo precisa um dia: <b>esqueci minha senha</b>.');
await v.diz('Na tela de entrar, clique no link embaixo do campo da senha.');
const link = pg.locator('a, button').filter({ hasText: /Esqueci minha senha|Esqueci a senha/i }).first();
await v.clica(link, 2500);

await v.diz('Digite o <b>e-mail da conta</b> e peça o link.');
await v.escreve('input[type="email"]', EMAIL, 700);
const marcaLog = fs.existsSync(LOG) ? fs.statSync(LOG).size : 0;
await v.clica('.btn-entrar', 4000);

await v.diz('Pronto: o Saber+ manda um <b>e-mail</b> com um link que vale por 1 hora.');
await pg.waitForTimeout(2000);
await v.diz('Por segurança, a tela mostra a mesma mensagem mesmo se o e-mail não existir.');
await pg.waitForTimeout(800);

/* pega o link que o servidor gerou (no site publicado ele vai por e-mail) */
await pg.waitForTimeout(1500);
const texto = fs.readFileSync(LOG, 'utf8').slice(marcaLog);
const achado = texto.match(/\/redefinir-senha\?codigo=[a-f0-9]+/);

await v.diz('No e-mail, o professor clica no botão e cai nesta tela.');
if (achado) {
  await pg.goto(SITE + achado[0]);
  await pg.waitForTimeout(2800);

  await v.diz('Aqui ele escolhe a <b>senha nova</b> e repete para confirmar.');
  await v.escreve('input[placeholder*="Senha nova" i]', SENHA_NOVA, 500);
  await v.escreve('input[type="password"] >> nth=1', SENHA_NOVA, 800);

  await v.clica('.btn-entrar', 4000);
  await v.diz('Senha trocada! O link antigo <b>deixa de funcionar</b> na hora, então ninguém reaproveita.');
  await pg.waitForTimeout(1600);

  await v.diz('E agora é só entrar com a senha nova.');
  await pg.goto(`${SITE}/login/professor`);
  await pg.waitForTimeout(2000);
  await v.escreve('input[type=email]', EMAIL);
  await v.escreve('input[type=password]', SENHA_NOVA);
  await v.clica('.btn-entrar', 4000);
  await v.festa();
  await v.diz('Entrou. Conta recuperada sem precisar chamar ninguém para ajudar.', 1400);
} else {
  await v.diz('(No site publicado, o link chega no e-mail cadastrado.)', 1500);
}

await v.diz('Resumindo: o professor cria a conta com e-mail e senha, e recupera sozinho se esquecer.', 1500);

const arquivo = await v.fim();
console.log(arquivo);
