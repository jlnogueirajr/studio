'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, CalendarDays } from "lucide-react";
import { timeToMinutes, minutesToTime, calculateDailyWorkedMinutes, sortPontoHours } from '@/lib/ponto-utils';

interface SummaryCardsProps {
  records: Array<{
    times: string[];
  }>;
  previousBalance: string;
}

export function SummaryCards({ records, previousBalance }: SummaryCardsProps) {
  const stats = useMemo(() => {
    if (!records || records.length === 0) return { monthTotal: '00:00', monthBalance: '00:00', totalBalance: '00:00', isPositive: true };

    const workedMinutes = records.reduce((acc, record) => {
      const sorted = sortPontoHours(record.times);
      const entryTimes = sorted.filter((_, i) => i % 2 === 0);
      const exitTimes = sorted.filter((_, i) => i % 2 !== 0);
      return acc + calculateDailyWorkedMinutes(entryTimes, exitTimes);
    }, 0);

    const DAILY_GOAL = 7 * 60 + 20;
    const totalGoalMinutes = records.length * DAILY_GOAL;
    const prevBalanceMinutes = timeToMinutes(previousBalance);
    
    const monthBalanceMinutes = workedMinutes - totalGoalMinutes;
    const totalBalanceMinutes = monthBalanceMinutes + prevBalanceMinutes;

    return {
      monthTotal: minutesToTime(workedMinutes),
      monthBalance: minutesToTime(monthBalanceMinutes, true),
      totalBalance: minutesToTime(totalBalanceMinutes, true),
      isPositive: totalBalanceMinutes >= 0
    };
  }, [records, previousBalance]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total do Mês</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.monthTotal}</div>
          <p className="text-xs text-muted-foreground">Com fator noturno (52.5m)</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-accent shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Anterior</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{previousBalance}</div>
          <p className="text-xs text-muted-foreground">Saldo do mês passado</p>
        </CardContent>
      </Card>

      <Card className={`border-l-4 shadow-sm hover:shadow-md transition-shadow ${stats.isPositive ? 'border-l-green-500' : 'border-l-destructive'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          <TrendingUp className={`h-4 w-4 ${stats.isPositive ? 'text-green-500' : 'text-destructive'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.isPositive ? 'text-green-600' : 'text-destructive'}`}>
            {stats.totalBalance}
          </div>
          <p className="text-xs text-muted-foreground">Meta de 07:20 por dia</p>
        </CardContent>
      </Card>
    </div>
  );
}
