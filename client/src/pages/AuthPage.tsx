import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { isFirebaseConfigured } from "@/lib/firebase";
import { isAdminRole, useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";

interface AuthPageProps {
  adminMode?: boolean;
}

export function AuthPage({ adminMode = false }: AuthPageProps) {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const syncFromServer = useCartStore((s) => s.syncFromServer);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email.trim(), password, adminMode);
      await syncFromServer();
      toast.success(`Welcome back, ${user.display_name || user.email}`);
      if (adminMode || isAdminRole(user.role)) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await signup(email.trim(), password, displayName.trim());
      await syncFromServer();
      toast.success(`Account created for ${user.display_name || user.email}`);
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const user = await googleLogin();
      await syncFromServer();
      toast.success(`Signed in as ${user.display_name || user.email}`);
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<{ message: string }>("/auth/forgot-password", {
        email: email.trim(),
      });
      toast.success(res.message || "Reset link dispatched if the account exists");
      setForgotMode(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (adminMode) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <BrandMark />
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Atelier Operations
              </span>
            </div>
            <h1 className="pt-3 font-display text-3xl text-foreground">Administrator Sign In</h1>
            <p className="text-sm text-muted-foreground">
              Sign in with an elevated staff account to manage orders, inventory, and AI listings.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">EMAIL</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">PASSWORD</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              SIGN IN
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground underline underline-offset-2">
              Return to storefront
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <div className="space-y-6 rounded-2xl border border-border bg-card p-7">
        <div className="space-y-1.5">
          <h1 className="font-display text-4xl text-foreground">Your Account</h1>
          <p className="text-sm text-muted-foreground">
            Access order history, saved bag sync, and verified purchase reviews.
          </p>
        </div>

        {forgotMode ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Account email</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <Button type="submit" className="w-full" isLoading={loading}>
              Send password reset link
            </Button>
            <button
              type="button"
              onClick={() => setForgotMode(false)}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">EMAIL</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">PASSWORD</Label>
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" isLoading={loading}>
                  SIGN IN
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name">Full name</Label>
                  <Input
                    id="signup-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nadia Rahman"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" isLoading={loading}>
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}

        {!forgotMode && isFirebaseConfigured && (
          <div className="space-y-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full"
            >
              Continue with Google
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
