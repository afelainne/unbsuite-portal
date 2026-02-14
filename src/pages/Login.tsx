import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border border-border/60 shadow-[var(--shadow-floating)]">
        <CardHeader className="text-center space-y-1 pb-4">
          <CardTitle className="text-base font-bold tracking-tight">
            UNBSERVED.
          </CardTitle>
          <CardDescription className="text-xs">
            {isSignUp ? "Crie sua conta" : "Entre na sua conta"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input id="email" type="email" placeholder="seu@email.com" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">Senha</Label>
            <Input id="password" type="password" placeholder="••••••••" className="h-9 text-sm" />
          </div>
          <Button className="w-full h-9 font-semibold text-sm">
            {isSignUp ? "Criar Conta" : "Entrar"}
          </Button>

          <div className="relative py-1">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-[11px] text-muted-foreground">
              ou
            </span>
          </div>

          <Button variant="outline" className="w-full h-9 text-sm font-medium">
            Continuar com Google
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-1">
            {isSignUp ? "Já tem conta?" : "Não tem conta?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-semibold text-foreground underline-offset-4 hover:underline"
            >
              {isSignUp ? "Entrar" : "Criar conta"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
