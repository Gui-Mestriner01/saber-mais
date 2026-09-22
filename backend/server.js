const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;
const crypto = require('crypto');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const db = require('./db');
const { ligarBackupAutomatico } = require('./backup');
require('dotenv').config({ path: path.join(__dirname, '.env') }); // acha o .env mesmo rodando de outra pasta

// --- IMPORTAÇÕES DO SOCKET.IO E HTTP ---
const http = require('http');
const { Server } = require('socket.io');

/* ==========================================================================
   1. CONFIGURAÇÕES DE NUVEM E ARMAZENAMENTO (CLOUDINARY E MULTER)
   ========================================================================== */

// Credenciais do Cloudinary. A chave secreta fica só no .env — nunca no código,
// porque tudo que está aqui vai junto para o GitHub.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

if (!process.env.CLOUDINARY_API_SECRET) {
  console.warn('⚠️  CLOUDINARY_API_SECRET não está no .env — o envio de imagens vai falhar.');
}

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  // Nome aleatório e extensão tirada do TIPO da imagem (não do nome que veio):
  // assim ninguém consegue subir um "arquivo.html" disfarçado de imagem.
  filename: (req, file, cb) => {
    const ext = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/webp': '.webp' }[file.mimetype] || '.bin';
    cb(null, `${Date.now()}-${require('crypto').randomBytes(8).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const tipos = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    tipos.includes(file.mimetype) ? cb(null, true) : cb(new Error('Formato inválido'));
  }
});

/* ==========================================================================
   2. INICIALIZAÇÃO DO APP, SERVIDOR HTTP E SOCKET.IO
   ========================================================================== */

// Sem o segredo, os crachás (tokens) não teriam assinatura: nem sobe.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('❌ JWT_SECRET ausente ou curto demais (mínimo 16 caracteres). Configure no .env / painel.');
  process.exit(1);
}

const app = express();

// --- CRIAÇÃO DO SERVIDOR COM SUPORTE A TEMPO REAL ---
const server = http.createServer(app);
/* Quem pode chamar a API: o próprio computador (localhost), o endereço
   publicado (FRONTEND_URL no .env) e qualquer aparelho da rede local
   (192.168.x.x, 10.x.x.x, 172.16–31.x.x) — é assim que o celular entra
   quando abre o site pelo IP do computador. */
const REDE_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

function origemPermitida(origin) {
  const publicados = (process.env.FRONTEND_URL || '').split(',').map(u => u.trim()).filter(Boolean);
  return !origin || publicados.includes(origin) || REDE_LOCAL.test(origin);
}

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, origemPermitida(origin)), // React (e o celular) no Socket
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});
// ---------------------------------------------------

// Atrás do proxy da hospedagem (Hostinger): o IP real do aluno vem no
// cabeçalho X-Forwarded-For. Sem isso o limite de tentativas de login
// trataria todo mundo como um único visitante.
app.set('trust proxy', 1);

app.use(helmet({
  // O mesmo servidor agora entrega o site (React). A política padrão de
  // conteúdo do helmet bloquearia o VLibras, o login do Google, as fontes
  // e as imagens do Cloudinary, então ela fica desligada.
  contentSecurityPolicy: false,
  // Deixa a janelinha do "Entrar com Google" conversar com o site
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));
app.use(express.json({ limit: '15mb' })); // imagens do "Ligar" vêm dentro do JSON
app.use(express.urlencoded({ limit: '15mb', extended: true }));

app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.use('/uploads', express.static(uploadDir));

/* --------------------------------------------------------------------------
   SITE (React) NO MESMO SERVIDOR — usado na hospedagem

   Depois do `npm run build`, a pasta dist/ (na raiz do projeto) tem o site
   pronto. Se ela existir, este servidor entrega o site e a API no mesmo
   endereço (ex.: https://sabermais.com.br), sem precisar de CORS.

   Detalhe: várias rotas da API têm o mesmo caminho de páginas do site
   (ex.: /professor/salas). O navegador, ao ABRIR uma página, pede HTML
   ("Accept: text/html"); o fetch() das telas pede JSON. É isso que separa:
   pedido de HTML recebe o site, o resto segue para a API.

   No computador (npm run dev) a pasta dist/ normalmente não existe e nada
   disso liga — o site continua vindo do Vite na porta 5173.
   -------------------------------------------------------------------------- */
const pastaSite = path.join(__dirname, '..', 'dist');
if (fs.existsSync(path.join(pastaSite, 'index.html'))) {
  app.use(express.static(pastaSite, {
    index: false,
    setHeaders: (res, arquivo) => {
      if (arquivo.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // nome muda a cada build
      } else if (/(sw\.js|index\.html|manifest\.webmanifest)$/.test(arquivo)) {
        res.setHeader('Cache-Control', 'no-cache');                            // sempre a versão nova
      }
    },
  }));

  app.use((req, res, next) => {
    const querHtml = req.method === 'GET' && (req.headers.accept || '').includes('text/html');
    if (!querHtml || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(pastaSite, 'index.html'));
  });

  console.log('🌐 Site (pasta dist) sendo servido junto com a API');
}

app.use(cors((req, callback) => {
  const origin = req.headers.origin;
  // Site e API no mesmo endereço (hospedagem): o navegador manda a própria
  // origem em POST/PUT/DELETE — isso é sempre permitido.
  let mesmoEndereco = false;
  try { mesmoEndereco = !!origin && new URL(origin).host === req.headers.host; } catch { /* origem inválida */ }

  if (mesmoEndereco || origemPermitida(origin)) {
    callback(null, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  } else {
    callback(new Error('Acesso bloqueado pela política de CORS'));
  }
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { erro: 'Muitas tentativas. Tente novamente em 15 minutos.' }
});

/* --------------------------------------------------------------------------
   BLINDAGEM DAS ENTRADAS

   1. Nada de chaves "__proto__", "constructor" ou "prototype" no que chega
      (truque para bagunçar os objetos do JavaScript do servidor).
   2. Limite de escritas: cada pessoa (professor, aluno ou visitante) pode
      criar/alterar/apagar até 300 coisas a cada 10 minutos. Uso normal fica
      muito abaixo disso; um robô tentando encher ou bagunçar o banco para.
   -------------------------------------------------------------------------- */
const CHAVES_PROIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);
function temChaveProibida(valor, profundidade = 0) {
  if (profundidade > 20) return true;                        // objeto fundo demais: suspeito
  if (!valor || typeof valor !== 'object') return false;
  for (const chave of Object.keys(valor)) {
    if (CHAVES_PROIBIDAS.has(chave)) return true;
    if (temChaveProibida(valor[chave], profundidade + 1)) return true;
  }
  return false;
}
// Campos que são sempre texto ou número: se chegar objeto/lista, é tentativa de truque
const CAMPOS_SIMPLES = ['email', 'senha', 'nome', 'pin', 'aluno_id', 'sala_id', 'salaId', 'nome_aluno',
  'codigo', 'atividade_id', 'sala_destino_id', 'titulo', 'tipo', 'credential', 'telefone', 'instituicao', 'materia'];
app.use((req, res, next) => {
  const corpo = req.body && typeof req.body === 'object' ? req.body : {};
  const campoTorto = CAMPOS_SIMPLES.some(c => corpo[c] !== undefined && corpo[c] !== null && typeof corpo[c] === 'object');
  if (campoTorto || temChaveProibida(req.body) || temChaveProibida(req.query)) {
    return res.status(400).json({ erro: 'Envio inválido.' });
  }
  next();
});

const limiteEscrita = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
  keyGenerator: (req) => {
    const t = lerToken(req);
    if (t?.tipo === 'aluno') return `aluno:${t.aluno_id}`;
    if (t?.id) return `usuario:${t.id}`;
    return `ip:${ipKeyGenerator(req.ip)}`;
  },
  message: { erro: 'Muitas ações seguidas. Espere alguns minutos e tente de novo.' }
});
app.use(limiteEscrita);

/* ==========================================================================
   3. MIDDLEWARES DE AUTENTICAÇÃO E AUTORIZAÇÃO
   ========================================================================== */

function autenticar(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ erro: 'Token não fornecido.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    // Crachá de aluno (ou de "passei pela senha da sala") não abre porta de professor
    if (decoded.tipo !== 'professor' && decoded.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    req.usuario = decoded;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

function apenasAdmin(req, res, next) {
  if (req.usuario.tipo !== 'admin')
    return res.status(403).json({ erro: 'Acesso negado.' });
  next();
}

/* ==========================================================================
   3b. SEGURANÇA DO LADO DO ALUNO

   Antes, várias coisas eram conferidas no navegador — e tudo que chega no
   navegador dá para ler pelo "Inspecionar" (aba Rede/Network):
   - a lista de salas trazia a SENHA de emojis de todas as salas;
   - a atividade chegava com o GABARITO dentro;
   - a nota era calculada no navegador e o servidor aceitava qualquer número;
   - qualquer um mandava resposta em nome de qualquer aluno.

   Agora funciona com "crachás" (tokens assinados pelo servidor, iguais ao
   do professor):
   1. Acertou a senha da sala → ganha o crachá de ACESSO àquela sala
      (vale 3h). Com ele dá para ver a lista de alunos e entrar/cadastrar.
   2. Acertou o PIN → ganha o crachá de ALUNO (vale 12h), com o id, o nome e
      a sala dele. Toda rota de aluno usa o que está no crachá, nunca o que
      vem no corpo do pedido — ninguém responde "como se fosse" outro.
   3. O gabarito nunca sai do servidor antes da resposta: a correção e os
      pontos são calculados aqui.
   ========================================================================== */

function lerToken(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); } catch { return null; }
}

function gerarTokenAcesso(salaId) {
  return jwt.sign({ tipo: 'acesso_sala', sala_id: Number(salaId) }, process.env.JWT_SECRET, { expiresIn: '3h' });
}

function gerarTokenAluno({ aluno_id, nome, sala_id }) {
  return jwt.sign(
    { tipo: 'aluno', aluno_id: Number(aluno_id), nome, sala_id: Number(sala_id) },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

// Rotas que só o aluno logado usa (responder, conquistas...)
function autenticarAluno(req, res, next) {
  const dados = lerToken(req);
  if (!dados || dados.tipo !== 'aluno') {
    return res.status(401).json({ erro: 'Sua sessão acabou. Entre na sala de novo.' });
  }
  req.aluno = dados;
  next();
}

/* Quem pode ver as coisas de UMA sala: o aluno dela, quem acabou de acertar
   a senha dela, ou o professor dono. `pegarSalaId` diz de onde vem o id. */
function acessoASala(pegarSalaId) {
  return (req, res, next) => {
    const salaId = Number(pegarSalaId(req));
    const dados = lerToken(req);
    if (!salaId) return res.status(400).json({ erro: 'Sala não informada.' });
    if (!dados) return res.status(401).json({ erro: 'Entre na sala com a senha primeiro.' });

    if ((dados.tipo === 'aluno' || dados.tipo === 'acesso_sala') && Number(dados.sala_id) === salaId) {
      req.acesso = dados;
      return next();
    }

    if (dados.tipo === 'professor' || dados.tipo === 'admin') {
      // (sem "return db.query": o Express 5 confundiria o retorno com uma Promise)
      db.query(`SELECT 1 FROM sala WHERE id = ? AND professor_id = ?`, [salaId, dados.id], (err, linhas) => {
        if (err) return res.status(500).json({ erro: 'Erro ao conferir a sala.' });
        if (linhas.length === 0) return res.status(403).json({ erro: 'Acesso negado.' });
        req.usuario = dados;
        next();
      });
      return;
    }

    return res.status(403).json({ erro: 'Acesso negado.' });
  };
}

// Professor só mexe em sala que é dele (rotas que recebem sala_id no corpo)
function donoDaSala(pegarSalaId) {
  return (req, res, next) => {
    const salaId = Number(pegarSalaId(req));
    if (!salaId) return res.status(400).json({ erro: 'Sala não informada.' });
    db.query(`SELECT 1 FROM sala WHERE id = ? AND professor_id = ?`, [salaId, req.usuario.id], (err, linhas) => {
      if (err) return res.status(500).json({ erro: 'Erro ao conferir a sala.' });
      if (linhas.length === 0) {
        // Se veio imagem junto (V/F), ela não fica largada no servidor
        [...(req.files || []), ...(req.file ? [req.file] : [])].forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
        return res.status(403).json({ erro: 'Essa sala não é sua.' });
      }
      next();
    });
  };
}

// Limites de tentativa. A escola inteira costuma sair por um IP só, então o
// limite é por IP + sala / IP + aluno — uma turma não trava a outra.
const senhaSalaLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:sala:${req.body?.sala_id}`,
  message: { erro: 'Muitas tentativas de senha. Espere uns minutinhos e tente de novo.' }
});

const pinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:aluno:${req.body?.aluno_id}`,
  message: { erro: 'Muitas tentativas de PIN. Chame o professor ou espere 15 minutos.' }
});

const PIN_VALIDO = /^\d{4}$/;
const pinCriptografado = (pin) => typeof pin === 'string' && pin.startsWith('$2');

/* ---------------- Gabarito escondido + correção no servidor ---------------- */

// Identificador que não revela a posição certa, mas que o servidor sabe
// "desfazer" na correção (assinatura com o segredo do servidor).
function idSecreto(atividadeId, grupo, indice) {
  return crypto.createHmac('sha256', String(process.env.JWT_SECRET))
    .update(`${atividadeId}:${grupo}:${indice}`)
    .digest('base64url')
    .slice(0, 12);
}

function embaralharServidor(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function lerConteudo(atividade) {
  if (typeof atividade.conteudo !== 'string') return atividade.conteudo || {};
  try { return JSON.parse(atividade.conteudo); } catch { return {}; }
}

// Gabarito do V/F guardado como 'V'/'F' (o editor usa isso) ou true/false (versões antigas)
function letraVF(valor) {
  const v = String(valor ?? '').trim().toUpperCase();
  if (v === 'V' || v === 'TRUE' || v === 'VERDADEIRO') return 'V';
  if (v === 'F' || v === 'FALSE' || v === 'FALSO') return 'F';
  return null;
}

function listaDePerguntas(conteudo) {
  return Array.isArray(conteudo) ? conteudo : (conteudo?.perguntas || []);
}

function corretasDoQuiz(pergunta) {
  return (pergunta.alternativas || [])
    .map((a, i) => (a && typeof a === 'object' && a.correta ? i : null))
    .filter(i => i !== null);
}

// O que o ALUNO recebe: a atividade sem nada que entregue a resposta.
function conteudoParaAluno(atividade) {
  const c = lerConteudo(atividade);

  switch (atividade.tipo) {
    case 'quiz': {
      const perguntas = listaDePerguntas(c).map(p => ({
        ...p,
        alternativas: (p.alternativas || []).map(a => {
          if (!a || typeof a !== 'object') return { texto: String(a ?? '') };
          const { correta, ...resto } = a; // eslint-disable-line no-unused-vars
          return resto;
        })
      }));
      return Array.isArray(c) ? perguntas : { ...c, perguntas };
    }

    case 'v_f':
      return listaDePerguntas(c).map(p => {
        const { resposta_correta, ...resto } = p; // eslint-disable-line no-unused-vars
        return resto;
      });

    case 'ligar': {
      const pares = c.pares || [];
      return {
        itensA: embaralharServidor(pares.map((p, i) => ({ id: idSecreto(atividade.id, 'A', i), ...p.ladoA }))),
        itensB: embaralharServidor(pares.map((p, i) => ({ id: idSecreto(atividade.id, 'B', i), ...p.ladoB })))
      };
    }

    case 'ordenar': {
      const itens = (c.itens || []).map((texto, i) => ({ id: idSecreto(atividade.id, 'O', i), texto }));
      let misturados = embaralharServidor(itens);
      for (let t = 0; t < 10 && itens.length > 1 && misturados.every((x, i) => x.id === itens[i].id); t++) {
        misturados = embaralharServidor(itens);
      }
      return { enunciado: c.enunciado || '', itens: misturados };
    }

    case 'grupos': {
      const grupos = c.grupos || [];
      const itens = grupos.flatMap(g => g.itens || []).map((texto, k) => ({ id: idSecreto(atividade.id, 'G', k), texto }));
      return { enunciado: c.enunciado || '', grupos: grupos.map(g => g.nome), itens: embaralharServidor(itens) };
    }

    default:
      return c; // memória, pintura, resposta aberta: não têm gabarito para esconder
  }
}

/* Corrige a resposta do aluno. Devolve:
   - armazenar: o que vai para resposta_aluno (mesmo formato de antes, para
     os relatórios e as insígnias continuarem funcionando);
   - pontos: quanto o aluno ganha;
   - resultado: o que a tela mostra depois de enviar (aí sim com o gabarito). */
function corrigirResposta(atividade, resposta = {}) {
  const c = lerConteudo(atividade);

  switch (atividade.tipo) {
    case 'quiz': {
      const perguntas = listaDePerguntas(c);
      const enviadas = resposta.respostas || {};
      const respostas = {};
      let acertos = 0;
      const corretas = perguntas.map((p, i) => {
        const certas = corretasDoQuiz(p);
        const brutas = enviadas[i] ?? enviadas[String(i)] ?? [];
        const escolhidas = [...new Set((Array.isArray(brutas) ? brutas : [brutas])
          .map(Number)
          .filter(n => Number.isInteger(n) && n >= 0 && n < (p.alternativas || []).length))];
        respostas[i] = escolhidas;
        if (escolhidas.length > 0 && escolhidas.length === certas.length && certas.every(x => escolhidas.includes(x))) acertos++;
        return certas;
      });
      const pontos = acertos * 10;
      return {
        armazenar: { respostas, pontos, total: perguntas.length * 10, acertos },
        pontos,
        resultado: { pontos, acertos, total: perguntas.length, corretas }
      };
    }

    case 'v_f': {
      const perguntas = listaDePerguntas(c);
      const enviadas = resposta.respostas || {};
      let acertos = 0;
      const armazenar = perguntas.map((p, i) => {
        const valor = String(enviadas[i] ?? enviadas[String(i)] ?? '').toUpperCase();
        const escolha = valor === 'V' || valor === 'F' ? valor : null;
        const acertou = escolha !== null && escolha === letraVF(p.resposta_correta);
        if (acertou) acertos++;
        return { texto_pergunta: p.texto, resposta_aluno: escolha, acertou };
      });
      const pontos = acertos * 10;
      return {
        armazenar,
        pontos,
        resultado: { pontos, acertos, total: perguntas.length, corretas: perguntas.map(p => letraVF(p.resposta_correta)) }
      };
    }

    case 'ligar': {
      const pares = c.pares || [];
      const indiceA = {}, indiceB = {};
      pares.forEach((_, i) => {
        indiceA[idSecreto(atividade.id, 'A', i)] = i;
        indiceB[idSecreto(atividade.id, 'B', i)] = i;
      });
      const usadosA = new Set(), usadosB = new Set();
      const conexoes = [];
      const certos = [];
      for (const cx of (Array.isArray(resposta.conexoes) ? resposta.conexoes : [])) {
        const a = indiceA[cx?.a], b = indiceB[cx?.b];
        if (a === undefined || b === undefined || usadosA.has(a) || usadosB.has(b)) continue;
        usadosA.add(a); usadosB.add(b);
        conexoes.push({ parIdA: a, parIdB: b });
        certos.push({ a: cx.a, b: cx.b, certo: a === b });
      }
      const acertos = conexoes.filter(x => x.parIdA === x.parIdB).length;
      const pontos = acertos * 10;
      return {
        armazenar: { conexoes, acertos, total: pares.length, pontos },
        pontos,
        resultado: {
          pontos, acertos, total: pares.length, conexoes: certos,
          pares: pares.map((_, i) => ({ a: idSecreto(atividade.id, 'A', i), b: idSecreto(atividade.id, 'B', i) }))
        }
      };
    }

    case 'ordenar': {
      const itens = c.itens || [];
      const posicaoDe = {};
      itens.forEach((_, i) => { posicaoDe[idSecreto(atividade.id, 'O', i)] = i; });
      const ordem = (Array.isArray(resposta.ordem) ? resposta.ordem : []).filter(id => posicaoDe[id] !== undefined);
      const valida = ordem.length === itens.length && new Set(ordem).size === itens.length;
      const lista = valida ? ordem : itens.map((_, i) => idSecreto(atividade.id, 'O', i)).reverse();
      const armazenarItens = lista.map((id, i) => ({
        texto: itens[posicaoDe[id]],
        posicaoAluno: i + 1,
        posicaoCerta: posicaoDe[id] + 1
      }));
      const acertos = valida ? armazenarItens.filter(it => it.posicaoAluno === it.posicaoCerta).length : 0;
      const pontos = acertos * 10;
      const armazenar = { itens: armazenarItens, acertos, total: itens.length, pontos };
      return { armazenar, pontos, resultado: armazenar };
    }

    case 'grupos': {
      const grupos = c.grupos || [];
      const todos = grupos.flatMap((g, gi) => (g.itens || []).map(texto => ({ texto, grupoCerto: gi })));
      const escolhido = {};
      for (const l of (Array.isArray(resposta.lugares) ? resposta.lugares : [])) {
        const g = Number(l?.grupo);
        if (Number.isInteger(g) && g >= 0 && g < grupos.length) escolhido[l.id] = g;
      }
      const itens = todos.map((it, k) => ({
        texto: it.texto,
        grupoAluno: escolhido[idSecreto(atividade.id, 'G', k)] ?? null,
        grupoCerto: it.grupoCerto
      }));
      const acertos = itens.filter(it => it.grupoAluno === it.grupoCerto).length;
      const pontos = acertos * 10;
      const armazenar = { itens, acertos, total: itens.length, pontos, grupos: grupos.map(g => g.nome) };
      return { armazenar, pontos, resultado: armazenar };
    }

    case 'memoria': {
      const pares = (c.pares || []).length;
      const tentativas = Math.max(pares, Math.floor(Number(resposta.tentativas) || 0));
      const estrelas = tentativas <= Math.ceil(pares * 1.5) ? 3 : tentativas <= Math.ceil(pares * 2.5) ? 2 : 1;
      const pontos = pares * ({ 3: 10, 2: 8, 1: 6 })[estrelas];
      const armazenar = { tentativas, pares, estrelas, acertos: pares, total: pares, pontos };
      return { armazenar, pontos, resultado: armazenar };
    }

    default: {
      // Resposta aberta e afins: vai para o professor corrigir. Participação vale 50.
      const pontos = 50;
      return { armazenar: resposta, pontos, resultado: { pontos } };
    }
  }
}

const TEMAS = {
  frutas:   ['🍎','🍌','🍇','🍓','🍊','🍋','🍉','🍑','🍒','🥭'],
  animais:  ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯'],
  esportes: ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸'],
};

function gerarSenhaEmoji() {
  const temas = Object.keys(TEMAS);
  const tema = temas[Math.floor(Math.random() * temas.length)];
  const emojis = TEMAS[tema];
  const senha = Array.from({length: 4}, () => emojis[Math.floor(Math.random() * emojis.length)]).join('');
  return { tema, senha };
}

/* ==========================================================================
   4. ROTAS DE CADASTRO E LOGIN
   ========================================================================== */

app.post('/cadastro/professor', authLimiter, async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
  if (senha.length < 8) return res.status(400).json({ erro: 'A senha deve ter no mínimo 8 caracteres.' });
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ erro: 'E-mail inválido.' });

  try {
    const senhaCriptografada = await bcrypt.hash(senha, 12);
    // O professor entra aprovado direto: não existe mais fila de aprovação do admin.
    const sql = `INSERT INTO usuario (nome, email, senha, tipo_usuario, status) VALUES (?, ?, ?, 'professor', 'aprovado')`;

    db.query(sql, [nome, email.toLowerCase(), senhaCriptografada], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'E-mail já cadastrado.' });
        return res.status(500).json({ erro: 'Erro ao cadastrar professor.' });
      }
      res.status(201).json({ mensagem: 'Conta criada! Você já pode entrar.', id: result.insertId });
    });
  } catch {
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

app.post('/login/professor', authLimiter, async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });

  const sql = `SELECT * FROM usuario WHERE email = ? AND tipo_usuario IN ('professor', 'admin')`;

  db.query(sql, [email.toLowerCase()], async (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro interno do servidor.' });
    if (results.length === 0) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });

    const usuario = results[0];

    if (usuario.tipo_usuario === 'professor') {
      // "pendente" era do tempo em que o admin aprovava cadastro. Quem ficou
      // nesse estado entra normalmente; só "rejeitado" continua barrado.
      if (usuario.status === 'rejeitado') return res.status(403).json({ erro: 'Seu cadastro foi rejeitado. Entre em contato com o suporte.' });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      mensagem: 'Login realizado com sucesso!',
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo_usuario }
    });
  });
});

/* O navegador manda a "credencial" que o próprio Google assinou. Quem confere
   é o servidor, perguntando ao Google — antes o e-mail vinha solto no corpo do
   pedido, e qualquer um conseguia entrar na conta de qualquer professor só
   mandando o e-mail dele. */
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  || '17269757270-gk04h1b82ljnu5ep0fdnctn7gru3aca1.apps.googleusercontent.com';

async function verificarCredencialGoogle(credencial) {
  if (!credencial || typeof credencial !== 'string') return null;
  try {
    const resposta = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credencial)}`);
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    const emissorOk = dados.iss === 'accounts.google.com' || dados.iss === 'https://accounts.google.com';
    const emailOk = dados.email_verified === true || dados.email_verified === 'true';
    if (dados.aud !== GOOGLE_CLIENT_ID || !emissorOk || !emailOk || !dados.email) return null;
    return { email: dados.email, nome: dados.name || dados.email.split('@')[0], fotoUrl: dados.picture || null };
  } catch {
    return null;
  }
}

