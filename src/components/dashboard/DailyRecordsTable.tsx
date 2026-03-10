
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
import { calculateDailyWorkedMinutes, minutesToTime, sortPontoHours, isDateDsr } from "@/lib/ponto-utils";
import { DailyRecord } from "@/app/page";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DailyRecordsTableProps {
  records: DailyRecord[];
  fixedDsrDays: number[];
  referenceDsrSunday?: string | null;
  onEdit: (record: DailyRecord) => void;
}

export function DailyRecordsTable({ records, fixedDsrDays, referenceDsrSunday, onEdit }: DailyRecordsTableProps) {
  return (
    <Card className="shadow-2xl border-primary/10 overflow-hidden bg-white">
      <CardHeader className="bg-slate-50 border-b border-primary/10 py-4">
        <CardTitle className="text-lg flex items-center justify-between font-black text-slate-800">
          <div className="flex items-center gap-2">
            <span>DETALHAMENTO DE BATIDAS</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3 bg-slate-900 text-white border-none">
                  <p className="font-bold">Regras de Cálculo:</p>
                  <ul className="list-disc ml-4 mt-2 space-y-1 text-[11px]">
                    <li>Meta diária: 07:20 (Dia Útil)</li>
                    <li>Meta DSR: 00:00</li>
                    <li>Fator Noturno: 1.14x (22h às 05h)</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/20">
            {records.length} REGISTROS CARREGADOS
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100/80 hover:bg-slate-100/80">
              <TableHead className="w-[140px] font-black text-slate-900 uppercase text-[11px] border-r">Data / Dia</TableHead>
              <TableHead className="font-black text-slate-900 uppercase text-[11px]">Batidas Registradas</TableHead>
              <TableHead className="text-right font-black text-slate-900 uppercase text-[11px]">Trabalhado</TableHead>
              <TableHead className="text-right font-black text-slate-900 uppercase text-[11px] border-l">Saldo Dia</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length > 0 ? (
              records.map((record) => {
                const [day, month, year] = record.date.split('/').map(Number);
                const dateObj = new Date(year, month - 1, day);
                
                let isDsr = isDateDsr(dateObj, fixedDsrDays, referenceDsrSunday);
                if (record.isManualDsr) isDsr = true;
                if (record.isManualWork) isDsr = false;

                const isSunday = dateObj.getDay() === 0;
                const isNoTime = !record.times || record.times.length === 0;
                const sorted = sortPontoHours(record.times);
                const workedMinutes = calculateDailyWorkedMinutes(
                  sorted.filter((_, i) => i % 2 === 0),
                  sorted.filter((_, i) => i % 2 !== 0)
                );
                
                const DAILY_GOAL = 7 * 60 + 20;
                const goalForDay = isDsr ? 0 : DAILY_GOAL;
                const dailyBalance = workedMinutes - goalForDay;

                const isOdd = sorted.length % 2 !== 0;
                
                return (
                  <TableRow key={record.id} className="group hover:bg-slate-50 transition-colors border-slate-100">
                    <TableCell className="font-black text-slate-900 border-r">
                      <div className="text-sm">{record.date}</div>
                      <div className={cn(
                        "text-[9px] font-black p-0.5 rounded inline-block uppercase",
                        isDsr ? "text-green-700 bg-green-50" : "text-primary bg-primary/5"
                      )}>
                        {dateObj.toLocaleDateString('pt-BR', { weekday: 'long' })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 items-center">
                        {isNoTime ? (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "font-black px-3 py-1 shadow-sm",
                              isDsr 
                                ? "border-green-600 text-green-700 bg-green-50" 
                                : "border-red-600 text-red-700 bg-red-50 animate-pulse"
                            )}
                          >
                            {isDsr ? (isSunday ? "DSR / DOMINGO" : "FOLGA / DSR") : "DÉBITO / FALTA"}
                          </Badge>
                        ) : (
                          <>
                            {sorted.map((time, i) => (
                              <Badge 
                                key={i} 
                                variant={i % 2 === 0 ? "secondary" : "outline"} 
                                className={cn(
                                  "font-black px-2 shadow-sm transition-transform active:scale-95",
                                  i % 2 === 0 
                                    ? "bg-slate-800 text-white border-slate-800" 
                                    : "border-primary text-primary bg-white"
                                )}
                              >
                                {time}
                              </Badge>
                            ))}
                            {isDsr && (
                              <Badge className="bg-green-600 text-white border-none text-[9px] font-black uppercase">Extra DSR</Badge>
                            )}
                          </>
                        )}
                        {isOdd && (
                          <Badge variant="destructive" className="animate-pulse py-0 h-5 font-black uppercase text-[9px] shadow-sm">Pendente</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-900 text-base tabular-nums">
                      {isNoTime && isDsr ? (
                        <span className="text-slate-300">---</span>
                      ) : (
                        <span>{minutesToTime(workedMinutes)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-black text-base tabular-nums border-l">
                      <span className={cn(
                        "px-2 py-0.5 rounded",
                        dailyBalance >= 0 ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                      )}>
                        {minutesToTime(dailyBalance, true)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onEdit(record)} 
                        className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all rounded-full"
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
                    <p className="font-black text-slate-400">NENHUM REGISTRO LOCALIZADO</p>
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
