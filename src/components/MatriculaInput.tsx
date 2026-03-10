'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, UserPlus, Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
      // O getDoc agora é permitido publicamente nas regras do Firestore para essa coleção
      const docSnap = await getDoc(docRef);
      
      setIsNewUser(!docSnap.exists());
      setStep('password');
    } catch (error) {
      console.error("Erro ao verificar matrícula:", error);
      // Fallback: se houver erro de permissão ou rede, tentamos seguir para login
      // para não travar o usuário
      setIsNewUser(false);
      setStep('password');
    } finally {
      setCheckingMatricula(false);
    }
  };

  const handleSubmitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNewUser && password !== confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }
    onLogin(matricula.trim(), password, isNewUser);
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-primary/20 bg-white">
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
        <CardTitle className="text-2xl font-black text-center text-slate-800 uppercase">
          {step === 'matricula' ? 'Acessar Ponto' : isNewUser ? 'Primeiro Acesso' : 'Entrar no Sistema'}
        </CardTitle>
        <CardDescription className="text-center font-bold">
          {step === 'matricula' 
            ? 'Digite sua matrícula para começar.' 
            : isNewUser 
              ? 'Crie uma senha para seus próximos acessos.' 
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
                className="text-center text-2xl h-14 font-black tracking-widest focus-visible:ring-primary border-slate-300"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              disabled={checkingMatricula || isLoading || !matricula.trim()} 
              className="w-full h-12 text-lg font-black bg-primary hover:bg-primary/90 shadow-lg uppercase"
            >
              {checkingMatricula ? <Loader2 className="animate-spin" /> : 'Verificar Matrícula'}
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
                  className="text-center text-lg h-12 font-bold focus-visible:ring-primary border-slate-300"
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
                    className="text-center text-lg h-12 font-bold focus-visible:ring-primary border-slate-300"
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
                {isLoading ? <Loader2 className="animate-spin" /> : isNewUser ? 'Cadastrar e Entrar' : 'Fazer Login'}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setStep('matricula')}
                className="font-bold text-slate-500"
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