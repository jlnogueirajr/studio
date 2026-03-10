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
          <span className="text-xs font-normal text-muted-foreground">(Ordem: Mais atual para o mais antigo)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100 hover:bg-slate-100">
              <TableHead className="w-[120px] font-bold text-slate-900">Data</TableHead>
              <TableHead className="font-bold text-slate-900">Horários Registrados</TableHead>
              <TableHead className="text-right font-bold text-slate-900">Horas Úteis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length > 0 ? (
              records.map((record) => {
                const sorted = sortPontoHours(record.times);
                const entryTimes = sorted.filter((_, i) => i % 2 === 0);
                const exitTimes = sorted.filter((_, i) => i % 2 !== 0);
                
                const workedMinutes = calculateDailyWorkedMinutes(entryTimes, exitTimes);
                const formattedHours = minutesToTime(workedMinutes);
                const isOdd = sorted.length % 2 !== 0;
                
                return (
                  <TableRow key={record.date} className="group hover:bg-primary/5 transition-colors">
                    <TableCell className="font-bold text-slate-900">{record.date}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {sorted.map((time, i) => (
                          <Badge 
                            key={i} 
                            variant={i % 2 === 0 ? "secondary" : "outline"} 
                            className={i % 2 === 0 
                              ? "bg-slate-700 text-white border-slate-700" 
                              : "border-primary text-primary font-bold"
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
                    <TableCell className="text-right font-black text-slate-900 text-base">
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
