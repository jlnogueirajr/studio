
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
import { Edit2, Info, Star } from "lucide-react";
import { calculateDailyWorkedMinutes, minutesToTime, sortPontoHours, isDateDsr } from "@/lib/ponto-utils";
import { DailyRecord } from "@/app/page";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DailyRecordsTableProps {
  records: DailyRecord[];
  fixedDsrDays: number[];
  referenceDsrSunday?: string | null;
  dailyWorkload: number;
  holidays: string[];
  onEdit: (record: DailyRecord) => void;
}

export function DailyRecordsTable({ 
  records, 
  fixedDsrDays, 
  referenceDsrSunday, 
  dailyWorkload,
  holidays,
  onEdit 
}: DailyRecordsTableProps) {
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
                  <p className="font-bold text-xs">Regras de Cálculo:</p>
                  <ul className="list-disc ml-4 mt-2 space-y-1 text-[11px]">
                    <li>Meta diária configurada: {minutesToTime(dailyWorkload)}</li>
                    <li>Meta DSR/Feriado: 00:00</li>
                    <li>Adicional Noturno aplicado automaticamente.</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/20">
            {records.length} REGISTROS
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100/80 hover:bg-slate-100/80">
              <TableHead className="w-[140px] font-black text-slate-900 uppercase text-[11px] border-r">Data / Dia</TableHead>
              <TableHead className="font-black text-slate-900 uppercase text-[11px]">Status / Batidas</TableHead>
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
                
                const { isDsr: calendarDsr, isHoliday: calendarHoliday } = isDateDsr(dateObj, fixedDsrDays, referenceDsrSunday, holidays);
                
                // Determina se o dia é "Meta Zero"
                const isMetaZero = calendarDsr || 
                                 calendarHoliday || 
                                 record.isManualDsr || 
                                 record.isHoliday || 
                                 record.isBankOff || 
                                 record.isCompensation;

                const isNoTime = !record.times || record.times.length === 0;
                const sorted = sortPontoHours(record.times);
                const workedMinutes = calculateDailyWorkedMinutes(
                  sorted.filter((_, i) => i % 2 === 0),
                  sorted.filter((_, i) => i % 2 !== 0)
                );
                
                // Saldo = Trabalhado - Meta (7h20 ou 8h48). Se meta zero, meta = 0.
                const goalForDay = isMetaZero ? 0 : dailyWorkload;
                const dailyBalance = workedMinutes - goalForDay;

                return (
                  <TableRow key={record.id} className="group hover:bg-slate-50 transition-colors border-slate-100">
                    <TableCell className="font-black text-slate-900 border-r">
                      <div className="text-sm">{record.date}</div>
                      <div className={cn(
                        "text-[9px] font-black p-0.5 rounded inline-block uppercase",
                        isMetaZero ? "text-green-700 bg-green-50" : "text-primary bg-primary/5"
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
                              "font-black px-3 py-1 shadow-sm uppercase text-[10px]",
                              isMetaZero 
                                ? "border-green-600 text-green-700 bg-green-50" 
                                : "border-red-600 text-red-700 bg-red-50"
                            )}
                          >
                            {record.isHoliday || calendarHoliday ? "Feriado" : 
                             record.isBankOff ? "Folga Banco" : 
                             record.isCompensation ? "Compensação" : 
                             isMetaZero ? "DSR / Folga" : "Falta / Débito"}
                          </Badge>
                        ) : (
                          <>
                            {sorted.map((time, i) => (
                              <Badge 
                                key={i} 
                                className={cn(
                                  "font-black px-2 shadow-sm",
                                  i % 2 === 0 
                                    ? "bg-slate-800 text-white" 
                                    : "bg-white text-primary border-primary border"
                                )}
                              >
                                {time}
                              </Badge>
                            ))}
                            {(record.isHoliday || calendarHoliday) && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                          </>
                        )}
                        {sorted.length % 2 !== 0 && !isNoTime && (
                          <Badge variant="destructive" className="animate-pulse text-[9px] font-black">Incompleto</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-900 text-base tabular-nums">
                      {workedMinutes > 0 ? minutesToTime(workedMinutes) : "---"}
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
                        className="h-8 w-8 text-slate-400 hover:text-primary rounded-full"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-black uppercase text-xs">
                  Aguardando Sincronização...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
