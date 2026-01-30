import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, KeyRound, MessageCircle, Info } from "lucide-react";
import { useBranch } from "@/hooks/useBranch";

export interface EmployeeAccessState {
  // BMS Access
  bmsAccessEnabled: boolean;
  bmsEmail: string;
  bmsRole: string;
  bmsBranchId: string | null;
  existingAuthorizedEmailId: string | null;
  
  // WhatsApp Access  
  whatsappEnabled: boolean;
  whatsappNumber: string;
  whatsappRole: string;
  whatsappSelfService: boolean;
  existingWhatsappMappingId: string | null;
}

interface EmployeeAccessSectionProps {
  employeeId: string | null;
  employeeEmail: string;
  employeePhone: string;
  tenantId: string;
  accessState: EmployeeAccessState;
  onAccessStateChange: (state: EmployeeAccessState) => void;
}

const BMS_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "sales_rep", label: "Sales Rep" },
  { value: "cashier", label: "Cashier" },
  { value: "viewer", label: "Viewer" },
];

const WHATSAPP_ROLES = [
  { value: "admin", label: "Admin - Full access" },
  { value: "manager", label: "Manager - Management access" },
  { value: "accountant", label: "Accountant - Financial reports" },
  { value: "hr_manager", label: "HR Manager - Staff management" },
  { value: "sales_rep", label: "Sales Rep - Sales & inventory" },
  { value: "cashier", label: "Cashier - POS access" },
  { value: "staff", label: "Staff - Self-service only" },
];

