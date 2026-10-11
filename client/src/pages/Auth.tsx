import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogIn, UserPlus, Mail, Lock, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { signInWithGoogle as firebaseGoogleSignIn } from "@/lib/firebase";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, googleSignIn } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      const user = await firebaseGoogleSignIn();
      const idToken = await user.getIdToken();
      await googleSignIn(idToken, user.email || undefined, user.displayName || undefined);
      toast.success("Signed in with Google!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Google sign in failed");
    }
  };

  // Redirect to home if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading state while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xs tracking-[0.3em] text-primary mb-4 font-semibold">LOADING</p>
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Don't render the form if user is already logged in (will redirect)
  if (user) {
    return null;
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response: any = await api.post("/auth/forgot-password", { email });
      toast.success(response.message);
      setIsForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success("Logged in successfully");
        navigate("/");
      } else {
        await signUp(email, password, displayName);
        toast.success("Account created successfully!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm mx-4"
        >
          <button 
            onClick={() => setIsForgotPassword(false)} 
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors mb-8 font-medium"
          >
            <ArrowLeft className="w-3 h-3" /> BACK TO LOGIN
          </button>

          <p className="text-xs tracking-[0.3em] text-primary mb-2 font-semibold">RECOVER ACCESS</p>
          <h1 className="text-3xl font-bold mb-4 text-foreground">Forgot Password</h1>
          <p className="text-sm text-muted-foreground mb-8">Enter your email and we'll send you a link to reset your password.</p>

          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div>
              <label className="text-xs tracking-wider text-muted-foreground block mb-1.5 font-medium">EMAIL</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-card border border-border/30 rounded-xl pl-10 pr-4 py-3 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full tracking-wider rounded-full h-12 text-sm font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/20" disabled={submitting}>
              {submitting ? "SENDING..." : "SEND RESET LINK"}
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm mx-4"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors mb-8 font-medium">
          <ArrowLeft className="w-3 h-3" /> BACK
        </Link>

        <p className="text-xs tracking-[0.3em] text-primary mb-2 font-semibold">
          {isLogin ? "WELCOME BACK" : "JOIN US"}
        </p>
        <h1 className="text-3xl font-bold mb-8 text-foreground">{isLogin ? "Sign In" : "Create Account"}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-xs tracking-wider text-muted-foreground block mb-1.5 font-medium">DISPLAY NAME</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-card border border-border/30 rounded-xl pl-10 pr-4 py-3 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                  placeholder="Your name"
                  required
                />
              </div>
            </div>
          )}
          <div>
            <label className="text-xs tracking-wider text-muted-foreground block mb-1.5 font-medium">EMAIL</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-card border border-border/30 rounded-xl pl-10 pr-4 py-3 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs tracking-wider text-muted-foreground font-medium uppercase">PASSWORD</label>
              {isLogin && (
                <button 
                  type="button" 
                  onClick={() => setIsForgotPassword(true)}
                  className="text-[10px] text-primary hover:underline font-bold uppercase tracking-widest"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-card border border-border/30 rounded-xl pl-10 pr-11 py-3 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full tracking-wider rounded-full h-12 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20" size="lg" disabled={submitting}>
            {submitting ? "LOADING..." : isLogin ? (
              <><LogIn className="w-4 h-4 mr-2" /> SIGN IN</>
            ) : (
              <><UserPlus className="w-4 h-4 mr-2" /> CREATE ACCOUNT</>
            )}
          </Button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/30"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
              <span className="bg-background px-4 text-muted-foreground">OR CONTINUE WITH</span>
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            onClick={handleGoogleSignIn}
            className="w-full tracking-wider rounded-full h-12 text-sm font-semibold border-border/30 hover:border-primary/30 group"
          >
            <svg className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            GOOGLE
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline font-medium"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
