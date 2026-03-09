'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { robustTimeDataExtraction, RobustTimeDataExtractionOutput } from "@/ai/flows/robust-time-data-extraction-flow";

export type EmployeeData = {
  matricula: string;
  previousBalance: string; // HH:MM
  lastFetch: string; // ISO Date
  extractedData: RobustTimeDataExtractionOutput | null;
};

const EMPLOYEES_COLLECTION = "employees";

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
 * Mocks the retrieval of HTML from the .NET page and triggers the AI extraction.
 * In a real scenario, this would use a library like 'undici' or 'axios' to fetch the target URL.
 */
export async function fetchAndExtractPonto(matricula: string): Promise<RobustTimeDataExtractionOutput> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Simulate HTML fetching from the .NET external page
  // In a real environment, we'd do: const response = await fetch('https://webapp.confianca.com.br/consultaponto/ponto.aspx#gridhora');
  const mockHtml = `
    <html>
      <body>
        <h1>Consulta Ponto - Matrícula ${matricula}</h1>
        <table>
          <thead>
            <tr><th>Data</th><th>Entrada 1</th><th>Saída 1</th><th>Entrada 2</th><th>Saída 2</th><th>Total Dia</th></tr>
          </thead>
          <tbody>
            <tr><td>01/05/2024</td><td>08:00</td><td>12:00</td><td>13:00</td><td>17:00</td><td>08:00</td></tr>
            <tr><td>02/05/2024</td><td>08:15</td><td>12:10</td><td>13:05</td><td>17:15</td><td>08:15</td></tr>
            <tr><td>03/05/2024</td><td>07:55</td><td>12:00</td><td>13:00</td><td>18:00</td><td>09:05</td></tr>
          </tbody>
        </table>
        <div id="resumo">Total de horas no mês: 25:20</div>
      </body>
    </html>
  `;

  try {
    const extracted = await robustTimeDataExtraction({
      htmlContent: mockHtml,
      matricula,
      month,
      year
    });

    return extracted;
  } catch (error) {
    console.error("Extraction failed:", error);
    throw new Error("AI extraction failed. Please try again later.");
  }
}