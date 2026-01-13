-- Enable realtime for sales_transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_transactions;

-- Also enable for expenses table for complete accounting updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;