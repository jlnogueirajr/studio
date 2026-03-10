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
      <CardHeader className="bg-muted/50">
        <CardTitle className="text-lg">Detalhamento Diário</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[120px]">Data</TableHead>
              <TableHead>Horários Registrados</TableHead>
              <TableHead className="text-right">Horas Úteis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length > 0 ? (
              records.map((record) => {
                const sorted = sortPontoHours(record.times);
                // Dividimos em entradas e saídas para o cálculo (Lógica simplificada)
                const entryTimes = sorted.filter((_, i) => i % 2 === 0);
                const exitTimes = sorted.filter((_, i) => i % 2 !== 0);
                
                const workedMinutes = calculateDailyWorkedMinutes(entryTimes, exitTimes);
                const formattedHours = minutesToTime(workedMinutes);
                const isOdd = sorted.length % 2 !== 0;
                
                return (
                  <TableRow key={record.date} className="group hover:bg-primary/5">
                    <TableCell className="font-medium">{record.date}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sorted.map((time, i) => (
                          <Badge 
                            key={i} 
                            variant={i % 2 === 0 ? "secondary" : "outline"} 
                            className={i % 2 === 0 ? "bg-secondary/50" : "border-accent"}
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
                    <TableCell className="text-right font-bold text-primary">
                      {formattedHours}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
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
