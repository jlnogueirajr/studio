'use client';

import { useState, useEffect } from 'react';
import { MatriculaInput } from '@/components/MatriculaInput';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { DailyRecordsTable } from '@/components/dashboard/DailyRecordsTable';
import { PreviousBalanceDialog } from '@/components/PreviousBalanceDialog';
import { getEmployeeStoredData, saveEmployeeData, fetchAndExtractPonto, EmployeeData, clearEmployeeData } from '@/actions/ponto-actions';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCcw, LogOut } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  const [matricula, setMatricula] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);

  // Load from local session if available on mount (or handle as simple SPA)
  useEffect(() => {
    const saved = localStorage.getItem('last_matricula');
    if (saved) {
      handleSearch(saved);
    }
  }, []);

  const handleSearch = async (m: string) => {
    setIsLoading(true);
    setMatricula(m);
    localStorage.setItem('last_matricula', m);

    try {
      // 1. Check if we have stored data in Firestore
      const stored = await getEmployeeStoredData(m);
      
      // 2. Fetch fresh data from the .NET site (simulated)
      const freshExtracted = await fetchAndExtractPonto(m);
      
      if (stored) {
        // Update stored with new extraction
        const updated: EmployeeData = {
          ...stored,
          lastFetch: new Date().toISOString(),
          extractedData: freshExtracted
        };
        setEmployeeData(updated);
        await saveEmployeeData(updated);
      } else {
        // No previous record, prepare to ask for balance
        const initial: EmployeeData = {
          matricula: m,
          previousBalance: '00:00',
          lastFetch: new Date().toISOString(),
          extractedData: freshExtracted
        };
        setEmployeeData(initial);
        setShowBalanceDialog(true);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro na consulta",
        description: "Não foi possível carregar os dados. Verifique a matrícula e tente novamente."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBalance = async (balance: string) => {
    if (employeeData) {
      const updated = { ...employeeData, previousBalance: balance };
      setEmployeeData(updated);
      await saveEmployeeData(updated);
      setShowBalanceDialog(false);
      toast({
        title: "Saldo salvo",
        description: "Seu saldo anterior foi registrado com sucesso."
      });
    }
  };

  const handleClear = async () => {
    if (matricula) {
      setIsLoading(true);
      try {
        await clearEmployeeData(matricula);
        localStorage.removeItem('last_matricula');
        setMatricula(null);
        setEmployeeData(null);
        toast({
          title: "Dados apagados",
          description: "Os dados desta matrícula foram removidos do sistema."
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro ao limpar",
          description: "Não foi possível remover os dados."
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleExit = () => {
    localStorage.removeItem('last_matricula');
    setMatricula(null);
    setEmployeeData(null);
  };

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-primary/20 pb-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-primary font-headline tracking-tight">
              Ponto <span className="text-accent">Ágil</span>
            </h1>
            <p className="text-muted-foreground">Gestão inteligente e rápida do seu banco de horas.</p>
          </div>
          {matricula && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-destructive border-destructive/20 hover:bg-destructive/10"
                onClick={handleClear}
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Banco
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleExit}
                disabled={isLoading}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          )}
        </header>

        {!matricula && !isLoading ? (
          <div className="py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <MatriculaInput onSearch={handleSearch} isLoading={isLoading} />
          </div>
        ) : isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
            <RefreshCcw className="w-12 h-12 text-primary animate-spin" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Consultando Dados...</h2>
              <p className="text-muted-foreground animate-pulse">
                A IA está analisando a página da empresa para extrair seus horários.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Olá, Matrícula <span className="text-primary">#{matricula}</span></h2>
              <Button onClick={() => handleSearch(matricula!)} variant="secondary" size="sm">
                <RefreshCcw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>

            <SummaryCards 
              monthSummary={employeeData?.extractedData?.monthSummary || '00:00'} 
              previousBalance={employeeData?.previousBalance || '00:00'} 
            />

            <DailyRecordsTable records={employeeData?.extractedData?.dailyRecords || []} />
          </div>
        )}

        <PreviousBalanceDialog 
          isOpen={showBalanceDialog} 
          onSave={handleSaveBalance} 
          onClose={() => setShowBalanceDialog(false)} 
        />
      </div>
      <Toaster />
    </main>
  );
}