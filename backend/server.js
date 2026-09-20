const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const db = require('./db');
require('dotenv').config();

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
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
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

const app = express();

// --- CRIAÇÃO DO SERVIDOR COM SUPORTE A TEMPO REAL ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', process.env.FRONTEND_URL], // Permite o React conectar no Socket
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});
// ---------------------------------------------------

app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.use('/uploads', express.static(uploadDir));

const origensPermitidas = [
  'http://localhost:5173',
  process.env.FRONTEND_URL 
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origensPermitidas.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Acesso bloqueado pela política de CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { erro: 'Muitas tentativas. Tente novamente em 15 minutos.' }
});

/* ==========================================================================
   3. MIDDLEWARES DE AUTENTICAÇÃO E AUTORIZAÇÃO
   ========================================================================== */

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
    const sql = `INSERT INTO usuario (nome, email, senha, tipo_usuario, status) VALUES (?, ?, ?, 'professor', 'pendente')`;

    db.query(sql, [nome, email.toLowerCase(), senhaCriptografada], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'E-mail já cadastrado.' });
        return res.status(500).json({ erro: 'Erro ao cadastrar professor.' });
      }
      res.status(201).json({ mensagem: 'Cadastro realizado! Aguarde a aprovação do administrador.', id: result.insertId });
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
      if (usuario.status === 'pendente') return res.status(403).json({ erro: 'Seu cadastro ainda está aguardando aprovação.' });
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

app.post('/login/google', async (req, res) => {
  const { email, nome, tipo, fotoUrl } = req.body;

  if (!email) return res.status(400).json({ erro: "Email não fornecido." });

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

app.post('/aluno/cadastrar', (req, res) => {
  const { nome_aluno, sala_id, pin } = req.body;
  if (!nome_aluno || !sala_id || !pin) return res.status(400).json({ erro: 'Dados incompletos.' });

  const sql = `INSERT INTO aluno_sala (nome_aluno, sala_id, pin) VALUES (?, ?, ?)`;
  db.query(sql, [nome_aluno, sala_id, pin], (err, result) => {
    if (err) return res.status(500).json({ erro: 'Erro ao cadastrar aluno.' });
    res.status(201).json({ mensagem: 'Aluno cadastrado!', id: result.insertId });
  });
});

app.post('/aluno/login', (req, res) => {
  const { aluno_id, pin } = req.body;

  // O JOIN traz o status da sala: quem está em sala encerrada não entra
  const sql = `
    SELECT al.id, al.nome_aluno, al.sala_id, al.pontos, s.status AS status_sala, s.nome AS nome_sala
    FROM aluno_sala al
    JOIN sala s ON al.sala_id = s.id
    WHERE al.id = ? AND al.pin = ?
  `;

  db.query(sql, [aluno_id, pin], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao fazer login.' });
    if (results.length === 0) return res.status(401).json({ erro: 'PIN incorreto!' });

    const aluno = results[0];

    if (aluno.status_sala === 'encerrada') {
      return res.status(403).json({
        erro: `A sala "${aluno.nome_sala}" foi encerrada pelo professor. Fale com ele para reabrir.`
      });
    }

    db.query(`UPDATE aluno_sala SET ultimo_acesso = NOW() WHERE id = ?`, [aluno_id]);

    delete aluno.status_sala;
    delete aluno.nome_sala;
    res.json({ mensagem: 'Login realizado!', aluno });
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
    dataExpiracao.setHours(dataExpiracao.getHours() + 10);
    
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
    SELECT s.id, s.nome, s.serie, s.materia, s.codigo, s.senha_emojis, s.tema_senha,
           s.tipo_sala, s.status, u.nome AS professor
    FROM sala s
    JOIN usuario u ON s.professor_id = u.id
    WHERE s.status IS NULL OR s.status <> 'encerrada'
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
    res.json(results);
  });
});

app.put('/professor/sala/:id/reativar', autenticar, (req, res) => {
  const sql = `UPDATE sala SET status = 'ativa' WHERE id = ? AND professor_id = ?`;
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

app.post('/aluno/entrar-sala', (req, res) => {
  const { nome_aluno, sala_id } = req.body;
  if (!nome_aluno || !sala_id) return res.status(400).json({ erro: 'Dados incompletos.' });
  
  db.query(`SELECT status, nome FROM sala WHERE id = ?`, [sala_id], (errSala, salas) => {
    if (errSala) return res.status(500).json({ erro: 'Erro ao verificar a sala.' });
    if (salas.length === 0) return res.status(404).json({ erro: 'Sala não encontrada.' });

    if (salas[0].status === 'encerrada') {
      return res.status(403).json({ erro: `A sala "${salas[0].nome}" está encerrada.` });
    }

    const sql = `INSERT INTO aluno_sala (nome_aluno, sala_id) VALUES (?, ?)`;
    db.query(sql, [nome_aluno, sala_id], (err) => {
      if (err) return res.status(500).json({ erro: 'Erro ao registrar aluno.' });
      res.status(201).json({ mensagem: 'Aluno registrado!' });
    });
  });
});

app.get('/sala/:id/alunos', (req, res) => {
  const sql = `SELECT id, nome_aluno, pontos, ultimo_acesso FROM aluno_sala WHERE sala_id = ? ORDER BY nome_aluno ASC`;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar alunos.' });
    res.json(results);
  });
});

app.get('/professor/sala/:id/alunos', autenticar, (req, res) => {
  const sql = `SELECT id, nome_aluno, entrou_em FROM aluno_sala WHERE sala_id = ? ORDER BY entrou_em DESC`;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar alunos.' });
    res.json(results);
  });
});

