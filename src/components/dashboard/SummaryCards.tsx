'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, CalendarDays } from "lucide-react";
import { timeToMinutes, minutesToTime, calculateDailyWorkedMinutes } from '@/lib/ponto-utils';

interface SummaryCardsProps {
  records: Array<{
    entryTimes: string[];
    exitTimes: string[];
  }>;
  previousBalance: string;
}

export function SummaryCards({ records, previousBalance }: SummaryCardsProps) {
  const stats = useMemo(() => {
    // Calculamos o total trabalhado no mês atual com base nos registros extraídos
    const workedMinutes = records.reduce((acc, record) => {
      return acc + calculateDailyWorkedMinutes(record.entryTimes, record.exitTimes);
    }, 0);

    // Meta diária padrão do PontoBot (07:20)
    const DAILY_GOAL = 7 * 60 + 20;
    const totalGoalMinutes = records.length * DAILY_GOAL;

    const prevBalanceMinutes = timeToMinutes(previousBalance.replace('+', '').replace('-', '')) * (previousBalance.startsWith('-') ? -1 : 1);
    
    // Saldo do mês = trabalhado - meta
    const monthBalance = workedMinutes - totalGoalMinutes;
    const totalBalance = monthBalance + prevBalanceMinutes;

    return {
      monthTotal: minutesToTime(workedMinutes),
      monthBalance: minutesToTime(monthBalance, true),
      totalBalance: minutesToTime(totalBalance, true),
      isPositive: totalBalance >= 0
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
          <p className="text-xs text-muted-foreground">Horas reais trabalhadas (com noturno)</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-accent shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Anterior</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{previousBalance}</div>
          <p className="text-xs text-muted-foreground">Saldo carregado do mês passado</p>
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
          <p className="text-xs text-muted-foreground">Total acumulado (Mês + Anterior)</p>
        </CardContent>
      </Card>
    </div>
  );
}
