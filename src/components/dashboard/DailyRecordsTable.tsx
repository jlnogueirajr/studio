
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit2 } from "lucide-react";
import { calculateDailyWorkedMinutes, minutesToTime, sortPontoHours } from "@/lib/ponto-utils";
import { DailyRecord } from "@/app/page";

interface DailyRecordsTableProps {
  records: DailyRecord[];
  fixedDsrDays: number[];
  onEdit: (record: DailyRecord) => void;
}

export function DailyRecordsTable({ records, fixedDsrDays, onEdit }: DailyRecordsTableProps) {
  return (
    <Card className="shadow-lg border-primary/10 overflow-hidden">
      <CardHeader className="bg-muted/50 border-b border-primary/10">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Detalhamento Diário</span>
          <span className="text-xs font-normal text-muted-foreground">Recentemente importados no topo</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[120px] font-bold text-slate-700">Data</TableHead>
              <TableHead className="font-bold text-slate-700">Registros / Status</TableHead>
              <TableHead className="text-right font-bold text-slate-700">Úteis</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length > 0 ? (
              records.map((record) => {
                const [day, month, year] = record.date.split('/').map(Number);
                const dateObj = new Date(year, month - 1, day);
                const dayOfWeek = dateObj.getDay();
                const isFixedDsr = fixedDsrDays.includes(dayOfWeek);
                const isNoTime = !record.times || record.times.length === 0;

                const sorted = sortPontoHours(record.times);
                const entryTimes = sorted.filter((_, i) => i % 2 === 0);
                const exitTimes = sorted.filter((_, i) => i % 2 !== 0);
                
                const workedMinutes = calculateDailyWorkedMinutes(entryTimes, exitTimes);
                const formattedHours = minutesToTime(workedMinutes);
                const isOdd = sorted.length % 2 !== 0;
                
                return (
                  <TableRow key={record.id} className="group hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-medium text-slate-900">
                      {record.date}
                      <div className="text-[10px] text-muted-foreground">
                        {dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {isNoTime ? (
                          <Badge variant={isFixedDsr ? "outline" : "secondary"} className={isFixedDsr ? "border-green-500 text-green-700 bg-green-50" : "bg-slate-100"}>
                            {isFixedDsr ? "FOLGA / DSR" : "SEM REGISTRO"}
                          </Badge>
                        ) : (
                          sorted.map((time, i) => (
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
                          ))
                        )}
                        {isOdd && (
                          <Badge variant="destructive" className="animate-pulse py-0 h-5">Batida Ímpar</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 text-base">
                      {isNoTime && isFixedDsr ? "---" : formattedHours}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(record)} className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  Nenhum registro encontrado. Sincronize para começar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