app.post('/login/google', authLimiter, async (req, res) => {
  const google = await verificarCredencialGoogle(req.body.credential);
  if (!google) return res.status(401).json({ erro: 'Não foi possível confirmar sua conta Google. Tente de novo.' });

  const { email, nome, fotoUrl } = google;
  const emailLower = email.toLowerCase();
  const sqlSelect = `SELECT * FROM usuario WHERE email = ? AND tipo_usuario IN ('professor', 'admin')`;

  db.query(sqlSelect, [emailLower], async (err, results) => {
    if (err) {
      console.error("Erro no banco:", err);
      return res.status(500).json({ erro: "Erro interno no servidor." });
    }

    if (results.length > 0) {
      const usuario = results[0];

      if (usuario.tipo_usuario === 'professor' && usuario.status === 'rejeitado') {
        return res.status(403).json({ erro: 'Seu cadastro foi rejeitado.' });
      }

      const token = jwt.sign(
        { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo_usuario },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      return res.json({
        mensagem: 'Login com Google realizado com sucesso!',
        token,
        usuario: { 
          id: usuario.id, 
          nome: usuario.nome, 
          email: usuario.email, 
          tipo: usuario.tipo_usuario,
          fotoUrl: fotoUrl 
        }
      });
    } else {
      try {
        const senhaAutomatica = Math.random().toString(36).slice(-10) + "Google!";
        const senhaCriptografada = await bcrypt.hash(senhaAutomatica, 12);
        
        const sqlInsert = `INSERT INTO usuario (nome, email, senha, tipo_usuario, status) VALUES (?, ?, ?, 'professor', 'aprovado')`;
        
        db.query(sqlInsert, [nome, emailLower, senhaCriptografada], (errInsert, resultInsert) => {
          if (errInsert) {
             console.error("Erro ao cadastrar via Google:", errInsert);
             return res.status(500).json({ erro: "Erro ao criar conta." });
          }

          const novoId = resultInsert.insertId;

          const token = jwt.sign(
            { id: novoId, nome: nome, email: emailLower, tipo: 'professor' },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
          );

          return res.status(201).json({
            mensagem: 'Conta criada e login realizado!',
            token,
            usuario: { 
              id: novoId, 
              nome: nome, 
              email: emailLower, 
              tipo: 'professor',
              fotoUrl: fotoUrl 
            }
          });
        });
      } catch (error) {
        return res.status(500).json({ erro: 'Erro interno ao processar cadastro do Google.' });
      }
    }
  });
});

/* --------------------------------------------------------------------------
   ALUNO — senha de emojis da sala. A senha fica só aqui no servidor; quem
   acerta ganha o crachá de acesso daquela sala.
   -------------------------------------------------------------------------- */
app.post('/aluno/sala/entrar', senhaSalaLimiter, (req, res) => {
  const { sala_id, senha } = req.body;
  if (!sala_id || typeof senha !== 'string') return res.status(400).json({ erro: 'Dados incompletos.' });

  const sql = `
    SELECT s.id, s.nome, s.serie, s.materia, s.codigo, s.senha_emojis, s.tema_senha,
           s.tipo_sala, s.status, s.expires_at, u.nome AS professor
    FROM sala s JOIN usuario u ON s.professor_id = u.id
    WHERE s.id = ?`;

  db.query(sql, [sala_id], (err, salas) => {
    if (err) return res.status(500).json({ erro: 'Erro ao procurar a sala.' });
    if (salas.length === 0) return res.status(404).json({ erro: 'Sala não encontrada.' });

    const sala = salas[0];
    if (sala.status === 'encerrada') return res.status(403).json({ erro: 'Esta sala está encerrada.' });
    if (sala.expires_at && new Date(sala.expires_at).getTime() < Date.now()) {
      return res.status(403).json({ erro: 'O tempo desta sala acabou.' });
    }

    const certa = Buffer.from(String(sala.senha_emojis || '').trim());
    const digitada = Buffer.from(senha.trim());
    const acertou = certa.length > 0 && certa.length === digitada.length && crypto.timingSafeEqual(certa, digitada);
    if (!acertou) return res.status(401).json({ erro: 'Senha errada! Tente de novo.' });

    delete sala.senha_emojis;
    delete sala.expires_at;
    res.json({ token: gerarTokenAcesso(sala.id), sala });
  });
});

app.post('/aluno/cadastrar', acessoASala(req => req.body.sala_id), async (req, res) => {
  const { sala_id, pin } = req.body;
  const nome_aluno = String(req.body.nome_aluno || '').trim().slice(0, 40);
  if (!nome_aluno || !sala_id) return res.status(400).json({ erro: 'Dados incompletos.' });
  if (!PIN_VALIDO.test(String(pin))) return res.status(400).json({ erro: 'O PIN precisa ter 4 números.' });

  try {
    const pinHash = await bcrypt.hash(String(pin), 10);
    const sql = `INSERT INTO aluno_sala (nome_aluno, sala_id, pin) VALUES (?, ?, ?)`;
    db.query(sql, [nome_aluno, sala_id, pinHash], (err, result) => {
      if (err) return res.status(500).json({ erro: 'Erro ao cadastrar aluno.' });
      const token = gerarTokenAluno({ aluno_id: result.insertId, nome: nome_aluno, sala_id });
      res.status(201).json({ mensagem: 'Aluno cadastrado!', id: result.insertId, token });
    });
  } catch {
    res.status(500).json({ erro: 'Erro ao cadastrar aluno.' });
  }
});

app.post('/aluno/login', pinLimiter, (req, res) => {
  const { aluno_id, pin } = req.body;
  const acesso = lerToken(req);
  if (!aluno_id || !pin) return res.status(400).json({ erro: 'Dados incompletos.' });

  // O JOIN traz o status da sala: quem está em sala encerrada não entra
  const sql = `
    SELECT al.id, al.nome_aluno, al.sala_id, al.pontos, al.pin, s.status AS status_sala, s.nome AS nome_sala
    FROM aluno_sala al
    JOIN sala s ON al.sala_id = s.id
    WHERE al.id = ?
  `;

  db.query(sql, [aluno_id], async (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao fazer login.' });
    if (results.length === 0) return res.status(401).json({ erro: 'PIN incorreto!' });

    const aluno = results[0];

    // Só entra quem passou pela senha da sala (ou já é aluno dela)
    if (!acesso || !['acesso_sala', 'aluno'].includes(acesso.tipo) || Number(acesso.sala_id) !== Number(aluno.sala_id)) {
      return res.status(401).json({ erro: 'Entre na sala com a senha primeiro.' });
    }

    // PIN antigo (texto puro) ainda funciona e já é trocado pela versão protegida
    const guardado = String(aluno.pin || '');
    const pinOk = pinCriptografado(guardado)
      ? await bcrypt.compare(String(pin), guardado)
      : guardado.length > 0 && guardado === String(pin);
    if (!pinOk) return res.status(401).json({ erro: 'PIN incorreto!' });

    if (!pinCriptografado(guardado)) {
      bcrypt.hash(String(pin), 10).then(h => db.query(`UPDATE aluno_sala SET pin = ? WHERE id = ?`, [h, aluno.id]));
    }

    if (aluno.status_sala === 'encerrada') {
      return res.status(403).json({
        erro: `A sala "${aluno.nome_sala}" foi encerrada pelo professor. Fale com ele para reabrir.`
      });
    }

    db.query(`UPDATE aluno_sala SET ultimo_acesso = NOW() WHERE id = ?`, [aluno.id]);

    const token = gerarTokenAluno({ aluno_id: aluno.id, nome: aluno.nome_aluno, sala_id: aluno.sala_id });
    res.json({
      mensagem: 'Login realizado!',
      token,
      aluno: { id: aluno.id, nome_aluno: aluno.nome_aluno, sala_id: aluno.sala_id, pontos: aluno.pontos }
    });
  });
});

/* ==========================================================================
   5. ROTAS DO ADMIN E PERFIL E DASHBOARD 
   ========================================================================== */

app.get('/admin/professores', autenticar, apenasAdmin, (req, res) => {
  const { status } = req.query;
  const sql = `SELECT id, nome, email, status, criado_em FROM usuario WHERE tipo_usuario = 'professor' AND status = ? ORDER BY criado_em DESC`;
  db.query(sql, [status || 'pendente'], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar professores.' });
    res.json(results);
  });
});

app.put('/admin/professor/:id/aprovar', autenticar, apenasAdmin, (req, res) => {
  db.query(`UPDATE usuario SET status = 'aprovado' WHERE id = ? AND tipo_usuario = 'professor'`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ erro: 'Erro ao aprovar professor.' });
    res.json({ mensagem: 'Professor aprovado com sucesso!' });
  });
});

app.put('/admin/professor/:id/rejeitar', autenticar, apenasAdmin, (req, res) => {
  db.query(`UPDATE usuario SET status = 'rejeitado' WHERE id = ? AND tipo_usuario = 'professor'`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ erro: 'Erro ao rejeitar professor.' });
    res.json({ mensagem: 'Professor rejeitado.' });
  });
});

app.get('/professor/perfil', autenticar, (req, res) => {
  const sql = `SELECT id, nome, email, status, telefone, instituicao, materia FROM usuario WHERE id = ?`;
  db.query(sql, [req.usuario.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar perfil.' });
    if (results.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json(results[0]);
  });
});

app.put('/professor/perfil', autenticar, async (req, res) => {
  const { nome, telefone, instituicao, materia } = req.body;
  const sql = `UPDATE usuario SET nome = ?, telefone = ?, instituicao = ?, materia = ? WHERE id = ?`;
  db.query(sql, [nome, telefone, instituicao, materia, req.usuario.id], (err) => {
    if (err) return res.status(500).json({ erro: 'Erro ao atualizar perfil.' });
    res.json({ mensagem: 'Perfil atualizado com sucesso!' });
  });
});

app.get('/professor/dashboard-resumo', autenticar, (req, res) => {
  const professorId = req.usuario.id;

  const sqlAtividades = `
    SELECT a.id, a.titulo, s.nome AS sala,
           (SELECT COUNT(DISTINCT nome_aluno) FROM resposta_aluno r WHERE r.atividade_id = a.id) AS entregues,
           (SELECT COUNT(id) FROM aluno_sala al WHERE al.sala_id = a.sala_id) AS total
    FROM atividade a
    JOIN sala s ON a.sala_id = s.id
    WHERE a.professor_id = ?
    ORDER BY a.criado_em DESC
    LIMIT 4
  `;

  const sqlDestaques = `
    SELECT al.id, al.nome_aluno AS nome, al.pontos
    FROM aluno_sala al
    JOIN sala s ON al.sala_id = s.id
    WHERE s.professor_id = ?
    ORDER BY al.pontos DESC
    LIMIT 3
  `;

  const sqlFeed = `
    SELECT r.id, r.nome_aluno, a.titulo AS atividade, s.nome AS sala, r.criado_em
    FROM resposta_aluno r
    JOIN atividade a ON r.atividade_id = a.id
    JOIN sala s ON r.sala_id = s.id
    WHERE a.professor_id = ?
    ORDER BY r.criado_em DESC
    LIMIT 4
  `;

  const sqlTotais = `
    SELECT
      (SELECT COUNT(*) FROM aluno_sala al JOIN sala s ON al.sala_id = s.id WHERE s.professor_id = ?) AS total_alunos,
      (SELECT COUNT(*) FROM resposta_aluno r JOIN atividade a ON r.atividade_id = a.id WHERE a.professor_id = ?) AS total_respostas,
      (SELECT COUNT(*) FROM atividade a WHERE a.professor_id = ?) AS total_atividades
  `;

  db.query(sqlAtividades, [professorId], (err, atividades) => {
    if (err) return res.status(500).json({ erro: 'Erro nas atividades' });
    
    db.query(sqlDestaques, [professorId], (err2, destaques) => {
      if (err2) return res.status(500).json({ erro: 'Erro nos destaques' });
      
      db.query(sqlFeed, [professorId], (err3, feed) => {
         if (err3) return res.status(500).json({ erro: 'Erro no feed' });

         db.query(sqlTotais, [professorId, professorId, professorId], (err4, totaisRows) => {
           const totais = (!err4 && totaisRows && totaisRows[0])
             ? totaisRows[0]
             : { total_alunos: 0, total_respostas: 0, total_atividades: 0 };

           res.json({ atividades, destaques, feed, totais });
         });
      });
    });
  });
});

/* ==========================================================================
   6. ROTAS DE GERENCIAMENTO DE SALAS
   ========================================================================== */

// Quanto tempo uma sala temporária fica no ar. Seis horas cobrem um período
// inteiro de aula com folga; se quiser mudar, é só trocar este número.
const HORAS_SALA_TEMPORARIA = 6;

app.post('/professor/sala', autenticar, (req, res) => {
  // 1. Recebendo a nova variável tipo_sala
  const { nome, serie, materia, codigo, tipo_sala } = req.body;
  const professorId = req.usuario.id;

  if (!nome || !serie || !materia || !codigo) {
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
  }

  const { tema, senha } = gerarSenhaEmoji();
  
  const tipo = (tipo_sala === 'temporaria') ? 'temporaria' : 'permanente';
  
  let expires_at = null;
  if (tipo === 'temporaria') {
    const dataExpiracao = new Date();
    dataExpiracao.setHours(dataExpiracao.getHours() + HORAS_SALA_TEMPORARIA);
    
    const offset = dataExpiracao.getTimezoneOffset() * 60000;
    const localTime = new Date(dataExpiracao.getTime() - offset);
    expires_at = localTime.toISOString().slice(0, 19).replace('T', ' ');
  }

  const sql = `INSERT INTO sala (nome, serie, materia, codigo, senha_emojis, tema_senha, professor_id, ano_letivo, tipo_sala, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, 2026, ?, ?, 'ativa')`;

  db.query(sql, [nome, serie, materia, codigo, senha, tema, professorId, tipo, expires_at], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Código de sala já existe.' });
      return res.status(500).json({ erro: 'Erro ao criar sala.' });
    }
    res.status(201).json({ 
      mensagem: 'Sala criada com sucesso!', 
      id: result.insertId, 
      codigo, 
      senha, 
      tema,
      tipo_sala: tipo,
      expires_at
    });
  });
});

app.get('/salas', (req, res) => {
  // Sala encerrada não aparece para o aluno escolher
  const sql = `
    SELECT s.id, s.nome, s.serie, s.materia, s.codigo, s.tema_senha,
           s.tipo_sala, s.status, u.nome AS professor
    FROM sala s
    JOIN usuario u ON s.professor_id = u.id
    WHERE (s.status IS NULL OR s.status <> 'encerrada')
      AND (s.expires_at IS NULL OR s.expires_at > NOW())
    ORDER BY s.criado_em DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar salas.' });
    res.json(results);
  });
});

app.get('/professor/salas', autenticar, (req, res) => {
  const sql = `SELECT * FROM sala WHERE professor_id = ? ORDER BY criado_em DESC`;
  db.query(sql, [req.usuario.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar salas.' });
    // A senha não vai na lista: ela só é buscada, uma sala por vez, quando o
    // professor clica em "mostrar". Assim ela não fica aparecendo na aba Rede.
    res.json(results.map(({ senha_emojis, ...sala }) => ({ ...sala, tem_senha: !!senha_emojis })));
  });
});

app.get('/professor/sala/:id/senha', autenticar, donoDaSala(req => req.params.id), (req, res) => {
  db.query(`SELECT senha_emojis FROM sala WHERE id = ?`, [req.params.id], (err, linhas) => {
    if (err || !linhas.length) return res.status(500).json({ erro: 'Erro ao buscar a senha.' });
    res.set('Cache-Control', 'no-store');
    res.json({ senha: linhas[0].senha_emojis || '' });
  });
});

app.put('/professor/sala/:id/reativar', autenticar, (req, res) => {
  // Reabrir uma sala temporária também dá mais tempo a ela — senão a sala
  // voltaria já vencida e o aluno continuaria sem conseguir entrar.
  const sql = `UPDATE sala
                  SET status = 'ativa',
                      expires_at = CASE WHEN expires_at IS NULL
                                        THEN NULL
                                        ELSE DATE_ADD(NOW(), INTERVAL ${HORAS_SALA_TEMPORARIA} HOUR)
                                   END
                WHERE id = ? AND professor_id = ?`;
  db.query(sql, [req.params.id, req.usuario.id], (err, result) => {
    if (err) return res.status(500).json({ erro: 'Erro ao reativar a sala.' });
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Sala não encontrada ou acesso negado.' });
    res.json({ mensagem: 'A sala foi reaberta!', status: 'ativa' });
  });
});

app.put('/professor/sala/:id/encerrar', autenticar, (req, res) => {
  const sql = `UPDATE sala SET status = 'encerrada' WHERE id = ? AND professor_id = ?`;
  db.query(sql, [req.params.id, req.usuario.id], (err, result) => {
    if (err) return res.status(500).json({ erro: 'Erro ao encerrar a sala.' });
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Sala não encontrada ou acesso negado.' });
    res.json({ mensagem: 'A sala foi encerrada com sucesso!' });
  });
});

app.post('/aluno/entrar-sala', acessoASala(req => req.body.sala_id), (req, res) => {
  const { nome_aluno, sala_id } = req.body;
  if (!nome_aluno || !sala_id) return res.status(400).json({ erro: 'Dados incompletos.' });
  
  db.query(`SELECT status, nome, expires_at FROM sala WHERE id = ?`, [sala_id], (errSala, salas) => {
    if (errSala) return res.status(500).json({ erro: 'Erro ao verificar a sala.' });
    if (salas.length === 0) return res.status(404).json({ erro: 'Sala não encontrada.' });

    if (salas[0].status === 'encerrada') {
      return res.status(403).json({ erro: `A sala "${salas[0].nome}" está encerrada.` });
    }

    if (salas[0].expires_at && new Date(salas[0].expires_at).getTime() < Date.now()) {
      return res.status(403).json({ erro: `O tempo da sala "${salas[0].nome}" acabou.` });
    }

    const sql = `INSERT INTO aluno_sala (nome_aluno, sala_id) VALUES (?, ?)`;
    db.query(sql, [nome_aluno, sala_id], (err) => {
      if (err) return res.status(500).json({ erro: 'Erro ao registrar aluno.' });
      res.status(201).json({ mensagem: 'Aluno registrado!' });
    });
  });
});

app.get('/sala/:id/alunos', acessoASala(req => req.params.id), (req, res) => {
  const sql = `SELECT id, nome_aluno, pontos, ultimo_acesso FROM aluno_sala WHERE sala_id = ? ORDER BY nome_aluno ASC`;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar alunos.' });
    res.json(results);
  });
});

app.get('/professor/sala/:id/alunos', autenticar, donoDaSala(req => req.params.id), (req, res) => {
  const sql = `SELECT id, nome_aluno, entrou_em FROM aluno_sala WHERE sala_id = ? ORDER BY entrou_em DESC`;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar alunos.' });
    res.json(results);
  });
});

app.delete('/professor/sala/:idSala/aluno/:idAluno', autenticar, (req, res) => {
  // O JOIN com sala garante que o professor só remove aluno da própria sala.
  // (Antes qualquer professor logado conseguia apagar aluno de qualquer sala.)
  const sql = `DELETE al FROM aluno_sala al
                 JOIN sala s ON s.id = al.sala_id
                WHERE al.sala_id = ? AND al.id = ? AND s.professor_id = ?`;
  db.query(sql, [req.params.idSala, req.params.idAluno, req.usuario.id], (err, result) => {
    if (err) return res.status(500).json({ erro: 'Erro ao excluir aluno.' });
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Aluno não encontrado.' });

    // As insígnias eram do aluno naquela turma: saem junto com ele.
    db.query(`DELETE FROM conquista_aluno WHERE aluno_id = ?`, [req.params.idAluno], (erroConquistas) => {
      if (erroConquistas) console.error('Erro ao apagar conquistas do aluno:', erroConquistas.message);
    });

    res.json({ mensagem: 'Aluno removido com sucesso!' });
  });
});

/* ==========================================================================
   7. ROTAS DE ATIVIDADES (CRIAÇÃO, LISTAGEM E CLONAGEM)
   ========================================================================== */

app.post('/professor/atividade', autenticar, donoDaSala(req => req.body.sala_id), (req, res) => {
  const { titulo, tipo, sala_id, conteudo } = req.body;
  const professorId = req.usuario.id;
  const tempo_limite = parseInt(req.body.tempo_limite) || 0; 

  if (!titulo || !tipo || !sala_id || !conteudo) return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });

  const sql = `INSERT INTO atividade (titulo, tipo, sala_id, professor_id, conteudo, tempo_limite) VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(sql, [titulo, tipo, sala_id, professorId, JSON.stringify(conteudo), tempo_limite], (err, result) => {
    if (err) return res.status(500).json({ erro: 'Erro ao salvar atividade.' });
    res.status(201).json({ mensagem: 'Atividade salva com sucesso!', id: result.insertId });
  });
});

