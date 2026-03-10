
'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DailyRecord } from '@/app/page';
import { isDateDsr, calculateDailyWorkedMinutes, minutesToTime, sortPontoHours } from '@/lib/ponto-utils';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

interface CalendarViewDialogProps {
  isOpen: boolean;
  records: DailyRecord[];
  fixedDsrDays: number[];
  referenceDsrSunday?: string | null;
  onClose: () => void;
}

export function CalendarViewDialog({ isOpen, records, fixedDsrDays, referenceDsrSunday, onClose }: CalendarViewDialogProps) {
  const currentMonth = useMemo(() => new Date(), []);
  
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    // Preenchimento do início da semana
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    
    return days;
  }, [currentMonth]);

  const recordMap = useMemo(() => {
    const map: Record<string, DailyRecord> = {};
    records.forEach(r => {
      map[r.date] = r;
    });
    return map;
  }, [records]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center justify-between">
            Visão Geral do Mês
            <span className="text-primary text-sm font-normal">
              {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-7 gap-1 border border-slate-200 rounded-lg overflow-hidden bg-slate-100 p-1">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="bg-slate-200 p-2 text-center text-xs font-black uppercase text-slate-600">
              {day}
            </div>
          ))}
          
          {daysInMonth.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="bg-slate-50/30" />;
            
            const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            const record = recordMap[dateStr];
            
            let isDsr = isDateDsr(date, fixedDsrDays, referenceDsrSunday);
            if (record?.isManualDsr) isDsr = true;
            if (record?.isManualWork) isDsr = false;

            const DAILY_GOAL = 7 * 60 + 20;
            const goalForDay = isDsr ? 0 : DAILY_GOAL;
            
            let workedMinutes = 0;
            if (record) {
              const sorted = sortPontoHours(record.times);
              workedMinutes = calculateDailyWorkedMinutes(
                sorted.filter((_, i) => i % 2 === 0),
                sorted.filter((_, i) => i % 2 !== 0)
              );
            }
            
            const balance = workedMinutes - goalForDay;
            const isFuture = date > new Date();

            return (
              <div 
                key={dateStr} 
                className={cn(
                  "min-h-[90px] p-2 bg-white relative group transition-all",
                  isDsr && "bg-green-50/50",
                  isFuture && "opacity-40 grayscale"
                )}
              >
                <span className={cn(
                  "text-sm font-bold",
                  isDsr ? "text-green-700" : "text-slate-400"
                )}>
                  {date.getDate()}
                </span>
                
                {record && (
                  <div className="mt-1 space-y-1">
                    <div className="text-[11px] font-black text-slate-800">
                      {minutesToTime(workedMinutes)}
                    </div>
                    <div className={cn(
                      "text-[10px] font-black p-0.5 rounded text-center",
                      balance >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {minutesToTime(balance, true)}
                    </div>
                  </div>
                )}
                
                {!record && !isFuture && !isDsr && (
                  <Badge variant="destructive" className="text-[8px] p-0 px-1 absolute bottom-1 right-1">-07:20</Badge>
                )}
                {isDsr && (
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 flex gap-4 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-50 border border-green-200 rounded" /> Folga / DSR</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-slate-200 rounded" /> Dia Útil</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
