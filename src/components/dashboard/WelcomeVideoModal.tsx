import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface WelcomeVideoModalProps {
  onComplete: () => void;
}

export function WelcomeVideoModal({ onComplete }: WelcomeVideoModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const checkIfNewUser = () => {
      const localKey = `welcome_video_seen_${user.id}`;
      const hasSeenVideo = localStorage.getItem(localKey);

      if (hasSeenVideo === "true") {
        setIsLoading(false);
        return;
      }

      // Show video for users who haven't seen it
      setIsOpen(true);
      setIsLoading(false);
    };

    checkIfNewUser();
  }, [user?.id]);

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(`welcome_video_seen_${user.id}`, "true");
    }
    setIsOpen(false);
    onComplete();
  };

  if (isLoading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Play className="h-5 w-5 text-primary" />
            Welcome to Omanut BMS!
          </DialogTitle>
          <DialogDescription>
            Watch this quick introduction to get started with your business management system.
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full aspect-video bg-black">
          <iframe
            src="https://www.youtube.com/embed/AAQ6RWDECrs?autoplay=1&rel=0"
            title="Welcome to Omanut BMS"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>

        <div className="p-6 pt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={handleDismiss}>
            <X className="h-4 w-4 mr-2" />
            Skip Video
          </Button>
          <Button onClick={handleDismiss}>
            Start Exploring
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
