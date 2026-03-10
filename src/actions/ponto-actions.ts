
'use server';
/**
 * Server Action que realiza a consulta COMPLETA do mês no portal.
 * Refinado para capturar horários em tabelas ASP.NET dinâmicas.
 */

import https from 'https';

const TARGET_URL = "https://webapp.confianca.com.br/consultaponto/ponto.aspx";

/**
 * Extrai todos os campos de formulário (inputs) de forma robusta.
 */
function extractAllInputs(html: string) {
  const inputs: Record<string, string> = {};
  const inputRegex = /<input[^>]+>/gi;
  let match;
  while ((match = inputRegex.exec(html)) !== null) {
    const tag = match[0];
    const nameMatch = tag.match(/name=["']([^"']+)["']/i);
    const valueMatch = tag.match(/value=["']([^"']*)["']/i);
    if (nameMatch) {
      inputs[nameMatch[1]] = valueMatch ? valueMatch[1] : "";
    }
  }
  return inputs;
}

/**
 * Extrai horários (HH:MM) de dentro da tabela "Grid" ou da resposta do servidor.
 * Agora mais flexível para capturar 00:20, 16:14, etc.
 */
function extractTimes(html: string): string[] {
  const times: string[] = [];
  
  // Tenta focar na área do Grid, mas se não achar (AJAX response), olha o HTML todo
  const gridMatch = html.match(/id="Grid"[\s\S]*?<\/table>/i);
  const searchArea = gridMatch ? gridMatch[0] : html;
  
  // Regex busca HH:MM dentro de tags <td> ou áreas de texto puro
  // Captura formatos como 08:00, 8:00, 00:20
  const timeRegex = />\s*([0-2]?\d:[0-5]\d)\s*</g;
  let match;
  while ((match = timeRegex.exec(searchArea)) !== null) {
    times.push(match[1]);
  }

  // Fallback: se não achar com as tags, tenta busca plana de horários isolados
  if (times.length === 0) {
    const flatRegex = /\b([0-2]?\d:[0-5]\d)\b/g;
    let flatMatch;
    while ((flatMatch = flatRegex.exec(searchArea)) !== null) {
      // Evita pegar o "07:20" da meta ou horários fixos do portal
      if (!searchArea.includes('Meta') && !searchArea.includes('Carga Horária')) {
         times.push(flatMatch[1]);
      }
    }
  }

  return Array.from(new Set(times));
}

/**
 * Extrai o mapeamento de dias do calendário HTML.
 */
function extractCalendarMap(html: string, targetMonth: number): Record<number, string> {
  const map: Record<number, string> = {};
  const linkRegex = /href="javascript:__doPostBack\('Calendar','(\w+)'\)"[^>]*?title="(\d+)\s+de\s+([^"]+)"/gi;
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
    // 1. GET Inicial
    const responseGet = await fetch(TARGET_URL, {
      method: 'GET',
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      },
      // @ts-ignore
      agent
    });
    
    let html = await responseGet.text();
    let cookies: string[] = responseGet.headers.getSetCookie();

    const calendarMap = extractCalendarMap(html, month);
    const daysToFetch = Object.keys(calendarMap).map(Number).sort((a, b) => a - b);

    if (daysToFetch.length === 0) {
      throw new Error("Não foi possível localizar o calendário do mês selecionado.");
    }

    // 2. Itera sobre os dias
    const today = new Date();
    const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;
    const lastDayToFetch = isCurrentMonth ? today.getDate() : 31;

    for (const day of daysToFetch) {
      if (day > lastDayToFetch) break;

      const dayArg = calendarMap[day];
      const inputs = extractAllInputs(html);
      
      const body = new URLSearchParams();
      Object.entries(inputs).forEach(([k, v]) => body.append(k, v));
      
      body.set('__EVENTTARGET', 'Calendar');
      body.set('__EVENTARGUMENT', dayArg);
      body.set('txtMatricula', matricula);
      body.set('ScriptManager1', 'UpdatePanel1|Calendar');

      const respDay = await fetch(TARGET_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies.join('; '),
          'User-Agent': 'Mozilla/5.0',
          'Referer': TARGET_URL
        },
        // @ts-ignore
        agent,
        body: body.toString()
      });
      
      html = await respDay.text();
      const newDayCookies = respDay.headers.getSetCookie();
      if (newDayCookies.length > 0) cookies = [...new Set([...cookies, ...newDayCookies])];

      // 3. Consultar
      const inputsConsultar = extractAllInputs(html);
      const bodyConsultar = new URLSearchParams();
      Object.entries(inputsConsultar).forEach(([k, v]) => bodyConsultar.append(k, v));
      
      bodyConsultar.set('__EVENTTARGET', 'btnConsultar');
      bodyConsultar.set('__EVENTARGUMENT', '');
      bodyConsultar.set('txtMatricula', matricula);
      bodyConsultar.set('ScriptManager1', 'UpdatePanel1|btnConsultar');

      const respFinal = await fetch(TARGET_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies.join('; '),
          'User-Agent': 'Mozilla/5.0',
          'Referer': TARGET_URL,
          'X-MicrosoftAjax': 'Delta=true'
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
      
      // Prepara próximo loop
      html = htmlFinal;
    }

    return results;
  } catch (error: any) {
    console.error("Erro na consulta mensal:", error);
    throw new Error(error.message || "Falha ao consultar portal.");
  }
}
