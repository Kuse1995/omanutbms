INSERT INTO public.branch_inventory (tenant_id, branch_id, inventory_id, current_stock, reorder_level)
SELECT 
  tenant_id,
  '5edce03c-614f-42b8-8fca-7cb9402e4b7a',
  id,
  current_stock,
  10
FROM public.inventory
WHERE is_archived = false
  AND current_stock > 0
ON CONFLICT DO NOTHING;