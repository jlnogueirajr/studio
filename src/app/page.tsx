'use client';

import { useState, useEffect, useMemo } from 'react';
import { MatriculaInput } from '@/components/MatriculaInput';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { DailyRecordsTable } from '@/components/dashboard/DailyRecordsTable';
import { PreviousBalanceDialog } from '@/components/PreviousBalanceDialog';
import { DsrSettingsDialog } from '@/components/DsrSettingsDialog';
import { EditTimesDialog } from '@/components/EditTimesDialog';
import { CalendarViewDialog } from '@/components/CalendarViewDialog';
import { fetchMonthData } from '@/actions/ponto-actions';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCcw, LogOut, Loader2, Calendar, Settings, FileText, Download, Wallet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { minutesToTime, timeToMinutes, calculateDailyWorkedMinutes, sortPontoHours, isDateDsr } from '@/lib/ponto-utils';

export type DailyRecord = {
  id: string;
  date: string;
  times: string[];
  monthlyTimeLogId?: string;
  isManualDsr?: boolean; 
  isManualWork?: boolean;
  isHoliday?: boolean;
  isCompensation?: boolean;
  isBankOff?: boolean;
};

export type EmployeeData = {
  matricula: string;
  previousBalance: string;
  previousHolidayBalance: number;
  lastFetch: string;
  fixedDsrDays: number[];
  referenceDsrSunday?: string | null;
  dailyWorkload: number;
  holidays: string[];
  dailyRecords: DailyRecord[];
};

