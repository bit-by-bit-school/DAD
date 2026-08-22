---
version: alpha
name: HackerRank Solutions Hub Design System
description: Lixie / 16-Segment Phosphor & CRT Instrument Aesthetic Design System with low-cognitive-load color roles and purposeful motion.
colors:
  brand-primary: "#00E5FF"
  brand-primary-hover: "#38BDF8"
  brand-glow: "rgba(0, 229, 255, 0.25)"
  
  role-success: "#10B981"
  role-success-dim: "rgba(16, 185, 129, 0.15)"
  role-success-glow: "rgba(16, 185, 129, 0.3)"
  
  role-attention: "#F59E0B"
  role-attention-dim: "rgba(245, 158, 11, 0.15)"
  role-attention-glow: "rgba(245, 158, 11, 0.3)"
  
  role-critical: "#EF4444"
  role-critical-dim: "rgba(239, 68, 68, 0.15)"
  role-critical-glow: "rgba(239, 68, 68, 0.3)"

  surface-base: "#080A0F"
  surface-card: "#0E121B"
  surface-elevated: "#151B26"
  surface-overlay: "#1D2535"
  surface-hover: "#252F42"

  border-subtle: "rgba(255, 255, 255, 0.07)"
  border-default: "rgba(255, 255, 255, 0.12)"
  border-focus: "#00E5FF"

  text-bright: "#FFFFFF"
  text-primary: "#E2E8F0"
  text-secondary: "#94A3B8"
  text-dim: "#64748B"
  text-ghost: "#334155"
typography:
  sans:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  mono:
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Share Tech Mono', Consolas, monospace"
  segment:
    fontFamily: "'Share Tech Mono', 'JetBrains Mono', monospace"
rounded:
  base: "6px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
---

## Overview

HackerRank Solutions Hub adopts a **Lixie & Segmented Phosphor / CRT Precision Instrument** design aesthetic. The interface draws direct visual inspiration from multi-segment alphanumeric digital displays (14/16-segment glowing phosphor characters against a dark unlit matrix backdrop).

The design strictly minimizes cognitive load by using color only to draw attention to high-value status changes and functional actions, while relying on a deep, calm, monochrome slate/carbon architecture for content surfaces.

## Colors

The color palette consists of one primary **Brand Color** and exactly **Three Functional Role Colors**. All surface levels, text tiers, borders, and glows are systematically derived.

### 1. Brand Luminescence (Ice Cyan / Phosphor White)
- **Token**: `--brand-primary` (`#00E5FF`)
- **Role**: Primary brand identity, active tabs, keyboard focus rings, and primary interactive CTA.
- **Rule**: Never use across full backgrounds. Use as a luminescent edge or accent.

### 2. Role 1 — Success & Solved (Terminal Emerald)
- **Token**: `--role-success` (`#10B981`)
- **Role**: Strictly reserved for solved challenges, passing reviews, successful synchronization, and online connection status.

### 3. Role 2 — Attention & Pending (Phosphor Amber)
- **Token**: `--role-attention` (`#F59E0B`)
- **Role**: Strictly reserved for in-progress reviews, changes requested, unread notifications, warnings, and active streaks.

### 4. Role 3 — Critical & Destructive (Signal Crimson)
- **Token**: `--role-critical` (`#EF4444`)
- **Role**: Strictly reserved for hard difficulty tags, error states, and destructive confirmation modals.

### 5. Derived Neutrals & Surfaces
- Canvas / Deep Base: `#080A0F`
- Panel / Sidebar / Card: `#0E121B`
- Elevated Layer / Code Container: `#151B26`
- Interactive Surface / Hover: `#252F42`
- Text Hierarchy: `#FFFFFF` (headings), `#E2E8F0` (body), `#94A3B8` (secondary metadata), `#64748B` (unlit matrix / placeholders).

## Typography

- **Code & Numeric Data**: JetBrains Mono / Fira Code / Share Tech Mono with `tabular-nums` for aligned counters, statistics, code review diffs, and execution meters.
- **Interface & Content**: Inter for labels, modals, and readable problem descriptions.
- **Segmented Badges**: Uppercase alphanumeric readouts with letter spacing (`0.5px`) resembling physical electronic test equipment.

## Iconography

- **Prohibition**: Raw unicode emojis (e.g. 📂, 💻, ⚡, 🔔, 🔑, 🤖) are strictly forbidden in UI chrome, headings, badges, and buttons.
- **Standard**: All icons must be purpose-built, geometric vector SVGs (`16x16` or `20x20`) with 1.5px to 2px crisp stroke geometry that aligns with the segmented digital display theme.

## Motion & Transitions

- **Duration Constraint**: Interactive transitions must complete within `120ms` to `180ms`.
- **Compositor Only**: Animate strictly `opacity` and `transform` properties. Never animate layout dimensions (`width`, `height`, `margin`, `padding`).
- **Phosphor Warm-up**: Tab transitions and data renders use a subtle 150ms phosphor ignite fade (`ease-out`).
- **Accessibility**: All animations automatically respect `@media (prefers-reduced-motion: reduce)`.

## Do's and Don'ts

### Do's
- Do keep the background dark, neutral, and low-contrast to prevent eye fatigue during long coding sessions.
- Do use the 3 assigned role colors exclusively for their functional purposes.
- Do display numerical counts with monospace digits for stable tabular layout.
- Do provide clear focus outlines using the brand phosphor cyan color.

### Don'ts
- Don't use rainbow gradients, purple buttons, or multicolor ambient backgrounds.
- Don't use saturated colored backgrounds under large blocks of text.
- Don't use emojis in navigation headers, button labels, or status indicators.
- Don't introduce arbitrary accent colors outside the defined 4-color system.
