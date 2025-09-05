import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Lock } from "lucide-react";
import AuthTerminal from "@/components/auth/AuthTerminal";
import SSOButtons from "@/components/auth/SSOButtons";
import PasswordInput from "@/components/auth/PasswordInput";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username: email, // Backend still expects username field
        password,
      });

      toast({
        title: "Login Successful",
        description: "Welcome back to Sharp Shot!",
      });

      // Invalidate user queries to refresh auth state
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // Redirect to dashboard or home
      setLocation("/");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    toast({
      title: "Coming Soon",
      description: "Google sign-in will be available soon.",
    });
  };

  const handleDiscordSignIn = () => {
    toast({
      title: "Coming Soon", 
      description: "Discord sign-in will be available soon.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal via-gray-900 to-black relative overflow-hidden">
      {/* Full-bleed dark terminal grid background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 19px,
              rgba(128, 128, 128, 0.1) 20px,
              rgba(128, 128, 128, 0.1) 21px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 19px,
              rgba(128, 128, 128, 0.1) 20px,
              rgba(128, 128, 128, 0.1) 21px
            )
          `,
        }}
      />
      
      {/* Subtle radial vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.3) 100%)'
        }}
      />

      {/* Main Content - Centered container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[480px]">
          
          {/* Card with glass blur effect */}
          <div className="bg-white/5 dark:bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 p-8 mb-6">
            
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                Access Your Terminal
              </h2>
              <p className="text-gray-300 text-base">
                Your command center for betting intelligence.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-200">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 text-base bg-white/10 border-white/20 text-white placeholder-gray-400 transition-all duration-150 focus:ring-2 focus:ring-[#D8AC35]/50 focus:border-[#D8AC35] focus:bg-white/15"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-200">
                  Password
                </Label>
                <PasswordInput
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 text-base bg-white/10 border-white/20 text-white placeholder-gray-400 transition-all duration-150 focus:ring-2 focus:ring-[#D8AC35]/50 focus:border-[#D8AC35] focus:bg-white/15"
                />
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="border-white/30 data-[state=checked]:bg-[#D8AC35] data-[state=checked]:border-[#D8AC35]"
                  />
                  <Label htmlFor="remember" className="text-sm text-gray-300">
                    Remember me
                  </Label>
                </div>
                <Link href="/forgot-password">
                  <span className="text-sm text-gray-400 hover:text-[#D8AC35] hover:underline transition-colors duration-150 cursor-pointer">
                    Forgot password?
                  </span>
                </Link>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 text-base bg-[#D8AC35] hover:bg-[#B8941F] text-black font-semibold transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              {/* Create Account Link */}
              <div className="text-center">
                <span className="text-sm text-gray-400">Don't have an account? </span>
                <Link href="/register">
                  <span className="text-sm text-[#D8AC35] hover:text-[#B8941F] hover:underline transition-colors duration-150 cursor-pointer font-medium">
                    Create account
                  </span>
                </Link>
              </div>

              {/* SSO Buttons */}
              <SSOButtons
                onGoogleSignIn={handleGoogleSignIn}
                onDiscordSignIn={handleDiscordSignIn}
                disabled={isLoading}
              />
            </form>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium text-blue-400 uppercase tracking-wider">Data-Driven</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-green-400 uppercase tracking-wider">Transparent</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span className="text-sm font-medium text-purple-400 uppercase tracking-wider">Secure</span>
            </div>
          </div>

          {/* Terminal flavor (bottom strip) */}
          <AuthTerminal className="mb-4" />

          {/* Support Strip */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <Lock className="w-4 h-4" />
              <span>Questions about your account? </span>
              <Link href="/support">
                <span className="text-[#D8AC35] hover:text-[#B8941F] hover:underline transition-colors duration-150 cursor-pointer">
                  Contact support
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}