import { useState } from 'react';
import {
  ArrowLeft, Check, X, Minus, Users, Percent, ChevronRight, ChevronDown, Save,
  Maximize2, Minimize2, Calendar, Clock,
  ListChecks, CheckCircle2, Link2, Palette, PenLine, ClipboardList
} from 'lucide-react';

/* ==========================================================================
   RELATÓRIO DE UMA ATIVIDADE

   Duas visões, porque são dois trabalhos diferentes:
   - "Visão geral": pergunta por pergunta, quantos alunos marcaram cada
     alternativa. Serve para o professor perceber onde a turma travou.
   - "Por aluno": a prova de cada aluno, com campo de nota para a
     correção manual.
   ========================================================================== */

const VERDE    = '#3DAA5C';
const VERMELHO = '#E23F3F';
const AZUL     = '#1A6FC4';

function IconeDoTipo({ tipo, size = 20 }) {
  const props = { size, strokeWidth: 1.75 };
  if (tipo === 'quiz')            return <ListChecks {...props} />;
  if (tipo === 'v_f')             return <CheckCircle2 {...props} />;
  if (tipo === 'ligar')           return <Link2 {...props} />;
  if (tipo === 'pintura')         return <Palette {...props} />;
  if (tipo === 'resposta_aberta') return <PenLine {...props} />;
  return <ClipboardList {...props} />;
}

// As letras que aparecem do lado de cada alternativa
const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];

// As datas do banco vêm como "2026-09-18 10:00:00"
function formatarData(bruto, comHora = false) {
  if (!bruto) return null;
  // Aceita tanto o texto do banco quanto um Date já pronto
  const d = bruto instanceof Date ? bruto : new Date(bruto.toString().replace(' ', 'T'));
  if (isNaN(d)) return null;
  return comHora
    ? d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR');
}

