'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface MatriculaInputProps {
  onSearch: (matricula: string) => void;
  isLoading: boolean;
  initialValue?: string;
}

export function MatriculaInput({ onSearch, isLoading, initialValue = '' }: MatriculaInputProps) {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch(value.trim());
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center gap-2">
          <Search className="w-6 h-6 text-primary" />
          Acessar Ponto
        </CardTitle>
        <CardDescription>
          Informe seu número de matrícula para consultar suas horas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Digite sua matrícula..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={isLoading}
              className="text-lg h-12 focus-visible:ring-primary border-primary/20"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isLoading || !value.trim()} 
            className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all active:scale-95"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Search className="mr-2 h-5 w-5" />
            )}
            Consultar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}