CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'manager',
    'viewer'
);


--
-- Name: audit_table_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_table_delete() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_by
  ) VALUES (
    TG_TABLE_NAME,
    OLD.id,
    'DELETE',
    to_jsonb(OLD),
    NULL,
    auth.uid()
  );
  RETURN OLD;
END;
$$;


--
-- Name: audit_table_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_table_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_by
  ) VALUES (
    TG_TABLE_NAME,
    NEW.id,
    'INSERT',
    NULL,
    to_jsonb(NEW),
    auth.uid()
  );
  RETURN NEW;
END;
$$;


--
-- Name: audit_table_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_table_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_by
  ) VALUES (
    TG_TABLE_NAME,
    NEW.id,
    'UPDATE',
    to_jsonb(OLD),
    to_jsonb(NEW),
    auth.uid()
  );
  RETURN NEW;
END;
$$;


--
-- Name: check_inventory_stock_level(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_inventory_stock_level() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only proceed if current_stock actually changed
  IF NEW.current_stock IS DISTINCT FROM OLD.current_stock THEN
    -- Check if new stock level is below reorder level
    IF NEW.current_stock < NEW.reorder_level THEN
      -- Insert a low stock alert
      INSERT INTO public.admin_alerts (
        alert_type,
        message,
        related_table,
        related_id
      ) VALUES (
        'low_stock',
        'Low Stock Warning: ' || NEW.name || ' (SKU: ' || NEW.sku || ') is down to ' || NEW.current_stock || ' units. Reorder level is ' || NEW.reorder_level || '. Time to reorder.',
        'inventory',
        NEW.id
      );
      
      -- Also update the inventory status to reflect low stock
      NEW.status := CASE 
        WHEN NEW.current_stock <= 0 THEN 'critical'
        WHEN NEW.current_stock < NEW.reorder_level THEN 'warning'
        ELSE 'healthy'
      END;
    ELSE
      -- Reset status to healthy if stock is above reorder level
      NEW.status := 'healthy';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_invoice_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_invoice_number() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  year_prefix text;
  next_number integer;
BEGIN
  year_prefix := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS integer)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number LIKE year_prefix || '-%';
  
  NEW.invoice_number := year_prefix || '-' || LPAD(next_number::text, 4, '0');
  RETURN NEW;
END;
$$;


--
-- Name: generate_quotation_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_quotation_number() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  year_prefix text;
  next_number integer;
BEGIN
  year_prefix := 'Q' || to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 6) AS integer)), 0) + 1
  INTO next_number
  FROM public.quotations
  WHERE quotation_number LIKE year_prefix || '-%';
  
  NEW.quotation_number := year_prefix || '-' || LPAD(next_number::text, 4, '0');
  RETURN NEW;
END;
$$;


--
-- Name: generate_receipt_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_receipt_number() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  year_prefix text;
  next_number integer;
BEGIN
  year_prefix := 'R' || to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 6) AS integer)), 0) + 1
  INTO next_number
  FROM public.payment_receipts
  WHERE receipt_number LIKE year_prefix || '-%';
  
  NEW.receipt_number := year_prefix || '-' || LPAD(next_number::text, 4, '0');
  RETURN NEW;
END;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'manager' THEN 2 
      WHEN 'viewer' THEN 3 
    END
  LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_email TEXT;
  assigned_role app_role;
BEGIN
  -- Get the user's email
  user_email := NEW.email;
  
  -- Check if this email has a predefined role in authorized_emails
  SELECT default_role INTO assigned_role
  FROM public.authorized_emails
  WHERE LOWER(email) = LOWER(user_email)
  LIMIT 1;
  
  -- Default to viewer if not found
  IF assigned_role IS NULL THEN
    assigned_role := 'viewer';
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Insert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: log_transaction_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_transaction_delete() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.transaction_audit_log (
    transaction_id,
    action,
    old_data,
    new_data,
    changed_by
  ) VALUES (
    OLD.id,
    'DELETE',
    to_jsonb(OLD),
    NULL,
    auth.uid()
  );
  RETURN OLD;
END;
$$;


--
-- Name: log_transaction_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_transaction_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.transaction_audit_log (
    transaction_id,
    action,
    old_data,
    new_data,
    changed_by
  ) VALUES (
    NEW.id,
    'UPDATE',
    to_jsonb(OLD),
    to_jsonb(NEW),
    auth.uid()
  );
  RETURN NEW;
END;
$$;


--
-- Name: revert_company_statistics_on_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.revert_company_statistics_on_delete() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  calculated_children INTEGER;
BEGIN
  calculated_children := FLOOR(OLD.liters_impact / 365);
  
  -- Decrement the master company statistics
  UPDATE public.company_statistics
  SET 
    total_revenue_zmw = GREATEST(0, total_revenue_zmw - OLD.total_amount_zmw),
    total_liters_donated = GREATEST(0, total_liters_donated - OLD.liters_impact),
    total_sales_count = GREATEST(0, total_sales_count - 1),
    total_children_impacted = GREATEST(0, total_children_impacted - calculated_children),
    updated_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  RETURN OLD;