export default function Home() {
  const [matricula, setMatricula] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [showDsrDialog, setShowDsrDialog] = useState(false);
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DailyRecord | null>(null);
  
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      signInAnonymously(auth).catch(err => console.error("Auth error:", err));
    }
  }, [user, isUserLoading, auth]);

  useEffect(() => {
    const saved = localStorage.getItem('last_matricula');
    if (saved && user && firestore) loadEmployeeData(saved);
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
        const base = docSnap.data();
        const logsRef = collection(firestore, 'users', user.uid, 'employees', m, 'monthlyTimeLogs', monthYear, 'dailyEntries');
        const logsSnap = await getDocs(logsRef);
        const records = logsSnap.docs.map(d => d.data() as DailyRecord);
        const sortedRecords = records.sort((a, b) => {
           const [dA, mA, yA] = a.date.split('/').map(Number);
           const [dB, mB, yB] = b.date.split('/').map(Number);
           return new Date(yB, mB-1, dB).getTime() - new Date(yA, mA-1, dA).getTime();
        });
        setEmployeeData({
          ...base,
          matricula: m,
          dailyRecords: sortedRecords,
          fixedDsrDays: base.fixedDsrDays || [0],
          dailyWorkload: base.dailyWorkload || 440,
          holidays: base.holidays || [],
          referenceDsrSunday: base.referenceDsrSunday || null,
          previousHolidayBalance: base.previousHolidayBalance || 0,
          previousBalance: base.previousBalance || '00:00'
        } as EmployeeData);
      }
    } catch (e) { toast({ variant: "destructive", title: "Erro ao carregar" }); }
    finally { setIsLoading(false); }
  };

  const handleSearch = async (m: string) => {
    if (!firestore || !user) return;
    setIsLoading(true);
    setMatricula(m);
    localStorage.setItem('last_matricula', m);
    try {
      const now = new Date();
      const mYear = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const freshData = await fetchMonthData(m, now.getMonth() + 1, now.getFullYear());
      const batch = writeBatch(firestore);
      const empRef = doc(firestore, 'users', user.uid, 'employees', m);
      const empSnap = await getDoc(empRef);
      const stored = empSnap.exists() ? empSnap.data() : null;
      const employeeBase = {
        id: m, registrationNumber: m, expectedMonthlyHours: 160,
        fixedDsrDays: stored?.fixedDsrDays || [0],
        dailyWorkload: stored?.dailyWorkload || 440,
        holidays: stored?.holidays || [],
        referenceDsrSunday: stored?.referenceDsrSunday || null,
        previousBalance: stored?.previousBalance || '00:00',
        previousHolidayBalance: stored?.previousHolidayBalance || 0,
        lastFetch: new Date().toISOString(), updatedAt: new Date().toISOString(),
        createdAt: stored?.createdAt || new Date().toISOString()
      };
      batch.set(empRef, employeeBase, { merge: true });
      const logRef = doc(firestore, 'users', user.uid, 'employees', m, 'monthlyTimeLogs', mYear);
      batch.set(logRef, { id: mYear, employeeId: m, year: now.getFullYear(), month: now.getMonth()+1, fetchedAt: new Date().toISOString() }, { merge: true });
      freshData.forEach(record => {
        const dayId = record.date.replace(/\//g, '-');
        const dayRef = doc(firestore, 'users', user.uid, 'employees', m, 'monthlyTimeLogs', mYear, 'dailyEntries', dayId);
        batch.set(dayRef, { ...record, id: dayId, monthlyTimeLogId: mYear }, { merge: true });
      });
      await batch.commit();
      await loadEmployeeData(m);
      if (!stored) setShowBalanceDialog(true);
      toast({ title: "Sincronizado" });
    } catch (e: any) { toast({ variant: "destructive", title: "Erro", description: e.message }); }
    finally { setIsLoading(false); }
  };

  const handleSaveDsrSettings = async (days: number[], refSun: string | null, workload: number, hdays: string[]) => {
    if (employeeData && matricula && firestore && user) {
      try {
        const docRef = doc(firestore, 'users', user.uid, 'employees', matricula);
        await setDoc(docRef, { fixedDsrDays: days, referenceDsrSunday: refSun, dailyWorkload: workload, holidays: hdays }, { merge: true });
        setEmployeeData({ ...employeeData, fixedDsrDays: days, referenceDsrSunday: refSun, dailyWorkload: workload, holidays: hdays });
        setShowDsrDialog(false);
        toast({ title: "Configurações salvas" });
      } catch (e) { toast({ variant: "destructive", title: "Erro ao salvar" }); }
    }
  };

  const handleManualEdit = async (times: string[], options: any) => {
    if (editingRecord && matricula && firestore && user) {
      try {
        const mYear = editingRecord.monthlyTimeLogId!;
        const dayRef = doc(firestore, 'users', user.uid, 'employees', matricula, 'monthlyTimeLogs', mYear, 'dailyEntries', editingRecord.id);
        await setDoc(dayRef, { times, ...options }, { merge: true });
        const updated = employeeData?.dailyRecords.map(r => r.id === editingRecord.id ? { ...r, times, ...options } : r) || [];
        setEmployeeData(prev => prev ? { ...prev, dailyRecords: updated } : null);
        setEditingRecord(null);
        toast({ title: "Salvo" });
      } catch (e) { toast({ variant: "destructive", title: "Erro" }); }
    }
  };

  const exportRhReport = () => {
    if (!employeeData) return;
    const content = `RELATÓRIO DE PONTO - MATRÍCULA #${matricula}\n` +
      `Mês de Referência: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}\n` +
      `--------------------------------------------------\n` +
      `Carga Horária: ${minutesToTime(employeeData.dailyWorkload)}\n` +
      `Saldo Anterior Banco: ${employeeData.previousBalance}\n` +
      `Saldo Anterior Feriados: ${employeeData.previousHolidayBalance} dias\n\n` +
      `OCORRÊNCIAS:\n` +
      employeeData.dailyRecords.filter(r => r.times.length === 0 || r.isCompensation || r.isHoliday).map(r => `- ${r.date}: ${r.isManualDsr ? 'DSR' : (r.isHoliday ? 'FERIADO' : (r.isBankOff ? 'FOLGA BANCO' : (r.isCompensation ? 'COMPENSAÇÃO FERIADO' : 'FALTA')))}`).join('\n') +
      `\n\nGerado em: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ponto_rh_${matricula}.txt`;
    a.click();
  };

  if (isUserLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-primary/20 pb-6">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-4xl font-bold text-primary tracking-tight">Ponto <span className="text-slate-900">Ágil</span></h1>
            <p className="text-muted-foreground font-black">Gestão corporativa de horas e escalas.</p>
          </div>
          {matricula && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowBalanceDialog(true)} className="bg-white border-primary/30 font-black"><Wallet className="w-4 h-4 mr-2" /> SALDO INICIAL</Button>
              <Button variant="outline" size="sm" onClick={exportRhReport} className="bg-white border-primary/30 font-black"><FileText className="w-4 h-4 mr-2" /> RH</Button>
              <Button variant="outline" size="sm" onClick={() => setShowCalendarDialog(true)} className="bg-white border-primary/30 font-black"><Calendar className="w-4 h-4 mr-2" /> CALENDÁRIO</Button>
              <Button variant="outline" size="sm" onClick={() => setShowDsrDialog(true)} className="bg-white border-primary/30 font-black"><Settings className="w-4 h-4 mr-2" /> ESCALA</Button>
              <Button variant="ghost" size="sm" onClick={() => { localStorage.removeItem('last_matricula'); setMatricula(null); }} className="font-bold text-destructive hover:text-destructive"><LogOut className="w-4 h-4 mr-2" /> Sair</Button>
            </div>
          )}
        </header>

        {!matricula ? (
          <div className="py-20"><MatriculaInput onSearch={handleSearch} isLoading={isLoading} /></div>
        ) : isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <RefreshCcw className="w-12 h-12 text-primary animate-spin" />
            <h2 className="text-xl font-bold">Sincronizando com o Portal...</h2>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <h2 className="text-2xl font-black text-slate-800">Matrícula <span className="text-primary">#{matricula}</span></h2>
              <Button onClick={() => handleSearch(matricula!)} variant="default" size="sm" className="shadow-lg font-black"><RefreshCcw className="w-4 h-4 mr-2" /> ATUALIZAR AGORA</Button>
            </div>

            <SummaryCards 
              records={employeeData?.dailyRecords || []} 
              previousBalance={employeeData?.previousBalance || '00:00'}
              previousHolidayBalance={employeeData?.previousHolidayBalance || 0}
              fixedDsrDays={employeeData?.fixedDsrDays || [0]}
              referenceDsrSunday={employeeData?.referenceDsrSunday}
              dailyWorkload={employeeData?.dailyWorkload || 440}
              holidays={employeeData?.holidays || []}
              onBalanceClick={() => setShowBalanceDialog(true)}
            />

            <DailyRecordsTable 
              records={employeeData?.dailyRecords || []} 
              fixedDsrDays={employeeData?.fixedDsrDays || [0]}
              referenceDsrSunday={employeeData?.referenceDsrSunday}
              dailyWorkload={employeeData?.dailyWorkload || 440}
              holidays={employeeData?.holidays || []}
              onEdit={setEditingRecord}
            />
          </div>
        )}

        <PreviousBalanceDialog isOpen={showBalanceDialog} 
          currentBalance={employeeData?.previousBalance}
          currentHolidayBalance={employeeData?.previousHolidayBalance}
          onSave={async (b, hb) => {
            if (matricula && firestore && user) {
              await setDoc(doc(firestore, 'users', user.uid, 'employees', matricula), { previousBalance: b, previousHolidayBalance: hb }, { merge: true });
              setShowBalanceDialog(false);
              loadEmployeeData(matricula);
              toast({ title: "Saldos iniciais atualizados" });
            }
          }} onClose={() => setShowBalanceDialog(false)} />
        
        <DsrSettingsDialog 
          isOpen={showDsrDialog} 
          fixedDsrDays={employeeData?.fixedDsrDays || [0]} 
          referenceSunday={employeeData?.referenceDsrSunday || null}
          dailyWorkload={employeeData?.dailyWorkload || 440}
          holidays={employeeData?.holidays || []}
          onSave={handleSaveDsrSettings} onClose={() => setShowDsrDialog(false)} 
        />

        <CalendarViewDialog 
          isOpen={showCalendarDialog} records={employeeData?.dailyRecords || []}
          fixedDsrDays={employeeData?.fixedDsrDays || [0]} referenceDsrSunday={employeeData?.referenceDsrSunday}
          dailyWorkload={employeeData?.dailyWorkload || 440} holidays={employeeData?.holidays || []}
          onClose={() => setShowCalendarDialog(false)}
        />

        {editingRecord && (
          <EditTimesDialog 
            isOpen={!!editingRecord} record={editingRecord}
            onSave={handleManualEdit} onClose={() => setEditingRecord(null)} 
          />
        )}
      </div>
      <Toaster />
    </main>
  );
}