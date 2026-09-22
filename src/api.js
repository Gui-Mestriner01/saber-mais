/* ==========================================================================
   ENDEREÇO DO BACKEND

   Antes cada tela tinha "http://localhost:3001" escrito na mão. Isso só
   funciona no próprio computador: no celular, "localhost" é o celular.

   Agora o endereço segue o da página. Abriu o site em
   http://192.168.0.15:5173 → a API vira http://192.168.0.15:3001.
   No computador continua http://localhost:3001, como sempre.

   Publicado (npm run build), o site e a API ficam no MESMO endereço
   (o server.js entrega os dois), então a API é a própria origem da página.
   Se um dia o backend for para outro domínio, crie no .env do front:
   VITE_API_URL=https://api.meusite.com
   ========================================================================== */
export const API =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001` // npm run dev: backend na porta 3001
    : window.location.origin);                                          // publicado: site e API no mesmo endereço

/* ==========================================================================
   CRACHÁS (tokens) — quem é quem para o servidor

   - Professor: `token` no localStorage (como sempre).
   - Aluno: o servidor entrega um crachá quando ele acerta o PIN. Ele fica no
     sessionStorage: é só daquela aba e some quando a aba fecha — bom para
     computador de escola, que muita criança usa.
   - Acesso à sala: crachá curto que o aluno ganha ao acertar a senha de
     emojis. Serve só para escolher o nome / digitar o PIN / entrar na sala
     temporária.
   ========================================================================== */
const guardar = (chave, valor) => {
  try { valor ? sessionStorage.setItem(chave, valor) : sessionStorage.removeItem(chave); } catch { /* sem memória */ }
};
const ler = (chave) => {
  try { return sessionStorage.getItem(chave); } catch { return null; }
};

export const salvarTokenAluno = (token) => guardar('saberPlusTokenAluno', token);
export const tokenAluno = () => ler('saberPlusTokenAluno');

export const salvarAcessoSala = (salaId, token) => guardar(`saberPlusAcessoSala_${salaId}`, token);
export const acessoSala = (salaId) => ler(`saberPlusAcessoSala_${salaId}`);

export const sairAluno = () => {
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith('saberPlusTokenAluno') || k.startsWith('saberPlusAcessoSala_'))
      .forEach(k => sessionStorage.removeItem(k));
  } catch { /* nada a limpar */ }
};

// Cabeçalho com o crachá. `token` explícito ganha do guardado.
export const comToken = (token, extra = {}) => (token ? { ...extra, Authorization: `Bearer ${token}` } : extra);
export const cabecalhoAluno = (extra = {}) => comToken(tokenAluno(), extra);
export const cabecalhoProfessor = (extra = {}) => comToken(localStorage.getItem('token'), extra);
