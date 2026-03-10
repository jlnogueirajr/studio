'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateDailyWorkedMinutes, minutesToTime, sortPontoHours } from "@/lib/ponto-utils";

interface DailyRecord {
  date: string;
  times: string[];
}

interface DailyRecordsTableProps {
  records: DailyRecord[];
}

export function DailyRecordsTable({ records }: DailyRecordsTableProps) {
  return (
    <Card className="shadow-lg border-primary/10 overflow-hidden">
      <CardHeader className="bg-muted/50 border-b border-primary/10">
        <CardTitle className="text-lg flex items-center gap-2">
          Detalhamento Diário
          <span className="text-xs font-normal text-muted-foreground">(Ordem: Mais antigo para o mais novo)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30 hover:bg-secondary/30">
              <TableHead className="w-[120px] font-bold text-foreground">Data</TableHead>
              <TableHead className="font-bold text-foreground">Horários Registrados</TableHead>
              <TableHead className="text-right font-bold text-foreground">Horas Úteis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length > 0 ? (
              records.map((record) => {
                const sorted = sortPontoHours(record.times);
                // Dividimos em entradas e saídas para o cálculo
                const entryTimes = sorted.filter((_, i) => i % 2 === 0);
                const exitTimes = sorted.filter((_, i) => i % 2 !== 0);
                
                const workedMinutes = calculateDailyWorkedMinutes(entryTimes, exitTimes);
                const formattedHours = minutesToTime(workedMinutes);
                const isOdd = sorted.length % 2 !== 0;
                
                return (
                  <TableRow key={record.date} className="group hover:bg-primary/5 transition-colors">
                    <TableCell className="font-semibold text-slate-700">{record.date}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {sorted.map((time, i) => (
                          <Badge 
                            key={i} 
                            variant={i % 2 === 0 ? "secondary" : "outline"} 
                            className={i % 2 === 0 
                              ? "bg-slate-200 text-slate-800 border-slate-300" 
                              : "border-primary text-primary font-medium"
                            }
                          >
                            {time}
                          </Badge>
                        ))}
                        {isOdd && (
                          <Badge variant="destructive" className="animate-pulse">
                            Batida Ímpar
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary text-base">
                      {formattedHours}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                  Nenhum registro encontrado para este período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}