/* Tutorial 6 — Atividade de pintura, do começo ao fim, numa tela só.
   node tut-6-pintura.mjs             -> versão computador (1280x720), fluxo completo
   node tut-6-pintura.mjs celular     -> versão celular (540x960), só a parte do aluno */
import { gravar, SITE } from './tutorial-motor.mjs';

const celular = process.argv[2] === 'celular';
const nome = celular ? '6-pintura-celular' : '6-pintura-computador';
const DESENHO = '/tmp/claude-0/desenho-casa.png';
const titulo = 'Pinte a casinha';

const v = await gravar({
  nome,
  titulo: celular ? 'Saber+ · Pintura no celular' : 'Saber+ · Atividade de pintura',
  largura: celular ? 540 : 1280,
  altura: celular ? 960 : 720,
});
const { pg } = v;

/* ---------- o professor cria a atividade (só na versão computador) ---------- */
if (!celular) {
  await pg.goto(`${SITE}/login/professor`);
  await pg.waitForTimeout(1200);
  await v.marca();

  await v.diz('A <b>pintura</b> é a atividade preferida dos pequenos: você sobe um desenho e eles colorem na tela.');
  await v.escreve('input[type=email]', 'nova@escola.com');
  await v.escreve('input[type=password]', 'senha12345');
  await v.clica('.btn-entrar', 3500);
  await v.festa();
  await pg.waitForTimeout(1200);

  await pg.goto(`${SITE}/professor/criar-atividade`);
  await pg.waitForTimeout(2200);
  await v.festa();

  await v.diz('Escolha a turma e, no tipo de atividade, clique em <b>Pintura</b>.');
  const turma = pg.locator('select').first();
  const ops = await turma.locator('option').allInnerTexts();
  await turma.selectOption({ index: ops.findIndex(o => o.includes('Turma Teste')) });
  await pg.waitForTimeout(900);
  await v.clica('.tipo-card:has-text("Pintar cenário")', 1200);
  await v.clica('.btn-acao-rapida.destaque', 2600);

  await v.diz('Dê um nome para a atividade.');
  await v.escreve('.editor-nova input.editor-input', titulo, 800);

  await v.diz('Escreva a <b>instrução</b>: o que você quer que a criança pinte.');
  const instrucao = pg.locator('.editor-cartao input.editor-input, .editor-cartao textarea.editor-input').last();
  await v.escreve(instrucao, 'Pinte o céu de azul, a casa de vermelho e a árvore de verde!', 900);

  await v.diz('Agora suba o <b>desenho</b>. Serve qualquer imagem de traço grosso, dessas de livro de colorir.');
  await v.aponta('.editor-imagem');
  await pg.locator('input[type=file]').setInputFiles(DESENHO);
  await pg.waitForTimeout(2600);

  await v.diz('O desenho já aparece na prévia. É exatamente assim que a criança vai ver.');
  await pg.waitForTimeout(1400);

  await v.diz('Salve a atividade.');
  await v.clica('.editor-rodape button', 4000);
  await v.festa();

  await v.diz('Agora vamos ver a mesma atividade do lado do <b>aluno</b>.', 1000);
}

/* ---------- o aluno pinta ---------- */
await pg.goto(`${SITE}/aluno/area`);
await pg.waitForTimeout(2000);
await v.marca();

if (celular) {
  await v.diz('A professora mandou uma <b>pintura</b>. Vamos ver como a criança faz, no celular.');
}
await v.diz('O aluno entra como sempre: digita o <b>código da sala</b> e a <b>senha de emojis</b>.');
await v.escreve('#codigo-sala, .busca-sala-campo input, input[placeholder*="código" i]', 'NOVO01', 1300);
await v.clica(pg.locator('.sala-card').first(), 1200);
for (const e of ['⚽', '🏀', '🎾', '🏓']) await v.clica(pg.locator('.tecla-emoji', { hasText: e }).first(), 420);
await pg.waitForURL(/aluno\/login/, { timeout: 20000 });
await pg.waitForTimeout(1400);

await v.diz('Escolhe o nome dele e o <b>PIN</b>.');
await v.clica(pg.locator('.aluno-btn', { hasText: 'Lia' }).first(), 1000);
for (const k of ['1', '2', '3', '4']) await v.clica(pg.locator('.pin-tecla', { hasText: new RegExp(`^${k}$`) }).first(), 380);
await pg.waitForURL(/aluno\/home/, { timeout: 25000 });
await pg.waitForTimeout(2400);
await v.festa();

await v.diz('E abre a atividade de pintura.');
const cartaoAluno = pg.locator('.aluno-atividade-card', { hasText: titulo }).first();
await v.clica(cartaoAluno.locator('.atv-btn').first(), 1000);
await pg.waitForSelector('.pint-quadro', { timeout: 30000 });
await pg.waitForTimeout(2200);

await v.diz('Esta é a <b>tela de pintura</b>. O desenho da professora fica no fundo, como uma folha.');
await v.diz('A instrução que você escreveu aparece aqui em cima.');
await v.aponta('.pint-instrucao').catch(() => {});