app.delete('/professor/sala/:idSala/aluno/:idAluno', autenticar, (req, res) => {
  const sql = `DELETE FROM aluno_sala WHERE sala_id = ? AND id = ?`;
  db.query(sql, [req.params.idSala, req.params.idAluno], (err, result) => {
    if (err) return res.status(500).json({ erro: 'Erro ao excluir aluno.' });
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Aluno não encontrado.' });
    res.json({ mensagem: 'Aluno removido com sucesso!' });
  });
});

/* ==========================================================================
   7. ROTAS DE ATIVIDADES (CRIAÇÃO, LISTAGEM E CLONAGEM)
   ========================================================================== */

app.post('/professor/atividade', autenticar, (req, res) => {
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

app.post('/professor/atividades/v_f', autenticar, upload.any(), async (req, res) => {
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

app.get('/sala/:salaId/atividades', (req, res) => {
  const salaId = req.params.salaId;
  const aluno = req.query.aluno || ''; 

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
  const sql = `SELECT * FROM atividade WHERE id = ?`;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar atividade.' });
    if (results.length === 0) return res.status(404).json({ erro: 'Atividade não encontrada.' });
    
    const atv = results[0];
    try {
      atv.conteudo = typeof atv.conteudo === 'string' ? JSON.parse(atv.conteudo) : atv.conteudo;
    } catch { }
    
    res.json(atv);
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

app.post('/professor/atividade/:id/clonar', autenticar, (req, res) => {
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

app.post('/atividade/:id/resposta', (req, res) => {
  const { nome_aluno, sala_id, resposta, pontos = 50 } = req.body;

  // nome_aluno e resposta são obrigatórios; sala_id pode ser null (aluno convidado/Live)
  if (!nome_aluno || !resposta) return res.status(400).json({ erro: 'Dados incompletos.' });

  const sqlInsert = `INSERT INTO resposta_aluno (atividade_id, nome_aluno, sala_id, resposta) VALUES (?, ?, ?, ?)`;

  db.query(sqlInsert, [req.params.id, nome_aluno, sala_id || null, JSON.stringify(resposta)], (err, result) => {
    if (err) return res.status(500).json({ erro: 'Erro ao salvar resposta.' });

    // Só atualiza pontos se o aluno tiver uma sala_id válida (aluno cadastrado)
    if (sala_id) {
      const sqlUpdatePontos = `UPDATE aluno_sala SET pontos = pontos + ? WHERE nome_aluno = ? AND sala_id = ?`;
      db.query(sqlUpdatePontos, [pontos, nome_aluno, sala_id], (errUpdate) => {
        if (errUpdate) console.error("Erro ao dar pontos ao aluno:", errUpdate);
      });
    }

    res.status(201).json({ mensagem: 'Resposta enviada com sucesso!', id: result.insertId });
  });
});

app.get('/professor/atividade/:id/respostas', autenticar, (req, res) => {
  const sql = `
    SELECT r.id, r.nome_aluno, r.resposta, r.nota, r.corrigido, r.criado_em, s.nome AS nome_sala, s.serie, s.materia
    FROM resposta_aluno r
    JOIN sala s ON r.sala_id = s.id
    WHERE r.atividade_id = ?
    ORDER BY r.criado_em DESC
  `;
  db.query(sql, [req.params.id], (err, results) => {
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

app.post('/atividade/:id/resposta/pintura', upload.single('pintura'), async (req, res) => {
  const { nome_aluno, sala_id, pontos = 50 } = req.body;

  if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
  if (!nome_aluno || !sala_id) return res.status(400).json({ erro: 'Dados incompletos.' });

  try {
    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'saber_plus/respostas_alunos' });
    fs.unlinkSync(req.file.path);
    const urlNuvem = result.secure_url;

    const sqlInsert = `INSERT INTO resposta_aluno (atividade_id, nome_aluno, sala_id, resposta) VALUES (?, ?, ?, ?)`;
    const resposta = JSON.stringify({ url_pintura: urlNuvem, filename: result.public_id });

    db.query(sqlInsert, [req.params.id, nome_aluno, sala_id, resposta], (err, bdResult) => {
      if (err) return res.status(500).json({ erro: 'Erro ao salvar pintura no banco de dados.' });
      
      const sqlUpdatePontos = `UPDATE aluno_sala SET pontos = pontos + ? WHERE nome_aluno = ? AND sala_id = ?`;
      db.query(sqlUpdatePontos, [pontos, nome_aluno, sala_id], (errUpdate) => {
         if (errUpdate) console.error("Erro ao dar pontos na pintura:", errUpdate);
         
         res.status(201).json({ mensagem: 'Pintura enviada e pontos adicionados!', url: urlNuvem, id: bdResult.insertId });
      });
    });
  } catch (error) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ erro: 'Erro ao processar pintura na nuvem.' });
  }
});

/* ==========================================================================
   10. CENTRAL DO SOCKET.IO E DO RADAR (LONG POLLING / HTTP)
   ========================================================================== */

// 🧠 "Caderninho de memória" do servidor para guardar as atividades que estão rolando
const salasAoVivo = {};

io.on('connection', (socket) => {
  console.log('🟢 Um usuário conectou:', socket.id);

  // Quando o aluno ou professor entrar na sala temporária
  socket.on('entrar_sala', (codigoSala, dadosAluno) => {
    socket.join(codigoSala);
    
    if (dadosAluno) {
      console.log(`👤 Aluno entrou na sala [${codigoSala}]:`, dadosAluno.nome);
      socket.to(codigoSala).emit('novo_aluno_entrou', dadosAluno);
      
      // 👇 Verifica se a aula já tinha começado (caso dê F5)
      if (salasAoVivo[codigoSala]) {
        console.log(`⚡ A sala ${codigoSala} já está ao vivo! Mandando o aluno direto pra atividade.`);
        socket.emit('atividade_iniciada', salasAoVivo[codigoSala]);
      }
    } else {
      console.log(`👨‍🏫 Professor entrou na sala [${codigoSala}]`);
    }
  });

  // Quando o professor clica em Lançar Atividade (Via Socket)
  socket.on('iniciar_atividade_live', (dados) => {
    console.log(`🚀 Iniciando atividade na sala ${dados.codigoSala} no modo ${dados.modo}`);
    salasAoVivo[dados.codigoSala] = dados;
    io.to(dados.codigoSala).emit('atividade_iniciada', dados);
  });

  // Quando o professor encerra a sala
  socket.on('encerrar_sala_live', (codigoSala) => {
    delete salasAoVivo[codigoSala];
    io.to(codigoSala).emit('sala_encerrada');
  });

  socket.on('disconnect', () => {
    console.log('🔴 Usuário desconectou:', socket.id);
  });
}); 

// 📡 PLANO B: Rota do Radar Automático para os Alunos (Fora do io.on)
app.get('/sala/:codigo/status-live', (req, res) => {
  const codigo = String(req.params.codigo).trim().toUpperCase();

  if (salasAoVivo[codigo]) {
    res.json({ iniciou: true, dadosDaLive: salasAoVivo[codigo] });
  } else {
    res.json({ iniciou: false });
  }
});

// 📡 PLANO C: Rota HTTP para o Professor iniciar a live à prova de falhas
app.post('/professor/iniciar-live-http', (req, res) => {
  const dados = req.body;
  const codigo = String(dados.codigoSala).trim().toUpperCase();
  
  salasAoVivo[codigo] = dados;
  console.log(`🚀 [HTTP] Professor lançou a atividade na sala ${codigo}!`);
  res.json({ sucesso: true });
});

/* ==========================================================================
   11. INICIAR SERVIDOR
   ========================================================================== */

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Servidor HTTP e Socket.io rodando na porta ${PORT}`));