function RelatorioAtividade({ atividade, respostas, onVoltar, onAtualizarResposta }) {
  const [aba, setAba] = useState('geral');
  const [alunoAberto, setAlunoAberto] = useState(null);

  // Quais perguntas estão abertas. Numa prova curta abre tudo; numa longa
  // começa fechada, senão o professor rola a página sem fim.
  const [perguntasAbertas, setPerguntasAbertas] = useState(null);

  const tipo = atividade.tipo;
  const totalAlunos = respostas.length;

  // Quando a turma começou e terminou de responder
  const datasEnvio = respostas
    .map(r => r.criado_em)
    .filter(Boolean)
    .map(d => new Date(d.toString().replace(' ', 'T')))
    .filter(d => !isNaN(d))
    .sort((a, b) => a - b);

  const primeiraResposta = datasEnvio[0] || null;
  const ultimaResposta   = datasEnvio[datasEnvio.length - 1] || null;

  /* ------------------------------------------------------------------------
     LEITURA DAS PERGUNTAS
     O quiz guarda { perguntas: [...] }; o V/F guarda o array direto.
     ------------------------------------------------------------------------ */
  const perguntas = tipo === 'quiz'
    ? (atividade.conteudo?.perguntas || [])
    : Array.isArray(atividade.conteudo) ? atividade.conteudo : [];

  const temVisaoPorPergunta = (tipo === 'quiz' || tipo === 'v_f') && perguntas.length > 0;

  /* ------------------------------------------------------------------------
     QUIZ: quantos alunos marcaram cada alternativa
     ------------------------------------------------------------------------ */
  const analisarQuiz = () => perguntas.map((pergunta, i) => {
    const alternativas = pergunta.alternativas || [];
    const contagem = alternativas.map(() => 0);
    let semResposta = 0;
    let acertaram = 0;

    const corretas = alternativas
      .map((alt, idx) => (alt.correta ? idx : null))
      .filter(idx => idx !== null);

    respostas.forEach(r => {
      // as chaves viram texto quando o JSON é salvo no banco
      const escolhidas = r.resposta?.respostas?.[i] ?? r.resposta?.respostas?.[String(i)];

      if (!Array.isArray(escolhidas) || escolhidas.length === 0) {
        semResposta++;
        return;
      }

      escolhidas.forEach(idx => {
        if (contagem[idx] !== undefined) contagem[idx]++;
      });

      const acertou =
        corretas.length === escolhidas.length &&
        corretas.every(c => escolhidas.includes(c));
      if (acertou) acertaram++;
    });

    return {
      texto: pergunta.texto || `Pergunta ${i + 1}`,
      opcoes: alternativas.map((alt, idx) => ({
        rotulo: `${LETRAS[idx]}. ${alt.texto || '(sem texto)'}`,
        quantidade: contagem[idx],
        correta: !!alt.correta,
      })),
      semResposta,
      acertaram,
    };
  });

  /* ------------------------------------------------------------------------
     VERDADEIRO OU FALSO: quantos marcaram V e quantos marcaram F
     ------------------------------------------------------------------------ */
  const analisarVF = () => perguntas.map((pergunta, i) => {
    let verdadeiro = 0;
    let falso = 0;
    let semResposta = 0;

    respostas.forEach(r => {
      const item = Array.isArray(r.resposta) ? r.resposta[i] : null;
      const valor = item?.resposta_aluno;

      if (valor === 'V') verdadeiro++;
      else if (valor === 'F') falso++;
      else semResposta++;
    });

    const correta = pergunta.resposta_correta;

    return {
      texto: pergunta.texto || `Pergunta ${i + 1}`,
      opcoes: [
        { rotulo: 'Verdadeiro', quantidade: verdadeiro, correta: correta === 'V' },
        { rotulo: 'Falso',      quantidade: falso,      correta: correta === 'F' },
      ],
      semResposta,
      acertaram: correta === 'V' ? verdadeiro : falso,
    };
  });

  const analise = !temVisaoPorPergunta ? [] : tipo === 'quiz' ? analisarQuiz() : analisarVF();

  // Média de acerto da turma, considerando todas as perguntas
  const mediaAcerto = analise.length > 0 && totalAlunos > 0
    ? Math.round(
        (analise.reduce((soma, p) => soma + p.acertaram, 0) / (analise.length * totalAlunos)) * 100
      )
    : null;

  // Na primeira renderização decide quem começa aberta
  const abertasIniciais = analise.length > 0 && analise.length <= 3
    ? analise.map((_, i) => i)
    : [];

  const abertas = perguntasAbertas ?? abertasIniciais;

  const alternarPergunta = (i) => {
    setPerguntasAbertas(
      abertas.includes(i) ? abertas.filter(x => x !== i) : [...abertas, i]
    );
  };

  const abrirTodas   = () => setPerguntasAbertas(analise.map((_, i) => i));
  const fecharTodas  = () => setPerguntasAbertas([]);
  const todasAbertas = analise.length > 0 && abertas.length === analise.length;

  // A pergunta que mais derrubou a turma. Só vale apontar se ela for
  // realmente a pior — com empate, não faz sentido eleger uma.
  const perguntaMaisDificil = (() => {
    if (analise.length < 2) return null;
    const menor = Math.min(...analise.map(p => p.acertaram));
    const quantasNoMenor = analise.filter(p => p.acertaram === menor).length;
    if (quantasNoMenor > 1) return null;
    return analise.findIndex(p => p.acertaram === menor);
  })();

  return (
    <>
      <button className="rel-voltar" onClick={onVoltar}>
        <ArrowLeft size={15} strokeWidth={1.75} /> Voltar aos relatórios
      </button>

      <div className="rel-detalhe-header">
        <h2><IconeDoTipo tipo={tipo} /> {atividade.titulo}</h2>
        <p>{atividade.nome_sala} · {atividade.serie} · {atividade.materia}</p>

        <div className="rel-datas">
          <span>
            <Calendar size={14} strokeWidth={1.75} />
            Lançada em {formatarData(atividade.criado_em) || 'data não registrada'}
          </span>
          {primeiraResposta && (
            <span>
              <Clock size={14} strokeWidth={1.75} />
              Primeira resposta em {formatarData(primeiraResposta, true)}
            </span>
          )}
          {ultimaResposta && primeiraResposta && ultimaResposta.getTime() !== primeiraResposta.getTime() && (
            <span>
              <Clock size={14} strokeWidth={1.75} />
              Última em {formatarData(ultimaResposta, true)}
            </span>
          )}
        </div>
      </div>

      {/* ABAS */}
      <div className="rel-abas">
        <button
          className={`rel-aba ${aba === 'geral' ? 'ativa' : ''}`}
          onClick={() => setAba('geral')}
          disabled={!temVisaoPorPergunta}
          title={temVisaoPorPergunta ? '' : 'Esta atividade não tem alternativas para somar'}
        >
          Visão geral da turma
        </button>
        <button
          className={`rel-aba ${aba === 'alunos' ? 'ativa' : ''}`}
          onClick={() => setAba('alunos')}
        >
          Por aluno <span className="rel-aba-num">{totalAlunos}</span>
        </button>
      </div>

      {/* ====================================================================
          VISÃO GERAL — pergunta por pergunta
          ==================================================================== */}
      {aba === 'geral' && (
        !temVisaoPorPergunta ? (
          <div className="rel-vazio">
            <p>
              Esta atividade não tem alternativas para somar. Use a aba
              &ldquo;Por aluno&rdquo; para ver e corrigir cada entrega.
            </p>
          </div>
        ) : (
          <>
            <div className="resumo-grid">
              <div className="resumo-card turmas">
                <div className="resumo-icone"><Users size={20} strokeWidth={1.75} /></div>
                <div className="resumo-texto">
                  <strong>{totalAlunos}</strong>
                  <p>{totalAlunos === 1 ? 'Aluno respondeu' : 'Alunos responderam'}</p>
                </div>
              </div>

              <div className="resumo-card entregas">
                <div className="resumo-icone"><Percent size={20} strokeWidth={1.75} /></div>
                <div className="resumo-texto">
                  <strong>{mediaAcerto}%</strong>
                  <p>De acerto na turma</p>
                </div>
              </div>

              <div className="resumo-card alunos">
                <div className="resumo-icone"><ClipboardList size={20} strokeWidth={1.75} /></div>
                <div className="resumo-texto">
                  <strong>{perguntas.length}</strong>
                  <p>{perguntas.length === 1 ? 'Pergunta' : 'Perguntas'}</p>
                </div>
              </div>
            </div>

            <div className="perguntas-barra">
              <span className="perguntas-barra-titulo">
                Pergunta por pergunta
                <em>{analise.length} {analise.length === 1 ? 'pergunta' : 'perguntas'}</em>
              </span>

              <button
                className="perguntas-barra-btn"
                onClick={todasAbertas ? fecharTodas : abrirTodas}
              >
                {todasAbertas
                  ? <><Minimize2 size={15} strokeWidth={2} /> Recolher todas</>
                  : <><Maximize2 size={15} strokeWidth={2} /> Expandir todas</>
                }
              </button>
            </div>

            <div className="perguntas-lista">
              {analise.map((p, i) => {
                const pctAcerto = totalAlunos > 0 ? Math.round((p.acertaram / totalAlunos) * 100) : 0;
                const dificil = perguntaMaisDificil !== null && i === perguntaMaisDificil && pctAcerto < 60;

                const aberta = abertas.includes(i);

                return (
                  <section key={i} className={`pergunta-card ${dificil ? 'dificil' : ''} ${aberta ? 'aberta' : ''}`}>
                    <button className="pergunta-topo" onClick={() => alternarPergunta(i)}>
                      <span className="pergunta-num">{i + 1}</span>
                      <h3>{p.texto}</h3>
                      <span
                        className="pergunta-acerto"
                        style={{
                          background: pctAcerto >= 60 ? '#E8F7ED' : '#FDEDED',
                          color: pctAcerto >= 60 ? VERDE : VERMELHO
                        }}
                      >
                        {pctAcerto}% acertou
                      </span>
                      <ChevronDown className="pergunta-seta" size={18} strokeWidth={2.2} />
                    </button>

                    {/* Fechada, mostra só a faixinha com a divisão das respostas */}
                    {!aberta && (
                      <div className="pergunta-resumo" title="Como a turma se dividiu">
                        {p.opcoes.map((op, oi) => (
                          op.quantidade > 0 && (
                            <span
                              key={oi}
                              style={{
                                width: `${(op.quantidade / Math.max(totalAlunos, 1)) * 100}%`,
                                background: op.correta ? VERDE : AZUL
                              }}
                            />
                          )
                        ))}
                      </div>
                    )}

                    {aberta && dificil && (
                      <p className="pergunta-alerta">
                        Foi a pergunta que a turma mais errou — pode valer retomar esse assunto.
                      </p>
                    )}

                    {aberta && (
                    <div className="opcoes-lista">
                      {p.opcoes.map((op, oi) => {
                        const pct = totalAlunos > 0 ? (op.quantidade / totalAlunos) * 100 : 0;
                        return (
                          <div key={oi} className={`opcao-linha ${op.correta ? 'certa' : ''}`}>
                            <div className="opcao-cabecalho">
                              <span className="opcao-rotulo">
                                {op.correta && (
                                  <span className="opcao-selo" title="Alternativa correta">
                                    <Check size={12} strokeWidth={3} />
                                  </span>
                                )}
                                {op.rotulo}
                              </span>
                              <span className="opcao-valor">
                                {op.quantidade} <em>({Math.round(pct)}%)</em>
                              </span>
                            </div>
                            <div className="opcao-trilho">
                              <div
                                className="opcao-barra"
                                style={{
                                  width: `${pct}%`,
                                  background: op.correta ? VERDE : AZUL
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}

                      {p.semResposta > 0 && (
                        <p className="opcao-nota">
                          {p.semResposta} {p.semResposta === 1 ? 'aluno deixou' : 'alunos deixaram'} em branco
                        </p>
                      )}
                    </div>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )
      )}

      {/* ====================================================================
          POR ALUNO — correção manual
          ==================================================================== */}
      {aba === 'alunos' && (
        respostas.length === 0 ? (
          <div className="rel-vazio">
            <p>Nenhum aluno respondeu esta atividade ainda.</p>
          </div>
        ) : (
          <div className="alunos-lista">
            {respostas.map(resp => (
              <CartaoAluno
                key={resp.id}
                resposta={resp}
                atividade={atividade}
                perguntas={perguntas}
                aberto={alunoAberto === resp.id}
                onAbrir={() => setAlunoAberto(alunoAberto === resp.id ? null : resp.id)}
                onSalvo={onAtualizarResposta}
              />
            ))}
          </div>
        )
      )}
    </>
  );
}

/* ==========================================================================
   UM ALUNO: as respostas dele e o campo de nota
   ========================================================================== */
function CartaoAluno({ resposta, atividade, perguntas, aberto, onAbrir, onSalvo }) {
  const [nota, setNota] = useState(resposta.nota ?? '');
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState('');

  const tipo = atividade.tipo;

  const salvarCorrecao = async () => {
    setErro('');
    const valor = nota === '' ? null : Number(nota);

    if (valor !== null && (isNaN(valor) || valor < 0 || valor > 10)) {
      setErro('A nota precisa ser de 0 a 10.');
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch(`http://localhost:3001/professor/resposta/${resposta.id}/corrigir`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ nota: valor })
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.erro || 'Não foi possível salvar.');
        return;
      }

      onSalvo(resposta.id, { nota: valor, corrigido: valor !== null });
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    } catch {
      setErro('Sem conexão com o servidor.');
    } finally {
      setSalvando(false);
    }
  };

  // Monta a lista de "pergunta → o que o aluno marcou"
  const linhas = () => {
    if (tipo === 'quiz') {
      return perguntas.map((pergunta, i) => {
        const alternativas = pergunta.alternativas || [];
        const escolhidas = resposta.resposta?.respostas?.[i] ?? resposta.resposta?.respostas?.[String(i)] ?? [];
        const corretas = alternativas.map((a, idx) => (a.correta ? idx : null)).filter(x => x !== null);

        const acertou =
          Array.isArray(escolhidas) &&
          corretas.length === escolhidas.length &&
          corretas.every(c => escolhidas.includes(c));

        const textoEscolhido = Array.isArray(escolhidas) && escolhidas.length > 0
          ? escolhidas.map(idx => `${LETRAS[idx]}. ${alternativas[idx]?.texto || ''}`).join(' · ')
          : null;

        const textoCorreto = corretas.map(idx => `${LETRAS[idx]}. ${alternativas[idx]?.texto || ''}`).join(' · ');

        return {
          pergunta: pergunta.texto || `Pergunta ${i + 1}`,
          escolha: textoEscolhido,
          correto: textoCorreto,
          estado: textoEscolhido === null ? 'branco' : acertou ? 'certo' : 'errado',
        };
      });
    }

    if (tipo === 'v_f') {
      return perguntas.map((pergunta, i) => {
        const item = Array.isArray(resposta.resposta) ? resposta.resposta[i] : null;
        const valor = item?.resposta_aluno;
        const nomes = { V: 'Verdadeiro', F: 'Falso' };

        return {
          pergunta: pergunta.texto || `Pergunta ${i + 1}`,
          escolha: nomes[valor] || null,
          correto: nomes[pergunta.resposta_correta] || '',
          estado: !valor ? 'branco' : valor === pergunta.resposta_correta ? 'certo' : 'errado',
        };
      });
    }

    return [];
  };

  const detalhes = linhas();

  // Pintura e resposta aberta não têm gabarito: mostra o que o aluno mandou
  const conteudoLivre = () => {
    const r = resposta.resposta;
    if (!r) return null;
    if (typeof r === 'string' && r.startsWith('http')) {
      return <img className="resposta-imagem" src={r} alt="Resposta do aluno" />;
    }
    if (typeof r === 'string') return <p className="resposta-texto">{r}</p>;
    if (r.url || r.imagem) {
      return <img className="resposta-imagem" src={r.url || r.imagem} alt="Resposta do aluno" />;
    }
    if (r.texto) return <p className="resposta-texto">{r.texto}</p>;
    return <pre className="resposta-bruta">{JSON.stringify(r, null, 2)}</pre>;
  };

  const acertos = detalhes.filter(d => d.estado === 'certo').length;

  return (
    <article className={`aluno-card ${aberto ? 'aberto' : ''}`}>
      <button className="aluno-card-topo" onClick={onAbrir}>
        <span className="aluno-card-inicial">{resposta.nome_aluno?.charAt(0).toUpperCase()}</span>

        <div className="aluno-card-nome">
          <strong>{resposta.nome_aluno}</strong>
          <span>Enviado em {formatarData(resposta.criado_em, true) || 'data não registrada'}</span>
        </div>

        {detalhes.length > 0 && (
          <span className="aluno-card-acertos">{acertos} de {detalhes.length}</span>
        )}

        <span className={`aluno-card-situacao ${resposta.corrigido ? 'ok' : ''}`}>
          {resposta.corrigido ? `Nota ${resposta.nota}` : 'Sem nota'}
        </span>

        <ChevronRight className="aluno-card-seta" size={18} strokeWidth={2} />
      </button>

      {aberto && (
        <div className="aluno-card-corpo">
          {detalhes.length > 0 ? (
            <ol className="prova-lista">
              {detalhes.map((d, i) => (
                <li key={i} className={`prova-item ${d.estado}`}>
                  <span className="prova-marca">
                    {d.estado === 'certo'  && <Check size={14} strokeWidth={3} />}
                    {d.estado === 'errado' && <X size={14} strokeWidth={3} />}
                    {d.estado === 'branco' && <Minus size={14} strokeWidth={3} />}
                  </span>
                  <div>
                    <p className="prova-pergunta">{d.pergunta}</p>
                    <p className="prova-resposta">
                      {d.escolha
                        ? <>Marcou: <strong>{d.escolha}</strong></>
                        : <em>Deixou em branco</em>}
                    </p>
                    {d.estado !== 'certo' && d.correto && (
                      <p className="prova-gabarito">Correto: {d.correto}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="resposta-livre">{conteudoLivre()}</div>
          )}

          <div className="correcao-barra">
            <label className="correcao-campo">
              <span>Nota (0 a 10)</span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="—"
              />
            </label>

            <button className="btn-acao-rapida destaque" onClick={salvarCorrecao} disabled={salvando}>
              <Save size={16} strokeWidth={2} />
              {salvando ? 'Salvando...' : salvo ? 'Salvo' : 'Salvar correção'}
            </button>

            {nota !== '' && (
              <button
                className="btn-acao-rapida"
                onClick={() => { setNota(''); }}
                disabled={salvando}
              >
                Limpar
              </button>
            )}

            {erro && <span className="correcao-erro">{erro}</span>}
          </div>
        </div>
      )}
    </article>
  );
}

export default RelatorioAtividade;
