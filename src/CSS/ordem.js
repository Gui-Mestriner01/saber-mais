/* ==========================================================================
   ORDEM DAS FOLHAS DE ESTILO

   O JavaScript é dividido por tela (cada página é baixada quando o usuário
   entra nela). Sem este arquivo, a folha de cada tela entraria DEPOIS da
   Celular.css e os ajustes de celular perderiam a briga — o menu do professor
   voltava a ficar com 248px de largura no celular.

   Então todas as folhas das telas são carregadas aqui, de uma vez, e o
   App.jsx carrega Transicoes, ModoEscuroProfessor e Celular depois, nessa
   ordem. Folha nova em CSS/ precisa ser acrescentada nesta lista.
   ========================================================================== */
/* Fonte Nunito servida pelo próprio site (pacote @fontsource/nunito).
   Antes vinha do Google Fonts: era um pedido a outro servidor que segurava a
   primeira pintura da tela ("render-blocking request" no PageSpeed). */
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-900.css';

import './Admin.css';
import './AlunoHome.css';
import './AoVivo.css';
import './AreaAluno.css';
import './Cadastro.css';
import './Conquistas.css';
import './CriarVF.css';
import './Dashboard.css';
import './Home.css';
import './Ligar.css';
import './LigarAluno.css';
import './Login.css';
import './LoginAluno.css';
import './NovasAtividades.css';
import './Pintura.css';
import './Quiz.css';
import './Relatorios.css';
import './ResponderQuiz.css';
import './ResponderVF.css';
import './Salas.css';
