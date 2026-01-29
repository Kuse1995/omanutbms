import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { LayoutDashboard, Mail, Loader2, AlertCircle, Shield, Lock, Eye, EyeOff, ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, checkAuthorizedEmail } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { PlanSelector } from "@/components/auth/PlanSelector";
import { BillingPlan, BILLING_PLANS } from "@/lib/billing-plans";
import { supabase } from "@/integrations/supabase/client";
import { getBrandingFromProfile, DEFAULT_BRANDING, type BrandingConfig } from "@/lib/branding-config";
import { hexToHSL } from "@/contexts/BrandingContext";
import { lovable } from "@/integrations/lovable/index";

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

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
});

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("signin");
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Tenant branding state
  const tenantSlug = searchParams.get("tenant");
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [brandingLoading, setBrandingLoading] = useState(!!tenantSlug);
  
  // Plan selection for signup - default to Pro (growth) plan
  const urlPlan = searchParams.get("plan") as BillingPlan | null;
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>(
    urlPlan && BILLING_PLANS[urlPlan] ? urlPlan : "growth"
  );
  
  // Geo-detection for currency
  const { countryCode, currency } = useGeoLocation();

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
      if (isSignUp) {
        // OPEN SIGNUP - No authorization check needed for new signups
        const validation = signupSchema.safeParse({ email, password, companyName });
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

        // Sign up with user metadata for company name and currency
        const { error } = await signUp(email, password, {
          company_name: companyName,
          detected_country: countryCode,
          preferred_currency: currency.currencyCode,
        });
        
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
            title: "Welcome! 🎉",
            description: `Your ${BILLING_PLANS[selectedPlan].trialDays}-day free trial has started.`,
          });
        }
      } else {
        // SIGN IN - Keep authorization check for login (existing tenant members)
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast({
          title: "Google Sign-In Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to start Google Sign-In. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
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
                className="data-[state=active]:bg-primary data-[state=active]:text-white text-slate-400"
                style={activeTab === 'signin' && branding.isWhiteLabel ? tabActiveStyle : undefined}
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="data-[state=active]:bg-primary data-[state=active]:text-white text-slate-400"
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

                  {/* Divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-600"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-slate-800 px-2 text-slate-400">or</span>
                    </div>
                  </div>

                  {/* Google Sign-In Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    className="w-full h-12 border-slate-600 bg-slate-700/50 text-white hover:bg-slate-700"
                  >
                    {googleLoading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    Continue with Google
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
                {/* Company Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="signup-company" className="text-slate-300">
                    Company Name
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="signup-company"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your Company Name"
                      className="pl-11 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                  {errors.companyName && (
                    <p className="text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.companyName}
                    </p>
                  )}
                </div>

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
                    `Start ${BILLING_PLANS[selectedPlan].trialDays}-Day Free Trial`
                  )}
                </Button>
                
                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-600"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-800 px-2 text-slate-400">or</span>
                  </div>
                </div>

                {/* Google Sign-Up Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full h-12 border-slate-600 bg-slate-700/50 text-white hover:bg-slate-700"
                >
                  {googleLoading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Sign up with Google
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
            By signing up, you agree to our Terms of Service and Privacy Policy.
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
