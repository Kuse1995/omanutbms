import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/hooks/useTenant";
import { useBranding } from "@/hooks/useBranding";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Image as ImageIcon, Check } from "lucide-react";

export function BrandingSettings() {
  const { businessProfile, tenantId, refetchTenant } = useTenant();
  const { companyName, primaryColor, secondaryColor, accentColor, tagline, slogan, logoUrl } = useBranding();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    company_name: businessProfile?.company_name || '',
    tagline: businessProfile?.tagline || '',
    slogan: (businessProfile as any)?.slogan || '',
    primary_color: businessProfile?.primary_color || '#004B8D',
    secondary_color: businessProfile?.secondary_color || '#0077B6',
    accent_color: (businessProfile as any)?.accent_color || '#10B981',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${tenantId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('business_profiles')
        .update({ logo_url: publicUrl })
        .eq('tenant_id', tenantId);

      if (updateError) throw updateError;

      await refetchTenant();
      toast({
        title: "Logo uploaded",
        description: "Your company logo has been updated.",
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({
          company_name: formData.company_name || null,
          tagline: formData.tagline || null,
          slogan: formData.slogan || null,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          accent_color: formData.accent_color,
        })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await refetchTenant();
      toast({
        title: "Settings saved",
        description: "Your branding settings have been updated.",
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
          <CardDescription>
            Upload your company logo to personalize the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50">
              {logoUrl ? (
                <img src={logoUrl} alt="Company logo" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Button variant="outline" disabled={uploading} asChild>
                    <span>
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </>
                      )}
                    </span>
                  </Button>
                </div>
              </Label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Recommended: Square image, at least 256x256 pixels
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>
            Set your company name and taglines.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => handleInputChange('company_name', e.target.value)}
              placeholder="Your Company Name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={formData.tagline}
              onChange={(e) => handleInputChange('tagline', e.target.value)}
              placeholder="Business Management System"
            />
            <p className="text-xs text-muted-foreground">
              Shown below your company name in the sidebar
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slogan">Slogan</Label>
            <Textarea
              id="slogan"
              value={formData.slogan}
              onChange={(e) => handleInputChange('slogan', e.target.value)}
              placeholder="Your company motto or mission statement"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Colors</CardTitle>
          <CardDescription>
            Customize the color scheme to match your brand.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="primary_color"
                  value={formData.primary_color}
                  onChange={(e) => handleInputChange('primary_color', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.primary_color}
                  onChange={(e) => handleInputChange('primary_color', e.target.value)}
                  placeholder="#004B8D"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="secondary_color"
                  value={formData.secondary_color}
                  onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.secondary_color}
                  onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                  placeholder="#0077B6"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accent_color">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="accent_color"
                  value={formData.accent_color}
                  onChange={(e) => handleInputChange('accent_color', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.accent_color}
                  onChange={(e) => handleInputChange('accent_color', e.target.value)}
                  placeholder="#10B981"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 rounded-lg border bg-muted/30">
            <p className="text-sm font-medium mb-3">Preview</p>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: formData.primary_color }}
              >
                {formData.company_name?.charAt(0) || 'O'}
              </div>
              <div>
                <p className="font-semibold" style={{ color: formData.primary_color }}>
                  {formData.company_name || 'Your Company'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formData.tagline || 'Your tagline here'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
