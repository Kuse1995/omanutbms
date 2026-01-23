import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { LayoutDashboard, Mail, Loader2, AlertCircle, Shield, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, checkAuthorizedEmail } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { PlanSelector } from "@/components/auth/PlanSelector";
import { BillingPlan, BILLING_PLANS } from "@/lib/billing-plans";
import { supabase } from "@/integrations/supabase/client";
import { getBrandingFromProfile, DEFAULT_BRANDING, type BrandingConfig } from "@/lib/branding-config";
import { hexToHSL } from "@/contexts/BrandingContext";

interface ForgotPasswordFormProps {
  email: string;
  setEmail: (email: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  toast: ReturnType<typeof useToast>["toast"];
  onBack: () => void;
  branding: BrandingConfig;
}

const ForgotPasswordForm = ({
  email,
  setEmail,
  isLoading,
  setIsLoading,
  errors,
  setErrors,
  resetPassword,
  toast,
  onBack,
  branding,
}: ForgotPasswordFormProps) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const emailSchema = z.string().email("Please enter a valid email address");
    const validation = emailSchema.safeParse(email);
    
    if (!validation.success) {
      setErrors({ email: validation.error.errors[0].message });
      setIsLoading(false);
      return;
    }

    // Check if email is authorized
    const isAuthorized = await checkAuthorizedEmail(email);
    if (!isAuthorized) {
      toast({
        title: "Access Denied",
        description: "This email is not authorized. Only approved administrators can reset passwords.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const { error } = await resetPassword(email);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Reset Link Sent!",
        description: "Check your email for the password reset link.",
      });
    }
  };

  const buttonStyle = branding.isWhiteLabel ? {
    background: `linear-gradient(to right, ${branding.primaryColor}, ${branding.secondaryColor})`,
  } : {};

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-slate-400 hover:text-white mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sign In
      </button>
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg font-semibold text-white">Reset Password</h2>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        Enter your email and we'll send you a link to reset your password.
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reset-email" className="text-slate-300">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@company.com"
              className="pl-11 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary"
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.email}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full text-white h-12 text-base font-medium"
          style={branding.isWhiteLabel ? buttonStyle : undefined}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            "Send Reset Link"
          )}
        </Button>
      </form>
    </div>
  );
};

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("signin");
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  
  // Tenant branding state
  const tenantSlug = searchParams.get("tenant");
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [brandingLoading, setBrandingLoading] = useState(!!tenantSlug);
  
  // Plan selection for signup
  const urlPlan = searchParams.get("plan") as BillingPlan | null;
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>(
    urlPlan && BILLING_PLANS[urlPlan] ? urlPlan : "starter"
  );

  const { signIn, signUp, resetPassword, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch tenant branding if tenant slug is provided
  useEffect(() => {
    if (!tenantSlug) {
      setBranding(DEFAULT_BRANDING);
      return;
    }

    const fetchBranding = async () => {
      setBrandingLoading(true);
      try {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .maybeSingle();

        if (tenant) {
          const { data: profile } = await supabase
            .from('business_profiles')
            .select('company_name, logo_url, primary_color, secondary_color, accent_color, tagline, slogan, white_label_enabled')
            .eq('tenant_id', tenant.id)
            .maybeSingle();

          if (profile) {
            const config = getBrandingFromProfile(profile);
            setBranding(config);
          }
        }
      } catch (error) {
        console.error('Failed to fetch tenant branding:', error);
      } finally {
        setBrandingLoading(false);
      }
    };

    fetchBranding();
  }, [tenantSlug]);

  // Generate dynamic styles from branding
  const dynamicStyles = useMemo(() => {
    if (!branding.isWhiteLabel) return {};
    
    const primary = hexToHSL(branding.primaryColor);
    const secondary = hexToHSL(branding.secondaryColor);
    
    return {
      '--auth-primary': branding.primaryColor,
      '--auth-secondary': branding.secondaryColor,
      '--auth-accent': branding.accentColor,
    } as React.CSSProperties;
  }, [branding]);

  const buttonGradient = useMemo(() => {
    if (!branding.isWhiteLabel) {
      return 'bg-gradient-to-r from-[#004B8D] to-[#0077B6] hover:from-[#003d73] hover:to-[#005a8a]';
    }
    return '';
  }, [branding.isWhiteLabel]);

  const buttonStyle = useMemo(() => {
    if (!branding.isWhiteLabel) return {};
    return {
      background: `linear-gradient(to right, ${branding.primaryColor}, ${branding.secondaryColor})`,
    };
  }, [branding]);

  const tabActiveStyle = useMemo(() => {
    if (!branding.isWhiteLabel) return {};
    return {
      backgroundColor: branding.primaryColor,
      color: 'white',
    };
  }, [branding]);

  // If plan is in URL, switch to signup tab
  useEffect(() => {
    if (urlPlan && BILLING_PLANS[urlPlan]) {
      setActiveTab("signup");
    }
  }, [urlPlan]);

  useEffect(() => {
    if (!loading && user) {
      navigate("/bms");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent, isSignUp: boolean) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const validation = authSchema.safeParse({ email, password });
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        setIsLoading(false);
        return;
      }

      // Check if email is authorized before attempting login/signup
      const isAuthorized = await checkAuthorizedEmail(email);
      if (!isAuthorized) {
        toast({
          title: "Access Denied",
          description: "This email is not authorized to access the system. Only approved administrators can log in.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account Exists",
              description: "This email is already registered. Please sign in instead.",
              variant: "destructive",
            });
            setActiveTab("signin");
          } else {
            toast({
              title: "Sign Up Failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Account Created!",
            description: "You are now signed in.",
          });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Sign In Failed",
              description: "Invalid email or password. If this is your first time, please create an account.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign In Failed",
              description: error.message,
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || brandingLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: branding.primaryColor }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" style={dynamicStyles}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header - Branded */}
        <div className="text-center mb-8">
          {branding.isWhiteLabel && branding.logoUrl ? (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4 shadow-lg overflow-hidden">
              <img 
                src={branding.logoUrl} 
                alt={branding.companyName}
                className="w-12 h-12 object-contain"
              />
            </div>
          ) : (
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg"
              style={branding.isWhiteLabel ? {
                background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
              } : {
                background: 'linear-gradient(135deg, #004B8D, #0077B6)',
              }}
            >
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-white mb-2">
            {branding.isWhiteLabel ? branding.companyName : 'Omanut BMS'}
          </h1>
          <p className="text-slate-400">
            {branding.isWhiteLabel && branding.tagline ? branding.tagline : 'Business Management System'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-700/50">
              <TabsTrigger 
                value="signin" 
                className="data-[state=active]:text-white"
                style={activeTab === 'signin' && branding.isWhiteLabel ? tabActiveStyle : undefined}
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="data-[state=active]:text-white"
                style={activeTab === 'signup' && branding.isWhiteLabel ? tabActiveStyle : undefined}
              >
                Create Account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5" style={{ color: branding.accentColor }} />
                <h2 className="text-lg font-semibold text-white">
                  Welcome Back
                </h2>
              </div>
              <p className="text-slate-400 text-sm mb-6">
                Sign in with your authorized email and password.
              </p>
              {forgotPasswordMode ? (
                <ForgotPasswordForm
                  email={email}
                  setEmail={setEmail}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  errors={errors}
                  setErrors={setErrors}
                  resetPassword={resetPassword}
                  toast={toast}
                  onBack={() => setForgotPasswordMode(false)}
                  branding={branding}
                />
              ) : (
                <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-slate-300">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="signin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your-email@company.com"
                        className="pl-11 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                        style={branding.isWhiteLabel ? {
                          '--tw-ring-color': branding.primaryColor,
                        } as React.CSSProperties : undefined}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-slate-300">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="pl-11 pr-11 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full text-white h-12 text-base font-medium ${buttonGradient}`}
                    style={branding.isWhiteLabel ? buttonStyle : undefined}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setForgotPasswordMode(true)}
                      className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
                      style={branding.isWhiteLabel ? { 
                        '--hover-color': branding.primaryColor 
                      } as React.CSSProperties : undefined}
                    >
                      Forgot your password?
                    </button>
                  </div>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5" style={{ color: branding.accentColor }} />
                <h2 className="text-lg font-semibold text-white">
                  Start Your Free Trial
                </h2>
              </div>
              <p className="text-slate-400 text-sm mb-6">
                Create your account and start your {BILLING_PLANS[selectedPlan].trialDays}-day free trial.
              </p>
              
              {/* Plan Selector */}
              <div className="mb-6">
                <PlanSelector 
                  selectedPlan={selectedPlan} 
                  onSelectPlan={setSelectedPlan} 
                />
              </div>
              
              <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-slate-300">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your-email@company.com"
                      className="pl-11 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-slate-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pl-11 pr-11 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.password}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full text-white h-12 text-base font-medium ${buttonGradient}`}
                  style={branding.isWhiteLabel ? buttonStyle : undefined}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    `Start ${BILLING_PLANS[selectedPlan].label} Trial`
                  )}
                </Button>
                
                <p className="text-xs text-center text-slate-500">
                  No credit card required • Cancel anytime
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer note */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-slate-500 text-sm">
            Access restricted to authorized personnel only.
          </p>
          <div className="flex items-center justify-center gap-2 text-slate-600 text-xs">
            <Shield className="w-3.5 h-3.5" />
            Secured with end-to-end encryption
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
