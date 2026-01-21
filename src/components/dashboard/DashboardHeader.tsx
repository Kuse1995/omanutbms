import { useState } from "react";
import { Search, User, LogOut, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import { useNavigate } from "react-router-dom";
import { NotificationsCenter } from "./NotificationsCenter";
import { TrialBanner } from "./TrialBanner";
import { UpgradePlanModal } from "./UpgradePlanModal";
import { BranchSelector } from "./BranchSelector";

export function DashboardHeader() {
  const { user, profile, role, signOut, isSuperAdmin } = useAuth();
  const { companyName } = useFeatures();
  const navigate = useNavigate();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case "admin":
        return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      case "manager":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <>
      {/* Super Admin Mode Warning Banner */}
      {isSuperAdmin && (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0 bg-amber-500/10 border-amber-500/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 font-medium">
            Super Admin Mode: You have cross-tenant visibility. Data from all organizations may be visible.
          </AlertDescription>
        </Alert>
      )}
      <TrialBanner onUpgrade={() => setUpgradeModalOpen(true)} />
      <header className="h-16 border-b border-[#004B8D]/10 bg-white/80 backdrop-blur-sm px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-[#004B8D] hover:bg-[#004B8D]/10" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#004B8D]/50" />
            <Input
              placeholder="Search inventory, transactions..."
              className="w-80 pl-10 bg-[#f0f7fa] border-[#004B8D]/20 text-[#003366] placeholder:text-[#004B8D]/40 focus:border-[#004B8D] focus:ring-[#004B8D]/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <BranchSelector />
          <div data-tour="header-notifications">
            <NotificationsCenter />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 pl-4 border-l border-[#004B8D]/20 cursor-pointer hover:bg-[#004B8D]/5 p-2 rounded-lg transition-colors">
                <div className="text-right">
                  <p className="text-sm font-medium text-[#003366]">
                    {profile?.full_name || user?.email?.split("@")[0] || "User"}
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <p className="text-xs text-[#004B8D]/60">
                      {profile?.department || companyName || "Omanut"}
                    </p>
                    {role && (
                      <Badge className={`text-[10px] px-1.5 py-0 ${getRoleBadgeColor(role)}`}>
                        {role}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#004B8D] to-[#0077B6] flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-white border-[#004B8D]/20 text-[#003366] z-50"
            >
              <DropdownMenuLabel className="text-[#004B8D]">
                {user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#004B8D]/10" />
              <DropdownMenuItem className="hover:bg-[#004B8D]/10 cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              {role === "admin" && (
                <DropdownMenuItem className="hover:bg-[#004B8D]/10 cursor-pointer">
                  <Shield className="w-4 h-4 mr-2" />
                  User Management
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-[#004B8D]/10" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="hover:bg-red-500/10 text-red-600 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      <UpgradePlanModal 
        open={upgradeModalOpen} 
        onOpenChange={setUpgradeModalOpen} 
      />
    </>
  );
}
