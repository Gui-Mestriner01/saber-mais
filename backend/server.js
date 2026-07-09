const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const rateLimit  = require('express-rate-limit');
const db         = require('./db');
require('dotenv').config();

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const tipos = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    tipos.includes(file.mimetype) ? cb(null, true) : cb(new Error('Formato inválido'));
  }
});

// INICIALIZE O APP PRIMEIRO
const app = express();

// USE O APP DEPOIS
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.use('/uploads', express.static(uploadDir));

// ========================
// SEGURANÇA
// ========================
app.use(helmet());

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// --- CORREÇÃO AQUI: Aumentando o limite de JSON para 50MB ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// ------------------------------------------------------------

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { erro: 'Muitas tentativas. Tente novamente em 15 minutos.' }
});

// ========================
// MIDDLEWARES
// ========================
function autenticar(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ erro: 'Token não fornecido.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

// ========================
// ROTAS PÚBLICAS
// ========================

// Cadastro de Professor
app.post('/cadastro/professor', authLimiter, async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha)
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });

  if (senha.length < 8)
    return res.status(400).json({ erro: 'A senha deve ter no mínimo 8 caracteres.' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ erro: 'E-mail inválido.' });

  try {
    const senhaCriptografada = await bcrypt.hash(senha, 12);

    const sql = `
      INSERT INTO usuario (nome, email, senha, tipo_usuario, status)
      VALUES (?, ?, ?, 'professor', 'pendente')
    `;

    db.query(sql, [nome, email.toLowerCase(), senhaCriptografada], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY')
          return res.status(409).json({ erro: 'E-mail já cadastrado.' });
        return res.status(500).json({ erro: 'Erro ao cadastrar professor.' });
      }
      res.status(201).json({
        mensagem: 'Cadastro realizado! Aguarde a aprovação do administrador.',
        id: result.insertId
      });
    });
  } catch {
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

// Login de Professor e Admin
app.post('/login/professor', authLimiter, async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha)
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });

  const sql = `SELECT * FROM usuario WHERE email = ? AND tipo_usuario IN ('professor', 'admin')`;

  db.query(sql, [email.toLowerCase()], async (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro interno do servidor.' });

    if (results.length === 0)
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });

    const usuario = results[0];

    if (usuario.tipo_usuario === 'professor') {
      if (usuario.status === 'pendente')
        return res.status(403).json({ erro: 'Seu cadastro ainda está aguardando aprovação.' });
      if (usuario.status === 'rejeitado')
        return res.status(403).json({ erro: 'Seu cadastro foi rejeitado. Entre em contato com o suporte.' });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta)
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      mensagem: 'Login realizado com sucesso!',
      token,
      usuario: {
        id:    usuario.id,
        nome:  usuario.nome,
        email: usuario.email,
        tipo:  usuario.tipo_usuario
      }
    });
  });
});

