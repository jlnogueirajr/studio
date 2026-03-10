
'use server';
/**
 * Server Action que realiza a consulta ao portal da empresa.
 * Implementa a lógica EXATA do script Python:
 * 1. Captura de tokens ASP.NET (__VIEWSTATE, etc.)
 * 2. Simulação de clique no botão Consultar
 * 3. Extração de horários via Regex (sem depender de API de IA)
 */

import https from 'https';

const TARGET_URL = "https://webapp.confianca.com.br/consultaponto/ponto.aspx";

/**
 * Extrai todos os inputs ocultos vitais para o funcionamento do ASP.NET.
 */
function extractAllInputs(html: string) {
  const inputs: Record<string, string> = {};
  const inputRegex = /<input\s+[^>]*?name="([^"]+?)"[^>]*?value="([^"]*?)"/gi;
  let match;
  while ((match = inputRegex.exec(html)) !== null) {
    inputs[match[1]] = match[2];
  }
  return inputs;
}

/**
 * Extrai os horários do HTML usando a lógica do Python (Regex).
 */
function extractTimesPythonStyle(html: string): string[] {
  const times: string[] = [];
  
  // 1. Tenta extrair da tabela 'Grid' específica
  const tableMatch = html.match(/<table[^>]*?id="Grid"[\s\S]*?<\/table>/i);
  if (tableMatch) {
    const tableHtml = tableMatch[0];
    const cellRegex = /<td[^>]*?>\s*([0-2][0-9]:[0-5][0-9])\s*<\/td>/gi;
    let match;
    while ((match = cellRegex.exec(tableHtml)) !== null) {
      times.push(match[1]);
    }
  }

  // 2. Fallback: Regex global (mesmo do script Python) caso a tabela mude
  if (times.length === 0) {
    const globalRegex = /(?<!\d)([0-1][0-9]|2[0-3]):([0-5][0-9])(?!\d)/g;
    const matches = html.match(globalRegex);
    if (matches) return Array.from(new Set(matches));
  }

  return times;
}

export async function fetchAndExtractPonto(matricula: string) {
  // Agente para ignorar erros de SSL (verify=False do Python)
  const agent = new https.Agent({
    rejectUnauthorized: false
  });

  try {
    // Passo 1: GET Inicial para pegar os cookies e tokens de estado (__VIEWSTATE)
    const responseGet = await fetch(TARGET_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      // @ts-ignore
      agent,
      cache: 'no-store'
    });

    if (!responseGet.ok) throw new Error(`Portal indisponível: ${responseGet.status}`);

    const htmlGet = await responseGet.text();
    const setCookie = responseGet.headers.get('set-cookie');
    const cookies = setCookie ? setCookie.split(',').map(c => c.split(';')[0]).join('; ') : '';

    // Passo 2: POST simulando o clique no botão 'Consultar' com a matrícula
    const allInputs = extractAllInputs(htmlGet);
    const body = new URLSearchParams();
    
    Object.entries(allInputs).forEach(([key, value]) => {
      body.append(key, value);
    });
    
    body.set('ScriptManager1', 'UpdatePanel1|btnConsultar');
    body.set('__EVENTTARGET', 'btnConsultar'); 
    body.set('__EVENTARGUMENT', '');
    body.set('txtMatricula', matricula);

    const responsePost = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': TARGET_URL,
        'Origin': 'https://webapp.confianca.com.br',
        ...(cookies ? { 'Cookie': cookies } : {})
      },
      // @ts-ignore
      agent,
      body: body.toString(),
      cache: 'no-store'
    });

    if (!responsePost.ok) throw new Error(`Falha no POST: ${responsePost.status}`);

    const htmlContent = await responsePost.text();

    if (htmlContent.includes("Matrícula não encontrada")) {
      throw new Error("Matrícula inválida no portal.");
    }

    // Passo 3: Extração via Regex (Lógica Python)
    const timesFound = extractTimesPythonStyle(htmlContent);

    return {
      matricula,
      times: timesFound
    };

  } catch (error: any) {
    console.error("Erro na consulta:", error);
    throw new Error(error.message || "Erro desconhecido ao processar ponto.");
  }
}
