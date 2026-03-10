
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PreviousBalanceDialogProps {
  isOpen: boolean;
  onSave: (balance: string, holidayBalance: number) => void;
  onClose: () => void;
}

export function PreviousBalanceDialog({ isOpen, onSave, onClose }: PreviousBalanceDialogProps) {
  const [balance, setBalance] = useState('00:00');
  const [holidayBalance, setHolidayBalance] = useState(0);

  const handleSave = () => {
    onSave(balance, holidayBalance);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-primary font-black">SALDO INICIAL</DialogTitle>
          <DialogDescription>
            Informe os saldos acumulados de meses anteriores para iniciar o controle.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="balance" className="font-bold text-slate-700 uppercase text-[10px]">
              Saldo de Horas (Banco)
            </Label>
            <Input
              id="balance"
              type="text"
              placeholder="HH:MM (ex: 10:30 ou -05:00)"
              className="focus-visible:ring-primary font-mono font-bold"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holidayDays" className="font-bold text-slate-700 uppercase text-[10px]">
              Saldo de Feriados (Dias)
            </Label>
            <Input
              id="holidayDays"
              type="number"
              placeholder="Dias acumulados para folgar"
              className="focus-visible:ring-primary font-bold"
              value={holidayBalance}
              onChange={(e) => setHolidayBalance(parseInt(e.target.value) || 0)}
            />
            <p className="text-[10px] text-muted-foreground italic">Feriados trabalhados em meses anteriores que você ainda não folgou.</p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black">
            SALVAR SALDOS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