// Listar todas as salas (área do aluno)
app.get('/salas', (req, res) => {
  const sql = `
    SELECT s.id, s.nome, s.serie, s.materia, s.codigo, 
           s.senha_emojis, s.tema_senha,
           u.nome AS professor
    FROM sala s
    JOIN usuario u ON s.professor_id = u.id
    ORDER BY s.criado_em DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar salas.' });
    res.json(results);
  });
});

// Entrar na sala (Salvar aluno)
app.post('/aluno/entrar-sala', (req, res) => {
  const { nome_aluno, sala_id } = req.body;
  if (!nome_aluno || !sala_id)
    return res.status(400).json({ erro: 'Dados incompletos.' });
  const sql = `INSERT INTO aluno_sala (nome_aluno, sala_id) VALUES (?, ?)`;
  db.query(sql, [nome_aluno, sala_id], (err) => {
    if (err) return res.status(500).json({ erro: 'Erro ao registrar aluno.' });
    res.status(201).json({ mensagem: 'Aluno registrado!' });
  });
});

// ========================
// ROTAS PROTEGIDAS — PROFESSOR
// ========================

// Criar Sala
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

// Atualiza a rota POST /professor/sala
app.post('/professor/sala', autenticar, (req, res) => {
  const { nome, serie, materia, codigo } = req.body;
  const professorId = req.usuario.id;

  if (!nome || !serie || !materia || !codigo)
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });

  const { tema, senha } = gerarSenhaEmoji();

  const sql = `
    INSERT INTO sala (nome, serie, materia, codigo, senha_emojis, tema_senha, professor_id, ano_letivo)
    VALUES (?, ?, ?, ?, ?, ?, ?, 2026)
  `;

  db.query(sql, [nome, serie, materia, codigo, senha, tema, professorId], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY')
        return res.status(409).json({ erro: 'Código de sala já existe.' });
      return res.status(500).json({ erro: 'Erro ao criar sala.' });
    }
    res.status(201).json({
      mensagem: 'Sala criada com sucesso!',
      id: result.insertId,
      codigo,
      senha,
      tema
    });
  });
});

// Listar Salas do Professor
app.get('/professor/salas', autenticar, (req, res) => {
  const sql = `SELECT * FROM sala WHERE professor_id = ? ORDER BY criado_em DESC`;
  db.query(sql, [req.usuario.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar salas.' });
    res.json(results);
  });
});

// Listar Alunos de uma Sala Específica
app.get('/professor/sala/:id/alunos', autenticar, (req, res) => {
  const sql = `
    SELECT nome_aluno, entrou_em
    FROM aluno_sala
    WHERE sala_id = ?
    ORDER BY entrou_em DESC
  `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar alunos.' });
    res.json(results);
  });
});

// Perfil do Professor
app.get('/professor/perfil', autenticar, (req, res) => {
  const sql = `SELECT id, nome, email, status, telefone, instituicao, materia FROM usuario WHERE id = ?`;
  db.query(sql, [req.usuario.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar perfil.' });
    if (results.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json(results[0]);
  });
});

// Atualizar Perfil do Professor
app.put('/professor/perfil', autenticar, async (req, res) => {
  const { nome, telefone, instituicao, materia } = req.body;
  const sql = `UPDATE usuario SET nome = ?, telefone = ?, instituicao = ?, materia = ? WHERE id = ?`;
  db.query(sql, [nome, telefone, instituicao, materia, req.usuario.id], (err) => {
    if (err) return res.status(500).json({ erro: 'Erro ao atualizar perfil.' });
    res.json({ mensagem: 'Perfil atualizado com sucesso!' });
  });
});

// ========================
// ROTAS PROTEGIDAS — ADMIN
// ========================

// Listar professores por status
app.get('/admin/professores', autenticar, apenasAdmin, (req, res) => {
  const { status } = req.query;
  const sql = `
    SELECT id, nome, email, status, criado_em
    FROM usuario
    WHERE tipo_usuario = 'professor' AND status = ?
    ORDER BY criado_em DESC
  `;
  db.query(sql, [status || 'pendente'], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar professores.' });
    res.json(results);
  });
});

// Aprovar professor
app.put('/admin/professor/:id/aprovar', autenticar, apenasAdmin, (req, res) => {
  db.query(
    `UPDATE usuario SET status = 'aprovado' WHERE id = ? AND tipo_usuario = 'professor'`,
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ erro: 'Erro ao aprovar professor.' });
      res.json({ mensagem: 'Professor aprovado com sucesso!' });
    }
  );
});

// Rejeitar professor
app.put('/admin/professor/:id/rejeitar', autenticar, apenasAdmin, (req, res) => {
  db.query(
    `UPDATE usuario SET status = 'rejeitado' WHERE id = ? AND tipo_usuario = 'professor'`,
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ erro: 'Erro ao rejeitar professor.' });
      res.json({ mensagem: 'Professor rejeitado.' });
    }
  );
});


// ========================
// ROTAS PROTEGIDAS — ALUNO
// ========================

// Buscar alunos da sala para login
app.get('/sala/:id/alunos', (req, res) => {
  const sql = `
    SELECT id, nome_aluno, pontos, ultimo_acesso
    FROM aluno_sala
    WHERE sala_id = ?
    ORDER BY nome_aluno ASC
  `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar alunos.' });
    res.json(results);
  });
});

// Cadastrar aluno com PIN
app.post('/aluno/cadastrar', (req, res) => {
  const { nome_aluno, sala_id, pin } = req.body;
  if (!nome_aluno || !sala_id || !pin)
    return res.status(400).json({ erro: 'Dados incompletos.' });

  const sql = `INSERT INTO aluno_sala (nome_aluno, sala_id, pin) VALUES (?, ?, ?)`;
  db.query(sql, [nome_aluno, sala_id, pin], (err, result) => {
    if (err) return res.status(500).json({ erro: 'Erro ao cadastrar aluno.' });
    res.status(201).json({ mensagem: 'Aluno cadastrado!', id: result.insertId });
  });
});

// Login do aluno com PIN
app.post('/aluno/login', (req, res) => {
  const { aluno_id, pin } = req.body;
  const sql = `
    SELECT id, nome_aluno, sala_id, pontos
    FROM aluno_sala
    WHERE id = ? AND pin = ?
  `;
  db.query(sql, [aluno_id, pin], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao fazer login.' });
    if (results.length === 0)
      return res.status(401).json({ erro: 'PIN incorreto!' });

    // Atualiza último acesso
    db.query(`UPDATE aluno_sala SET ultimo_acesso = NOW() WHERE id = ?`, [aluno_id]);

    res.json({ mensagem: 'Login realizado!', aluno: results[0] });
  });
});

// ========================
// ROTAS DE ATIVIDADES
// ========================

// Salvar atividade (professor)
app.post('/professor/atividade', autenticar, (req, res) => {
  const { titulo, tipo, sala_id, conteudo } = req.body;
  const professorId = req.usuario.id;

  if (!titulo || !tipo || !sala_id || !conteudo)
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });

  const sql = `
    INSERT INTO atividade (titulo, tipo, sala_id, professor_id, conteudo)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [titulo, tipo, sala_id, professorId, JSON.stringify(conteudo)], (err, result) => {
    if (err) return res.status(500).json({ erro: 'Erro ao salvar atividade.' });
    res.status(201).json({ mensagem: 'Atividade salva com sucesso!', id: result.insertId });
  });
});

