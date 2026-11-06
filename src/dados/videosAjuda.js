/* ==========================================================================
   OS VÍDEOS DA CENTRAL DE AJUDA

   Os arquivos não ficam no servidor do site: estão no Cloudinary, a mesma
   conta que já guarda as imagens das pinturas. Assim a Hostinger não gasta
   banda toda vez que uma professora abre a ajuda.

   Para trocar um vídeo, suba o novo no Cloudinary com o mesmo "arquivo"
   (public_id) e pronto — aqui não precisa mexer. Para gravar de novo depois
   de mudar a interface, veja os roteiros em tutoriais/tut-*.mjs.
   ========================================================================== */

const NUVEM = import.meta.env.VITE_CLOUDINARY_CLOUD || 'oawhotar';
const PASTA = 'saber-mais/ajuda';

/* Enquanto o nome da conta do Cloudinary não estiver preenchido, os vídeos
   não têm de onde vir. Nesse caso o botão "Ajuda" do menu nem aparece — é
   melhor não mostrar a central do que mostrar uma central vazia. */
export const AJUDA_PRONTA = NUVEM !== 'SEU_CLOUD_NAME';

/* O Cloudinary entrega a capa do vídeo trocando a extensão por .jpg,
   então não precisamos subir imagem nenhuma. */
export const enderecoDoVideo = (arquivo) =>
  `https://res.cloudinary.com/${NUVEM}/video/upload/f_auto,q_auto/${PASTA}/${arquivo}.mp4`;

export const capaDoVideo = (arquivo) =>
  `https://res.cloudinary.com/${NUVEM}/video/upload/so_6,w_640,c_fill,q_auto/${PASTA}/${arquivo}.jpg`;

/* A ordem aqui é a ordem da tela: é também a ordem em que faz sentido
   assistir, do primeiro dia de uso até o dia a dia. */
