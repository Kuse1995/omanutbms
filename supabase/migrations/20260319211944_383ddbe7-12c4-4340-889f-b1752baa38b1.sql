
-- Callback retry queue for reliable webhook delivery
CREATE TABLE public.callback_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  callback_url text NOT NULL,
  api_secret text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  last_error text,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Index for efficient retry polling
CREATE INDEX idx_callback_queue_pending ON public.callback_queue (next_retry_at) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_callback_queue_tenant ON public.callback_queue (tenant_id);

-- API rate limiting table (sliding window counter)
CREATE TABLE public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT date_trunc('minute', now()),
  request_count integer NOT NULL DEFAULT 1,
  UNIQUE (tenant_id, window_start)
);

CREATE INDEX idx_api_rate_limits_lookup ON public.api_rate_limits (tenant_id, window_start);

-- Auto-cleanup old rate limit entries (older than 5 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.api_rate_limits WHERE window_start < now() - interval '5 minutes';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_rate_limits
AFTER INSERT ON public.api_rate_limits
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_rate_limits();

-- RLS policies
ALTER TABLE public.callback_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role full access (edge functions use service role)
CREATE POLICY "Service role full access on callback_queue" ON public.callback_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on api_rate_limits" ON public.api_rate_limits FOR ALL USING (true) WITH CHECK (true);