END;
$$;


--
-- Name: update_company_statistics_on_sale(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_company_statistics_on_sale() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  calculated_liters INTEGER;
  calculated_children INTEGER;
BEGIN
  -- Calculate impact: Amount / 20 = Liters Donated (configurable formula)
  -- Each liter serves ~1 person for a day, 365 liters = 1 child for a year
  calculated_liters := FLOOR(NEW.total_amount_zmw / 20);
  calculated_children := FLOOR(calculated_liters / 365);
  
  -- Store the calculated liters in the transaction row
  NEW.liters_impact := calculated_liters;
  
  -- Update the master company statistics
  UPDATE public.company_statistics
  SET 
    total_revenue_zmw = total_revenue_zmw + NEW.total_amount_zmw,
    total_liters_donated = total_liters_donated + calculated_liters,
    total_sales_count = total_sales_count + 1,
    total_children_impacted = total_children_impacted + calculated_children,
    updated_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: accounts_payable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_payable (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_name text NOT NULL,
    description text,
    amount_zmw numeric DEFAULT 0 NOT NULL,
    due_date date,
    status text DEFAULT 'pending'::text NOT NULL,
    invoice_reference text,
    recorded_by uuid,
    paid_date date,
    paid_amount numeric DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type text DEFAULT 'low_stock'::text NOT NULL,
    message text NOT NULL,
    related_table text,
    related_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_name text NOT NULL,
    province text NOT NULL,
    contact_person text NOT NULL,
    phone_number text NOT NULL,
    business_type text NOT NULL,
    motivation text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    latitude numeric,
    longitude numeric,
    address text
);


--
-- Name: agent_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    product_type text NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    total_value numeric GENERATED ALWAYS AS (((quantity)::numeric * unit_price)) STORED,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    product_id uuid
);


--
-- Name: agent_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    transaction_type text DEFAULT 'invoice'::text NOT NULL,
    invoice_id uuid,
    products_json jsonb,
    amount_zmw numeric DEFAULT 0 NOT NULL,
    notes text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: authorized_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authorized_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    added_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    default_role public.app_role DEFAULT 'viewer'::public.app_role NOT NULL
);


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    content text NOT NULL,
    excerpt text,
    featured_image_url text,
    status text DEFAULT 'draft'::text NOT NULL,
    author_id uuid,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: community_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wash_forum_id uuid NOT NULL,
    donor_name text NOT NULL,
    donor_email text NOT NULL,
    donor_phone text,
    message text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: company_statistics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_statistics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    total_revenue_zmw numeric DEFAULT 0 NOT NULL,
    total_liters_donated bigint DEFAULT 0 NOT NULL,
    total_sales_count integer DEFAULT 0 NOT NULL,
    total_children_impacted bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: donation_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donation_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wash_forum_id uuid NOT NULL,
    donor_name text NOT NULL,
    donor_email text NOT NULL,
    donor_phone text,
    message text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: employee_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    clock_in timestamp with time zone DEFAULT now() NOT NULL,
    clock_out timestamp with time zone,
    work_hours numeric DEFAULT 0,
    date date DEFAULT CURRENT_DATE NOT NULL,
    notes text,
    status text DEFAULT 'clocked_in'::text NOT NULL,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: employee_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    document_type text NOT NULL,
    file_url text NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    uploaded_by uuid
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    employee_type text DEFAULT 'office_staff'::text NOT NULL,
    department text,
    job_title text,
    employment_status text DEFAULT 'active'::text NOT NULL,
    hire_date date DEFAULT CURRENT_DATE NOT NULL,
    termination_date date,
    base_salary_zmw numeric DEFAULT 0 NOT NULL,
    phone text,
    email text,
    address text,
    nrc_number text,
    bank_name text,
    bank_account_number text,
    emergency_contact_name text,
    emergency_contact_phone text,
    avatar_url text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date_incurred date DEFAULT CURRENT_DATE NOT NULL,
    category text NOT NULL,
    amount_zmw numeric DEFAULT 0 NOT NULL,
    vendor_name text NOT NULL,
    notes text,
    receipt_image_url text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expenses_category_check CHECK ((category = ANY (ARRAY['Cost of Goods Sold - Vestergaard'::text, 'Salaries'::text, 'Marketing'::text, 'Operations/Rent'::text, 'Other'::text])))
);


