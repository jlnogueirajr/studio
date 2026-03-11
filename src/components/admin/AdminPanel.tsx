
'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, doc, updateDoc, query, getDoc, deleteField } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, User, RotateCcw, Search, Clock, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { minutesToTime, timeToMinutes, calculateDailyWorkedMinutes, sortPontoHours, isDateDsr } from '@/lib/ponto-utils';

interface AdminPanelProps {
  onRefresh?: (refreshFn: () => void) => void;
}

export function AdminPanel({ onRefresh }: AdminPanelProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      // Busca simples sem orderBy para evitar necessidade de índices manuais no Firebase
      const snap = await getDocs(collection(firestore, 'userProfiles'));
      
      const userList = await Promise.all(snap.docs.map(async (userDoc) => {
        const data = userDoc.data();
        const matricula = userDoc.id;
        let totalBalanceStr = "00:00";
        
        try {
          const mYear = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
          const entriesSnap = await getDocs(collection(firestore, 'userProfiles', matricula, 'monthlySummaries', mYear, 'dailyEntries'));
          const records = entriesSnap.docs.map(d => d.data());
          
          let monthWorked = 0;
          let monthGoal = 0;
          
          records.forEach((r: any) => {
            const sorted = sortPontoHours(r.times);
            const worked = calculateDailyWorkedMinutes(
              sorted.filter((_, i) => i % 2 === 0),
              sorted.filter((_, i) => i % 2 !== 0)
            );
            monthWorked += worked;
            
            const [d, m, y] = r.date.split('/').map(Number);
            const { isDsr, isHoliday } = isDateDsr(new Date(y, m-1, d), data.fixedDsrDays || [0], data.referenceDsrSunday, data.holidays || []);
            const isMetaZero = isDsr || isHoliday || r.isManualDsr || r.isHoliday || r.isBankOff || r.isCompensation;
            
            if (!isMetaZero) monthGoal += (data.dailyWorkload || 440);
          });

          const prevBalance = timeToMinutes(data.previousBalance || '00:00');
          const totalBalanceMinutes = (monthWorked - monthGoal) + prevBalance;
          totalBalanceStr = minutesToTime(totalBalanceMinutes, true);
        } catch (e) {
          // Se falhar o cálculo de um usuário específico, mantém o saldo zerado para não quebrar a lista
          console.warn(`Erro ao calcular saldo do usuário ${matricula}`);
        }

        return {
          id: matricula,
          registrationNumber: data.registrationNumber || matricula,
          uid: data.uid,
          authVersion: data.authVersion || 0,
          totalBalance: totalBalanceStr
        };
      }));

      // Ordenação em memória para garantir performance e evitar erros de índice
      const sortedUsers = userList.sort((a, b) => a.registrationNumber.localeCompare(b.registrationNumber));
      setUsers(sortedUsers);
    } catch (e: any) {
      console.error("Erro no fetchUsers:", e);
      toast({ variant: "destructive", title: "Erro ao carregar usuários", description: "Verifique as permissões de administrador." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (matricula: string) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, 'userProfiles', matricula);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error("Usuário não localizado.");
      
      const data = docSnap.data();
      const newVersion = (data?.authVersion || 0) + 1;
      
      await updateDoc(docRef, {
        authVersion: newVersion,
        uid: deleteField(),
        updatedAt: new Date().toISOString()
      });
      
      toast({ 
        title: `Acesso de ${matricula} resetado!`, 
        description: "O colaborador deverá criar uma nova senha no próximo acesso." 
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
                Gerencie acessos e resete senhas para novos cadastros.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Buscar por matrícula..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 font-bold border-border bg-background focus-visible:ring-primary"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-primary w-12 h-12" />
              <p className="text-xs font-black text-muted-foreground uppercase animate-pulse">Sincronizando Banco de Dados...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className="font-black text-foreground uppercase text-xs">Matrícula</TableHead>
                  <TableHead className="font-black text-foreground uppercase text-xs">Acesso</TableHead>
                  <TableHead className="font-black text-foreground uppercase text-xs text-right">Saldo Geral</TableHead>
                  <TableHead className="font-black text-foreground uppercase text-xs text-center w-40">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id} className="hover:bg-accent/30 border-border">
                      <TableCell className="font-black text-foreground text-lg tracking-widest">{u.registrationNumber}</TableCell>
                      <TableCell className="text-muted-foreground font-bold">
                        <div className="flex flex-col">
                          <span className="text-xs">{u.uid ? 'Ativo' : 'Pendente'}</span>
                          <span className="text-[10px] opacity-70">v{u.authVersion || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`px-3 py-1 rounded-full font-black text-sm inline-flex items-center gap-1.5 ${u.totalBalance.startsWith('-') ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                          <Clock className="w-3 h-3" /> {u.totalBalance}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {u.registrationNumber !== '000000' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleResetPassword(u.registrationNumber)}
                            className="font-black text-xs hover:bg-destructive/10 text-destructive border-destructive/20"
                          >
                            <RotateCcw className="w-3 h-3 mr-2" /> Zerar Senha
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
                        <p className="uppercase text-xs tracking-widest">Nenhum usuário localizado.</p>
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
