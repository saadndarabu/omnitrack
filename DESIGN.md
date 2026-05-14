---
name: SIRP Engineering Command
colors:
  surface: '#0d1515'
  surface-dim: '#0d1515'
  surface-bright: '#333b3b'
  surface-container-lowest: '#080f10'
  surface-container-low: '#151d1e'
  surface-container: '#192122'
  surface-container-high: '#232b2c'
  surface-container-highest: '#2e3637'
  on-surface: '#dce4e4'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#dce4e4'
  inverse-on-surface: '#2a3232'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dbe7'
  primary: '#e1fdff'
  on-primary: '#00363a'
  primary-container: '#00f2ff'
  on-primary-container: '#006a71'
  inverse-primary: '#00696f'
  secondary: '#d3bbff'
  on-secondary: '#3f008d'
  secondary-container: '#5d03ca'
  on-secondary-container: '#c7aaff'
  tertiary: '#fff6e4'
  on-tertiary: '#3b2f00'
  tertiary-container: '#fed83a'
  on-tertiary-container: '#725e00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74f5ff'
  primary-fixed-dim: '#00dbe7'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#ebddff'
  secondary-fixed-dim: '#d3bbff'
  on-secondary-fixed: '#250059'
  on-secondary-fixed-variant: '#5b00c5'
  tertiary-fixed: '#ffe173'
  tertiary-fixed-dim: '#e8c423'
  on-tertiary-fixed: '#221b00'
  on-tertiary-fixed-variant: '#554500'
  background: '#0d1515'
  on-background: '#dce4e4'
  surface-variant: '#2e3637'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: 0.1em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  code-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  status-label:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  max-width: 1600px
---

## Brand & Style

The design system is engineered for high-stakes environments where precision, speed, and clarity are non-negotiable. It evokes the feeling of a sophisticated, near-future flight deck—authoritative yet silent. The target audience consists of elite engineers and systems architects who require high-density data visualization without cognitive overload.

The aesthetic is a fusion of **Refined Glassmorphism** and **Technical Minimalism**. It utilizes translucent layering to maintain context across complex navigation paths, paired with razor-thin borders and subtle telemetry-inspired patterns. The overall mood is "Obsidian Precision": deep, focused, and ultra-premium.

## Colors

The palette is anchored in a "True Dark" philosophy. The foundation is built on deep charcoals (#050505) to ensure maximum contrast and reduced eye strain during extended night operations. 

- **Primary Accent:** A glowing Teal (#00F2FF) is used for active states, primary actions, and critical data highlights. It should be used sparingly to maintain its impact.
- **Secondary Accent:** Deep Purple (#6D28D9) provides a sophisticated depth, used for secondary visual interest, grouping of related technical clusters, or subtle background gradients.
- **Status Indicators:** Utility colors use a "muted-vivid" approach—highly legible against dark backgrounds but desaturated enough to avoid a "Christmas tree" effect in high-density dashboards.

## Typography

Typography in this design system is treated as a precision instrument. We employ **Geist** for its clean, technical geometric shapes and exceptional legibility in dark environments. For data-heavy labels, telemetry, and code snippets, **JetBrains Mono** is utilized to provide a clear distinction between narrative content and system data.

Headings feature wide tracking (letter-spacing) to project an "elite" and "architectural" feel. All labels for technical metrics are set in uppercase monospaced type to reinforce the command-center aesthetic.

## Layout & Spacing

The layout philosophy follows a **High-Density Fluid Grid**. Efficiency of space is prioritized over expansive whitespace, reflecting the needs of an engineering command center where seeing more data at once is an advantage.

- **Grid Model:** A 12-column fluid grid for desktop with tight 16px gutters.
- **Rhythm:** A strict 4px base unit controls all padding and margins, ensuring pixel-perfect alignment of borders and modules.
- **Reflow:** On mobile devices, the layout collapses into a single-column stack, with complex data tables transforming into expandable "telemetry cards" to maintain usability.

## Elevation & Depth

Depth is conveyed through **Atmospheric Layering** rather than traditional physical shadows. 

1.  **Base Layer:** The deepest surface (#050505), occasionally featuring a subtle 10% opacity 24px grid overlay to provide a sense of scale.
2.  **Surface Layer:** Semi-transparent panels (#0A0A0B at 80% opacity) with a `20px` backdrop blur. 
3.  **Borders:** All panels are defined by a 1px solid border. Use `rgba(255, 255, 255, 0.08)` for standard containers and `rgba(0, 242, 255, 0.2)` for active or focused modules.
4.  **Glow:** Interaction triggers a subtle, long-range outer glow (spread 20px, opacity 0.15) using the accent color, simulating a CRT or high-end LED display.

## Shapes

The shape language is "Soft-Technical." We avoid fully sharp corners to prevent a dated "brutalist" feel, opting instead for a consistent 4px radius (`rounded-sm`). This provides a modern, engineered look that feels tactile yet precise. 

Buttons and input fields maintain this 4px radius. Occasional use of 45-degree "clipped" corners is permitted for status tags or decorative corner-accents to further the military-spec/engineering aesthetic.

## Components

- **Buttons:** Primary buttons are ghost-style with a 1px Teal border and a subtle Teal inner glow. On hover, the background fills with a 10% Teal tint.
- **Cards:** Use a semi-transparent background with backdrop-filter blur. Add a "scanline" linear-gradient (1px horizontal lines, 4px apart, 3% opacity) to provide texture.
- **Inputs:** Monospaced text entry with a "blinking underscore" style cursor. The active state should highlight the entire border in Primary Teal.
- **Telemetry Chips:** Small, high-contrast badges with monospaced labels. Backgrounds use a 15% opacity of the status color (Green for OK, Amber for Warning).
- **Data Tables:** Border-collapsed grids with no horizontal lines—only vertical dividers at 5% opacity to maintain a "column-first" scan pattern for time-series data.
- **Gauges & HUDs:** Use circular strokes for health/percentage metrics, utilizing the Primary Teal and Secondary Purple for gradients within the stroke.