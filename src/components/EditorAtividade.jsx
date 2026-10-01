import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import BarraLateralProfessor from './BarraLateralProfessor';
import '../CSS/Dashboard.css';
import '../CSS/NovasAtividades.css';
import { API } from '../api';

/* ==========================================================================
   MOLDURA DE TODOS OS EDITORES DE ATIVIDADE

   O que é igual em todos mora aqui: menu lateral, cabeçalho com o nome do
   tipo, campo de título, validação antes de salvar, mensagens de erro/ok e
   o rodapé com o botão de salvar. Cada editor cuida só do conteúdo dele.

   O editor passa:
   - validar():        devolve uma frase de erro, ou null se está tudo certo
   - montarConteudo(): devolve o objeto que vai para a coluna `conteudo`

   Quando o salvamento é diferente do normal (o V/F manda imagens, a pintura
   sobe o desenho antes), o editor passa `aoSalvar(titulo, salaId)` no lugar
   do montarConteudo e cuida do envio por conta própria.
   ========================================================================== */

function EditorAtividade({
  tipo,
  nomeTipo,
  explicacao,
  validar,
  montarConteudo,
  aoSalvar,
  rodapeExtra,
  children,
}) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const salaId = state?.salaId;

  const [titulo, setTitulo]     = useState('');
  const [erro, setErro]         = useState('');
  const [salvo, setSalvo]       = useState(false);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setErro('');
    if (!salaId) { setErro('Volte e escolha a turma antes de montar a atividade.'); return; }
    if (!titulo.trim()) { setErro('Dê um título para a atividade.'); return; }

    const problema = validar?.();
    if (problema) { setErro(problema); return; }

    setSalvando(true);
    try {
      if (aoSalvar) {
        await aoSalvar(titulo.trim(), salaId);
      } else {
        const res = await fetch(`${API}/professor/atividade`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ titulo: titulo.trim(), tipo, sala_id: salaId, conteudo: montarConteudo() })
        });
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.erro || 'Não consegui salvar.');
      }

      setSalvo(true);
      setTimeout(() => navigate('/professor/minhas-aulas'), 1400);
    } catch (e) {
      setErro(e.message || 'Não consegui salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="dashboard-container">
      <BarraLateralProfessor ativo="aulas" />

      <main className="dashboard-main">
        <header className="dashboard-header-painel">
          <div className="header-boas-vindas">
            <h1>{nomeTipo}</h1>
            <p>{explicacao}</p>
          </div>
          <div className="header-acoes">
            <button className="btn-acao-rapida" onClick={() => navigate('/professor/criar-atividade')}>
              <ArrowLeft size={17} strokeWidth={1.75} /> Trocar o tipo
            </button>
          </div>
        </header>

        <div className="editor-nova">
          <section className="editor-cartao">
            <label className="editor-campo">
              <span>Título da atividade</span>
              <input
                className="editor-input"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ex.: Ciclo da água"
                maxLength={120}
              />
            </label>
          </section>

          {children}

          <section className="editor-cartao editor-rodape">
            {erro ? <p className="editor-erro">{erro}</p>
              : salvo ? <p className="editor-ok">Atividade salva! Levando você para Minhas aulas…</p>
              : <p>{rodapeExtra || 'Confira tudo e salve. A turma já vê a atividade na hora.'}</p>}

            <button className="btn-acao-rapida destaque" onClick={salvar} disabled={salvando || salvo}>
              <Save size={17} strokeWidth={2} /> {salvando ? 'Salvando…' : 'Salvar atividade'}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}

export default EditorAtividade;
