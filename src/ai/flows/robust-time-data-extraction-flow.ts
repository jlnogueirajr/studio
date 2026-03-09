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
  date: z.string().describe('Data em formato DD/MM/YYYY.'),
  entryTimes: z.array(z.string()).describe('Lista de horários de entrada (HH:MM).'),
  exitTimes: z.array(z.string()).describe('Lista de horários de saída (HH:MM).'),
  dailyHours: z.string().describe('Total de horas úteis do dia (HH:MM).'),
});

const RobustTimeDataExtractionOutputSchema = z.object({
  employeeId: z.string().describe('Matrícula confirmada.'),
  monthSummary: z.string().describe('Resumo mensal encontrado.'),
  dailyRecords: z.array(TimeRecordSchema).describe('Registros diários extraídos.'),
});
export type RobustTimeDataExtractionOutput = z.infer<typeof RobustTimeDataExtractionOutputSchema>;

const robustTimeDataExtractionPrompt = ai.definePrompt({
  name: 'robustTimeDataExtractionPrompt',
  input: {schema: RobustTimeDataExtractionInputSchema},
  output: {schema: RobustTimeDataExtractionOutputSchema},
  prompt: `Você é um especialista em extração de dados de ponto de sistemas corporativos ASP.NET.
Analise o HTML fornecido para a matrícula '{{{matricula}}}'.

INSTRUÇÕES DE EXTRAÇÃO:
1. Procure pela tabela com ID 'Grid' ou qualquer tabela que contenha registros de horários.
2. Identifique as colunas de Data e os diversos campos de Horários (Entradas e Saídas).
3. Agrupe os horários por dia.
4. Extraia todos os registros do mês {{{month}}}/{{{year}}}.
5. Se encontrar textos como "FOLGA", "FALTA" ou campos vazios, ignore o dia ou trate como sem registros.
6. Retorne os horários no formato HH:MM.

HTML para processar:
{{{htmlContent}}}
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
