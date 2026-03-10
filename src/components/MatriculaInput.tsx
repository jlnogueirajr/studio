'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, UserPlus, Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

interface MatriculaInputProps {
  onLogin: (matricula: string, password: string, isSignUp: boolean) => void;
  isLoading: boolean;
}

export function MatriculaInput({ onLogin, isLoading }: MatriculaInputProps) {
  const [step, setStep] = useState<'matricula' | 'password'>('matricula');
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [checkingMatricula, setCheckingMatricula] = useState(false);
  
  const firestore = useFirestore();

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMatricula = matricula.trim();
    if (!cleanMatricula || !firestore) return;

    setCheckingMatricula(true);
    try {
      const docRef = doc(firestore, 'userProfiles', cleanMatricula);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        setIsNewUser(true);
      } else {
        const data = docSnap.data();
        // É novo usuário se não houver um UID vinculado (nunca logou ou foi resetado)
        setIsNewUser(!data?.uid);
      }
      setStep('password');
    } catch (error) {
      console.error("Erro ao verificar matrícula:", error);
      // Fallback em caso de erro: permitir tentativa de login
      setIsNewUser(false);
      setStep('password');
    } finally {
      setCheckingMatricula(false);
    }
  };

  const handleSubmitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNewUser && password !== confirmPassword) {
      toast({ variant: "destructive", title: "Senhas não coincidem" });
      return;
    }
    onLogin(matricula.trim(), password, isNewUser);
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-border bg-card">
      <CardHeader>
        <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
          {step === 'matricula' ? (
            <Search className="w-8 h-8 text-primary" />
          ) : isNewUser ? (
            <UserPlus className="w-8 h-8 text-primary" />
          ) : (
            <Key className="w-8 h-8 text-primary" />
          )}
        </div>
        <CardTitle className="text-2xl font-black text-center text-foreground uppercase">
          {step === 'matricula' ? 'Acessar Ponto' : isNewUser ? 'Definir Acesso' : 'Entrar no Sistema'}
        </CardTitle>
        <CardDescription className="text-center font-bold">
          {step === 'matricula' 
            ? 'Digite sua matrícula para começar.' 
            : isNewUser 
              ? 'Crie uma nova senha para acessar sua conta.' 
              : `Digite a senha para a matrícula ${matricula}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'matricula' ? (
          <form onSubmit={handleNextStep} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Ex: 000000"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                disabled={checkingMatricula || isLoading}
                className="text-center text-2xl h-14 font-black tracking-widest focus-visible:ring-primary border-border bg-background"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              disabled={checkingMatricula || isLoading || !matricula.trim()} 
              className="w-full h-12 text-lg font-black bg-primary hover:bg-primary/90 shadow-lg uppercase"
            >
              {checkingMatricula ? <Loader2 className="animate-spin" /> : 'Próximo'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmitLogin} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="text-center text-lg h-12 font-bold focus-visible:ring-primary border-border bg-background"
                  autoFocus
                />
              </div>
              {isNewUser && (
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Confirme sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="text-center text-lg h-12 font-bold focus-visible:ring-primary border-border bg-background"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                type="submit" 
                disabled={isLoading || !password.trim()} 
                className="w-full h-12 text-lg font-black bg-primary hover:bg-primary/90 shadow-lg uppercase"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : isNewUser ? 'Cadastrar' : 'Entrar'}
              </Button>
              
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setStep('matricula')}
                className="font-bold text-muted-foreground"
              >
                Voltar
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
