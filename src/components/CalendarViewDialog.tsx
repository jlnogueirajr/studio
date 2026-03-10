
'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DailyRecord } from '@/app/page';
import { isDateDsr, calculateDailyWorkedMinutes, minutesToTime, sortPontoHours } from '@/lib/ponto-utils';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarViewDialogProps {
  isOpen: boolean;
  records: DailyRecord[];
  fixedDsrDays: number[];
  referenceDsrSunday?: string | null;
  onClose: () => void;
}

export function CalendarViewDialog({ isOpen, records, fixedDsrDays, referenceDsrSunday, onClose }: CalendarViewDialogProps) {
  const [viewDate, setViewDate] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
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
  }, [viewDate]);

  const recordMap = useMemo(() => {
    const map: Record<string, DailyRecord> = {};
    records.forEach(r => {
      map[r.date] = r;
    });
    return map;
  }, [records]);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto border-primary/20 shadow-2xl">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
              <CalendarIcon className="w-6 h-6" />
              Planejamento de Escala
            </DialogTitle>
            <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-lg border">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm font-black min-w-[140px] text-center uppercase text-slate-700">
                {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-7 gap-1 border border-slate-200 rounded-xl overflow-hidden bg-slate-200 p-1 mt-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="bg-slate-300/50 p-2 text-center text-[11px] font-black uppercase text-slate-600">
              {day}
            </div>
          ))}
          
          {daysInMonth.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="bg-slate-50/20" />;
            
            const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            const record = recordMap[dateStr];
            
            let isDsr = isDateDsr(date, fixedDsrDays, referenceDsrSunday);
            if (record?.isManualDsr) isDsr = true;
            if (record?.isManualWork) isDsr = false;

            const isSunday = date.getDay() === 0;
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
            const isToday = new Date().toDateString() === date.toDateString();

            return (
              <div 
                key={dateStr} 
                className={cn(
                  "min-h-[100px] p-2 bg-white relative group transition-all border border-transparent hover:border-primary/30",
                  isDsr && "bg-green-50/60",
                  isToday && "ring-2 ring-primary ring-inset z-10"
                )}
              >
                <div className="flex justify-between items-start">
                  <span className={cn(
                    "text-sm font-black",
                    isDsr ? "text-green-700" : "text-slate-900",
                    isToday && "bg-primary text-white px-1.5 rounded-full"
                  )}>
                    {date.getDate()}
                  </span>
                  {isDsr && (
                    <span className="text-[8px] font-black uppercase px-1 bg-green-600 text-white rounded">
                      {isSunday ? 'Dom DSR' : 'DSR'}
                    </span>
                  )}
                </div>
                
                <div className="mt-2 space-y-1">
                  {record ? (
                    <>
                      <div className="text-[11px] font-black text-slate-800 tabular-nums">
                        {minutesToTime(workedMinutes)}
                      </div>
                      <div className={cn(
                        "text-[10px] font-black p-0.5 rounded text-center tabular-nums shadow-sm",
                        balance >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {minutesToTime(balance, true)}
                      </div>
                    </>
                  ) : (
                    !isDsr && date < new Date() && (
                      <div className="text-[9px] font-black bg-red-50 text-red-600 p-0.5 rounded text-center border border-red-100">
                        -07:20 (FALTA)
                      </div>
                    )
                  )}
                  {isDsr && !record && (
                    <div className="text-[9px] font-black text-green-600/70 text-center mt-2 italic">
                      Folga Livre
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-6 text-xs font-bold">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-50 border border-green-200 rounded shadow-sm" /> 
            <span className="text-green-800">DSR / FOLGA (Meta 00:00)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-slate-200 rounded shadow-sm" /> 
            <span className="text-slate-600">DIA ÚTIL (Meta 07:20)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 ring-2 ring-primary rounded shadow-sm" /> 
            <span className="text-primary uppercase">Hoje</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
