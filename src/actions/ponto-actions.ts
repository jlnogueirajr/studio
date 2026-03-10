
'use server';
/**
 * Server Action que realiza a consulta COMPLETA do mês no portal.
 * Baseado na lógica de referência para portais ASP.NET (Ponto Web).
 */

import https from 'https';

const TARGET_URL = "https://webapp.confianca.com.br/consultaponto/ponto.aspx";

/**
 * Extrai campos ocultos do formulário ASP.NET (__VIEWSTATE, __EVENTVALIDATION, etc.)
 */
function extractHiddenFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const regex = /id="(__\w+)"\s+value="([^"]*)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    fields[match[1]] = match[2];
  }
  // Fallback para campos que usam 'name' em vez de 'id'
  const nameRegex = /name="(__\w+)"\s+value="([^"]*)"/g;
  while ((match = nameRegex.exec(html)) !== null) {
    if (!fields[match[1]]) fields[match[1]] = match[2];
  }
  return fields;
}

/**
 * Extrai horários (HH:MM) especificamente da tabela 'Grid'.
 */
function extractTimesFromGrid(html: string): string[] {
  const times: string[] = [];
  // Localiza a tabela Grid
  const gridMatch = html.match(/id="Grid"[\s\S]*?<\/table>/i);
  if (!gridMatch) return [];

  const gridHtml = gridMatch[0];
  // Captura HH:MM dentro das tags <td>
  const timeRegex = />\s*([0-2]?\d:[0-5]\d)\s*</g;
  let match;
  while ((match = timeRegex.exec(gridHtml)) !== null) {
    times.push(match[1]);
  }
  return Array.from(new Set(times));
}

/**
 * Extrai o mapeamento de dias do calendário HTML para saber qual argumento de PostBack usar.
 */
function extractCalendarArguments(html: string, targetMonth: number): Record<number, string> {
  const map: Record<number, string> = {};
  // Busca links: href="javascript:__doPostBack('Calendar','ARG')" title="DIA de MES"
  const linkRegex = /href="javascript:__doPostBack\('Calendar','(\d+)'\)"[^>]*?title="(\d+)\s+de\s+([^"]+)"/gi;
  let match;
  const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const targetMonthName = monthNames[targetMonth - 1];

  while ((match = linkRegex.exec(html)) !== null) {
    const arg = match[1];
    const day = parseInt(match[2]);
    const monthStr = match[3].toLowerCase();
    
    if (monthStr.includes(targetMonthName)) {
      map[day] = arg;
    }
  }
  return map;
}

export async function fetchMonthData(matricula: string, month: number, year: number) {
  const agent = new https.Agent({ rejectUnauthorized: false });
  const results: { date: string, times: string[] }[] = [];

  try {
    // 1. GET Inicial: Obtém cookies e ViewState base
    const responseGet = await fetch(TARGET_URL, {
      method: 'GET',
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      // @ts-ignore
      agent
    });
    
    let html = await responseGet.text();
    let cookies: string[] = responseGet.headers.getSetCookie();

    const calendarArgs = extractCalendarArguments(html, month);
    const daysToFetch = Object.keys(calendarArgs).map(Number).sort((a, b) => a - b);

    if (daysToFetch.length === 0) {
      throw new Error("Não foi possível localizar o calendário para o mês selecionado.");
    }

    // 2. Itera sobre os dias do mês
    const today = new Date();
    const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;
    const lastDayToFetch = isCurrentMonth ? today.getDate() : 31;

    for (const day of daysToFetch) {
      if (day > lastDayToFetch) break;

      const dayArg = calendarArgs[day];
      let hiddenFields = extractHiddenFields(html);
      
      const bodyDay = new URLSearchParams();
      Object.entries(hiddenFields).forEach(([k, v]) => bodyDay.append(k, v));
      bodyDay.set('__EVENTTARGET', 'Calendar');
      bodyDay.set('__EVENTARGUMENT', dayArg);
      bodyDay.set('txtMatricula', matricula);
      bodyDay.set('ScriptManager1', 'UpdatePanel1|Calendar');

      // POST 1: Selecionar o dia no calendário
      const respDay = await fetch(TARGET_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies.join('; '),
          'Referer': TARGET_URL,
          'User-Agent': 'Mozilla/5.0'
        },
        // @ts-ignore
        agent,
        body: bodyDay.toString()
      });
      
      html = await respDay.text();
      const newCookies = respDay.headers.getSetCookie();
      if (newCookies.length > 0) cookies = [...new Set([...cookies, ...newCookies])];

      // POST 2: Clicar em Consultar (btnConsultar)
      hiddenFields = extractHiddenFields(html);
      const bodyConsultar = new URLSearchParams();
      Object.entries(hiddenFields).forEach(([k, v]) => bodyConsultar.append(k, v));
      
      bodyConsultar.set('__EVENTTARGET', 'btnConsultar');
      bodyConsultar.set('__EVENTARGUMENT', '');
      bodyConsultar.set('txtMatricula', matricula);
      bodyConsultar.set('ScriptManager1', 'UpdatePanel1|btnConsultar');

      const respFinal = await fetch(TARGET_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies.join('; '),
          'Referer': TARGET_URL,
          'User-Agent': 'Mozilla/5.0',
          'X-MicrosoftAjax': 'Delta=true'
        },
        // @ts-ignore
        agent,
        body: bodyConsultar.toString()
      });
      
      const htmlFinal = await respFinal.text();
      const times = extractTimesFromGrid(htmlFinal);

      results.push({
        date: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`,
        times
      });
      
      // Atualiza o HTML para o próximo loop (mantém ViewState atualizado)
      html = htmlFinal;
    }

    return results;
  } catch (error: any) {
    console.error("Erro na consulta do mês:", error);
    throw new Error(error.message || "Falha ao consultar portal.");
  }
}
