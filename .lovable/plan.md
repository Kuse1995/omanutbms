

# Enhanced AI Advisor Animations Plan

## Overview
This plan adds eye-catching, professional animations to the Omanut Advisor button to draw user attention without being intrusive. The enhancements include a pulsing ring effect, a "ping" notification indicator, periodic wiggle animations, and an enhanced glow effect.

---

## Current State

The advisor currently has:
- A subtle bounce animation (`bounce-subtle`) that plays once on mount
- A pulsing glow halo (`bg-primary/25 blur-2xl`) with scale animation
- Progress ring for new users
- Hover scale effect (1.03x)

**Issue**: The single bounce plays once and stops, so returning users may not notice the advisor.

---

## Proposed Animations

### 1. Attention Pulse Ring (Continuous)
A ring that expands outward from the button like a radar ping, drawing peripheral vision attention.

```text
     ╭─────────╮
    ╱   ╭───╮   ╲    ← Expanding ring (fades as it grows)
   │   │ ● │   │     ← Advisor button
    ╲   ╰───╯   ╱
     ╰─────────╯
```

- Expands from button size to 1.8x
- Fades from 60% to 0% opacity
- Repeats every 3 seconds
- Subtle primary color

### 2. Periodic Wiggle/Shake
A small wiggle animation that triggers periodically (every 8-10 seconds) to simulate "I have something to tell you":

```text
   ← ● →   (rotates ±3° back and forth)
```

- Plays for ~0.5 seconds
- Repeats every 8 seconds while idle
- Stops when user interacts

### 3. Enhanced Glow Pulse
Improve the existing glow to be more noticeable:
- Larger blur radius (from `blur-2xl` to `blur-3xl`)
- More pronounced opacity change (0.2 → 0.6 → 0.2)
- Slight color shift (primary → accent blend)

### 4. Notification Badge Animation
For new users, make the "!" badge more attention-grabbing:
- Add a subtle ping/ripple effect
- Bouncing number badge

---

## Implementation Details

### New Tailwind Keyframes

| Animation | Description |
|-----------|-------------|
| `ping-ring` | Expanding ring that fades outward |
| `wiggle` | Small rotation wiggle (±3°) |
| `pulse-glow` | Enhanced opacity + scale pulse for the halo |
| `badge-ping` | Ripple effect for notification badge |

### Component Changes

**OmanutAdvisor.tsx** updates:
1. Add `isIdle` state that tracks if user hasn't interacted for 5+ seconds
2. Add interval for triggering wiggle animation periodically
3. Replace current glow span with enhanced multi-layer glow
4. Add expanding ring element
5. Enhance badge with ping effect

### Animation Timing

| Animation | Duration | Repeat | Trigger |
|-----------|----------|--------|---------|
| Pulse ring | 2.5s | Infinite | Always (when closed) |
| Wiggle | 0.5s | Every 8s | Idle state |
| Glow pulse | 3s | Infinite | Always |
| Badge ping | 1.5s | Infinite | New user |

---

## Files to Modify

| File | Changes |
|------|---------|
| `tailwind.config.ts` | Add new keyframes: `ping-ring`, `wiggle`, `pulse-glow`, `badge-ping` |
| `src/components/dashboard/OmanutAdvisor.tsx` | Add animation elements, periodic wiggle logic, enhanced glow |

---

## New Keyframe Definitions

```text
ping-ring:
  0%: scale(1), opacity(0.6)
  100%: scale(1.8), opacity(0)

wiggle:
  0%, 100%: rotate(0)
  20%: rotate(-3deg)
  40%: rotate(3deg)
  60%: rotate(-2deg)
  80%: rotate(2deg)

pulse-glow:
  0%, 100%: opacity(0.25), scale(0.95)
  50%: opacity(0.6), scale(1.1)

badge-ping:
  0%: scale(1), opacity(0.8)
  50%: scale(1.3), opacity(0)
  100%: scale(1), opacity(0)
```

---

## Visual Preview

```text
Idle State (attention-seeking):
┌─────────────────────────────────┐
│                                 │
│      ╭───────────╮              │
│     ╱  ╭─────╮    ╲  ← Ping ring│
│    │  │ ● ! │    │   ← Glowing  │
│     ╲  ╰─────╯   ╱     button   │
│      ╰───────────╯              │
│         ↺ wiggle                │
└─────────────────────────────────┘

After user hovers/clicks:
┌─────────────────────────────────┐
│                                 │
│                                 │
│         ╭─────╮                 │
│         │  ●  │  ← Calm, no     │
│         ╰─────╯    wiggle       │
│                                 │
└─────────────────────────────────┘
```

---

## Accessibility Considerations

- All animations respect `prefers-reduced-motion`
- Wiggle stops after user interacts (not endlessly distracting)
- Animations are subtle enough to not cause discomfort
- Users can hide the advisor completely

---

## Technical Implementation

### Periodic Wiggle Logic

```typescript
// State to track if we should show periodic attention animation
const [showWiggle, setShowWiggle] = useState(false);

useEffect(() => {
  if (isOpen || isHidden || prefersReducedMotion) return;
  
  // Trigger wiggle every 8 seconds when idle
  const interval = setInterval(() => {
    setShowWiggle(true);
    setTimeout(() => setShowWiggle(false), 500);
  }, 8000);
  
  return () => clearInterval(interval);
}, [isOpen, isHidden, prefersReducedMotion]);
```

### Enhanced Button Structure

```tsx
<motion.button>
  {/* Ping ring - continuous */}
  <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping-ring" />
  
  {/* Enhanced glow halo */}
  <motion.span className="absolute -inset-4 rounded-full bg-gradient-radial from-primary/40 to-accent/20 blur-3xl animate-pulse-glow" />
  
  {/* Button content with wiggle */}
  <motion.div animate={showWiggle ? { rotate: [0, -3, 3, -2, 2, 0] } : {}}>
    <img src={advisorLogo} ... />
  </motion.div>
  
  {/* Badge with ping */}
  {isNewUser && (
    <span className="relative">
      <span className="absolute inset-0 animate-badge-ping bg-accent rounded-full" />
      <span className="relative">!</span>
    </span>
  )}
</motion.button>
```

---

## Testing Checklist

After implementation:
1. Verify ping ring expands and fades continuously
2. Confirm wiggle triggers every ~8 seconds when idle
3. Check animations stop when advisor is opened
4. Verify `prefers-reduced-motion` disables all new animations
5. Test on mobile (animations should be less intense)
6. Confirm hide/show toggle works with new animations

