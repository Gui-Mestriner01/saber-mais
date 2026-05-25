const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const rateLimit  = require('express-rate-limit');
const db         = require('./db');
require('dotenv').config();

const app = express();

// ========================
// SEGURANÇA
// ========================
app.use(helmet());

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

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
    SELECT s.id, s.nome, s.serie, s.materia, s.codigo, s.tema_senha,
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

// ========================
// ROTAS PROTEGIDAS — PROFESSOR
// ========================

// Criar Sala
app.post('/professor/sala', autenticar, (req, res) => {
  const { nome, serie, materia, codigo } = req.body;
  const professorId = req.usuario.id;

  if (!nome || !serie || !materia || !codigo)
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });

  const sql = `
    INSERT INTO sala (nome, serie, materia, codigo, professor_id, ano_letivo)
    VALUES (?, ?, ?, ?, ?, 2026)
  `;

  db.query(sql, [nome, serie, materia, codigo, professorId], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY')
        return res.status(409).json({ erro: 'Código de sala já existe.' });
      return res.status(500).json({ erro: 'Erro ao criar sala.' });
    }
    res.status(201).json({ mensagem: 'Sala criada com sucesso!', id: result.insertId, codigo });
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
// INICIAR SERVIDOR
// ========================
app.listen(3001, () => console.log('🚀 Server rodando na porta 3001'));