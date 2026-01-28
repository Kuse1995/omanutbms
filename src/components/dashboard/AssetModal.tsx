import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ASSET_CATEGORIES, DEPRECIATION_METHODS } from "@/lib/asset-depreciation";

interface AssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: DbAsset | null;
  tenantId: string | null;
}

interface DbAsset {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: string;
  purchase_date: string;
  purchase_cost: number;
  depreciation_method: string;
  useful_life_years: number;
  salvage_value: number;
  status: string;
  disposal_date: string | null;
  disposal_value: number | null;
  serial_number: string | null;
  location: string | null;
  assigned_to: string | null;
  image_url: string | null;
}

const STEPS = ["Basic Info", "Financial Details", "Assignment"];

export function AssetModal({ open, onOpenChange, asset, tenantId }: AssetModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("IT");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(new Date());
  const [purchaseCost, setPurchaseCost] = useState("");
  const [salvageValue, setSalvageValue] = useState("0");
  const [usefulLife, setUsefulLife] = useState("5");
  const [depreciationMethod, setDepreciationMethod] = useState<string>("straight_line");
  const [location, setLocation] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState("active");

  // Reset form when modal opens/closes or asset changes
  useEffect(() => {
    if (open) {
      if (asset) {
        setName(asset.name);
        setDescription(asset.description || "");
        setCategory(asset.category);
        setSerialNumber(asset.serial_number || "");
        setPurchaseDate(new Date(asset.purchase_date));
        setPurchaseCost(asset.purchase_cost.toString());
        setSalvageValue(asset.salvage_value.toString());
        setUsefulLife(asset.useful_life_years.toString());
        setDepreciationMethod(asset.depreciation_method);
        setLocation(asset.location || "");
        setAssignedTo(asset.assigned_to || "");
        setStatus(asset.status);
      } else {
        // Reset to defaults for new asset
        setName("");
        setDescription("");
        setCategory("IT");
        setSerialNumber("");
        setPurchaseDate(new Date());
        setPurchaseCost("");
        setSalvageValue("0");
        setUsefulLife("5");
        setDepreciationMethod("straight_line");
        setLocation("");
        setAssignedTo("");
        setStatus("active");
      }
      setStep(0);
    }
  }, [open, asset]);

  const createMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; category: string; purchase_date: string; purchase_cost: number; depreciation_method: string; useful_life_years: number; salvage_value: number; status: string; tenant_id: string | null; description?: string | null; serial_number?: string | null; location?: string | null; assigned_to?: string | null }) => {
      const { error } = await supabase.from("assets").insert(data);
      if (error) throw error;

      // Log the creation - types will be available after regeneration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("asset_logs") as any).insert({
        asset_id: data.id,
        tenant_id: tenantId,
        action: "created",
        new_value: data,
        performed_by: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", tenantId] });
      toast({ title: "Asset created successfully" });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ title: "Error creating asset", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, oldData }: { id: string; data: { name: string; category: string; purchase_date: string; purchase_cost: number; depreciation_method: string; useful_life_years: number; salvage_value: number; status: string; description?: string | null; serial_number?: string | null; location?: string | null; assigned_to?: string | null; tenant_id: string | null }; oldData: DbAsset }) => {
      const { error } = await supabase.from("assets").update(data).eq("id", id);
      if (error) throw error;

      // Log the update - types will be available after regeneration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("asset_logs") as any).insert({
        asset_id: id,
        tenant_id: tenantId,
        action: "updated",
        old_value: oldData,
        new_value: data,
        performed_by: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", tenantId] });
      toast({ title: "Asset updated successfully" });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ title: "Error updating asset", description: error.message, variant: "destructive" });
    },
  });

  const validateStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0:
        if (!name.trim()) {
          toast({ title: "Name is required", variant: "destructive" });
          return false;
        }
        if (!category) {
          toast({ title: "Category is required", variant: "destructive" });
          return false;
        }
        return true;
      case 1:
        if (!purchaseDate) {
          toast({ title: "Purchase date is required", variant: "destructive" });
          return false;
        }
        if (purchaseDate > new Date()) {
          toast({ title: "Purchase date cannot be in the future", variant: "destructive" });
          return false;
        }
        const cost = parseFloat(purchaseCost);
        if (isNaN(cost) || cost <= 0) {
          toast({ title: "Purchase cost must be greater than 0", variant: "destructive" });
          return false;
        }
        const life = parseInt(usefulLife);
        if (isNaN(life) || life < 1 || life > 100) {
          toast({ title: "Useful life must be between 1 and 100 years", variant: "destructive" });
          return false;
        }
        const salvage = parseFloat(salvageValue) || 0;
        if (salvage < 0 || salvage >= cost) {
          toast({ title: "Salvage value must be less than purchase cost", variant: "destructive" });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleSubmit = () => {
    if (!validateStep(1)) return; // Re-validate financial details

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      serial_number: serialNumber.trim() || null,
      purchase_date: purchaseDate?.toISOString().split("T")[0],
      purchase_cost: parseFloat(purchaseCost),
      salvage_value: parseFloat(salvageValue) || 0,
      useful_life_years: parseInt(usefulLife),
      depreciation_method: depreciationMethod,
      location: location.trim() || null,
      assigned_to: assignedTo.trim() || null,
      status,
      tenant_id: tenantId,
    };

    if (asset) {
      updateMutation.mutate({ id: asset.id, data, oldData: asset });
    } else {
      createMutation.mutate({ id: crypto.randomUUID(), ...data });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </div>
              <span className={cn("ml-2 text-sm hidden sm:inline", i <= step ? "text-foreground" : "text-muted-foreground")}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-border mx-2" />}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Asset Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Dell Laptop - Finance Dept"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial">Serial Number</Label>
              <Input
                id="serial"
                placeholder="Optional"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Additional notes about the asset..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 2: Financial Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Purchase Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !purchaseDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {purchaseDate ? format(purchaseDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={purchaseDate}
                    onSelect={setPurchaseDate}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Purchase Cost (ZMW) *</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="10000.00"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salvage">Salvage Value (ZMW)</Label>
                <Input
                  id="salvage"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={salvageValue}
                  onChange={(e) => setSalvageValue(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="life">Useful Life (Years) *</Label>
                <Input
                  id="life"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="5"
                  value={usefulLife}
                  onChange={(e) => setUsefulLife(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Depreciation Method *</Label>
                <Select value={depreciationMethod} onValueChange={setDepreciationMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPRECIATION_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {depreciationMethod === "straight_line"
                ? "Straight-Line: Equal depreciation each year over the useful life."
                : "Reducing Balance: 20% of the remaining book value each year."}
            </p>
          </div>
        )}

        {/* Step 3: Assignment */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Head Office, Warehouse A"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned">Assigned To</Label>
              <Input
                id="assigned"
                placeholder="e.g., John Mwanza, Finance Department"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              />
            </div>
            {asset && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disposed">Disposed</SelectItem>
                    <SelectItem value="fully_depreciated">Fully Depreciated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => (step > 0 ? setStep(step - 1) : onOpenChange(false))}
            disabled={isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step > 0 ? "Back" : "Cancel"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {asset ? "Update Asset" : "Create Asset"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
