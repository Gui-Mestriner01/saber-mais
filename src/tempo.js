/* "47 s", "2 min 10 s", "1 h 5 min" — tempo que o aluno levou numa atividade
   (usado na revisão do aluno e no relatório do professor). */
export function formatarDuracao(segundos) {
  const s = Number(segundos);
  if (!Number.isFinite(s) || s <= 0) return null;
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const resto = s % 60;
  if (m < 60) return resto ? `${m} min ${resto} s` : `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}
