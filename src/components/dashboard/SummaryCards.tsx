
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, CalendarDays, Coffee } from "lucide-react";
import { timeToMinutes, minutesToTime, calculateDailyWorkedMinutes, sortPontoHours, isDateDsr } from '@/lib/ponto-utils';
import { DailyRecord } from '@/app/page';
import { cn } from '@/lib/utils';

interface SummaryCardsProps {
  records: DailyRecord[];
  previousBalance: string;
  fixedDsrDays: number[];
  referenceDsrSunday?: string | null;
  dailyWorkload: number;
  holidays: string[];
}

export function SummaryCards({ 
  records, 
  previousBalance, 
  fixedDsrDays, 
  referenceDsrSunday, 
  dailyWorkload,
  holidays 
}: SummaryCardsProps) {
  const stats = useMemo(() => {
    if (!records || records.length === 0) return { monthTotal: '00:00', monthBalance: '00:00', totalBalance: '00:00', isPositive: true, dsrCount: 0 };

    let totalWorkedMinutes = 0;
    let totalGoalMinutes = 0;
    let dsrCount = 0;

    records.forEach(record => {
      const [day, month, year] = record.date.split('/').map(Number);
      const dateObj = new Date(year, month - 1, day);

      const { isDsr: calendarDsr, isHoliday: calendarHoliday } = isDateDsr(dateObj, fixedDsrDays, referenceDsrSunday, holidays);
      
      const isMetaZero = calendarDsr || 
                       calendarHoliday || 
                       record.isManualDsr || 
                       record.isHoliday || 
                       record.isBankOff || 
                       record.isCompensation;

      if (isMetaZero) dsrCount++;

      const sorted = sortPontoHours(record.times);
      const dailyWorked = calculateDailyWorkedMinutes(
        sorted.filter((_, i) => i % 2 === 0),
        sorted.filter((_, i) => i % 2 !== 0)
      );
      
      totalWorkedMinutes += dailyWorked;
      
      // A meta só é somada se o dia NÃO for uma folga/DSR/Feriado
      if (!isMetaZero) {
        totalGoalMinutes += dailyWorkload;
      }
    });

    const prevBalanceMinutes = timeToMinutes(previousBalance);
    const monthBalanceMinutes = totalWorkedMinutes - totalGoalMinutes;
    const totalBalanceMinutes = monthBalanceMinutes + prevBalanceMinutes;

    return {
      monthTotal: minutesToTime(totalWorkedMinutes),
      monthBalance: minutesToTime(monthBalanceMinutes, true),
      totalBalance: minutesToTime(totalBalanceMinutes, true),
      isPositive: totalBalanceMinutes >= 0,
      dsrCount
    };
  }, [records, previousBalance, fixedDsrDays, referenceDsrSunday, dailyWorkload, holidays]);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="border-l-4 border-l-primary shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold text-slate-700">Trabalhado Mês</CardTitle>
          <Clock className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-slate-900">{stats.monthTotal}</div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Incluindo Adicional</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-600 shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold text-slate-700">Folgas / Feriados</CardTitle>
          <Coffee className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-slate-900">{stats.dsrCount} dias</div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Meta Zero acumulada</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-slate-400 shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold text-slate-700">Saldo Anterior</CardTitle>
          <CalendarDays className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-slate-900">{previousBalance}</div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Banco de meses passados</p>
        </CardContent>
      </Card>

      <Card className={cn(
        "border-l-4 shadow-sm bg-white",
        stats.isPositive ? 'border-l-green-600' : 'border-l-destructive'
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold text-slate-700">Saldo Atual Total</CardTitle>
          <TrendingUp className={cn("h-4 w-4", stats.isPositive ? 'text-green-600' : 'text-destructive')} />
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-black",
            stats.isPositive ? 'text-green-700' : 'text-destructive'
          )}>
            {stats.totalBalance}
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Ref: {minutesToTime(dailyWorkload)} diário</p>
        </CardContent>
      </Card>
    </div>
  );
}
