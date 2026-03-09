'use server';
/**
 * @fileOverview Fluxo Genkit para extração robusta de dados de ponto a partir de HTML.
 * Especializado em portais ASP.NET com tabelas de horários.
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
  isAbsence: z.boolean().optional().describe('Indica se foi uma falta (FALTA).'),
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
  prompt: `Você é um especialista em sistemas de ponto eletrônico corporativos (ASP.NET).
Sua tarefa é extrair os horários de batida da matrícula '{{{matricula}}}' para o período de {{{month}}}/{{{year}}}.

ESTRUTURA DO HTML:
O site possui uma tabela com id="Grid". Cada linha dessa tabela (tr) contém uma célula (td) com um horário no formato HH:MM.
Exemplo de dados no Grid:
- 00:20
- 16:14
- 20:00

INSTRUÇÕES DE EXTRAÇÃO:
1. Localize a tabela id="Grid".
2. Extraia TODOS os horários de batida listados nela.
3. Identifique a data correta no calendário (id="Calendar"). O dia selecionado costuma ter background-color:#CAD400.
4. Agrupe os horários em pares (Entrada/Saída). 
5. Se houver um número ímpar de batidas (ex: 3 batidas), a última deve constar apenas em entryTimes, indicando que o colaborador ainda está trabalhando.
6. Calcule o dailyHours (HH:MM) totalizando o tempo entre os pares de batidas.
7. Se o dia estiver marcado como "FALTA" ou estiver vazio, indique no campo isAbsence.

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