export const VIDEOS_AJUDA = [
  {
    arquivo: '9-conta-e-senha',
    titulo: 'Criar a sua conta',
    duracao: '2:22',
    para: 'professor',
    quando: 'No primeiro dia',
    resumo: 'Como abrir a sua conta de professora. E, se um dia a senha fugir da cabeça, como criar outra pelo e-mail — sem depender de ninguém.',
    topicos: [
      'Preencher nome, e-mail e senha',
      'O Saber+ já entra direto, sem pedir a senha de novo',
      'O botão "Esqueci minha senha"',
      'O link que chega no e-mail e vale por 1 hora',
    ],
  },
  {
    arquivo: '1-criar-sala',
    titulo: 'Criar a sua primeira sala',
    duracao: '2:05',
    para: 'professor',
    quando: 'No primeiro dia',
    resumo: 'A sala é o espaço da sua turma dentro do Saber+. É dela que saem o código e a senha de emojis que as crianças usam para entrar.',
    topicos: [
      'Sala permanente (o ano todo) ou temporária (uma aula só)',
      'Nome, série e matéria',
      'Onde ficam o código e a senha de emojis',
      'Ver quem já entrou e trocar o PIN de um aluno',
    ],
  },
  {
    arquivo: '2-criar-atividade',
    titulo: 'Criar uma atividade',
    duracao: '1:57',
    para: 'professor',
    quando: 'Antes da aula',
    resumo: 'Montar um quiz do zero: a pergunta, as alternativas, qual é a certa e até quando a turma pode responder.',
    topicos: [
      'Escolher a sala e o tipo de atividade',
      'Escrever a pergunta e as alternativas',
      'Marcar a resposta certa no círculo',
      'Escolher o prazo para entregar',
    ],
  },
  {
    arquivo: '7-tipos-de-atividade',
    titulo: 'Os tipos de atividade',
    duracao: '1:33',
    para: 'professor',
    quando: 'Antes da aula',
    resumo: 'Quiz, ligar, pintura, memória, ordenar e grupos: o que cada um pede da criança, para você variar a aula e enxergar melhor quem aprendeu.',
    topicos: [
      'Quiz: múltipla escolha, verdadeiro ou falso e puzzle',
      'Ligar correspondentes e Separar em grupos',
      'Pintar cenário e Jogo da memória',
      'Colocar em ordem',
    ],
  },
  {
    arquivo: '6-pintura-computador',
    titulo: 'Atividade de pintura, do começo ao fim',
    duracao: '4:37',
    para: 'professor',
    quando: 'Antes da aula',
    resumo: 'A preferida dos pequenos. Você sobe um desenho, a criança pinta na tela, e o desenho pronto volta para você — dá até para imprimir e colar no mural.',
    topicos: [
      'Subir o desenho e escrever a instrução',
      'Como a criança pinta, troca de cor e apaga',
      'Ver a entrega e abrir em tela cheia',
      'Baixar o desenho com o nome do aluno',
    ],
  },
  {
    arquivo: '8-biblioteca',
    titulo: 'Aproveitar atividades prontas',
    duracao: '1:22',
    para: 'professor',
    quando: 'Quando faltar tempo',
    resumo: 'Nem sempre dá tempo de montar tudo do zero. Na biblioteca ficam as atividades que outros professores deixaram públicas — é só trazer para a sua sala.',
    topicos: [
      'Procurar pelo assunto da aula',
      '"Usar na minha sala": traz pronta',
      '"Adaptar": abre no editor para você mudar',
      'Deixar a sua atividade pública e ajudar os outros',
    ],
  },
  {
    arquivo: '4-relatorios',
    titulo: 'Ver como a turma foi',
    duracao: '1:45',
    para: 'professor',
    quando: 'Depois da aula',
    resumo: 'Quantos fizeram, quantos faltam, quem são eles e qual pergunta deu mais trabalho. É aqui que você descobre o que precisa ser revisto.',
    topicos: [
      '"3 de 8 alunos já fizeram" direto no cartão',
      'A lista de quem ainda não fez',
      'Item por item: a pergunta que a turma errou',
      'Nota automática, nota na mão e comentário',
    ],
  },
  {
    arquivo: '5-modo-ao-vivo',
    titulo: 'Aula ao vivo, a turma toda junta',
    duracao: '2:11',
    para: 'professor',
    quando: 'Durante a aula',
    resumo: 'Todo mundo responde na mesma hora, com placar na tela e pódio no fim. É o modo que as crianças pedem para repetir — e as notas vão sozinhas para os relatórios.',
    topicos: [
      'A tela de espera com o código e a senha para projetar',
      'Ver as crianças entrando uma a uma',
      'Começar a partida e passar as perguntas',
      'O pódio e as notas gravadas sozinhas',
    ],
  },
  {
    arquivo: '3-aluno-responde-celular',
    titulo: 'Como a criança entra, pelo celular',
    duracao: '2:05',
    para: 'aluno',
    quando: 'Para mostrar à turma',
    resumo: 'O caminho que a criança faz: digitar o código, tocar nos emojis, criar o PIN e responder. Nenhuma criança precisa de e-mail nem de senha escrita.',
    topicos: [
      'Digitar o código que está no quadro',
      'A senha de emojis, só tocando nos desenhos',
      'Criar o PIN de 4 números no primeiro acesso',
      'Fazer a atividade e enviar',
    ],
  },
  {
    arquivo: '3-aluno-responde-computador',
    titulo: 'Como a criança entra, pelo computador',
    duracao: '2:06',
    para: 'aluno',
    quando: 'Para o laboratório',
    resumo: 'O mesmo caminho do celular, mas na tela do computador — para quando a turma usa o laboratório de informática da escola.',
    topicos: [
      'Digitar o código que está no quadro',
      'A senha de emojis, só tocando nos desenhos',
      'Criar o PIN de 4 números no primeiro acesso',
      'Fazer a atividade e enviar',
    ],
  },
  {
    arquivo: '6-pintura-celular',
    titulo: 'Como a criança pinta, pelo celular',
    duracao: '1:59',
    para: 'aluno',
    quando: 'Para mostrar à turma',
    resumo: 'A tela de pintura pelo olhar da criança: escolher a cor, pintar com o dedo e usar a borracha, que apaga a tinta sem estragar o desenho.',
    topicos: [
      'Abrir a pintura e ler a instrução',
      'Escolher a cor e a grossura do pincel',
      'A borracha que tira só a tinta da criança',
      'Enviar para a professora',
    ],
  },
];
