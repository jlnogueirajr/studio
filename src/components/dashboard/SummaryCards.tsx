
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, CalendarDays, Coffee } from "lucide-react";
import { timeToMinutes, minutesToTime, calculateDailyWorkedMinutes, sortPontoHours } from '@/lib/ponto-utils';

interface SummaryCardsProps {
  records: Array<{
    times: string[];
    date: string;
  }>;
  previousBalance: string;
  fixedDsrDays: number[];
}

export function SummaryCards({ records, previousBalance, fixedDsrDays }: SummaryCardsProps) {
  const stats = useMemo(() => {
    if (!records) return { monthTotal: '00:00', monthBalance: '00:00', totalBalance: '00:00', isPositive: true, dsrCount: 0 };

    // Filtra registros que NÃO são DSRs fixos para calcular a meta
    const workingDayRecords = records.filter(r => {
      const [day, month, year] = r.date.split('/').map(Number);
      const dateObj = new Date(year, month - 1, day);
      return !fixedDsrDays.includes(dateObj.getDay());
    });

    const dsrCount = records.length - workingDayRecords.length;

    const workedMinutes = records.reduce((acc, record) => {
      const sorted = sortPontoHours(record.times);
      const entryTimes = sorted.filter((_, i) => i % 2 === 0);
      const exitTimes = sorted.filter((_, i) => i % 2 !== 0);
      return acc + calculateDailyWorkedMinutes(entryTimes, exitTimes);
    }, 0);

    // Meta diária padrão: 07:20 aplicada apenas em dias úteis
    const DAILY_GOAL = 7 * 60 + 20;
    const totalGoalMinutes = workingDayRecords.length * DAILY_GOAL;
    const prevBalanceMinutes = timeToMinutes(previousBalance);
    
    const monthBalanceMinutes = workedMinutes - totalGoalMinutes;
    const totalBalanceMinutes = monthBalanceMinutes + prevBalanceMinutes;

    return {
      monthTotal: minutesToTime(workedMinutes),
      monthBalance: minutesToTime(monthBalanceMinutes, true),
      totalBalance: minutesToTime(totalBalanceMinutes, true),
      isPositive: totalBalanceMinutes >= 0,
      dsrCount
    };
  }, [records, previousBalance, fixedDsrDays]);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="border-l-4 border-l-primary shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Trabalhado Mês</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{stats.monthTotal}</div>
          <p className="text-[10px] text-muted-foreground">Líquido c/ Adic. Noturno</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-slate-400 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Folgas/DSRs</CardTitle>
          <Coffee className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{stats.dsrCount} dias</div>
          <p className="text-[10px] text-muted-foreground">Configurados no perfil</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-accent shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">S. Anterior</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{previousBalance}</div>
          <p className="text-[10px] text-muted-foreground">Meses acumulados</p>
        </CardContent>
      </Card>

      <Card className={`border-l-4 shadow-sm ${stats.isPositive ? 'border-l-green-500' : 'border-l-destructive'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          <TrendingUp className={`h-4 w-4 ${stats.isPositive ? 'text-green-500' : 'text-destructive'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-xl font-bold ${stats.isPositive ? 'text-green-600' : 'text-destructive'}`}>
            {stats.totalBalance}
          </div>
          <p className="text-[10px] text-muted-foreground">Meta de 07:20/dia útil</p>
        </CardContent>
      </Card>
    </div>
  );
}
