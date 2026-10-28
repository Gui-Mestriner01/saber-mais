import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Star, Clock, CalendarCheck, MessageSquareText, Hourglass } from 'lucide-react';
import { JogoAluno, estrelasPorAproveitamento } from '../components/JogoAluno';
import CorrecaoLista from '../components/CorrecaoLista';
import { API, cabecalhoAluno } from '../api';
import { formatarDuracao } from '../tempo';

/* ==========================================================================
   ALUNO — REVER UMA ATIVIDADE JÁ FEITA (27/10/2026)

   Antes o botão "Concluída" da lista não abria nada: o aluno via a nota uma
   vez e ela sumia. Agora ele reabre a atividade e vê a nota, quanto tempo
   levou, o que respondeu e qual era a resposta certa. Vale para todos os
   tipos (pintura e resposta aberta mostram a nota e o recado do professor).
   ========================================================================== */

const formatarDataHora = (valor) => {
  const d = new Date(typeof valor === 'string' && valor.includes(' ') && !valor.includes('T') ? valor.replace(' ', 'T') : valor);
  return isNaN(d) ? '' : `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

function RevisaoAtividade() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { atividade, nomeAluno, sala, alunoId } = state || {};

  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  const [semSessao, setSemSessao] = useState(false);

  // Sem os dados da sala (aba recarregada, link aberto direto...) volta para
  // a escolha de sala em vez de abrir uma lista vazia.
  const voltar = () => (sala && nomeAluno
    ? navigate('/aluno/home', { state: { sala, nomeAluno, alunoId } })
    : navigate('/aluno/area'));

  useEffect(() => {
    /* Quem diz de quem é a resposta é o crachá do aluno (token), não os dados
       da tela anterior. Antes, se faltasse o nome ou a sala no histórico, a
       tela mandava de volta sem falar nada — parecia que o botão não fazia
       nada. Agora, se a sessão acabou, isso aparece escrito. */
    fetch(`${API}/aluno/atividade/${id}/revisao`, { headers: cabecalhoAluno(), cache: 'no-store' })
      .then(async r => {
        if (r.status === 401) { setSemSessao(true); throw new Error('Sua sessão acabou. Entre na sala de novo para ver o resultado.'); }
        const corpo = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(corpo.erro || 'Não consegui abrir o resultado.');
        return corpo;
      })
      .then(corpo => { if (corpo) setDados(corpo); })
      .catch(e => setErro(e.message));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const titulo = dados?.atividade?.titulo || atividade?.titulo || 'Resultado';
  const tema = dados?.atividade?.tema || atividade?.tema || null;

  if (erro || !dados) {
    return (
      <JogoAluno titulo={titulo} voltar={voltar} tema={tema}>
        <div className="jogo-carregando">
          <p>{erro || 'Abrindo o seu resultado…'}</p>
          {erro && (
            <div className="jogo-acoes">
              {semSessao
                ? <button className="jogo-btn" onClick={() => navigate('/aluno/area')}>Entrar de novo</button>
                : <button className="jogo-btn" onClick={voltar}>Voltar para as atividades</button>}
            </div>
          )}
        </div>
      </JogoAluno>
    );
  }

  const { resumo = {}, itens = [] } = dados;
  const temAcertos = resumo.de > 0 && resumo.acertos !== null;
  const estrelas = temAcertos ? estrelasPorAproveitamento(resumo.acertos, resumo.de)
    : dados.memoria?.estrelas ?? (dados.nota !== null ? Math.round((dados.nota / 10) * 3) : 0);
  const duracao = formatarDuracao(dados.duracao_s);

  return (
    <JogoAluno titulo={titulo} voltar={voltar} tema={tema}>
      <div className="resultado-cartao revisao">
        <h2>Seu resultado</h2>

        <div className="resultado-estrelas" aria-label={`${estrelas} de 3 estrelas`}>
          {[1, 2, 3].map(n => (
            <Star key={n} size={42} strokeWidth={1.8}
              className={`resultado-estrela ${n <= estrelas ? 'acesa' : ''}`}
              fill={n <= estrelas ? 'currentColor' : 'none'} />
          ))}
        </div>

        {temAcertos && (
          <>
            <p className="resultado-pontos">{resumo.acertos} de {resumo.de}</p>
            <p className="resultado-sub">
              {resumo.acertos === resumo.de ? 'Acertou tudo!' : `Você acertou ${resumo.acertos} de ${resumo.de}.`}
              {resumo.pontos !== null && ` Ganhou ${resumo.pontos} ${resumo.pontos === 1 ? 'ponto' : 'pontos'}.`}
            </p>
          </>
        )}

        {dados.memoria && (
          <p className="resultado-sub">Você achou todos os pares em {dados.memoria.tentativas} tentativas.</p>
        )}

        {resumo.aguardando && (
          <p className="revisao-aguardando"><Hourglass size={16} strokeWidth={2.4} /> O professor ainda vai corrigir esta atividade.</p>
        )}
        {dados.nota !== null && dados.nota !== undefined && (
          <p className="resultado-pontos">Nota {String(dados.nota).replace('.', ',')}</p>
        )}

        <div className="revisao-info">
          {dados.enviada_em && <span><CalendarCheck size={15} strokeWidth={2.2} /> Feita em {formatarDataHora(dados.enviada_em)}</span>}
          {duracao && <span><Clock size={15} strokeWidth={2.2} /> Levou {duracao}</span>}
        </div>

        {dados.comentario && (
          <div className="revisao-recado">
            <MessageSquareText size={18} strokeWidth={2.2} />
            <span><strong>Recado do professor:</strong> {dados.comentario}</span>
          </div>
        )}

        {dados.imagem && <img className="revisao-pintura" src={dados.imagem} alt="A pintura que você enviou" />}

        {itens.length > 0 && (
          <div className="resultado-correcao">
            <CorrecaoLista itens={itens} />
          </div>
        )}

        <div className="jogo-acoes">
          <button className="jogo-btn" onClick={voltar}>Voltar para as atividades</button>
        </div>
      </div>
    </JogoAluno>
  );
}

export default RevisaoAtividade;
