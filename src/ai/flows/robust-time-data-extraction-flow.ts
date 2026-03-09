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
  dailyRecords: z.array(TimeRecordSchema).describe('Registros diários extraídos.'),
});
export type RobustTimeDataExtractionOutput = z.infer<typeof RobustTimeDataExtractionOutputSchema>;

const robustTimeDataExtractionPrompt = ai.definePrompt({
  name: 'robustTimeDataExtractionPrompt',
  input: {schema: RobustTimeDataExtractionInputSchema},
  output: {schema: RobustTimeDataExtractionOutputSchema},
  prompt: `Você é um especialista em extração de dados de ponto de sistemas corporativos ASP.NET.
Seu objetivo é extrair TODOS os registros de ponto da matrícula '{{{matricula}}}' referentes ao mês {{{month}}}/{{{year}}}.

Anote as seguintes regras:
1. Procure por tabelas (geralmente com ID 'Grid' ou similar) que contenham colunas como "Data", "Entrada", "Saída", "Total".
2. Se houver horários espalhados no HTML que não estejam em uma tabela óbvia, mas que sigam o padrão HH:MM, agrupe-os por data.
3. Ignore feriados ou dias sem registros se eles não aparecerem.
4. Para cada dia encontrado, retorne a data no formato DD/MM/YYYY e os arrays de entradas e saídas.

Importante: O HTML pode conter muitos scripts e campos ocultos, foque apenas nos dados visíveis de horários.

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