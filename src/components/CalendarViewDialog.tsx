
'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DailyRecord } from '@/app/page';
import { isDateDsr, calculateDailyWorkedMinutes, minutesToTime, sortPontoHours } from '@/lib/ponto-utils';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Star } from 'lucide-react';

interface CalendarViewDialogProps {
  isOpen: boolean;
  records: DailyRecord[];
  fixedDsrDays: number[];
  referenceDsrSunday?: string | null;
  dailyWorkload: number;
  holidays: string[];
  onClose: () => void;
}

export function CalendarViewDialog({ 
  isOpen, 
  records, 
  fixedDsrDays, 
  referenceDsrSunday, 
  dailyWorkload,
  holidays,
  onClose 
}: CalendarViewDialogProps) {
  const [viewDate, setViewDate] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto border-primary/20 shadow-2xl bg-white">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
            <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
              <CalendarIcon className="w-6 h-6" />
              PLANEJAMENTO ANUAL
            </DialogTitle>
            <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-lg border">
              <Button variant="ghost" size="icon" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="h-8 w-8">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm font-black min-w-[140px] text-center uppercase text-slate-700">
                {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="h-8 w-8">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-7 gap-1 border border-slate-200 rounded-xl overflow-hidden bg-slate-200 p-1 mt-4 shadow-inner">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="bg-slate-300/50 p-2 text-center text-[10px] font-black uppercase text-slate-600">
              {day}
            </div>
          ))}
          
          {daysInMonth.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="bg-slate-50/20" />;
            
            const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            const record = recordMap[dateStr];
            
            const { isDsr: calendarDsr, isHoliday: calendarHoliday } = isDateDsr(date, fixedDsrDays, referenceDsrSunday, holidays);
            
            const isMetaZeroDay = calendarDsr || 
                                calendarHoliday || 
                                record?.isManualDsr || 
                                record?.isHoliday || 
                                record?.isBankOff || 
                                record?.isCompensation;

            let workedMinutes = 0;
            if (record) {
              const sorted = sortPontoHours(record.times);
              workedMinutes = calculateDailyWorkedMinutes(
                sorted.filter((_, i) => i % 2 === 0),
                sorted.filter((_, i) => i % 2 !== 0)
              );
            }

            // Lógica de meta para o calendário:
            let goalForDay = 0;
            if (!isMetaZeroDay) {
              goalForDay = dailyWorkload;
            } else if ((calendarHoliday || record?.isHoliday) && workedMinutes > 0) {
              goalForDay = dailyWorkload;
            } else {
              goalForDay = 0;
            }
            
            const balance = workedMinutes - goalForDay;
            const isToday = new Date().toDateString() === date.toDateString();

            return (
              <div 
                key={dateStr} 
                className={cn(
                  "min-h-[110px] p-2 bg-white relative group transition-all border border-transparent hover:border-primary/40",
                  isMetaZeroDay && "bg-green-50/40",
                  isToday && "ring-2 ring-primary ring-inset z-10"
                )}
              >
                <div className="flex justify-between items-start">
                  <span className={cn(
                    "text-xs font-black",
                    isMetaZeroDay ? "text-green-700" : "text-slate-900",
                    isToday && "bg-primary text-white px-1.5 rounded-full"
                  )}>
                    {date.getDate()}
                  </span>
                  {(calendarHoliday || record?.isHoliday) && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                </div>
                
                <div className="mt-2 space-y-1">
                  {record ? (
                    <>
                      <div className="text-[10px] font-black text-slate-800 tabular-nums text-center">
                        {workedMinutes > 0 ? minutesToTime(workedMinutes) : "---"}
                      </div>
                      <div className={cn(
                        "text-[10px] font-black p-0.5 rounded text-center tabular-nums shadow-sm border",
                        balance >= 0 ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"
                      )}>
                        {minutesToTime(balance, true)}
                      </div>
                    </>
                  ) : (
                    !isMetaZeroDay && date < new Date() && (
                      <div className="text-[9px] font-black bg-red-50 text-red-600 p-0.5 rounded text-center border border-red-100">
                        -{minutesToTime(dailyWorkload)}
                      </div>
                    )
                  )}
                  {isMetaZeroDay && !workedMinutes && (
                    <div className="text-[8px] font-black text-green-600/70 text-center mt-1 uppercase">
                      {calendarHoliday ? "Feriado" : "Folga"}
                    </div>
                  )}
                  {isMetaZeroDay && workedMinutes > 0 && (calendarHoliday || record?.isHoliday) && (
                    <div className="text-[8px] font-black text-amber-600 text-center mt-1 uppercase">
                      TRABALHADO
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
