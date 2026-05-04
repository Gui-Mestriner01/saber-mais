const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.listen(3001, () => console.log('Server rodando na porta 3001'));