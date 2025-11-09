# Dark Mode Design Tokens - Implementation Reference

## Overview
This document outlines the complete design system for implementing dark/light mode across the application.

## Design References
- **Dark Mode Inspiration**: `/chatgpt` - DOS terminal aesthetic
- **Light Mode Inspiration**: `/dashboard` - Clean modern design
- **Additional Dark Reference**: `/dashboard/dev` - Developer dashboard

---

## Color Palettes

### Light Mode (Modern Theme)
```css
/* Primary Colors */
--color-primary: #4f46e5;           /* Indigo - main brand color */
--color-primary-dark: #4338ca;       /* Darker indigo for hover */
--color-primary-light: #818cf8;      /* Lighter indigo for accents */
--color-secondary: #7c3aed;          /* Purple - secondary brand */
--color-secondary-dark: #6d28d9;     /* Darker purple */

/* Text Colors */
--color-text: #1f2937;               /* Dark gray - primary text */
--color-text-secondary: #4b5563;     /* Medium gray - secondary text */
--color-text-light: #6b7280;         /* Light gray - tertiary text */

/* Background Colors */
--color-background: #ffffff;         /* Pure white */
--color-surface: #f9fafb;            /* Very light gray - cards/surfaces */
--color-border: #e5e7eb;             /* Light gray - borders */

/* Status Colors */
--color-success: #22c55e;            /* Green */
--color-success-bg: #dcfce7;         /* Light green background */
--color-warning: #eab308;            /* Yellow */
--color-error: #ef4444;              /* Red */
--color-info: #3b82f6;               /* Blue */
```

### Dark Mode (DOS-Inspired Theme)
```css
/* Primary Colors */
--color-primary: #00ff00;            /* Bright green - classic DOS */
--color-primary-dark: #00cc00;       /* Slightly darker green */
--color-primary-light: #00ff00;      /* Bright green */
--color-secondary: #00ff00;          /* Green for consistency */

/* Text Colors */
--color-text: #00ff00;               /* Bright green - primary text */
--color-text-secondary: #00ff00;     /* Bright green - secondary text */
--color-text-light: #00dd00;         /* Slightly dimmer green */

/* Background Colors */
--color-background: #000000;         /* Pure black - DOS screen */
--color-surface: #001100;            /* Very dark green tint */
--color-border: #00ff00;             /* Green borders */

/* Status Colors */
--color-success: #00ff00;            /* Green */
--color-warning: #ffff00;            /* Yellow */
--color-warning-secondary: #fbbf24;  /* Amber yellow */
--color-error: #ff0000;              /* Bright red */
--color-info: #00ffff;               /* Cyan */
```

### Alternative Dark Mode (Dev Dashboard Style)
```css
/* For pages that need a more professional dark theme */
--color-background: #0f172a;         /* Dark slate */
--color-surface: #1e293b;            /* Lighter slate */
--color-text: #e2e8f0;               /* Light slate */
--color-text-secondary: #94a3b8;     /* Medium slate */
--color-border: #334155;             /* Slate border */
--color-accent-blue: #60a5fa;        /* Sky blue */
--color-accent-purple: #a78bfa;      /* Light purple */
```

---

## Typography

### Light Mode
```css
--font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-family-heading: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

/* Font Sizes */
--font-size-xs: 0.75rem;     /* 12px */
--font-size-sm: 0.875rem;    /* 14px */
--font-size-base: 1rem;      /* 16px */
--font-size-lg: 1.125rem;    /* 18px */
--font-size-xl: 1.25rem;     /* 20px */
--font-size-2xl: 1.5rem;     /* 24px */
--font-size-3xl: 2rem;       /* 32px */
--font-size-4xl: 2.5rem;     /* 40px */

/* Font Weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
--font-weight-extrabold: 800;

/* Line Heights */
--line-height-tight: 1.2;
--line-height-normal: 1.6;
--line-height-relaxed: 1.75;
```

### Dark Mode (DOS)
```css
--font-family-base: 'IBM Plex Mono', 'Courier New', monospace;
--font-family-heading: 'IBM Plex Mono', 'Courier New', monospace;

/* Font Sizes - same as light mode */
/* Font Weights */
--font-weight-normal: 400;
--font-weight-bold: 700;

/* Text Effects */
--text-shadow-dos: 0 0 5px rgba(0, 255, 0, 0.5);
--text-shadow-dos-strong: 0 0 10px rgba(0, 255, 0, 0.8);
```

