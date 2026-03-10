'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, CalendarClock, Coffee } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DailyRecord } from '@/app/page';

interface EditTimesDialogProps {
  isOpen: boolean;
  record: DailyRecord;
  onSave: (times: string[], isManualDsr: boolean, isManualWork: boolean) => void;
  onClose: () => void;
}

export function EditTimesDialog({ isOpen, record, onSave, onClose }: EditTimesDialogProps) {
  const [times, setTimes] = useState<string[]>([]);
  const [dayType, setDayType] = useState<'default' | 'folga' | 'trabalho'>('default');

  useEffect(() => {
    if (isOpen) {
      setTimes(record.times || []);
      if (record.isManualDsr) setDayType('folga');
      else if (record.isManualWork) setDayType('trabalho');
      else setDayType('default');
    }
  }, [record, isOpen]);

  const handleAddTime = () => {
    setTimes([...times, '08:00']);
  };

  const handleRemoveTime = (index: number) => {
    setTimes(times.filter((_, i) => i !== index));
  };

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  const handleSave = () => {
    onSave(
      times, 
      dayType === 'folga', 
      dayType === 'trabalho'
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Ajuste Manual - {record.date}</DialogTitle>
          <DialogDescription>
            Configure os horários e o tipo de tratamento deste dia para o saldo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-bold flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary" />
              Tipo de Jornada
            </Label>
            <RadioGroup 
              value={dayType} 
              onValueChange={(v: any) => setDayType(v)}
              className="grid grid-cols-1 gap-2"
            >
              <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-slate-50 cursor-pointer transition-colors">
                <RadioGroupItem value="default" id="default" />
                <Label htmlFor="default" className="flex-1 cursor-pointer">
                  Padrão do Sistema <span className="text-xs text-muted-foreground ml-2">(Segue configuração de DSR)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-slate-50 cursor-pointer transition-colors border-green-200">
                <RadioGroupItem value="folga" id="folga" />
                <Label htmlFor="folga" className="flex-1 cursor-pointer flex items-center justify-between">
                  Forçar Folga / DSR
                  <Coffee className="w-4 h-4 text-green-600" />
                </Label>
              </div>
              <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-slate-50 cursor-pointer transition-colors border-red-100">
                <RadioGroupItem value="trabalho" id="trabalho" />
                <Label htmlFor="trabalho" className="flex-1 cursor-pointer">
                  Forçar Dia Útil <span className="text-xs text-destructive ml-2">(Desconta 07:20 se não trabalhado)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Horários de Batida
            </Label>
            <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-2">
              {times.map((time, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => handleTimeChange(index, e.target.value)}
                    className="flex-1 font-mono"
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveTime(index)} className="text-destructive h-8 w-8">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddTime} className="w-full mt-2 border-dashed">
                Adicionar Horário
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleSave} className="bg-primary hover:bg-primary/90">
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
