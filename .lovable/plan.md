
# Unify All Contact Points to WhatsApp & Email

## Overview

This plan updates all contact-related links and buttons across the application to consistently use:
- **WhatsApp**: +260972064502 (via `https://wa.me/260972064502`)
- **Email**: abkanyanta@gmail.com
- **Phone**: +260972064502

## Files to Update

| File | Current State | Change |
|------|---------------|--------|
| `src/components/ContactSection.tsx` | Uses `useBusinessConfig` fallbacks | Add WhatsApp as primary contact method with hardcoded number |
| `src/components/Footer.tsx` | Uses `useBusinessConfig` | Add WhatsApp link, ensure email/phone fallbacks are correct |
| `src/components/SupportContactButton.tsx` | Correct defaults already | Add WhatsApp button alongside email/phone |
| `src/components/ProductsSection.tsx` | Wrong number (260956905652) | Update to 260972064502 |
| `src/components/ProductQuickViewModal.tsx` | Wrong number (260956905652) | Update to 260972064502 |
| `src/components/landing/FinalCTA.tsx` | Links to /contact page | Change "Talk to Sales" to open WhatsApp directly |

## Implementation Details

### 1. ContactSection.tsx - Add WhatsApp Contact

Add a WhatsApp entry to the contact info array:

```typescript
const contactInfo = [
  {
    icon: MapPin,
    label: "Address",
    value: companyAddress || "Contact us for our address",
  },
  {
    icon: MessageCircle, // Add import from lucide-react
    label: "WhatsApp",
    value: "+260 972 064 502",
    href: "https://wa.me/260972064502",
    isExternal: true,
  },
  {
    icon: Mail,
    label: "Email", 
    value: "abkanyanta@gmail.com",
    href: "mailto:abkanyanta@gmail.com",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+260 972 064 502",
    href: "tel:+260972064502",
  },
];
```

### 2. Footer.tsx - Add WhatsApp Link

Update the Contact section to include WhatsApp:

```typescript
{
  title: "Contact",
  links: [
    { label: companyAddress || "Lusaka, Zambia", href: "#", isText: true },
    { label: "WhatsApp Us", href: "https://wa.me/260972064502", isExternal: true },
    { label: "+260 972 064 502", href: "tel:+260972064502" },
    { label: "abkanyanta@gmail.com", href: "mailto:abkanyanta@gmail.com" },
  ],
}
```

### 3. SupportContactButton.tsx - Add WhatsApp Button

Add a third button for WhatsApp between the email and phone buttons:

```typescript
<Button asChild size="lg" className="bg-green-500 hover:bg-green-600 text-white">
  <a 
    href="https://wa.me/260972064502" 
    target="_blank" 
    rel="noopener noreferrer"
  >
    <MessageCircle className="w-5 h-5 mr-2" />
    WhatsApp
  </a>
</Button>
```

### 4. ProductsSection.tsx - Fix Phone Number

Update line 462 and 469:
- Change `tel:+260956905652` to `tel:+260972064502`
- Change `https://wa.me/260956905652` to `https://wa.me/260972064502`

### 5. ProductQuickViewModal.tsx - Fix Phone Number

Update line 410 and 417:
- Change `tel:+260956905652` to `tel:+260972064502`
- Change `https://wa.me/260956905652` to `https://wa.me/260972064502`

### 6. FinalCTA.tsx - Direct WhatsApp Link

Change "Talk to Sales" button to open WhatsApp directly instead of navigating to /contact:

```typescript
<Button asChild variant="outline" size="lg">
  <a 
    href="https://wa.me/260972064502?text=Hi%2C%20I%27m%20interested%20in%20Omanut%20BMS" 
    target="_blank"
    rel="noopener noreferrer"
  >
    <MessageCircle className="mr-2 h-5 w-5" />
    Talk to Sales
  </a>
</Button>
```

## Summary of Changes

| Component | WhatsApp | Email | Phone |
|-----------|----------|-------|-------|
| ContactSection | Adding | Hardcode | Hardcode |
| Footer | Adding | Hardcode | Hardcode |
| SupportContactButton | Adding button | Already correct | Already correct |
| ProductsSection | Fix number | N/A | Fix number |
| ProductQuickViewModal | Fix number | N/A | Fix number |
| FinalCTA | Replace /contact link | N/A | N/A |

This ensures every "Contact Us" touchpoint across the app leads to the same WhatsApp number and email for a consistent user experience.
