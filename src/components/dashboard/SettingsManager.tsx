import { AuthorizedEmailsManager } from "./AuthorizedEmailsManager";
import { PasswordResetManager } from "./PasswordResetManager";
import { SystemResetManager } from "./SystemResetManager";
import { AuditLogViewer } from "./AuditLogViewer";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, KeyRound, AlertTriangle, History } from "lucide-react";

export function SettingsManager() {
  const { isAdmin } = useAuth();

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