// Buscar atividades de uma sala (aluno)
app.get('/sala/:salaId/atividades', (req, res) => {
  const sql = `
    SELECT id, titulo, tipo, criado_em
    FROM atividade
    WHERE sala_id = ?
    ORDER BY criado_em DESC
  `;
  db.query(sql, [req.params.salaId], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar atividades.' });
    res.json(results);
  });
});

// Buscar atividade completa (aluno responder)
app.get('/atividade/:id', (req, res) => {
  const sql = `SELECT * FROM atividade WHERE id = ?`;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar atividade.' });
    if (results.length === 0) return res.status(404).json({ erro: 'Atividade não encontrada.' });
    const atv = results[0];
    try {
      atv.conteudo = typeof atv.conteudo === 'string' 
        ? JSON.parse(atv.conteudo) 
        : atv.conteudo;
    } catch {
      // já é objeto, deixa como está
    }
    res.json(atv);
  });
});

// Salvar resposta do aluno
app.post('/atividade/:id/resposta', (req, res) => {
  const { nome_aluno, sala_id, resposta } = req.body;

  if (!nome_aluno || !sala_id || !resposta)
    return res.status(400).json({ erro: 'Dados incompletos.' });

  const sql = `
    INSERT INTO resposta_aluno (atividade_id, nome_aluno, sala_id, resposta)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [req.params.id, nome_aluno, sala_id, JSON.stringify(resposta)], (err, result) => {
    if (err) return res.status(500).json({ erro: 'Erro ao salvar resposta.' });
    res.status(201).json({ mensagem: 'Resposta enviada com sucesso!', id: result.insertId });
  });
});

// Relatório — professor vê todas as respostas de uma atividade
app.get('/professor/atividade/:id/respostas', autenticar, (req, res) => {
  const sql = `
    SELECT r.id, r.nome_aluno, r.resposta, r.nota, r.corrigido, r.criado_em,
           s.nome AS nome_sala, s.serie, s.materia
    FROM resposta_aluno r
    JOIN sala s ON r.sala_id = s.id
    WHERE r.atividade_id = ?
    ORDER BY r.criado_em DESC
  `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar respostas.' });
    results.forEach(r => {
      try {
        r.resposta = typeof r.resposta === 'string'
          ? JSON.parse(r.resposta)
          : r.resposta;
      } catch {
      }
    });
    res.json(results);
  });
});

// Buscar todas as atividades do professor com contagem de respostas
app.get('/professor/atividades', autenticar, (req, res) => {
  const sql = `
    SELECT a.id, a.titulo, a.tipo, a.criado_em,
           s.nome AS nome_sala, s.serie, s.materia,
           COUNT(r.id) AS total_respostas
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

// Upload da imagem (professor)
app.post('/professor/pintura/upload', autenticar, upload.single('imagem'), (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
  const url = `http://localhost:3001/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// Salvar resposta da pintura (aluno)
app.post('/atividade/:id/resposta/pintura', upload.single('pintura'), (req, res) => {
  const { nome_aluno, sala_id } = req.body;

  if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
  if (!nome_aluno || !sala_id) return res.status(400).json({ erro: 'Dados incompletos.' });

  const url = `http://localhost:3001/uploads/${req.file.filename}`;

  const sql = `
    INSERT INTO resposta_aluno (atividade_id, nome_aluno, sala_id, resposta)
    VALUES (?, ?, ?, ?)
  `;

  const resposta = JSON.stringify({ url_pintura: url, filename: req.file.filename });

  db.query(sql, [req.params.id, nome_aluno, sala_id, resposta], (err, result) => {
    if (err) return res.status(500).json({ erro: 'Erro ao salvar pintura.' });
    res.status(201).json({ mensagem: 'Pintura enviada!', url, id: result.insertId });
  });
});

// ========================
// INICIAR SERVIDOR
// ========================
app.listen(3001, () => console.log('🚀 Server rodando na porta 3001'));