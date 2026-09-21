# Publicando o Saber+ na Hostinger (plano com Node.js)

O Saber+ sobe como **um app Node.js só**: o `backend/server.js` entrega a API **e** o site
(pasta `dist/`, gerada pelo `npm run build`). Site e API ficam no mesmo endereço, então não
precisa de subdomínio para a API nem de configurar CORS.

## 1. Banco de dados
1. No seu PC, exporte o banco local (MySQL Workbench → *Server → Data Export*, ou
   `mysqldump -u root -p NOME_DO_BANCO > saber_mais.sql`).
2. hPanel → **Bancos de dados → Gerenciamento** → crie banco + usuário + senha. Anote os três.
3. Clique em **phpMyAdmin** desse banco → aba **Importar** → envie o `saber_mais.sql`.
   (As tabelas de insígnias são criadas sozinhas quando o servidor liga.)

## 2. Código no GitHub
Confirme que o repositório está atualizado (`git add . && git commit && git push`).
O `.env` **não** vai para o GitHub (está no .gitignore) — os segredos entram no painel.

## 3. Criar o app
hPanel → **Sites → Adicionar site → App Web Node.js** → **Importar repositório Git** (conecte
o GitHub e escolha `saber-mais`). Configurações:

| Campo | Valor |
|---|---|
| Framework | Express (ou "Outro") |
| Versão do Node | 22 (ou 20) |
| Diretório raiz | `./` |
| Comando de build | `npm run build` |
| Arquivo de entrada / comando de início | `backend/server.js` (ou `npm start`) |

## 4. Variáveis de ambiente (mesmos nomes do `backend/.env`)
```
NODE_ENV=production
DB_HOST=localhost            (ou o host que o hPanel mostrar no banco)
DB_USER=u123456_saber        (o usuário criado no passo 1)
DB_PASS=********
DB_NAME=u123456_sabermais
JWT_SECRET=uma-frase-longa-e-nova
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=https://seudominio.com.br
```
**Não** coloque `PORT` (a Hostinger define sozinha). Clique em **Implantar/Deploy**.

## 5. Depois do deploy
- Abra o endereço: a tela inicial do Saber+ deve aparecer. No log do app deve ter
  `✅ MySQL conectado!` e `🌐 Site (pasta dist) sendo servido junto com a API`.
- **Login com Google**: Google Cloud Console → APIs e serviços → Credenciais → seu
  cliente OAuth → *Origens JavaScript autorizadas* → adicione `https://seudominio.com.br`.
- **SSL**: hPanel → Segurança → SSL → ativar (o app instalável no celular só aparece com HTTPS).
- Para atualizar o site depois: `git push` e "Implantar de novo" no painel.

## Problemas comuns
| Sintoma | Causa provável |
|---|---|
| "Erro ao conectar ao MySQL" no log | DB_HOST/DB_USER/DB_PASS/DB_NAME errados |
| Tela branca | O build falhou — veja o log de build |
| Login do Google não abre | Domínio não cadastrado no Google Cloud |
| Login normal diz "token inválido" | JWT_SECRET faltando |
| Imagens do V/F ou pintura não sobem | Variáveis CLOUDINARY_* faltando |
