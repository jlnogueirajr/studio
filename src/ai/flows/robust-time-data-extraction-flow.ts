'use server';
/**
 * @fileOverview This file implements a Genkit flow for robustly extracting time clock data from HTML content.
 *
 * - robustTimeDataExtraction - A function that handles the extraction process.
 * - RobustTimeDataExtractionInput - The input type for the robustTimeDataExtraction function.
 * - RobustTimeDataExtractionOutput - The return type for the robustTimeDataExtraction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RobustTimeDataExtractionInputSchema = z.object({
  htmlContent: z.string().describe('The full HTML content of the time clock page.'),
  matricula: z.string().describe('The employee ID (matrícula) to extract data for.'),
  month: z.number().int().min(1).max(12).describe('The month number (1-12) for which data is being extracted.'),
  year: z.number().int().min(1900).max(2100).describe('The year for which data is being extracted.'),
});
export type RobustTimeDataExtractionInput = z.infer<typeof RobustTimeDataExtractionInputSchema>;

const TimeRecordSchema = z.object({
  date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be in DD/MM/YYYY format.').describe('The date of the record in DD/MM/YYYY format.'),
  entryTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format.')).describe('An array of entry times in HH:MM format.'),
  exitTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format.')).describe('An array of exit times in HH:MM format.'),
  dailyHours: z.string().regex(/^\d{2}:\d{2}$/, 'Daily hours must be in HH:MM format.').describe('The total daily hours in HH:MM format.'),
});

const RobustTimeDataExtractionOutputSchema = z.object({
  employeeId: z.string().describe('The employee ID (matrícula) for the extracted data.'),
  monthSummary: z.string().describe('A summary string of the total hours for the month, if available. E.g., "Total de horas no mês: XX:YY".'),
  dailyRecords: z.array(TimeRecordSchema).describe('An array of daily time records extracted from the HTML.'),
});
export type RobustTimeDataExtractionOutput = z.infer<typeof RobustTimeDataExtractionOutputSchema>;

const robustTimeDataExtractionPrompt = ai.definePrompt({
  name: 'robustTimeDataExtractionPrompt',
  input: {schema: RobustTimeDataExtractionInputSchema},
  output: {schema: RobustTimeDataExtractionOutputSchema},
  prompt: `You are an expert at parsing HTML documents, specifically designed to extract time clock data.
You need to extract daily time records for an employee from the provided HTML content.
The employee ID is '{{{matricula}}}'.
The data corresponds to the month '{{{month}}}' and year '{{{year}}}'.

Analyze the HTML to find a table or a structured list that contains daily point entries and exits.
For each day, identify and extract:
1.  **Date**: This is typically presented in 'DD/MM/YYYY' format.
2.  **Entry Times**: One or more times when the employee clocked in (e.g., 'HH:MM').
3.  **Exit Times**: One or more times when the employee clocked out (e.g., 'HH:MM').
4.  **Daily Hours**: The total calculated hours for that specific day (e.g., 'HH:MM').

Also, look for a monthly summary of total hours if available. If no specific summary is found, provide an empty string for 'monthSummary'.

It is crucial that you are robust to minor changes in the HTML structure (e.g., different class names, slight reordering of elements). Use common sense and pattern recognition to identify the correct data points.
The output MUST be a JSON object strictly conforming to the following schema. Ensure all fields are present and correctly formatted. If a field cannot be found, provide an appropriate empty value (e.g., empty string, empty array).

\`\`\`json
{{jsonSchema RobustTimeDataExtractionOutputSchema}}
\`\`\`

Here is the HTML content to parse:
\`\`\`html
{{{htmlContent}}}
\`\`\`
`,
});

const robustTimeDataExtractionFlow = ai.defineFlow(
  {
    name: 'robustTimeDataExtractionFlow',
    inputSchema: RobustTimeDataExtractionInputSchema,
    outputSchema: RobustTimeDataExtractionOutputSchema,
  },
  async (input) => {
    const {output} = await robustTimeDataExtractionPrompt(input);
    return output!;
  }
);

export async function robustTimeDataExtraction(input: RobustTimeDataExtractionInput): Promise<RobustTimeDataExtractionOutput> {
  return robustTimeDataExtractionFlow(input);
}
