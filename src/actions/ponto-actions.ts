
'use server';
/**
 * Server Action que realiza a consulta COMPLETA do mês no portal.
 * Suporta extração de dados de respostas parciais (Delta) do ASP.NET AJAX.
 */

import https from 'https';

/**
 * Extrai campos ocultos de um HTML completo ou de uma resposta Delta AJAX.
 */
function updateFields(html: string, currentFields: Record<string, string>): Record<string, string> {
  const fields = { ...currentFields };
  
  // Se for uma resposta Delta (formato: |length|type|id|content|)
  if (html.includes('|')) {
    const parts = html.split('|');
    for (let i = 0; i < parts.length; i++) {
      // Campos ocultos comuns no Delta
      if (parts[i] === 'hiddenField') {
        const name = parts[i + 1];
        const value = parts[i + 2];
        if (name) fields[name] = value;
      }
      // ViewState e outros campos específicos podem vir em blocos nomeados
      if (['__VIEWSTATE', '__EVENTVALIDATION', '__VIEWSTATEGENERATOR'].includes(parts[i])) {
        fields[parts[i]] = parts[i + 1];
      }
    }
    return fields;
  }

  // Se for HTML completo
  const regex = /id="(__\w+)"\s+value="([^"]*)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    fields[match[1]] = match[2];
  }
  return fields;
}

/**
 * Extrai horários (HH:MM) da tabela 'Grid'.
 */
function extractTimesFromGrid(html: string): string[] {
  const times: string[] = [];
  // Busca especificamente dentro da área onde o Grid costuma aparecer
  const gridMatch = html.match(/id="Grid"[\s\S]*?<\/table>/i);
  const content = gridMatch ? gridMatch[0] : html;

  // Regex flexível para capturar HH:MM
  const timeRegex = />\s*([0-2]?\d:[0-5]\d)\s*</g;
  let match;
  while ((match = timeRegex.exec(content)) !== null) {
    times.push(match[1]);
  }
  return Array.from(new Set(times));
}

/**
 * Mapeia os argumentos do PostBack para cada dia do calendário.
 */
function extractCalendarArguments(html: string, targetMonth: number): Record<number, string> {
  const map: Record<number, string> = {};
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
  // Ignora erros de certificado SSL para o portal interno
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const results: { date: string, times: string[] }[] = [];
  const TARGET_URL = "https://webapp.confianca.com.br/consultaponto/ponto.aspx";

  try {
    const responseGet = await fetch(TARGET_URL, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    let html = await responseGet.text();
    let cookies = responseGet.headers.getSetCookie();
    let hiddenFields = updateFields(html, {});

    const calendarArgs = extractCalendarArguments(html, month);
    const daysToFetch = Object.keys(calendarArgs).map(Number).sort((a, b) => a - b);

    if (daysToFetch.length === 0) {
      throw new Error("Não foi possível localizar o calendário. Verifique a matrícula.");
    }

    const today = new Date();
    const isPastMonth = year < today.getFullYear() || (year === today.getFullYear() && month < (today.getMonth() + 1));
    const lastDayToFetch = isPastMonth ? 31 : today.getDate();

    for (const day of daysToFetch) {
      if (day > lastDayToFetch) break;

      const dayArg = calendarArgs[day];
      
      // Passo 1: Selecionar o dia no calendário
      const bodyDay = new URLSearchParams();
      Object.entries(hiddenFields).forEach(([k, v]) => bodyDay.append(k, v));
      bodyDay.set('__EVENTTARGET', 'Calendar');
      bodyDay.set('__EVENTARGUMENT', dayArg);
      bodyDay.set('txtMatricula', matricula);
      bodyDay.set('ScriptManager1', 'UpdatePanel1|Calendar');

      const respDay = await fetch(TARGET_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies.join('; '),
          'X-MicrosoftAjax': 'Delta=true'
        },
        body: bodyDay.toString()
      });
      
      const deltaHtmlDay = await respDay.text();
      hiddenFields = updateFields(deltaHtmlDay, hiddenFields);
      
      const newCookies = respDay.headers.getSetCookie();
      if (newCookies.length > 0) cookies = newCookies;

      // Passo 2: Clicar em Consultar para o dia
      const bodyConsultar = new URLSearchParams();
      Object.entries(hiddenFields).forEach(([k, v]) => bodyConsultar.append(k, v));
      bodyConsultar.set('__EVENTTARGET', 'btnConsultar');
      bodyConsultar.set('txtMatricula', matricula);
      bodyConsultar.set('ScriptManager1', 'UpdatePanel1|btnConsultar');

      const respFinal = await fetch(TARGET_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies.join('; '),
          'X-MicrosoftAjax': 'Delta=true'
        },
        body: bodyConsultar.toString()
      });
      
      const deltaHtmlFinal = await respFinal.text();
      const times = extractTimesFromGrid(deltaHtmlFinal);

      if (times.length > 0) {
        results.push({
          date: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`,
          times
        });
      }
      
      hiddenFields = updateFields(deltaHtmlFinal, hiddenFields);
    }

    return results;
  } catch (error: any) {
    console.error("Erro na consulta do mês:", error);
    throw new Error(error.message || "Falha ao conectar com o portal.");
  }
}