---

## Spacing Scale

```css
--spacing-xs: 0.5rem;       /* 8px */
--spacing-sm: 0.75rem;      /* 12px */
--spacing-md: 1rem;         /* 16px */
--spacing-lg: 1.5rem;       /* 24px */
--spacing-xl: 2rem;         /* 32px */
--spacing-2xl: 3rem;        /* 48px */
--spacing-3xl: 4rem;        /* 64px */
```

---

## Border Styles

### Light Mode
```css
--border-width: 1px;
--border-width-thick: 2px;
--border-style: solid;

/* Border Radius */
--radius-none: 0;
--radius-sm: 0.375rem;      /* 6px */
--radius-md: 0.5rem;        /* 8px */
--radius-lg: 0.75rem;       /* 12px */
--radius-xl: 1rem;          /* 16px */
--radius-full: 9999px;      /* Pill shape */
```

### Dark Mode (DOS)
```css
--border-width: 1px;
--border-width-thick: 2px;
--border-style: solid;

/* Border Radius - very subtle for DOS aesthetic */
--radius-none: 0;
--radius-sm: 2px;
--radius-md: 2px;
--radius-lg: 2px;
--radius-xl: 2px;
```

---

## Shadows

### Light Mode
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

### Dark Mode (DOS)
```css
/* DOS doesn't use traditional shadows, uses glow effects instead */
--shadow-glow: 0 0 10px rgba(0, 255, 0, 0.5);
--shadow-glow-strong: 0 0 20px rgba(0, 255, 0, 0.6);

/* For non-DOS dark mode (dev dashboard style) */
--shadow-dark-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
--shadow-dark-md: 0 4px 12px rgba(0, 0, 0, 0.3);
--shadow-dark-lg: 0 8px 16px rgba(0, 0, 0, 0.3);
```

---

## Transitions

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
```

---

## Interactive States

### Light Mode
```css
/* Button Hover */
--hover-transform: translateY(-2px);
--hover-scale: scale(1.02);

/* Focus States */
--focus-ring: 0 0 0 3px rgba(79, 70, 229, 0.2);
--focus-outline: 2px solid var(--color-primary);

/* Active States */
--active-transform: translateY(0);
--active-scale: scale(0.98);
```

### Dark Mode (DOS)
```css
/* Button Hover - inverted colors */
--hover-bg: #00ff00;
--hover-text: #000000;
--hover-shadow: 0 0 10px rgba(0, 255, 0, 0.8);

/* Focus States */
--focus-ring: 0 0 10px rgba(0, 255, 0, 0.5);
--focus-outline: 2px solid #00ff00;

/* Active States */
--active-transform: translateY(1px);
--active-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
```

---

## Special Effects

### DOS Theme Only
```css
/* CRT Scanlines */
--scanline-gradient: repeating-linear-gradient(
  0deg,
  rgba(0, 255, 0, 0.03),
  rgba(0, 255, 0, 0.03) 1px,
  transparent 1px,
  transparent 2px
);

/* CRT Glow */
--crt-glow: radial-gradient(
  ellipse at center,
  rgba(0, 255, 0, 0.05) 0%,
  transparent 70%
);

/* Screen Flicker Animation */
@keyframes screenFlicker {
  0%, 100% { opacity: 1; }
  25% { opacity: 0.9; }
  50% { opacity: 1; }
  75% { opacity: 0.95; }
}

/* Blinking Cursor */
@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 12px;
}
::-webkit-scrollbar-track {
  background: #001100;
  border-left: 2px solid #00ff00;
}
::-webkit-scrollbar-thumb {
  background: #00ff00;
  border: 2px solid #000000;
}
::-webkit-scrollbar-thumb:hover {
  background: #00cc00;
}
```

---

## Component-Specific Patterns

### Cards

**Light Mode:**
```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-slow);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}
```

**Dark Mode (DOS):**
```css
.card {
  background: var(--color-surface);
  border: 2px solid var(--color-primary);
  border-radius: 2px;
  padding: var(--spacing-xl);
  text-shadow: var(--text-shadow-dos);
}

