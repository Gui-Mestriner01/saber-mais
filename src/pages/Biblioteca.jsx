import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Library, User, Copy, Pencil, ListChecks, CheckCircle2, Link2,
  Palette, PenLine, ArrowDownUp, LayoutGrid, Shapes, ClipboardList,
} from 'lucide-react';
import BarraLateralProfessor from '../components/BarraLateralProfessor';
import '../CSS/Dashboard.css';
import '../CSS/Relatorios.css';
import '../CSS/NovasAtividades.css';
import { API } from '../api';

/* ==========================================================================
   BIBLIOTECA DE ATIVIDADES PÚBLICAS

   O que outros professores publicaram. Daqui o professor pode:
   - copiar direto para uma turma dele, do jeito que está;
   - abrir no editor e adaptar antes de salvar.

   Nos dois casos nasce uma atividade NOVA, dele. A do outro professor não é
   tocada nunca — quem publicou não corre risco de ver a atividade mudar.

   A busca é feita no servidor (o endereço leva ?busca=), não no navegador:
   a biblioteca cresce com o tempo e não faz sentido baixar tudo para achar
   um quiz. Por isso ela espera o professor parar de digitar antes de pedir.
   ========================================================================== */

const NOME_DO_TIPO = {
  quiz: 'Quiz', v_f: 'Verdadeiro ou falso', ligar: 'Ligar os pares',
  pintura: 'Pintura', resposta_aberta: 'Resposta aberta',
  ordenar: 'Colocar em ordem', memoria: 'Jogo da memória', grupos: 'Separar em grupos',
};

// Para onde cada tipo abre no editor.
const ROTA_DO_TIPO = {
  quiz: '/professor/criar-quiz',
  v_f: '/professor/criar-v-f',
  ligar: '/professor/criar-ligar',
  pintura: '/professor/criar-pintura',
  resposta_aberta: '/professor/criar-resposta-aberta',
  ordenar: '/professor/criar-ordenar',
  memoria: '/professor/criar-memoria',
  grupos: '/professor/criar-grupos',
};

function IconeDoTipo({ tipo }) {
  const props = { size: 19, strokeWidth: 1.75 };
  if (tipo === 'quiz')    return <ListChecks {...props} />;
  if (tipo === 'v_f')     return <CheckCircle2 {...props} />;
  if (tipo === 'ligar')   return <Link2 {...props} />;
  if (tipo === 'pintura') return <Palette {...props} />;
  if (tipo === 'resposta_aberta') return <PenLine {...props} />;
  if (tipo === 'ordenar') return <ArrowDownUp {...props} />;
  if (tipo === 'memoria') return <LayoutGrid {...props} />;
  if (tipo === 'grupos')  return <Shapes {...props} />;
  return <ClipboardList {...props} />;
}