export const EmployeeAccessSection = ({
  employeeId,
  employeeEmail,
  employeePhone,
  tenantId,
  accessState,
  onAccessStateChange,
}: EmployeeAccessSectionProps) => {
  const { branches, isMultiBranchEnabled } = useBranch();
  const [bmsOpen, setBmsOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing access data when editing an employee
  useEffect(() => {
    const loadExistingAccess = async () => {
      if (!employeeId || !tenantId) return;
      setLoading(true);
      
      try {
        // Check for existing authorized email link
        const { data: employee } = await supabase
          .from("employees")
          .select("authorized_email_id, email")
          .eq("id", employeeId)
          .single();
        
        if (employee?.authorized_email_id) {
          const { data: authEmail } = await supabase
            .from("authorized_emails")
            .select("*")
            .eq("id", employee.authorized_email_id)
            .single();
          
          if (authEmail) {
            onAccessStateChange({
              ...accessState,
              bmsAccessEnabled: true,
              bmsEmail: authEmail.email,
              bmsRole: authEmail.default_role,
              bmsBranchId: authEmail.branch_id,
              existingAuthorizedEmailId: authEmail.id,
            });
            setBmsOpen(true);
          }
        }
        
        // Check for existing WhatsApp mapping
        const { data: whatsappMapping } = await supabase
          .from("whatsapp_user_mappings")
          .select("*")
          .eq("employee_id", employeeId)
          .eq("tenant_id", tenantId)
          .maybeSingle();
        
        if (whatsappMapping) {
          onAccessStateChange({
            ...accessState,
            whatsappEnabled: true,
            whatsappNumber: whatsappMapping.whatsapp_number,
            whatsappRole: whatsappMapping.role,
            whatsappSelfService: whatsappMapping.is_employee_self_service || false,
            existingWhatsappMappingId: whatsappMapping.id,
          });
          setWhatsappOpen(true);
        }
      } catch (error) {
        console.error("Error loading access data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadExistingAccess();
  }, [employeeId, tenantId]);

  // Auto-fill email if employee email changes and BMS email is empty
  useEffect(() => {
    if (employeeEmail && !accessState.bmsEmail) {
      onAccessStateChange({
        ...accessState,
        bmsEmail: employeeEmail,
      });
    }
  }, [employeeEmail]);

  // Auto-fill WhatsApp number from phone
  useEffect(() => {
    if (employeePhone && !accessState.whatsappNumber) {
      // Format to WhatsApp format if it's a Zambian number
      let whatsappNum = employeePhone.trim();
      if (whatsappNum.startsWith("0")) {
        whatsappNum = "+260" + whatsappNum.substring(1);
      }
      onAccessStateChange({
        ...accessState,
        whatsappNumber: whatsappNum,
      });
    }
  }, [employeePhone]);

  const updateBmsAccess = (updates: Partial<EmployeeAccessState>) => {
    onAccessStateChange({ ...accessState, ...updates });
  };

  const updateWhatsappAccess = (updates: Partial<EmployeeAccessState>) => {
    onAccessStateChange({ ...accessState, ...updates });
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
        <KeyRound className="h-4 w-4" />
        Access & Integration
      </h3>

      {/* BMS Account Access */}
      <Collapsible open={bmsOpen} onOpenChange={setBmsOpen}>
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={accessState.bmsAccessEnabled}
                onCheckedChange={(checked) => updateBmsAccess({ bmsAccessEnabled: checked })}
              />
              <Label className="font-medium">Grant BMS Login Access</Label>
            </div>
            <CollapsibleTrigger className="p-1 hover:bg-muted rounded">
              {bmsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent className="space-y-3 pt-2">
            {accessState.bmsAccessEnabled ? (
              <>
                <div className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/50 p-2 rounded">
                  <Info className="h-3 w-3" />
                  This employee will be able to log in to the BMS dashboard with the email below.
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="bms_email">Login Email *</Label>
                    <Input
                      id="bms_email"
                      type="email"
                      value={accessState.bmsEmail}
                      onChange={(e) => updateBmsAccess({ bmsEmail: e.target.value })}
                      placeholder="email@company.com"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bms_role">BMS Role</Label>
                    <Select
                      value={accessState.bmsRole}
                      onValueChange={(value) => updateBmsAccess({ bmsRole: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {BMS_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {isMultiBranchEnabled && (
                    <div>
                      <Label htmlFor="bms_branch">Branch Assignment</Label>
                      <Select
                        value={accessState.bmsBranchId || "all"}
                        onValueChange={(value) => updateBmsAccess({ bmsBranchId: value === "all" ? null : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Branches</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Enable to allow this employee to log in to the BMS dashboard.
              </p>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* WhatsApp Access */}
      <Collapsible open={whatsappOpen} onOpenChange={setWhatsappOpen}>
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={accessState.whatsappEnabled}
                onCheckedChange={(checked) => updateWhatsappAccess({ whatsappEnabled: checked })}
              />
              <Label className="font-medium flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-600" />
                Enable WhatsApp Access
              </Label>
            </div>
            <CollapsibleTrigger className="p-1 hover:bg-muted rounded">
              {whatsappOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent className="space-y-3 pt-2">
            {accessState.whatsappEnabled ? (
              <>
                <div className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/50 p-2 rounded">
                  <Info className="h-3 w-3" />
                  This employee can interact with the BMS via WhatsApp for clock-in, viewing payslips, and more.
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="whatsapp_number">WhatsApp Number *</Label>
                    <Input
                      id="whatsapp_number"
                      value={accessState.whatsappNumber}
                      onChange={(e) => updateWhatsappAccess({ whatsappNumber: e.target.value })}
                      placeholder="+260971234567"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="whatsapp_role">WhatsApp Permissions</Label>
                    <Select
                      value={accessState.whatsappRole}
                      onValueChange={(value) => updateWhatsappAccess({ whatsappRole: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select permissions" />
                      </SelectTrigger>
                      <SelectContent>
                        {WHATSAPP_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-6">
                    <Switch
                      checked={accessState.whatsappSelfService}
                      onCheckedChange={(checked) => updateWhatsappAccess({ whatsappSelfService: checked })}
                      disabled={accessState.bmsAccessEnabled}
                    />
                    <Label className="text-sm">
                      Self-service only
                      {accessState.bmsAccessEnabled && (
                        <span className="text-xs text-muted-foreground block">
                          Disabled when BMS access is enabled
                        </span>
                      )}
                    </Label>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Enable to allow this employee to use WhatsApp for clock-in, viewing payslips, and tasks.
              </p>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};

export default EmployeeAccessSection;
