
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface DsrSettingsDialogProps {
  isOpen: boolean;
  fixedDsrDays: number[];
  onSave: (days: number[]) => void;
  onClose: () => void;
}

const DAYS_OF_WEEK = [
  { label: 'Domingo', value: 0 },
  { label: 'Segunda', value: 1 },
  { label: 'Terça', value: 2 },
  { label: 'Quarta', value: 3 },
  { label: 'Quinta', value: 4 },
  { label: 'Sexta', value: 5 },
  { label: 'Sábado', value: 6 },
];

export function DsrSettingsDialog({ isOpen, fixedDsrDays, onSave, onClose }: DsrSettingsDialogProps) {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  useEffect(() => {
    setSelectedDays(fixedDsrDays || []);
  }, [fixedDsrDays, isOpen]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    onSave(selectedDays);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configurar Folgas Fixas (DSR)</DialogTitle>
          <DialogDescription>
            Selecione os dias da semana que você normalmente não trabalha. O sistema marcará automaticamente como Folga/DSR se não houver batidas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-3">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day.value} className="flex items-center space-x-3">
                <Checkbox
                  id={`day-${day.value}`}
                  checked={selectedDays.includes(day.value)}
                  onCheckedChange={() => toggleDay(day.value)}
                />
                <Label htmlFor={`day-${day.value}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {day.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} className="bg-primary hover:bg-primary/90">
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
