# Enhanced AI Advisor Animations

## Status: ✅ Implemented

The advisor button now features eye-catching animations to draw user attention:

### Animations Added

1. **Ping Ring** - Continuous expanding ring (`animate-ping-ring`) that pulses outward every 2.5s
2. **Periodic Wiggle** - Button wiggles every 8 seconds when idle to simulate "I have something to tell you"
3. **Enhanced Glow** - Larger blur radius with `animate-pulse-glow` for more noticeable pulsing
4. **Badge Ping** - New user badge has a ripple effect (`animate-badge-ping`)

### Files Modified

- `tailwind.config.ts` - Added keyframes: `ping-ring`, `wiggle`, `pulse-glow`, `badge-ping`
- `src/components/dashboard/OmanutAdvisor.tsx` - Added animation elements, wiggle interval logic

### Accessibility

- All animations respect `prefers-reduced-motion`
- Wiggle stops when advisor is opened
- Users can hide the advisor completely
