-- Update RLS policies for remaining tables to use tenant scoping

-- =============================================
-- admin_alerts - Add tenant scoping
-- =============================================
DROP POLICY IF EXISTS "Admins can delete alerts" ON public.admin_alerts;
DROP POLICY IF EXISTS "Admins can update alerts" ON public.admin_alerts;
DROP POLICY IF EXISTS "Managers and admins can view alerts" ON public.admin_alerts;
DROP POLICY IF EXISTS "System can insert alerts" ON public.admin_alerts;

CREATE POLICY "Users can view their tenant alerts"
ON public.admin_alerts FOR SELECT
USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Admins can update alerts"
ON public.admin_alerts FOR UPDATE
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Admins can delete alerts"
ON public.admin_alerts FOR DELETE
USING (is_tenant_admin(tenant_id));

CREATE POLICY "System can insert alerts"
ON public.admin_alerts FOR INSERT
WITH CHECK (true);

-- =============================================
-- agent_applications - Add tenant scoping
-- =============================================
DROP POLICY IF EXISTS "Admins can delete applications" ON public.agent_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON public.agent_applications;
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.agent_applications;
DROP POLICY IF EXISTS "Managers and admins can view applications" ON public.agent_applications;

CREATE POLICY "Users can view their tenant applications"
ON public.agent_applications FOR SELECT
USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Admins can update applications"
ON public.agent_applications FOR UPDATE
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Admins can delete applications"
ON public.agent_applications FOR DELETE
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Anyone can submit applications"
ON public.agent_applications FOR INSERT
WITH CHECK (true);

-- =============================================
-- agent_inventory - Add tenant scoping
-- =============================================
DROP POLICY IF EXISTS "Admins can delete agent inventory" ON public.agent_inventory;
DROP POLICY IF EXISTS "Admins can update agent inventory" ON public.agent_inventory;
DROP POLICY IF EXISTS "Authenticated users can view agent inventory" ON public.agent_inventory;
DROP POLICY IF EXISTS "Managers and admins can insert agent inventory" ON public.agent_inventory;

