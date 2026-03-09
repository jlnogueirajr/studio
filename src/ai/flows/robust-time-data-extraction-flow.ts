
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

O HTML contém uma tabela com ID 'Grid' que lista os horários.
Exemplo de estrutura encontrada:
<table id="Grid">...<td align="center">00:20</td>...<td align="center">16:14</td>...</table>

INSTRUÇÕES DE EXTRAÇÃO:
1. Localize a tabela id="Grid".
2. Identifique o mês e ano no calendário (Ex: "março de 2026").
3. O dia selecionado no calendário geralmente tem background-color:#CAD400.
4. Extraia todos os horários de batida (HH:MM) presentes na tabela Grid.
5. Agrupe esses horários para compor o registro do dia atual.
6. Formate a saída conforme o esquema, garantindo que entryTimes e exitTimes contenham os pares de batida.
7. Se houver apenas 3 batidas (como no exemplo: 00:20, 16:14, 20:00), coloque as duas primeiras como entrada/saída e a terceira como uma nova entrada pendente.

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
