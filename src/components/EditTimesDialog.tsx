
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus } from 'lucide-react';

interface EditTimesDialogProps {
  isOpen: boolean;
  date: string;
  initialTimes: string[];
  onSave: (times: string[]) => void;
  onClose: () => void;
}

export function EditTimesDialog({ isOpen, date, initialTimes, onSave, onClose }: EditTimesDialogProps) {
  const [times, setTimes] = useState<string[]>([]);

  useEffect(() => {
    setTimes(initialTimes || []);
  }, [initialTimes, isOpen]);

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
    onSave(times);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Batidas - {date}</DialogTitle>
          <DialogDescription>
            Ajuste manualmente os horários registrados para este dia.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[300px] overflow-y-auto pr-2">
          {times.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma batida registrada. Adicione uma nova abaixo.</p>
          )}
          {times.map((time, index) => (
            <div key={index} className="flex items-center gap-2">
              <Label className="w-16 text-xs text-muted-foreground">{index % 2 === 0 ? 'Entrada' : 'Saída'}</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => handleTimeChange(index, e.target.value)}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => handleRemoveTime(index)} className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex justify-center border-t pt-4">
          <Button variant="outline" size="sm" onClick={handleAddTime} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Batida
          </Button>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleSave} className="bg-primary hover:bg-primary/90">
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
