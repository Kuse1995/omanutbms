import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Scissors, 
  Plus, 
  Trash2, 
  Package, 
  Building2, 
  AlertCircle,
  Clock,
  Calculator
} from "lucide-react";
import {
  ALTERATION_TYPES,
  ALTERATION_CATEGORIES,
  GARMENT_TYPES_FOR_ALTERATION,
  GARMENT_CONDITIONS,
  calculateAlterationPrice,
  getAlterationsByCategory,
  type AlterationItem,
  type AlterationType,
} from "@/lib/alteration-types";
import { useBusinessConfig } from "@/hooks/useBusinessConfig";

interface AlterationDetailsStepProps {
  selectedAlterations: AlterationItem[];
  onAlterationsChange: (items: AlterationItem[]) => void;
  garmentType: string;
  onGarmentTypeChange: (type: string) => void;
  garmentSource: 'shop_made' | 'external';
  onGarmentSourceChange: (source: 'shop_made' | 'external') => void;
  garmentCondition: string;
  onGarmentConditionChange: (condition: string) => void;
  originalOrderId?: string | null;
  onOriginalOrderChange: (orderId: string | null) => void;
  customNotes: string;
  onNotesChange: (notes: string) => void;
  hourlyRate: number;
  bringInDate: string;
  onBringInDateChange: (date: string) => void;
  validationErrors?: string[];
}

