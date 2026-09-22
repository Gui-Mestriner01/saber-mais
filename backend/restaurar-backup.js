/* ==========================================================================
   RESTAURAR UM BACKUP

   Uso (na pasta do projeto):
     node backend/restaurar-backup.js backend/backups/backup-2026-09-22.json.gz --confirmar

   O arquivo pode vir da pasta backend/backups ou ser baixado do Cloudinary
   (Media Library → pasta saber_plus_backups).

   ATENÇÃO: apaga o conteúdo atual de cada tabela que está no backup e coloca
   de volta o que foi salvo. Antes de mexer, ele faz um backup do estado atual
   (backup-antes-de-restaurar-...), então dá para desfazer.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const db = require('./db');
const { montarCopia } = require('./backup');

const arquivo = process.argv[2];
const confirmado = process.argv.includes('--confirmar');

if (!arquivo || !fs.existsSync(arquivo)) {
  console.log('Uso: node backend/restaurar-backup.js <arquivo.json.gz> --confirmar');
  process.exit(1);
}

const copia = JSON.parse(zlib.gunzipSync(fs.readFileSync(arquivo)).toString('utf8'));
const tabelas = Object.keys(copia.tabelas);
console.log(`Backup de ${copia.criado_em}:`);
tabelas.forEach(t => console.log(`  - ${t}: ${copia.tabelas[t].length} linhas`));

if (!confirmado) {
  console.log('\nNada foi alterado. Para restaurar de verdade, rode de novo com --confirmar');
  process.exit(0);
}

// Colunas JSON voltam do backup como objeto: viram texto de novo antes de gravar
const paraBanco = (v) => {
  if (v && typeof v === 'object') {
    if (v.type === 'Buffer' && Array.isArray(v.data)) return Buffer.from(v.data);
    return JSON.stringify(v);
  }
  return v;
};

(async () => {
  // Rede de segurança: guarda como está agora antes de sobrescrever
  const agora = await montarCopia();
  const seguro = path.join(__dirname, 'backups', `backup-antes-de-restaurar-${Date.now()}.json.gz`);
  fs.mkdirSync(path.dirname(seguro), { recursive: true });
  fs.writeFileSync(seguro, zlib.gzipSync(JSON.stringify(agora)));
  console.log(`\nEstado atual guardado em ${seguro}`);

  const conexao = await db.promise().getConnection();
  try {
    await conexao.query('SET FOREIGN_KEY_CHECKS = 0');
    await conexao.beginTransaction();
    for (const t of tabelas) {
      const linhas = copia.tabelas[t];
      await conexao.query('DELETE FROM ??', [t]);
      for (let i = 0; i < linhas.length; i += 200) {
        const lote = linhas.slice(i, i + 200);
        const colunas = Object.keys(lote[0]);
        const valores = lote.map(l => colunas.map(c => paraBanco(l[c])));
        await conexao.query('INSERT INTO ?? (??) VALUES ?', [t, colunas, valores]);
      }
      console.log(`  ✓ ${t}`);
    }
    await conexao.commit();
    console.log('\n✅ Backup restaurado.');
  } catch (e) {
    await conexao.rollback();
    console.error('\n❌ Deu erro e NADA foi alterado:', e.message);
    process.exitCode = 1;
  } finally {
    await conexao.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    conexao.release();
    db.end();
  }
})();
