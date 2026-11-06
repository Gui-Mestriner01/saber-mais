/* Tutorial 5 — Modo ao vivo: a turma responde junto, com ranking na hora.
   A tela gravada é a do professor; alguns alunos de verdade respondem em paralelo. */
import { gravar, SITE } from './tutorial-motor.mjs';

const log = (...t) => console.log('·', ...t);
const pedir = (metodo, rota, { token, corpo } = {}) =>
  fetch(SITE + rota, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  }).then(async r => ({ s: r.status, d: await r.json().catch(() => ({})) }));

const prof = (await pedir('POST', '/login/professor', { corpo: { email: 'nova@escola.com', senha: 'senha12345' } })).d;
await pedir('POST', '/live/encerrar', { token: prof.token, corpo: { sala_id: 3 } });
const titulo = 'Quiz do Sistema Solar';
await pedir('POST', '/professor/atividade', {
  token: prof.token,
  corpo: {
    titulo, tipo: 'quiz', sala_id: 3, tema: 'espaco',
    conteudo: {
      perguntas: [
        { tipo: 'quiz', texto: 'Qual planeta tem anéis?', tempo: 60, pontos: 'dobro', alternativas: [{ texto: 'Saturno', correta: true }, { texto: 'Marte' }, { texto: 'Vênus' }, { texto: 'Mercúrio' }] },
        { tipo: 'quiz', texto: 'Qual é a estrela do nosso sistema?', tempo: 60, pontos: 'padrao', alternativas: [{ texto: 'A Lua' }, { texto: 'O Sol', correta: true }, { texto: 'Júpiter' }, { texto: 'Sirius' }] },
      ],
    },
  },
});
log('atividade pronta');

const v = await gravar({ nome: '5-modo-ao-vivo', titulo: 'Saber+ · Modo ao vivo', largura: 1366, altura: 768 });
const { pg, navegador } = v;

await pg.goto(`${SITE}/login/professor`);
await pg.waitForTimeout(1200);
await v.marca();

await v.diz('O <b>modo ao vivo</b> é quando a turma inteira responde junto, na mesma hora, como um jogo.');
await v.escreve('input[type=email]', 'nova@escola.com');
await v.escreve('input[type=password]', 'senha12345');
await v.clica('.btn-entrar', 3200);
await v.festa();
await pg.waitForTimeout(1000);
log('professor logado');

await pg.goto(`${SITE}/professor/ao-vivo/3`);
await pg.waitForTimeout(3000);
await v.festa();

await v.diz('Esta é a <b>sala ao vivo</b>. Ela já abre esperando os alunos entrarem.');
await v.diz('E ela já mostra, em letra grande para projetar, o <b>passo a passo de entrada</b>.');
await v.aponta('.prof-acesso, .prof-codigo-inline').catch(() => {});
await pg.waitForTimeout(1200);
await v.diz('Abrir o site, tocar em Acesso aluno, digitar o <b>código</b> e a <b>senha de emojis</b>. Tudo na tela.');
await pg.waitForTimeout(900);

/* alunos de verdade, em outro contexto (não gravado) */
const acesso = (await pedir('POST', '/aluno/sala/entrar', { corpo: { sala_id: 3, senha: '⚽🏀🎾🏓' } })).d.token;
/* cada criança num contexto próprio: o localStorage é por contexto,
   senão as três acabariam com o mesmo nome */
const salasDaTurma = [];
const criancas = [];
for (const nomeCrianca of ['Ana', 'Bruno', 'Clara']) {
  const ctxC = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  salasDaTurma.push(ctxC);
  const p = await ctxC.newPage();
  p.on('dialog', d => d.accept().catch(() => {}));
  await p.goto(`${SITE}/`);
  await p.evaluate(([t, n]) => {
    localStorage.setItem('alunoTemporario', JSON.stringify({ nome: n, avatar: 'avatar1.png', salaId: 3, salaNome: 'Turma Teste', token: t }));
    localStorage.removeItem('jogadorLive');
  }, [acesso, nomeCrianca]);
  await p.goto(`${SITE}/aluno/lobby`);
  criancas.push(p);
  await pg.waitForTimeout(800);
}
log('alunos no lobby');