--
-- Name: financial_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_type text DEFAULT 'summary'::text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    total_revenue numeric DEFAULT 0 NOT NULL,
    total_expenses numeric DEFAULT 0 NOT NULL,
    net_profit numeric DEFAULT 0 NOT NULL,
    ai_summary text,
    ai_insights jsonb,
    generated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hero_announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hero_announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tagline text NOT NULL,
    headline text NOT NULL,
    headline_accent text NOT NULL,
    stat_1_value text,
    stat_1_label text,
    stat_2_value text,
    stat_2_label text,
    stat_3_value text,
    stat_3_label text,
    button_text text DEFAULT 'Learn More'::text,
    button_link text DEFAULT '/technology'::text,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: impact_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.impact_certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    certificate_id text NOT NULL,
    client_name text NOT NULL,
    liters_provided bigint NOT NULL,
    lives_impacted integer NOT NULL,
    generated_by uuid NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: impact_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.impact_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_type text NOT NULL,
    value bigint DEFAULT 0 NOT NULL,
    period_start date,
    period_end date,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT impact_metrics_metric_type_check CHECK ((metric_type = ANY (ARRAY['liters_filtered'::text, 'children_served'::text, 'schools_equipped'::text])))
);


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    current_stock integer DEFAULT 0 NOT NULL,
    reserved integer DEFAULT 0 NOT NULL,
    ai_prediction text,
    status text DEFAULT 'healthy'::text NOT NULL,
    unit_price numeric(10,2) DEFAULT 0 NOT NULL,
    liters_per_unit integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reorder_level integer DEFAULT 10 NOT NULL,
    image_url text,
    original_price numeric DEFAULT 0,
    description text,
    highlight text,
    features text[] DEFAULT '{}'::text[],
    category text DEFAULT 'personal'::text,
    certifications text[] DEFAULT '{}'::text[],
    datasheet_url text,
    manual_url text,
    wholesale_stock integer DEFAULT 0 NOT NULL,
    technical_specs jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT inventory_category_check CHECK ((category = ANY (ARRAY['personal'::text, 'community'::text]))),
    CONSTRAINT inventory_status_check CHECK ((status = ANY (ARRAY['healthy'::text, 'warning'::text, 'critical'::text])))
);


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    description text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    item_type text DEFAULT 'product'::text NOT NULL,
    original_amount numeric DEFAULT 0,
    discount_applied numeric DEFAULT 0
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text NOT NULL,
    client_name text NOT NULL,
    client_email text,
    client_phone text,
    invoice_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date,
    status text DEFAULT 'draft'::text NOT NULL,
    subtotal numeric DEFAULT 0 NOT NULL,
    tax_rate numeric DEFAULT 0,
    tax_amount numeric DEFAULT 0,
    total_amount numeric DEFAULT 0 NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    discount_amount numeric DEFAULT 0,
    discount_reason text,
    source_quotation_id uuid
);


--
-- Name: payment_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    receipt_number text NOT NULL,
    invoice_id uuid,
    client_name text NOT NULL,
    client_email text,
    amount_paid numeric NOT NULL,
    payment_method text DEFAULT 'cash'::text,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    notes text,
    ai_thank_you_message text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payroll_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid,
    profile_user_id uuid,
    employee_type text DEFAULT 'employee'::text NOT NULL,
    pay_period_start date NOT NULL,
    pay_period_end date NOT NULL,
    basic_salary numeric DEFAULT 0 NOT NULL,
    allowances numeric DEFAULT 0 NOT NULL,
    overtime_pay numeric DEFAULT 0 NOT NULL,
    bonus numeric DEFAULT 0 NOT NULL,
    napsa_deduction numeric DEFAULT 0 NOT NULL,
    paye_deduction numeric DEFAULT 0 NOT NULL,
    other_deductions numeric DEFAULT 0 NOT NULL,
    loan_deduction numeric DEFAULT 0 NOT NULL,
    gross_pay numeric DEFAULT 0 NOT NULL,
    total_deductions numeric DEFAULT 0 NOT NULL,
    net_pay numeric DEFAULT 0 NOT NULL,
    payment_method text DEFAULT 'bank_transfer'::text,
    payment_reference text,
    status text DEFAULT 'draft'::text NOT NULL,
    paid_date date,
    approved_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    variant_type text NOT NULL,
    variant_value text NOT NULL,
    variant_display text,
    hex_code text,
    additional_price numeric DEFAULT 0,
    stock_adjustment integer DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_variants_variant_type_check CHECK ((variant_type = ANY (ARRAY['color'::text, 'size'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    avatar_url text,
    department text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    last_login timestamp with time zone
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quotation_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotation_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quotation_id uuid NOT NULL,
    description text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quotations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quotation_number text NOT NULL,
    client_name text NOT NULL,
    client_email text,
    client_phone text,
    quotation_date date DEFAULT CURRENT_DATE NOT NULL,
    valid_until date,
    subtotal numeric DEFAULT 0 NOT NULL,
    tax_rate numeric DEFAULT 0,
    tax_amount numeric DEFAULT 0,
    total_amount numeric DEFAULT 0 NOT NULL,
    notes text,
    status text DEFAULT 'draft'::text NOT NULL,
    converted_to_invoice_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sales_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_type text DEFAULT 'manual'::text NOT NULL,
    customer_name text,
    customer_email text,
    customer_phone text,
    product_id uuid,
    product_name text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price_zmw numeric NOT NULL,
    total_amount_zmw numeric NOT NULL,
    liters_impact integer DEFAULT 0 NOT NULL,
    payment_method text DEFAULT 'cash'::text,
    notes text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    selected_color text,
    selected_size text,
    item_type text DEFAULT 'product'::text NOT NULL,
    receipt_number text
);


--
-- Name: transaction_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transaction_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid NOT NULL,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bank_type text NOT NULL,
    bank_amount numeric(12,2) NOT NULL,
    bank_currency text DEFAULT 'ZMW'::text NOT NULL,
    bank_reference text NOT NULL,
    bank_date date NOT NULL,
    bank_sender text NOT NULL,
    ai_invoice text,
    ai_client text,
    ai_amount numeric(12,2),
    ai_confidence integer,
    ai_description text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'flagged'::text])))
);


