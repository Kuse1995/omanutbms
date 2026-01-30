export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts_payable: {
        Row: {
          amount_zmw: number
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          invoice_reference: string | null
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          recorded_by: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          vendor_name: string
        }
        Insert: {
          amount_zmw?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_reference?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          recorded_by?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          vendor_name: string
        }
        Update: {
          amount_zmw?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_reference?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          recorded_by?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      addon_definitions: {
        Row: {
          addon_key: string
          annual_price: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          display_name: string
          enterprise_limit: number | null
          growth_limit: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          monthly_price: number | null
          pricing_type: string
          sort_order: number | null
          starter_limit: number | null
          unit_label: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          addon_key: string
          annual_price?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          display_name: string
          enterprise_limit?: number | null
          growth_limit?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number | null
          pricing_type: string
          sort_order?: number | null
          starter_limit?: number | null
          unit_label?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          addon_key?: string
          annual_price?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          display_name?: string
          enterprise_limit?: number | null
          growth_limit?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number | null
          pricing_type?: string
          sort_order?: number | null
          starter_limit?: number | null
          unit_label?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          related_table: string | null
          tenant_id: string | null
        }
        Insert: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          related_table?: string | null
          tenant_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          related_table?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_action_logs: {
        Row: {
          action_params: Json | null
          action_result: Json | null
          action_type: string
          created_at: string | null
          error_message: string | null
          id: string
          success: boolean | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action_params?: Json | null
          action_result?: Json | null
          action_type: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          success?: boolean | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action_params?: Json | null
          action_result?: Json | null
          action_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          success?: boolean | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_action_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_applications: {
        Row: {
          address: string | null
          business_name: string
          business_type: string
          contact_person: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          motivation: string
          notes: string | null
          phone_number: string
          province: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_name: string
          business_type: string
          contact_person: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          motivation: string
          notes?: string | null
          phone_number: string
          province: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_name?: string
          business_type?: string
          contact_person?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          motivation?: string
          notes?: string | null
          phone_number?: string
          province?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_inventory: {
        Row: {
          agent_id: string
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          notes: string | null
          product_id: string | null
          product_type: string
          quantity: number
          tenant_id: string | null
          total_value: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_type: string
          quantity?: number
          tenant_id?: string | null
          total_value?: number | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_type?: string
          quantity?: number
          tenant_id?: string | null
          total_value?: number | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_inventory_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_transactions: {
        Row: {
          agent_id: string
          amount_zmw: number
          created_at: string
          id: string
          invoice_id: string | null
          notes: string | null
          products_json: Json | null
          recorded_by: string | null
          tenant_id: string | null
          transaction_type: string
        }
        Insert: {
          agent_id: string
          amount_zmw?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          products_json?: Json | null
          recorded_by?: string | null
          tenant_id?: string | null
          transaction_type?: string
        }
        Update: {
          agent_id?: string
          amount_zmw?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          products_json?: Json | null
          recorded_by?: string | null
          tenant_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_agent_transaction_agent"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_agent_transaction_invoice"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_logs: {
        Row: {
          action: string
          asset_id: string
          created_at: string
          id: string
          new_value: Json | null
          notes: string | null
          old_value: Json | null
          performed_by: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          asset_id: string
          created_at?: string
          id?: string
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          performed_by?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          asset_id?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          performed_by?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          depreciation_method: string
          description: string | null
          disposal_date: string | null
          disposal_value: number | null
          id: string
          image_url: string | null
          location: string | null
          name: string
          purchase_cost: number
          purchase_date: string
          salvage_value: number
          serial_number: string | null
          status: string
          tenant_id: string
          updated_at: string
          useful_life_years: number
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          depreciation_method?: string
          description?: string | null
          disposal_date?: string | null
          disposal_value?: number | null
          id?: string
          image_url?: string | null
          location?: string | null
          name: string
          purchase_cost?: number
          purchase_date: string
          salvage_value?: number
          serial_number?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          useful_life_years?: number
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          depreciation_method?: string
          description?: string | null
          disposal_date?: string | null
          disposal_value?: number | null
          id?: string
          image_url?: string | null
          location?: string | null
          name?: string
          purchase_cost?: number
          purchase_date?: string
          salvage_value?: number
          serial_number?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          useful_life_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      authorized_emails: {
        Row: {
          added_by: string | null
          branch_id: string | null
          created_at: string
          default_role: Database["public"]["Enums"]["app_role"]
          email: string
          id: string
          notes: string | null
          tenant_id: string | null
        }
        Insert: {
          added_by?: string | null
          branch_id?: string | null
          created_at?: string
          default_role?: Database["public"]["Enums"]["app_role"]
          email: string
          id?: string
          notes?: string | null
          tenant_id?: string | null
        }
        Update: {
          added_by?: string | null
          branch_id?: string | null
          created_at?: string
          default_role?: Database["public"]["Enums"]["app_role"]
          email?: string
          id?: string
          notes?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authorized_emails_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authorized_emails_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plan_configs: {
        Row: {
          annual_price: number | null
          currency: string | null
          description: string | null
          feature_advanced_accounting: boolean | null
          feature_agents: boolean | null
          feature_impact: boolean | null
          feature_inventory: boolean | null
          feature_payroll: boolean | null
          feature_warehouse: boolean | null
          feature_website: boolean | null
          feature_whatsapp: boolean | null
          highlights: string[] | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          label: string | null
          max_inventory_items: number | null
          max_users: number | null
          monthly_price: number | null
          plan_key: string
          tagline: string | null
          trial_days: number | null
          updated_at: string
          updated_by: string | null
          whatsapp_limit_enabled: boolean | null
          whatsapp_monthly_limit: number | null
        }
        Insert: {
          annual_price?: number | null
          currency?: string | null
          description?: string | null
          feature_advanced_accounting?: boolean | null
          feature_agents?: boolean | null
          feature_impact?: boolean | null
          feature_inventory?: boolean | null
          feature_payroll?: boolean | null
          feature_warehouse?: boolean | null
          feature_website?: boolean | null
          feature_whatsapp?: boolean | null
          highlights?: string[] | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          label?: string | null
          max_inventory_items?: number | null
          max_users?: number | null
          monthly_price?: number | null
          plan_key: string
          tagline?: string | null
          trial_days?: number | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_limit_enabled?: boolean | null
          whatsapp_monthly_limit?: number | null
        }
        Update: {
          annual_price?: number | null
          currency?: string | null
          description?: string | null
          feature_advanced_accounting?: boolean | null
          feature_agents?: boolean | null
          feature_impact?: boolean | null
          feature_inventory?: boolean | null
          feature_payroll?: boolean | null
          feature_warehouse?: boolean | null
          feature_website?: boolean | null
          feature_whatsapp?: boolean | null
          highlights?: string[] | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          label?: string | null
          max_inventory_items?: number | null
          max_users?: number | null
          monthly_price?: number | null
          plan_key?: string
          tagline?: string | null
          trial_days?: number | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_limit_enabled?: boolean | null
          whatsapp_monthly_limit?: number | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_inventory: {
        Row: {
          branch_id: string
          created_at: string | null
          current_stock: number
          id: string
          inventory_id: string
          reorder_level: number
          reserved: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          current_stock?: number
          id?: string
          inventory_id: string
          reorder_level?: number
          reserved?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          current_stock?: number
          id?: string
          inventory_id?: string
          reorder_level?: number
          reserved?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_inventory_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          created_at: string | null
          email: string | null
          geofence_radius_meters: number | null
          id: string
          is_active: boolean | null
          is_headquarters: boolean | null
          latitude: number | null
          longitude: number | null
          manager_id: string | null
          name: string
          phone: string | null
          tenant_id: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          created_at?: string | null
          email?: string | null
          geofence_radius_meters?: number | null
          id?: string
          is_active?: boolean | null
          is_headquarters?: boolean | null
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          name: string
          phone?: string | null
          tenant_id: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          created_at?: string | null
          email?: string | null
          geofence_radius_meters?: number | null
          id?: string
          is_active?: boolean | null
          is_headquarters?: boolean | null
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          name?: string
          phone?: string | null
          tenant_id?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          accent_color: string | null
          advanced_accounting_enabled: boolean | null
          agents_enabled: boolean | null
          attendance_location_required: boolean | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bank_swift_code: string | null
          billing_end_date: string | null
          billing_notes: string | null
          billing_plan: string
          billing_start_date: string | null
          billing_status: string
          business_type: string | null
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          country: string | null
          created_at: string
          currency: string | null
          currency_symbol: string | null
          detected_country: string | null
          enabled_features: Json | null
          id: string
          impact_enabled: boolean | null
          industry: string | null
          inventory_enabled: boolean | null
          logo_url: string | null
          multi_branch_enabled: boolean | null
          payment_provider_customer_id: string | null
          payroll_enabled: boolean | null
          preferred_currency: string | null
          primary_color: string | null
          secondary_color: string | null
          slogan: string | null
          sourcing_label: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tagline: string | null
          tax_enabled: boolean | null
          tax_rate: number | null
          tenant_id: string
          tpin_number: string | null
          trial_expires_at: string | null
          updated_at: string
          warehouse_enabled: boolean | null
          website_enabled: boolean | null
          whatsapp_enabled: boolean | null
          whatsapp_messages_used: number | null
          whatsapp_usage_reset_date: string | null
          white_label_enabled: boolean | null
        }
        Insert: {
          accent_color?: string | null
          advanced_accounting_enabled?: boolean | null
          agents_enabled?: boolean | null
          attendance_location_required?: boolean | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          billing_end_date?: string | null
          billing_notes?: string | null
          billing_plan?: string
          billing_start_date?: string | null
          billing_status?: string
          business_type?: string | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          currency_symbol?: string | null
          detected_country?: string | null
          enabled_features?: Json | null
          id?: string
          impact_enabled?: boolean | null
          industry?: string | null
          inventory_enabled?: boolean | null
          logo_url?: string | null
          multi_branch_enabled?: boolean | null
          payment_provider_customer_id?: string | null
          payroll_enabled?: boolean | null
          preferred_currency?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slogan?: string | null
          sourcing_label?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tagline?: string | null
          tax_enabled?: boolean | null
          tax_rate?: number | null
          tenant_id: string
          tpin_number?: string | null
          trial_expires_at?: string | null
          updated_at?: string
          warehouse_enabled?: boolean | null
          website_enabled?: boolean | null
          whatsapp_enabled?: boolean | null
          whatsapp_messages_used?: number | null
          whatsapp_usage_reset_date?: string | null
          white_label_enabled?: boolean | null
        }
        Update: {
          accent_color?: string | null
          advanced_accounting_enabled?: boolean | null
          agents_enabled?: boolean | null
          attendance_location_required?: boolean | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          billing_end_date?: string | null
          billing_notes?: string | null
          billing_plan?: string
          billing_start_date?: string | null
          billing_status?: string
          business_type?: string | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          currency_symbol?: string | null
          detected_country?: string | null
          enabled_features?: Json | null
          id?: string
          impact_enabled?: boolean | null
          industry?: string | null
          inventory_enabled?: boolean | null
          logo_url?: string | null
          multi_branch_enabled?: boolean | null
          payment_provider_customer_id?: string | null
          payroll_enabled?: boolean | null
          preferred_currency?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slogan?: string | null
          sourcing_label?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tagline?: string | null
          tax_enabled?: boolean | null
          tax_rate?: number | null
          tenant_id?: string
          tpin_number?: string | null
          trial_expires_at?: string | null
          updated_at?: string
          warehouse_enabled?: boolean | null
          website_enabled?: boolean | null
          whatsapp_enabled?: boolean | null
          whatsapp_messages_used?: number | null
          whatsapp_usage_reset_date?: string | null
          white_label_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          start_date: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          start_date?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          admin_notes: string | null
          created_at: string
          donor_email: string
          donor_name: string
          donor_phone: string | null
          id: string
          message: string
          status: string
          tenant_id: string | null
          updated_at: string
          wash_forum_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          donor_email: string
          donor_name: string
          donor_phone?: string | null
          id?: string
          message: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          wash_forum_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          donor_email?: string
          donor_name?: string
          donor_phone?: string | null
          id?: string
          message?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          wash_forum_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_messages_wash_forum_id_fkey"
            columns: ["wash_forum_id"]
            isOneToOne: false
            referencedRelation: "wash_forums"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          company_name: string
          created_at: string
          currency_symbol: string
          id: string
          logo_url: string | null
          primary_color: string | null
          tax_rate: number
          updated_at: string
        }
        Insert: {
          company_name?: string
          created_at?: string
          currency_symbol?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          currency_symbol?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          tax_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      company_statistics: {
        Row: {
          id: string
          total_children_impacted: number
          total_liters_donated: number
          total_revenue_zmw: number
          total_sales_count: number
          updated_at: string
        }
        Insert: {
          id?: string
          total_children_impacted?: number
          total_liters_donated?: number
          total_revenue_zmw?: number
          total_sales_count?: number
          updated_at?: string
        }
        Update: {
          id?: string
          total_children_impacted?: number
          total_liters_donated?: number
          total_revenue_zmw?: number
          total_sales_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      currency_configs: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          currency_code: string
          currency_symbol: string
          exchange_rate: number
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          currency_code: string
          currency_symbol: string
          exchange_rate?: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          exchange_rate?: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      custom_order_adjustments: {
        Row: {
          adjustment_date: string
          attended_by: string | null
          collection_date: string | null
          created_at: string | null
          custom_order_id: string
          id: string
          next_fitting_date: string | null
          notes: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          adjustment_date?: string
          attended_by?: string | null
          collection_date?: string | null
          created_at?: string | null
          custom_order_id: string
          id?: string
          next_fitting_date?: string | null
          notes?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          adjustment_date?: string
          attended_by?: string | null
          collection_date?: string | null
          created_at?: string | null
          custom_order_id?: string
          id?: string
          next_fitting_date?: string | null
          notes?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_order_adjustments_attended_by_fkey"
            columns: ["attended_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_order_adjustments_custom_order_id_fkey"
            columns: ["custom_order_id"]
            isOneToOne: false
            referencedRelation: "custom_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_order_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_order_items: {
        Row: {
          created_at: string
          custom_order_id: string
          description: string | null
          id: string
          item_name: string
          quantity: number | null
          status: string | null
          tenant_id: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_order_id: string
          description?: string | null
          id?: string
          item_name: string
          quantity?: number | null
          status?: string | null
          tenant_id: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_order_id?: string
          description?: string | null
          id?: string
          item_name?: string
          quantity?: number | null
          status?: string | null
          tenant_id?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_order_items_custom_order_id_fkey"
            columns: ["custom_order_id"]
            isOneToOne: false
            referencedRelation: "custom_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_orders: {
        Row: {
          actual_collection_date: string | null
          appointment_date: string | null
          assigned_operations_user_id: string | null
          assigned_tailor_id: string | null
          assigned_to: string | null
          branch_id: string | null
          client_called: boolean | null
          client_called_at: string | null
          collection_date: string | null
          collection_signature_url: string | null
          collection_time: string | null
          color: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          demo_session_id: string | null
          deposit_paid: number | null
          design_type: string | null
          due_date: string | null
          estimated_cost: number | null
          estimated_labor_cost: number | null
          estimated_labor_hours: number | null
          estimated_material_cost: number | null
          fabric: string | null
          final_cost: number | null
          fitting_date: string | null
          generated_images: Json | null
          handed_back_at: string | null
          handed_off_at: string | null
          handoff_notes: string | null
          handoff_status: string | null
          handoff_step: number | null
          id: string
          invoice_id: string | null
          is_demo: boolean | null
          labor_hourly_rate: number | null
          margin_percentage: number | null
          measurements: Json | null
          order_date: string | null
          order_number: string
          price_locked: boolean | null
          price_locked_at: string | null
          production_type: string | null
          qc_checks: Json | null
          qc_completed_at: string | null
          qc_completed_by: string | null
          qc_notes: string | null
          quotation_id: string | null
          quoted_price: number | null
          reference_images: string[] | null
          residential_address: string | null
          status: string | null
          style_notes: string | null
          tag_material: string | null
          tailor_skill_level: string | null
          tenant_id: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          actual_collection_date?: string | null
          appointment_date?: string | null
          assigned_operations_user_id?: string | null
          assigned_tailor_id?: string | null
          assigned_to?: string | null
          branch_id?: string | null
          client_called?: boolean | null
          client_called_at?: string | null
          collection_date?: string | null
          collection_signature_url?: string | null
          collection_time?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          demo_session_id?: string | null
          deposit_paid?: number | null
          design_type?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          estimated_labor_cost?: number | null
          estimated_labor_hours?: number | null
          estimated_material_cost?: number | null
          fabric?: string | null
          final_cost?: number | null
          fitting_date?: string | null
          generated_images?: Json | null
          handed_back_at?: string | null
          handed_off_at?: string | null
          handoff_notes?: string | null
          handoff_status?: string | null
          handoff_step?: number | null
          id?: string
          invoice_id?: string | null
          is_demo?: boolean | null
          labor_hourly_rate?: number | null
          margin_percentage?: number | null
          measurements?: Json | null
          order_date?: string | null
          order_number: string
          price_locked?: boolean | null
          price_locked_at?: string | null
          production_type?: string | null
          qc_checks?: Json | null
          qc_completed_at?: string | null
          qc_completed_by?: string | null
          qc_notes?: string | null
          quotation_id?: string | null
          quoted_price?: number | null
          reference_images?: string[] | null
          residential_address?: string | null
          status?: string | null
          style_notes?: string | null
          tag_material?: string | null
          tailor_skill_level?: string | null
          tenant_id: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          actual_collection_date?: string | null
          appointment_date?: string | null
          assigned_operations_user_id?: string | null
          assigned_tailor_id?: string | null
          assigned_to?: string | null
          branch_id?: string | null
          client_called?: boolean | null
          client_called_at?: string | null
          collection_date?: string | null
          collection_signature_url?: string | null
          collection_time?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          demo_session_id?: string | null
          deposit_paid?: number | null
          design_type?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          estimated_labor_cost?: number | null
          estimated_labor_hours?: number | null
          estimated_material_cost?: number | null
          fabric?: string | null
          final_cost?: number | null
          fitting_date?: string | null
          generated_images?: Json | null
          handed_back_at?: string | null
          handed_off_at?: string | null
          handoff_notes?: string | null
          handoff_status?: string | null
          handoff_step?: number | null
          id?: string
          invoice_id?: string | null
          is_demo?: boolean | null
          labor_hourly_rate?: number | null
          margin_percentage?: number | null
          measurements?: Json | null
          order_date?: string | null
          order_number?: string
          price_locked?: boolean | null
          price_locked_at?: string | null
          production_type?: string | null
          qc_checks?: Json | null
          qc_completed_at?: string | null
          qc_completed_by?: string | null
          qc_notes?: string | null
          quotation_id?: string | null
          quoted_price?: number | null
          reference_images?: string[] | null
          residential_address?: string | null
          status?: string | null
          style_notes?: string | null
          tag_material?: string | null
          tailor_skill_level?: string | null
          tenant_id?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_orders_assigned_tailor_id_fkey"
            columns: ["assigned_tailor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          demo_session_id: string | null
          email: string | null
          id: string
          is_demo: boolean | null
          measurements: Json | null
          name: string
          notes: string | null
          phone: string | null
          residential_address: string | null
          tenant_id: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          demo_session_id?: string | null
          email?: string | null
          id?: string
          is_demo?: boolean | null
          measurements?: Json | null
          name: string
          notes?: string | null
          phone?: string | null
          residential_address?: string | null
          tenant_id: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          demo_session_id?: string | null
          email?: string | null
          id?: string
          is_demo?: boolean | null
          measurements?: Json | null
          name?: string
          notes?: string | null
          phone?: string | null
          residential_address?: string | null
          tenant_id?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_requests: {
        Row: {
          created_at: string
          donor_email: string
          donor_name: string
          donor_phone: string | null
          id: string
          message: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          wash_forum_id: string
        }
        Insert: {
          created_at?: string
          donor_email: string
          donor_name: string
          donor_phone?: string | null
          id?: string
          message?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          wash_forum_id: string
        }
        Update: {
          created_at?: string
          donor_email?: string
          donor_name?: string
          donor_phone?: string | null
          id?: string
          message?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          wash_forum_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_requests_wash_forum_id_fkey"
            columns: ["wash_forum_id"]
            isOneToOne: false
            referencedRelation: "wash_forums"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_attendance: {
        Row: {
          change_log: Json | null
          clock_in: string
          clock_in_distance_meters: number | null
          clock_in_latitude: number | null
          clock_in_longitude: number | null
          clock_in_verified: boolean | null
          clock_out: string | null
          clock_out_latitude: number | null
          clock_out_longitude: number | null
          created_at: string
          date: string
          edit_status: string | null
          employee_id: string
          id: string
          notes: string | null
          recorded_by: string | null
          requested_at: string | null
          requested_by: string | null
          requested_times: Json | null
          status: string
          tenant_id: string | null
          work_hours: number | null
        }
        Insert: {
          change_log?: Json | null
          clock_in?: string
          clock_in_distance_meters?: number | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_verified?: boolean | null
          clock_out?: string | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          created_at?: string
          date?: string
          edit_status?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          requested_at?: string | null
          requested_by?: string | null
          requested_times?: Json | null
          status?: string
          tenant_id?: string | null
          work_hours?: number | null
        }
        Update: {
          change_log?: Json | null
          clock_in?: string
          clock_in_distance_meters?: number | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_verified?: boolean | null
          clock_out?: string | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          created_at?: string
          date?: string
          edit_status?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          requested_at?: string | null
          requested_by?: string | null
          requested_times?: Json | null
          status?: string
          tenant_id?: string | null
          work_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          document_type: string
          employee_id: string
          file_url: string
          id: string
          tenant_id: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          document_type: string
          employee_id: string
          file_url: string
          id?: string
          tenant_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          document_type?: string
          employee_id?: string
          file_url?: string
          id?: string
          tenant_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employee_document_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          authorized_email_id: string | null
          avatar_url: string | null
          bank_account_number: string | null
          bank_name: string | null
          base_salary_zmw: number
          branch_id: string | null
          created_at: string
          daily_rate: number | null
          demo_session_id: string | null
          department: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_type: string
          employment_status: string
          full_name: string
          hire_date: string
          hourly_rate: number | null
          id: string
          is_demo: boolean | null
          job_title: string | null
          notes: string | null
          nrc_number: string | null
          pay_type: string
          phone: string | null
          shift_rate: number | null
          skill_level: string | null
          tenant_id: string | null
          termination_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          authorized_email_id?: string | null
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          base_salary_zmw?: number
          branch_id?: string | null
          created_at?: string
          daily_rate?: number | null
          demo_session_id?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_type?: string
          employment_status?: string
          full_name: string
          hire_date?: string
          hourly_rate?: number | null
          id?: string
          is_demo?: boolean | null
          job_title?: string | null
          notes?: string | null
          nrc_number?: string | null
          pay_type?: string
          phone?: string | null
          shift_rate?: number | null
          skill_level?: string | null
          tenant_id?: string | null
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          authorized_email_id?: string | null
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          base_salary_zmw?: number
          branch_id?: string | null
          created_at?: string
          daily_rate?: number | null
          demo_session_id?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_type?: string
          employment_status?: string
          full_name?: string
          hire_date?: string
          hourly_rate?: number | null
          id?: string
          is_demo?: boolean | null
          job_title?: string | null
          notes?: string | null
          nrc_number?: string | null
          pay_type?: string
          phone?: string | null
          shift_rate?: number | null
          skill_level?: string | null
          tenant_id?: string | null
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_authorized_email_id_fkey"
            columns: ["authorized_email_id"]
            isOneToOne: false
            referencedRelation: "authorized_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_zmw: number
          branch_id: string | null
          category: string
          created_at: string
          date_incurred: string
          demo_session_id: string | null
          id: string
          is_demo: boolean | null
          notes: string | null
          payroll_record_id: string | null
          receipt_image_url: string | null
          recorded_by: string | null
          tenant_id: string | null
          updated_at: string
          vendor_name: string
        }
        Insert: {
          amount_zmw?: number
          branch_id?: string | null
          category: string
          created_at?: string
          date_incurred?: string
          demo_session_id?: string | null
          id?: string
          is_demo?: boolean | null
          notes?: string | null
          payroll_record_id?: string | null
          receipt_image_url?: string | null
          recorded_by?: string | null
          tenant_id?: string | null
          updated_at?: string
          vendor_name: string
        }
        Update: {
          amount_zmw?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          date_incurred?: string
          demo_session_id?: string | null
          id?: string
          is_demo?: boolean | null
          notes?: string | null
          payroll_record_id?: string | null
          receipt_image_url?: string | null
          recorded_by?: string | null
          tenant_id?: string | null
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_payroll_record_id_fkey"
            columns: ["payroll_record_id"]
            isOneToOne: false
            referencedRelation: "payroll_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_usage_logs: {
        Row: {
          action_type: string
          created_at: string
          feature_key: string
          id: string
          metadata: Json | null
          page_path: string | null
          session_id: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action_type?: string
          created_at?: string
          feature_key: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          feature_key?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_reports: {
        Row: {
          ai_insights: Json | null
          ai_summary: string | null
          created_at: string
          generated_by: string | null
          id: string
          net_profit: number
          period_end: string
          period_start: string
          report_type: string
          tenant_id: string | null
          total_expenses: number
          total_revenue: number
        }
        Insert: {
          ai_insights?: Json | null
          ai_summary?: string | null
          created_at?: string
          generated_by?: string | null
          id?: string
          net_profit?: number
          period_end: string
          period_start: string
          report_type?: string
          tenant_id?: string | null
          total_expenses?: number
          total_revenue?: number
        }
        Update: {
          ai_insights?: Json | null
          ai_summary?: string | null
          created_at?: string
          generated_by?: string | null
          id?: string
          net_profit?: number
          period_end?: string
          period_start?: string
          report_type?: string
          tenant_id?: string | null
          total_expenses?: number
          total_revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_announcements: {
        Row: {
          button_link: string | null
          button_text: string | null
          created_at: string
          headline: string
          headline_accent: string
          id: string
          is_active: boolean
          stat_1_label: string | null
          stat_1_value: string | null
          stat_2_label: string | null
          stat_2_value: string | null
          stat_3_label: string | null
          stat_3_value: string | null
          tagline: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          headline: string
          headline_accent: string
          id?: string
          is_active?: boolean
          stat_1_label?: string | null
          stat_1_value?: string | null
          stat_2_label?: string | null
          stat_2_value?: string | null
          stat_3_label?: string | null
          stat_3_value?: string | null
          tagline: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          headline?: string
          headline_accent?: string
          id?: string
          is_active?: boolean
          stat_1_label?: string | null
          stat_1_value?: string | null
          stat_2_label?: string | null
          stat_2_value?: string | null
          stat_3_label?: string | null
          stat_3_value?: string | null
          tagline?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hero_announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_certificates: {
        Row: {
          certificate_id: string
          client_name: string
          generated_at: string
          generated_by: string
          id: string
          liters_provided: number
          lives_impacted: number
          tenant_id: string | null
        }
        Insert: {
          certificate_id: string
          client_name: string
          generated_at?: string
          generated_by: string
          id?: string
          liters_provided: number
          lives_impacted: number
          tenant_id?: string | null
        }
        Update: {
          certificate_id?: string
          client_name?: string
          generated_at?: string
          generated_by?: string
          id?: string
          liters_provided?: number
          lives_impacted?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impact_certificates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_metrics: {
        Row: {
          id: string
          metric_type: string
          period_end: string | null
          period_start: string | null
          tenant_id: string | null
          updated_at: string
          value: number
        }
        Insert: {
          id?: string
          metric_type: string
          period_end?: string | null
          period_start?: string | null
          tenant_id?: string | null
          updated_at?: string
          value?: number
        }
        Update: {
          id?: string
          metric_type?: string
          period_end?: string | null
          period_start?: string | null
          tenant_id?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "impact_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          ai_prediction: string | null
          batch_number: string | null
          brand: string | null
          category: string | null
          certifications: string[] | null
          collection_id: string | null
          cost_price: number | null
          created_at: string
          current_stock: number
          datasheet_url: string | null
          default_location_id: string | null
          demo_session_id: string | null
          description: string | null
          expiry_date: string | null
          features: string[] | null
          gender: string | null
          has_expiry: boolean | null
          highlight: string | null
          id: string
          image_url: string | null
          inventory_class: string | null
          is_archived: boolean
          is_demo: boolean | null
          item_type: string
          liters_per_unit: number
          manual_url: string | null
          material: string | null
          name: string
          original_price: number | null
          reorder_level: number
          reserved: number
          sku: string
          status: string
          technical_specs: Json | null
          tenant_id: string | null
          unit_of_measure: string | null
          unit_price: number
          updated_at: string
          wholesale_stock: number
        }
        Insert: {
          ai_prediction?: string | null
          batch_number?: string | null
          brand?: string | null
          category?: string | null
          certifications?: string[] | null
          collection_id?: string | null
          cost_price?: number | null
          created_at?: string
          current_stock?: number
          datasheet_url?: string | null
          default_location_id?: string | null
          demo_session_id?: string | null
          description?: string | null
          expiry_date?: string | null
          features?: string[] | null
          gender?: string | null
          has_expiry?: boolean | null
          highlight?: string | null
          id?: string
          image_url?: string | null
          inventory_class?: string | null
          is_archived?: boolean
          is_demo?: boolean | null
          item_type?: string
          liters_per_unit?: number
          manual_url?: string | null
          material?: string | null
          name: string
          original_price?: number | null
          reorder_level?: number
          reserved?: number
          sku: string
          status?: string
          technical_specs?: Json | null
          tenant_id?: string | null
          unit_of_measure?: string | null
          unit_price?: number
          updated_at?: string
          wholesale_stock?: number
        }
        Update: {
          ai_prediction?: string | null
          batch_number?: string | null
          brand?: string | null
          category?: string | null
          certifications?: string[] | null
          collection_id?: string | null
          cost_price?: number | null
          created_at?: string
          current_stock?: number
          datasheet_url?: string | null
          default_location_id?: string | null
          demo_session_id?: string | null
          description?: string | null
          expiry_date?: string | null
          features?: string[] | null
          gender?: string | null
          has_expiry?: boolean | null
          highlight?: string | null
          id?: string
          image_url?: string | null
          inventory_class?: string | null
          is_archived?: boolean
          is_demo?: boolean | null
          item_type?: string
          liters_per_unit?: number
          manual_url?: string | null
          material?: string | null
          name?: string
          original_price?: number | null
          reorder_level?: number
          reserved?: number
          sku?: string
          status?: string
          technical_specs?: Json | null
          tenant_id?: string | null
          unit_of_measure?: string | null
          unit_price?: number
          updated_at?: string
          wholesale_stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          adjustment_type: string
          approved_by: string | null
          branch_id: string | null
          cost_impact: number | null
          created_at: string
          customer_name: string | null
          id: string
          inventory_id: string
          notes: string | null
          original_sale_id: string | null
          processed_by: string | null
          quantity: number
          reason: string
          return_to_stock: boolean | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          adjustment_type: string
          approved_by?: string | null
          branch_id?: string | null
          cost_impact?: number | null
          created_at?: string
          customer_name?: string | null
          id?: string
          inventory_id: string
          notes?: string | null
          original_sale_id?: string | null
          processed_by?: string | null
          quantity: number
          reason: string
          return_to_stock?: boolean | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          adjustment_type?: string
          approved_by?: string | null
          branch_id?: string | null
          cost_impact?: number | null
          created_at?: string
          customer_name?: string | null
          id?: string
          inventory_id?: string
          notes?: string | null
          original_sale_id?: string | null
          processed_by?: string | null
          quantity?: number
          reason?: string
          return_to_stock?: boolean | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_original_sale_id_fkey"
            columns: ["original_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          demo_session_id: string | null
          description: string
          discount_applied: number | null
          id: string
          invoice_id: string
          is_demo: boolean | null
          is_sourcing: boolean | null
          item_type: string
          lead_time: string | null
          original_amount: number | null
          product_id: string | null
          quantity: number
          sourcing_status: string | null
          tenant_id: string | null
          unit_price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          demo_session_id?: string | null
          description: string
          discount_applied?: number | null
          id?: string
          invoice_id: string
          is_demo?: boolean | null
          is_sourcing?: boolean | null
          item_type?: string
          lead_time?: string | null
          original_amount?: number | null
          product_id?: string | null
          quantity?: number
          sourcing_status?: string | null
          tenant_id?: string | null
          unit_price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          demo_session_id?: string | null
          description?: string
          discount_applied?: number | null
          id?: string
          invoice_id?: string
          is_demo?: boolean | null
          is_sourcing?: boolean | null
          item_type?: string
          lead_time?: string | null
          original_amount?: number | null
          product_id?: string | null
          quantity?: number
          sourcing_status?: string | null
          tenant_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          branch_id: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string | null
          demo_session_id: string | null
          discount_amount: number | null
          discount_reason: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          is_demo: boolean | null
          notes: string | null
          paid_amount: number
          risk_adjustment_amount: number | null
          risk_adjustment_notes: string | null
          source_quotation_id: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          tenant_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          demo_session_id?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          is_demo?: boolean | null
          notes?: string | null
          paid_amount?: number
          risk_adjustment_amount?: number | null
          risk_adjustment_notes?: string | null
          source_quotation_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          demo_session_id?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          is_demo?: boolean | null
          notes?: string | null
          paid_amount?: number
          risk_adjustment_amount?: number | null
          risk_adjustment_notes?: string | null
          source_quotation_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_source_quotation_id_fkey"
            columns: ["source_quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_material_usage: {
        Row: {
          cost_at_time_of_use: number
          created_at: string | null
          custom_order_id: string | null
          id: string
          inventory_item_id: string | null
          quantity_used: number
          tenant_id: string | null
          unit_of_measure: string | null
        }
        Insert: {
          cost_at_time_of_use?: number
          created_at?: string | null
          custom_order_id?: string | null
          id?: string
          inventory_item_id?: string | null
          quantity_used?: number
          tenant_id?: string | null
          unit_of_measure?: string | null
        }
        Update: {
          cost_at_time_of_use?: number
          created_at?: string | null
          custom_order_id?: string | null
          id?: string
          inventory_item_id?: string | null
          quantity_used?: number
          tenant_id?: string | null
          unit_of_measure?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_material_usage_custom_order_id_fkey"
            columns: ["custom_order_id"]
            isOneToOne: false
            referencedRelation: "custom_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_material_usage_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_material_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          ai_thank_you_message: string | null
          amount_paid: number
          client_email: string | null
          client_name: string
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          receipt_number: string
          tenant_id: string | null
        }
        Insert: {
          ai_thank_you_message?: string | null
          amount_paid: number
          client_email?: string | null
          client_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          receipt_number: string
          tenant_id?: string | null
        }
        Update: {
          ai_thank_you_message?: string | null
          amount_paid?: number
          client_email?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          receipt_number?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          allowances: number
          approved_by: string | null
          basic_salary: number
          bonus: number
          created_at: string
          employee_id: string | null
          employee_type: string
          gross_pay: number
          hourly_rate: number | null
          hours_worked: number | null
          id: string
          loan_deduction: number
          napsa_deduction: number
          net_pay: number
          nhima_deduction: number
          notes: string | null
          other_deductions: number
          overtime_pay: number
          paid_date: string | null
          pay_period_end: string
          pay_period_start: string
          paye_deduction: number
          payment_method: string | null
          payment_reference: string | null
          profile_user_id: string | null
          shift_pay: number | null
          shifts_worked: number | null
          status: string
          tenant_id: string | null
          total_deductions: number
        }
        Insert: {
          allowances?: number
          approved_by?: string | null
          basic_salary?: number
          bonus?: number
          created_at?: string
          employee_id?: string | null
          employee_type?: string
          gross_pay?: number
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          loan_deduction?: number
          napsa_deduction?: number
          net_pay?: number
          nhima_deduction?: number
          notes?: string | null
          other_deductions?: number
          overtime_pay?: number
          paid_date?: string | null
          pay_period_end: string
          pay_period_start: string
          paye_deduction?: number
          payment_method?: string | null
          payment_reference?: string | null
          profile_user_id?: string | null
          shift_pay?: number | null
          shifts_worked?: number | null
          status?: string
          tenant_id?: string | null
          total_deductions?: number
        }
        Update: {
          allowances?: number
          approved_by?: string | null
          basic_salary?: number
          bonus?: number
          created_at?: string
          employee_id?: string | null
          employee_type?: string
          gross_pay?: number
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          loan_deduction?: number
          napsa_deduction?: number
          net_pay?: number
          nhima_deduction?: number
          notes?: string | null
          other_deductions?: number
          overtime_pay?: number
          paid_date?: string | null
          pay_period_end?: string
          pay_period_start?: string
          paye_deduction?: number
          payment_method?: string | null
          payment_reference?: string | null
          profile_user_id?: string | null
          shift_pay?: number | null
          shifts_worked?: number | null
          status?: string
          tenant_id?: string | null
          total_deductions?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_payroll_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_config: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bank_swift_code: string | null
          billing_email: string | null
          created_at: string
          data_processing_agreement_url: string | null
          id: string
          legal_company_name: string | null
          physical_address: string | null
          platform_name: string
          privacy_policy_url: string | null
          registration_number: string | null
          support_email: string | null
          support_phone: string | null
          support_whatsapp: string | null
          terms_of_service_url: string | null
          tpin_number: string | null
          updated_at: string
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          billing_email?: string | null
          created_at?: string
          data_processing_agreement_url?: string | null
          id?: string
          legal_company_name?: string | null
          physical_address?: string | null
          platform_name?: string
          privacy_policy_url?: string | null
          registration_number?: string | null
          support_email?: string | null
          support_phone?: string | null
          support_whatsapp?: string | null
          terms_of_service_url?: string | null
          tpin_number?: string | null
          updated_at?: string
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          billing_email?: string | null
          created_at?: string
          data_processing_agreement_url?: string | null
          id?: string
          legal_company_name?: string | null
          physical_address?: string | null
          platform_name?: string
          privacy_policy_url?: string | null
          registration_number?: string | null
          support_email?: string | null
          support_phone?: string | null
          support_whatsapp?: string | null
          terms_of_service_url?: string | null
          tpin_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          additional_price: number | null
          created_at: string
          hex_code: string | null
          id: string
          is_active: boolean
          product_id: string
          stock: number | null
          stock_adjustment: number | null
          tenant_id: string | null
          updated_at: string
          variant_display: string | null
          variant_type: string
          variant_value: string
        }
        Insert: {
          additional_price?: number | null
          created_at?: string
          hex_code?: string | null
          id?: string
          is_active?: boolean
          product_id: string
          stock?: number | null
          stock_adjustment?: number | null
          tenant_id?: string | null
          updated_at?: string
          variant_display?: string | null
          variant_type: string
          variant_value: string
        }
        Update: {
          additional_price?: number | null
          created_at?: string
          hex_code?: string | null
          id?: string
          is_active?: boolean
          product_id?: string
          stock?: number | null
          stock_adjustment?: number | null
          tenant_id?: string | null
          updated_at?: string
          variant_display?: string | null
          variant_type?: string
          variant_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          last_login: string | null
          phone: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          last_login?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          last_login?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          is_sourcing: boolean | null
          lead_time: string | null
          product_id: string | null
          quantity: number
          quotation_id: string
          tenant_id: string | null
          unit_price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          is_sourcing?: boolean | null
          lead_time?: string | null
          product_id?: string | null
          quantity?: number
          quotation_id: string
          tenant_id?: string | null
          unit_price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          is_sourcing?: boolean | null
          lead_time?: string | null
          product_id?: string | null
          quantity?: number
          quotation_id?: string
          tenant_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          converted_to_invoice_id: string | null
          created_at: string
          created_by: string | null
          estimated_delivery_date: string | null
          id: string
          notes: string | null
          quotation_date: string
          quotation_number: string
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          tenant_id: string | null
          total_amount: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          estimated_delivery_date?: string | null
          id?: string
          notes?: string | null
          quotation_date?: string
          quotation_number: string
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          estimated_delivery_date?: string | null
          id?: string
          notes?: string | null
          quotation_date?: string
          quotation_number?: string
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_converted_to_invoice_id_fkey"
            columns: ["converted_to_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_expenses: {
        Row: {
          advance_notice_days: number
          amount_zmw: number
          category: string
          created_at: string
          created_by: string | null
          custom_interval_days: number | null
          description: string | null
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          last_generated_date: string | null
          next_due_date: string
          notes: string | null
          start_date: string
          tenant_id: string | null
          updated_at: string
          vendor_name: string
        }
        Insert: {
          advance_notice_days?: number
          amount_zmw?: number
          category?: string
          created_at?: string
          created_by?: string | null
          custom_interval_days?: number | null
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          next_due_date: string
          notes?: string | null
          start_date?: string
          tenant_id?: string | null
          updated_at?: string
          vendor_name: string
        }
        Update: {
          advance_notice_days?: number
          amount_zmw?: number
          category?: string
          created_at?: string
          created_by?: string | null
          custom_interval_days?: number | null
          description?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          next_due_date?: string
          notes?: string | null
          start_date?: string
          tenant_id?: string | null
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      restock_history: {
        Row: {
          branch_id: string | null
          cost_per_unit: number | null
          created_at: string
          id: string
          inventory_id: string | null
          notes: string | null
          quantity: number
          recorded_as_expense: boolean | null
          restocked_by: string | null
          tenant_id: string | null
          total_cost: number | null
        }
        Insert: {
          branch_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          inventory_id?: string | null
          notes?: string | null
          quantity: number
          recorded_as_expense?: boolean | null
          restocked_by?: string | null
          tenant_id?: string | null
          total_cost?: number | null
        }
        Update: {
          branch_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          inventory_id?: string | null
          notes?: string | null
          quantity?: number
          recorded_as_expense?: boolean | null
          restocked_by?: string | null
          tenant_id?: string | null
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "restock_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restock_history_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restock_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          inventory_id: string | null
          item_name: string
          quantity: number
          sale_id: string
          tenant_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id?: string | null
          item_name: string
          quantity?: number
          sale_id: string
          tenant_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string | null
          item_name?: string
          quantity?: number
          sale_id?: string
          tenant_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          payment_method: string
          recorded_by: string | null
          sale_date: string
          sale_number: string
          subtotal: number
          tax_amount: number
          tenant_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          recorded_by?: string | null
          sale_date?: string
          sale_number: string
          subtotal?: number
          tax_amount?: number
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          recorded_by?: string | null
          sale_date?: string
          sale_number?: string
          subtotal?: number
          tax_amount?: number
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_transactions: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          demo_session_id: string | null
          discount_amount: number | null
          discount_reason: string | null
          id: string
          is_demo: boolean | null
          item_type: string
          liters_impact: number
          notes: string | null
          payment_method: string | null
          product_id: string | null
          product_name: string
          quantity: number
          receipt_number: string | null
          recorded_by: string | null
          selected_color: string | null
          selected_size: string | null
          tenant_id: string | null
          total_amount_zmw: number
          transaction_type: string
          unit_price_zmw: number
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          demo_session_id?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          id?: string
          is_demo?: boolean | null
          item_type?: string
          liters_impact?: number
          notes?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          receipt_number?: string | null
          recorded_by?: string | null
          selected_color?: string | null
          selected_size?: string | null
          tenant_id?: string | null
          total_amount_zmw: number
          transaction_type?: string
          unit_price_zmw: number
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          demo_session_id?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          id?: string
          is_demo?: boolean | null
          item_type?: string
          liters_impact?: number
          notes?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          receipt_number?: string | null
          recorded_by?: string | null
          selected_color?: string | null
          selected_size?: string | null
          tenant_id?: string | null
          total_amount_zmw?: number
          transaction_type?: string
          unit_price_zmw?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string | null
          from_branch_id: string | null
          id: string
          inventory_id: string | null
          notes: string | null
          quantity: number
          rejection_reason: string | null
          requested_by: string | null
          requires_approval: boolean | null
          status: string | null
          tenant_id: string | null
          to_branch_id: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          from_branch_id?: string | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          quantity: number
          rejection_reason?: string | null
          requested_by?: string | null
          requires_approval?: boolean | null
          status?: string | null
          tenant_id?: string | null
          to_branch_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          from_branch_id?: string | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          quantity?: number
          rejection_reason?: string | null
          requested_by?: string | null
          requires_approval?: boolean | null
          status?: string | null
          tenant_id?: string | null
          to_branch_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          billing_period: string
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          payment_method: string | null
          payment_reference: string | null
          plan_key: string
          provider: string | null
          status: string
          tenant_id: string
          verified_at: string | null
        }
        Insert: {
          amount: number
          billing_period?: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          plan_key: string
          provider?: string | null
          status?: string
          tenant_id: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          billing_period?: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          plan_key?: string
          provider?: string | null
          status?: string
          tenant_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_addons: {
        Row: {
          addon_key: string | null
          applied_at: string | null
          applied_by: string | null
          created_at: string | null
          current_usage: number | null
          custom_limit: number | null
          custom_monthly_price: number | null
          custom_unit_price: number | null
          id: string
          is_enabled: boolean | null
          notes: string | null
          tenant_id: string | null
          updated_at: string | null
          usage_reset_date: string | null
        }
        Insert: {
          addon_key?: string | null
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string | null
          current_usage?: number | null
          custom_limit?: number | null
          custom_monthly_price?: number | null
          custom_unit_price?: number | null
          id?: string
          is_enabled?: boolean | null
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          usage_reset_date?: string | null
        }
        Update: {
          addon_key?: string | null
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string | null
          current_usage?: number | null
          custom_limit?: number | null
          custom_monthly_price?: number | null
          custom_unit_price?: number | null
          id?: string
          is_enabled?: boolean | null
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          usage_reset_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_addons_addon_key_fkey"
            columns: ["addon_key"]
            isOneToOne: false
            referencedRelation: "addon_definitions"
            referencedColumns: ["addon_key"]
          },
          {
            foreignKeyName: "tenant_addons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_statistics: {
        Row: {
          id: string
          tenant_id: string
          total_children_impacted: number
          total_liters_donated: number
          total_revenue_zmw: number
          total_sales_count: number
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          total_children_impacted?: number
          total_liters_donated?: number
          total_revenue_zmw?: number
          total_sales_count?: number
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          total_children_impacted?: number
          total_liters_donated?: number
          total_revenue_zmw?: number
          total_sales_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_statistics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          branch_id: string | null
          can_access_all_branches: boolean | null
          created_at: string
          id: string
          is_owner: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          can_access_all_branches?: boolean | null
          created_at?: string
          id?: string
          is_owner?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          can_access_all_branches?: boolean | null
          created_at?: string
          id?: string
          is_owner?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      transaction_audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          tenant_id: string | null
          transaction_id: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string | null
          transaction_id: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          ai_amount: number | null
          ai_client: string | null
          ai_confidence: number | null
          ai_description: string | null
          ai_invoice: string | null
          bank_amount: number
          bank_currency: string
          bank_date: string
          bank_reference: string
          bank_sender: string
          bank_type: string
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          ai_amount?: number | null
          ai_client?: string | null
          ai_confidence?: number | null
          ai_description?: string | null
          ai_invoice?: string | null
          bank_amount: number
          bank_currency?: string
          bank_date: string
          bank_reference: string
          bank_sender: string
          bank_type: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          ai_amount?: number | null
          ai_client?: string | null
          ai_confidence?: number | null
          ai_description?: string | null
          ai_invoice?: string | null
          bank_amount?: number
          bank_currency?: string
          bank_date?: string
          bank_reference?: string
          bank_sender?: string
          bank_type?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          ip_address: string | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      wash_forums: {
        Row: {
          community_size: number
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          description: string
          id: string
          name: string
          priority: string
          products_needed: string
          province: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          community_size?: number
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          description: string
          id?: string
          name: string
          priority?: string
          products_needed: string
          province: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          community_size?: number
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string
          id?: string
          name?: string
          priority?: string
          products_needed?: string
          province?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wash_forums_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      website_contacts: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          message: string
          sender_email: string
          sender_name: string
          sender_phone: string | null
          source_page: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message: string
          sender_email: string
          sender_name: string
          sender_phone?: string | null
          source_page?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string
          sender_email?: string
          sender_name?: string
          sender_phone?: string | null
          source_page?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_audit_logs: {
        Row: {
          created_at: string | null
          display_name: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          intent: string | null
          original_message: string | null
          response_message: string | null
          success: boolean | null
          tenant_id: string | null
          user_id: string | null
          whatsapp_number: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          intent?: string | null
          original_message?: string | null
          response_message?: string | null
          success?: boolean | null
          tenant_id?: string | null
          user_id?: string | null
          whatsapp_number: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          intent?: string | null
          original_message?: string | null
          response_message?: string | null
          success?: boolean | null
          tenant_id?: string | null
          user_id?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversation_drafts: {
        Row: {
          created_at: string
          entities: Json
          expires_at: string
          id: string
          intent: string
          last_prompt: string | null
          tenant_id: string
          updated_at: string
          user_id: string
          whatsapp_number: string
        }
        Insert: {
          created_at?: string
          entities?: Json
          expires_at?: string
          id?: string
          intent: string
          last_prompt?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
          whatsapp_number: string
        }
        Update: {
          created_at?: string
          entities?: Json
          expires_at?: string
          id?: string
          intent?: string
          last_prompt?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_drafts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_pending_actions: {
        Row: {
          confirmation_message: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          intent: string
          intent_data: Json | null
          message_sid: string | null
          processed_at: string | null
          tenant_id: string | null
          user_id: string | null
          whatsapp_number: string
        }
        Insert: {
          confirmation_message?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          intent: string
          intent_data?: Json | null
          message_sid?: string | null
          processed_at?: string | null
          tenant_id?: string | null
          user_id?: string | null
          whatsapp_number: string
        }
        Update: {
          confirmation_message?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          intent?: string
          intent_data?: Json | null
          message_sid?: string | null
          processed_at?: string | null
          tenant_id?: string | null
          user_id?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_pending_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_pending_confirmations: {
        Row: {
          created_at: string
          entities: Json | null
          expires_at: string
          id: string
          intent: string
          pending_data: Json | null
          tenant_id: string | null
          user_id: string | null
          whatsapp_number: string
        }
        Insert: {
          created_at?: string
          entities?: Json | null
          expires_at: string
          id?: string
          intent: string
          pending_data?: Json | null
          tenant_id?: string | null
          user_id?: string | null
          whatsapp_number: string
        }
        Update: {
          created_at?: string
          entities?: Json | null
          expires_at?: string
          id?: string
          intent?: string
          pending_data?: Json | null
          tenant_id?: string | null
          user_id?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_pending_confirmations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_usage_logs: {
        Row: {
          created_at: string
          id: string
          intent: string | null
          message_direction: string
          success: boolean | null
          tenant_id: string | null
          user_id: string | null
          whatsapp_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent?: string | null
          message_direction?: string
          success?: boolean | null
          tenant_id?: string | null
          user_id?: string | null
          whatsapp_number: string
        }
        Update: {
          created_at?: string
          id?: string
          intent?: string | null
          message_direction?: string
          success?: boolean | null
          tenant_id?: string | null
          user_id?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_user_mappings: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_name: string
          employee_id: string | null
          id: string
          is_active: boolean | null
          is_employee_self_service: boolean | null
          is_verified: boolean | null
          last_used_at: string | null
          role: string
          tenant_id: string
          updated_at: string | null
          user_id: string | null
          whatsapp_number: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_name: string
          employee_id?: string | null
          id?: string
          is_active?: boolean | null
          is_employee_self_service?: boolean | null
          is_verified?: boolean | null
          last_used_at?: string | null
          role?: string
          tenant_id: string
          updated_at?: string | null
          user_id?: string | null
          whatsapp_number: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_name?: string
          employee_id?: string | null
          id?: string
          is_active?: boolean | null
          is_employee_self_service?: boolean | null
          is_verified?: boolean | null
          last_used_at?: string | null
          role?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_user_mappings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_user_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      feature_usage_summary: {
        Row: {
          feature_key: string | null
          last_used_at: string | null
          tenant_id: string | null
          unique_users: number | null
          usage_count: number | null
          usage_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_engagement_score: {
        Args: { p_start_date?: string; p_user_id: string }
        Returns: number
      }
      can_edit_branch_inventory: {
        Args: { _branch_id: string; _tenant_id: string }
        Returns: boolean
      }
      can_manage_accounts: { Args: { _tenant_id: string }; Returns: boolean }
      can_manage_hr: { Args: { _tenant_id: string }; Returns: boolean }
      can_manage_inventory: { Args: { _tenant_id: string }; Returns: boolean }
      can_manage_operations: { Args: { _tenant_id: string }; Returns: boolean }
      can_record_sales: { Args: { _tenant_id: string }; Returns: boolean }
      complete_stock_transfer: {
        Args: { p_transfer_id: string }
        Returns: undefined
      }
      decrement_variant_stock: {
        Args: {
          p_product_id: string
          p_quantity: number
          p_tenant_id: string
          p_variant_type: string
          p_variant_value: string
        }
        Returns: undefined
      }
      ensure_tenant_membership: { Args: never; Returns: string }
      get_daily_active_users: {
        Args: { p_days?: number }
        Returns: {
          active_users: number
          activity_date: string
        }[]
      }
      get_feature_usage_stats: {
        Args: { p_start_date?: string }
        Returns: {
          feature_key: string
          total_usage: number
          unique_tenants: number
          unique_users: number
        }[]
      }
      get_top_active_users: {
        Args: { p_limit?: number; p_start_date?: string }
        Returns: {
          email: string
          engagement_score: number
          full_name: string
          last_active_at: string
          tenant_id: string
          tenant_name: string
          total_actions: number
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_tenant_admin: { Args: { _tenant_id: string }; Returns: boolean }
      is_tenant_admin_or_manager: {
        Args: { _tenant_id: string }
        Returns: boolean
      }
      user_belongs_to_tenant: { Args: { _tenant_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "viewer"
        | "accountant"
        | "hr_manager"
        | "sales_rep"
        | "cashier"
        | "operations_manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "manager",
        "viewer",
        "accountant",
        "hr_manager",
        "sales_rep",
        "cashier",
        "operations_manager",
      ],
    },
  },
} as const
