import { AuthorizedEmailsManager } from "./AuthorizedEmailsManager";
import { PasswordResetManager } from "./PasswordResetManager";
import { SystemResetManager } from "./SystemResetManager";
import { AuditLogViewer } from "./AuditLogViewer";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, KeyRound, AlertTriangle, History, PlayCircle, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SettingsManager() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();

  const handleRestartTour = () => {
    if (user?.id) {
      localStorage.removeItem(`tour_completed_${user.id}`);
      toast({
        title: "Tour Reset",
        description: "The onboarding tour will start when you refresh the page.",
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Authorized Users
          </TabsTrigger>
          <TabsTrigger value="passwords" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Password Reset
          </TabsTrigger>
          <TabsTrigger value="help" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Help & Tour
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Audit Logs
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="reset" className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              System Reset
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="users">
          <AuthorizedEmailsManager />
        </TabsContent>

        <TabsContent value="passwords">
          <PasswordResetManager />
        </TabsContent>

        <TabsContent value="help">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-primary" />
                Platform Tour
              </CardTitle>
              <CardDescription>
                Take a guided tour of the platform to learn about all available features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                New to Omanut BMS? Our interactive tour will guide you through the key features 
                including sales recording, inventory management, financial reports, and more.
              </p>
              <Button onClick={handleRestartTour} className="gap-2">
                <PlayCircle className="h-4 w-4" />
                Restart Platform Tour
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="audit">
            <AuditLogViewer />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="reset">
            <SystemResetManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
