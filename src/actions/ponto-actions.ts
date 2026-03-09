'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { robustTimeDataExtraction, RobustTimeDataExtractionOutput } from "@/ai/flows/robust-time-data-extraction-flow";

export type EmployeeData = {
  matricula: string;
  previousBalance: string; // HH:MM
  lastFetch: string; // ISO Date
  extractedData: RobustTimeDataExtractionOutput | null;
};

const EMPLOYEES_COLLECTION = "employees";
const TARGET_URL = "https://webapp.confianca.com.br/consultaponto/ponto.aspx";

export async function getEmployeeStoredData(matricula: string): Promise<EmployeeData | null> {
  try {
    const docRef = doc(db, EMPLOYEES_COLLECTION, matricula);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as EmployeeData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching employee data:", error);
    return null;
  }
}

export async function saveEmployeeData(data: EmployeeData) {
  try {
    const docRef = doc(db, EMPLOYEES_COLLECTION, data.matricula);
    // Persistência no Firestore seguindo as diretrizes (non-blocking)
    setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.error("Error saving employee data:", error);
    throw new Error("Failed to save data.");
  }
}

export async function clearEmployeeData(matricula: string) {
  try {
    const docRef = doc(db, EMPLOYEES_COLLECTION, matricula);
    deleteDoc(docRef);
  } catch (error) {
    console.error("Error clearing employee data:", error);
    throw new Error("Failed to clear data.");
  }
}

/**
 * Auxiliar para extrair campos ocultos necessários para o ciclo de vida do ASP.NET
 */
function extractHiddenFields(html: string) {
  const fields: Record<string, string> = {};
  const aspnetFields = ['__VIEWSTATE', '__VIEWSTATEGENERATOR', '__EVENTVALIDATION', '__EVENTTARGET', '__EVENTARGUMENT'];
  
  for (const field of aspnetFields) {
    const regex = new RegExp(`id="${field}" value="([^"]*)"`);
    const match = html.match(regex);
    if (match) {
      fields[field] = match[1];
    } else {
      fields[field] = "";
    }
  }
  return fields;
}

/**
 * Realiza a consulta real no site da empresa simulando o comportamento do PontoBot.
 */
export async function fetchAndExtractPonto(matricula: string): Promise<RobustTimeDataExtractionOutput> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  try {
    // 1. GET inicial para capturar VIEWSTATE e Cookies da sessão
    const responseGet = await fetch(TARGET_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store'
    });

    if (!responseGet.ok) {
      throw new Error(`Erro ao acessar o portal: ${responseGet.status}`);
    }

    const htmlGet = await responseGet.text();
    const setCookie = responseGet.headers.get('set-cookie');
    const cookies = setCookie ? setCookie.split(',').map(c => c.split(';')[0]).join('; ') : '';

    // 2. Extrair tokens de formulário dinâmicos
    const hiddenFields = extractHiddenFields(htmlGet);

    // 3. Preparar o POST exatamente como o site espera (x-www-form-urlencoded)
    const body = new URLSearchParams();
    Object.entries(hiddenFields).forEach(([key, value]) => {
      body.append(key, value);
    });
    
    // Configurar o gatilho de consulta
    body.set('__EVENTTARGET', 'btnConsultar'); 
    body.set('__EVENTARGUMENT', '');
    body.set('txtMatricula', matricula);
    body.append('btnConsultar', 'Consultar');

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
      throw new Error(`Falha na consulta: ${responsePost.status}`);
    }

    const htmlContent = await responsePost.text();

    // Verificação de conteúdo básico
    if (htmlContent.includes("Matrícula não encontrada") || htmlContent.length < 500) {
      throw new Error("Matrícula não localizada no portal da empresa.");
    }

    // 4. Extração via IA focada na tabela de dados (id: Grid)
    const extracted = await robustTimeDataExtraction({
      htmlContent,
      matricula,
      month,
      year
    });

    return extracted;
  } catch (error: any) {
    console.error("Ponto Fetch Error:", error);
    throw new Error(error.message || "Erro inesperado ao consultar o portal.");
  }
}