export function AlterationDetailsStep({
  selectedAlterations,
  onAlterationsChange,
  garmentType,
  onGarmentTypeChange,
  garmentSource,
  onGarmentSourceChange,
  garmentCondition,
  onGarmentConditionChange,
  originalOrderId,
  onOriginalOrderChange,
  customNotes,
  onNotesChange,
  hourlyRate,
  bringInDate,
  onBringInDateChange,
  validationErrors = [],
}: AlterationDetailsStepProps) {
  const { currencySymbol } = useBusinessConfig();
  const [customAlterationText, setCustomAlterationText] = useState("");
  const [customAlterationHours, setCustomAlterationHours] = useState(1);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("sizing");

  // Calculate totals
  const totals = useMemo(() => {
    const totalHours = selectedAlterations.reduce((sum, a) => sum + a.estimatedHours, 0);
    const totalPrice = selectedAlterations.reduce((sum, a) => sum + a.price, 0);
    return { totalHours, totalPrice };
  }, [selectedAlterations]);

  // Toggle alteration selection
  const toggleAlteration = (alterationType: AlterationType) => {
    const existing = selectedAlterations.find(a => a.type === alterationType.id);
    
    if (existing) {
      // Remove
      onAlterationsChange(selectedAlterations.filter(a => a.type !== alterationType.id));
    } else {
      // Add
      const newItem: AlterationItem = {
        id: `${alterationType.id}-${Date.now()}`,
        type: alterationType.id,
        label: alterationType.label,
        estimatedHours: alterationType.defaultHours,
        price: calculateAlterationPrice(alterationType.defaultHours, hourlyRate),
      };
      onAlterationsChange([...selectedAlterations, newItem]);
    }
  };

  // Update alteration hours/price
  const updateAlterationHours = (alterationId: string, hours: number) => {
    onAlterationsChange(
      selectedAlterations.map(a => 
        a.id === alterationId 
          ? { ...a, estimatedHours: hours, price: calculateAlterationPrice(hours, hourlyRate) }
          : a
      )
    );
  };

  // Update alteration notes
  const updateAlterationNotes = (alterationId: string, notes: string) => {
    onAlterationsChange(
      selectedAlterations.map(a => 
        a.id === alterationId ? { ...a, notes } : a
      )
    );
  };

  // Add custom alteration
  const addCustomAlteration = () => {
    if (!customAlterationText.trim()) return;
    
    const newItem: AlterationItem = {
      id: `custom-${Date.now()}`,
      type: 'custom',
      label: customAlterationText.trim(),
      estimatedHours: customAlterationHours,
      price: calculateAlterationPrice(customAlterationHours, hourlyRate),
    };
    
    onAlterationsChange([...selectedAlterations, newItem]);
    setCustomAlterationText("");
    setCustomAlterationHours(1);
  };

  // Remove alteration
  const removeAlteration = (alterationId: string) => {
    onAlterationsChange(selectedAlterations.filter(a => a.id !== alterationId));
  };

  const hasError = (field: string) => validationErrors.some(e => e.toLowerCase().includes(field.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Garment Info Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Garment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="garmentType">Garment Type *</Label>
              <Select value={garmentType} onValueChange={onGarmentTypeChange}>
                <SelectTrigger className={hasError('garment type') ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select garment type" />
                </SelectTrigger>
                <SelectContent>
                  {GARMENT_TYPES_FOR_ALTERATION.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="garmentCondition">Garment Condition</Label>
              <Select value={garmentCondition} onValueChange={onGarmentConditionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {GARMENT_CONDITIONS.map(cond => (
                    <SelectItem key={cond.value} value={cond.value}>
                      <div>
                        <span>{cond.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">- {cond.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Garment Source</Label>
            <RadioGroup
              value={garmentSource}
              onValueChange={(v) => onGarmentSourceChange(v as 'shop_made' | 'external')}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="external" id="external" />
                <Label htmlFor="external" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Client brought it in</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Garment purchased elsewhere or made by another tailor</p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="shop_made" id="shop_made" />
                <Label htmlFor="shop_made" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">We made this garment</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Previously created by our shop - can link to original order</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {garmentSource === 'shop_made' && (
            <div>
              <Label htmlFor="originalOrderId">Original Order Reference</Label>
              <Input
                id="originalOrderId"
                placeholder="e.g., CO2026-0012"
                value={originalOrderId || ''}
                onChange={(e) => onOriginalOrderChange(e.target.value || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the original custom order number to link this alteration
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="bringInDate">Date Brought In</Label>
            <Input
              id="bringInDate"
              type="date"
              value={bringInDate}
              onChange={(e) => onBringInDateChange(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Alterations Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scissors className="h-4 w-4 text-primary" />
            Alterations Needed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(ALTERATION_CATEGORIES).map(([key, { label, icon }]) => (
              <Button
                key={key}
                type="button"
                variant={expandedCategory === key ? "default" : "outline"}
                size="sm"
                onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                className="gap-1.5"
              >
                <span>{icon}</span>
                {label}
              </Button>
            ))}
          </div>

          {/* Alteration options for selected category */}
          {expandedCategory && (
            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                {ALTERATION_CATEGORIES[expandedCategory].icon} {ALTERATION_CATEGORIES[expandedCategory].label} Options
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {getAlterationsByCategory(expandedCategory).map((alt) => {
                  const isSelected = selectedAlterations.some(a => a.type === alt.id);
                  return (
                    <div
                      key={alt.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleAlteration(alt)}
                    >
                      <Checkbox checked={isSelected} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{alt.label}</p>
                        {alt.description && (
                          <p className="text-xs text-muted-foreground truncate">{alt.description}</p>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium">{currencySymbol}{calculateAlterationPrice(alt.defaultHours, hourlyRate)}</p>
                        <p className="text-xs text-muted-foreground">{alt.defaultHours}h</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Selected alterations with adjustable hours */}
          {selectedAlterations.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Selected Alterations ({selectedAlterations.length})</p>
              {selectedAlterations.map((alt) => (
                <div key={alt.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{alt.label}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAlteration(alt.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="number"
                          min={0.5}
                          step={0.5}
                          value={alt.estimatedHours}
                          onChange={(e) => updateAlterationHours(alt.id, parseFloat(e.target.value) || 0)}
                          className="w-20 h-7 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">hours</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-sm">{currencySymbol}{alt.price}</span>
                      </div>
                    </div>
                    <Input
                      placeholder="Add notes for this alteration..."
                      value={alt.notes || ''}
                      onChange={(e) => updateAlterationNotes(alt.id, e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add custom alteration */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <p className="text-sm font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Custom Alteration
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Describe the custom work..."
                value={customAlterationText}
                onChange={(e) => setCustomAlterationText(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={customAlterationHours}
                  onChange={(e) => setCustomAlterationHours(parseFloat(e.target.value) || 1)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">hrs</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={addCustomAlteration}
                  disabled={!customAlterationText.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Validation error */}
          {hasError('alteration') && selectedAlterations.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Please select at least one alteration
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <div>
        <Label htmlFor="alterationNotes">Additional Notes</Label>
        <Textarea
          id="alterationNotes"
          placeholder="Any special instructions, client preferences, or details about the alterations..."
          value={customNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
        />
      </div>

      {/* Totals Summary */}
      {selectedAlterations.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Estimated Total</p>
              <p className="text-2xl font-bold text-primary">
                {currencySymbol}{totals.totalPrice.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Labor Time</p>
              <p className="text-lg font-semibold">{totals.totalHours} hours</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Based on {currencySymbol}{hourlyRate}/hour rate. Final price may vary based on complexity.
          </p>
        </div>
      )}
    </div>
  );
}
