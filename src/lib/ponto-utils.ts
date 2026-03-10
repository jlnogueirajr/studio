
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
 * Determina se uma data específica é DSR (Folga).
 * Aceita dias fixos da semana e uma lógica rotativa para domingos (1 folga, 2 trabalhos).
 */
export function isDateDsr(
  date: Date,
  fixedDsrDays: number[],
  referenceSunday?: string | null
): boolean {
  const dayOfWeek = date.getDay();

  // Se for um dos dias fixos (ex: sábado), é DSR.
  if (fixedDsrDays.includes(dayOfWeek)) {
    // Se for domingo e tiver lógica rotativa, tratamos separado abaixo
    if (dayOfWeek !== 0) return true;
  }

  // Lógica Rotativa de Domingo (1 folga, 2 trabalhos)
  if (dayOfWeek === 0 && referenceSunday) {
    const refDate = new Date(referenceSunday);
    // Zeramos as horas para comparar apenas datas
    refDate.setHours(0, 0, 0, 0);
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);

    const diffInTime = currentDate.getTime() - refDate.getTime();
    const diffInDays = Math.round(diffInTime / (1000 * 3600 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);

    // Se a diferença de semanas for múltiplo de 3, é folga.
    return diffInWeeks % 3 === 0;
  }

  // Se for domingo e não tiver lógica rotativa, mas estiver nos fixos
  if (dayOfWeek === 0 && fixedDsrDays.includes(0)) return true;

  return false;
}

/**
 * Ordena horários do dia. 
 */
export function sortPontoHours(hours: string[]): string[] {
  if (!hours || hours.length === 0) return [];
  
  const sorted = [...hours].sort((a, b) => {
      const minA = timeToMinutes(a);
      const minB = timeToMinutes(b);
      const isAMad = minA < 300; 
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
  const NIGHT_FACTOR = 60 / 52.5; 

  const pairsCount = Math.min(entryTimes.length, exitTimes.length);

  for (let i = 0; i < pairsCount; i++) {
    let start = timeToMinutes(entryTimes[i]);
    let end = timeToMinutes(exitTimes[i]);

    if (end < start) end += 24 * 60;

    const totalDuration = end - start;
    let nightMinutes = 0;

    const nightStart = 22 * 60;
    const nightEnd = 29 * 60; 
    
    const intersectionStart = Math.max(start, nightStart);
    const intersectionEnd = Math.min(end, nightEnd);
    
    if (intersectionStart < intersectionEnd) {
      nightMinutes += (intersectionEnd - intersectionStart);
    }

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
