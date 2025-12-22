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
          updated_at?: string
          vendor_name?: string
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
        }
        Insert: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          related_table?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          related_table?: string | null
        }
        Relationships: []
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
          updated_at?: string
        }
        Relationships: []
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
          transaction_type?: string
        }
        Relationships: [
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
        }
        Relationships: []
      }
      authorized_emails: {
        Row: {
          added_by: string | null
          created_at: string
          default_role: Database["public"]["Enums"]["app_role"]
          email: string
          id: string
          notes: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          default_role?: Database["public"]["Enums"]["app_role"]
          email: string
          id?: string
          notes?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string
          default_role?: Database["public"]["Enums"]["app_role"]
          email?: string
          id?: string
          notes?: string | null
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
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          updated_at?: string
          wash_forum_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_wash_forum_id_fkey"
            columns: ["wash_forum_id"]
            isOneToOne: false
            referencedRelation: "wash_forums"
            referencedColumns: ["id"]
          },
        ]
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
      donation_requests: {
        Row: {
          created_at: string
          donor_email: string
          donor_name: string
          donor_phone: string | null
          id: string
          message: string | null
          status: string
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
          updated_at?: string
          wash_forum_id?: string
        }
        Relationships: [
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
          clock_in: string
          clock_out: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          notes: string | null
          recorded_by: string | null
          status: string
          work_hours: number | null
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: string
          work_hours?: number | null
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: string
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
        ]
      }
      employee_documents: {
        Row: {
          document_type: string
          employee_id: string
          file_url: string
          id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          document_type: string
          employee_id: string
          file_url: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          document_type?: string
          employee_id?: string
          file_url?: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
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
          avatar_url: string | null
          bank_account_number: string | null
          bank_name: string | null
          base_salary_zmw: number
          created_at: string
          department: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_type: string
          employment_status: string
          full_name: string
          hire_date: string
          id: string
          job_title: string | null
          notes: string | null
          nrc_number: string | null
          phone: string | null
          termination_date: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          base_salary_zmw?: number
          created_at?: string
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_type?: string
          employment_status?: string
          full_name: string
          hire_date?: string
          id?: string
          job_title?: string | null
          notes?: string | null
          nrc_number?: string | null
          phone?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          base_salary_zmw?: number
          created_at?: string
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_type?: string
          employment_status?: string
          full_name?: string
          hire_date?: string
          id?: string
          job_title?: string | null
          notes?: string | null
          nrc_number?: string | null
          phone?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_zmw: number
          category: string
          created_at: string
          date_incurred: string
          id: string
          notes: string | null
          receipt_image_url: string | null
          recorded_by: string | null
          updated_at: string
          vendor_name: string
        }
        Insert: {
          amount_zmw?: number
          category: string
          created_at?: string
          date_incurred?: string
          id?: string
          notes?: string | null
          receipt_image_url?: string | null
          recorded_by?: string | null
          updated_at?: string
          vendor_name: string
        }
        Update: {
          amount_zmw?: number
          category?: string
          created_at?: string
          date_incurred?: string
          id?: string
          notes?: string | null
          receipt_image_url?: string | null
          recorded_by?: string | null
          updated_at?: string
          vendor_name?: string
        }
        Relationships: []
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
          total_expenses?: number
          total_revenue?: number
        }
        Relationships: []
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
          updated_at?: string
        }
        Relationships: []
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
        }
        Insert: {
          certificate_id: string
          client_name: string
          generated_at?: string
          generated_by: string
          id?: string
          liters_provided: number
          lives_impacted: number
        }
        Update: {
          certificate_id?: string
          client_name?: string
          generated_at?: string
          generated_by?: string
          id?: string
          liters_provided?: number
          lives_impacted?: number
        }
        Relationships: []
      }
      impact_metrics: {
        Row: {
          id: string
          metric_type: string
          period_end: string | null
          period_start: string | null
          updated_at: string
          value: number
        }
        Insert: {
          id?: string
          metric_type: string
          period_end?: string | null
          period_start?: string | null
          updated_at?: string
          value?: number
        }
        Update: {
          id?: string
          metric_type?: string
          period_end?: string | null
          period_start?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      inventory: {
        Row: {
          ai_prediction: string | null
          category: string | null
          certifications: string[] | null
          created_at: string
          current_stock: number
          datasheet_url: string | null
          description: string | null
          features: string[] | null
          highlight: string | null
          id: string
          image_url: string | null
          liters_per_unit: number
          manual_url: string | null
          name: string
          original_price: number | null
          reorder_level: number
          reserved: number
          sku: string
          status: string
          technical_specs: Json | null
          unit_price: number
          updated_at: string
          wholesale_stock: number
        }
        Insert: {
          ai_prediction?: string | null
          category?: string | null
          certifications?: string[] | null
          created_at?: string
          current_stock?: number
          datasheet_url?: string | null
          description?: string | null
          features?: string[] | null
          highlight?: string | null
          id?: string
          image_url?: string | null
          liters_per_unit?: number
          manual_url?: string | null
          name: string
          original_price?: number | null
          reorder_level?: number
          reserved?: number
          sku: string
          status?: string
          technical_specs?: Json | null
          unit_price?: number
          updated_at?: string
          wholesale_stock?: number
        }
        Update: {
          ai_prediction?: string | null
          category?: string | null
          certifications?: string[] | null
          created_at?: string
          current_stock?: number
          datasheet_url?: string | null
          description?: string | null
          features?: string[] | null
          highlight?: string | null
          id?: string
          image_url?: string | null
          liters_per_unit?: number
          manual_url?: string | null
          name?: string
          original_price?: number | null
          reorder_level?: number
          reserved?: number
          sku?: string
          status?: string
          technical_specs?: Json | null
          unit_price?: number
          updated_at?: string
          wholesale_stock?: number
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          discount_applied: number | null
          id: string
          invoice_id: string
          item_type: string
          original_amount: number | null
          quantity: number
          unit_price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          discount_applied?: number | null
          id?: string
          invoice_id: string
          item_type?: string
          original_amount?: number | null
          quantity?: number
          unit_price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          discount_applied?: number | null
          id?: string
          invoice_id?: string
          item_type?: string
          original_amount?: number | null
          quantity?: number
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
        ]
      }
      invoices: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string | null
          discount_amount: number | null
          discount_reason: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          source_quotation_id: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          source_quotation_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          discount_reason?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          source_quotation_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_source_quotation_id_fkey"
            columns: ["source_quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
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
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
          id: string
          loan_deduction: number
          napsa_deduction: number
          net_pay: number
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
          status: string
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
          id?: string
          loan_deduction?: number
          napsa_deduction?: number
          net_pay?: number
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
          status?: string
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
          id?: string
          loan_deduction?: number
          napsa_deduction?: number
          net_pay?: number
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
          status?: string
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
        ]
      }
      product_variants: {
        Row: {
          additional_price: number | null
          created_at: string
          hex_code: string | null
          id: string
          is_active: boolean
          product_id: string
          stock_adjustment: number | null
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
          stock_adjustment?: number | null
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
          stock_adjustment?: number | null
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
          quantity: number
          quotation_id: string
          unit_price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          quantity?: number
          quotation_id: string
          unit_price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          quotation_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
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
          id: string
          notes: string | null
          quotation_date: string
          quotation_number: string
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
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
          id?: string
          notes?: string | null
          quotation_date?: string
          quotation_number: string
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
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
          id?: string
          notes?: string | null
          quotation_date?: string
          quotation_number?: string
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
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
        ]
      }
      sales_transactions: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
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
          total_amount_zmw: number
          transaction_type: string
          unit_price_zmw: number
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
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
          total_amount_zmw: number
          transaction_type?: string
          unit_price_zmw: number
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
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
        ]
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
          transaction_id?: string
        }
        Relationships: []
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
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
          updated_at?: string
        }
        Relationships: []
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
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "viewer"
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
      app_role: ["admin", "manager", "viewer"],
    },
  },
} as const
