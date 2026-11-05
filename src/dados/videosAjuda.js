/* ==========================================================================
   OS VÍDEOS DA CENTRAL DE AJUDA

   Os arquivos não ficam no servidor do site: estão no Cloudinary, a mesma
   conta que já guarda as imagens das pinturas. Assim a Hostinger não gasta
   banda toda vez que uma professora abre a ajuda.

   Para trocar um vídeo, suba o novo no Cloudinary com o mesmo "arquivo"
   (public_id) e pronto — aqui não precisa mexer.
   ========================================================================== */

const NUVEM = import.meta.env.VITE_CLOUDINARY_CLOUD || 'SEU_CLOUD_NAME';
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

export const VIDEOS_AJUDA = [
  {
    arquivo: '9-conta-e-senha',
    titulo: 'Criar a conta e recuperar a senha',
    duracao: '2:17',
    para: 'professor',
    resumo: 'Como abrir sua conta de professor e, se um dia esquecer a senha, criar uma nova pelo e-mail.',
    topicos: ['Cadastro com nome, e-mail e senha', 'Botão "Esqueci minha senha"', 'Link que chega no e-mail', 'Entrar com a senha nova'],
  },
  {
    arquivo: '1-criar-sala',
    titulo: 'Criar uma sala e cuidar dos alunos',
    duracao: '2:07',
    para: 'professor',
    resumo: 'O primeiro passo: abrir a turma e pegar o código e a senha de emojis que os alunos vão usar.',
    topicos: ['Sala permanente ou temporária', 'Nome, série e matéria', 'Onde ficam o código e a senha de emojis', 'Ver quem já entrou e trocar o PIN de um aluno'],
  },
  {
    arquivo: '2-criar-atividade',
    titulo: 'Criar uma atividade',
    duracao: '1:42',
    para: 'professor',
    resumo: 'Montar um quiz do zero: pergunta, alternativas e marcar qual é a certa.',
    topicos: ['Escolher a turma e o tipo', 'Escrever o enunciado', 'Alternativas e resposta certa', 'Tempo e pontos de cada pergunta'],
  },
  {
    arquivo: '7-tipos-de-atividade',
    titulo: 'Os tipos de atividade',
    duracao: '1:34',
    para: 'professor',
    resumo: 'Os sete tipos que existem e para que serve cada um, para você variar as aulas.',
    topicos: ['Quiz e resposta aberta', 'Ligar correspondentes', 'Pintar cenário', 'Colocar em ordem, memória e grupos'],
  },
  {
    arquivo: '4-relatorios',
    titulo: 'Ver os relatórios e corrigir',
    duracao: '1:38',
    para: 'professor',
    resumo: 'Acompanhar como a turma foi, ver item por item e dar nota e comentário para cada aluno.',
    topicos: ['Média de acerto da turma', 'Qual pergunta deu mais trabalho', 'Aba "Por aluno"', 'Nota automática e correção à mão'],
  },
  {
    arquivo: '5-modo-ao-vivo',
    titulo: 'Modo ao vivo',
    duracao: '2:06',
    para: 'professor',
    resumo: 'A turma inteira responde junto, na mesma hora, com placar na tela — e as notas vão sozinhas para os relatórios.',
    topicos: ['Abrir a sala ao vivo', 'Ver os alunos entrando', 'Começar a partida e passar as perguntas', 'Pódio e notas no relatório'],
  },
  {
    arquivo: '6-pintura-computador',
    titulo: 'Atividade de pintura',
    duracao: '4:42',
    para: 'professor',
    resumo: 'Do começo ao fim: você sobe um desenho, a criança pinta, e você vê e baixa o resultado.',
    topicos: ['Subir o desenho e escrever a instrução', 'Como a criança pinta e apaga', 'Ver a entrega e ampliar', 'Baixar o desenho pronto'],
  },
  {
    arquivo: '8-biblioteca',
    titulo: 'Usar a biblioteca',
    duracao: '1:23',
    para: 'professor',
    resumo: 'Aproveitar uma atividade que outro professor já montou, em vez de criar tudo do zero.',
    topicos: ['Procurar pelo assunto', '"Usar na minha turma"', '"Adaptar" e mudar no editor', 'Deixar a sua atividade pública'],
  },
  {
    arquivo: '3-aluno-responde-celular',
    titulo: 'Como o aluno entra e responde (celular)',
    duracao: '1:59',
    para: 'aluno',
    resumo: 'O que a criança vê no celular dela, do primeiro acesso até enviar a resposta.',
    topicos: ['Achar a turma', 'Senha de emojis', 'Criar o PIN no primeiro acesso', 'Fazer e enviar a atividade'],
  },
  {
    arquivo: '3-aluno-responde-computador',
    titulo: 'Como o aluno entra e responde (computador)',
    duracao: '2:03',
    para: 'aluno',
    resumo: 'O mesmo caminho do celular, para quando a turma usa o laboratório de informática.',
    topicos: ['Achar a turma', 'Senha de emojis', 'Criar o PIN no primeiro acesso', 'Fazer e enviar a atividade'],
  },
  {
    arquivo: '6-pintura-celular',
    titulo: 'Como o aluno pinta (celular)',
    duracao: '1:58',
    para: 'aluno',
    resumo: 'A tela de pintura pelo olhar da criança: escolher cor, pintar com o dedo e usar a borracha.',
    topicos: ['Abrir a pintura', 'Escolher a cor e a espessura', 'Borracha que não estraga o desenho', 'Enviar para a professora'],
  },
];
