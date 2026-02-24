import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Loader2, Save, Trash2, User } from "lucide-react";

const DEPARTMENTS = [
  "Management",
  "Sales",
  "Inventory",
  "Finance",
  "Operations",
  "Customer Service",
  "IT",
  "Human Resources",
  "Marketing",
  "Other"
];

export function UserProfileSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [title, setTitle] = useState(profile?.title || "");
  const [department, setDepartment] = useState(profile?.department || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const hasInitialized = useRef(false);

  // Sync state when profile first loads (only once to prevent flickering)
  useEffect(() => {
    if (profile && !hasInitialized.current) {
      setFullName(profile.full_name || "");
      setTitle(profile.title || "");
      setDepartment(profile.department || "");
      setPhone(profile.phone || "");
      setAvatarUrl(profile.avatar_url || "");
      hasInitialized.current = true;
    }
  }, [profile]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split("/").slice(-2).join("/");
        await supabase.storage.from("avatars").remove([oldPath]);
      }

      // Upload new avatar
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);

      // Upsert profile with new avatar
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, avatar_url: publicUrl }, { onConflict: 'user_id' });

      if (updateError) throw updateError;

      await refreshProfile?.();

      toast({
        title: "Photo updated",
        description: "Your profile photo has been updated",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !avatarUrl) return;

    setIsUploading(true);
    try {
      const oldPath = avatarUrl.split("/").slice(-2).join("/");
      await supabase.storage.from("avatars").remove([oldPath]);

      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, avatar_url: null }, { onConflict: 'user_id' });

      if (error) throw error;

      setAvatarUrl("");
      await refreshProfile?.();

      toast({
        title: "Photo removed",
        description: "Your profile photo has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Failed to remove photo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Use upsert to create profile if it doesn't exist
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          full_name: fullName,
          title: title,
          department: department,
          phone: phone || null,
          avatar_url: avatarUrl || null,
        } as any, { onConflict: 'user_id' });

      if (error) throw error;

      // If phone number is set, try to sync with whatsapp_user_mappings
      if (phone) {
        const formattedPhone = phone.startsWith("+") ? phone : `+${phone.replace(/\D/g, "")}`;
        
        // Check if user has an employee record linked
        const { data: employeeData } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (employeeData) {
          // Update or create whatsapp mapping with employee link
          await supabase
            .from("whatsapp_user_mappings")
            .upsert({
              whatsapp_number: formattedPhone,
              employee_id: employeeData.id,
              is_verified: true,
            } as any, { onConflict: 'whatsapp_number' });
        } else {
          // Even without employee record, create mapping with user_id for recognition
          await supabase
            .from("whatsapp_user_mappings")
            .upsert({
              whatsapp_number: formattedPhone,
              user_id: user.id,
              is_verified: true,
            } as any, { onConflict: 'whatsapp_number' });
        }
      }

      await refreshProfile?.();

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Profile Settings
        </CardTitle>
        <CardDescription>
          Update your personal information and profile picture
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-muted/30">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl || undefined} alt={fullName} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-2xl">
                {getInitials(fullName || user?.email?.split("@")[0] || "U")}
              </AvatarFallback>
            </Avatar>
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Camera className="h-4 w-4 mr-2" />
              {avatarUrl ? "Change Photo" : "Upload Photo"}
            </Button>
            {avatarUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveAvatar}
                disabled={isUploading}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Max file size: 2MB. Supported formats: JPG, PNG, GIF
          </p>
        </div>

        {/* Profile Fields */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sales Manager"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="phone">WhatsApp / Phone Number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+260 97X XXX XXX"
            />
            <p className="text-xs text-muted-foreground">
              This number will be used for WhatsApp bot integration and system notifications
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isLoading} className="w-full md:w-auto">
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}