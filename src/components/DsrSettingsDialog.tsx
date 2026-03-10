
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Info } from 'lucide-react';

interface DsrSettingsDialogProps {
  isOpen: boolean;
  fixedDsrDays: number[];
  referenceSunday: string | null;
  onSave: (days: number[], referenceSunday: string | null) => void;
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

export function DsrSettingsDialog({ isOpen, fixedDsrDays, referenceSunday, onSave, onClose }: DsrSettingsDialogProps) {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [refSunday, setRefSunday] = useState<string>('');

  useEffect(() => {
    setSelectedDays(fixedDsrDays || []);
    setRefSunday(referenceSunday || '');
  }, [fixedDsrDays, referenceSunday, isOpen]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    onSave(selectedDays, refSunday || null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Configurar Folgas (DSR)</DialogTitle>
          <DialogDescription>
            Defina seus dias de descanso fixos e a escala de domingos.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-bold">Folgas Fixas Semanais</Label>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.value} className="flex items-center space-x-3">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold flex items-center gap-2">
              Escala de Domingo (1 Folga x 2 Trabalhos)
            </Label>
            <div className="space-y-2 bg-primary/5 p-4 rounded-lg border border-primary/10">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                Selecione um domingo em que você <strong>FOLGOU</strong>. O sistema projetará os próximos domingos automaticamente.
              </p>
              <Input 
                type="date" 
                value={refSunday} 
                onChange={(e) => setRefSunday(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleSave} className="bg-primary hover:bg-primary/90">
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