--
-- Name: user_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    activity_type text DEFAULT 'login'::text NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'viewer'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wash_forums; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wash_forums (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    province text NOT NULL,
    community_size integer DEFAULT 0 NOT NULL,
    description text NOT NULL,
    products_needed text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'seeking_donation'::text NOT NULL,
    contact_person text,
    contact_phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: website_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.website_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    sender_phone text,
    message text NOT NULL,
    source_page text DEFAULT 'contact'::text,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: accounts_payable accounts_payable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_pkey PRIMARY KEY (id);


--
-- Name: admin_alerts admin_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_alerts
    ADD CONSTRAINT admin_alerts_pkey PRIMARY KEY (id);


--
-- Name: agent_applications agent_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_pkey PRIMARY KEY (id);


--
-- Name: agent_inventory agent_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_inventory
    ADD CONSTRAINT agent_inventory_pkey PRIMARY KEY (id);


--
-- Name: agent_transactions agent_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_transactions
    ADD CONSTRAINT agent_transactions_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: authorized_emails authorized_emails_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorized_emails
    ADD CONSTRAINT authorized_emails_email_key UNIQUE (email);


--
-- Name: authorized_emails authorized_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorized_emails
    ADD CONSTRAINT authorized_emails_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: community_messages community_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_messages
    ADD CONSTRAINT community_messages_pkey PRIMARY KEY (id);


--
-- Name: company_statistics company_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_statistics
    ADD CONSTRAINT company_statistics_pkey PRIMARY KEY (id);


--
-- Name: donation_requests donation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_requests
    ADD CONSTRAINT donation_requests_pkey PRIMARY KEY (id);


--
-- Name: employee_attendance employee_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance
    ADD CONSTRAINT employee_attendance_pkey PRIMARY KEY (id);


--
-- Name: employee_documents employee_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT employee_documents_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: financial_reports financial_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_reports
    ADD CONSTRAINT financial_reports_pkey PRIMARY KEY (id);


--
-- Name: hero_announcements hero_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hero_announcements
    ADD CONSTRAINT hero_announcements_pkey PRIMARY KEY (id);


--
-- Name: impact_certificates impact_certificates_certificate_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_certificates
    ADD CONSTRAINT impact_certificates_certificate_id_key UNIQUE (certificate_id);


--
-- Name: impact_certificates impact_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_certificates
    ADD CONSTRAINT impact_certificates_pkey PRIMARY KEY (id);


--
-- Name: impact_metrics impact_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_metrics
    ADD CONSTRAINT impact_metrics_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_sku_key UNIQUE (sku);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: payment_receipts payment_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_pkey PRIMARY KEY (id);


--
-- Name: payroll_records payroll_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_user_id_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);


--
-- Name: quotation_items quotation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_items
    ADD CONSTRAINT quotation_items_pkey PRIMARY KEY (id);


--
-- Name: quotations quotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_pkey PRIMARY KEY (id);


--
-- Name: sales_transactions sales_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_transactions
    ADD CONSTRAINT sales_transactions_pkey PRIMARY KEY (id);


--
-- Name: transaction_audit_log transaction_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_audit_log
    ADD CONSTRAINT transaction_audit_log_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_activity user_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity
    ADD CONSTRAINT user_activity_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: wash_forums wash_forums_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wash_forums
    ADD CONSTRAINT wash_forums_pkey PRIMARY KEY (id);


--
-- Name: website_contacts website_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_contacts
    ADD CONSTRAINT website_contacts_pkey PRIMARY KEY (id);


--
-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_date ON public.employee_attendance USING btree (date);


--
-- Name: idx_attendance_employee_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_employee_date ON public.employee_attendance USING btree (employee_id, date);


--
-- Name: idx_product_variants_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id);


--
-- Name: idx_product_variants_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_type ON public.product_variants USING btree (variant_type);


--
-- Name: idx_sales_transactions_receipt_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_transactions_receipt_number ON public.sales_transactions USING btree (receipt_number);


--
-- Name: idx_user_activity_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_activity_created_at ON public.user_activity USING btree (created_at DESC);


