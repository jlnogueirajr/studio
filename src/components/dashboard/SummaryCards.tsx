
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, Landmark, Coffee } from "lucide-react";
import { timeToMinutes, minutesToTime, calculateDailyWorkedMinutes, sortPontoHours, isDateDsr } from '@/lib/ponto-utils';
import { DailyRecord } from '@/app/page';
import { cn } from '@/lib/utils';

interface SummaryCardsProps {
  records: DailyRecord[];
  previousBalance: string;
  previousHolidayBalance: number;
  fixedDsrDays: number[];
  referenceDsrSunday?: string | null;
  dailyWorkload: number;
  holidays: string[];
}

export function SummaryCards({ 
  records, 
  previousBalance, 
  previousHolidayBalance,
  fixedDsrDays, 
  referenceDsrSunday, 
  dailyWorkload,
  holidays 
}: SummaryCardsProps) {
  const stats = useMemo(() => {
    let totalWorkedMinutes = 0;
    let totalGoalMinutes = 0;
    let holidayCredits = 0;
    let holidayUsed = 0;

    records.forEach(record => {
      const [day, month, year] = record.date.split('/').map(Number);
      const dateObj = new Date(year, month - 1, day);

      const { isDsr: calendarDsr, isHoliday: calendarHoliday } = isDateDsr(dateObj, fixedDsrDays, referenceDsrSunday, holidays);
      
      const isMetaZeroDay = calendarDsr || 
                          calendarHoliday || 
                          record.isManualDsr || 
                          record.isHoliday || 
                          record.isBankOff || 
                          record.isCompensation;

      const sorted = sortPontoHours(record.times);
      const dailyWorked = calculateDailyWorkedMinutes(
        sorted.filter((_, i) => i % 2 === 0),
        sorted.filter((_, i) => i % 2 !== 0)
      );
      
      totalWorkedMinutes += dailyWorked;

      // Lógica: Trabalhar no feriado = Meta NORMAL + 1 crédito de folga
      let goalForDay = 0;
      if (!isMetaZeroDay) {
        goalForDay = dailyWorkload;
      } else if ((calendarHoliday || record.isHoliday) && dailyWorked > 0) {
        goalForDay = dailyWorkload;
        holidayCredits++;
      } else if ((calendarHoliday || record.isHoliday) && dailyWorked === 0) {
        goalForDay = 0;
      } else if (isMetaZeroDay) {
        goalForDay = 0;
      }

      totalGoalMinutes += goalForDay;

      if (record.isCompensation) holidayUsed++;
    });

    const prevBalanceMinutes = timeToMinutes(previousBalance);
    const monthBalanceMinutes = totalWorkedMinutes - totalGoalMinutes;
    const totalBalanceMinutes = monthBalanceMinutes + prevBalanceMinutes;

    return {
      monthTotal: minutesToTime(totalWorkedMinutes),
      monthBalance: minutesToTime(monthBalanceMinutes, true),
      totalBalance: minutesToTime(totalBalanceMinutes, true),
      isPositive: totalBalanceMinutes >= 0,
      holidayBalance: holidayCredits - holidayUsed + (previousHolidayBalance || 0),
    };
  }, [records, previousBalance, previousHolidayBalance, fixedDsrDays, referenceDsrSunday, dailyWorkload, holidays]);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="border-l-4 border-l-primary shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">Trabalhado Mês</CardTitle>
          <Clock className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-slate-900">{stats.monthTotal}</div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Tempo Efetivo</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-amber-600 shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">Saldo de Folgas</CardTitle>
          <Landmark className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-black",
            stats.holidayBalance >= 0 ? "text-slate-900" : "text-destructive"
          )}>
            {stats.holidayBalance} dias
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Feriados Acumulados</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-slate-400 shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">Meta Diária</CardTitle>
          <Coffee className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-slate-900">{minutesToTime(dailyWorkload)}</div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Base de Cálculo</p>
        </CardContent>
      </Card>

      <Card className={cn(
        "border-l-4 shadow-sm bg-white",
        stats.isPositive ? 'border-l-green-600' : 'border-l-destructive'
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">Banco Total</CardTitle>
          <TrendingUp className={cn("h-4 w-4", stats.isPositive ? 'text-green-600' : 'text-destructive')} />
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-black",
            stats.isPositive ? 'text-green-700' : 'text-destructive'
          )}>
            {stats.totalBalance}
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Saldo Geral HH:MM</p>
        </CardContent>
      </Card>
    </div>
  );
}
