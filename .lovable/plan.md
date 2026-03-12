

# Simplify VSDC URL Configuration

## The Problem

The VSDC URL is the local network address of the physical VSDC device ZRA installs on the taxpayer's premises (e.g., `http://192.168.1.100:8080`). This is too technical for most business owners. However, ZRA provides standard URLs during registration, and most taxpayers in Zambia use one of a few known configurations.

## Solution

Instead of a raw text input, provide:

1. **A dropdown with common presets** -- ZRA has a standard sandbox URL and standard production patterns. Offer these as selectable options:
   - `Sandbox / Testing` → `http://localhost:8080`
   - `Standard VSDC (Port 8080)` → auto-detected or user enters just the IP
   - `Custom URL` → falls back to manual entry for advanced users

2. **Simplified input** -- Instead of asking for a full URL, ask for just the **VSDC IP address** (which ZRA provides on their registration certificate). The system auto-constructs the URL as `http://{ip}:8080/tax`.

3. **Helpful guidance text** -- Add a note explaining: "This is the IP address shown on your ZRA VSDC registration certificate. If unsure, contact your ZRA officer."

4. **Test Connection button** -- Already exists; this gives users instant feedback if the URL works.

## Changes

### `src/components/dashboard/ZraSettings.tsx`
- Replace the raw VSDC URL input with a two-option approach:
  - Radio/select: "Use standard VSDC" vs "Custom URL"
  - For standard: just an IP address input field with port defaulting to 8080
  - For custom: full URL input (for advanced users)
- Add helper text referencing the ZRA registration certificate
- Auto-construct the full URL from IP + port before saving

### `supabase/functions/zra-smart-invoice/index.ts`
- No changes needed -- it already uses the full URL from the database

This keeps the stored value as a full URL (backward compatible) while making the UI much simpler for non-technical users.

