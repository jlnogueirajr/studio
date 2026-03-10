
/**
 * Utilitários para cálculo de horas de ponto.
 * Implementa meta diária variável e fator noturno (1.1428x entre 22h e 05h).
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
 * Determina se uma data específica é DSR (Folga) ou Feriado.
 */
export function isDateDsr(
  date: Date,
  fixedDsrDays: number[],
  referenceSunday?: string | null,
  holidays: string[] = []
): { isDsr: boolean; isHoliday: boolean } {
  const dayOfWeek = date.getDay();
  const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  
  const isHoliday = holidays.includes(dateStr);

  // Lógica Rotativa de Domingo (1 folga, 2 trabalhos)
  let isSundayDsr = false;
  if (dayOfWeek === 0 && referenceSunday) {
    const refDate = new Date(referenceSunday);
    refDate.setHours(0, 0, 0, 0);
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);
    const diffInWeeks = Math.floor((currentDate.getTime() - refDate.getTime()) / (1000 * 3600 * 24 * 7));
    isSundayDsr = diffInWeeks % 3 === 0;
  } else if (dayOfWeek === 0) {
    isSundayDsr = fixedDsrDays.includes(0);
  }

  const isDsr = isSundayDsr || (fixedDsrDays.includes(dayOfWeek) && dayOfWeek !== 0);

  return { isDsr, isHoliday };
}

export function sortPontoHours(hours: string[]): string[] {
  if (!hours || hours.length === 0) return [];
  return [...hours].sort((a, b) => {
    const minA = timeToMinutes(a);
    const minB = timeToMinutes(b);
    const isAMad = minA < 300; 
    const isBMad = minB < 300;
    if (isAMad && !isBMad) return 1;
    if (!isAMad && isBMad) return -1;
    return minA - minB;
  });
}

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
    if (intersectionStart < intersectionEnd) nightMinutes += (intersectionEnd - intersectionStart);
    const earlyNightEnd = 5 * 60;
    if (start < earlyNightEnd) {
        const earlyIntersectionStart = Math.max(start, 0);
        const earlyIntersectionEnd = Math.min(end, earlyNightEnd);
        if (earlyIntersectionStart < earlyIntersectionEnd) nightMinutes += (earlyIntersectionEnd - earlyIntersectionStart);
    }
    totalWorked += (totalDuration - nightMinutes) + (nightMinutes * NIGHT_FACTOR);
  }
  return totalWorked;
}