app.post('/professor/atividades/v_f', autenticar, upload.any(), donoDaSala(req => req.body.salaId), async (req, res) => {
  const { salaId, titulo } = req.body;
  const professorId = req.usuario.id;
  const tempo_limite = parseInt(req.body.tempo_limite) || 0; 

  try {
    const perguntasRaw = JSON.parse(req.body.perguntas);
    const conteudoFormatado = [];

    for (let i = 0; i < perguntasRaw.length; i++) {
      const pergunta = perguntasRaw[i];
      let imagemUrl = null;
      const arquivoImagem = req.files.find(file => file.fieldname === `imagem_${i}`);

      if (arquivoImagem) {
        const resultCloudinary = await cloudinary.uploader.upload(arquivoImagem.path, {
          folder: 'saber_plus/verdadeiro_falso'
        });
        imagemUrl = resultCloudinary.secure_url;
        fs.unlinkSync(arquivoImagem.path);
      }

      conteudoFormatado.push({ texto: pergunta.texto, imagem_url: imagemUrl, resposta_correta: pergunta.resposta_correta });
    }

    const sql = `INSERT INTO atividade (titulo, tipo, sala_id, professor_id, conteudo, tempo_limite) VALUES (?, ?, ?, ?, ?, ?)`;

    db.query(sql, [titulo, 'v_f', salaId, professorId, JSON.stringify(conteudoFormatado), tempo_limite], (err, result) => {
      if (err) return res.status(500).json({ erro: 'Erro ao salvar atividade V/F no banco.' });
      res.status(201).json({ mensagem: 'Atividade criada com sucesso!', id: result.insertId });
    });

  } catch (error) {
    console.error('Erro ao criar atividade V/F:', error);
    if (req.files) req.files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
    res.status(500).json({ erro: 'Erro interno ao processar a atividade.' });
  }
});

app.get('/sala/:salaId/atividades', acessoASala(req => req.params.salaId), (req, res) => {
  const salaId = req.params.salaId;
  // "Já fiz?" é sempre do aluno do crachá, nunca de um nome vindo na URL
  const aluno = req.acesso?.tipo === 'aluno' ? req.acesso.nome : '';

  const sql = `
    SELECT a.id, a.titulo, a.tipo, a.criado_em, a.tempo_limite,
           (SELECT COUNT(*) FROM resposta_aluno r WHERE r.atividade_id = a.id AND r.nome_aluno = ?) AS respondida
    FROM atividade a
    WHERE a.sala_id = ?
    ORDER BY a.criado_em DESC
  `;

  db.query(sql, [aluno, salaId], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar atividades.' });
    
    const atividadesFormatadas = results.map(atv => ({
      ...atv,
      respondida: atv.respondida > 0
    }));

    res.json(atividadesFormatadas);
  });
});

app.get('/atividade/:id', (req, res) => {
  const quem = lerToken(req);
  if (!quem) return res.status(401).json({ erro: 'Entre na sala primeiro.' });

  const sql = `SELECT a.*, s.professor_id AS dono FROM atividade a JOIN sala s ON s.id = a.sala_id WHERE a.id = ?`;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar atividade.' });
    if (results.length === 0) return res.status(404).json({ erro: 'Atividade não encontrada.' });

    const atv = results[0];
    const dono = atv.dono;
    delete atv.dono;

    // Professor dono: vê tudo, com o gabarito (relatórios, correção)
    if ((quem.tipo === 'professor' || quem.tipo === 'admin') && Number(quem.id) === Number(dono)) {
      atv.conteudo = lerConteudo(atv);
      return res.json(atv);
    }

    // Aluno da sala: recebe a atividade SEM a resposta certa
    if (quem.tipo === 'aluno' && Number(quem.sala_id) === Number(atv.sala_id)) {
      atv.conteudo = conteudoParaAluno(atv);
      delete atv.professor_id;
      return res.json(atv);
    }

    return res.status(403).json({ erro: 'Acesso negado.' });
  });
});

app.get('/professor/atividades', autenticar, (req, res) => {
  const sql = `
    SELECT a.id, a.titulo, a.tipo, a.criado_em, s.nome AS nome_sala, s.serie, s.materia, COUNT(r.id) AS total_respostas
    FROM atividade a
    JOIN sala s ON a.sala_id = s.id
    LEFT JOIN resposta_aluno r ON a.id = r.atividade_id
    WHERE a.professor_id = ?
    GROUP BY a.id, s.nome, s.serie, s.materia
    ORDER BY a.criado_em DESC
  `;
  db.query(sql, [req.usuario.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar atividades.' });
    res.json(results);
  });
});

