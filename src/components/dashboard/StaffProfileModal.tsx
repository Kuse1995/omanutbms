import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, User, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppRole, roleConfig, getRoleOptions } from "@/lib/role-config";

interface StaffMember {
  id: string;
  user_id: string;
  full_name: string | null;
  title: string | null;
  department: string | null;
  avatar_url: string | null;
  role: AppRole;
}

interface StaffProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember | null;
  onSuccess: () => void;
  isAdmin: boolean;
}

const DEPARTMENTS = [
  "Executive",
  "Finance",
  "Operations",
  "Sales",
  "HR",
  "IT",
  "Marketing",
];

export function StaffProfileModal({
  open,
  onOpenChange,
  staff,
  onSuccess,
  isAdmin,
}: StaffProfileModalProps) {
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<AppRole>("viewer");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (staff) {
      setFullName(staff.full_name || "");
      setTitle(staff.title || "");
      setDepartment(staff.department || "");
      setRole(staff.role);
      setAvatarUrl(staff.avatar_url);
    }
  }, [staff]);

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !staff) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${staff.user_id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Add cache buster to force refresh
      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(newAvatarUrl);

      toast({
        title: "Avatar uploaded",
        description: "Profile photo uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload profile photo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!staff) return;

    setIsUploading(true);
    try {
      // List files in user's folder to delete
      const { data: files } = await supabase.storage
        .from("avatars")
        .list(staff.user_id);

      if (files && files.length > 0) {
        const filesToDelete = files.map((f) => `${staff.user_id}/${f.name}`);
        await supabase.storage.from("avatars").remove(filesToDelete);
      }

      setAvatarUrl(null);
      toast({
        title: "Avatar removed",
        description: "Profile photo has been removed",
      });
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast({
        title: "Error",
        description: "Failed to remove profile photo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!staff) return;

    setIsLoading(true);
    try {
      // Update profile including avatar_url
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          title: title,
          department: department,
          avatar_url: avatarUrl,
        })
        .eq("user_id", staff.user_id);

      if (profileError) throw profileError;

      // Update role if changed and user is admin
      if (isAdmin && role !== staff.role) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: role })
          .eq("user_id", staff.user_id);

        if (roleError) throw roleError;
      }

      toast({
        title: "Profile Updated",
        description: `${fullName}'s profile has been updated successfully`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-[#003366]">Edit Staff Profile</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl || undefined} alt={fullName} />
              <AvatarFallback className="bg-gradient-to-br from-[#004B8D] to-[#0077B6] text-white text-2xl">
                {getInitials(fullName)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="border-[#004B8D]/30 text-[#004B8D]"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Photo
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={isUploading}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Max 2MB, JPG or PNG</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Operations Manager"
            />
          </div>

          <div className="grid gap-2">
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

          {isAdmin && (
            <div className="grid gap-2">
              <Label htmlFor="role">Access Role</Label>
              <Select value={role} onValueChange={(val: AppRole) => setRole(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {getRoleOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {roleConfig[option.value].label} - {roleConfig[option.value].description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the appropriate role based on job responsibilities.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-[#004B8D] hover:bg-[#003366]"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
