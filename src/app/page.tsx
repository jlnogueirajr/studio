'use client';

import { useState, useEffect } from 'react';
import { MatriculaInput } from '@/components/MatriculaInput';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { DailyRecordsTable } from '@/components/dashboard/DailyRecordsTable';
import { PreviousBalanceDialog } from '@/components/PreviousBalanceDialog';
import { DsrSettingsDialog } from '@/components/DsrSettingsDialog';
import { EditTimesDialog } from '@/components/EditTimesDialog';
import { fetchMonthData } from '@/actions/ponto-actions';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCcw, LogOut, Loader2, Calendar, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

export type DailyRecord = {
  id: string;
  date: string;
  times: string[];
  monthlyTimeLogId?: string;
  isManualDsr?: boolean; // Se o usuário forçou esse dia como Folga
  isManualWork?: boolean; // Se o usuário forçou esse dia como Útil
};

export type EmployeeData = {
  matricula: string;
  previousBalance: string;
  lastFetch: string;
  fixedDsrDays: number[];
  dailyRecords: DailyRecord[];
};

export default function Home() {
  const [matricula, setMatricula] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [showDsrDialog, setShowDsrDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DailyRecord | null>(null);
  
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      signInAnonymously(auth).catch((err) => {
        console.error("Erro ao autenticar anonimamente:", err);
      });
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
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      
      const docRef = doc(firestore, 'users', user.uid, 'employees', m);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const base = docSnap.data() as any;
        
        const logsRef = collection(firestore, 'users', user.uid, 'employees', m, 'monthlyTimeLogs', monthYear, 'dailyEntries');
        const logsSnap = await getDocs(logsRef);
        const records = logsSnap.docs.map(d => d.data() as DailyRecord);
        
        // ORDEM DECRESCENTE para o topo (mais recentes primeiro)
        const sortedRecords = records.sort((a, b) => {
           const [dayA, monthA, yearA] = a.date.split('/').map(Number);
           const [dayB, monthB, yearB] = b.date.split('/').map(Number);
           const dateA = new Date(yearA, monthA - 1, dayA).getTime();
           const dateB = new Date(yearB, monthB - 1, dayB).getTime();
           return dateB - dateA;
        });

        setEmployeeData({
          ...base,
          matricula: m,
          dailyRecords: sortedRecords,
          fixedDsrDays: base.fixedDsrDays || [0] // Default Domingo
        });
      } else {
        setEmployeeData(null);
      }
    } catch (e: any) {
      console.error("Erro ao carregar dados:", e);
      toast({ variant: "destructive", title: "Erro ao carregar dados" });
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
      const monthYear = `${year}-${month.toString().padStart(2, '0')}`;

      const freshData = await fetchMonthData(m, month, year);
      
      const batch = writeBatch(firestore);
      const empRef = doc(firestore, 'users', user.uid, 'employees', m);
      const empSnap = await getDoc(empRef);
      const stored = empSnap.exists() ? empSnap.data() : null;

      const employeeBase = {
        id: m,
        registrationNumber: m,
        expectedMonthlyHours: 160,
        fixedDsrDays: stored?.fixedDsrDays || [0],
        previousBalance: stored?.previousBalance || '00:00',
        lastFetch: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdAt: stored?.createdAt || new Date().toISOString()
      };
      batch.set(empRef, employeeBase, { merge: true });

      const logRef = doc(firestore, 'users', user.uid, 'employees', m, 'monthlyTimeLogs', monthYear);
      batch.set(logRef, {
        id: monthYear,
        employeeId: m,
        year: year,
        month: month,
        fetchedAt: new Date().toISOString()
      }, { merge: true });

      freshData.forEach(record => {
        const dayId = record.date.replace(/\//g, '-');
        const dayRef = doc(firestore, 'users', user.uid, 'employees', m, 'monthlyTimeLogs', monthYear, 'dailyEntries', dayId);
        
        // Mantém overrides manuais se já existirem
        batch.set(dayRef, {
          ...record,
          id: dayId,
          monthlyTimeLogId: monthYear,
          dailyTotalHours: 0
        }, { merge: true });
      });

      await batch.commit();
      await loadEmployeeData(m);

      if (!stored) setShowBalanceDialog(true);

      toast({ title: "Sincronização concluída", description: "Dados atualizados com sucesso." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro na consulta", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBalance = async (balance: string) => {
    if (employeeData && matricula && firestore && user) {
      try {
        const docRef = doc(firestore, 'users', user.uid, 'employees', matricula);
        await setDoc(docRef, { previousBalance: balance }, { merge: true });
        setEmployeeData({ ...employeeData, previousBalance: balance });
        setShowBalanceDialog(false);
        toast({ title: "Saldo atualizado" });
      } catch (e) { toast({ variant: "destructive", title: "Erro ao salvar" }); }
    }
  };

  const handleSaveDsr = async (days: number[]) => {
    if (employeeData && matricula && firestore && user) {
      try {
        const docRef = doc(firestore, 'users', user.uid, 'employees', matricula);
        await setDoc(docRef, { fixedDsrDays: days }, { merge: true });
        setEmployeeData({ ...employeeData, fixedDsrDays: days });
        setShowDsrDialog(false);
        toast({ title: "Configuração de DSR salva" });
      } catch (e) { toast({ variant: "destructive", title: "Erro ao salvar" }); }
    }
  };

  const handleManualEdit = async (times: string[], isManualDsr: boolean, isManualWork: boolean) => {
    if (editingRecord && matricula && firestore && user) {
      try {
        const monthYear = editingRecord.monthlyTimeLogId!;
        const dayRef = doc(firestore, 'users', user.uid, 'employees', matricula, 'monthlyTimeLogs', monthYear, 'dailyEntries', editingRecord.id);
        
        await setDoc(dayRef, { times, isManualDsr, isManualWork }, { merge: true });
        
        // Atualiza estado local
        const updatedRecords = employeeData?.dailyRecords.map(r => 
          r.id === editingRecord.id ? { ...r, times, isManualDsr, isManualWork } : r
        ) || [];
        
        setEmployeeData(prev => prev ? { ...prev, dailyRecords: updatedRecords } : null);
        setEditingRecord(null);
        toast({ title: "Alterações salvas com sucesso" });
      } catch (e) { toast({ variant: "destructive", title: "Erro ao editar" }); }
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
        toast({ title: "Dados removidos localmente" });
      } catch (e) {} finally { setIsLoading(false); }
    }
  };

  if (isUserLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-primary/20 pb-6">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-4xl font-bold text-primary tracking-tight">Ponto <span className="text-slate-800">Ágil</span></h1>
            <p className="text-muted-foreground">Gestão completa do seu banco de horas.</p>
          </div>
          {matricula && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDsrDialog(true)}><Settings className="w-4 h-4 mr-2" /> DSRs</Button>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={handleClear}><Trash2 className="w-4 h-4 mr-2" /> Limpar</Button>
              <Button variant="ghost" size="sm" onClick={() => { localStorage.removeItem('last_matricula'); setMatricula(null); }}><LogOut className="w-4 h-4 mr-2" /> Sair</Button>
            </div>
          )}
        </header>

        {!matricula && !isLoading ? (
          <div className="py-20"><MatriculaInput onSearch={handleSearch} isLoading={isLoading} /></div>
        ) : isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <RefreshCcw className="w-12 h-12 text-primary animate-spin" />
            <h2 className="text-xl font-semibold">Sincronizando...</h2>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Matrícula <span className="text-primary">#{matricula}</span></h2>
              <div className="flex gap-2">
                <Button onClick={() => setShowBalanceDialog(true)} variant="outline" size="sm"><Calendar className="w-4 h-4 mr-2" /> Saldo Anterior</Button>
                <Button onClick={() => handleSearch(matricula!)} variant="default" size="sm"><RefreshCcw className="w-4 h-4 mr-2" /> Sincronizar</Button>
              </div>
            </div>

            <SummaryCards 
              records={employeeData?.dailyRecords || []} 
              previousBalance={employeeData?.previousBalance || '00:00'}
              fixedDsrDays={employeeData?.fixedDsrDays || [0]}
            />

            <DailyRecordsTable 
              records={employeeData?.dailyRecords || []} 
              fixedDsrDays={employeeData?.fixedDsrDays || [0]}
              onEdit={(record) => setEditingRecord(record)}
            />
          </div>
        )}

        <PreviousBalanceDialog isOpen={showBalanceDialog} onSave={handleSaveBalance} onClose={() => setShowBalanceDialog(false)} />
        <DsrSettingsDialog isOpen={showDsrDialog} fixedDsrDays={employeeData?.fixedDsrDays || [0]} onSave={handleSaveDsr} onClose={() => setShowDsrDialog(false)} />
        {editingRecord && (
          <EditTimesDialog 
            isOpen={!!editingRecord} 
            record={editingRecord}
            onSave={handleManualEdit} 
            onClose={() => setEditingRecord(null)} 
          />
        )}
      </div>
      <Toaster />
    </main>
  );
}