app.post('/professor/atividade/:id/clonar', autenticar, donoDaSala(req => req.body.sala_destino_id), (req, res) => {
  const atividadeId = req.params.id;
  const { sala_destino_id } = req.body;
  const professorId = req.usuario.id;

  if (!sala_destino_id) return res.status(400).json({ erro: 'Sala de destino não informada.' });

  const sqlSelect = `SELECT titulo, tipo, conteudo, tempo_limite FROM atividade WHERE id = ? AND professor_id = ?`;
  
  db.query(sqlSelect, [atividadeId, professorId], (err, results) => {
    if (err) {
      console.error('Erro no SELECT de clonagem:', err);
      return res.status(500).json({ erro: 'Erro ao buscar atividade original.' });
    }
    if (results.length === 0) return res.status(404).json({ erro: 'Atividade não encontrada ou não pertence a você.' });

    const ativ = results[0];

    const conteudoParaSalvar = typeof ativ.conteudo === 'object' ? JSON.stringify(ativ.conteudo) : ativ.conteudo;

    const sqlInsert = `INSERT INTO atividade (titulo, tipo, sala_id, professor_id, conteudo, tempo_limite) VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.query(sqlInsert, [ativ.titulo, ativ.tipo, sala_destino_id, professorId, conteudoParaSalvar, ativ.tempo_limite], (errInsert, resultInsert) => {
      if (errInsert) {
        console.error('Erro no INSERT de clonagem:', errInsert);
        return res.status(500).json({ erro: 'Erro ao clonar a atividade no banco de dados.' });
      }
      
      res.status(201).json({ mensagem: 'Atividade copiada com sucesso!', id: resultInsert.insertId });
    });
  });
});

/* ==========================================================================
   8. ROTAS DE RESPOSTAS DOS ALUNOS E RELATÓRIOS
   ========================================================================== */

app.post('/atividade/:id/resposta', autenticarAluno, (req, res) => {
  const { aluno_id, nome, sala_id } = req.aluno;   // quem responde é quem está no crachá
  const resposta = req.body.resposta;
  if (!resposta || typeof resposta !== 'object') return res.status(400).json({ erro: 'Resposta vazia.' });
  if (JSON.stringify(resposta).length > 100000) return res.status(413).json({ erro: 'Resposta grande demais.' });

  db.query(`SELECT * FROM atividade WHERE id = ?`, [req.params.id], (err, atividades) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar a atividade.' });
    if (atividades.length === 0) return res.status(404).json({ erro: 'Atividade não encontrada.' });

    const atv = atividades[0];
    if (Number(atv.sala_id) !== Number(sala_id)) return res.status(403).json({ erro: 'Essa atividade não é da sua sala.' });

    db.query(
      `SELECT id FROM resposta_aluno WHERE atividade_id = ? AND sala_id = ? AND nome_aluno = ? LIMIT 1`,
      [atv.id, sala_id, nome],
      (errJa, ja) => {
        if (errJa) return res.status(500).json({ erro: 'Erro ao salvar resposta.' });
        if (ja.length > 0) return res.status(409).json({ erro: 'Você já respondeu esta atividade.' });

        const { armazenar, pontos, resultado } = corrigirResposta(atv, resposta);

        const sqlInsert = `INSERT INTO resposta_aluno (atividade_id, nome_aluno, sala_id, resposta) VALUES (?, ?, ?, ?)`;
        db.query(sqlInsert, [atv.id, nome, sala_id, JSON.stringify(armazenar)], (errIns, result) => {
          if (errIns) return res.status(500).json({ erro: 'Erro ao salvar resposta.' });

          db.query(`UPDATE aluno_sala SET pontos = pontos + ? WHERE id = ?`, [pontos, aluno_id], (errPontos) => {
            if (errPontos) console.error('Erro ao dar pontos ao aluno:', errPontos.message);
          });

          res.status(201).json({ mensagem: 'Resposta enviada com sucesso!', id: result.insertId, resultado });
        });
      }
    );
  });
});

app.get('/professor/atividade/:id/respostas', autenticar, (req, res) => {
  const sql = `
    SELECT r.id, r.nome_aluno, r.resposta, r.nota, r.corrigido, r.criado_em, s.nome AS nome_sala, s.serie, s.materia
    FROM resposta_aluno r
    JOIN sala s ON r.sala_id = s.id
    JOIN atividade a ON a.id = r.atividade_id
    WHERE r.atividade_id = ? AND a.professor_id = ?
    ORDER BY r.criado_em DESC
  `;
  db.query(sql, [req.params.id, req.usuario.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar respostas.' });
    results.forEach(r => {
      try { r.resposta = typeof r.resposta === 'string' ? JSON.parse(r.resposta) : r.resposta; } catch { }
    });
    res.json(results);
  });
});

/* ==========================================================================
   9. UPLOADS DIRETOS DE IMAGENS (PINTURA)
   ========================================================================== */

/* --------------------------------------------------------------------------
   CORREÇÃO MANUAL: o professor dá a nota da resposta de um aluno.
   O JOIN com atividade garante que só dá para corrigir resposta de
   atividade que pertence a quem está logado.
   -------------------------------------------------------------------------- */
app.put('/professor/resposta/:id/corrigir', autenticar, (req, res) => {
  const { nota, comentario } = req.body;
  const professorId = req.usuario.id;

  const notaNumero = nota === null || nota === undefined || nota === '' ? null : Number(nota);

  if (notaNumero !== null && (isNaN(notaNumero) || notaNumero < 0 || notaNumero > 10)) {
    return res.status(400).json({ erro: 'A nota precisa ser um número de 0 a 10.' });
  }

  const sql = `
    UPDATE resposta_aluno r
    JOIN atividade a ON r.atividade_id = a.id
    SET r.nota = ?, r.corrigido = ?, r.comentario = ?
    WHERE r.id = ? AND a.professor_id = ?
  `;

  db.query(sql, [notaNumero, notaNumero === null ? 0 : 1, comentario || null, req.params.id, professorId], (err, result) => {
    if (err) {
      // A coluna de comentário é opcional; se o banco ainda não tiver, salva só a nota
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        const sqlSemComentario = `
          UPDATE resposta_aluno r
          JOIN atividade a ON r.atividade_id = a.id
          SET r.nota = ?, r.corrigido = ?
          WHERE r.id = ? AND a.professor_id = ?
        `;
        return db.query(sqlSemComentario, [notaNumero, notaNumero === null ? 0 : 1, req.params.id, professorId], (err2, result2) => {
          if (err2) return res.status(500).json({ erro: 'Erro ao salvar a correção.' });
          if (result2.affectedRows === 0) return res.status(404).json({ erro: 'Resposta não encontrada.' });
          res.json({ mensagem: 'Correção salva!', nota: notaNumero, corrigido: notaNumero !== null });
        });
      }
      console.error('Erro ao corrigir resposta:', err);
      return res.status(500).json({ erro: 'Erro ao salvar a correção.' });
    }

    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Resposta não encontrada.' });
    res.json({ mensagem: 'Correção salva!', nota: notaNumero, corrigido: notaNumero !== null });
  });
});

app.post('/professor/pintura/upload', autenticar, upload.single('imagem'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
  
  try {
    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'saber_plus/atividades' });
    fs.unlinkSync(req.file.path);
    res.json({ url: result.secure_url, filename: result.public_id });
  } catch (error) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ erro: 'Erro ao salvar a imagem na nuvem.' });
  }
});

app.post('/atividade/:id/resposta/pintura', autenticarAluno, upload.single('pintura'), async (req, res) => {
  const { aluno_id, nome, sala_id } = req.aluno;
  const PONTOS_PINTURA = 50;

  if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
  const apagarArquivo = () => { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); };

  try {
    const banco = db.promise();
    const [atividades] = await banco.query(`SELECT id, sala_id, tipo FROM atividade WHERE id = ?`, [req.params.id]);
    if (atividades.length === 0) { apagarArquivo(); return res.status(404).json({ erro: 'Atividade não encontrada.' }); }
    if (Number(atividades[0].sala_id) !== Number(sala_id)) { apagarArquivo(); return res.status(403).json({ erro: 'Essa atividade não é da sua sala.' }); }

    const [ja] = await banco.query(
      `SELECT id FROM resposta_aluno WHERE atividade_id = ? AND sala_id = ? AND nome_aluno = ? LIMIT 1`,
      [req.params.id, sala_id, nome]
    );
    if (ja.length > 0) { apagarArquivo(); return res.status(409).json({ erro: 'Você já enviou esta pintura.' }); }

    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'saber_plus/respostas_alunos' });
    apagarArquivo();

    const resposta = JSON.stringify({ url_pintura: result.secure_url, filename: result.public_id });
    const [ins] = await banco.query(
      `INSERT INTO resposta_aluno (atividade_id, nome_aluno, sala_id, resposta) VALUES (?, ?, ?, ?)`,
      [req.params.id, nome, sala_id, resposta]
    );
    await banco.query(`UPDATE aluno_sala SET pontos = pontos + ? WHERE id = ?`, [PONTOS_PINTURA, aluno_id]);

    res.status(201).json({ mensagem: 'Pintura enviada e pontos adicionados!', url: result.secure_url, id: ins.insertId });
  } catch (error) {
    apagarArquivo();
    res.status(500).json({ erro: 'Erro ao processar pintura na nuvem.' });
  }
});

/* ==========================================================================
   10. SALA AO VIVO — O MODO "TODO MUNDO JOGANDO JUNTO"

   Como funciona, em uma frase: a partida inteira mora na memória do servidor
   (o objeto `partidas`), o professor comanda o ritmo e os alunos ficam
   perguntando de tempos em tempos "e aí, o que está acontecendo agora?".

   Não usamos o banco durante a partida de propósito. Uma turma de 30 alunos
   perguntando a cada segundo daria 30 consultas por segundo no MySQL sem
   necessidade nenhuma — a partida dura poucos minutos e o que importa mesmo
   (o resultado final) é gravado uma única vez, no fim.
   ========================================================================== */

// Cada sala (temporária ou permanente) pode ter uma partida rolando.
// A chave é o id da sala.
const partidas = {};

// Quanto tempo uma partida abandonada fica ocupando memória antes de sumir.
const PARTIDA_VALIDADE_MS = 3 * 60 * 60 * 1000; // 3 horas

// Tempo padrão de cada pergunta, em segundos.
const SEGUNDOS_PADRAO = 20;

// Acertar vale de 500 a 1000 pontos: quanto mais rápido, mais perto de 1000.
const PONTOS_MINIMOS = 500;
const PONTOS_BONUS   = 500;

/* --------------------------------------------------------------------------
   Abre uma partida vazia (só a sala de espera) para uma sala.
   Ficava copiado em duas rotas; agora mora aqui.
   -------------------------------------------------------------------------- */
function abrirPartida(sala) {
  return {
    salaId: sala.id,
    salaNome: sala.nome,
    codigo: sala.codigo,
    tipoSala: sala.tipo_sala === 'temporaria' ? 'temporaria' : 'permanente',
    estado: 'lobby',
    atividadeId: null,
    titulo: null,
    perguntas: [],
    indice: -1,
    segundos: SEGUNDOS_PADRAO,
    terminaEm: 0,
    jogadores: {},
    // Convite que o professor dispara para a turma. Guardamos um número que
    // só cresce: o aluno compara com o último convite que ele já dispensou,
    // então o professor pode chamar de novo quantas vezes quiser.
    convite: null,
    salvo: false,
    criadaEm: Date.now()
  };
}

/* --------------------------------------------------------------------------
   Deixa quiz e verdadeiro/falso com o mesmo formato, para o jogo não precisar
   saber de que tipo de atividade veio a pergunta.
   -------------------------------------------------------------------------- */
function montarPerguntas(atividade) {
  let conteudo = atividade.conteudo;
  if (typeof conteudo === 'string') {
    try { conteudo = JSON.parse(conteudo); } catch { conteudo = null; }
  }
  if (!conteudo) return [];

  if (atividade.tipo === 'quiz') {
    const lista = Array.isArray(conteudo) ? conteudo : (conteudo.perguntas || []);
    return lista.map(p => {
      const alternativas = (p.alternativas || []).map(a => ({
        texto: typeof a === 'string' ? a : (a.texto || ''),
        correta: typeof a === 'object' && !!a.correta
      }));
      return { texto: p.texto || p.pergunta || '', imagem: p.imagem_url || p.imagem || null, alternativas };
    }).filter(p => p.alternativas.length > 0);
  }

  if (atividade.tipo === 'v_f') {
    const lista = Array.isArray(conteudo) ? conteudo : (conteudo.perguntas || []);
    return lista.map(p => ({
      texto: p.texto || p.pergunta || '',
      imagem: p.imagem_url || p.imagem || null,
      alternativas: [
        { texto: 'Verdadeiro', correta: letraVF(p.resposta_correta) === 'V' },
        { texto: 'Falso',      correta: letraVF(p.resposta_correta) === 'F' }
      ]
    }));
  }

  return [];
}

function indicesCorretos(pergunta) {
  return pergunta.alternativas
    .map((a, i) => (a.correta ? i : -1))
    .filter(i => i >= 0);
}

/* --------------------------------------------------------------------------
   Antes de responder qualquer coisa, o servidor coloca a partida em dia:
   fecha a pergunta quando o tempo acabou ou quando todo mundo já respondeu.
   É assim que o cronômetro "anda" sem precisar de um timer rodando à toa.
   -------------------------------------------------------------------------- */
function sincronizar(partida) {
  if (!partida || partida.estado !== 'pergunta') return partida;

  const jogadores = Object.values(partida.jogadores);
  const todosResponderam =
    jogadores.length > 0 &&
    jogadores.every(j => j.respostas[partida.indice] !== undefined);

  if (Date.now() >= partida.terminaEm || todosResponderam) {
    partida.estado = 'revisao';
  }
  return partida;
}

function limparPartidasVelhas() {
  const agora = Date.now();
  for (const id of Object.keys(partidas)) {
    if (agora - partidas[id].criadaEm > PARTIDA_VALIDADE_MS) delete partidas[id];
  }
}

function rankingDe(partida) {
  return Object.values(partida.jogadores)
    .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome))
    .map((j, i) => ({
      id: j.id,
      nome: j.nome,
      avatar: j.avatar,
      pontos: j.pontos,
      acertos: j.acertos,
      posicao: i + 1
    }));
}

/* --------------------------------------------------------------------------
   A "fotografia" da partida que vai para a tela. O gabarito só entra depois
   que a pergunta fecha — senão daria para ler a resposta certa no DevTools.
   -------------------------------------------------------------------------- */
function retrato(partida, { professor = false, jogadorId = null } = {}) {
  const pergunta = partida.perguntas[partida.indice] || null;
  const emPergunta = partida.estado === 'pergunta';

  const dados = {
    ativa: true,
    estado: partida.estado,
    salaId: partida.salaId,
    salaNome: partida.salaNome,
    codigo: partida.codigo,
    atividadeId: partida.atividadeId,
    titulo: partida.titulo,
    indice: partida.indice,
    total: partida.perguntas.length,
    segundos: partida.segundos,
    restanteMs: emPergunta ? Math.max(0, partida.terminaEm - Date.now()) : 0,
    tipoSala: partida.tipoSala,
    convite: partida.convite,
    ranking: rankingDe(partida),
    jogadores: Object.values(partida.jogadores).map(j => ({
      id: j.id, nome: j.nome, avatar: j.avatar, pontos: j.pontos, alunoId: j.alunoId || null
    }))
  };

  if (pergunta && partida.estado !== 'lobby') {
    dados.pergunta = {
      texto: pergunta.texto,
      imagem: pergunta.imagem,
      alternativas: pergunta.alternativas.map(a => a.texto)
    };
    if (!emPergunta) dados.gabarito = indicesCorretos(pergunta);
  }

  if (professor) {
    const respondidas = Object.values(partida.jogadores)
      .map(j => j.respostas[partida.indice])
      .filter(r => r !== undefined);

    dados.respondidos = respondidas.length;
    if (pergunta) {
      dados.contagem = pergunta.alternativas.map(
        (_, i) => respondidas.filter(r => r.escolha === i).length
      );
    }
  }

  if (jogadorId && partida.jogadores[jogadorId]) {
    const eu = partida.jogadores[jogadorId];
    const minha = eu.respostas[partida.indice];
    dados.eu = {
      id: eu.id,
      nome: eu.nome,
      avatar: eu.avatar,
      pontos: eu.pontos,
      acertos: eu.acertos,
      posicao: dados.ranking.findIndex(r => r.id === eu.id) + 1,
      respondeu: minha !== undefined,
      escolha: minha ? minha.escolha : null,
      acertou: minha ? minha.acertou : null,
      ganhou: minha ? minha.ganhou : 0
    };
  }

  return dados;
}

/* --------------------------------------------------------------------------
   ALUNO — entrar na sala de espera.
   Quem chega primeiro cria a sala de espera; os próximos só se juntam.
   Mandando o `jogador_id` de volta, um F5 no meio do jogo não perde os pontos.
   -------------------------------------------------------------------------- */
app.post('/live/entrar', acessoASala(req => req.body.sala_id), (req, res) => {
  limparPartidasVelhas();
  const { sala_id, avatar, jogador_id } = req.body;
  // Aluno de sala permanente: id e nome vêm do crachá, não do pedido
  const aluno_id = req.acesso?.tipo === 'aluno' ? req.acesso.aluno_id : null;
  const nome = req.acesso?.tipo === 'aluno' ? req.acesso.nome : req.body.nome;

  if (!sala_id || !nome || !String(nome).trim()) {
    return res.status(400).json({ erro: 'Informe a sala e o seu nome.' });
  }

  db.query(`SELECT id, nome, codigo, status, tipo_sala, expires_at FROM sala WHERE id = ?`, [sala_id], (err, salas) => {
    if (err) return res.status(500).json({ erro: 'Erro ao procurar a sala.' });
    if (salas.length === 0) return res.status(404).json({ erro: 'Sala não encontrada.' });

    const sala = salas[0];
    if (sala.status === 'encerrada') return res.status(403).json({ erro: 'Esta sala foi encerrada pelo professor.' });
    if (sala.expires_at && new Date(sala.expires_at).getTime() < Date.now()) {
      return res.status(403).json({ erro: 'O tempo desta sala temporária acabou.' });
    }

    if (!partidas[sala.id]) partidas[sala.id] = abrirPartida(sala);

    const partida = partidas[sala.id];

    // Voltou depois de um F5: continua sendo o mesmo jogador.
    if (jogador_id && partida.jogadores[jogador_id]) {
      partida.jogadores[jogador_id].visto = Date.now();
      return res.json({ jogadorId: jogador_id, estado: partida.estado });
    }

    // Numa sala permanente o aluno já tem cadastro, então quem manda é o id
    // dele: se voltar de outro aparelho, reencontra a própria pontuação.
    if (aluno_id) {
      const meu = Object.values(partida.jogadores).find(j => String(j.alunoId) === String(aluno_id));
      if (meu) {
        meu.visto = Date.now();
        return res.json({ jogadorId: meu.id, estado: partida.estado });
      }
    }

    const nomeLimpo = String(nome).trim().slice(0, 20);

    if (!aluno_id) {
      const jaExiste = Object.values(partida.jogadores)
        .some(j => j.nome.toLowerCase() === nomeLimpo.toLowerCase());
      if (jaExiste) return res.status(409).json({ erro: 'Já tem alguém com esse nome na sala. Escolha outro!' });
    }

    // Chegou atrasado, com a partida já rolando? Entra assim mesmo, zerado —
    // é melhor participar do resto do que ficar de fora da aula inteira.
    const id = `j${crypto.randomBytes(9).toString('base64url')}`; // impossível de adivinhar
    partida.jogadores[id] = {
      id,
      alunoId: aluno_id || null,
      nome: nomeLimpo,
      avatar: /^img\d{1,2}\.PNG$/.test(String(avatar)) ? avatar : 'img1.PNG',
      pontos: 0,
      acertos: 0,
      respostas: {},
      visto: Date.now()
    };

    io.to(String(sala.id)).emit('lobby_mudou', rankingDe(partida));
    res.status(201).json({ jogadorId: id, estado: partida.estado });
  });
});

/* --------------------------------------------------------------------------
   ALUNO — sair da sala de espera.
   -------------------------------------------------------------------------- */
app.post('/live/sair', acessoASala(req => req.body.sala_id), (req, res) => {
  const { sala_id, jogador_id } = req.body;
  const partida = partidas[sala_id];
  if (partida && partida.jogadores[jogador_id] && partida.estado === 'lobby') {
    delete partida.jogadores[jogador_id];
    io.to(String(sala_id)).emit('lobby_mudou', rankingDe(partida));
  }
  res.json({ ok: true });
});

/* --------------------------------------------------------------------------
   ALUNO — "meu professor está chamando?".
   A página inicial do aluno consulta esta rota de poucos em poucos segundos.
   É de propósito bem mais leve que a de baixo: devolve só o aviso, sem
   ranking nem pergunta, porque roda o tempo todo enquanto o aluno está na
   plataforma, mesmo quando não tem aula nenhuma acontecendo.
   -------------------------------------------------------------------------- */
app.get('/live/convite/:salaId', acessoASala(req => req.params.salaId), (req, res) => {
  const partida = partidas[req.params.salaId];
  if (!partida || !partida.convite) return res.json({ chamando: false });

  const { para } = partida.convite;
  const alunoId = req.acesso?.tipo === 'aluno' ? req.acesso.aluno_id : null;

  // Convite para a turma toda (para = null) ou só para alguns alunos.
  if (para && !para.map(String).includes(String(alunoId))) return res.json({ chamando: false });

  res.json({
    chamando: true,
    conviteId: partida.convite.id,
    salaNome: partida.salaNome,
    codigo: partida.codigo,
    titulo: partida.titulo,
    estado: partida.estado,
    naSala: Object.keys(partida.jogadores).length
  });
});

/* --------------------------------------------------------------------------
   ALUNO — "o que está acontecendo agora?". É esta rota que a tela do aluno
   fica consultando de 1 em 1 segundo.
   -------------------------------------------------------------------------- */
app.get('/live/sala/:salaId', acessoASala(req => req.params.salaId), (req, res) => {
  const partida = partidas[req.params.salaId];
  if (!partida) return res.json({ ativa: false });
  sincronizar(partida);
  res.json(retrato(partida, { jogadorId: req.query.jogador || null }));
});

/* --------------------------------------------------------------------------
   ALUNO — responder. A conta dos pontos é feita aqui, no servidor, usando o
   relógio do servidor: assim ninguém ganha vantagem mexendo no próprio
   navegador nem por ter internet mais rápida em casa.
   -------------------------------------------------------------------------- */
app.post('/live/responder', acessoASala(req => req.body.sala_id), (req, res) => {
  const { sala_id, jogador_id, indice, escolha } = req.body;
  const partida = partidas[sala_id];

  if (!partida) return res.status(404).json({ erro: 'Partida não encontrada.' });
  sincronizar(partida);

  const jogador = partida.jogadores[jogador_id];
  if (!jogador) return res.status(404).json({ erro: 'Jogador não encontrado.' });
  if (partida.estado !== 'pergunta') return res.status(409).json({ erro: 'O tempo desta pergunta já acabou.' });
  if (Number(indice) !== partida.indice) return res.status(409).json({ erro: 'Esta pergunta já passou.' });
  if (jogador.respostas[partida.indice] !== undefined) return res.status(409).json({ erro: 'Você já respondeu.' });

  const pergunta = partida.perguntas[partida.indice];
  const corretas = indicesCorretos(pergunta);
  const acertou = corretas.includes(Number(escolha));

  const restante = Math.max(0, partida.terminaEm - Date.now());
  const fracao = partida.segundos > 0 ? restante / (partida.segundos * 1000) : 0;
  const ganhou = acertou ? Math.round(PONTOS_MINIMOS + PONTOS_BONUS * fracao) : 0;

  jogador.respostas[partida.indice] = {
    escolha: Number(escolha),
    acertou,
    ganhou,
    ms: partida.segundos * 1000 - restante
  };
  jogador.pontos += ganhou;
  if (acertou) jogador.acertos += 1;

  sincronizar(partida); // pode ter sido o último a responder
  res.json({ acertou, ganhou, pontos: jogador.pontos, gabarito: corretas });
});

/* --------------------------------------------------------------------------
   PROFESSOR — abrir o painel da sala. Também serve de checagem de dono:
   só o professor que criou a sala consegue comandar a partida.
   -------------------------------------------------------------------------- */
app.get('/live/professor/:salaId', autenticar, (req, res) => {
  limparPartidasVelhas();
  const salaId = req.params.salaId;

  db.query(
    `SELECT id, nome, codigo, status, tipo_sala FROM sala WHERE id = ? AND professor_id = ?`,
    [salaId, req.usuario.id],
    (err, salas) => {
      if (err) return res.status(500).json({ erro: 'Erro ao procurar a sala.' });
      if (salas.length === 0) return res.status(404).json({ erro: 'Sala não encontrada ou não é sua.' });

      const sala = salas[0];

      if (!partidas[sala.id]) partidas[sala.id] = abrirPartida(sala);

      const partida = partidas[sala.id];
      sincronizar(partida);
      res.json({ ...retrato(partida, { professor: true }), sala });
    }
  );
});

/* --------------------------------------------------------------------------
   PROFESSOR — chamar a turma para a aula ao vivo.
   Cada chamada é um convite novo (o número cresce), então quem já tinha
   fechado o aviso recebe de novo. Dá para chamar a turma inteira ou só
   os alunos que ainda não entraram.
   -------------------------------------------------------------------------- */
app.post('/live/chamar', autenticar, (req, res) => {
  const { sala_id, alunos } = req.body;

  db.query(
    `SELECT id, nome, codigo, status, tipo_sala FROM sala WHERE id = ? AND professor_id = ?`,
    [sala_id, req.usuario.id],
    (err, salas) => {
      if (err) return res.status(500).json({ erro: 'Erro ao procurar a sala.' });
      if (salas.length === 0) return res.status(404).json({ erro: 'Sala não encontrada ou não é sua.' });

      if (!partidas[sala_id]) partidas[sala_id] = abrirPartida(salas[0]);
      const partida = partidas[sala_id];

      partida.convite = {
        id: (partida.convite?.id || 0) + 1,
        em: Date.now(),
        para: Array.isArray(alunos) && alunos.length > 0 ? alunos : null
      };

      io.to(String(sala_id)).emit('convite_ao_vivo', partida.convite);
      res.json({ ...retrato(partida, { professor: true }), chamados: partida.convite.para?.length ?? 'todos' });
    }
  );
});

/* --------------------------------------------------------------------------
   PROFESSOR — começar a partida com uma atividade escolhida.
   -------------------------------------------------------------------------- */
app.post('/live/iniciar', autenticar, (req, res) => {
  const { sala_id, atividade_id, segundos } = req.body;
  const partida = partidas[sala_id];
  if (!partida) return res.status(404).json({ erro: 'Abra o painel da sala antes de começar.' });

  db.query(
    `SELECT a.id, a.titulo, a.tipo, a.conteudo
       FROM atividade a
       JOIN sala s ON a.sala_id = s.id
      WHERE a.id = ? AND s.id = ? AND s.professor_id = ?`,
    [atividade_id, sala_id, req.usuario.id],
    (err, linhas) => {
      if (err) return res.status(500).json({ erro: 'Erro ao carregar a atividade.' });
      if (linhas.length === 0) return res.status(404).json({ erro: 'Atividade não encontrada nesta sala.' });

      const atividade = linhas[0];
      const perguntas = montarPerguntas(atividade);

      if (perguntas.length === 0) {
        return res.status(400).json({
          erro: 'Por enquanto o modo ao vivo funciona com Quiz e Verdadeiro ou Falso.'
        });
      }
      if (Object.keys(partida.jogadores).length === 0) {
        return res.status(400).json({ erro: 'Espere pelo menos um aluno entrar na sala.' });
      }

      partida.atividadeId = atividade.id;
      partida.titulo = atividade.titulo;
      partida.perguntas = perguntas;
      partida.segundos = Math.min(120, Math.max(5, Number(segundos) || SEGUNDOS_PADRAO));
      partida.indice = 0;
      partida.rodada = Date.now(); // identifica esta partida nas conquistas do professor
      partida.estado = 'pergunta';
      partida.terminaEm = Date.now() + partida.segundos * 1000;
      partida.salvo = false;

      // Zera a pontuação: quem estava na sala de espera começa do zero.
      Object.values(partida.jogadores).forEach(j => {
        j.pontos = 0; j.acertos = 0; j.respostas = {};
      });

      io.to(String(sala_id)).emit('partida_comecou', { indice: 0 });
      res.json(retrato(partida, { professor: true }));
    }
  );
});

/* --------------------------------------------------------------------------
   PROFESSOR — fechar a pergunta na hora (sem esperar o cronômetro).
   -------------------------------------------------------------------------- */
app.post('/live/fechar-pergunta', autenticar, donoDaSala(req => req.body.sala_id), (req, res) => {
  const partida = partidas[req.body.sala_id];
  if (!partida) return res.status(404).json({ erro: 'Partida não encontrada.' });
  if (partida.estado === 'pergunta') partida.estado = 'revisao';
  res.json(retrato(partida, { professor: true }));
});

/* --------------------------------------------------------------------------
   PROFESSOR — próxima pergunta (ou fim da partida).
   -------------------------------------------------------------------------- */
app.post('/live/proxima', autenticar, donoDaSala(req => req.body.sala_id), (req, res) => {
  const partida = partidas[req.body.sala_id];
  if (!partida) return res.status(404).json({ erro: 'Partida não encontrada.' });

  if (partida.indice + 1 >= partida.perguntas.length) {
    partida.estado = 'fim';
    gravarResultado(partida);
  } else {
    partida.indice += 1;
    partida.estado = 'pergunta';
    partida.terminaEm = Date.now() + partida.segundos * 1000;
  }

  io.to(String(partida.salaId)).emit('partida_mudou', { estado: partida.estado, indice: partida.indice });
  res.json(retrato(partida, { professor: true }));
});

/* --------------------------------------------------------------------------
   PROFESSOR — encerrar. A partida volta para a sala de espera e os alunos
   continuam lá, prontos para a próxima atividade.
   -------------------------------------------------------------------------- */
app.post('/live/encerrar', autenticar, donoDaSala(req => req.body.sala_id), (req, res) => {
  const partida = partidas[req.body.sala_id];
  if (!partida) return res.status(404).json({ erro: 'Partida não encontrada.' });

  if (partida.estado !== 'lobby') gravarResultado(partida);

  partida.estado = 'lobby';
  partida.indice = -1;
  partida.atividadeId = null;
  partida.titulo = null;
  partida.perguntas = [];
  partida.salvo = false;
  partida.convite = null;
  Object.values(partida.jogadores).forEach(j => {
    j.pontos = 0; j.acertos = 0; j.respostas = {};
  });

  io.to(String(partida.salaId)).emit('partida_mudou', { estado: 'lobby' });
  res.json(retrato(partida, { professor: true }));
});

/* --------------------------------------------------------------------------
   PROFESSOR — fechar a sala de espera inteira.
   -------------------------------------------------------------------------- */
app.post('/live/fechar-sala', autenticar, donoDaSala(req => req.body.sala_id), (req, res) => {
  const partida = partidas[req.body.sala_id];
  if (partida) {
    if (partida.estado !== 'lobby') gravarResultado(partida);
    delete partidas[req.body.sala_id];
    io.to(String(req.body.sala_id)).emit('sala_encerrada');
  }
  res.json({ ok: true });
});

/* --------------------------------------------------------------------------
   Guarda o resultado da partida em resposta_aluno, no mesmo formato das
   atividades normais — é isso que faz a partida aparecer nos Relatórios.
   O `salvo` evita gravar duas vezes se o professor clicar mais de uma vez.
   -------------------------------------------------------------------------- */
function gravarResultado(partida) {
  if (partida.salvo || !partida.atividadeId) return;
  partida.salvo = true;

  const jogadores = Object.values(partida.jogadores).filter(j => Object.keys(j.respostas).length > 0);
  if (jogadores.length === 0) return;

  const totalPerguntas = partida.perguntas.length;

  // Colocação com empate: quem fez os mesmos pontos divide o lugar.
  // Vai junto no JSON da resposta para as insígnias de pódio e campeão.
  const participantes = Object.values(partida.jogadores);
  const posicaoDe = j => 1 + participantes.filter(o => o.pontos > j.pontos).length;

  jogadores.forEach(jogador => {
    const respostas = {};
    Object.entries(jogador.respostas).forEach(([i, r]) => { respostas[i] = [r.escolha]; });

    const conteudo = {
      respostas,
      pontos: jogador.acertos * 10,
      total: totalPerguntas * 10,
      modo: 'ao_vivo',
      pontos_corrida: jogador.pontos,
      acertos: jogador.acertos,
      posicao: posicaoDe(jogador),
      participantes: participantes.length,
      rodada: partida.rodada || null
    };

    const nota = totalPerguntas > 0
      ? Math.round((jogador.acertos / totalPerguntas) * 100) / 10
      : null;

    // Numa sala permanente o aluno tem cadastro, então os acertos também
    // somam no total dele — é o mesmo placar que aparece no pódio da turma.
    if (partida.tipoSala !== 'temporaria' && jogador.alunoId) {
      db.query(
        `UPDATE aluno_sala SET pontos = pontos + ? WHERE id = ? AND sala_id = ?`,
        [jogador.acertos * 10, jogador.alunoId, partida.salaId],
        (erroPontos) => { if (erroPontos) console.error('Erro ao somar pontos do aluno:', erroPontos); }
      );
    }

    db.query(
      `INSERT INTO resposta_aluno (atividade_id, nome_aluno, sala_id, resposta, nota, corrigido)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [partida.atividadeId, jogador.nome, partida.salaId, JSON.stringify(conteudo), nota],
      (err) => {
        if (err && err.code === 'ER_BAD_FIELD_ERROR') {
          db.query(
            `INSERT INTO resposta_aluno (atividade_id, nome_aluno, sala_id, resposta) VALUES (?, ?, ?, ?)`,
            [partida.atividadeId, jogador.nome, partida.salaId, JSON.stringify(conteudo)],
            (err2) => { if (err2) console.error('Erro ao gravar resultado da partida:', err2); }
          );
        } else if (err) {
          console.error('Erro ao gravar resultado da partida:', err);
        }
      }
    );
  });

  console.log(`💾 Partida da sala ${partida.codigo} gravada (${jogadores.length} alunos).`);
}

