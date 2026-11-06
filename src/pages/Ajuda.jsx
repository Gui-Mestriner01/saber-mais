import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Play, X, GraduationCap, Baby, CircleHelp } from 'lucide-react';
import BarraLateralProfessor from '../components/BarraLateralProfessor';
import { VIDEOS_AJUDA, enderecoDoVideo, capaDoVideo } from '../dados/videosAjuda';
import '../CSS/Dashboard.css';
import '../CSS/Ajuda.css';

/* ==========================================================================
   CENTRAL DE AJUDA

   Vídeos curtos mostrando o sistema funcionando de verdade. A ideia é que a
   professora resolva a dúvida dela sozinha, a qualquer hora, sem precisar
   ligar para ninguém.

   Os arquivos ficam no Cloudinary (ver src/dados/videosAjuda.js), então esta
   página é leve: só carrega o vídeo que a pessoa clicar.
   ========================================================================== */

const FILTROS = [
  { chave: 'todos',     rotulo: 'Todos',            Icone: CircleHelp },
  { chave: 'professor', rotulo: 'Para o professor', Icone: GraduationCap },
  { chave: 'aluno',     rotulo: 'Como o aluno vê',  Icone: Baby },
];

function Ajuda() {
  const navigate = useNavigate();

  const nomeProfessor = localStorage.getItem('nomeUsuario') || 'Professor(a)';
  const idProfessor   = localStorage.getItem('idUsuario');
  const fotoGuardada  = idProfessor ? localStorage.getItem(`fotoUsuario_${idProfessor}`) : null;
  const fotoProfessor = fotoGuardada && !fotoGuardada.startsWith('blob:') ? fotoGuardada : null;
  const iniciais = nomeProfessor.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

  const [busca, setBusca]   = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [aberto, setAberto] = useState(null);
  const [erroVideo, setErroVideo] = useState(false);

  const abrir = (v) => { setErroVideo(false); setAberto(v); };

  // Esc fecha o vídeo, e com ele aberto a página de trás não rola junto
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e) => { if (e.key === 'Escape') setAberto(null); };
    document.addEventListener('keydown', aoTeclar);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = '';
    };
  }, [aberto]);

  const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const lista = useMemo(() => {
    const termo = semAcento(busca.trim());
    return VIDEOS_AJUDA.filter(v => {
      if (filtro !== 'todos' && v.para !== filtro) return false;
      if (!termo) return true;
      const palheiro = semAcento([v.titulo, v.resumo, ...(v.topicos || [])].join(' '));
      return palheiro.includes(termo);
    });
  }, [busca, filtro]);

  return (
    <div className="dashboard-container">
      <BarraLateralProfessor ativo="ajuda" />

      <main className="dashboard-main">
        <header className="dashboard-header-painel">
          <div className="header-boas-vindas">
            <h1>Central de ajuda</h1>
            <p>Vídeos curtos mostrando o Saber+ funcionando. Clique em um para assistir.</p>
          </div>

          <div className="header-acoes">
            <div className="header-avatar-prof" onClick={() => navigate('/professor/perfil')} title="Meu perfil">
              {fotoProfessor ? <img src={fotoProfessor} alt={nomeProfessor} /> : <span>{iniciais}</span>}
            </div>
          </div>
        </header>

        <p className="ajuda-intro">
          Cada vídeo mostra o Saber+ funcionando de verdade, com legenda na tela.
          Nenhum passa de 5 minutos. Se estiver começando agora, siga a ordem dos números.
        </p>

        <div className="ajuda-filtros">
          <label className="ajuda-busca">
            <Search size={17} strokeWidth={2} />
            <input
              type="search"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="O que você quer aprender? Ex.: senha de emojis, pintura, relatório…"
              aria-label="Procurar um vídeo de ajuda"
            />
          </label>

          <div className="ajuda-abas" role="tablist" aria-label="Filtrar vídeos">
            {FILTROS.map(({ chave, rotulo, Icone }) => (
              <button
                key={chave}
                role="tab"
                aria-selected={filtro === chave}
                className={`ajuda-aba ${filtro === chave ? 'ativa' : ''}`}
                onClick={() => setFiltro(chave)}
              >
                <Icone size={16} strokeWidth={2} /> {rotulo}
              </button>
            ))}
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="ajuda-vazio">
            <CircleHelp size={30} strokeWidth={1.4} />
            <h3>Não achei nenhum vídeo sobre isso</h3>
            <p>Tente outra palavra, ou veja todos tirando o filtro.</p>
            <button className="btn-acao-rapida" onClick={() => { setBusca(''); setFiltro('todos'); }}>
              Ver todos os vídeos
            </button>
          </div>
        ) : (
          <div className="ajuda-grade">
            {lista.map(v => (
              <article key={v.arquivo} className="ajuda-card">
                <button
                  className="ajuda-capa"
                  onClick={() => abrir(v)}
                  aria-label={`Assistir: ${v.titulo}`}
                >
                  {/* se a capa não carregar (internet ruim), some com a imagem
                      e fica o fundo azul com o play — nada de ícone quebrado */}
                  <img
                    src={capaDoVideo(v.arquivo)}
                    alt=""
                    loading="lazy"
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                  <span className="ajuda-play"><Play size={22} strokeWidth={2.4} fill="currentColor" /></span>
                  <span className="ajuda-duracao">{v.duracao}</span>
                  <span className="ajuda-ordem">{VIDEOS_AJUDA.indexOf(v) + 1}</span>
                </button>

                <div className="ajuda-texto">
                  <div className="ajuda-selos">
                    <span className={`ajuda-selo ${v.para}`}>
                      {v.para === 'aluno' ? 'Como o aluno vê' : 'Para o professor'}
                    </span>
                    {v.quando && <span className="ajuda-quando">{v.quando}</span>}
                  </div>
                  <h3>{v.titulo}</h3>
                  <p>{v.resumo}</p>
                  <ul className="ajuda-topicos">
                    {(v.topicos || []).map(t => <li key={t}>{t}</li>)}
                  </ul>
                  <button className="btn-acao-rapida destaque ajuda-btn" onClick={() => abrir(v)}>
                    <Play size={15} strokeWidth={2.4} /> Assistir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="ajuda-rodape">
          Não achou o que precisava? Fale com quem cuida do Saber+ na sua escola.
        </p>
      </main>

      {aberto && (
        <div className="ajuda-janela" role="dialog" aria-modal="true" aria-label={aberto.titulo} onClick={() => setAberto(null)}>
          <div className="ajuda-janela-cartao" onClick={e => e.stopPropagation()}>
            <header className="ajuda-janela-topo">
              <h2>{aberto.titulo}</h2>
              <button className="ajuda-fechar" onClick={() => setAberto(null)} aria-label="Fechar o vídeo">
                <X size={20} strokeWidth={2.4} />
              </button>
            </header>

            {erroVideo ? (
              <div className="ajuda-erro-video">
                <CircleHelp size={28} strokeWidth={1.5} />
                <h3>Não consegui carregar este vídeo</h3>
                <p>Confira sua internet e tente de novo. Se continuar assim, avise quem cuida do Saber+ na escola.</p>
              </div>
            ) : (
              <video
                className="ajuda-player"
                src={enderecoDoVideo(aberto.arquivo)}
                poster={capaDoVideo(aberto.arquivo)}
                controls
                autoPlay
                playsInline
                preload="metadata"
                onError={() => setErroVideo(true)}
              >
                Seu navegador não consegue tocar este vídeo.
              </video>
            )}

            <p className="ajuda-janela-resumo">{aberto.resumo}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ajuda;
