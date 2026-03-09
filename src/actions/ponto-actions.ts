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
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.error("Error saving employee data:", error);
    throw new Error("Failed to save data.");
  }
}

export async function clearEmployeeData(matricula: string) {
  try {
    const docRef = doc(db, EMPLOYEES_COLLECTION, matricula);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error clearing employee data:", error);
    throw new Error("Failed to clear data.");
  }
}

/**
 * Realiza a consulta real no site da empresa simulando o comportamento do PontoBot.
 */
export async function fetchAndExtractPonto(matricula: string): Promise<RobustTimeDataExtractionOutput> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  try {
    // 1. GET inicial para pegar VIEWSTATE e cookies
    const responseGet = await fetch(TARGET_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    const htmlGet = await responseGet.text();
    const cookies = responseGet.headers.get('set-cookie');

    // 2. Extrair campos ocultos do ASP.NET
    const viewState = htmlGet.match(/id="__VIEWSTATE" value="([^"]*)"/)?.[1] || "";
    const eventValidation = htmlGet.match(/id="__EVENTVALIDATION" value="([^"]*)"/)?.[1] || "";
    const viewStateGenerator = htmlGet.match(/id="__VIEWSTATEGENERATOR" value="([^"]*)"/)?.[1] || "";

    // 3. POST para consultar a matrícula
    const body = new URLSearchParams();
    body.append('__VIEWSTATE', viewState);
    body.append('__VIEWSTATEGENERATOR', viewStateGenerator);
    body.append('__EVENTVALIDATION', eventValidation);
    body.append('__EVENTTARGET', '');
    body.append('__EVENTARGUMENT', '');
    body.append('txtMatricula', matricula);
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
      body: body.toString()
    });

    const htmlContent = await responsePost.text();

    // 4. Trigger AI extraction no HTML real retornado
    const extracted = await robustTimeDataExtraction({
      htmlContent,
      matricula,
      month,
      year
    });

    return extracted;
  } catch (error) {
    console.error("Fetch/Extraction failed:", error);
    throw new Error("Erro ao acessar o site da empresa ou extrair dados.");
  }
}