function Biblioteca() {
  const navigate = useNavigate();

  const [atividades, setAtividades] = useState([]);
  const [salas, setSalas]           = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState('');

  const [busca, setBusca]           = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [soDosOutros, setSoDosOutros] = useState(false);

  const [copiando, setCopiando]     = useState(null);   // atividade escolhida
  const [salaDestino, setSalaDestino] = useState('');
  const [enviando, setEnviando]     = useState(false);

  const cracha = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  // As turmas são buscadas uma vez só: servem para o "copiar para a turma".
  useEffect(() => {
    fetch(`${API}/professor/salas`, { headers: cracha() })
      .then(r => (r.ok ? r.json() : []))
      .then(lista => setSalas(Array.isArray(lista) ? lista : []))
      .catch(() => setSalas([]));
  }, []);

  /* Espera o professor parar de digitar (350 ms) antes de perguntar ao
     servidor — senão seriam oito buscas para escrever "história". */
  const primeiraVez = useRef(true);
  useEffect(() => {
    const atraso = primeiraVez.current ? 0 : 350;
    primeiraVez.current = false;

    const relogio = setTimeout(() => {
      setCarregando(true);
      setErro('');

      const endereco = new URLSearchParams();
      if (busca.trim()) endereco.set('busca', busca.trim());
      if (filtroTipo !== 'todos') endereco.set('tipo', filtroTipo);
      if (soDosOutros) endereco.set('minhas', 'nao');

      fetch(`${API}/professor/biblioteca?${endereco}`, { headers: cracha() })
        .then(r => (r.ok ? r.json() : Promise.reject(new Error('Não consegui abrir a biblioteca.'))))
        .then(lista => setAtividades(Array.isArray(lista) ? lista : []))
        .catch(e => { setErro(e.message); setAtividades([]); })
        .finally(() => setCarregando(false));
    }, atraso);

    return () => clearTimeout(relogio);
  }, [busca, filtroTipo, soDosOutros]);

  /* Abrir no editor: busca a atividade inteira (com gabarito) e entrega ao
     editor do tipo dela. O editor decide sozinho se é edição (a atividade é
     minha) ou cópia (é de outra pessoa). */
  const abrirNoEditor = async (atividade) => {
    setErro('');
    try {
      const res = await fetch(`${API}/professor/biblioteca/${atividade.id}`, { headers: cracha() });
      const completa = await res.json();
      if (!res.ok) throw new Error(completa.erro || 'Não consegui abrir a atividade.');

      const rota = ROTA_DO_TIPO[completa.tipo];
      if (!rota) throw new Error('Esse tipo de atividade ainda não abre no editor.');

      navigate(rota, { state: { atividade: completa } });
    } catch (e) {
      setErro(e.message);
    }
  };

  const confirmarCopia = async () => {
    if (!salaDestino) { setErro('Escolha a turma que vai receber.'); return; }
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch(`${API}/professor/biblioteca/${copiando.id}/copiar`, {
        method: 'POST',
        headers: { ...cracha(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala_destino_id: salaDestino }),
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.erro || 'Não consegui copiar.');
      setCopiando(null);
      navigate('/professor/minhas-aulas');
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const filtroLigado = busca.trim() !== '' || filtroTipo !== 'todos' || soDosOutros;

  return (
    <div className="dashboard-container">
      <BarraLateralProfessor ativo="biblioteca" />

      <main className="dashboard-main">
        <header className="dashboard-header-painel">
          <div className="header-boas-vindas">
            <h1>Biblioteca</h1>
            <p>Atividades que outros professores publicaram. Copie para a sua turma ou adapte do seu jeito.</p>
          </div>
        </header>

        <div className="rel-filtros">
          <label className="rel-busca">
            <Search size={16} strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Buscar pelo título, pela matéria ou por quem publicou..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </label>

          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="todos">Todos os tipos</option>
            {Object.entries(NOME_DO_TIPO).map(([chave, nome]) => (
              <option key={chave} value={chave}>{nome}</option>
            ))}
          </select>

          <select value={soDosOutros ? 'outros' : 'todas'} onChange={e => setSoDosOutros(e.target.value === 'outros')}>
            <option value="todas">Minhas e dos outros</option>
            <option value="outros">Só dos outros professores</option>
          </select>
        </div>

        {erro && <p className="editor-erro">{erro}</p>}

        {carregando ? (
          <div className="loading-container"><h2>Procurando na biblioteca...</h2></div>
        ) : atividades.length === 0 ? (
          <div className="form-card bib-vazio">
            <Library size={34} strokeWidth={1.3} />
            {filtroLigado ? (
              <>
                <strong>Nada encontrado</strong>
                Tente outra palavra, ou limpe os filtros para ver a biblioteca inteira.
              </>
            ) : (
              <>
                <strong>A biblioteca ainda está vazia</strong>
                Quando você ou outro professor publicar uma atividade, ela aparece aqui.
                Para publicar uma sua, abra Minhas aulas e escolha “Publicar”.
              </>
            )}
          </div>
        ) : (
          <div className="bib-lista">
            {atividades.map(ativ => (
              <article key={ativ.id} className="bib-card">
                <div className="bib-card-topo">
                  <span className="bib-card-icone"><IconeDoTipo tipo={ativ.tipo} /></span>
                  <div>
                    <h3>{ativ.titulo}</h3>
                    <span className="bib-card-tipo">{NOME_DO_TIPO[ativ.tipo] || ativ.tipo}</span>
                  </div>
                </div>

                <div className="bib-card-autor">
                  <User size={14} strokeWidth={1.9} />
                  {ativ.minha ? 'Publicada por você' : ativ.autor}
                </div>

                <div className="bib-etiquetas">
                  {ativ.minha && <span className="bib-etiqueta minha">Sua</span>}
                  {ativ.serie && <span className="bib-etiqueta">{ativ.serie}</span>}
                  {ativ.materia && <span className="bib-etiqueta">{ativ.materia}</span>}
                  {ativ.copias > 0 && (
                    <span className="bib-etiqueta">
                      {ativ.copias} {Number(ativ.copias) === 1 ? 'cópia' : 'cópias'}
                    </span>
                  )}
                </div>

                <div className="bib-card-acoes">
                  <button
                    className="btn-acao-rapida destaque"
                    onClick={() => { setCopiando(ativ); setSalaDestino(''); setErro(''); }}
                  >
                    <Copy size={16} strokeWidth={2} /> Usar na minha turma
                  </button>
                  <button className="btn-acao-rapida" onClick={() => abrirNoEditor(ativ)}>
                    <Pencil size={16} strokeWidth={1.9} /> {ativ.minha ? 'Editar' : 'Adaptar'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Escolher a turma que recebe a cópia */}
      {copiando && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Usar na minha turma</h2>
            <p>
              Para qual turma você quer levar <strong>"{copiando.titulo}"</strong>?
              Vai ser criada uma cópia sua — a atividade de {copiando.minha ? 'origem' : copiando.autor} não muda.
            </p>

            <select className="form-input" value={salaDestino} onChange={e => setSalaDestino(e.target.value)}>
              <option value="">Selecione a turma...</option>
              {salas.map(s => (
                <option key={s.id} value={s.id}>{s.nome} — {s.serie} · {s.materia}</option>
              ))}
            </select>

            {salas.length === 0 && (
              <p className="campo-dica">Você ainda não tem turmas. Crie uma antes de trazer atividades para cá.</p>
            )}

            <div className="modal-actions">
              <button className="btn-secundario" onClick={() => setCopiando(null)} disabled={enviando}>
                Cancelar
              </button>
              <button className="btn-primario" onClick={confirmarCopia} disabled={enviando || !salas.length}>
                {enviando ? 'Copiando...' : 'Copiar para a turma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Biblioteca;
