'use server';
/**
 * @fileOverview Fluxo Genkit para extração robusta de dados de ponto a partir de HTML.
 * Especializado em portais ASP.NET com tabelas de horários (id="Grid").
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
  dailyRecords: z.array(TimeRecordSchema).describe('Registros diários extraídos.'),
});
export type RobustTimeDataExtractionOutput = z.infer<typeof RobustTimeDataExtractionOutputSchema>;

const robustTimeDataExtractionPrompt = ai.definePrompt({
  name: 'robustTimeDataExtractionPrompt',
  input: {schema: RobustTimeDataExtractionInputSchema},
  output: {schema: RobustTimeDataExtractionOutputSchema},
  prompt: `Você é um robô de extração de dados especializado em portais de RH.

Sua tarefa é extrair os horários da matrícula '{{{matricula}}}' do HTML abaixo.

PROCEDIMENTO:
1. Encontre a tabela com id="Grid".
2. Cada linha (tr) dessa tabela contém um horário (td) no formato HH:MM.
3. Exemplo de horários que você pode encontrar: 00:20, 16:14, 20:00.
4. Identifique o dia selecionado no calendário (id="Calendar"). O dia com background-color:#CAD400 é o dia atual.
5. Agrupe os horários em pares: Entrada e Saída.
   - Se houver apenas 1 horário: É entrada.
   - Se houver 2 horários: Entrada e Saída.
   - Se houver 3 horários: Entrada, Saída e nova Entrada (ainda trabalhando).
6. IMPORTANTE: Se um horário for antes das 05:00 da manhã (ex: 00:20), ele geralmente é o fechamento do turno do dia anterior. No entanto, se ele aparecer na lista de hoje, coloque-o como o último horário se ele for a conclusão de uma jornada iniciada antes da meia-noite.

HTML:
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