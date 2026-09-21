import {
  Footprints, Flame, Medal, Star, Crown, Zap, Compass, CalendarCheck,
  Radio, Award, Trophy, Sparkles, Gem, Mountain, Lock,
  FilePlus, Layers, Lightbulb, Shapes, School, Mic, Users, MessageSquare,
  Activity, HeartHandshake, TrendingUp, PenLine, ClipboardCheck
} from 'lucide-react';

/* ==========================================================================
   MEDALHA DE UMA INSÍGNIA

   O servidor manda o nome do ícone como texto (ex.: 'Flame'); aqui ele vira
   o desenho. Assim o catálogo de insígnias fica num lugar só, no backend.

   A cor da medalha diz o nível (bronze, prata, ouro), mas o nível também é
   escrito por extenso embaixo — cor sozinha não serve para quem é daltônico.
   ========================================================================== */

const ICONES = {
  // do aluno
  Footprints, Flame, Medal, Star, Crown, Zap, Compass, CalendarCheck,
  Radio, Award, Trophy, Sparkles, Gem, Mountain,
  // do professor
  FilePlus, Layers, Lightbulb, Shapes, School, Mic, Users, MessageSquare,
  Activity, HeartHandshake, TrendingUp, PenLine, ClipboardCheck
};

const NOME_NIVEL = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro' };

function Insignia({ insignia, tamanho = 'normal', mostrarProgresso = true }) {
  const Icone = ICONES[insignia.icone] || Award;
  const bloqueada = !insignia.conquistada;
  const porcento = insignia.meta > 0 ? Math.round((insignia.atual / insignia.meta) * 100) : 0;

  return (
    <div
      className={`insignia nivel-${insignia.nivel} ${bloqueada ? 'bloqueada' : ''} tam-${tamanho}`}
      title={insignia.descricao}
    >
      <div className="insignia-medalha" aria-hidden="true">
        <span className="insignia-fita esquerda" />
        <span className="insignia-fita direita" />
        <span className="insignia-disco">
          <Icone strokeWidth={2} />
        </span>
        {bloqueada && (
          <span className="insignia-cadeado"><Lock strokeWidth={2.4} /></span>
        )}
      </div>

      {tamanho !== 'mini' && (
        <div className="insignia-texto">
          <strong>{insignia.nome}</strong>
          <span className="insignia-nivel">{NOME_NIVEL[insignia.nivel]}</span>
          <p>{insignia.descricao}</p>

          {bloqueada && mostrarProgresso && (
            <div className="insignia-progresso" aria-label={`${insignia.atual} de ${insignia.meta}`}>
              <span className="insignia-barra"><i style={{ width: `${porcento}%` }} /></span>
              <small>{insignia.atual} de {insignia.meta}</small>
            </div>
          )}

          {!bloqueada && insignia.conquistadaEm && (
            <small className="insignia-data">
              Conquistada em {new Date(insignia.conquistadaEm).toLocaleDateString('pt-BR')}
            </small>
          )}
        </div>
      )}
    </div>
  );
}

export default Insignia;
