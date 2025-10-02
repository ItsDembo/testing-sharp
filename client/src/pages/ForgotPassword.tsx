import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const { resetPassword, loading: isLoading, error } = useAuth();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState<number | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const { toast } = useToast();

  // Rate limiting: Max 3 requests per hour per email
  const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
  const MAX_REQUESTS = 3;

  // Check current rate limiting status
  const getRateLimitStatus = () => {
    const now = Date.now();
    const storedEmail = localStorage.getItem('resetEmail');
    const storedTime = localStorage.getItem('resetTime');
    const storedCount = localStorage.getItem('resetCount');

    if (storedEmail === email && storedTime) {
      const timeDiff = now - parseInt(storedTime);
      const count = parseInt(storedCount || '0');
      
      if (timeDiff < RATE_LIMIT_WINDOW) {
        const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - timeDiff) / (1000 * 60));
        return {
          isLimited: count >= MAX_REQUESTS,
          remainingTime,
          count
        };
      }
    }
    
    return { isLimited: false, remainingTime: 0, count: 0 };
  };

  const rateLimitStatus = getRateLimitStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    // Check rate limiting
    const now = Date.now();
    const storedEmail = localStorage.getItem('resetEmail');
    const storedTime = localStorage.getItem('resetTime');
    const storedCount = localStorage.getItem('resetCount');

    // If it's the same email and within the rate limit window
    if (storedEmail === email && storedTime) {
      const timeDiff = now - parseInt(storedTime);
      const count = parseInt(storedCount || '0');
      
      if (timeDiff < RATE_LIMIT_WINDOW && count >= MAX_REQUESTS) {
        const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - timeDiff) / (1000 * 60)); // in minutes
        toast({
          title: "Rate Limit Exceeded",
          description: `Too many password reset requests. Please wait ${remainingTime} minutes before trying again.`,
          variant: "destructive",
          duration: 8000,
        });
        return;
      }
    }

    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        // Update rate limiting data
        localStorage.setItem('resetEmail', email);
        localStorage.setItem('resetTime', now.toString());
        const newCount = (storedEmail === email && storedCount) ? parseInt(storedCount) + 1 : 1;
        localStorage.setItem('resetCount', newCount.toString());
        
        setIsSubmitted(true);
        toast({
          title: "Password Reset Email Sent",
          description: "If an account with that email exists, we've sent a password reset link.",
          duration: 6000,
        });
      } else {
        // Check if it's a rate limit error from Supabase
        if (result.error?.toLowerCase().includes('rate limit') || result.error?.toLowerCase().includes('too many')) {
          toast({
            title: "Too Many Requests",
            description: "Please wait a few minutes before requesting another password reset email.",
            variant: "destructive",
            duration: 8000,
          });
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to send password reset email. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Forgot password error:", error);
      
      // Check if it's a rate limit error
      if (error.message?.toLowerCase().includes('rate limit') || error.message?.toLowerCase().includes('too many')) {
        toast({
          title: "Too Many Requests",
          description: "Please wait a few minutes before requesting another password reset email.",
          variant: "destructive",
          duration: 8000,
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to send password reset email. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-check text-green-600 text-2xl"></i>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Check Your Email</CardTitle>
              <CardDescription className="text-gray-600">
                We've sent password reset instructions to your email address.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail("");
                  }}
                  className="w-full"
                >
                  Try Different Email
                </Button>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <Link href="/login">
                  <Button variant="ghost" className="w-full">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-gold/20">
              <i className="fas fa-key text-gold text-2xl"></i>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Forgot Password?</CardTitle>
            <CardDescription className="text-gray-600">
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full"
                />
              </div>

              {/* Rate limiting warning */}
              {rateLimitStatus.isLimited && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <i className="fas fa-exclamation-triangle text-red-400"></i>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">
                        Too many requests. Please wait {rateLimitStatus.remainingTime} minutes before trying again.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Request count indicator */}
              {rateLimitStatus.count > 0 && !rateLimitStatus.isLimited && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <i className="fas fa-info-circle text-yellow-400"></i>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        {rateLimitStatus.count} of {MAX_REQUESTS} requests used this hour.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || rateLimitStatus.isLimited}
                className="w-full bg-gradient-to-r from-gold to-yellow-600 text-charcoal hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-charcoal border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending Reset Link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Remember your password?
                </p>
                <Link href="/login">
                  <Button variant="ghost" className="text-gold hover:text-gold/80">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}