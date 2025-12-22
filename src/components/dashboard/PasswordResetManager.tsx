import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Key, 
  Mail, 
  Loader2, 
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle
} from "lucide-react";
import { z } from "zod";

const resetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export function PasswordResetManager() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = resetSchema.safeParse({ email: email.trim(), password });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsResetting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("reset-user-password", {
        body: { 
          email: email.trim().toLowerCase(), 
          newPassword: password 
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to reset password");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Password Reset Successfully",
        description: `Password for ${email} has been updated.`,
      });
      
      setEmail("");
      setPassword("");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="bg-white border-[#004B8D]/10 shadow-sm">
      <CardHeader>
        <CardTitle className="text-[#003366] flex items-center gap-2">
          <Key className="w-5 h-5" />
          Reset User Password
        </CardTitle>
        <CardDescription className="text-[#004B8D]/60">
          Change the password for any authorized user account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-[#004B8D]">
                User Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#004B8D]/50" />
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors({});
                  }}
                  placeholder="user@company.com"
                  className="pl-10 bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] placeholder:text-[#004B8D]/40"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-password" className="text-[#004B8D]">
                New Password
              </Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#004B8D]/50" />
                <Input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors({});
                  }}
                  placeholder="Enter new password"
                  className="pl-10 pr-10 bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] placeholder:text-[#004B8D]/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#004B8D]/50 hover:text-[#004B8D]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              The user must have created an account first. This will immediately change their password.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isResetting || !email.trim() || !password}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isResetting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Reset Password
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
