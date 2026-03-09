'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PreviousBalanceDialogProps {
  isOpen: boolean;
  onSave: (balance: string) => void;
  onClose: () => void;
}

export function PreviousBalanceDialog({ isOpen, onSave, onClose }: PreviousBalanceDialogProps) {
  const [balance, setBalance] = useState('00:00');

  const handleSave = () => {
    onSave(balance);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Saldo do Mês Anterior</DialogTitle>
          <DialogDescription>
            Parece que é sua primeira consulta. Informe o saldo acumulado do mês anterior para complementar o cálculo atual.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="balance" className="text-right">
              Saldo
            </Label>
            <Input
              id="balance"
              type="text"
              placeholder="HH:MM"
              className="col-span-3 focus-visible:ring-primary"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Salvar Saldo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}