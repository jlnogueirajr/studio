
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, CalendarDays, Coffee } from "lucide-react";
import { timeToMinutes, minutesToTime, calculateDailyWorkedMinutes, sortPontoHours, isDateDsr } from '@/lib/ponto-utils';
import { DailyRecord } from '@/app/page';

interface SummaryCardsProps {
  records: DailyRecord[];
  previousBalance: string;
  fixedDsrDays: number[];
  referenceDsrSunday?: string | null;
}

export function SummaryCards({ records, previousBalance, fixedDsrDays, referenceDsrSunday }: SummaryCardsProps) {
  const stats = useMemo(() => {
    if (!records || records.length === 0) return { monthTotal: '00:00', monthBalance: '00:00', totalBalance: '00:00', isPositive: true, dsrCount: 0 };

    const DAILY_GOAL = 7 * 60 + 20;
    let totalWorkedMinutes = 0;
    let totalGoalMinutes = 0;
    let dsrCount = 0;

    records.forEach(record => {
      const [day, month, year] = record.date.split('/').map(Number);
      const dateObj = new Date(year, month - 1, day);

      let isDsr = isDateDsr(dateObj, fixedDsrDays, referenceDsrSunday);
      if (record.isManualDsr) isDsr = true;
      if (record.isManualWork) isDsr = false;

      if (isDsr) dsrCount++;

      const sorted = sortPontoHours(record.times);
      const dailyWorked = calculateDailyWorkedMinutes(
        sorted.filter((_, i) => i % 2 === 0),
        sorted.filter((_, i) => i % 2 !== 0)
      );
      
      totalWorkedMinutes += dailyWorked;
      if (!isDsr) totalGoalMinutes += DAILY_GOAL;
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
  }, [records, previousBalance, fixedDsrDays, referenceDsrSunday]);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="border-l-4 border-l-primary shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold text-slate-700">Trabalhado Mês</CardTitle>
          <Clock className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-slate-900">{stats.monthTotal}</div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase">Total c/ Adicional Noturno</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-slate-400 shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold text-slate-700">Folgas/DSRs</CardTitle>
          <Coffee className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-slate-900">{stats.dsrCount} dias</div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase">Meta Zero nesses dias</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-accent shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold text-slate-700">Saldo Anterior</CardTitle>
          <CalendarDays className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-slate-900">{previousBalance}</div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase">Informado manualmente</p>
        </CardContent>
      </Card>

      <Card className={`border-l-4 shadow-sm bg-white ${stats.isPositive ? 'border-l-green-600' : 'border-l-destructive'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold text-slate-700">Saldo Total</CardTitle>
          <TrendingUp className={`h-4 w-4 ${stats.isPositive ? 'text-green-600' : 'text-destructive'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-black ${stats.isPositive ? 'text-green-700' : 'text-destructive'}`}>
            {stats.totalBalance}
          </div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase">Meta de 07:20 / dia útil</p>
        </CardContent>
      </Card>
    </div>
  );
}
