/* Tutorial 3 — O aluno entra na sala e responde.
   node tut-3-aluno.mjs              -> celular (540x960)
   node tut-3-aluno.mjs computador   -> computador (1280x720) */
import { gravar, SITE } from './tutorial-motor.mjs';

const computador = process.argv[2] === 'computador';
const nomeAluno = computador ? 'Sofia' : 'Miguel';
const v = await gravar({
  nome: computador ? '3-aluno-responde-computador' : '3-aluno-responde-celular',
  titulo: 'Saber+ · O aluno',
  largura: computador ? 1280 : 540,
  altura: computador ? 720 : 960,
});
const { pg } = v;

await pg.goto(`${SITE}/aluno/area`);
await pg.waitForTimeout(1800);
await v.marca();

await v.diz('Agora é a vez do <b>aluno</b>. Ele abre o site no celular e cai direto nesta tela.');
await v.diz('A primeira coisa que o Saber+ pergunta é o <b>código da sala</b> — aquele que está no quadro.');
await v.escreve('#codigo-sala, .busca-sala-campo input, input[placeholder*="código" i]', 'NOVO01', 1500);
await v.diz('Achou. Agora é só tocar na sala.');
await v.clica(pg.locator('.sala-card').first(), 1600);

await v.diz('Aqui vem a parte que as crianças adoram: a <b>senha de emojis</b>.');
await v.diz('Em vez de digitar letras, elas só tocam nos desenhos, na ordem certa.');
for (const e of ['⚽', '🏀', '🎾', '🏓']) {
  await v.clica(pg.locator('.tecla-emoji', { hasText: e }).first(), 500);
}
await pg.waitForURL(/aluno\/login/, { timeout: 15000 });
await pg.waitForTimeout(1500);

await v.diz('Entrou na turma! Agora o aluno escolhe <b>o nome dele</b> na lista.');
await v.diz('Na primeira vez, ele toca em <b>Sou novo!</b> para se cadastrar.');
await v.clica('.aluno-btn-novo', 1600);

await v.diz('Ele escreve o <b>primeiro nome</b>.');
await v.escreve('input', nomeAluno, 900);
const continuar = pg.locator('button:has-text("Continuar"), button[type=submit]').first();
await v.clica(continuar, 1600);

await v.diz('E cria um <b>PIN de 4 números</b>, que é a senha só dele.');
for (const n of ['2', '0', '2', '6']) await v.clica(pg.locator('.pin-tecla', { hasText: new RegExp(`^${n}$`) }).first(), 420);
await pg.waitForTimeout(1200);

await v.diz('O sistema pede para <b>repetir o PIN</b>, para ter certeza de que ele não vai esquecer.');
for (const n of ['2', '0', '2', '6']) await v.clica(pg.locator('.pin-tecla', { hasText: new RegExp(`^${n}$`) }).first(), 420);
await pg.waitForURL(/aluno\/home/, { timeout: 15000 });
await pg.waitForTimeout(2200);
await v.festa();

await v.diz('Pronto! Esta é a <b>tela do aluno</b>, com as atividades que a professora publicou.');
await pg.waitForTimeout(800);

await v.diz('É só tocar na atividade para começar.');
const cartao = pg.locator('.aluno-atividade-card', { hasText: 'Quiz dos Animais' }).first();
await v.clica(cartao.locator('.atv-btn').first(), 2600);

await pg.waitForSelector('.qa-comecar, .qa-alternativas', { timeout: 25000 });
if (await pg.locator('.qa-comecar').isVisible().catch(() => false)) {
  await v.diz('Ele vê quantas perguntas tem e toca em <b>começar</b>.');
  await v.clica('.qa-comecar', 2000);
}
await pg.waitForSelector('.qa-alternativas button', { timeout: 25000 });

await v.diz('A pergunta aparece grande, com as alternativas coloridas e o <b>tempo</b> correndo.');
await pg.waitForTimeout(1200);

await v.diz('O aluno toca na resposta que ele acha certa.');
await v.clica(pg.locator('.qa-alternativas button', { hasText: 'Golfinho' }).first(), 2200);

await v.diz('Depois é só ir para a próxima e, no fim, <b>enviar</b>.');
const enviar = pg.locator('.jogo-btn', { hasText: /Enviar|Terminar|Finalizar/i }).first();
if (await enviar.count()) await v.clica(enviar, 3000);
const confirmar = pg.locator('button', { hasText: /^(Enviar|Sim|Confirmar)/i }).first();
if (await confirmar.isVisible().catch(() => false)) await v.clica(confirmar, 3000);
await pg.waitForTimeout(1500);

await v.diz('No fim ele vê quantos <b>pontos</b> fez — e isso vira estrelinha e insígnia.', 2000);
await v.festa();

await v.diz('Simples assim: código, emojis, PIN e responder. Nenhuma criança precisa de e-mail.', 1400);
const arquivo = await v.fim();
console.log(arquivo);
