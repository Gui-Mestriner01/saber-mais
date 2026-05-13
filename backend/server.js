const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/cadastro/aluno', (req, res) => {
    const { nome, email, login, senha } = req.body;

    if (!nome || !email || !login || !senha)
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });

    const sqlUsuario = `
        INSERT INTO usuario (nome, email, login, senha, tipo_usuario)
        VALUES (?, ?, ?, ?, 'aluno')
    `;

    db.query(sqlUsuario, [nome, email, login, senha], (err, result) => {
        if (err) {
        if (err.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ erro: 'Email ou login já cadastrado.' });
        return res.status(500).json({ erro: 'Erro ao cadastrar aluno.' });
    }
        res.status(201).json({ mensagem: 'Aluno cadastrado com sucesso!', id: result.insertId });
    });
});

// Cadastro de Professor
app.post('/cadastro/professor', (req, res) => {
    const { nome, email, login, senha, especialidade } = req.body;

    if (!nome || !email || !login || !senha)
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });

    const sqlUsuario = `
        INSERT INTO usuario (nome, email, login, senha, tipo_usuario)
        VALUES (?, ?, ?, ?, 'professor')
    `;

    db.query(sqlUsuario, [nome, email, login, senha], (err, result) => {
        if (err) {
        if (err.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ erro: 'Email ou login já cadastrado.' });
        return res.status(500).json({ erro: 'Erro ao cadastrar professor.' });
        }

        const usuarioId = result.insertId;
        const sqlProfessor = `INSERT INTO professor (usuario_id, especialidade) VALUES (?, ?)`;

    db.query(sqlProfessor, [usuarioId, especialidade || null], (err2) => {
        if (err2)
            return res.status(500).json({ erro: 'Erro ao salvar dados do professor.' });
        res.status(201).json({ mensagem: 'Professor cadastrado com sucesso!', id: usuarioId });
        });
    });
});

app.listen(3001, () => console.log('Server rodando na porta 3001'));