'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PreviousBalanceDialogProps {
  isOpen: boolean;
  currentBalance?: string;
  currentHolidayBalance?: number;
  onSave: (balance: string, holidayBalance: number) => void;
  onClose: () => void;
}

export function PreviousBalanceDialog({ 
  isOpen, 
  currentBalance = '00:00', 
  currentHolidayBalance = 0, 
  onSave, 
  onClose 
}: PreviousBalanceDialogProps) {
  const [balance, setBalance] = useState('00:00');
  const [holidayBalance, setHolidayBalance] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setBalance(currentBalance);
      setHolidayBalance(currentHolidayBalance);
    }
  }, [isOpen, currentBalance, currentHolidayBalance]);

  const handleSave = () => {
    onSave(balance, holidayBalance);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-white border-primary/20 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-primary font-black text-2xl uppercase">SALDO INICIAL</DialogTitle>
          <DialogDescription className="font-bold text-slate-600">
            Informe os saldos acumulados de meses anteriores para iniciar o controle preciso.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="balance" className="font-black text-slate-900 uppercase text-xs">
              Saldo de Horas (Banco)
            </Label>
            <Input
              id="balance"
              type="text"
              placeholder="HH:MM (ex: 10:30 ou -05:00)"
              className="focus-visible:ring-primary font-mono font-black text-lg border-slate-300 h-12"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holidayDays" className="font-black text-slate-900 uppercase text-xs">
              Saldo de Feriados Trabalhados (Dias)
            </Label>
            <Input
              id="holidayDays"
              type="number"
              placeholder="Dias acumulados para folgar"
              className="focus-visible:ring-primary font-black text-lg border-slate-300 h-12"
              value={holidayBalance}
              onChange={(e) => setHolidayBalance(parseInt(e.target.value) || 0)}
            />
            <p className="text-[11px] text-muted-foreground font-bold italic leading-tight">
              Registre aqui feriados trabalhados em meses anteriores que você ainda não folgou.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="font-black">CANCELAR</Button>
          <Button type="button" onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8">
            SALVAR SALDOS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}