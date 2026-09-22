/* ==========================================================================
   BACKUP AUTOMÁTICO DO BANCO

   Mesmo com o sistema blindado, a regra de ouro é: se um dia o banco sumir
   (ataque, erro humano, problema na hospedagem), tem que dar para voltar.

   - Uma vez por dia o servidor copia TODAS as tabelas para um arquivo
     compactado (.json.gz).
   - A cópia vai para dois lugares:
       1. a pasta backend/backups (as 7 mais novas), que não é servida pelo site;
       2. o Cloudinary, como arquivo PRIVADO (as 30 mais novas). Fica fora da
          Hostinger: se o servidor inteiro cair, o backup continua existindo.
   - Um backup por dia (o nome é a data). Reiniciar o servidor não duplica.

   Para restaurar: node backend/restaurar-backup.js <arquivo.json.gz> --confirmar
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const cloudinary = require('cloudinary').v2;
const db = require('./db');

const PASTA = path.join(__dirname, 'backups');
const PASTA_NUVEM = 'saber_plus_backups';
const MANTER_LOCAL = 7;
const MANTER_NUVEM = 30;
const UM_DIA = 24 * 60 * 60 * 1000;

// dateStrings: as datas saem como "2026-09-22 10:30:00", do jeito que o banco aceita de volta
const consulta = (sql, params = []) =>
  new Promise((ok, falha) => db.query({ sql, values: params, dateStrings: true }, (e, r) => (e ? falha(e) : ok(r))));

const hoje = () => new Date().toISOString().slice(0, 10);   // 2026-09-22

const cloudinaryLigado = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

async function montarCopia() {
  const tabelas = (await consulta('SHOW TABLES')).map(l => Object.values(l)[0]);
  const copia = { criado_em: new Date().toISOString(), banco: process.env.DB_NAME, tabelas: {} };
  for (const t of tabelas) {
    copia.tabelas[t] = await consulta('SELECT * FROM ??', [t]);
  }
  return copia;
}

function limparLocais() {
  const arquivos = fs.readdirSync(PASTA).filter(a => /^backup-\d{4}-\d{2}-\d{2}\.json\.gz$/.test(a)).sort();
  arquivos.slice(0, Math.max(0, arquivos.length - MANTER_LOCAL))
    .forEach(a => fs.unlinkSync(path.join(PASTA, a)));
}

function enviarParaNuvem(caminho, nome) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary.uploader.upload(caminho, {
    resource_type: 'raw',
    type: 'private',                 // só abre com a chave da conta
    folder: PASTA_NUVEM,
    public_id: `${nome}.json.gz`,
    overwrite: true,
  });
}

async function limparNuvem() {
  const r = await cloudinary.api.resources({
    resource_type: 'raw', type: 'private', prefix: `${PASTA_NUVEM}/`, max_results: 100,
  });
  const velhos = r.resources
    .map(x => x.public_id)
    .sort()
    .slice(0, Math.max(0, r.resources.length - MANTER_NUVEM));
  if (velhos.length) await cloudinary.api.delete_resources(velhos, { resource_type: 'raw', type: 'private' });
}

async function fazerBackup({ forcar = false } = {}) {
  fs.mkdirSync(PASTA, { recursive: true });
  const nome = `backup-${hoje()}`;
  const caminho = path.join(PASTA, `${nome}.json.gz`);
  if (!forcar && fs.existsSync(caminho)) return { pulado: true, caminho };

  const copia = await montarCopia();
  fs.writeFileSync(caminho, zlib.gzipSync(JSON.stringify(copia)));
  limparLocais();

  let nuvem = false;
  if (cloudinaryLigado()) {
    try {
      await enviarParaNuvem(caminho, nome);
      await limparNuvem();
      nuvem = true;
    } catch (e) {
      console.error('⚠️ Backup salvo só no servidor (Cloudinary falhou):', e.message);
    }
  }
  const linhas = Object.values(copia.tabelas).reduce((n, t) => n + t.length, 0);
  console.log(`💾 Backup ${nome}: ${Object.keys(copia.tabelas).length} tabelas, ${linhas} linhas${nuvem ? ' (+ cópia no Cloudinary)' : ''}`);
  return { caminho, nuvem, linhas };
}

function ligarBackupAutomatico() {
  const rodar = () => fazerBackup().catch(e => console.error('❌ Backup falhou:', e.message));
  setTimeout(rodar, 60 * 1000);          // 1 minuto depois de ligar
  setInterval(rodar, 60 * 60 * 1000);    // confere de hora em hora; só grava 1 por dia
}

module.exports = { fazerBackup, ligarBackupAutomatico, montarCopia, UM_DIA };