/* --------------------------------------------------------------------------
   Socket.io continua ligado para quem quiser reagir na hora, mas as telas
   funcionam só com as rotas acima. Assim, se o socket cair no meio da aula,
   o jogo não para.
   -------------------------------------------------------------------------- */
io.on('connection', (socket) => {
  socket.on('entrar_sala', (salaId) => socket.join(String(salaId)));
  socket.on('sair_sala',   (salaId) => socket.leave(String(salaId)));
});

/* ==========================================================================
   AJUSTES DE BANCO NA SUBIDA DO SERVIDOR
   ========================================================================== */

// Professores que ficaram esperando aprovação no sistema antigo são liberados.
db.query(
  `UPDATE usuario SET status = 'aprovado' WHERE tipo_usuario = 'professor' AND status = 'pendente'`,
  (err, r) => {
    if (err) console.error('Erro ao liberar professores pendentes:', err.message);
    else if (r.affectedRows > 0) console.log(`✅ ${r.affectedRows} professor(es) pendente(s) liberado(s).`);
  }
);

// PINs dos alunos passam a ser guardados criptografados (bcrypt, 60 letras).
// 1) alarga a coluna se precisar; 2) criptografa os PINs antigos em texto puro.
db.query(`SHOW COLUMNS FROM aluno_sala LIKE 'pin'`, (err, colunas) => {
  if (err || !colunas || colunas.length === 0) return;
  const tipo = String(colunas[0].Type || '').toLowerCase();
  const tamanho = Number((tipo.match(/\((\d+)\)/) || [])[1] || 0);
  const alargar = (tipo.startsWith('varchar') || tipo.startsWith('char')) && tamanho < 100;

  const criptografarAntigos = () => {
    db.query(`SELECT id, pin FROM aluno_sala WHERE pin IS NOT NULL AND pin <> '' AND pin NOT LIKE '$2%'`, async (errSel, linhas) => {
      if (errSel || !linhas.length) return;
      for (const l of linhas) {
        const hash = await bcrypt.hash(String(l.pin), 10);
        db.query(`UPDATE aluno_sala SET pin = ? WHERE id = ?`, [hash, l.id]);
      }
      console.log(`🔒 ${linhas.length} PIN(s) de aluno criptografado(s).`);
    });
  };

  if (alargar) {
    db.query(`ALTER TABLE aluno_sala MODIFY pin VARCHAR(100) NULL`, (errAlt) => {
      if (errAlt) return console.error('Não consegui alargar a coluna do PIN:', errAlt.message);
      criptografarAntigos();
    });
  } else {
    criptografarAntigos();
  }
});