--
-- Name: idx_user_activity_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_activity_user_id ON public.user_activity USING btree (user_id);


--
-- Name: expenses expenses_delete_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER expenses_delete_audit BEFORE DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.audit_table_delete();


--
-- Name: expenses expenses_insert_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER expenses_insert_audit AFTER INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.audit_table_insert();


--
-- Name: expenses expenses_update_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER expenses_update_audit AFTER UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.audit_table_update();


--
-- Name: invoices generate_invoice_number_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_invoice_number_trigger BEFORE INSERT ON public.invoices FOR EACH ROW WHEN (((new.invoice_number IS NULL) OR (new.invoice_number = ''::text))) EXECUTE FUNCTION public.generate_invoice_number();


--
-- Name: inventory inventory_stock_level_check; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inventory_stock_level_check BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.check_inventory_stock_level();


--
-- Name: invoices invoices_delete_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoices_delete_audit BEFORE DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.audit_table_delete();


--
-- Name: invoices invoices_insert_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoices_insert_audit AFTER INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.audit_table_insert();


--
-- Name: invoices invoices_update_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoices_update_audit AFTER UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.audit_table_update();


--
-- Name: payment_receipts receipts_delete_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER receipts_delete_audit BEFORE DELETE ON public.payment_receipts FOR EACH ROW EXECUTE FUNCTION public.audit_table_delete();


--
-- Name: payment_receipts receipts_insert_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER receipts_insert_audit AFTER INSERT ON public.payment_receipts FOR EACH ROW EXECUTE FUNCTION public.audit_table_insert();


--
-- Name: sales_transactions sales_delete_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sales_delete_audit BEFORE DELETE ON public.sales_transactions FOR EACH ROW EXECUTE FUNCTION public.audit_table_delete();


--
-- Name: sales_transactions sales_insert_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sales_insert_audit AFTER INSERT ON public.sales_transactions FOR EACH ROW EXECUTE FUNCTION public.audit_table_insert();


--
-- Name: sales_transactions sales_transaction_stats_revert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sales_transaction_stats_revert AFTER DELETE ON public.sales_transactions FOR EACH ROW EXECUTE FUNCTION public.revert_company_statistics_on_delete();


--
-- Name: sales_transactions sales_transaction_stats_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sales_transaction_stats_update BEFORE INSERT ON public.sales_transactions FOR EACH ROW EXECUTE FUNCTION public.update_company_statistics_on_sale();


--
-- Name: sales_transactions sales_update_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sales_update_audit AFTER UPDATE ON public.sales_transactions FOR EACH ROW EXECUTE FUNCTION public.audit_table_update();


--
-- Name: quotations set_quotation_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_quotation_number BEFORE INSERT ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.generate_quotation_number();


--
-- Name: payment_receipts set_receipt_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_receipt_number BEFORE INSERT ON public.payment_receipts FOR EACH ROW EXECUTE FUNCTION public.generate_receipt_number();


--
-- Name: transactions transaction_delete_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER transaction_delete_audit BEFORE DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.log_transaction_delete();


--
-- Name: transactions transaction_update_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER transaction_update_audit AFTER UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.log_transaction_update();


--
-- Name: accounts_payable update_accounts_payable_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_accounts_payable_updated_at BEFORE UPDATE ON public.accounts_payable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_applications update_agent_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_applications_updated_at BEFORE UPDATE ON public.agent_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_inventory update_agent_inventory_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_inventory_updated_at BEFORE UPDATE ON public.agent_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_posts update_blog_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: community_messages update_community_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_community_messages_updated_at BEFORE UPDATE ON public.community_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: donation_requests update_donation_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_donation_requests_updated_at BEFORE UPDATE ON public.donation_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employees update_employees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expenses update_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hero_announcements update_hero_announcements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_hero_announcements_updated_at BEFORE UPDATE ON public.hero_announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: impact_metrics update_impact_metrics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_impact_metrics_updated_at BEFORE UPDATE ON public.impact_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory update_inventory_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_variants update_product_variants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quotations update_quotations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wash_forums update_wash_forums_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_wash_forums_updated_at BEFORE UPDATE ON public.wash_forums FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: website_contacts update_website_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_website_contacts_updated_at BEFORE UPDATE ON public.website_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accounts_payable accounts_payable_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id);


--
-- Name: agent_applications agent_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_applications
    ADD CONSTRAINT agent_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: agent_inventory agent_inventory_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_inventory
    ADD CONSTRAINT agent_inventory_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agent_applications(id) ON DELETE CASCADE;


--
-- Name: agent_inventory agent_inventory_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_inventory
    ADD CONSTRAINT agent_inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.inventory(id);


--
-- Name: authorized_emails authorized_emails_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorized_emails
    ADD CONSTRAINT authorized_emails_added_by_fkey FOREIGN KEY (added_by) REFERENCES auth.users(id);


--
-- Name: blog_posts blog_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id);


