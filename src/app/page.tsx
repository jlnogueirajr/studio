'use client';

import { useState, useEffect } from 'react';
import { MatriculaInput } from '@/components/MatriculaInput';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { DailyRecordsTable } from '@/components/dashboard/DailyRecordsTable';
import { PreviousBalanceDialog } from '@/components/PreviousBalanceDialog';
import { fetchMonthData } from '@/actions/ponto-actions';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCcw, LogOut, Loader2, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

export type DailyRecord = {
  date: string;
  times: string[];
};

export type EmployeeData = {
  matricula: string;
  previousBalance: string;
  lastFetch: string;
  dailyRecords: DailyRecord[];
};

export default function Home() {
  const [matricula, setMatricula] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      signInAnonymously(auth).catch(console.error);
    }
  }, [user, isUserLoading, auth]);

  useEffect(() => {
    const saved = localStorage.getItem('last_matricula');
    if (saved && user && firestore) {
      loadEmployeeData(saved);
    }
  }, [user, firestore]);

  const loadEmployeeData = async (m: string) => {
    if (!firestore || !user) return;
    setIsLoading(true);
    setMatricula(m);

    try {
      const docRef = doc(firestore, 'users', user.uid, 'employees', m);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const base = docSnap.data() as any;
        // Carrega registros diários da subcoleção
        const logsRef = collection(firestore, 'users', user.uid, 'employees', m, 'dailyEntries');
        const logsSnap = await getDocs(logsRef);
        const records = logsSnap.docs.map(d => d.data() as DailyRecord);
        
        setEmployeeData({
          ...base,
          dailyRecords: records.sort((a, b) => b.date.localeCompare(a.date))
        });
      } else {
        setMatricula(m);
        setEmployeeData(null);
        handleSearch(m); // Primeira busca
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (m: string) => {
    if (!firestore || !user) return;
    setIsLoading(true);
    setMatricula(m);
    localStorage.setItem('last_matricula', m);

    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Busca dados online do mês todo (Lógica PontoBot)
      const freshData = await fetchMonthData(m, month, year);
      
      const docRef = doc(firestore, 'users', user.uid, 'employees', m);
      const docSnap = await getDoc(docRef);
      const stored = docSnap.exists() ? docSnap.data() : null;

      const newEmployeeBase = {
        matricula: m,
        previousBalance: stored?.previousBalance || '00:00',
        lastFetch: new Date().toISOString(),
      };

      // Salva no Firestore
      await setDoc(docRef, newEmployeeBase, { merge: true });
      
      // Salva cada dia em lote
      const batch = writeBatch(firestore);
      freshData.forEach(record => {
        const dayId = record.date.replace(/\//g, '-');
        const dayRef = doc(firestore, 'users', user.uid, 'employees', m, 'dailyEntries', dayId);
        batch.set(dayRef, record);
      });
      await batch.commit();

      setEmployeeData({
        ...newEmployeeBase,
        dailyRecords: freshData
      });

      if (!stored) {
        setShowBalanceDialog(true);
      }

      toast({
        title: "Sincronização concluída",
        description: `${freshData.length} dias importados do portal.`
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro na consulta",
        description: error.message || "Não foi possível carregar os dados."
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
      await setDoc(docRef, { previousBalance: formattedBalance }, { merge: true });
      
      setShowBalanceDialog(false);
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
      } catch (e) {} finally { setIsLoading(false); }
    }
  };

  if (isUserLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-primary/20 pb-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-primary font-headline tracking-tight">
              Ponto <span className="text-accent">Ágil</span>
            </h1>
            <p className="text-muted-foreground">Gestão completa do seu banco de horas mensal.</p>
          </div>
          {matricula && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-destructive" onClick={handleClear} disabled={isLoading}>
                <Trash2 className="w-4 h-4 mr-2" /> Limpar Banco
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { localStorage.removeItem('last_matricula'); setMatricula(null); }}>
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </Button>
            </div>
          )}
        </header>

        {!matricula && !isLoading ? (
          <div className="py-20"><MatriculaInput onSearch={handleSearch} isLoading={isLoading} /></div>
        ) : isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
            <RefreshCcw className="w-12 h-12 text-primary animate-spin" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Sincronizando Mês...</h2>
              <p className="text-muted-foreground">Lendo dia por dia do calendário portal. Isso pode levar alguns segundos.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Matrícula <span className="text-primary">#{matricula}</span></h2>
              <div className="flex gap-2">
                <Button onClick={() => setShowBalanceDialog(true)} variant="outline" size="sm">
                  <Calendar className="w-4 h-4 mr-2" /> Ajustar Saldo Anterior
                </Button>
                <Button onClick={() => handleSearch(matricula!)} variant="secondary" size="sm">
                  <RefreshCcw className="w-4 h-4 mr-2" /> Sincronizar Agora
                </Button>
              </div>
            </div>

            <SummaryCards 
              records={employeeData?.dailyRecords || []} 
              previousBalance={employeeData?.previousBalance || '00:00'} 
            />

            <DailyRecordsTable records={employeeData?.dailyRecords || []} />
          </div>
        )}

        <PreviousBalanceDialog isOpen={showBalanceDialog} onSave={handleSaveBalance} onClose={() => setShowBalanceDialog(false)} />
      </div>
      <Toaster />
    </main>
  );
}