await v.diz('As <b>ferramentas</b> ficam juntas: as cores, o pincel, a borracha e a espessura do traço.');
await v.aponta('.pint-ferramentas');
await pg.waitForTimeout(900);

const caixa = await pg.locator('.pint-quadro').boundingBox();
const pincelar = async (pontos) => {
  await pg.mouse.move(caixa.x + pontos[0][0] * caixa.width, caixa.y + pontos[0][1] * caixa.height);
  await pg.mouse.down();
  for (const [px, py] of pontos.slice(1)) {
    await pg.mouse.move(caixa.x + px * caixa.width, caixa.y + py * caixa.height, { steps: 16 });
  }
  await pg.mouse.up();
  await pg.waitForTimeout(350);
};

await v.diz('A criança escolhe uma <b>cor</b> e pinta — com o dedo no celular ou com o mouse.');
await v.clica(pg.locator('.pint-cor').nth(5), 800);
await pg.locator('input[type=range]').first().fill('26').catch(() => {});
await pg.waitForTimeout(400);
await pincelar([[0.08, 0.12], [0.30, 0.10], [0.52, 0.14], [0.25, 0.20], [0.08, 0.17]]);
await pincelar([[0.08, 0.24], [0.48, 0.22], [0.20, 0.30], [0.08, 0.28]]);
await pg.waitForTimeout(900);

await v.diz('Dá para trocar de cor quantas vezes quiser.');
await v.clica(pg.locator('.pint-cor').nth(1), 700);
await pincelar([[0.40, 0.62], [0.62, 0.62], [0.62, 0.72], [0.40, 0.72], [0.40, 0.62]]);
await pincelar([[0.42, 0.66], [0.60, 0.66], [0.60, 0.70], [0.42, 0.70]]);
await pg.waitForTimeout(1000);

await v.diz('Agora o detalhe mais importante do editor: a <b>borracha</b>.');
await v.clica(pg.locator('.pint-tool', { hasText: 'Borracha' }).first(), 1200);

await v.diz('Ela apaga <b>só o que a criança pintou</b>. O desenho de baixo continua inteirinho.');
await pincelar([[0.44, 0.64], [0.59, 0.64], [0.59, 0.70], [0.44, 0.70]]);
await pg.waitForTimeout(1800);

await v.diz('Viu? O traço some e as linhas do desenho reaparecem — nada de borrão branco por cima.');
await pg.waitForTimeout(1200);

await v.diz('Voltando para o <b>pincel</b>, é só continuar.');
await v.clica(pg.locator('.pint-tool', { hasText: 'Pincel' }).first(), 900);
await v.clica(pg.locator('.pint-cor').nth(3), 700);
await pincelar([[0.74, 0.40], [0.90, 0.40], [0.90, 0.52], [0.74, 0.52], [0.74, 0.40]]);
await pincelar([[0.76, 0.46], [0.88, 0.46]]);
await pg.waitForTimeout(900);

await v.diz('Quando terminar, é só <b>enviar</b>.');
await v.clica('.pint-btn.enviar', 1600);
const confirma = pg.locator('.pint-janela button').filter({ hasText: /Enviar|Sim/i }).first();
if (await confirma.isVisible().catch(() => false)) await v.clica(confirma, 5000);
await pg.waitForTimeout(2500);

if (celular) {
  await v.diz('Pronto! A pintura foi entregue e já está na mão da professora.', 1600);
  const arquivo = await v.fim();
  console.log(arquivo);
} else {
  await v.diz('Pintura entregue. Agora voltamos para o <b>professor</b>.', 1000);

  await pg.goto(`${SITE}/professor/relatorios`);
  await pg.waitForTimeout(2800);
  await v.festa();

  await v.diz('A entrega aparece nos <b>Relatórios</b>, junto com as outras atividades.');
  const relCard = pg.locator('.rel-card', { hasText: titulo }).first();
  await v.clica(relCard.locator('.rel-btn-ver').first(), 3000);
  await v.festa();
  await v.clica(pg.locator('button', { hasText: 'Por aluno' }).first(), 2600);

  await v.diz('Aqui está a pintura da criança, do jeitinho que ela entregou.');
  await v.aponta('.pintura-previa, .pintura-entrega').catch(() => {});
  await pg.waitForTimeout(1400);

  await v.diz('Em <b>Ampliar</b>, ela abre em tela cheia.');
  const lupa = pg.locator('button', { hasText: 'Ampliar' }).first();
  if (await lupa.count()) {
    await v.clica(lupa, 3000);
    await pg.waitForTimeout(2000);
    await pg.keyboard.press('Escape').catch(() => {});
    await pg.waitForTimeout(1400);
  }

  await v.diz('E em <b>Baixar a pintura</b> você salva o desenho no computador.');
  const baixar = pg.locator('button', { hasText: 'Baixar' }).first();
  if (await baixar.count()) await v.aponta(baixar);
  await pg.waitForTimeout(1200);

  await v.diz('O arquivo vem com o nome do aluno e da atividade — dá para imprimir e colar no mural.', 1600);
  const arquivo = await v.fim();
  console.log(arquivo);
}
