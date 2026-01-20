import React from 'react';
import { Building2, ChevronDown, MapPin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBranch } from '@/hooks/useBranch';
import { cn } from '@/lib/utils';

export const BranchSelector: React.FC = () => {
  const {
    branches,
    currentBranch,
    setCurrentBranch,
    isMultiBranchEnabled,
    canAccessAllBranches,
    userBranchId,
    loading,
  } = useBranch();

  if (!isMultiBranchEnabled || branches.length === 0) {
    return null;
  }

  // Filter branches for non-admin users to only show their assigned branch
  const accessibleBranches = canAccessAllBranches 
    ? branches 
    : branches.filter(b => b.id === userBranchId);

  // If user can only access one branch, just show it as a label (no dropdown)
  if (!canAccessAllBranches && accessibleBranches.length <= 1) {
    const userBranch = accessibleBranches[0];
    if (!userBranch) return null;
    
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{userBranch.name}</span>
        {userBranch.is_headquarters && (
          <Badge variant="outline" className="text-xs">HQ</Badge>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 min-w-[140px] justify-between"
          disabled={loading}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate max-w-[120px]">
              {currentBranch ? currentBranch.name : 'All Branches'}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        {canAccessAllBranches && (
          <>
            <DropdownMenuItem
              onClick={() => setCurrentBranch(null)}
              className={cn(
                'cursor-pointer',
                !currentBranch && 'bg-accent'
              )}
            >
              <Building2 className="h-4 w-4 mr-2" />
              <span>All Branches</span>
              {!currentBranch && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Active
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {accessibleBranches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => setCurrentBranch(branch)}
            className={cn(
              'cursor-pointer',
              currentBranch?.id === branch.id && 'bg-accent'
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {branch.is_headquarters ? (
                <Building2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="truncate">{branch.name}</span>
                {branch.city && (
                  <span className="text-xs text-muted-foreground truncate">
                    {branch.city}
                  </span>
                )}
              </div>
            </div>
            {branch.is_headquarters && (
              <Badge variant="outline" className="ml-2 text-xs shrink-0">
                HQ
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
