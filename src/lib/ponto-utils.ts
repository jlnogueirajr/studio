/**
 * Utilitários para cálculos de jornada CLT brasileira.
 * Implementa meta diária variável, fator noturno (1.1428x entre 22h e 05h) e feriados.
 */

export const FATOR_NOTURNO = 60 / 52.5; // 1.142857...

// Lista de feriados nacionais fixos (YYYY-MM-DD) para 2024 e 2025
const NATIONAL_HOLIDAYS = [
  '2024-01-01', '2024-03-29', '2024-04-21', '2024-05-01', '2024-05-30', 
  '2024-09-07', '2024-10-12', '2024-11-02', '2024-11-15', '2024-11-20', '2024-12-25',
  '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-01', '2025-06-19', 
  '2025-09-07', '2025-10-12', '2025-11-02', '2025-11-15', '2025-11-20', '2025-12-25'
];

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
 * Calcula a interseção entre um período trabalhado e a janela noturna (22:00 - 05:00).
 */
export function calculateNightMinutes(start: number, end: number): number {
  const nightStart = 22 * 60; // 1320
  const nightEnd = 29 * 60;   // 1740 (05:00 do dia seguinte)

  let adjustedEnd = end;
  if (end < start) adjustedEnd += 1440;

  const intersectionStart = Math.max(start, nightStart);
  const intersectionEnd = Math.min(adjustedEnd, nightEnd);
  const nightMinutes = Math.max(0, intersectionEnd - intersectionStart);
  
  const earlyNightStart = 0;
  const earlyNightEnd = 5 * 60; // 300
  const earlyIntersectionStart = Math.max(start, earlyNightStart);
  const earlyIntersectionEnd = Math.min(adjustedEnd, earlyNightEnd);
  const earlyNightMinutes = Math.max(0, earlyIntersectionEnd - earlyIntersectionStart);

  return nightMinutes + earlyNightMinutes;
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
  
  const isHoliday = NATIONAL_HOLIDAYS.includes(dateStr) || holidays.includes(dateStr);

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
    // Batidas de madrugada (ex: 00:30) devem aparecer no final da lista se houver batidas de tarde/noite
    const isAMad = minA < 360; // Antes das 06:00
    const isBMad = minB < 360;
    if (isAMad && !isBMad) return 1;
    if (!isAMad && isBMad) return -1;
    return minA - minB;
  });
}

/**
 * Normaliza registros para turnos noturnos.
 * Se um dia começa com batidas de madrugada e o dia anterior terminou ímpar, move para o anterior.
 */
export function normalizeNightShifts(records: any[]): any[] {
  // Ordena cronologicamente para processar a sequência
  const sorted = [...records].sort((a, b) => {
    const [dA, mA, yA] = a.date.split('/').map(Number);
    const [dB, mB, yB] = b.date.split('/').map(Number);
    return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
  });

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    // Se o dia anterior tem número ímpar de batidas (turno aberto)
    if (prev.times && prev.times.length % 2 !== 0) {
      // Procura batidas na madrugada do dia atual (antes das 06:00)
      const madTimes = curr.times.filter((t: string) => timeToMinutes(t) < 360);
      if (madTimes.length > 0) {
        // Pega a batida mais cedo da madrugada para fechar o turno anterior
        const earliest = madTimes.sort((a: string, b: string) => timeToMinutes(a) - timeToMinutes(b))[0];
        prev.times.push(earliest);
        curr.times = curr.times.filter((t: string) => t !== earliest);
      }
    }
  }

  return sorted;
}

/**
 * Calcula o tempo trabalhado total do dia incluindo Hora Ficta Noturna.
 */
export function calculateDailyWorkedMinutes(entryTimes: string[], exitTimes: string[]): number {
  let totalMinutes = 0;
  let nightMinutesRaw = 0;
  const pairsCount = Math.min(entryTimes.length, exitTimes.length);

  for (let i = 0; i < pairsCount; i++) {
    const start = timeToMinutes(entryTimes[i]);
    let end = timeToMinutes(exitTimes[i]);
    
    // Tratamento de meia-noite
    const adjustedEnd = end < start ? end + 1440 : end;
    
    totalMinutes += (adjustedEnd - start);
    nightMinutesRaw += calculateNightMinutes(start, adjustedEnd);
  }

  const nightMinutesFicta = Math.round(nightMinutesRaw * (FATOR_NOTURNO - 1));
  return totalMinutes + nightMinutesFicta;
}
