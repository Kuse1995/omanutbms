import { useState } from "react";
import { z } from "zod";
import { MessageSquare, Send, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface WashForum {
  id: string;
  name: string;
  province: string;
}

interface CommunityContactModalProps {
  forum: WashForum | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const messageSchema = z.object({
  donorName: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  donorEmail: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  donorPhone: z.string().trim().max(20, "Phone must be less than 20 characters").optional(),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1000, "Message must be less than 1000 characters"),
});

export function CommunityContactModal({ forum, open, onOpenChange }: CommunityContactModalProps) {
  const [formData, setFormData] = useState({
    donorName: "",
    donorEmail: "",
    donorPhone: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!forum) return;

    const result = messageSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("community_messages").insert({
        wash_forum_id: forum.id,
        donor_name: formData.donorName.trim(),
        donor_email: formData.donorEmail.trim(),
        donor_phone: formData.donorPhone?.trim() || null,
        message: formData.message.trim(),
      });

      if (error) throw error;

      toast({
        title: "Message Sent!",
        description: "Your message has been sent. Finch Investments will facilitate contact with the community.",
      });

      setFormData({ donorName: "", donorEmail: "", donorPhone: "", message: "" });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Contact Community
          </DialogTitle>
          <DialogDescription>
            Send a message to {forum?.name}. Finch Investments will facilitate your connection with the community.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="donorName">Your Name *</Label>
            <Input
              id="donorName"
              placeholder="Enter your name"
              value={formData.donorName}
              onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
            />
            {errors.donorName && <p className="text-sm text-destructive">{errors.donorName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="donorEmail">Email Address *</Label>
            <Input
              id="donorEmail"
              type="email"
              placeholder="Enter your email"
              value={formData.donorEmail}
              onChange={(e) => setFormData({ ...formData, donorEmail: e.target.value })}
            />
            {errors.donorEmail && <p className="text-sm text-destructive">{errors.donorEmail}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="donorPhone">Phone (Optional)</Label>
            <Input
              id="donorPhone"
              placeholder="Enter your phone number"
              value={formData.donorPhone}
              onChange={(e) => setFormData({ ...formData, donorPhone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Your Message *</Label>
            <Textarea
              id="message"
              placeholder="Share your message with the community..."
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            />
            {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Sending..." : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
