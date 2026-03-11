
'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, doc, updateDoc, query, getDoc, deleteField } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, User, RotateCcw, Search, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { minutesToTime, timeToMinutes, calculateDailyWorkedMinutes, sortPontoHours, isDateDsr } from '@/lib/ponto-utils';

interface AdminPanelProps {
  onRefresh?: (refreshFn: () => void) => void;
}

export function AdminPanel({ onRefresh }: AdminPanelProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const firestore = useFirestore();

  useEffect(() => {
    fetchUsers();
    if (onRefresh) onRefresh(fetchUsers);
  }, [firestore]);

  const fetchUsers = async () => {
    if (!firestore) return;
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(firestore, 'userProfiles'));
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const mYear = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

      const userList = await Promise.all(snap.docs.map(async (userDoc) => {
        const data = userDoc.data();
        const matricula = userDoc.id;
        let totalBalanceStr = "---";
        
        try {
          // Só calcula se o mês atual for igual ou posterior ao mês do saldo inicial
          const startMonth = data.previousBalanceMonth || 1;
          const startYear = data.previousBalanceYear || 2000;
          
          const isViewAfterStart = currentYear > startYear || (currentYear === startYear && currentMonth >= startMonth);

          let monthWorked = 0;
          let monthGoal = 0;

          if (isViewAfterStart) {
            const entriesSnap = await getDocs(collection(firestore, 'userProfiles', matricula, 'monthlySummaries', mYear, 'dailyEntries'));
            const records = entriesSnap.docs.map(d => d.data());
            const todayStr = new Date().toLocaleDateString('pt-BR');
            
            records.forEach((r: any) => {
              // Não conta o dia de hoje no saldo acumulado (mesma regra do dashboard)
              if (r.date === todayStr) return;

              const sorted = sortPontoHours(r.times);
              const worked = calculateDailyWorkedMinutes(
                sorted.filter((_, i) => i % 2 === 0),
                sorted.filter((_, i) => i % 2 !== 0)
              );
              
              const [d, m, y] = r.date.split('/').map(Number);
              const dateObj = new Date(y, m-1, d);
              
              // Dias futuros não contam
              if (dateObj > now) return;

              const { isDsr, isHoliday } = isDateDsr(dateObj, data.fixedDsrDays || [0], data.referenceDsrSunday, data.holidays || []);
              const isMetaZero = isDsr || isHoliday || r.isManualDsr || r.isHoliday || r.isBankOff || r.isCompensation;
              
              const goalForDay = isMetaZero ? 0 : (data.dailyWorkload || 440);
              
              if (worked > 0 || !isMetaZero) {
                monthWorked += worked;
                monthGoal += goalForDay;
              }
            });
          }

          const prevBalance = timeToMinutes(data.previousBalance || '00:00');
          const adjBalance = timeToMinutes(data.balanceAdjustment || '00:00');
          
          const totalBalanceMinutes = isViewAfterStart 
            ? (monthWorked - monthGoal) + prevBalance + adjBalance
            : prevBalance + adjBalance;

          totalBalanceStr = minutesToTime(totalBalanceMinutes, true);
        } catch (e) {
          totalBalanceStr = data.previousBalance || "---";
        }

        return {
          id: matricula,
          registrationNumber: data.registrationNumber || matricula,
          uid: data.uid,
          authVersion: data.authVersion || 0,
          totalBalance: totalBalanceStr
        };
      }));

      const sortedUsers = userList.sort((a, b) => a.registrationNumber.localeCompare(b.registrationNumber));
      setUsers(sortedUsers);
    } catch (e: any) {
      console.error("Erro no fetchUsers ADM:", e);
      toast({ variant: "destructive", title: "Erro ao carregar usuários", description: "Verifique a conexão com o banco." });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchUsers();
  };

  const handleResetPassword = async (matricula: string) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, 'userProfiles', matricula);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error("Perfil não localizado.");
      
      const data = docSnap.data();
      const newVersion = (data?.authVersion || 0) + 1;
      
      await updateDoc(docRef, {
        authVersion: newVersion,
        uid: deleteField(),
        updatedAt: new Date().toISOString()
      });
      
      toast({ 
        title: `Acesso de ${matricula} resetado!`, 
        description: "O histórico foi preservado. Peça para o colaborador definir a nova senha." 
      });
      fetchUsers();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao resetar", description: e.message });
    }
  };

  const filteredUsers = users.filter(u => 
    u.registrationNumber.includes(search)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border-border shadow-xl overflow-hidden bg-card">
        <CardHeader className="bg-muted/50 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-black text-foreground flex items-center gap-2">
                <User className="text-primary" /> PAINEL DE CONTROLE ADM
              </CardTitle>
              <CardDescription className="font-bold text-muted-foreground">
                Gerencie os colaboradores e acompanhe os saldos em tempo real.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input 
                  placeholder="Buscar matrícula..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 font-bold border-border bg-background focus-visible:ring-primary h-9"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleManualRefresh} 
                disabled={isRefreshing || isLoading}
                className="h-9 w-9 shrink-0"
              >
                <RefreshCw className={isRefreshing ? "animate-spin w-4 h-4" : "w-4 h-4"} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-primary w-12 h-12" />
              <p className="text-xs font-black text-muted-foreground uppercase animate-pulse">Calculando saldos gerais...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className="font-black text-foreground uppercase text-[11px] border-r">Matrícula</TableHead>
                  <TableHead className="font-black text-foreground uppercase text-[11px]">Acesso / Versão</TableHead>
                  <TableHead className="font-black text-foreground uppercase text-[11px] text-right bg-primary/5">Saldo Acumulado</TableHead>
                  <TableHead className="font-black text-foreground uppercase text-[11px] text-center w-40">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id} className="hover:bg-accent/30 border-border">
                      <TableCell className="font-black text-foreground text-lg tracking-widest border-r">{u.registrationNumber}</TableCell>
                      <TableCell className="text-muted-foreground font-bold">
                        <div className="flex flex-col">
                          <span className={u.uid ? "text-green-600 text-[10px] uppercase" : "text-amber-600 text-[10px] uppercase"}>
                            {u.uid ? '● Ativo' : '○ Aguardando Vínculo'}
                          </span>
                          <span className="text-[10px] opacity-70">Sessão: v{u.authVersion || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right bg-primary/5">
                        <span className={`px-3 py-1 rounded-md font-black text-sm inline-flex items-center gap-2 border ${u.totalBalance.startsWith('-') ? 'bg-red-500/10 text-red-600 border-red-500/20' : 'bg-green-500/10 text-green-600 border-green-500/20'}`}>
                          <Clock className="w-3.5 h-3.5" /> {u.totalBalance}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {u.registrationNumber !== '000000' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleResetPassword(u.registrationNumber)}
                            className="font-black text-[10px] uppercase text-destructive hover:bg-destructive/10"
                          >
                            <RotateCcw className="w-3 h-3 mr-2" /> Resetar Senha
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground font-black">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 opacity-20" />
                        <p className="uppercase text-xs tracking-widest">Nenhum resultado para "{search}"</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
