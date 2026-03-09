'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, CalendarDays } from "lucide-react";

interface SummaryCardsProps {
  monthSummary: string;
  previousBalance: string;
}

export function SummaryCards({ monthSummary, previousBalance }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total do Mês</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{monthSummary || '00:00'}</div>
          <p className="text-xs text-muted-foreground">Horas registradas no mês atual</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-accent shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Anterior</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{previousBalance}</div>
          <p className="text-xs text-muted-foreground">Carregado do banco de dados</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">Calculando...</div>
          <p className="text-xs text-muted-foreground">Total acumulado (Mês + Anterior)</p>
        </CardContent>
      </Card>
    </div>
  );
}