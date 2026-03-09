/**
 * Utilitários para cálculo de horas de ponto, seguindo a lógica do PontoBot.
 * Inclui fator de redução de hora noturna (52.5 min = 60 min) para o período entre 22:00 e 05:00.
 */

export function timeToMinutes(time: string): number {
  if (!time || !time.includes(':')) return 0;
  const isNegative = time.startsWith('-');
  const parts = time.replace('-', '').split(':').map(Number);
  const total = (parts[0] || 0) * 60 + (parts[1] || 0);
  return isNegative ? -total : total;
}

export function minutesToTime(totalMinutes: number, showSign = false): string {
  const isNegative = totalMinutes < 0;
  const absoluteMinutes = Math.abs(totalMinutes);
  const h = Math.floor(absoluteMinutes / 60);
  const m = absoluteMinutes % 60;
  const sign = showSign ? (isNegative ? '-' : '+') : '';
  return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Calcula os minutos trabalhados no dia com o fator noturno (1.1428x entre 22h e 05h).
 */
export function calculateDailyWorkedMinutes(entryTimes: string[], exitTimes: string[]): number {
  let totalWorked = 0;
  const NIGHT_FACTOR = 60 / 52.5; // Aproximadamente 1.142857

  const pairsCount = Math.min(entryTimes.length, exitTimes.length);

  for (let i = 0; i < pairsCount; i++) {
    let start = timeToMinutes(entryTimes[i]);
    let end = timeToMinutes(exitTimes[i]);

    // Se a saída for antes da entrada (ex: 23:00 às 06:00), end vira dia seguinte
    if (end < start) {
      end += 24 * 60;
    }

    const totalDuration = end - start;
    let nightMinutes = 0;

    // Período noturno principal: 22:00 às 29:00 (05:00 do dia seguinte)
    const nightRangeStart = 22 * 60;
    const nightRangeEnd = 29 * 60;

    const intersectionStart = Math.max(start, nightRangeStart);
    const intersectionEnd = Math.min(end, nightRangeEnd);

    if (intersectionStart < intersectionEnd) {
      nightMinutes += (intersectionEnd - intersectionStart);
    }

    // Período noturno inicial (se o turno começou antes das 05:00 do dia atual)
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
