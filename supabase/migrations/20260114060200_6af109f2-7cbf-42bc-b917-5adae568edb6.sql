-- Enable WhatsApp feature for Enterprise and Growth plans in billing_plan_configs
UPDATE billing_plan_configs
SET feature_whatsapp = true, updated_at = now()
WHERE plan_key IN ('enterprise', 'growth');