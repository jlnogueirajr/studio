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
import { Edit2, Info, Star, Landmark, Moon, Coffee, AlertCircle } from "lucide-react";
import { calculateDetailedWork, minutesToTime, sortPontoHours, isDateDsr } from "@/lib/ponto-utils";
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
    <Card className="shadow-2xl border-border overflow-hidden bg-card">
      <CardHeader className="bg-muted/50 border-b border-border py-4">
        <CardTitle className="text-lg flex items-center justify-between font-black text-foreground">
          <div className="flex items-center gap-2">
            <span>DETALHAMENTO DE SALDO DIÁRIO</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3 bg-slate-900 text-white border-none shadow-xl">
                  <p className="font-bold text-xs">Regra de Cálculo:</p>
                  <ul className="list-disc ml-4 mt-2 space-y-1 text-[11px] font-medium">
                    <li>Hora Extra = Trabalhado - Meta (ex: 07:20).</li>
                    <li>Em Folgas/DSR/Feriados sem batidas, o saldo é 0.</li>
                    <li>Se trabalhar na Folga/Feriado, a meta é 0 e tudo vira Extra.</li>
                    <li>🌙 Indica bônus noturno já somado ao total.</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 uppercase">
            {records.length} Dias Exibidos
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[140px] font-black text-foreground uppercase text-[11px] border-r">Data / Dia</TableHead>
              <TableHead className="font-black text-foreground uppercase text-[11px]">Tratamento / Batidas</TableHead>
              <TableHead className="text-right font-black text-foreground uppercase text-[11px]">Total Trabalhado</TableHead>
              <TableHead className="text-right font-black text-foreground uppercase text-[11px] border-l bg-primary/5">Saldo do Dia (+/-)</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length > 0 ? (
              records.map((record) => {
                const [day, month, year] = record.date.split('/').map(Number);
                const dateObj = new Date(year, month - 1, day);
                
                const { isDsr: calendarDsr, isHoliday: calendarHoliday } = isDateDsr(dateObj, fixedDsrDays, referenceDsrSunday, holidays);
                
                const isManualFolga = record.isManualDsr || record.isBankOff || record.isCompensation;
                const isSystemHoliday = calendarHoliday || record.isHoliday;
                const isSystemDsr = calendarDsr;
                
                // Meta zero se for folga manual, feriado ou DSR E NÃO houver marcação de "Forçar Trabalho"
                const isMetaZeroDay = (isManualFolga || isSystemHoliday || isSystemDsr) && !record.isManualWork;

                const sorted = sortPontoHours(record.times);
                const { total: workedMinutes, nightBonus } = calculateDetailedWork(
                  sorted.filter((_, i) => i % 2 === 0),
                  sorted.filter((_, i) => i % 2 !== 0)
                );
                
                // Se trabalhou e NÃO está marcado como meta zero, meta é a carga normal
                // Se for meta zero (folga/feriado), a meta é 0 (tudo é extra)
                const goalForDay = isMetaZeroDay ? 0 : dailyWorkload;
                const dailyBalance = workedMinutes > 0 || isMetaZeroDay ? workedMinutes - goalForDay : -dailyWorkload;
                
                const isNoTime = !record.times || record.times.length === 0;

                return (
                  <TableRow key={record.id} className="group hover:bg-accent/30 transition-colors border-border">
                    <TableCell className="font-black text-foreground border-r py-3">
                      <div className="text-sm">{record.date}</div>
                      <div className={cn(
                        "text-[9px] font-black p-0.5 rounded inline-block uppercase",
                        isMetaZeroDay ? "text-green-700 bg-green-500/10 dark:text-green-400" : "text-primary bg-primary/10"
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
                              "font-black px-3 py-1 shadow-sm uppercase text-[10px] flex items-center gap-2",
                              isMetaZeroDay 
                                ? "border-green-600/30 text-green-700 bg-green-500/10 dark:text-green-400" 
                                : "border-red-600/30 text-red-700 bg-red-500/10 dark:text-red-400"
                            )}
                          >
                            {isSystemHoliday ? (
                              <><Star className="w-3 h-3 fill-current" /> Feriado</>
                            ) : record.isBankOff ? (
                              <><Landmark className="w-3 h-3" /> Folga Banco</>
                            ) : record.isCompensation ? (
                              <><Coffee className="w-3 h-3" /> Compensação</>
                            ) : isSystemDsr ? (
                              "DSR / Folga"
                            ) : "Falta / Débito"}
                          </Badge>
                        ) : (
                          <>
                            {sorted.map((time, i) => (
                              <Badge 
                                key={i} 
                                className={cn(
                                  "font-black px-2 shadow-sm",
                                  i % 2 === 0 
                                    ? "bg-foreground text-background" 
                                    : "bg-background text-primary border-primary border"
                                )}
                              >
                                {time}
                              </Badge>
                            ))}
                            {nightBonus > 0 && <Moon className="w-3.5 h-3.5 text-blue-500 ml-1" />}
                            {isSystemHoliday && <Star className="w-3 h-3 text-amber-500 fill-amber-500 ml-1" />}
                            {isSystemDsr && !isSystemHoliday && <Coffee className="w-3 h-3 text-green-500 ml-1" />}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-foreground text-base tabular-nums">
                      {workedMinutes > 0 ? minutesToTime(workedMinutes) : "---"}
                    </TableCell>
                    <TableCell className="text-right font-black text-base tabular-nums border-l bg-primary/5">
                      <span className={cn(
                        "px-2 py-0.5 rounded",
                        dailyBalance >= 0 
                          ? "text-green-700 bg-green-500/10 dark:text-green-400" 
                          : "text-red-700 bg-red-500/10 dark:text-red-400"
                      )}>
                        {minutesToTime(dailyBalance, true)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onEdit(record)} 
                        className="h-8 w-8 text-muted-foreground hover:text-primary rounded-full"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-black uppercase text-xs">
                  Nenhum dado encontrado...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
