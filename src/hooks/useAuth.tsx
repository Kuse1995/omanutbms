import { useState, useEffect, createContext, useContext, ReactNode, useRef, useCallback } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

import { AppRole, isAdminRole, canAddRecords, canEditRecords, canDeleteRecords } from "@/lib/role-config";

// Debounce delay to prevent token refresh storms
const AUTH_DEBOUNCE_MS = 500;
// Delay before initial fetch to let session stabilize
const SESSION_STABILIZE_MS = 200;
// Events that should NOT trigger data refetch
const IGNORED_AUTH_EVENTS: AuthChangeEvent[] = ['TOKEN_REFRESHED'];

export type { AppRole };

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  title?: string | null;
  phone: string | null;
  last_login: string | null;
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
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  canAdd: boolean;    // Managers and admins can INSERT new records
  canEdit: boolean;   // Only admins can UPDATE records (fraud prevention)
  canDelete: boolean; // Only admins can DELETE records
  isAdmin: boolean;
  isSuperAdmin: boolean; // Platform-level super admin
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Refs for debouncing and preventing race conditions
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // Debounced fetch function to prevent rapid-fire queries during token refresh storms
  const debouncedFetchUserData = useCallback((userId: string, email?: string) => {
    // Clear any pending fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Skip if we just fetched for this user (prevents duplicate fetches)
    if (lastFetchedUserIdRef.current === userId) {
      return;
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        lastFetchedUserIdRef.current = userId;
        fetchUserData(userId, email);
      }
    }, AUTH_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Skip token refresh events entirely - they don't change user state
        if (IGNORED_AUTH_EVENTS.includes(event)) {
          return;
        }
        
        // Only update state if the user actually changed (using ref to avoid stale closure)
        const previousUserId = currentUserIdRef.current;
        const newUserId = newSession?.user?.id ?? null;
        
        // Update the ref
        currentUserIdRef.current = newUserId;
        
        if (previousUserId !== newUserId) {
          setSession(newSession);
          setUser(newSession?.user ?? null);
        }

        // Defer profile/role fetch with debouncing to avoid storms
        if (newSession?.user) {
          // Only fetch if user changed OR this is a meaningful sign-in event
          if (previousUserId !== newUserId || event === 'SIGNED_IN') {
            setTimeout(() => {
              if (isMountedRef.current) {
                debouncedFetchUserData(newSession.user.id, newSession.user.email ?? undefined);
              }
            }, SESSION_STABILIZE_MS);
          }
        } else {
          // Clear pending fetches on logout
          if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
          }
          lastFetchedUserIdRef.current = null;
          setProfile(null);
          setRole(null);
          setIsSuperAdmin(false);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      currentUserIdRef.current = existingSession?.user?.id ?? null;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        // Initial fetch with stabilization delay
        setTimeout(() => {
          if (isMountedRef.current) {
            fetchUserData(existingSession.user.id, existingSession.user.email ?? undefined);
          }
        }, SESSION_STABILIZE_MS);
      } else {
        setLoading(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [debouncedFetchUserData]);


  const fetchUserData = async (userId: string, email?: string, retryCount = 0) => {
    if (!isMountedRef.current) return;
    
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileData && isMountedRef.current) {
        setProfile(prev => {
          // Only update if data actually changed to prevent unnecessary re-renders
          if (prev && JSON.stringify(prev) === JSON.stringify(profileData)) return prev;
          return profileData;
        });
      }

      // First try to get role from tenant_users (new multi-tenant system)
      let resolvedRole: AppRole | null = null;

      try {
        const { data: tenantUserData, error: tenantError } = await supabase
          .from("tenant_users")
          .select("role")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();

        if (tenantUserData?.role) {
          resolvedRole = tenantUserData.role as AppRole;
        } else if (tenantError) {
          console.warn("Error fetching role from tenant_users:", tenantError.message);
        }
      } catch (error) {
        console.error("Error fetching role from tenant_users:", error);
      }

      // Fallback: try user_roles table (backward compatibility)
      if (!resolvedRole) {
        try {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .order("role")
            .limit(1)
            .maybeSingle();

          if (roleData?.role) {
            resolvedRole = roleData.role as AppRole;
          }
        } catch (error) {
          console.error("Error fetching role from user_roles:", error);
        }
      }

      // Fallback: try authorized_emails by email
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

      // If still no role and we haven't retried yet, retry once after a delay
      if (!resolvedRole && retryCount < 1) {
        console.log("Role not found, retrying after delay...");
        setTimeout(() => {
          if (isMountedRef.current) {
            fetchUserData(userId, email, retryCount + 1);
          }
        }, 1000);
        return; // Don't set loading to false yet, we're retrying
      }

      if (resolvedRole && isMountedRef.current) {
        setRole(resolvedRole);
      }

      // Check if user is a platform super admin
      try {
        const { data: superAdminData } = await supabase
          .from("platform_admins")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (isMountedRef.current) {
          setIsSuperAdmin(!!superAdminData);
        }
      } catch (error) {
        console.error("Error checking super admin status:", error);
        if (isMountedRef.current) {
          setIsSuperAdmin(false);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
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

      // Upsert last_login in profiles (creates profile if missing)
      await supabase
        .from("profiles")
        .upsert({ user_id: userId, last_login: new Date().toISOString() }, { onConflict: 'user_id' });
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
      // Reset Omanut Advisor visibility so it's visible for new sessions
      localStorage.removeItem("omanut-advisor-hidden");
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, string>) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata || {},
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

  const refreshProfile = async () => {
    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }
    }
  };

  // Permission checks using centralized role config
  const canAdd = canAddRecords(role);
  const canEdit = canEditRecords(role);
  const canDelete = canDeleteRecords(role);
  const isAdmin = isAdminRole(role);

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
        refreshProfile,
        canAdd,
        canEdit,
        canDelete,
        isAdmin,
        isSuperAdmin,
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
