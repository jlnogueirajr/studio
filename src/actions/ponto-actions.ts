'use server';
/**
 * Server Action que realiza a consulta COMPLETA do mês no portal.
 * Implementa a lógica de navegação em calendário do script Python de forma robusta.
 */

import https from 'https';

const TARGET_URL = "https://webapp.confianca.com.br/consultaponto/ponto.aspx";

/**
 * Extrai todos os campos de formulário (inputs) de forma robusta,
 * independente da ordem dos atributos name/value ou tipo de aspas.
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
 * Extrai horários (HH:MM) de dentro da tabela "Grid".
 */
function extractTimes(html: string): string[] {
  const times: string[] = [];
  // Foca na área da tabela Grid para evitar pegar horários de outros lugares (como rodapés)
  const gridMatch = html.match(/id="Grid"[\s\S]*?<\/table>/i);
  const searchArea = gridMatch ? gridMatch[0] : html;
  
  const timeRegex = /([0-2][0-9]:[0-5][0-9])/g;
  let match;
  while ((match = timeRegex.exec(searchArea)) !== null) {
    times.push(match[1]);
  }
  // Remove duplicatas (comum se houver erro de renderização no portal)
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
    // 1. GET Inicial para obter VIEWSTATE e Cookies de sessão
    const responseGet = await fetch(TARGET_URL, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      // @ts-ignore
      agent
    });
    
    let html = await responseGet.text();
    let cookies: string[] = responseGet.headers.getSetCookie();

    const calendarMap = extractCalendarMap(html, month);
    const daysToFetch = Object.keys(calendarMap).map(Number).sort((a, b) => a - b);

    // 2. Itera sobre os dias do mês até hoje (ou fim do mês consultado)
    const today = new Date();
    const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;
    const lastDayToFetch = isCurrentMonth ? today.getDate() : 31;

    for (const day of daysToFetch) {
      if (day > lastDayToFetch) break;

      const dayArg = calendarMap[day];
      const inputs = extractAllInputs(html);
      
      const body = new URLSearchParams();
      Object.entries(inputs).forEach(([k, v]) => body.append(k, v));
      
      // Simula clique no dia do calendário (necessário para atualizar o contexto do servidor)
      body.set('__EVENTTARGET', 'Calendar');
      body.set('__EVENTARGUMENT', dayArg);
      body.set('txtMatricula', matricula);
      body.set('ScriptManager1', 'UpdatePanel1|Calendar');

      const respDay = await fetch(TARGET_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies.join('; '),
          'User-Agent': 'Mozilla/5.0'
        },
        // @ts-ignore
        agent,
        body: body.toString()
      });
      
      html = await respDay.text();
      // Atualiza cookies se houver novos
      const newDayCookies = respDay.headers.getSetCookie();
      if (newDayCookies.length > 0) cookies = [...new Set([...cookies, ...newDayCookies])];

      // 3. Clica em "Consultar" para carregar o Grid de horários do dia selecionado
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
      
      // Prepara o HTML para a próxima iteração (próximo dia)
      html = htmlFinal;
      const newFinalCookies = respFinal.headers.getSetCookie();
      if (newFinalCookies.length > 0) cookies = [...new Set([...cookies, ...newFinalCookies])];
    }

    return results;
  } catch (error: any) {
    console.error("Erro na consulta mensal:", error);
    throw new Error(error.message || "Falha ao consultar mês completo.");
  }
}
