import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import UnbsToolsLogo from "@/components/UnbsToolsLogo";

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="container-fluid flex h-14 items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em]">Back</span>
          </Link>
          <UnbsToolsLogo height={18} color="hsl(var(--foreground))" />
          <span className="pill-status hidden sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent pulse-dot" />
            RESTRICTED ACCESS
          </span>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
        {/* Left — copy */}
        <section className="container-fluid py-14 md:py-20 flex flex-col justify-center gap-8">
          <p className="eyebrow-strong">UNBS.SUITE // ACCESS</p>
          <h1 className="text-balance text-[clamp(2rem,5vw,3.75rem)] font-bold tracking-[-0.03em] leading-[0.95]">
            Suite access.
            <br />
            <span className="bg-accent px-2 -mx-1 box-decoration-clone">
              Invite-only curation.
            </span>
          </h1>
          <p className="max-w-md text-foreground/70 leading-relaxed">
            Most tools run without a login. An account is only used to sync
            presets, favorites and history across machines. No newsletter.
            No upsells.
          </p>
          <ul className="space-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <li>· 0 trackers, 0 ads</li>
            <li>· Hashed password · zero sensitive data storage</li>
            <li>· Cancel anytime</li>
          </ul>
        </section>

        {/* Right — form */}
        <section className="bg-card border-t lg:border-t-0 lg:border-l border-border flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-sm space-y-6">
            <div>
              <p className="eyebrow mb-2">{isSignUp ? "§ NEW ACCOUNT" : "§ SIGN IN"}</p>
              <h2 className="text-2xl font-bold tracking-tight">
                {isSignUp ? "Create your account." : "Sign in to your account."}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="eyebrow">
                  Email
                </Label>
                <Input id="email" type="email" placeholder="you@email.com" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="eyebrow">
                  Password
                </Label>
                <Input id="password" type="password" placeholder="••••••••" className="h-10" />
              </div>

              <Button className="w-full h-10 rounded-full font-semibold gap-2 group">
                {isSignUp ? "Create account" : "Sign in"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </Button>

              <div className="relative py-1">
                <div className="h-px bg-border" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  or
                </span>
              </div>

              <Button variant="outline" className="w-full h-10 rounded-full font-semibold">
                Continue with Google
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground pt-1">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                {isSignUp ? "Sign in" : "Request invite"}
              </button>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Login;
