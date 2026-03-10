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
import { Edit2, Info } from "lucide-react";
import { calculateDailyWorkedMinutes, minutesToTime, sortPontoHours } from "@/lib/ponto-utils";
import { DailyRecord } from "@/app/page";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DailyRecordsTableProps {
  records: DailyRecord[];
  fixedDsrDays: number[];
  onEdit: (record: DailyRecord) => void;
}

export function DailyRecordsTable({ records, fixedDsrDays, onEdit }: DailyRecordsTableProps) {
  return (
    <Card className="shadow-lg border-primary/10 overflow-hidden bg-white">
      <CardHeader className="bg-slate-50 border-b border-primary/10 py-4">
        <CardTitle className="text-lg flex items-center justify-between font-bold text-slate-800">
          <div className="flex items-center gap-2">
            <span>Detalhamento de Batidas</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Meta diária: 07:20 (440m).</p>
                  <p>DSR: Meta zero.</p>
                  <p>Saldo = Trabalhado - Meta.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-xs font-normal text-muted-foreground bg-white px-2 py-1 rounded-full border border-slate-200">
            {records.length} dias processados
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100/50 hover:bg-slate-100/50">
              <TableHead className="w-[120px] font-black text-slate-900 uppercase text-[11px]">Data</TableHead>
              <TableHead className="font-black text-slate-900 uppercase text-[11px]">Registros / Status</TableHead>
              <TableHead className="text-right font-black text-slate-900 uppercase text-[11px]">Horas Úteis</TableHead>
              <TableHead className="text-right font-black text-slate-900 uppercase text-[11px]">Saldo Dia</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length > 0 ? (
              records.map((record) => {
                const [day, month, year] = record.date.split('/').map(Number);
                const dateObj = new Date(year, month - 1, day);
                const dayOfWeek = dateObj.getDay();
                
                // Lógica de DSR: Prioriza override manual, depois configuração fixa
                let isDsr = fixedDsrDays.includes(dayOfWeek);
                if (record.isManualDsr) isDsr = true;
                if (record.isManualWork) isDsr = false;

                const isNoTime = !record.times || record.times.length === 0;

                const sorted = sortPontoHours(record.times);
                const entryTimes = sorted.filter((_, i) => i % 2 === 0);
                const exitTimes = sorted.filter((_, i) => i % 2 !== 0);
                
                const workedMinutes = calculateDailyWorkedMinutes(entryTimes, exitTimes);
                const formattedHours = minutesToTime(workedMinutes);
                
                const DAILY_GOAL = 7 * 60 + 20;
                const goalForDay = isDsr ? 0 : DAILY_GOAL;
                const dailyBalance = workedMinutes - goalForDay;

                const isOdd = sorted.length % 2 !== 0;
                
                return (
                  <TableRow key={record.id} className="group hover:bg-slate-50 transition-colors border-slate-100">
                    <TableCell className="font-bold text-slate-900">
                      <div className="text-sm">{record.date}</div>
                      <div className="text-[10px] font-black text-primary/70">
                        {dateObj.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 items-center">
                        {isNoTime ? (
                          <Badge 
                            variant="outline" 
                            className={isDsr 
                              ? "border-green-600 text-green-700 bg-green-50 font-bold px-3 py-1" 
                              : "border-red-600 text-red-700 bg-red-50 font-bold px-3 py-1 animate-pulse"
                            }
                          >
                            {isDsr ? "FOLGA / DSR" : "FALTA / DÉBITO"}
                          </Badge>
                        ) : (
                          sorted.map((time, i) => (
                            <Badge 
                              key={i} 
                              variant={i % 2 === 0 ? "secondary" : "outline"} 
                              className={i % 2 === 0 
                                ? "bg-slate-800 text-white border-slate-800 font-medium px-2" 
                                : "border-primary text-primary font-black px-2 bg-white"
                              }
                            >
                              {time}
                            </Badge>
                          ))
                        )}
                        {isOdd && (
                          <Badge variant="destructive" className="animate-pulse py-0 h-5 font-bold uppercase text-[9px]">Batida Ímpar</Badge>
                        )}
                        {(record.isManualDsr || record.isManualWork) && (
                          <Badge variant="outline" className="text-[9px] py-0 border-primary/40 text-primary/60">Ajustado</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-900 text-base tabular-nums">
                      {isNoTime && isDsr ? (
                        <span className="text-slate-300">---</span>
                      ) : (
                        <span>{formattedHours}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-black text-base tabular-nums">
                      <span className={dailyBalance >= 0 ? "text-green-600" : "text-destructive"}>
                        {minutesToTime(dailyBalance, true)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onEdit(record)} 
                        className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground font-medium">
                  <div className="flex flex-col items-center gap-2">
                    <Info className="w-8 h-8 text-slate-200" />
                    <p>Nenhum registro encontrado.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