await v.diz('Veja: conforme as crianças entram pelo celular, elas <b>aparecem na lista</b> na hora.');
await pg.waitForTimeout(2200);
await v.aponta('.prof-lobby').catch(() => {});

await v.diz('Agora o professor escolhe <b>qual atividade</b> a turma vai jogar.');
const selAtv = pg.locator('.prof-campos select').first();
await v.aponta(selAtv);
const nomes = await selAtv.locator('option').allInnerTexts();
await selAtv.selectOption({ index: Math.max(0, nomes.findIndex(o => o.includes(titulo))) });
await pg.waitForTimeout(1000);

await v.diz('E quanto <b>tempo</b> cada pergunta vai durar.');
const selTempo = pg.locator('.prof-campos select').nth(1);
await v.aponta(selTempo);
await selTempo.selectOption('60');
await pg.waitForTimeout(900);

await v.diz('Com tudo pronto, clique em <b>Começar a partida</b>.');
await v.clica('.aovivo-btn.principal', 3500);
log('partida comecou');

await v.diz('A pergunta aparece ao mesmo tempo na sua tela e na tela de todos os alunos.');

const responde = async (p, qual) => {
  try {
    await p.waitForSelector('.alternativa', { timeout: 12000 });
    await p.locator('.alternativa').nth(qual).click({ timeout: 6000 });
    await p.locator('.btn-confirmar-resposta').click({ timeout: 6000 });
  } catch { /* se essa criança não respondeu, tudo bem */ }
  await pg.waitForTimeout(1100);
};
for (let i = 0; i < criancas.length; i++) await responde(criancas[i], i === 2 ? 1 : 0);
log('rodada 1 respondida');

await v.diz('O contador mostra <b>quantos já responderam</b>, sem entregar quem acertou.');
await pg.waitForTimeout(1500);

/* o botão muda sozinho: "Encerrar o tempo agora" enquanto respondem,
   "Próxima pergunta" depois que o sistema fecha */
const avancar = async (pausa = 3200) => {
  const cortar = pg.locator('.aovivo-btn', { hasText: 'Encerrar o tempo agora' }).first();
  if (await cortar.isVisible().catch(() => false)) { await v.clica(cortar, pausa); return; }
  const prox = pg.locator('.aovivo-btn.principal').first();
  if (await prox.isVisible().catch(() => false)) await v.clica(prox, pausa);
};

await v.diz('Quando a turma toda responde, o Saber+ <b>fecha a pergunta sozinho</b>. Se alguém demorar, o professor corta o tempo no botão.');
await pg.waitForTimeout(1200);

await v.diz('Aparece a resposta certa e o <b>placar</b> da turma.');
await v.aponta('.prof-placar').catch(() => {});
await pg.waitForTimeout(1600);

await v.diz('Aí é só seguir para a <b>próxima pergunta</b>.');
await avancar(3500);
log('rodada 2');

for (let i = 0; i < criancas.length; i++) await responde(criancas[i], i === 1 ? 0 : 1);
await v.diz('A turma responde de novo e o placar se mexe na hora.');
await pg.waitForTimeout(2000);

await v.diz('No fim, o Saber+ mostra o <b>pódio</b> com os três primeiros.');
await avancar(3500);
await pg.waitForTimeout(2400);
log('fim da partida');

await v.diz('E o melhor: as notas <b>vão sozinhas para os Relatórios</b>. Você não digita nada.', 1400);
await v.diz('É o modo que transforma a aula em competição saudável — as crianças pedem para repetir.', 1300);

for (const c of salasDaTurma) await c.close().catch(() => {});
const arquivo = await v.fim();
await pedir('POST', '/live/encerrar', { token: prof.token, corpo: { sala_id: 3 } });
console.log(arquivo);
