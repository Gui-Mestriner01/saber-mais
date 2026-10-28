/* Site atualizado (deploy novo) com a aba aberta: os arquivos antigos das
   telas somem. Estas duas funções reconhecem esse erro e recarregam a página
   uma vez só (usadas pelo ErroDeTela e pelo main.jsx). — 27/10/2026 */

const CHAVE = 'saberPlusRecarregouPorVersao';

export function ehErroDeVersao(erro) {
  const texto = String(erro?.message || erro || '');
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically|ChunkLoadError|Unable to preload CSS/i.test(texto);
}

/* Recarrega uma vez só por minuto, para não entrar em laço se o arquivo
   realmente não existir. */
export function recarregarParaVersaoNova() {
  try {
    const ultima = Number(sessionStorage.getItem(CHAVE) || 0);
    if (Date.now() - ultima < 60000) return false;
    sessionStorage.setItem(CHAVE, String(Date.now()));
  } catch { /* sem memória da aba: recarrega mesmo assim */ }
  window.location.reload();
  return true;
}
