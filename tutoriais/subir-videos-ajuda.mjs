/* Sobe os vídeos da Central de Ajuda para o Cloudinary.
   Roda na máquina do Gui, onde o CLOUDINARY_API_SECRET já está no .env.

   Uso:
     node tutoriais/subir-videos-ajuda.mjs <cloud_name> <api_key>

   Os vídeos vão para a pasta "saber-mais/ajuda" com o mesmo nome do arquivo,
   então regravar um vídeo e rodar de novo substitui o antigo, sem mexer no site. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
dotenv.config({ path: path.join(RAIZ, 'backend', '.env') });

const [nuvem, chave] = process.argv.slice(2);
const segredo = process.env.CLOUDINARY_API_SECRET;

if (!nuvem || !chave) {
  console.error('Faltou o cloud name ou a api key.\n  node tutoriais/subir-videos-ajuda.mjs <cloud_name> <api_key>');
  process.exit(1);
}
if (!segredo) {
  console.error('Não achei CLOUDINARY_API_SECRET em backend/.env');
  process.exit(1);
}

cloudinary.config({ cloud_name: nuvem, api_key: chave, api_secret: segredo, secure: true });

const videos = fs.readdirSync(AQUI).filter(f => f.endsWith('.mp4')).sort();
if (!videos.length) {
  console.error('Nenhum .mp4 na pasta tutoriais/');
  process.exit(1);
}

console.log(`Subindo ${videos.length} vídeos para ${nuvem}/saber-mais/ajuda …\n`);

let falhou = 0;
for (const arquivo of videos) {
  const nome = path.basename(arquivo, '.mp4');
  const caminho = path.join(AQUI, arquivo);
  const mb = (fs.statSync(caminho).size / 1048576).toFixed(1);
  process.stdout.write(`  ${nome.padEnd(32)} ${mb.padStart(5)} MB  … `);
  try {
    const r = await cloudinary.uploader.upload(caminho, {
      resource_type: 'video',
      folder: 'saber-mais/ajuda',
      public_id: nome,
      overwrite: true,
      invalidate: true,
    });
    console.log('ok', r.duration ? `(${Math.round(r.duration)}s)` : '');
  } catch (e) {
    falhou++;
    console.log('FALHOU —', e.message || e);
  }
}

console.log(falhou ? `\n${falhou} vídeo(s) não subiram.` : '\nTodos no ar.');
console.log(`\nColoque no .env da raiz:\n  VITE_CLOUDINARY_CLOUD=${nuvem}`);
