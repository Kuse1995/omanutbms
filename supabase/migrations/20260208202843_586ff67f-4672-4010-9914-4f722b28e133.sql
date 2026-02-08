
-- Add branch_id to sales_transactions so sales are tracked per branch
ALTER TABLE public.sales_transactions 
ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Index for branch-based queries
CREATE INDEX idx_sales_transactions_branch_id ON public.sales_transactions(branch_id);