.card:hover {
  box-shadow: var(--shadow-glow);
}
```

### Buttons

**Light Mode:**
```css
.button-primary {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-xl);
  font-weight: var(--font-weight-semibold);
  transition: all var(--transition-base);
}

.button-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
```

**Dark Mode (DOS):**
```css
.button-primary {
  background: var(--color-surface);
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
  border-radius: 2px;
  padding: var(--spacing-sm) var(--spacing-md);
  font-weight: var(--font-weight-bold);
  text-shadow: var(--text-shadow-dos);
  font-family: var(--font-family-base);
}

.button-primary:hover {
  background: var(--color-primary);
  color: var(--color-background);
  text-shadow: none;
  box-shadow: var(--shadow-glow);
}
```

### Form Inputs

**Light Mode:**
```css
.input {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--color-text);
  font-family: var(--font-family-base);
  transition: all var(--transition-base);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--focus-ring);
}
```

**Dark Mode (DOS):**
```css
.input {
  background: var(--color-surface);
  border: 1px solid var(--color-primary);
  border-radius: 2px;
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--color-text);
  font-family: var(--font-family-base);
  text-shadow: var(--text-shadow-dos);
}

.input:focus {
  outline: none;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
}
```

---

## Accessibility Requirements

### Contrast Ratios (WCAG AA Minimum)
- **Normal Text**: 4.5:1
- **Large Text (18px+ or 14px+ bold)**: 3:1
- **UI Components**: 3:1

### Light Mode Validation
✅ Primary text (#1f2937) on white (#ffffff): ~14:1 (Excellent)
✅ Secondary text (#4b5563) on white (#ffffff): ~8:1 (Excellent)
✅ Primary button (#4f46e5) on white (#ffffff): ~5:1 (Good)

### Dark Mode Validation
✅ Green text (#00ff00) on black (#000000): ~21:1 (Excellent)
⚠️ Be careful with yellow (#ffff00) - ensure sufficient contrast
✅ Red (#ff0000) on black (#000000): ~5.25:1 (Good)

### Focus Indicators
- Must be visible in both themes
- Minimum 2px outline or 3px shadow
- Sufficient color contrast with background

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Tab order must be logical
- Skip links for main content

---

## Implementation Strategy

### CSS Variables Approach
Use CSS custom properties with a `data-theme` attribute on the root element:

```html
<html data-theme="light">
  <!-- or -->
<html data-theme="dark">
  <!-- or -->
<html data-theme="dos">
```

### Theme Toggle Mechanism
1. User selects theme via toggle component
2. Preference stored in localStorage
3. Theme applied via `data-theme` attribute
4. System preference detected via `prefers-color-scheme`

### Smooth Transitions
```css
* {
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease;
}
```

---

## Testing Checklist

### Visual Testing
- [ ] All text is readable in both themes
- [ ] No color-only information (use icons/patterns too)
- [ ] Images/icons work in both themes
- [ ] Focus indicators are visible
- [ ] Hover states are clear

### Accessibility Testing
- [ ] Run axe DevTools
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify keyboard navigation
- [ ] Check color contrast ratios
- [ ] Test reduced motion preference

### Cross-Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile browsers (iOS Safari, Chrome Android)

### Functional Testing
- [ ] Theme persists across page reloads
- [ ] Theme syncs across tabs (optional)
- [ ] No flash of wrong theme on load
- [ ] Smooth transitions between themes
- [ ] System preference detection works

---

## File Organization

Proposed structure:
```
src/
  styles/
    themes/
      tokens.css          # All CSS variables
      light-theme.css     # Light mode overrides
      dark-theme.css      # Dark DOS mode overrides
      theme-utils.css     # Utility classes
    global.css            # Global styles using tokens
  components/
    ThemeProvider.tsx     # Context + localStorage
    ThemeToggle.tsx       # UI control
```

---

## Next Steps

1. ✅ **Phase 1.1 Complete**: Design tokens documented
2. **Phase 1.2**: Discover all pages and components
3. **Phase 1.3**: Design architecture and implementation strategy
4. **Phase 2**: Implement core theme infrastructure
5. **Phase 3**: Deploy parallel agents to theme all pages/components
6. **Phase 4**: Quality assurance and polish