CREATE POLICY "Users can view their tenant agent inventory"
ON public.agent_inventory FOR SELECT
USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Admins/managers can insert agent inventory"
ON public.agent_inventory FOR INSERT
WITH CHECK (is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Admins can update agent inventory"
ON public.agent_inventory FOR UPDATE
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Admins can delete agent inventory"
ON public.agent_inventory FOR DELETE
USING (is_tenant_admin(tenant_id));

-- =============================================
-- agent_transactions - Add tenant scoping
-- =============================================
DROP POLICY IF EXISTS "Admins can delete agent transactions" ON public.agent_transactions;
DROP POLICY IF EXISTS "Admins can update agent transactions" ON public.agent_transactions;
DROP POLICY IF EXISTS "Authenticated users can view agent transactions" ON public.agent_transactions;
DROP POLICY IF EXISTS "Managers and admins can insert agent transactions" ON public.agent_transactions;

CREATE POLICY "Users can view their tenant agent transactions"
ON public.agent_transactions FOR SELECT
USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Admins/managers can insert agent transactions"
ON public.agent_transactions FOR INSERT
WITH CHECK (is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Admins can update agent transactions"
ON public.agent_transactions FOR UPDATE
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Admins can delete agent transactions"
ON public.agent_transactions FOR DELETE
USING (is_tenant_admin(tenant_id));

-- =============================================
-- audit_log - Add tenant scoping
-- =============================================
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;

CREATE POLICY "Admins can view their tenant audit logs"
ON public.audit_log FOR SELECT
USING (is_tenant_admin(tenant_id));

CREATE POLICY "System can insert audit logs"
ON public.audit_log FOR INSERT
WITH CHECK (true);

-- =============================================
-- authorized_emails - Add tenant scoping
-- =============================================
DROP POLICY IF EXISTS "Admins can delete authorized emails" ON public.authorized_emails;
DROP POLICY IF EXISTS "Admins can insert authorized emails" ON public.authorized_emails;
DROP POLICY IF EXISTS "Admins can update authorized emails" ON public.authorized_emails;
DROP POLICY IF EXISTS "Admins can view authorized emails" ON public.authorized_emails;
DROP POLICY IF EXISTS "Anyone can check their email authorization" ON public.authorized_emails;

CREATE POLICY "Admins can view their tenant authorized emails"
ON public.authorized_emails FOR SELECT
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Anyone can check email authorization"
ON public.authorized_emails FOR SELECT
USING (true);

CREATE POLICY "Admins can insert authorized emails"
ON public.authorized_emails FOR INSERT
WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Admins can update authorized emails"
ON public.authorized_emails FOR UPDATE
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Admins can delete authorized emails"
ON public.authorized_emails FOR DELETE
USING (is_tenant_admin(tenant_id));

-- =============================================
-- blog_posts - Add tenant scoping
-- =============================================
DROP POLICY IF EXISTS "Admins can delete posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Anyone can view published posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Managers and admins can insert posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Managers and admins can view all posts" ON public.blog_posts;

CREATE POLICY "Anyone can view published posts"
ON public.blog_posts FOR SELECT
USING (status = 'published');

CREATE POLICY "Users can view their tenant posts"
ON public.blog_posts FOR SELECT
USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Admins/managers can insert posts"
ON public.blog_posts FOR INSERT
WITH CHECK (is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Admins can update posts"
ON public.blog_posts FOR UPDATE
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Admins can delete posts"
ON public.blog_posts FOR DELETE
USING (is_tenant_admin(tenant_id));

-- =============================================
-- community_messages - Add tenant scoping
-- =============================================
DROP POLICY IF EXISTS "Admins can delete community messages" ON public.community_messages;
DROP POLICY IF EXISTS "Admins can update community messages" ON public.community_messages;
DROP POLICY IF EXISTS "Anyone can submit community messages" ON public.community_messages;
DROP POLICY IF EXISTS "Managers and admins can view community messages" ON public.community_messages;

CREATE POLICY "Users can view their tenant community messages"
ON public.community_messages FOR SELECT
USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Anyone can submit community messages"
ON public.community_messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update community messages"
ON public.community_messages FOR UPDATE
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Admins can delete community messages"
ON public.community_messages FOR DELETE
USING (is_tenant_admin(tenant_id));

-- =============================================
-- donation_requests - Add tenant scoping
-- =============================================
DROP POLICY IF EXISTS "Admins can delete donation requests" ON public.donation_requests;
DROP POLICY IF EXISTS "Admins can update donation requests" ON public.donation_requests;
DROP POLICY IF EXISTS "Anyone can submit donation requests" ON public.donation_requests;
DROP POLICY IF EXISTS "Managers and admins can view donation requests" ON public.donation_requests;

CREATE POLICY "Users can view their tenant donation requests"
ON public.donation_requests FOR SELECT
USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Anyone can submit donation requests"
ON public.donation_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update donation requests"
ON public.donation_requests FOR UPDATE
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Admins can delete donation requests"
ON public.donation_requests FOR DELETE
USING (is_tenant_admin(tenant_id));

-- =============================================
-- financial_reports - Add tenant scoping
-- =============================================
DROP POLICY IF EXISTS "Admins can delete reports" ON public.financial_reports;
DROP POLICY IF EXISTS "Authenticated users can view reports" ON public.financial_reports;
DROP POLICY IF EXISTS "Managers and admins can insert reports" ON public.financial_reports;

CREATE POLICY "Users can view their tenant reports"
ON public.financial_reports FOR SELECT
USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Admins/managers can insert reports"
ON public.financial_reports FOR INSERT
WITH CHECK (is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Admins can delete reports"
ON public.financial_reports FOR DELETE
USING (is_tenant_admin(tenant_id));

-- =============================================
-- hero_announcements - Add tenant scoping
-- =============================================
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.hero_announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON public.hero_announcements;
DROP POLICY IF EXISTS "Anyone can view active announcements" ON public.hero_announcements;
DROP POLICY IF EXISTS "Managers and admins can insert announcements" ON public.hero_announcements;
DROP POLICY IF EXISTS "Managers and admins can view all announcements" ON public.hero_announcements;

CREATE POLICY "Anyone can view active announcements"
ON public.hero_announcements FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can view their tenant announcements"
ON public.hero_announcements FOR SELECT
USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Admins/managers can insert announcements"
ON public.hero_announcements FOR INSERT
WITH CHECK (is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Admins can update announcements"
ON public.hero_announcements FOR UPDATE
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Admins can delete announcements"
ON public.hero_announcements FOR DELETE
USING (is_tenant_admin(tenant_id));

-- =============================================
-- impact_certificates - Add tenant scoping
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can create certificates" ON public.impact_certificates;
DROP POLICY IF EXISTS "Authenticated users can view certificates" ON public.impact_certificates;

CREATE POLICY "Users can view their tenant certificates"
ON public.impact_certificates FOR SELECT
USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Admins/managers can create certificates"
ON public.impact_certificates FOR INSERT
WITH CHECK (is_tenant_admin_or_manager(tenant_id));

-- =============================================
-- impact_metrics - Add tenant scoping
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view impact metrics" ON public.impact_metrics;
DROP POLICY IF EXISTS "Managers and admins can manage impact metrics" ON public.impact_metrics;

CREATE POLICY "Users can view their tenant impact metrics"
ON public.impact_metrics FOR SELECT
USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Admins/managers can insert impact metrics"
ON public.impact_metrics FOR INSERT
WITH CHECK (is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Admins can update impact metrics"
ON public.impact_metrics FOR UPDATE
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Admins can delete impact metrics"
ON public.impact_metrics FOR DELETE
USING (is_tenant_admin(tenant_id));