
/**
 * Utilitários para cálculo de horas de ponto.
 * Implementa meta diária de 07:20 e fator noturno (1.1428x entre 22h e 05h).
 */

export function timeToMinutes(time: string): number {
  if (!time || !time.includes(':')) return 0;
  const isNegative = time.startsWith('-');
  const cleanTime = time.replace(/[^0-9:-]/g, '');
  const parts = cleanTime.replace('-', '').split(':').map(Number);
  const total = (parts[0] || 0) * 60 + (parts[1] || 0);
  return isNegative ? -total : total;
}

export function minutesToTime(totalMinutes: number, showSign = false): string {
  const isNegative = totalMinutes < 0;
  const absoluteMinutes = Math.round(Math.abs(totalMinutes));
  const h = Math.floor(absoluteMinutes / 60);
  const m = absoluteMinutes % 60;
  const sign = showSign ? (isNegative ? '-' : '+') : '';
  return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Ordena horários do dia. 
 * Lógica: batidas da madrugada (< 05:00) são tratadas como fim da jornada do dia anterior,
 * garantindo que a sequência cronológica de entrada/saída seja respeitada.
 */
export function sortPontoHours(hours: string[]): string[] {
  if (!hours || hours.length === 0) return [];
  
  const sorted = [...hours].sort((a, b) => {
      const minA = timeToMinutes(a);
      const minB = timeToMinutes(b);
      
      // Se um horário é madrugada (<5h) e o outro não (>5h), a madrugada vem depois
      const isAMad = minA < 300; // 5:00 = 300min
      const isBMad = minB < 300;
      
      if (isAMad && !isBMad) return 1;
      if (!isAMad && isBMad) return -1;
      
      return minA - minB;
  });
  
  return sorted;
}

/**
 * Calcula minutos trabalhados no dia aplicando o adicional noturno.
 */
export function calculateDailyWorkedMinutes(entryTimes: string[], exitTimes: string[]): number {
  let totalWorked = 0;
  const NIGHT_FACTOR = 60 / 52.5; // Fator de hora reduzida (1.142857)

  const pairsCount = Math.min(entryTimes.length, exitTimes.length);

  for (let i = 0; i < pairsCount; i++) {
    let start = timeToMinutes(entryTimes[i]);
    let end = timeToMinutes(exitTimes[i]);

    // Se o fim for menor que o início, virou o dia (ex: 22:00 -> 02:00)
    if (end < start) end += 24 * 60;

    const totalDuration = end - start;
    let nightMinutes = 0;

    // Intervalo noturno: 22h às 05h (1320m às 1740m no tempo linear acumulado)
    const nightStart = 22 * 60;
    const nightEnd = 29 * 60; // 05h do dia seguinte (24h + 5h)
    
    // Interseção com o período noturno do dia atual/seguinte
    const intersectionStart = Math.max(start, nightStart);
    const intersectionEnd = Math.min(end, nightEnd);
    
    if (intersectionStart < intersectionEnd) {
      nightMinutes += (intersectionEnd - intersectionStart);
    }

    // Caso de batidas que começam na madrugada do dia atual (00h às 05h)
    const earlyNightEnd = 5 * 60;
    if (start < earlyNightEnd) {
        const earlyIntersectionStart = Math.max(start, 0);
        const earlyIntersectionEnd = Math.min(end, earlyNightEnd);
        if (earlyIntersectionStart < earlyIntersectionEnd) {
            nightMinutes += (earlyIntersectionEnd - earlyIntersectionStart);
        }
    }

    const dayMinutes = totalDuration - nightMinutes;
    totalWorked += dayMinutes + (nightMinutes * NIGHT_FACTOR);
  }

  return totalWorked;
}
