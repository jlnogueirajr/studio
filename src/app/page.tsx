
'use client';

import { useState, useEffect } from 'react';
import { MatriculaInput } from '@/components/MatriculaInput';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { DailyRecordsTable } from '@/components/dashboard/DailyRecordsTable';
import { PreviousBalanceDialog } from '@/components/PreviousBalanceDialog';
import { fetchAndExtractPonto } from '@/actions/ponto-actions';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCcw, LogOut, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { RobustTimeDataExtractionOutput } from '@/ai/flows/robust-time-data-extraction-flow';
import { signInAnonymously } from 'firebase/auth';

export type EmployeeData = {
  matricula: string;
  previousBalance: string; // HH:MM
  lastFetch: string; // ISO Date
  extractedData: RobustTimeDataExtractionOutput | null;
};

export default function Home() {
  const [matricula, setMatricula] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  // Garante que o usuário está autenticado anonimamente para cumprir as regras do Firestore
  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      signInAnonymously(auth).catch(console.error);
    }
  }, [user, isUserLoading, auth]);

  useEffect(() => {
    const saved = localStorage.getItem('last_matricula');
    if (saved && user) {
      handleSearch(saved);
    }
  }, [user]);

  const handleSearch = async (m: string) => {
    if (!firestore || !user) return;
    setIsLoading(true);
    setMatricula(m);
    localStorage.setItem('last_matricula', m);

    try {
      // O caminho agora segue a regra: /users/{userId}/employees/{matricula}
      const docRef = doc(firestore, 'users', user.uid, 'employees', m);
      const docSnap = await getDoc(docRef);
      const stored = docSnap.exists() ? docSnap.data() as EmployeeData : null;

      // Chama a Server Action para o scraping
      const freshExtracted = await fetchAndExtractPonto(m);
      
      let updated: EmployeeData;

      if (stored) {
        updated = {
          ...stored,
          lastFetch: new Date().toISOString(),
          extractedData: freshExtracted
        };
      } else {
        updated = {
          matricula: m,
          previousBalance: '00:00',
          lastFetch: new Date().toISOString(),
          extractedData: freshExtracted
        };
        setShowBalanceDialog(true);
      }

      setEmployeeData(updated);
      // Salva no Firestore usando o caminho autorizado
      await setDoc(docRef, updated, { merge: true });

    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro na consulta",
        description: error.message || "Não foi possível carregar os dados. Verifique a matrícula e tente novamente."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBalance = async (balance: string) => {
    if (employeeData && matricula && firestore && user) {
      const formattedBalance = balance.includes(':') ? balance : '00:00';
      const updated = { ...employeeData, previousBalance: formattedBalance };
      setEmployeeData(updated);
      
      const docRef = doc(firestore, 'users', user.uid, 'employees', matricula);
      await setDoc(docRef, updated, { merge: true });
      
      setShowBalanceDialog(false);
      toast({
        title: "Saldo salvo",
        description: "Seu saldo anterior foi registrado com sucesso."
      });
    }
  };

  const handleClear = async () => {
    if (matricula && firestore && user) {
      setIsLoading(true);
      try {
        const docRef = doc(firestore, 'users', user.uid, 'employees', matricula);
        await deleteDoc(docRef);
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

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

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
              records={employeeData?.extractedData?.dailyRecords || []} 
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