--
-- Name: community_messages community_messages_wash_forum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_messages
    ADD CONSTRAINT community_messages_wash_forum_id_fkey FOREIGN KEY (wash_forum_id) REFERENCES public.wash_forums(id) ON DELETE CASCADE;


--
-- Name: donation_requests donation_requests_wash_forum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_requests
    ADD CONSTRAINT donation_requests_wash_forum_id_fkey FOREIGN KEY (wash_forum_id) REFERENCES public.wash_forums(id) ON DELETE CASCADE;


--
-- Name: employee_attendance employee_attendance_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_attendance
    ADD CONSTRAINT employee_attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id);


--
-- Name: agent_transactions fk_agent_transaction_agent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_transactions
    ADD CONSTRAINT fk_agent_transaction_agent FOREIGN KEY (agent_id) REFERENCES public.agent_applications(id) ON DELETE CASCADE;


--
-- Name: agent_transactions fk_agent_transaction_invoice; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_transactions
    ADD CONSTRAINT fk_agent_transaction_invoice FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: employee_documents fk_employee_document_employee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT fk_employee_document_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: payroll_records fk_payroll_employee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT fk_payroll_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: impact_certificates impact_certificates_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_certificates
    ADD CONSTRAINT impact_certificates_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES auth.users(id);


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_source_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_source_quotation_id_fkey FOREIGN KEY (source_quotation_id) REFERENCES public.quotations(id);


