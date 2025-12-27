import { toast } from "@/hooks/use-toast";

/**
 * Validates that a tenant ID exists and returns it.
 * Throws an error if tenant context is missing.
 */
export function requireTenant(tenantId: string | null): string {
  if (!tenantId) {
    throw new Error("Tenant context is required. Please ensure you are logged in.");
  }
  return tenantId;
}

/**
 * Shows a user-friendly error toast when tenant context is missing.
 * Returns false so it can be used in guard conditions.
 */
export function guardTenant(tenantId: string | null): tenantId is string {
  if (!tenantId) {
    toast({
      title: "Error",
      description: "Unable to determine your organization. Please log in again.",
      variant: "destructive",
    });
    return false;
  }
  return true;
}
