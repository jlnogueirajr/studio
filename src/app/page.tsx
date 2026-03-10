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
import { fetchMonthData } from '@/actions/ponto-actions';
import { Button } from '@/components/ui/button';
import { RefreshCcw, LogOut, Loader2, Calendar, Settings, Wallet, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, UserCredential } from 'firebase/auth';
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
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [showDsrDialog, setShowDsrDialog] = useState(false);
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DailyRecord | null>(null);
  
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    const saved = localStorage.getItem('logged_matricula');
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
      const docRef = doc(firestore, 'userProfiles', m);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const base = docSnap.data();
        const logsRef = collection(firestore, 'userProfiles', m, 'monthlySummaries', monthYear, 'dailyEntries');
        const logsSnap = await getDocs(logsRef);
        const rawRecords = logsSnap.docs.map(d => ({ ...d.data(), id: d.id } as DailyRecord));
        
        const normalized = normalizeNightShifts(rawRecords);
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
          isAdmin: base.isAdmin || m === '000000',
          uid: base.uid,
          authVersion: base.authVersion || 0
        } as EmployeeData);
      }
    } catch (e) { 
      console.error("Erro ao carregar dados:", e);
      toast({ variant: "destructive", title: "Erro ao carregar dados" }); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleAuth = async (m: string, p: string, isSignUp: boolean) => {
    if (!auth || !firestore) return;
    setIsLoading(true);

    try {
      const docRef = doc(firestore, 'userProfiles', m);
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();
      const version = data?.authVersion || 0;
      const email = `m${m}_v${version}@pontoagil.com.br`;

      let userCredential: UserCredential;

      if (isSignUp) {
        try {
          userCredential = await createUserWithEmailAndPassword(auth, email, p);
        } catch (e: any) {
          if (e.code === 'auth/email-already-in-use') {
            userCredential = await signInWithEmailAndPassword(auth, email, p);
          } else {
            throw e;
          }
        }

        const now = new Date().toISOString();
        const isAdminUser = m === '000000';
        
        const profileUpdate: any = {
          uid: userCredential.user.uid,
          updatedAt: now,
          registrationNumber: m,
          id: m,
          isAdmin: isAdminUser,
          authVersion: version
        };

        if (!docSnap.exists()) {
          profileUpdate.createdAt = now;
          profileUpdate.previousBalance = '00:00';
          profileUpdate.previousHolidayBalance = 0;
          profileUpdate.fixedDsrDays = [0];
          profileUpdate.dailyWorkload = 440;
          profileUpdate.holidays = [];
        }

        await setDoc(docRef, profileUpdate, { merge: true });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, p);
      }
      
      localStorage.setItem('logged_matricula', m);
      await loadEmployeeData(m);
      toast({ title: isSignUp ? "Acesso configurado!" : "Login realizado!" });
    } catch (e: any) {
      console.error("Erro Auth:", e);
      let errorMsg = "Ocorreu um erro. Verifique sua conexão.";
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
        errorMsg = "Senha incorreta.";
      } else if (e.code === 'auth/weak-password') {
        errorMsg = "A senha deve ter no mínimo 6 caracteres.";
      }
      toast({ variant: "destructive", title: "Erro de Acesso", description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    localStorage.removeItem('logged_matricula');
    setMatricula(null);
    setEmployeeData(null);
    setShowAdminPanel(false);
  };

  const handleSyncPortal = async () => {
    if (!matricula || !firestore || !user) return;
    setIsLoading(true);
    try {
      const now = new Date();
      const mYear = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const freshData = await fetchMonthData(matricula, now.getMonth() + 1, now.getFullYear());
      
      const normalizedData = normalizeNightShifts(freshData.map(d => ({ ...d, times: [...d.times] })));
      const batch = writeBatch(firestore);
      
      const summaryRef = doc(firestore, 'userProfiles', matricula, 'monthlySummaries', mYear);
      batch.set(summaryRef, { 
        id: mYear, 
        userProfileId: matricula, 
        year: now.getFullYear(), 
        month: now.getMonth() + 1,
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
      await loadEmployeeData(matricula);
      toast({ title: "Portal sincronizado!" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na sincronização", description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-4xl font-black text-primary tracking-tight">Ponto <span className="text-slate-900">Ágil</span></h1>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Controle de Jornada</p>
          </div>
          {matricula && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {employeeData?.isAdmin && (
                <Button variant={showAdminPanel ? "default" : "outline"} size="sm" onClick={() => setShowAdminPanel(!showAdminPanel)} className="font-black border-primary/30">
                  <ShieldCheck className="w-4 h-4 mr-2" /> {showAdminPanel ? 'MEU PONTO' : 'PAINEL ADM'}
                </Button>
              )}
              {!showAdminPanel && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowBalanceDialog(true)} className="bg-white border-primary/30 font-black"><Wallet className="w-4 h-4 mr-2" /> SALDO</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowCalendarDialog(true)} className="bg-white border-primary/30 font-black"><Calendar className="w-4 h-4 mr-2" /> CALENDÁRIO</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowDsrDialog(true)} className="bg-white border-primary/30 font-black"><Settings className="w-4 h-4 mr-2" /> ESCALA</Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout} className="font-bold text-destructive hover:bg-destructive/10"><LogOut className="w-4 h-4 mr-2" /> Sair</Button>
            </div>
          )}
        </header>

        {!matricula ? (
          <div className="py-20">
            <MatriculaInput onLogin={handleAuth} isLoading={isLoading} />
          </div>
        ) : showAdminPanel ? (
          <AdminPanel onRefresh={fetchUsers => fetchUsers()} />
        ) : isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-6">
            <RefreshCcw className="w-16 h-16 text-primary animate-spin" />
            <h2 className="text-2xl font-black text-slate-800 uppercase animate-pulse">Consultando Portal...</h2>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <ShieldCheck className="text-primary w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-slate-800">MATRÍCULA <span className="text-primary tracking-widest">#{matricula}</span></h2>
              </div>
              <Button onClick={handleSyncPortal} variant="default" size="lg" className="shadow-xl font-black bg-primary px-8 transform transition hover:scale-105 active:scale-95">
                <RefreshCcw className="w-5 h-5 mr-3" /> ATUALIZAR DADOS
              </Button>
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
              await setDoc(doc(firestore, 'userProfiles', matricula), { 
                previousBalance: b, 
                previousHolidayBalance: hb,
                updatedAt: new Date().toISOString()
              }, { merge: true });
              setShowBalanceDialog(false);
              loadEmployeeData(matricula);
              toast({ title: "Saldos atualizados!" });
            }
          }} onClose={() => setShowBalanceDialog(false)} />
        
        <DsrSettingsDialog 
          isOpen={showDsrDialog} 
          fixedDsrDays={employeeData?.fixedDsrDays || [0]} 
          referenceSunday={employeeData?.referenceDsrSunday || null}
          dailyWorkload={employeeData?.dailyWorkload || 440}
          holidays={employeeData?.holidays || []}
          onSave={async (days, refSun, workload, hdays) => {
            if (matricula && firestore && user) {
              await setDoc(doc(firestore, 'userProfiles', matricula), { 
                fixedDsrDays: days, 
                referenceDsrSunday: refSun, 
                dailyWorkload: workload, 
                holidays: hdays,
                updatedAt: new Date().toISOString()
              }, { merge: true });
              setEmployeeData({ ...employeeData!, fixedDsrDays: days, referenceDsrSunday: refSun, dailyWorkload: workload, holidays: hdays });
              setShowDsrDialog(false);
              toast({ title: "Escala salva!" });
            }
          }} onClose={() => setShowDsrDialog(false)} 
        />

        <CalendarViewDialog 
          isOpen={showCalendarDialog} records={employeeData?.dailyRecords || []}
          fixedDsrDays={employeeData?.fixedDsrDays || [0]} referenceDsrSunday={employeeData?.referenceDsrSunday}
          dailyWorkload={employeeData?.dailyWorkload || 440} holidays={employeeData?.holidays || []}
          onClose={() => setShowCalendarDialog(false)}
        />

        {editingRecord && matricula && (
          <EditTimesDialog 
            isOpen={!!editingRecord} record={editingRecord}
            onSave={async (times, options) => {
              if (firestore && user) {
                const now = new Date();
                const mYear = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                const dayRef = doc(firestore, 'userProfiles', matricula, 'monthlySummaries', mYear, 'dailyEntries', editingRecord.id);
                await setDoc(dayRef, { times, ...options }, { merge: true });
                await loadEmployeeData(matricula);
                setEditingRecord(null);
                toast({ title: "Ajuste manual salvo!" });
              }
            }} onClose={() => setEditingRecord(null)} 
          />
        )}
      </div>
      <Toaster />
    </main>
  );
}
