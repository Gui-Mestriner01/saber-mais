import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, AlertCircle } from 'lucide-react';
import BarraLateralProfessor from '../components/BarraLateralProfessor';
import Insignia from '../components/Insignia';
import '../CSS/Dashboard.css';
import '../CSS/Conquistas.css';
import { API } from '../api';


/* ==========================================================================
   CONQUISTAS DO PROFESSOR

   Mostra o catálogo inteiro: as conquistadas em cor, as que faltam em cinza
   com a barra de progresso. A comemoração das novas fica por conta do menu
   lateral, que aparece em todas as telas.
   ========================================================================== */

function ConquistasProfessor() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const nomeProfessor = localStorage.getItem('nomeUsuario') || 'Professor(a)';
  const idProfessor   = localStorage.getItem('idUsuario');
  const fotoProfessor = idProfessor ? localStorage.getItem(`fotoUsuario_${idProfessor}`) : null;
  const iniciais = nomeProfessor.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

  const [dados, setDados] = useState(null);
  const [erro, setErro]   = useState('');

  useEffect(() => {
    if (!token) { navigate('/login/professor'); return; }
    fetch(`${API}/professor/conquistas`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const corpo = await r.json();
        if (!r.ok) throw new Error(corpo.erro);
        setDados(corpo);
      })
      .catch(e => setErro(e.message || 'Não consegui carregar as conquistas.'));
  }, []);

  // Agrupa na ordem em que o servidor mandou
  const grupos = [];
  (dados?.lista || []).forEach(c => {
    let grupo = grupos.find(g => g.nome === c.grupo);
    if (!grupo) { grupo = { nome: c.grupo, itens: [] }; grupos.push(grupo); }
    grupo.itens.push(c);
  });

  const porcento = dados ? Math.round((dados.conquistadas / dados.total) * 100) : 0;

  return (
    <div className="dashboard-container">
      <BarraLateralProfessor ativo="conquistas" />

      <main className="dashboard-main">
        <header className="dashboard-header-painel">
          <div className="header-boas-vindas">
            <h1>Minhas conquistas</h1>
            <p>Insígnias pelo seu trabalho com as turmas, somando todas as salas.</p>
          </div>

          <div className="header-acoes">
            <div className="header-avatar-prof" onClick={() => navigate('/professor/perfil')} title="Meu perfil">
              {fotoProfessor ? <img src={fotoProfessor} alt={nomeProfessor} /> : <span>{iniciais}</span>}
            </div>
          </div>
        </header>

        {erro && <p className="conquistas-erro">{erro}</p>}

        {!dados && !erro && (
          <div className="conquistas-carregando">
            <Award size={28} strokeWidth={1.4} />
            <p>Carregando suas insígnias…</p>
          </div>
        )}

        {dados && (
          <>
            <div className="conquistas-resumo">
              <div className="conquistas-contador">
                {dados.conquistadas}<small> / {dados.total}</small>
              </div>
              <div className="conquistas-resumo-texto">
                <h3>
                  {dados.conquistadas === 0
                    ? 'Sua coleção começa na primeira atividade'
                    : dados.conquistadas === dados.total
                      ? 'Coleção completa!'
                      : `${porcento}% da coleção`}
                </h3>
                <p>Elas aparecem sozinhas conforme você cria, conduz e corrige.</p>
                <div className="conquistas-barra"><i style={{ width: `${porcento}%` }} /></div>
              </div>
            </div>

            {/* Um lembrete útil: é o que impede a insígnia de correção em dia */}
            {dados.pendentesAtrasadas > 0 && (
              <button className="conquistas-lembrete" onClick={() => navigate('/professor/relatorios')}>
                <AlertCircle size={18} strokeWidth={2} />
                <span>
                  {dados.pendentesAtrasadas === 1
                    ? '1 resposta está esperando nota há mais de uma semana.'
                    : `${dados.pendentesAtrasadas} respostas estão esperando nota há mais de uma semana.`}
                  {' '}<strong>Corrigir agora</strong>
                </span>
              </button>
            )}

            {grupos.map(grupo => (
              <section key={grupo.nome} className="conquistas-grupo">
                <h3>{grupo.nome}</h3>
                <div className="conquistas-grade">
                  {grupo.itens.map(c => (
                    <div key={c.codigo} className={`conquistas-cartao ${c.conquistada ? 'conquistada' : ''}`}>
                      <Insignia insignia={c} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </main>
    </div>
  );
}

export default ConquistasProfessor;
