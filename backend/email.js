/* ==========================================================================
   ENVIO DE E-MAIL

   Usado para confirmar o acesso do professor num aparelho novo: chega um
   código de 6 dígitos no e-mail dele.

   A conta de envio fica em variáveis de ambiente (nunca no código):

     SMTP_HOST=smtp.hostinger.com
     SMTP_PORT=465
     SMTP_USER=naoresponda@sabermaisedu.com
     SMTP_PASS=a senha dessa caixa
     SMTP_FROM=Saber+ <naoresponda@sabermaisedu.com>   (opcional)

   Sem essas variáveis o servidor continua funcionando: o código aparece no
   log do servidor (só no ambiente de desenvolvimento) e nunca na tela.
   ========================================================================== */
const nodemailer = require('nodemailer');

let transporte = null;

function configurado() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function pegarTransporte() {
  if (transporte || !configurado()) return transporte;
  const porta = Number(process.env.SMTP_PORT) || 465;
  transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: porta,
    secure: porta === 465,              
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporte;
}

const remetente = () => process.env.SMTP_FROM || `Saber+ <${process.env.SMTP_USER}>`;

function corpoDoCodigo(nome, codigo, aparelho) {
  const texto =
`Olá, ${nome}!

Alguém entrou na sua conta do Saber+ em um aparelho novo.
Seu código de confirmação é: ${codigo}

O código vale por 10 minutos.
Se não foi você, ignore este e-mail e troque sua senha do Saber+.

Aparelho: ${aparelho}`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#2A4A6A">
    <p style="font-size:22px;font-weight:bold;margin:0 0 4px">
      <span style="color:#F5812A">Saber</span><span style="color:#1A6FC4">+</span>
    </p>
    <p>Olá, ${nome}! Alguém entrou na sua conta em um aparelho novo.</p>
    <p style="margin:24px 0;text-align:center">
      <span style="display:inline-block;background:#F4F9FD;border:2px solid #C8DFF0;border-radius:12px;
                   padding:14px 26px;font-size:30px;font-weight:bold;letter-spacing:8px">${codigo}</span>
    </p>
    <p>O código vale por <strong>10 minutos</strong>.</p>
    <p style="color:#7AAAC8;font-size:13px">Aparelho: ${aparelho}</p>
    <p style="color:#7AAAC8;font-size:13px">
      Se não foi você, ignore este e-mail e troque sua senha do Saber+.
    </p>
  </div>`;

  return { texto, html };
}

async function enviarCodigo({ para, nome, codigo, aparelho }) {
  const { texto, html } = corpoDoCodigo(nome || 'professor(a)', codigo, aparelho || 'não identificado');

  if (!configurado()) {
    // Ambiente de desenvolvimento: sem conta de e-mail configurada.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✉️  (sem SMTP) código de acesso para ${para}: ${codigo}`);
    } else {
      console.error('❌ SMTP não configurado: não consegui enviar o código de acesso.');
    }
    return { enviado: false };
  }

  await pegarTransporte().sendMail({
    from: remetente(),
    to: para,
    subject: `${codigo} é o seu código do Saber+`,
    text: texto,
    html,
  });
  return { enviado: true };
}

module.exports = { enviarCodigo, configurado };