// Se a coluna atividade.tipo for um ENUM, ela recusaria os tipos novos
// (ordenar, memoria, grupos). Nesse caso vira texto — só alarga, não apaga nada.
db.query(`SHOW COLUMNS FROM atividade LIKE 'tipo'`, (err, colunas) => {
  if (err || !colunas || colunas.length === 0) return;
  const tipoDaColuna = String(colunas[0].Type || '').toLowerCase();
  if (tipoDaColuna.startsWith('enum')) {
    db.query(`ALTER TABLE atividade MODIFY tipo VARCHAR(30) NOT NULL`, (erroAlter) => {
      if (erroAlter) console.error('Não consegui liberar os tipos novos de atividade:', erroAlter.message);
      else console.log('✅ Coluna atividade.tipo agora aceita os tipos novos.');
    });
  }
});

/* ==========================================================================
   10b. CONQUISTAS E INSÍGNIAS

   Cada insígnia pertence a um aluno DENTRO de uma turma. Isso já vem de
   graça do jeito que o Saber+ guarda os alunos: o Joãozinho da turma A de
   Matemática e o Joãozinho da turma C de Educação Física são duas linhas
   diferentes em `aluno_sala`, com ids diferentes. Como a conquista fica
   presa ao id da `aluno_sala`, o que ele ganha na turma A não aparece na C —
   lá ele começa do zero e conquista tudo de novo.

   Como funciona:
   1. As regras moram na lista CONQUISTAS logo abaixo. Cada uma sabe medir o
      progresso do aluno a partir do que já existe no banco (respostas,
      pontos, ranking). Nenhuma tela precisa "avisar" que o aluno ganhou algo.
   2. Quando o aluno abre a página dele, o servidor mede tudo, e o que bateu
      a meta pela primeira vez é gravado em `conquista_aluno` com a data.
   3. O que foi gravado nunca some. Se o aluno chegou ao 1º lugar da turma e
      depois caiu, a insígnia "Topo da turma" continua com ele.
   4. A coluna `vista` diz se o aluno já viu a comemoração daquela insígnia.
      É ela que faz a tela festejar só uma vez.

   Por ser medido a partir dos dados, é retroativo: quem já tinha feito 5
   atividades antes disso existir ganha as insígnias na primeira visita.
   ========================================================================== */

// A tabela é criada sozinha na primeira vez que o servidor sobe.
// O mesmo comando está em backend/sql/conquista_aluno.sql, para o TCC.
db.query(`
  CREATE TABLE IF NOT EXISTS conquista_aluno (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    aluno_id       INT          NOT NULL,
    sala_id        INT          NOT NULL,
    codigo         VARCHAR(40)  NOT NULL,
    conquistada_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vista          TINYINT(1)   NOT NULL DEFAULT 0,
    UNIQUE KEY uk_aluno_codigo (aluno_id, codigo),
    KEY idx_sala (sala_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`, (err) => {
  if (err) console.error('❌ Não consegui criar a tabela conquista_aluno:', err.message);
});

/* --------------------------------------------------------------------------
   O catálogo. Para criar, tirar ou mudar uma insígnia, é só mexer aqui.

   - grupo:  em que bloco ela aparece na página de conquistas
   - nivel:  bronze, prata ou ouro (muda a cor da medalha na tela)
   - icone:  nome do ícone do lucide-react que aparece dentro da medalha
   - meta:   quanto o aluno precisa atingir (número ou função)
   - medir:  quanto o aluno já tem, calculado a partir de `d` (os dados dele)
   -------------------------------------------------------------------------- */
const CONQUISTAS = [
  // --- fazer atividades ---
  { codigo: 'primeiro_passo', grupo: 'Fazendo atividades', nome: 'Primeiro passo', icone: 'Footprints', nivel: 'bronze',
    descricao: 'Fez a primeira atividade da turma.',
    meta: 1, medir: d => d.feitas },
  { codigo: 'pegando_ritmo', grupo: 'Fazendo atividades', nome: 'Pegando o ritmo', icone: 'Flame', nivel: 'prata',
    descricao: 'Fez 5 atividades.',
    meta: 5, medir: d => d.feitas },
  { codigo: 'maratonista', grupo: 'Fazendo atividades', nome: 'Maratonista', icone: 'Medal', nivel: 'ouro',
    descricao: 'Fez 15 atividades.',
    meta: 15, medir: d => d.feitas },

  // --- acertar tudo ---
  { codigo: 'gabaritou', grupo: 'Acertando tudo', nome: 'Gabaritou!', icone: 'Star', nivel: 'bronze',
    descricao: 'Acertou tudo numa atividade.',
    meta: 1, medir: d => d.perfeitas },
  { codigo: 'mestre_gabarito', grupo: 'Acertando tudo', nome: 'Mestre do gabarito', icone: 'Crown', nivel: 'ouro',
    descricao: 'Acertou tudo em 5 atividades.',
    meta: 5, medir: d => d.perfeitas },

  // --- jeito de estudar ---
  { codigo: 'relampago', grupo: 'Jeito de estudar', nome: 'Relâmpago', icone: 'Zap', nivel: 'bronze',
    descricao: 'Fez uma atividade no mesmo dia em que o professor lançou.',
    meta: 1, medir: d => d.mesmoDia },
  { codigo: 'explorador', grupo: 'Jeito de estudar', nome: 'Explorador', icone: 'Compass', nivel: 'prata',
    descricao: 'Fez 3 tipos diferentes de atividade.',
    meta: 3, medir: d => d.tipos },
  { codigo: 'em_dia', grupo: 'Jeito de estudar', nome: 'Em dia', icone: 'CalendarCheck', nivel: 'ouro',
    descricao: 'Fez todas as atividades da turma (pelo menos 3).',
    // Com menos de 3 atividades lançadas seria fácil demais.
    meta: d => Math.max(3, d.totalAtividades), medir: d => d.feitas },

  // --- aula ao vivo ---
  { codigo: 'presente', grupo: 'Aula ao vivo', nome: 'Presente!', icone: 'Radio', nivel: 'bronze',
    descricao: 'Participou de uma aula ao vivo.',
    meta: 1, medir: d => d.aoVivo },
  { codigo: 'no_podio', grupo: 'Aula ao vivo', nome: 'No pódio', icone: 'Award', nivel: 'prata',
    descricao: 'Ficou entre os 3 primeiros numa aula ao vivo.',
    meta: 1, medir: d => d.podios },
  { codigo: 'campeao', grupo: 'Aula ao vivo', nome: 'Campeão ao vivo', icone: 'Trophy', nivel: 'ouro',
    descricao: 'Ganhou uma aula ao vivo.',
    meta: 1, medir: d => d.vitorias },

  // --- pontos e ranking ---
  { codigo: 'cem_pontos', grupo: 'Pontos e ranking', nome: 'Cem pontos', icone: 'Sparkles', nivel: 'bronze',
    descricao: 'Juntou 100 pontos na turma.',
    meta: 100, medir: d => d.pontos },
  { codigo: 'colecionador', grupo: 'Pontos e ranking', nome: 'Colecionador', icone: 'Gem', nivel: 'ouro',
    descricao: 'Juntou 500 pontos na turma.',
    meta: 500, medir: d => d.pontos },
  { codigo: 'topo_turma', grupo: 'Pontos e ranking', nome: 'Topo da turma', icone: 'Mountain', nivel: 'ouro',
    descricao: 'Chegou ao 1º lugar do ranking da turma.',
    meta: 1, medir: d => (d.primeiroLugar ? 1 : 0) }
];

/* --------------------------------------------------------------------------
   Acertou tudo? Cada tipo de atividade guarda a resposta de um jeito:
   - Verdadeiro/Falso: lista de { acertou }
   - Ligar: { acertos, total }            (total = número de pares)
   - Quiz e aula ao vivo: { pontos, total } (os dois contados de 10 em 10)
   - Pintura e resposta aberta: só dá para saber pela nota do professor
   -------------------------------------------------------------------------- */
function acertouTudo(resposta, nota) {
  if (nota !== null && nota !== undefined && Number(nota) >= 10) return true;
  if (!resposta) return false;

  if (Array.isArray(resposta)) {
    return resposta.length > 0 && resposta.every(r => r && r.acertou === true);
  }
  if (resposta.modo !== 'ao_vivo' && typeof resposta.acertos === 'number' && Number(resposta.total) > 0) {
    return resposta.acertos >= Number(resposta.total);
  }
  if (Number(resposta.total) > 0) {
    return Number(resposta.pontos) >= Number(resposta.total);
  }
  return false;
}

function mesmoDia(a, b) {
  if (!a || !b) return false;
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear()
      && x.getMonth() === y.getMonth()
      && x.getDate() === y.getDate();
}

/* --------------------------------------------------------------------------
   Junta tudo o que as regras precisam saber sobre um aluno numa turma.
   -------------------------------------------------------------------------- */
async function medirAluno(aluno) {
  const banco = db.promise();

  const [respostas] = await banco.query(
    `SELECT r.atividade_id, r.resposta, r.nota, r.criado_em,
            a.tipo, a.criado_em AS atividade_criada_em
       FROM resposta_aluno r
       JOIN atividade a ON a.id = r.atividade_id
      WHERE r.sala_id = ? AND r.nome_aluno = ?`,
    [aluno.sala_id, aluno.nome_aluno]
  );

  const [[{ total }]] = await banco.query(
    `SELECT COUNT(*) AS total FROM atividade WHERE sala_id = ?`,
    [aluno.sala_id]
  );

  const [[{ maior }]] = await banco.query(
    `SELECT MAX(pontos) AS maior FROM aluno_sala WHERE sala_id = ?`,
    [aluno.sala_id]
  );

  const feitas = new Set();
  const perfeitas = new Set();
  const tipos = new Set();
  let noMesmoDia = 0, aoVivo = 0, podios = 0, vitorias = 0;

  respostas.forEach(r => {
    let resposta = r.resposta;
    if (typeof resposta === 'string') {
      try { resposta = JSON.parse(resposta); } catch { resposta = null; }
    }

    feitas.add(r.atividade_id);
    if (r.tipo) tipos.add(r.tipo);
    if (acertouTudo(resposta, r.nota)) perfeitas.add(r.atividade_id);
    if (mesmoDia(r.criado_em, r.atividade_criada_em)) noMesmoDia++;

    if (resposta && resposta.modo === 'ao_vivo') {
      aoVivo++;
      // Só vale pódio se teve disputa (2+ alunos) e o aluno pontuou.
      const disputa = Number(resposta.participantes) >= 2 && Number(resposta.pontos_corrida) > 0;
      if (disputa && Number(resposta.posicao) <= 3) podios++;
      if (disputa && Number(resposta.posicao) === 1) vitorias++;
    }
  });

  const pontos = Number(aluno.pontos) || 0;

  return {
    feitas: feitas.size,
    perfeitas: perfeitas.size,
    tipos: tipos.size,
    mesmoDia: noMesmoDia,
    totalAtividades: Number(total) || 0,
    aoVivo,
    podios,
    vitorias,
    pontos,
    // Empate no topo conta: os dois estão em 1º.
    primeiroLugar: pontos > 0 && pontos >= (Number(maior) || 0)
  };
}

/* --------------------------------------------------------------------------
   ALUNO — minhas insígnias nesta turma.
   Mede, grava o que foi conquistado agora e devolve o catálogo inteiro com
   o progresso de cada uma (as bloqueadas também, para a criança ver o que
   falta).
   -------------------------------------------------------------------------- */
app.get('/aluno/:alunoId/conquistas', autenticarAluno, async (req, res) => {
  if (Number(req.params.alunoId) !== Number(req.aluno.aluno_id)) return res.status(403).json({ erro: 'Acesso negado.' });
  try {
    const banco = db.promise();
    const [alunos] = await banco.query(
      `SELECT id, nome_aluno, sala_id, pontos FROM aluno_sala WHERE id = ?`,
      [req.params.alunoId]
    );
    if (alunos.length === 0) return res.status(404).json({ erro: 'Aluno não encontrado.' });
    const aluno = alunos[0];

    const d = await medirAluno(aluno);

    const [jaTinha] = await banco.query(
      `SELECT codigo FROM conquista_aluno WHERE aluno_id = ?`, [aluno.id]
    );
    const conquistadas = new Set(jaTinha.map(c => c.codigo));

    const novas = CONQUISTAS.filter(c => {
      const meta = typeof c.meta === 'function' ? c.meta(d) : c.meta;
      return !conquistadas.has(c.codigo) && c.medir(d) >= meta;
    });

    if (novas.length > 0) {
      // INSERT IGNORE: se duas abas abrirem ao mesmo tempo, não duplica.
      await banco.query(
        `INSERT IGNORE INTO conquista_aluno (aluno_id, sala_id, codigo) VALUES ?`,
        [novas.map(c => [aluno.id, aluno.sala_id, c.codigo])]
      );
    }

    const [registro] = await banco.query(
      `SELECT codigo, conquistada_em, vista FROM conquista_aluno WHERE aluno_id = ?`,
      [aluno.id]
    );
    const porCodigo = Object.fromEntries(registro.map(r => [r.codigo, r]));

    const lista = CONQUISTAS.map(c => {
      const meta = typeof c.meta === 'function' ? c.meta(d) : c.meta;
      const reg = porCodigo[c.codigo];
      return {
        codigo: c.codigo,
        grupo: c.grupo,
        nome: c.nome,
        descricao: c.descricao,
        icone: c.icone,
        nivel: c.nivel,
        meta,
        atual: Math.min(c.medir(d), meta),
        conquistada: !!reg,
        conquistadaEm: reg ? reg.conquistada_em : null,
        nova: !!reg && !reg.vista
      };
    });

    res.json({
      total: lista.length,
      conquistadas: lista.filter(c => c.conquistada).length,
      lista
    });
  } catch (err) {
    console.error('Erro ao calcular conquistas:', err);
    res.status(500).json({ erro: 'Erro ao buscar as conquistas.' });
  }
});

/* --------------------------------------------------------------------------
   ALUNO — "já vi a comemoração". Depois disso a insígnia não festeja mais.
   -------------------------------------------------------------------------- */
app.post('/aluno/:alunoId/conquistas/vistas', autenticarAluno, (req, res) => {
  if (Number(req.params.alunoId) !== Number(req.aluno.aluno_id)) return res.status(403).json({ erro: 'Acesso negado.' });
  db.query(
    `UPDATE conquista_aluno SET vista = 1 WHERE aluno_id = ? AND vista = 0`,
    [req.params.alunoId],
    (err) => {
      if (err) return res.status(500).json({ erro: 'Erro ao marcar as conquistas.' });
      res.json({ ok: true });
    }
  );
});

/* --------------------------------------------------------------------------
   Quantas insígnias cada aluno tem nesta turma — para a sala de colegas.
   -------------------------------------------------------------------------- */
