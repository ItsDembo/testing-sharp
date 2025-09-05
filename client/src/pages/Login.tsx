import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Lock, Mail } from "lucide-react";
import AuthTerminal from "@/components/auth/AuthTerminal";
import SSOButtons from "@/components/auth/SSOButtons";
import PasswordInput from "@/components/auth/PasswordInput";
import { useStaggeredScrollAnimation } from "@/hooks/useScrollAnimation";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { createRef } = useStaggeredScrollAnimation(3, 150);

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
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-[#D8AC35]/20 dark:from-black dark:via-gray-900 dark:to-[#D8AC35]/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
        {/* Page Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black mb-6 text-gray-900 dark:text-white" style={{ fontFamily: "'Saira Condensed', sans-serif", fontStyle: 'italic', transform: 'skew(-5deg)' }}>
            SIGN IN TO SHARP SHOT
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
            Step into your terminal for real-time betting intelligence. Access +EV, arbitrage, and middling opportunities that expose where the books are vulnerable.
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-20">
          {/* Section */}
          <div>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D8AC35]/10 border border-[#D8AC35]/20 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#D8AC35]"></div>
                <span className="text-sm font-semibold text-[#D8AC35] uppercase tracking-[0.2em]">SIGN IN</span>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl text-gray-900 dark:text-white mb-6 uppercase tracking-[0.05em]" style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 900, fontStyle: 'italic', transform: 'skew(-5deg)' }}>
                YOUR BETTING COMMAND CENTER
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Sign in to power up your data-driven edge and take control of the market.
              </p>
            </div>

            {/* Centered Sign In Form */}
            <div className="max-w-md mx-auto">
              <div className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 px-8 py-7">

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        className="h-12 text-base bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-150 focus:ring-4 focus:ring-[#D8AC35]/20 focus:border-[#D8AC35] focus:shadow-lg focus:shadow-[#D8AC35]/25 pl-10"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password
                    </Label>
                    <PasswordInput
                      id="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      showLockIcon={true}
                      className="h-12 text-base bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-150 focus:ring-4 focus:ring-[#D8AC35]/20 focus:border-[#D8AC35] focus:shadow-lg focus:shadow-[#D8AC35]/25"
                    />
                  </div>

                  {/* Remember Me & Forgot Password Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                        className="border-gray-300 dark:border-gray-600 data-[state=checked]:bg-[#D8AC35] data-[state=checked]:border-[#D8AC35]"
                      />
                      <Label htmlFor="remember" className="text-sm text-gray-600 dark:text-gray-400">
                        Remember me
                      </Label>
                    </div>
                    <Link href="/forgot-password">
                      <span className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#D8AC35] hover:underline transition-colors duration-150 cursor-pointer">
                        Forgot password?
                      </span>
                    </Link>
                  </div>

                  {/* Sign In Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="relative w-full h-12 text-base bg-[#D8AC35] hover:bg-[#B8941F] active:translate-y-0.5 text-black font-semibold transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed rounded-full overflow-hidden group"
                  >
                    {/* Shimmer effect */}
                    <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 transition-transform transition-opacity duration-700 ease-out will-change-transform group-hover:opacity-100 group-hover:translate-x-full group-focus-visible:opacity-100 group-focus-visible:translate-x-full motion-reduce:transition-none"></div>
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
                    <span className="text-sm text-gray-600 dark:text-gray-400">Don't have an account? </span>
                    <Link href="/register">
                      <span className="relative text-sm text-[#D8AC35] hover:text-[#B8941F] transition-colors duration-150 cursor-pointer font-medium group">
                        Create account
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#D8AC35] group-hover:w-full transition-all duration-300 ease-out"></span>
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
            </div>

            {/* Terminal Animation Below Form */}
            <div className="max-w-md mx-auto mt-12">
              <AuthTerminal />
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8 mt-12">
              <div ref={createRef(0)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">Data-Driven</span>
              </div>
              <div ref={createRef(1)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100/50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/50">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-green-700 dark:text-green-400 uppercase tracking-wider">Transparent</span>
              </div>
              <div ref={createRef(2)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100/50 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-800/50">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-sm font-medium text-purple-700 dark:text-purple-400 uppercase tracking-wider">Secure</span>
              </div>
            </div>

            {/* Support Strip */}
            <div className="text-center mt-8">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Lock className="w-4 h-4" />
                <span>Questions about your account? </span>
                <Link href="/support">
                  <span className="relative text-[#D8AC35] hover:text-[#B8941F] transition-colors duration-150 cursor-pointer group">
                    Contact support
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#D8AC35] group-hover:w-full transition-all duration-300 ease-out"></span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}