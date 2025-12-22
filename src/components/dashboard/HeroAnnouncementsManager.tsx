import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Save, X, Megaphone, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

interface HeroAnnouncement {
  id: string;
  tagline: string;
  headline: string;
  headline_accent: string;
  stat_1_value: string | null;
  stat_1_label: string | null;
  stat_2_value: string | null;
  stat_2_label: string | null;
  stat_3_value: string | null;
  stat_3_label: string | null;
  button_text: string | null;
  button_link: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const emptyAnnouncement = {
  tagline: "",
  headline: "",
  headline_accent: "",
  stat_1_value: "",
  stat_1_label: "",
  stat_2_value: "",
  stat_2_label: "",
  stat_3_value: "",
  stat_3_label: "",
  button_text: "Learn More",
  button_link: "/technology",
  is_active: false,
};

export function HeroAnnouncementsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<HeroAnnouncement | null>(null);
  const [formData, setFormData] = useState(emptyAnnouncement);
  const queryClient = useQueryClient();
  const { canAdd, isAdmin } = useAuth();

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["hero-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as HeroAnnouncement[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyAnnouncement) => {
      // If setting as active, deactivate all others first
      if (data.is_active) {
        await supabase
          .from("hero_announcements")
          .update({ is_active: false })
          .neq("id", "placeholder");
      }

      const { error } = await supabase.from("hero_announcements").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-announcements"] });
      toast.success("Announcement created successfully");
      setIsDialogOpen(false);
      setFormData(emptyAnnouncement);
    },
    onError: (error) => {
      toast.error("Failed to create announcement: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof emptyAnnouncement> }) => {
      // If setting as active, deactivate all others first
      if (data.is_active) {
        await supabase
          .from("hero_announcements")
          .update({ is_active: false })
          .neq("id", id);
      }

      const { error } = await supabase
        .from("hero_announcements")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-announcements"] });
      toast.success("Announcement updated successfully");
      setIsDialogOpen(false);
      setEditingAnnouncement(null);
      setFormData(emptyAnnouncement);
    },
    onError: (error) => {
      toast.error("Failed to update announcement: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hero_announcements")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-announcements"] });
      toast.success("Announcement deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete announcement: " + error.message);
    },
  });

  const handleEdit = (announcement: HeroAnnouncement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      tagline: announcement.tagline,
      headline: announcement.headline,
      headline_accent: announcement.headline_accent,
      stat_1_value: announcement.stat_1_value || "",
      stat_1_label: announcement.stat_1_label || "",
      stat_2_value: announcement.stat_2_value || "",
      stat_2_label: announcement.stat_2_label || "",
      stat_3_value: announcement.stat_3_value || "",
      stat_3_label: announcement.stat_3_label || "",
      button_text: announcement.button_text || "Learn More",
      button_link: announcement.button_link || "/technology",
      is_active: announcement.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAnnouncement) {
      updateMutation.mutate({ id: editingAnnouncement.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingAnnouncement(null);
    setFormData(emptyAnnouncement);
  };

  const toggleActive = (announcement: HeroAnnouncement) => {
    updateMutation.mutate({
      id: announcement.id,
      data: { is_active: !announcement.is_active },
    });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading announcements...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Hero Announcements</h2>
          <p className="text-muted-foreground">
            Manage the announcement slide shown on the homepage hero carousel
          </p>
        </div>
        {canAdd && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setFormData(emptyAnnouncement)}>
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? "Edit Announcement" : "Create New Announcement"}
              </DialogTitle>
              <DialogDescription>
                This content will appear as the first slide in the hero carousel when active.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="tagline">Tagline (Badge Text)</Label>
                  <Input
                    id="tagline"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="e.g., Award-Winning Filtration Technology"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="headline">Headline</Label>
                    <Input
                      id="headline"
                      value={formData.headline}
                      onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                      placeholder="e.g., We Make Water"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="headline_accent">Headline Accent (Colored)</Label>
                    <Input
                      id="headline_accent"
                      value={formData.headline_accent}
                      onChange={(e) => setFormData({ ...formData, headline_accent: e.target.value })}
                      placeholder="e.g., Safe to Drink"
                      required
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Statistics (Optional)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="stat_1_value">Stat 1 Value</Label>
                      <Input
                        id="stat_1_value"
                        value={formData.stat_1_value}
                        onChange={(e) => setFormData({ ...formData, stat_1_value: e.target.value })}
                        placeholder="e.g., 99.999999%"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stat_1_label">Stat 1 Label</Label>
                      <Input
                        id="stat_1_label"
                        value={formData.stat_1_label}
                        onChange={(e) => setFormData({ ...formData, stat_1_label: e.target.value })}
                        placeholder="e.g., Bacteria Removal"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stat_2_value">Stat 2 Value</Label>
                      <Input
                        id="stat_2_value"
                        value={formData.stat_2_value}
                        onChange={(e) => setFormData({ ...formData, stat_2_value: e.target.value })}
                        placeholder="e.g., 99.999%"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stat_2_label">Stat 2 Label</Label>
                      <Input
                        id="stat_2_label"
                        value={formData.stat_2_label}
                        onChange={(e) => setFormData({ ...formData, stat_2_label: e.target.value })}
                        placeholder="e.g., Parasites Removed"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stat_3_value">Stat 3 Value</Label>
                      <Input
                        id="stat_3_value"
                        value={formData.stat_3_value}
                        onChange={(e) => setFormData({ ...formData, stat_3_value: e.target.value })}
                        placeholder="e.g., 0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stat_3_label">Stat 3 Label</Label>
                      <Input
                        id="stat_3_label"
                        value={formData.stat_3_label}
                        onChange={(e) => setFormData({ ...formData, stat_3_label: e.target.value })}
                        placeholder="e.g., Chemicals Needed"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Call to Action Button</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="button_text">Button Text</Label>
                      <Input
                        id="button_text"
                        value={formData.button_text}
                        onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                        placeholder="e.g., Learn More"
                      />
                    </div>
                    <div>
                      <Label htmlFor="button_link">Button Link</Label>
                      <Input
                        id="button_link"
                        value={formData.button_link}
                        onChange={(e) => setFormData({ ...formData, button_link: e.target.value })}
                        placeholder="e.g., /technology"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Set as active (shows on homepage)</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingAnnouncement ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {announcements?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No announcements yet. Create your first one!</p>
            </CardContent>
          </Card>
        ) : (
          announcements?.map((announcement) => (
            <Card key={announcement.id} className={announcement.is_active ? "border-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{announcement.headline}</CardTitle>
                      <span className="text-primary font-semibold">{announcement.headline_accent}</span>
                      {announcement.is_active && <Badge variant="default">Active</Badge>}
                    </div>
                    <CardDescription>{announcement.tagline}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              size="sm"
                              variant={announcement.is_active ? "default" : "outline"}
                              onClick={() => toggleActive(announcement)}
                              disabled={!isAdmin}
                            >
                              {announcement.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!isAdmin && <TooltipContent>Admin access required</TooltipContent>}
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(announcement)} disabled={!isAdmin}>
                              {isAdmin ? <Edit2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!isAdmin && <TooltipContent>Admin access required</TooltipContent>}
                      </Tooltip>
                    </TooltipProvider>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(announcement.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {(announcement.stat_1_value || announcement.stat_2_value || announcement.stat_3_value) && (
                <CardContent className="pt-0">
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {announcement.stat_1_value && (
                      <span>
                        <strong>{announcement.stat_1_value}</strong> {announcement.stat_1_label}
                      </span>
                    )}
                    {announcement.stat_2_value && (
                      <span>
                        <strong>{announcement.stat_2_value}</strong> {announcement.stat_2_label}
                      </span>
                    )}
                    {announcement.stat_3_value && (
                      <span>
                        <strong>{announcement.stat_3_value}</strong> {announcement.stat_3_label}
                      </span>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
