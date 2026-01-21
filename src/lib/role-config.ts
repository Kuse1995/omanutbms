// Centralized role configuration for the BMS
// These roles match the PostgreSQL app_role enum in the database

import { 
  Crown, 
  UserCog, 
  Eye, 
  Calculator, 
  Users, 
  ShoppingCart, 
  Banknote,
  type LucideIcon 
} from "lucide-react";

// All available roles in the system
export type AppRole = "admin" | "manager" | "accountant" | "hr_manager" | "sales_rep" | "cashier" | "viewer";

// Role configuration with labels, icons, and colors
export interface RoleConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  description: string;
}

export const roleConfig: Record<AppRole, RoleConfig> = {
  admin: { 
    label: "Admin", 
    icon: Crown, 
    color: "text-amber-600", 
    bgColor: "bg-amber-50 border-amber-200",
    description: "Full access to all modules and settings"
  },
  manager: { 
    label: "Manager", 
    icon: UserCog, 
    color: "text-blue-600", 
    bgColor: "bg-blue-50 border-blue-200",
    description: "Access to most modules, can manage staff"
  },
  accountant: { 
    label: "Accountant", 
    icon: Calculator, 
    color: "text-emerald-600", 
    bgColor: "bg-emerald-50 border-emerald-200",
    description: "Accounts, invoices, expenses, financial reports"
  },
  hr_manager: { 
    label: "HR Manager", 
    icon: Users, 
    color: "text-purple-600", 
    bgColor: "bg-purple-50 border-purple-200",
    description: "HR, payroll, employees, attendance"
  },
  sales_rep: { 
    label: "Sales Rep", 
    icon: ShoppingCart, 
    color: "text-cyan-600", 
    bgColor: "bg-cyan-50 border-cyan-200",
    description: "Sales, receipts, inventory (view only)"
  },
  cashier: { 
    label: "Cashier", 
    icon: Banknote, 
    color: "text-orange-600", 
    bgColor: "bg-orange-50 border-orange-200",
    description: "Sales recording and receipts only"
  },
  viewer: { 
    label: "Viewer", 
    icon: Eye, 
    color: "text-slate-600", 
    bgColor: "bg-slate-50 border-slate-200",
    description: "Read-only access to dashboards"
  },
};

// Module access by role
export type ModuleKey = 
  | "dashboard" 
  | "sales" 
  | "receipts" 
  | "accounts" 
  | "hr" 
  | "inventory" 
  | "returns"
  | "shop" 
  | "agents" 
  | "communities" 
  | "messages" 
  | "website" 
  | "contacts"
  | "branches"
  | "settings"
  | "tenant-settings"
  | "modules"
  | "warehouse"
  | "stock-transfers"
  | "locations"
  | "customers"
  | "custom-orders";

export const roleModuleAccess: Record<AppRole, ModuleKey[]> = {
  admin: [
    "dashboard", "sales", "receipts", "accounts", "hr", "inventory", "returns", "shop", 
    "agents", "communities", "messages", "website", "contacts", "branches",
    "settings", "tenant-settings", "modules",
    "warehouse", "stock-transfers", "locations", "customers", "custom-orders"
  ],
  manager: [
    "dashboard", "sales", "receipts", "accounts", "hr", "inventory", "returns", "shop",
    "agents", "communities", "messages", "website", "contacts",
    "warehouse", "stock-transfers", "locations", "customers", "custom-orders"
  ],
  accountant: [
    "dashboard", "accounts", "receipts"
  ],
  hr_manager: [
    "dashboard", "hr"
  ],
  sales_rep: [
    "dashboard", "sales", "receipts", "inventory", "returns"
  ],
  cashier: [
    "dashboard", "sales", "receipts"
  ],
  viewer: [
    "dashboard"
  ],
};

// Check if a role has access to a module
export function hasModuleAccess(role: AppRole | null, module: ModuleKey): boolean {
  if (!role) return false;
  return roleModuleAccess[role]?.includes(module) ?? false;
}

// Check if a role is admin-level (can access admin sections)
export function isAdminRole(role: AppRole | null): boolean {
  return role === "admin";
}

// Check if a role can manage users
export function canManageUsers(role: AppRole | null): boolean {
  return role === "admin" || role === "manager";
}

// Check if a role can edit records (not just view)
export function canEditRecords(role: AppRole | null): boolean {
  return role === "admin" || role === "manager";
}

// Check if a role can add new records
export function canAddRecords(role: AppRole | null): boolean {
  return role !== "viewer";
}

// Check if a role can delete records
export function canDeleteRecords(role: AppRole | null): boolean {
  return role === "admin";
}

// Get all roles as options for select dropdowns
export function getRoleOptions(): { value: AppRole; label: string }[] {
  return (Object.keys(roleConfig) as AppRole[]).map(role => ({
    value: role,
    label: roleConfig[role].label
  }));
}
