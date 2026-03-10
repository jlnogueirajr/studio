'use server';
/**
 * Server Action que realiza a consulta COMPLETA do mês no portal.
 * Implementa a lógica de navegação em calendário do script Python.
 */

import https from 'https';

const TARGET_URL = "https://webapp.confianca.com.br/consultaponto/ponto.aspx";

function extractAllInputs(html: string) {
  const inputs: Record<string, string> = {};
  const inputRegex = /<input\s+[^>]*?name="([^"]+?)"[^>]*?value="([^"]*?)"/gi;
  let match;
  while ((match = inputRegex.exec(html)) !== null) {
    inputs[match[1]] = match[2];
  }
  return inputs;
}

function extractTimes(html: string): string[] {
  const times: string[] = [];
  const tableMatch = html.match(/<table[^>]*?id="Grid"[\s\S]*?<\/table>/i);
  if (tableMatch) {
    const tableHtml = tableMatch[0];
    const cellRegex = /<td[^>]*?>\s*([0-2][0-9]:[0-5][0-9])\s*<\/td>/gi;
    let match;
    while ((match = cellRegex.exec(tableHtml)) !== null) {
      times.push(match[1]);
    }
  }
  return Array.from(new Set(times));
}

/**
 * Extrai o mapeamento de dias do calendário HTML.
 * Busca links do tipo javascript:__doPostBack('Calendar','XXXX')
 */
function extractCalendarMap(html: string, targetMonth: number): Record<number, string> {
  const map: Record<number, string> = {};
  // Mapeia links do calendário: title="9 de março" -> '9564'
  const linkRegex = /href="javascript:__doPostBack\('Calendar','(\w+)'\)"[^>]*?title="(\d+)\s+de\s+([^"]+)"/gi;
  let match;
  const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const targetMonthName = monthNames[targetMonth - 1];

  while ((match = linkRegex.exec(html)) !== null) {
    const arg = match[1];
    const day = parseInt(match[2]);
    const month = match[3].toLowerCase();
    
    if (month.includes(targetMonthName)) {
      map[day] = arg;
    }
  }
  return map;
}

export async function fetchMonthData(matricula: string, month: number, year: number) {
  const agent = new https.Agent({ rejectUnauthorized: false });
  const results: { date: string, times: string[] }[] = [];

  try {
    // 1. GET Inicial
    const responseGet = await fetch(TARGET_URL, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      // @ts-ignore
      agent
    });
    let html = await responseGet.text();
    let setCookie = responseGet.headers.get('set-cookie');
    let cookies = setCookie ? setCookie.split(',').map(c => c.split(';')[0]).join('; ') : '';

    // 2. Mapeia o calendário
    const calendarMap = extractCalendarMap(html, month);
    const daysToFetch = Object.keys(calendarMap).map(Number).sort((a, b) => a - b);

    // 3. Itera sobre os dias do mês até hoje
    const today = new Date();
    const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;
    const lastDayToFetch = isCurrentMonth ? today.getDate() : 31;

    for (const day of daysToFetch) {
      if (day > lastDayToFetch) break;

      const dayArg = calendarMap[day];
      const allInputs = extractAllInputs(html);
      const body = new URLSearchParams();
      Object.entries(allInputs).forEach(([k, v]) => body.append(k, v));
      
      // Simula clique no dia do calendário
      body.set('ScriptManager1', 'UpdatePanel1|Calendar');
      body.set('__EVENTTARGET', 'Calendar');
      body.set('__EVENTARGUMENT', dayArg);
      body.set('txtMatricula', matricula);

      const respDay = await fetch(TARGET_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies,
          'User-Agent': 'Mozilla/5.0'
        },
        // @ts-ignore
        agent,
        body: body.toString()
      });
      html = await respDay.text();

      // Agora clica em Consultar para esse dia
      const inputsPost = extractAllInputs(html);
      const bodyConsultar = new URLSearchParams();
      Object.entries(inputsPost).forEach(([k, v]) => bodyConsultar.append(k, v));
      bodyConsultar.set('__EVENTTARGET', 'btnConsultar');
      bodyConsultar.set('txtMatricula', matricula);

      const respFinal = await fetch(TARGET_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies,
          'User-Agent': 'Mozilla/5.0'
        },
        // @ts-ignore
        agent,
        body: bodyConsultar.toString()
      });
      const htmlFinal = await respFinal.text();
      const times = extractTimes(htmlFinal);

      results.push({
        date: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`,
        times
      });
    }

    return results;
  } catch (error: any) {
    console.error("Erro na consulta mensal:", error);
    throw new Error(error.message || "Falha ao consultar mês completo.");
  }
}