app.get('/sala/:salaId/conquistas', acessoASala(req => req.params.salaId), (req, res) => {
  db.query(
    `SELECT aluno_id, COUNT(*) AS total FROM conquista_aluno WHERE sala_id = ? GROUP BY aluno_id`,
    [req.params.salaId],
    (err, linhas) => {
      if (err) return res.status(500).json({ erro: 'Erro ao buscar as conquistas da turma.' });
      res.json({ totalPossivel: CONQUISTAS.length, porAluno: linhas });
    }
  );
});

/* ==========================================================================
   10c. CONQUISTAS DO PROFESSOR

   Mesma ideia das insígnias do aluno (seção 10b), mas medindo o trabalho do
   professor: atividades criadas, aulas ao vivo, engajamento da turma e
   cuidado com a correção. As do professor valem para a conta dele inteira,
   somando todas as turmas.

   Como no aluno: as regras medem o que já está no banco, o que bateu a meta
   é gravado com data em `conquista_professor`, nunca some, e a coluna
   `vista` faz a comemoração aparecer uma vez só.
   ========================================================================== */

db.query(`
  CREATE TABLE IF NOT EXISTS conquista_professor (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    professor_id   INT          NOT NULL,
    codigo         VARCHAR(40)  NOT NULL,
    conquistada_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vista          TINYINT(1)   NOT NULL DEFAULT 0,
    UNIQUE KEY uk_professor_codigo (professor_id, codigo)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`, (err) => {
  if (err) console.error('❌ Não consegui criar a tabela conquista_professor:', err.message);
});

// Todos os tipos de atividade que o Saber+ tem hoje
const TIPOS_DE_ATIVIDADE = ['quiz', 'v_f', 'ligar', 'pintura', 'resposta_aberta', 'ordenar', 'memoria', 'grupos'];

// Resposta de resposta aberta ou pintura esperando nota há mais que isso
// conta como "atrasada" para a insígnia de correção em dia.
const DIAS_PARA_CORRIGIR = 7;

const CONQUISTAS_PROFESSOR = [
  // --- criando atividades ---
  { codigo: 'prof_primeira_atividade', grupo: 'Criando atividades', nome: 'Primeira aula', icone: 'FilePlus', nivel: 'bronze',
    descricao: 'Criou a primeira atividade.',
    meta: 1, medir: d => d.atividades },
  { codigo: 'prof_mao_na_massa', grupo: 'Criando atividades', nome: 'Mão na massa', icone: 'Layers', nivel: 'prata',
    descricao: 'Criou 10 atividades.',
    meta: 10, medir: d => d.atividades },
  { codigo: 'prof_fabrica_ideias', grupo: 'Criando atividades', nome: 'Fábrica de ideias', icone: 'Lightbulb', nivel: 'ouro',
    descricao: 'Criou 30 atividades.',
    meta: 30, medir: d => d.atividades },
  { codigo: 'prof_repertorio', grupo: 'Criando atividades', nome: 'Repertório completo', icone: 'Shapes', nivel: 'ouro',
    descricao: 'Usou 5 tipos diferentes de atividade.',
    meta: 5, medir: d => d.tipos },
  { codigo: 'prof_casa_cheia', grupo: 'Criando atividades', nome: 'Casa cheia', icone: 'School', nivel: 'prata',
    descricao: 'Criou 3 turmas.',
    meta: 3, medir: d => d.turmas },

  // --- aula ao vivo ---
  { codigo: 'prof_no_ar', grupo: 'Aula ao vivo', nome: 'No ar!', icone: 'Radio', nivel: 'bronze',
    descricao: 'Conduziu a primeira aula ao vivo.',
    meta: 1, medir: d => d.aulasAoVivo },
  { codigo: 'prof_apresentador', grupo: 'Aula ao vivo', nome: 'Apresentador', icone: 'Mic', nivel: 'prata',
    descricao: 'Conduziu 5 aulas ao vivo.',
    meta: 5, medir: d => d.aulasAoVivo },
  { codigo: 'prof_plateia_lotada', grupo: 'Aula ao vivo', nome: 'Plateia lotada', icone: 'Users', nivel: 'ouro',
    descricao: 'Fez uma aula ao vivo com 20 alunos ou mais.',
    meta: 20, medir: d => d.maiorPlateia },

  // --- engajamento da turma ---
  { codigo: 'prof_turma_ativa', grupo: 'Engajamento da turma', nome: 'Turma ativa', icone: 'MessageSquare', nivel: 'bronze',
    descricao: 'Recebeu 100 respostas dos alunos.',
    meta: 100, medir: d => d.respostas },
  { codigo: 'prof_sala_movimentada', grupo: 'Engajamento da turma', nome: 'Sala movimentada', icone: 'Activity', nivel: 'ouro',
    descricao: 'Recebeu 500 respostas dos alunos.',
    meta: 500, medir: d => d.respostas },
  { codigo: 'prof_ninguem_de_fora', grupo: 'Engajamento da turma', nome: 'Ninguém ficou de fora', icone: 'HeartHandshake', nivel: 'ouro',
    descricao: 'Uma atividade que a turma inteira fez (turma com pelo menos 3 alunos).',
    meta: 1, medir: d => d.atividadesCompletas },
  { codigo: 'prof_aula_que_funcionou', grupo: 'Engajamento da turma', nome: 'Aula que funcionou', icone: 'TrendingUp', nivel: 'prata',
    descricao: 'Uma atividade em que a turma acertou 80% ou mais, em média (com pelo menos 3 respostas).',
    meta: 1, medir: d => d.atividadesBemSucedidas },

  // --- correção e cuidado ---
  { codigo: 'prof_olho_clinico', grupo: 'Correção e cuidado', nome: 'Olho clínico', icone: 'PenLine', nivel: 'bronze',
    descricao: 'Corrigiu 10 respostas à mão.',
    meta: 10, medir: d => d.corrigidas },
  { codigo: 'prof_corretor_dedicado', grupo: 'Correção e cuidado', nome: 'Corretor dedicado', icone: 'ClipboardCheck', nivel: 'ouro',
    descricao: 'Corrigiu 50 respostas à mão.',
    meta: 50, medir: d => d.corrigidas },
  { codigo: 'prof_correcao_em_dia', grupo: 'Correção e cuidado', nome: 'Correção em dia', icone: 'CalendarCheck', nivel: 'prata',
    descricao: `Já corrigiu 5 respostas e não tem nenhuma esperando nota há mais de ${DIAS_PARA_CORRIGIR} dias.`,
    // A barra mostra o caminho até as 5 corrigidas; a insígnia só sai
    // quando, além disso, não há nada atrasado.
    meta: 5, medir: d => (d.pendentesAtrasadas === 0 ? d.corrigidas : Math.min(d.corrigidas, 4)) }
];

/* --------------------------------------------------------------------------
   Quanto a turma acertou numa resposta, de 0 a 1 (ou null se não dá para
   saber sem a nota do professor). Mesmos formatos da função acertouTudo.
   -------------------------------------------------------------------------- */
function aproveitamento(resposta, nota) {
  if (nota !== null && nota !== undefined) return Math.min(1, Number(nota) / 10);
  if (!resposta) return null;
  if (Array.isArray(resposta)) {
    return resposta.length > 0 ? resposta.filter(r => r && r.acertou === true).length / resposta.length : null;
  }
  if (resposta.modo !== 'ao_vivo' && typeof resposta.acertos === 'number' && Number(resposta.total) > 0) {
    return resposta.acertos / Number(resposta.total);
  }
  if (Number(resposta.total) > 0) return Number(resposta.pontos) / Number(resposta.total);
  return null;
}

async function medirProfessor(professorId) {
  const banco = db.promise();

  const [atividades] = await banco.query(
    `SELECT id, tipo, sala_id FROM atividade WHERE professor_id = ?`, [professorId]
  );
  const [[{ turmas }]] = await banco.query(
    `SELECT COUNT(*) AS turmas FROM sala WHERE professor_id = ?`, [professorId]
  );
  // Quem está matriculado em cada turma (para saber se "todo mundo" fez)
  const [matriculas] = await banco.query(
    `SELECT al.sala_id, al.nome_aluno
       FROM aluno_sala al JOIN sala s ON s.id = al.sala_id
      WHERE s.professor_id = ?`,
    [professorId]
  );
  const [respostas] = await banco.query(
    `SELECT r.atividade_id, r.nome_aluno, r.resposta, r.nota, r.corrigido, r.criado_em, a.tipo, a.sala_id
       FROM resposta_aluno r
       JOIN atividade a ON a.id = r.atividade_id
      WHERE a.professor_id = ?`,
    [professorId]
  );

  const turmaDe = {};
  matriculas.forEach(m => {
    if (!turmaDe[m.sala_id]) turmaDe[m.sala_id] = [];
    turmaDe[m.sala_id].push(m.nome_aluno);
  });
  const limiteAtraso = Date.now() - DIAS_PARA_CORRIGIR * 24 * 60 * 60 * 1000;

  const porAtividade = {};     // quem respondeu e quanto acertou, por atividade
  const aulas = new Set();     // cada aula ao vivo, sem contar duas vezes
  let maiorPlateia = 0, corrigidas = 0, pendentesAtrasadas = 0;

  respostas.forEach(r => {
    let resposta = r.resposta;
    if (typeof resposta === 'string') {
      try { resposta = JSON.parse(resposta); } catch { resposta = null; }
    }
    const aoVivo = resposta && resposta.modo === 'ao_vivo';

    if (!porAtividade[r.atividade_id]) {
      porAtividade[r.atividade_id] = { salaId: r.sala_id, alunos: new Set(), notas: [] };
    }
    const grupo = porAtividade[r.atividade_id];
    grupo.alunos.add(r.nome_aluno);
    const nota = aproveitamento(resposta, r.nota);
    if (nota !== null && !isNaN(nota)) grupo.notas.push(nota);

    if (aoVivo) {
      // Cada partida tem uma "rodada". Resultados antigos (antes da rodada
      // existir) são agrupados pela atividade + minuto em que foram gravados.
      const minuto = r.criado_em ? new Date(r.criado_em).toISOString().slice(0, 16) : 'sem-data';
      aulas.add(resposta.rodada ? `r${resposta.rodada}` : `${r.atividade_id}|${minuto}`);
      maiorPlateia = Math.max(maiorPlateia, Number(resposta.participantes) || 0);
    } else if (Number(r.corrigido) === 1 && r.nota !== null) {
      // Aula ao vivo já grava corrigido = 1 sozinha; aqui só conta a mão do professor.
      corrigidas++;
    }

    const precisaDeNota = ['resposta_aberta', 'pintura'].includes(r.tipo);
    if (precisaDeNota && r.nota === null && new Date(r.criado_em).getTime() < limiteAtraso) {
      pendentesAtrasadas++;
    }
  });

  const grupos = Object.values(porAtividade);

  return {
    atividades: atividades.length,
    tipos: new Set(atividades.map(a => a.tipo).filter(t => TIPOS_DE_ATIVIDADE.includes(t))).size,
    turmas: Number(turmas) || 0,
    aulasAoVivo: aulas.size,
    maiorPlateia,
    respostas: respostas.length,
    // Conta só quem é da turma: resposta de aluno de sala temporária ou de
    // alguém que já saiu não faz a turma parecer "completa".
    atividadesCompletas: grupos.filter(g => {
      const turma = turmaDe[g.salaId] || [];
      return turma.length >= 3 && turma.every(nome => g.alunos.has(nome));
    }).length,
    atividadesBemSucedidas: grupos.filter(g =>
      g.notas.length >= 3 && g.notas.reduce((a, b) => a + b, 0) / g.notas.length >= 0.8
    ).length,
    corrigidas,
    pendentesAtrasadas
  };
}

/* --------------------------------------------------------------------------
   PROFESSOR — minhas conquistas.
   -------------------------------------------------------------------------- */
app.get('/professor/conquistas', autenticar, async (req, res) => {
  try {
    const banco = db.promise();
    const professorId = req.usuario.id;
    const d = await medirProfessor(professorId);

    const [jaTinha] = await banco.query(
      `SELECT codigo FROM conquista_professor WHERE professor_id = ?`, [professorId]
    );
    const conquistadas = new Set(jaTinha.map(c => c.codigo));

    const novas = CONQUISTAS_PROFESSOR.filter(c => !conquistadas.has(c.codigo) && c.medir(d) >= c.meta);
    if (novas.length > 0) {
      await banco.query(
        `INSERT IGNORE INTO conquista_professor (professor_id, codigo) VALUES ?`,
        [novas.map(c => [professorId, c.codigo])]
      );
    }

    const [registro] = await banco.query(
      `SELECT codigo, conquistada_em, vista FROM conquista_professor WHERE professor_id = ?`,
      [professorId]
    );
    const porCodigo = Object.fromEntries(registro.map(r => [r.codigo, r]));

    const lista = CONQUISTAS_PROFESSOR.map(c => {
      const reg = porCodigo[c.codigo];
      return {
        codigo: c.codigo,
        grupo: c.grupo,
        nome: c.nome,
        descricao: c.descricao,
        icone: c.icone,
        nivel: c.nivel,
        meta: c.meta,
        atual: Math.min(c.medir(d), c.meta),
        conquistada: !!reg,
        conquistadaEm: reg ? reg.conquistada_em : null,
        nova: !!reg && !reg.vista
      };
    });

    res.json({
      total: lista.length,
      conquistadas: lista.filter(c => c.conquistada).length,
      pendentesAtrasadas: d.pendentesAtrasadas,
      lista
    });
  } catch (err) {
    console.error('Erro ao calcular conquistas do professor:', err);
    res.status(500).json({ erro: 'Erro ao buscar as conquistas.' });
  }
});

app.post('/professor/conquistas/vistas', autenticar, (req, res) => {
  db.query(
    `UPDATE conquista_professor SET vista = 1 WHERE professor_id = ? AND vista = 0`,
    [req.usuario.id],
    (err) => {
      if (err) return res.status(500).json({ erro: 'Erro ao marcar as conquistas.' });
      res.json({ ok: true });
    }
  );
});

/* ==========================================================================
   11. INICIAR SERVIDOR
   ========================================================================== */

/* Qualquer erro que escapar vira uma mensagem simples: nada de mostrar
   pedaço de código, caminho de pasta ou detalhe do banco para quem visita. */
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err?.message === 'Acesso bloqueado pela política de CORS') return res.status(403).json({ erro: 'Acesso negado.' });
  if (err?.message === 'Formato inválido' || err?.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ erro: 'Imagem inválida ou grande demais (até 10 MB).' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ erro: 'Envio grande demais.' });
  console.error('Erro não tratado:', err?.message);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Servidor HTTP e Socket.io rodando na porta ${PORT}`));

// Cópia diária do banco (pasta backend/backups + Cloudinary privado)
ligarBackupAutomatico();

// Um erro inesperado vira registro no log em vez de derrubar o site
process.on('unhandledRejection', (motivo) => console.error('Promessa rejeitada sem tratamento:', motivo?.message || motivo));

