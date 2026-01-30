import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EmployeeAccessState } from "@/components/dashboard/EmployeeAccessSection";

interface SaveEmployeeAccessParams {
  employeeId: string;
  employeeName: string;
  tenantId: string;
  accessState: EmployeeAccessState;
}

export const useEmployeeAccess = () => {
  const saveEmployeeAccess = async ({
    employeeId,
    employeeName,
    tenantId,
    accessState,
  }: SaveEmployeeAccessParams): Promise<boolean> => {
    try {
      // Handle BMS Access
      if (accessState.bmsAccessEnabled && accessState.bmsEmail) {
        if (accessState.existingAuthorizedEmailId) {
          // Update existing authorized email
          const { error: updateError } = await supabase
            .from("authorized_emails")
            .update({
              email: accessState.bmsEmail.toLowerCase(),
              default_role: accessState.bmsRole as any,
              branch_id: accessState.bmsBranchId,
            })
            .eq("id", accessState.existingAuthorizedEmailId);

          if (updateError) {
            console.error("Error updating authorized email:", updateError);
            toast.error("Failed to update BMS access");
            return false;
          }
        } else {
          // Check if email already exists for this tenant
          const { data: existingEmail } = await supabase
            .from("authorized_emails")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("email", accessState.bmsEmail.toLowerCase())
            .maybeSingle();

          if (existingEmail) {
            // Link existing authorized email to employee
            const { error: linkError } = await supabase
              .from("employees")
              .update({ authorized_email_id: existingEmail.id })
              .eq("id", employeeId);

            if (linkError) {
              console.error("Error linking authorized email:", linkError);
              toast.error("Failed to link BMS access");
              return false;
            }
          } else {
            // Create new authorized email
            const { data: newAuthEmail, error: insertError } = await supabase
              .from("authorized_emails")
              .insert({
                tenant_id: tenantId,
                email: accessState.bmsEmail.toLowerCase(),
                default_role: accessState.bmsRole as any,
                branch_id: accessState.bmsBranchId,
              })
              .select()
              .single();

            if (insertError) {
              console.error("Error creating authorized email:", insertError);
              toast.error("Failed to create BMS access");
              return false;
            }

            // Link to employee
            const { error: linkError } = await supabase
              .from("employees")
              .update({ authorized_email_id: newAuthEmail.id })
              .eq("id", employeeId);

            if (linkError) {
              console.error("Error linking authorized email:", linkError);
            }
          }
        }
      } else if (!accessState.bmsAccessEnabled && accessState.existingAuthorizedEmailId) {
        // Remove BMS access - unlink from employee but keep authorized email for safety
        const { error: unlinkError } = await supabase
          .from("employees")
          .update({ authorized_email_id: null })
          .eq("id", employeeId);

        if (unlinkError) {
          console.error("Error unlinking authorized email:", unlinkError);
        }
      }

      // Handle WhatsApp Access
      if (accessState.whatsappEnabled && accessState.whatsappNumber) {
        const whatsappData = {
          tenant_id: tenantId,
          employee_id: employeeId,
          whatsapp_number: accessState.whatsappNumber.trim(),
          display_name: employeeName,
          role: accessState.whatsappRole || "viewer",
          is_employee_self_service: !accessState.bmsAccessEnabled || accessState.whatsappSelfService,
          is_active: true,
        };

        if (accessState.existingWhatsappMappingId) {
          // Update existing mapping
          const { error: updateError } = await supabase
            .from("whatsapp_user_mappings")
            .update(whatsappData)
            .eq("id", accessState.existingWhatsappMappingId);

          if (updateError) {
            console.error("Error updating WhatsApp mapping:", updateError);
            toast.error("Failed to update WhatsApp access");
            return false;
          }
        } else {
          // Check if number already exists for this tenant
          const { data: existingMapping } = await supabase
            .from("whatsapp_user_mappings")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("whatsapp_number", accessState.whatsappNumber.trim())
            .maybeSingle();

          if (existingMapping) {
            // Update existing mapping with new employee link
            const { error: updateError } = await supabase
              .from("whatsapp_user_mappings")
              .update(whatsappData)
              .eq("id", existingMapping.id);

            if (updateError) {
              console.error("Error updating WhatsApp mapping:", updateError);
              toast.error("This WhatsApp number is already linked to another record");
              return false;
            }
          } else {
            // Create new mapping
            const { error: insertError } = await supabase
              .from("whatsapp_user_mappings")
              .insert([whatsappData]);

            if (insertError) {
              console.error("Error creating WhatsApp mapping:", insertError);
              toast.error("Failed to create WhatsApp access");
              return false;
            }
          }
        }
      } else if (!accessState.whatsappEnabled && accessState.existingWhatsappMappingId) {
        // Deactivate WhatsApp access
        const { error: deactivateError } = await supabase
          .from("whatsapp_user_mappings")
          .update({ is_active: false })
          .eq("id", accessState.existingWhatsappMappingId);

        if (deactivateError) {
          console.error("Error deactivating WhatsApp mapping:", deactivateError);
        }
      }

      return true;
    } catch (error) {
      console.error("Error saving employee access:", error);
      toast.error("Failed to save access settings");
      return false;
    }
  };

  return { saveEmployeeAccess };
};
