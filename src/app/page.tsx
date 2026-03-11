
'use client';

import { useState, useEffect } from 'react';
import { MatriculaInput } from '@/components/MatriculaInput';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { DailyRecordsTable } from '@/components/dashboard/DailyRecordsTable';
import { PreviousBalanceDialog } from '@/components/PreviousBalanceDialog';
import { DsrSettingsDialog } from '@/components/DsrSettingsDialog';
import { EditTimesDialog } from '@/components/EditTimesDialog';
import { CalendarViewDialog } from '@/components/CalendarViewDialog';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { fetchMonthData } from '@/actions/ponto-actions';
import { Button } from '@/components/ui/button';
import { RefreshCcw, LogOut, Loader2, Calendar, Settings, Wallet, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { normalizeNightShifts } from '@/lib/ponto-utils';

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
  id: string;
  matricula: string;
  previousBalance: string;
  previousHolidayBalance: number;
  lastFetch: string;
  fixedDsrDays: number[];
  referenceDsrSunday?: string | null;
  dailyWorkload: number;
  holidays: string[];
  dailyRecords: DailyRecord[];
  isAdmin?: boolean;
  uid?: string;
  authVersion?: number;
};

export default function Home() {
  const [matricula, setMatricula] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMonth, setViewMonth] = useState<number | null>(null);
  const [viewYear, setViewYear] = useState<number | null>(null);
  
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [showDsrDialog, setShowDsrDialog] = useState(false);
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DailyRecord | null>(null);
  
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  // Inicializa mês e ano apenas no cliente para evitar erros de hidratação
  useEffect(() => {
    const now = new Date();
    if (viewMonth === null) setViewMonth(now.getMonth() + 1);
    if (viewYear === null) setViewYear(now.getFullYear());
  }, []);

  // Carrega matrícula do cache e dados do usuário se autenticado
  useEffect(() => {
    const saved = localStorage.getItem('logged_matricula');
    if (saved && user && firestore && viewMonth !== null && viewYear !== null) {
      setMatricula(saved);
      loadEmployeeData(saved, viewMonth, viewYear);
    }
  }, [user, firestore, viewMonth, viewYear]);

  const loadEmployeeData = async (m: string, month: number, year: number) => {
    if (!firestore || !user) return;
    setIsLoading(true);
    try {
      const mYear = `${year}-${month.toString().padStart(2, '0')}`;
      const docRef = doc(firestore, 'userProfiles', m);
      const docSnap = await getDoc(docRef);
      
      let base = { isAdmin: m === '000000' } as any;
      if (docSnap.exists()) {
        base = docSnap.data();
      }

      // Carrega registros diários
      const logsRef = collection(firestore, 'userProfiles', m, 'monthlySummaries', mYear, 'dailyEntries');
      const logsSnap = await getDocs(logsRef);
      const rawRecords = logsSnap.docs.map(d => ({ ...d.data(), id: d.id } as DailyRecord));
      
      // Gera visualização completa do mês (dias sem batida aparecem como vazios)
      const daysInMonth = new Date(year, month, 0).getDate();
      const now = new Date();
      const isCurrentMonth = month === (now.getMonth() + 1) && year === now.getFullYear();
      const lastDayToRender = isCurrentMonth ? now.getDate() : daysInMonth;

      const fullMonthRecords: DailyRecord[] = [];
      for (let d = 1; d <= lastDayToRender; d++) {
        const dateStr = `${d.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
        const existing = rawRecords.find(r => r.date === dateStr);
        if (existing) {
          fullMonthRecords.push(existing);
        } else {
          fullMonthRecords.push({
            id: `v-${dateStr.replace(/\//g, '-')}`,
            date: dateStr,
            times: []
          });
        }
      }

      const normalized = normalizeNightShifts(fullMonthRecords);
      const sortedRecords = normalized.sort((a, b) => {
          const [dA, mA, yA] = a.date.split('/').map(Number);
          const [dB, mB, yB] = b.date.split('/').map(Number);
          return new Date(yB, mB-1, dB).getTime() - new Date(yA, mA-1, dA).getTime();
      });

      setEmployeeData({
        ...base,
        id: m,
        matricula: m,
        dailyRecords: sortedRecords,
        fixedDsrDays: base.fixedDsrDays || [0],
        dailyWorkload: base.dailyWorkload || 440,
        holidays: base.holidays || [],
        referenceDsrSunday: base.referenceDsrSunday || null,
        previousHolidayBalance: base.previousHolidayBalance || 0,
        previousBalance: base.previousBalance || '00:00',
        isAdmin: m === '000000' || base.isAdmin,
        uid: base.uid,
        authVersion: base.authVersion || 0
      } as EmployeeData);
    } catch (e) { 
      console.error("Erro ao carregar dados:", e);
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleSyncPortal = async () => {
    if (!matricula || !firestore || !user || viewMonth === null || viewYear === null) return;
    setIsLoading(true);
    try {
      const freshData = await fetchMonthData(matricula, viewMonth, viewYear);
      const mYear = `${viewYear}-${viewMonth.toString().padStart(2, '0')}`;
      
      const normalizedData = normalizeNightShifts(freshData.map(d => ({ ...d, times: [...d.times] })));
      const batch = writeBatch(firestore);
      
      const summaryRef = doc(firestore, 'userProfiles', matricula, 'monthlySummaries', mYear);
      batch.set(summaryRef, { 
        id: mYear, 
        userProfileId: matricula, 
        year: viewYear, 
        month: viewMonth,
        scrapedAt: new Date().toISOString(),
      }, { merge: true });

      normalizedData.forEach(record => {
        const dayId = record.date.replace(/\//g, '-');
        const dayRef = doc(firestore, 'userProfiles', matricula, 'monthlySummaries', mYear, 'dailyEntries', dayId);
        batch.set(dayRef, { 
          ...record, 
          id: dayId, 
          monthlyPointSummaryId: mYear,
        }, { merge: true });
      });

      await batch.commit();
      await loadEmployeeData(matricula, viewMonth, viewYear);
      toast({ title: "Portal sincronizado!" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na sincronização", description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const changeMonth = (dir: number) => {
    if (viewMonth === null || viewYear === null) return;
    let newMonth = viewMonth + dir;
    let newYear = viewYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setViewMonth(newMonth);
    setViewYear(newYear);
  };

  if (isUserLoading || viewMonth === null || viewYear === null) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;

  const isAdminUser = matricula === '000000' || employeeData?.isAdmin;

  return (
    <main className="min-h-screen bg-background p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center gap-4">
            <div className="space-y-1 text-center md:text-left">
              <h1 className="text-4xl font-black text-primary tracking-tight">Ponto <span className="text-foreground">Ágil</span></h1>
              <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">Controle de Jornada</p>
            </div>
            <ThemeToggle />
          </div>
          {matricula && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {isAdminUser && (
                <Button variant={showAdminPanel ? "default" : "outline"} size="sm" onClick={() => setShowAdminPanel(!showAdminPanel)} className="font-black border-primary/30">
                  <ShieldCheck className="w-4 h-4 mr-2" /> {showAdminPanel ? 'MEU PONTO' : 'PAINEL ADM'}
                </Button>
              )}
              {!showAdminPanel && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowBalanceDialog(true)} className="bg-card border-primary/30 font-black"><Wallet className="w-4 h-4 mr-2" /> SALDO</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowCalendarDialog(true)} className="bg-card border-primary/30 font-black"><Calendar className="w-4 h-4 mr-2" /> CALENDÁRIO</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowDsrDialog(true)} className="bg-card border-primary/30 font-black"><Settings className="w-4 h-4 mr-2" /> ESCALA</Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={async () => {
                await signOut(auth!);
                localStorage.removeItem('logged_matricula');
                setMatricula(null);
                setEmployeeData(null);
              }} className="font-bold text-destructive hover:bg-destructive/10"><LogOut className="w-4 h-4 mr-2" /> Sair</Button>
            </div>
          )}
        </header>

        {!matricula ? (
          <div className="py-20">
            <MatriculaInput onLogin={async (m, p, isSignUp) => {
              try {
                const docSnap = await getDoc(doc(firestore!, 'userProfiles', m));
                const version = docSnap.exists() ? (docSnap.data()?.authVersion || 0) : 0;
                const email = `m${m}_v${version}@pontoagil.com.br`;
                
                let cred;
                try {
                  if (isSignUp) {
                    cred = await createUserWithEmailAndPassword(auth!, email, p);
                  } else {
                    cred = await signInWithEmailAndPassword(auth!, email, p);
                  }
                } catch (authError: any) {
                  if (isSignUp && authError.code === 'auth/email-already-in-use') {
                    cred = await signInWithEmailAndPassword(auth!, email, p);
                  } else {
                    throw authError;
                  }
                }
                
                await setDoc(doc(firestore!, 'userProfiles', m), {
                  uid: cred.user.uid,
                  registrationNumber: m,
                  updatedAt: new Date().toISOString(),
                  isAdmin: m === '000000'
                }, { merge: true });
                
                localStorage.setItem('logged_matricula', m);
                setMatricula(m);
              } catch (e: any) {
                toast({ variant: "destructive", title: "Erro de Acesso", description: e.message });
              }
            }} isLoading={isLoading} />
          </div>
        ) : showAdminPanel ? (
          <AdminPanel />
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-card p-6 rounded-2xl border border-border shadow-md">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border">
                  <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft /></Button>
                  <div className="min-w-[150px] text-center font-black uppercase text-sm">
                    {new Date(viewYear, viewMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => changeMonth(1)}><ChevronRight /></Button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden md:block text-right">
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Colaborador</p>
                  <h2 className="text-xl font-black text-foreground">#{matricula}</h2>
                </div>
                <Button onClick={handleSyncPortal} disabled={isLoading} variant="default" className="shadow-xl font-black bg-primary transform transition hover:scale-105">
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <RefreshCcw className="w-5 h-5 mr-3" />}
                  ATUALIZAR DADOS
                </Button>
              </div>
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
            if (matricula && firestore) {
              await setDoc(doc(firestore, 'userProfiles', matricula), { previousBalance: b, previousHolidayBalance: hb }, { merge: true });
              setShowBalanceDialog(false);
              loadEmployeeData(matricula, viewMonth!, viewYear!);
            }
          }} onClose={() => setShowBalanceDialog(false)} />
        
        <DsrSettingsDialog 
          isOpen={showDsrDialog} 
          fixedDsrDays={employeeData?.fixedDsrDays || [0]} 
          referenceSunday={employeeData?.referenceDsrSunday || null}
          dailyWorkload={employeeData?.dailyWorkload || 440}
          holidays={employeeData?.holidays || []}
          onSave={async (days, refSun, workload, hdays) => {
            if (matricula && firestore) {
              await setDoc(doc(firestore, 'userProfiles', matricula), { 
                fixedDsrDays: days, referenceDsrSunday: refSun, dailyWorkload: workload, holidays: hdays 
              }, { merge: true });
              setShowDsrDialog(false);
              loadEmployeeData(matricula, viewMonth!, viewYear!);
            }
          }} onClose={() => setShowDsrDialog(false)} 
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
            onSave={async (times, opts) => {
              if (firestore && matricula) {
                const [d, m, y] = editingRecord.date.split('/').map(Number);
                const pathId = `${y}-${m.toString().padStart(2, '0')}`;
                const dayId = editingRecord.date.replace(/\//g, '-');
                await setDoc(doc(firestore, 'userProfiles', matricula, 'monthlySummaries', pathId, 'dailyEntries', dayId), {
                  times, date: editingRecord.date, ...opts
                }, { merge: true });
                setEditingRecord(null);
                loadEmployeeData(matricula, viewMonth!, viewYear!);
              }
            }} onClose={() => setEditingRecord(null)} 
          />
        )}
      </div>
      <Toaster />
    </main>
  );
}
