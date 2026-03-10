'use server';
/**
 * Server Action responsável por realizar o scraping do portal da empresa.
 * Implementa a lógica exata do PontoBot para lidar com ASP.NET UpdatePanels.
 */

import { robustTimeDataExtraction, RobustTimeDataExtractionOutput } from "@/ai/flows/robust-time-data-extraction-flow";

const TARGET_URL = "https://webapp.confianca.com.br/consultaponto/ponto.aspx";

/**
 * Extrai TODOS os inputs do HTML, incluindo campos ocultos vitais do ASP.NET.
 */
function extractAllInputs(html: string) {
  const inputs: Record<string, string> = {};
  const inputRegex = /<input\s+[^>]*?name="([^"]+?)"[^>]*?value="([^"]*?)"/gi;
  let match;
  while ((match = inputRegex.exec(html)) !== null) {
    const name = match[1];
    const value = match[2];
    inputs[name] = value;
  }
  return inputs;
}

/**
 * Realiza a consulta no site da empresa simulando o comportamento do PontoBot.
 */
export async function fetchAndExtractPonto(matricula: string): Promise<RobustTimeDataExtractionOutput> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  try {
    // 1. GET inicial para capturar cookies e VIEWSTATE
    const responseGet = await fetch(TARGET_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store'
    });

    if (!responseGet.ok) {
      throw new Error(`Erro de conexão com o portal: ${responseGet.status}`);
    }

    const htmlGet = await responseGet.text();
    const setCookie = responseGet.headers.get('set-cookie');
    const cookies = setCookie ? setCookie.split(',').map(c => c.split(';')[0]).join('; ') : '';

    // 2. Prepara o POST com os tokens capturados
    const allInputs = extractAllInputs(htmlGet);
    const body = new URLSearchParams();
    
    Object.entries(allInputs).forEach(([key, value]) => {
      body.append(key, value);
    });
    
    // Configura os disparadores específicos do site (ScriptManager e btnConsultar)
    body.set('ScriptManager1', 'UpdatePanel1|btnConsultar');
    body.set('__EVENTTARGET', 'btnConsultar'); 
    body.set('__EVENTARGUMENT', '');
    body.set('txtMatricula', matricula);
    body.set('btnConsultar', 'Consultar');

    const responsePost = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': TARGET_URL,
        'Origin': 'https://webapp.confianca.com.br',
        ...(cookies ? { 'Cookie': cookies } : {})
      },
      body: body.toString(),
      cache: 'no-store'
    });

    if (!responsePost.ok) {
      throw new Error(`Falha ao enviar dados de consulta: ${responsePost.status}`);
    }

    const htmlContent = await responsePost.text();

    if (htmlContent.includes("Matrícula não encontrada") || htmlContent.includes("inválida")) {
      throw new Error("Matrícula não encontrada no portal da empresa.");
    }

    // 3. IA processa o HTML resultante
    const extracted = await robustTimeDataExtraction({
      htmlContent,
      matricula,
      month,
      year
    });

    if (!extracted || extracted.dailyRecords.length === 0) {
      throw new Error("Nenhum registro de ponto encontrado para hoje.");
    }

    return extracted;
  } catch (error: any) {
    console.error("Scraping error:", error);
    throw new Error(error.message || "Erro ao consultar portal.");
  }
}