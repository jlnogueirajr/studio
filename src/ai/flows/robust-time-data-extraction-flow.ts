'use server';
/**
 * @fileOverview Fluxo Genkit para extração robusta de dados de ponto a partir de HTML.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RobustTimeDataExtractionInputSchema = z.object({
  htmlContent: z.string().describe('O conteúdo HTML completo da página de consulta.'),
  matricula: z.string().describe('A matrícula do colaborador.'),
  month: z.number().int().min(1).max(12).describe('O mês da consulta.'),
  year: z.number().int().min(1900).max(2100).describe('O ano da consulta.'),
});
export type RobustTimeDataExtractionInput = z.infer<typeof RobustTimeDataExtractionInputSchema>;

const TimeRecordSchema = z.object({
  date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/).describe('Data em formato DD/MM/YYYY.'),
  entryTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).describe('Lista de horários de entrada (HH:MM).'),
  exitTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).describe('Lista de horários de saída (HH:MM).'),
  dailyHours: z.string().regex(/^\d{2}:\d{2}$/).describe('Total de horas úteis do dia (HH:MM).'),
});

const RobustTimeDataExtractionOutputSchema = z.object({
  employeeId: z.string().describe('Matrícula confirmada.'),
  monthSummary: z.string().describe('Resumo mensal encontrado.'),
  dailyRecords: z.array(TimeRecordSchema).describe('Registros diários extraídos da tabela Grid.'),
});
export type RobustTimeDataExtractionOutput = z.infer<typeof RobustTimeDataExtractionOutputSchema>;

const robustTimeDataExtractionPrompt = ai.definePrompt({
  name: 'robustTimeDataExtractionPrompt',
  input: {schema: RobustTimeDataExtractionInputSchema},
  output: {schema: RobustTimeDataExtractionOutputSchema},
  prompt: `Você é um especialista em parsing de HTML ASP.NET para dados de ponto.
Seu objetivo é extrair os registros de ponto da matrícula '{{{matricula}}}' do mês {{{month}}}/{{{year}}}.

Procure especificamente por uma tabela com ID 'Grid'.
Extraia para cada dia:
1. Data (DD/MM/YYYY)
2. Horários de Entrada (Entry)
3. Horários de Saída (Exit)
4. Total de Horas Úteis do dia

Importante: Se houverem múltiplos pares de entrada/saída no mesmo dia, capture todos. Ignore linhas vazias ou sem horários válidos.

Retorne estritamente um JSON:
\`\`\`json
{{jsonSchema RobustTimeDataExtractionOutputSchema}}
\`\`\`

HTML:
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
