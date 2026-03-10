
'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, User, Key, Search, Clock, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { minutesToTime, timeToMinutes, calculateDailyWorkedMinutes, sortPontoHours, isDateDsr } from '@/lib/ponto-utils';

export function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const firestore = useFirestore();

  useEffect(() => {
    fetchUsers();
  }, [firestore]);

  const fetchUsers = async () => {
    if (!firestore) return;
    setIsLoading(true);
    try {
      const q = query(collection(firestore, 'userProfiles'), orderBy('registrationNumber'));
      const snap = await getDocs(q);
      const userList = await Promise.all(snap.docs.map(async (userDoc) => {
        const data = userDoc.data();
        const mYear = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
        const entriesSnap = await getDocs(collection(firestore, 'userProfiles', userDoc.id, 'monthlySummaries', mYear, 'dailyEntries'));
        const records = entriesSnap.docs.map(d => d.data());
        
        // Calcula saldo simplificado do mês para o resumo
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
        const totalBalance = (monthWorked - monthGoal) + prevBalance;

        return {
          id: userDoc.id,
          ...data,
          totalBalance: minutesToTime(totalBalance, true)
        };
      }));
      setUsers(userList);
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao carregar usuários" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = (matricula: string) => {
    // Como estamos no Client SDK, enviamos uma instrução
    toast({ 
      title: `Redefinição para ${matricula}`, 
      description: "Funcionalidade de troca forçada requer Firebase Admin SDK. Instrua o usuário a usar 'Esqueci minha senha' ou realize o processo manualmente no Console Firebase." 
    });
  };

  const filteredUsers = users.filter(u => 
    u.registrationNumber.includes(search) || 
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border-primary/20 shadow-xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <User className="text-primary" /> PAINEL DE CONTROLE ADM
              </CardTitle>
              <CardDescription className="font-bold text-slate-500">
                Gerencie usuários cadastrados e visualize resumos de banco de horas.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input 
                placeholder="Buscar por matrícula..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 font-bold border-slate-300 focus-visible:ring-primary"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100 hover:bg-slate-100">
                  <TableHead className="font-black text-slate-900 uppercase text-xs">Matrícula</TableHead>
                  <TableHead className="font-black text-slate-900 uppercase text-xs">E-mail de Acesso</TableHead>
                  <TableHead className="font-black text-slate-900 uppercase text-xs text-right">Saldo Geral</TableHead>
                  <TableHead className="font-black text-slate-900 uppercase text-xs text-center w-40">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id} className="hover:bg-slate-50 border-slate-100">
                      <TableCell className="font-black text-slate-900 text-lg tracking-widest">{u.registrationNumber}</TableCell>
                      <TableCell className="text-slate-500 font-bold flex items-center gap-2">
                        <Mail className="w-3 h-3" /> {u.email}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`px-3 py-1 rounded-full font-black text-sm ${u.totalBalance.startsWith('-') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                          <Clock className="w-3 h-3 inline mr-1" /> {u.totalBalance}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleResetPassword(u.registrationNumber)}
                          className="font-bold text-xs hover:bg-primary/5"
                        >
                          <Key className="w-3 h-3 mr-2" /> Alterar Senha
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-slate-400 font-black uppercase text-xs">
                      Nenhum usuário localizado.
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
