import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "manager" | "viewer";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
}

// Function to check if email is authorized (checks database)
export const checkAuthorizedEmail = async (email: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from("authorized_emails")
    .select("email")
    .ilike("email", email.trim())
    .maybeSingle();
  
  return !error && data !== null;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  canAdd: boolean;    // Managers and admins can INSERT new records
  canEdit: boolean;   // Only admins can UPDATE records (fraud prevention)
  canDelete: boolean; // Only admins can DELETE records
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile/role fetch with setTimeout to avoid deadlocks
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id, session.user.email ?? undefined);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id, session.user.email ?? undefined);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  const fetchUserData = async (userId: string, email?: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch role from user_roles table first
      let resolvedRole: AppRole | null = null;

      try {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .order("role")
          .limit(1)
          .single();

        if (roleData) {
          resolvedRole = roleData.role as AppRole;
        }
      } catch (error) {
        console.error("Error fetching role from user_roles:", error);
      }

      // Fallback: if no role found, try authorized_emails by email
      if (!resolvedRole && email) {
        try {
          const { data: authEmail } = await supabase
            .from("authorized_emails")
            .select("default_role")
            .ilike("email", email)
            .maybeSingle();

          if (authEmail?.default_role) {
            resolvedRole = authEmail.default_role as AppRole;
          }
        } catch (error) {
          console.error("Error fetching role from authorized_emails:", error);
        }
      }

      if (resolvedRole) {
        setRole(resolvedRole);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const recordLoginActivity = async (userId: string) => {
    try {
      // Record login in activity table
      await supabase.from("user_activity").insert({
        user_id: userId,
        activity_type: "login",
        user_agent: navigator.userAgent,
      });

      // Update last_login in profiles
      await supabase
        .from("profiles")
        .update({ last_login: new Date().toISOString() })
        .eq("user_id", userId);
    } catch (error) {
      console.error("Error recording login activity:", error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Record login activity on successful sign in
    if (!error && data.user) {
      recordLoginActivity(data.user.id);
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        ...(fullName && {
          data: {
            full_name: fullName,
          },
        }),
      },
    });
    return { error };
  };

  const signInWithMagicLink = async (email: string) => {
    // Check if email is authorized in database
    const isAuthorized = await checkAuthorizedEmail(email);
    if (!isAuthorized) {
      return { error: new Error("This email is not authorized to access the BMS. Contact an administrator.") };
    }

    // Redirect to root URL - the app will detect the token and redirect to /bms
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  const canAdd = role === "admin" || role === "manager";  // Can INSERT new records
  const canEdit = role === "admin";   // Only admins can UPDATE (fraud prevention)
  const canDelete = role === "admin"; // Only admins can DELETE
  const isAdmin = role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        signIn,
        signUp,
        signInWithMagicLink,
        resetPassword,
        updatePassword,
        signOut,
        canAdd,
        canEdit,
        canDelete,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