--
-- Name: payment_receipts payment_receipts_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_receipts
    ADD CONSTRAINT payment_receipts_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.inventory(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quotation_items quotation_items_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_items
    ADD CONSTRAINT quotation_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE CASCADE;


--
-- Name: quotations quotations_converted_to_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_converted_to_invoice_id_fkey FOREIGN KEY (converted_to_invoice_id) REFERENCES public.invoices(id);


--
-- Name: sales_transactions sales_transactions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_transactions
    ADD CONSTRAINT sales_transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.inventory(id);


--
-- Name: transactions transactions_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions Admin can view all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all subscriptions" ON public.push_subscriptions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: accounts_payable Admins can delete accounts payable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete accounts payable" ON public.accounts_payable FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_inventory Admins can delete agent inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete agent inventory" ON public.agent_inventory FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_transactions Admins can delete agent transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete agent transactions" ON public.agent_transactions FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_alerts Admins can delete alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete alerts" ON public.admin_alerts FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: hero_announcements Admins can delete announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete announcements" ON public.hero_announcements FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_applications Admins can delete applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete applications" ON public.agent_applications FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_attendance Admins can delete attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete attendance" ON public.employee_attendance FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: authorized_emails Admins can delete authorized emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete authorized emails" ON public.authorized_emails FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: community_messages Admins can delete community messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete community messages" ON public.community_messages FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: website_contacts Admins can delete contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete contacts" ON public.website_contacts FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: donation_requests Admins can delete donation requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete donation requests" ON public.donation_requests FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_documents Admins can delete employee documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete employee documents" ON public.employee_documents FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employees Admins can delete employees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete employees" ON public.employees FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: expenses Admins can delete expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete expenses" ON public.expenses FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: wash_forums Admins can delete forums; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete forums" ON public.wash_forums FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: inventory Admins can delete inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete inventory" ON public.inventory FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: invoice_items Admins can delete invoice items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete invoice items" ON public.invoice_items FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: invoices Admins can delete invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete invoices" ON public.invoices FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payroll_records Admins can delete payroll; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete payroll" ON public.payroll_records FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: blog_posts Admins can delete posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete posts" ON public.blog_posts FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quotation_items Admins can delete quotation items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete quotation items" ON public.quotation_items FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quotations Admins can delete quotations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete quotations" ON public.quotations FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payment_receipts Admins can delete receipts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete receipts" ON public.payment_receipts FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: financial_reports Admins can delete reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete reports" ON public.financial_reports FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sales_transactions Admins can delete sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete sales" ON public.sales_transactions FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: transactions Admins can delete transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete transactions" ON public.transactions FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_variants Admins can delete variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete variants" ON public.product_variants FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: authorized_emails Admins can insert authorized emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert authorized emails" ON public.authorized_emails FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: accounts_payable Admins can update accounts payable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update accounts payable" ON public.accounts_payable FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_inventory Admins can update agent inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update agent inventory" ON public.agent_inventory FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_transactions Admins can update agent transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update agent transactions" ON public.agent_transactions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_alerts Admins can update alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update alerts" ON public.admin_alerts FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: hero_announcements Admins can update announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update announcements" ON public.hero_announcements FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_applications Admins can update applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update applications" ON public.agent_applications FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_attendance Admins can update attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update attendance" ON public.employee_attendance FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: authorized_emails Admins can update authorized emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update authorized emails" ON public.authorized_emails FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: community_messages Admins can update community messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update community messages" ON public.community_messages FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: donation_requests Admins can update donation requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update donation requests" ON public.donation_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employees Admins can update employees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update employees" ON public.employees FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: expenses Admins can update expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update expenses" ON public.expenses FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: inventory Admins can update inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update inventory" ON public.inventory FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: invoice_items Admins can update invoice items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update invoice items" ON public.invoice_items FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: invoices Admins can update invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update invoices" ON public.invoices FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payroll_records Admins can update payroll; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update payroll" ON public.payroll_records FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: blog_posts Admins can update posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update posts" ON public.blog_posts FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quotation_items Admins can update quotation items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update quotation items" ON public.quotation_items FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quotations Admins can update quotations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update quotations" ON public.quotations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sales_transactions Admins can update sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update sales" ON public.sales_transactions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_variants Admins can update variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update variants" ON public.product_variants FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: wash_forums Admins can update wash forums; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update wash forums" ON public.wash_forums FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: website_contacts Admins can update website contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update website contacts" ON public.website_contacts FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_activity Admins can view all activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all activity" ON public.user_activity FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: wash_forums Admins can view all forums; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all forums" ON public.wash_forums FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_log Admins can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view audit logs" ON public.audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: transaction_audit_log Admins can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view audit logs" ON public.transaction_audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: authorized_emails Admins can view authorized emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view authorized emails" ON public.authorized_emails FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: authorized_emails Anyone can check their email authorization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can check their email authorization" ON public.authorized_emails FOR SELECT TO authenticated, anon USING (true);


--
-- Name: agent_applications Anyone can submit applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit applications" ON public.agent_applications FOR INSERT WITH CHECK (true);


--
-- Name: community_messages Anyone can submit community messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit community messages" ON public.community_messages FOR INSERT WITH CHECK (true);


--
-- Name: website_contacts Anyone can submit contact forms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit contact forms" ON public.website_contacts FOR INSERT WITH CHECK (true);


--
-- Name: donation_requests Anyone can submit donation requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit donation requests" ON public.donation_requests FOR INSERT WITH CHECK (true);


--
-- Name: hero_announcements Anyone can view active announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active announcements" ON public.hero_announcements FOR SELECT USING ((is_active = true));


--
-- Name: wash_forums Anyone can view active forums; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active forums" ON public.wash_forums FOR SELECT USING ((status = ANY (ARRAY['seeking_donation'::text, 'partially_funded'::text])));


--
-- Name: product_variants Anyone can view active variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active variants" ON public.product_variants FOR SELECT USING ((is_active = true));


--
-- Name: company_statistics Anyone can view company statistics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view company statistics" ON public.company_statistics FOR SELECT USING (true);


--
-- Name: blog_posts Anyone can view published posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published posts" ON public.blog_posts FOR SELECT USING ((status = 'published'::text));


--
-- Name: impact_certificates Authenticated users can create certificates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create certificates" ON public.impact_certificates FOR INSERT TO authenticated WITH CHECK ((auth.uid() = generated_by));


--
-- Name: inventory Authenticated users can insert inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert inventory" ON public.inventory FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: accounts_payable Authenticated users can view accounts payable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view accounts payable" ON public.accounts_payable FOR SELECT USING (true);


--
-- Name: agent_inventory Authenticated users can view agent inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view agent inventory" ON public.agent_inventory FOR SELECT USING (true);


--
-- Name: agent_transactions Authenticated users can view agent transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view agent transactions" ON public.agent_transactions FOR SELECT USING (true);


--
-- Name: employee_attendance Authenticated users can view attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view attendance" ON public.employee_attendance FOR SELECT USING (true);


--
-- Name: impact_certificates Authenticated users can view certificates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view certificates" ON public.impact_certificates FOR SELECT TO authenticated USING (true);


--
-- Name: employee_documents Authenticated users can view employee documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view employee documents" ON public.employee_documents FOR SELECT USING (true);


--
-- Name: employees Authenticated users can view employees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view employees" ON public.employees FOR SELECT USING (true);


--
-- Name: expenses Authenticated users can view expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view expenses" ON public.expenses FOR SELECT USING (true);


--
-- Name: impact_metrics Authenticated users can view impact metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view impact metrics" ON public.impact_metrics FOR SELECT TO authenticated USING (true);


--
-- Name: inventory Authenticated users can view inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view inventory" ON public.inventory FOR SELECT TO authenticated USING (true);


--
-- Name: invoice_items Authenticated users can view invoice items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view invoice items" ON public.invoice_items FOR SELECT USING (true);


--
-- Name: invoices Authenticated users can view invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view invoices" ON public.invoices FOR SELECT USING (true);


--
-- Name: payroll_records Authenticated users can view payroll; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view payroll" ON public.payroll_records FOR SELECT USING (true);


--
-- Name: quotation_items Authenticated users can view quotation items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view quotation items" ON public.quotation_items FOR SELECT USING (true);


--
-- Name: quotations Authenticated users can view quotations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view quotations" ON public.quotations FOR SELECT USING (true);


--
-- Name: payment_receipts Authenticated users can view receipts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view receipts" ON public.payment_receipts FOR SELECT USING (true);


--
-- Name: financial_reports Authenticated users can view reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view reports" ON public.financial_reports FOR SELECT USING (true);


--
-- Name: sales_transactions Authenticated users can view sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view sales" ON public.sales_transactions FOR SELECT USING (true);


--
-- Name: transactions Authenticated users can view transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view transactions" ON public.transactions FOR SELECT TO authenticated USING (true);


--
-- Name: accounts_payable Managers and admins can insert accounts payable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert accounts payable" ON public.accounts_payable FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: agent_inventory Managers and admins can insert agent inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert agent inventory" ON public.agent_inventory FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: agent_transactions Managers and admins can insert agent transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert agent transactions" ON public.agent_transactions FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: hero_announcements Managers and admins can insert announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert announcements" ON public.hero_announcements FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: employee_attendance Managers and admins can insert attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert attendance" ON public.employee_attendance FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: employee_documents Managers and admins can insert employee documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert employee documents" ON public.employee_documents FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: employees Managers and admins can insert employees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert employees" ON public.employees FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: expenses Managers and admins can insert expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert expenses" ON public.expenses FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: wash_forums Managers and admins can insert forums; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert forums" ON public.wash_forums FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: inventory Managers and admins can insert inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert inventory" ON public.inventory FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: invoice_items Managers and admins can insert invoice items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert invoice items" ON public.invoice_items FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: invoices Managers and admins can insert invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert invoices" ON public.invoices FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: payroll_records Managers and admins can insert payroll; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert payroll" ON public.payroll_records FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: blog_posts Managers and admins can insert posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert posts" ON public.blog_posts FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: quotation_items Managers and admins can insert quotation items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert quotation items" ON public.quotation_items FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: quotations Managers and admins can insert quotations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert quotations" ON public.quotations FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: payment_receipts Managers and admins can insert receipts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert receipts" ON public.payment_receipts FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: financial_reports Managers and admins can insert reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert reports" ON public.financial_reports FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: sales_transactions Managers and admins can insert sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert sales" ON public.sales_transactions FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: transactions Managers and admins can insert transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: product_variants Managers and admins can insert variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can insert variants" ON public.product_variants FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: impact_metrics Managers and admins can manage impact metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can manage impact metrics" ON public.impact_metrics TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: website_contacts Managers and admins can update contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can update contacts" ON public.website_contacts FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: wash_forums Managers and admins can update forums; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can update forums" ON public.wash_forums FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: transactions Managers and admins can update transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can update transactions" ON public.transactions FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: admin_alerts Managers and admins can view alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can view alerts" ON public.admin_alerts FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: hero_announcements Managers and admins can view all announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can view all announcements" ON public.hero_announcements FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: blog_posts Managers and admins can view all posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can view all posts" ON public.blog_posts FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: product_variants Managers and admins can view all variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can view all variants" ON public.product_variants FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: agent_applications Managers and admins can view applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can view applications" ON public.agent_applications FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: community_messages Managers and admins can view community messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can view community messages" ON public.community_messages FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: website_contacts Managers and admins can view contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can view contacts" ON public.website_contacts FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: donation_requests Managers and admins can view donation requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can view donation requests" ON public.donation_requests FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: admin_alerts System can insert alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert alerts" ON public.admin_alerts FOR INSERT WITH CHECK (true);


--
-- Name: audit_log System can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert audit logs" ON public.audit_log FOR INSERT WITH CHECK (true);


--
-- Name: transaction_audit_log System can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert audit logs" ON public.transaction_audit_log FOR INSERT WITH CHECK (true);


--
-- Name: company_statistics System can update statistics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update statistics" ON public.company_statistics FOR UPDATE USING (true);


--
-- Name: push_subscriptions Users can delete their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_activity Users can insert own activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own activity" ON public.user_activity FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can insert their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_activity Users can view own activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own activity" ON public.user_activity FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can view their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscriptions" ON public.push_subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: accounts_payable; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: authorized_emails; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.authorized_emails ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: community_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: company_statistics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_statistics ENABLE ROW LEVEL SECURITY;

--
-- Name: donation_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.donation_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: employees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: financial_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: hero_announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hero_announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: impact_certificates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.impact_certificates ENABLE ROW LEVEL SECURITY;

--
-- Name: impact_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.impact_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: payroll_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

--
-- Name: product_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: quotation_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

--
-- Name: quotations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

--
-- Name: sales_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: transaction_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transaction_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: wash_forums; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wash_forums ENABLE ROW LEVEL SECURITY;

--
-- Name: website_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.website_contacts ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;