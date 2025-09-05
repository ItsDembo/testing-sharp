import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Lock } from "lucide-react";
import AuthTerminal from "@/components/auth/AuthTerminal";
import SSOButtons from "@/components/auth/SSOButtons";
import PasswordInput from "@/components/auth/PasswordInput";

export default function Register() {
  const [, setLocation] = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Enhanced password validation
  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/\d/.test(password)) {
      return "Password must contain at least one number";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return "Password must contain at least one symbol";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName || !email || !password || !confirmPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please ensure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({
        title: "Password Requirements Not Met",
        description: passwordError,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/register", {
        username: fullName, // Backend expects username field
        email,
        password,
      });

      toast({
        title: "Account Created Successfully",
        description: "Welcome to Sharp Shot! You can now log in.",
        duration: 5000,
      });

      // Redirect to login page
      setLocation("/login");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account. Please try again.",
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
            CREATE YOUR ACCOUNT
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
            Start building with real-time betting intelligence.
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D8AC35]/10 border border-[#D8AC35]/20">
            <div className="w-2 h-2 rounded-full bg-[#D8AC35]"></div>
            <span className="text-sm font-semibold text-[#D8AC35] uppercase tracking-[0.2em]">CREATE ACCOUNT</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-20">
          <div>
            {/* Centered Create Account Form */}
            <div className="max-w-md mx-auto">
              <div className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 px-8 py-7">
                <h3 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Create Account</h3>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Full Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-12 text-base bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-150 focus:ring-2 focus:ring-[#D8AC35]/30 focus:border-[#D8AC35]"
                    />
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-12 text-base bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-150 focus:ring-2 focus:ring-[#D8AC35]/30 focus:border-[#D8AC35]"
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password
                    </Label>
                    <PasswordInput
                      id="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      minLength={8}
                      className="h-12 text-base bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-150 focus:ring-2 focus:ring-[#D8AC35]/30 focus:border-[#D8AC35]"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      8+ characters, one number, one symbol.
                    </p>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Confirm Password
                    </Label>
                    <PasswordInput
                      id="confirmPassword"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-12 text-base bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-150 focus:ring-2 focus:ring-[#D8AC35]/30 focus:border-[#D8AC35]"
                    />
                  </div>

                  {/* Create Account Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="relative w-full h-12 text-base bg-[#D8AC35] hover:bg-[#B8941F] text-black font-semibold transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 -top-full group-hover:top-full bg-gradient-to-r from-transparent via-white/30 to-transparent transform transition-all duration-600 ease-out"></div>
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>

                  {/* Sign In Link */}
                  <div className="text-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Already have an account? </span>
                    <Link href="/login">
                      <span className="relative text-sm text-[#D8AC35] hover:text-[#B8941F] transition-colors duration-150 cursor-pointer font-medium group">
                        Sign in
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">Data-Driven</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100/50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/50">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-green-700 dark:text-green-400 uppercase tracking-wider">Transparent</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100/50 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-800/50">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-sm font-medium text-purple-700 dark:text-purple-400 uppercase tracking-wider">Secure</span>
              </div>
            </div>

            {/* Support Strip */}
            <div className="text-center max-w-[1600px] mx-auto mt-8">
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