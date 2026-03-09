/**
 * Utilitários para cálculo de horas de ponto, seguindo a lógica do PontoBot.
 * Inclui fator de redução de hora noturna (52.5 min = 60 min) para o período entre 22:00 e 05:00.
 */

export function timeToMinutes(time: string): number {
  if (!time || !time.includes(':')) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number, showSign = false): string {
  const isNegative = totalMinutes < 0;
  const absoluteMinutes = Math.abs(totalMinutes);
  const h = Math.floor(absoluteMinutes / 60);
  const m = absoluteMinutes % 60;
  const sign = showSign ? (isNegative ? '-' : '+') : '';
  return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function calculateDailyWorkedMinutes(entryTimes: string[], exitTimes: string[]): number {
  let totalWorked = 0;
  const NIGHT_START = 22 * 60; // 22:00
  const NIGHT_END = 5 * 60;   // 05:00 (dia seguinte seria NIGHT_END + 24*60)
  const NIGHT_FACTOR = 60 / 52.5;

  const pairsCount = Math.min(entryTimes.length, exitTimes.length);

  for (let i = 0; i < pairsCount; i++) {
    let start = timeToMinutes(entryTimes[i]);
    let end = timeToMinutes(exitTimes[i]);

    // Se a saída for antes da entrada, assumimos que virou o dia
    if (end < start) {
      end += 24 * 60;
    }

    // Cálculo do período trabalhado bruto
    const totalDuration = end - start;

    // Cálculo da intersecção com o período noturno (22:00 às 05:00 do dia seguinte)
    // Período noturno 1: 22:00 (dia 1) às 05:00 (dia 2)
    const nightRangeStart = 22 * 60;
    const nightRangeEnd = (24 + 5) * 60;

    const intersectionStart = Math.max(start, nightRangeStart);
    const intersectionEnd = Math.min(end, nightRangeEnd);

    let nightMinutes = 0;
    if (intersectionStart < intersectionEnd) {
      nightMinutes = intersectionEnd - intersectionStart;
    }

    // Se o turno começou antes das 05:00 do dia 1 (ex: começou às 04:00)
    const earlyNightRangeStart = 0;
    const earlyNightRangeEnd = 5 * 60;
    const earlyIntersectionStart = Math.max(start, earlyNightRangeStart);
    const earlyIntersectionEnd = Math.min(end, earlyNightRangeEnd);

    if (earlyIntersectionStart < earlyIntersectionEnd) {
      nightMinutes += (earlyIntersectionEnd - earlyIntersectionStart);
    }

    const dayMinutes = totalDuration - nightMinutes;
    totalWorked += dayMinutes + (nightMinutes * NIGHT_FACTOR);
  }

  return Math.round(totalWorked);
}

export function calculateBalance(workedMinutes: number, goalMinutes: number): number {
  return workedMinutes - goalMinutes;
}
