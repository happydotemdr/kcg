# Dark Mode Architecture & Implementation Strategy

## Executive Summary

This document outlines the complete technical architecture for implementing a comprehensive light/dark/DOS theme system across the Keep Choosing Good application.

**Goals**:
1. Unified theme system across all pages
2. User preference persistence
3. Smooth transitions between themes
4. System preference detection
5. WCAG AA accessibility compliance
6. Zero flash of wrong theme on load
7. Minimal performance impact

**Themes**:
- **Light Mode**: Modern, professional (dashboard-inspired)
- **Dark Mode**: DOS terminal aesthetic (chatgpt-inspired) with professional alternative
- **System**: Auto-detect from OS

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     User Interaction                      │
│                  (ThemeToggle Component)                  │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   ThemeProvider Context                   │
│  - Manages theme state                                    │
│  - Syncs with localStorage                                │
│  - Applies data-theme attribute                           │
│  - Detects system preference                              │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  CSS Custom Properties                    │
│  src/styles/themes/tokens.css                             │
│  - Base variables                                         │
│  - Theme-specific overrides                               │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│               All Components & Pages                      │
│  - Use CSS variables                                      │
│  - No hard-coded colors                                   │
│  - Theme-aware styling                                    │
└─────────────────────────────────────────────────────────┘
```

---

## File Organization

```
src/
├── styles/
│   ├── themes/
│   │   ├── tokens.css              # Base CSS variables (both themes)
│   │   ├── light-theme.css         # Light mode overrides
│   │   ├── dark-theme.css          # Dark mode overrides (DOS)
│   │   ├── dark-pro-theme.css      # Professional dark mode (optional)
│   │   └── theme-transitions.css   # Smooth transition styles
│   ├── global.css                  # Global styles using tokens
│   └── utils.css                   # Utility classes
│
├── lib/
│   ├── theme/
│   │   ├── ThemeContext.tsx        # React context for theme state
│   │   ├── useTheme.ts             # Custom hook for accessing theme
│   │   └── theme-utils.ts          # Utility functions
│
├── components/
│   ├── theme/
│   │   ├── ThemeProvider.tsx       # Provider component
│   │   ├── ThemeToggle.tsx         # Toggle UI (modern)
│   │   └── DosThemeToggle.tsx      # Toggle UI (DOS style)
│
├── layouts/
│   └── BaseLayout.astro            # Modified to include ThemeProvider
│
└── pages/
    └── (all pages use themed components)
```

---

## Implementation Strategy

### Phase 1: Core Infrastructure (This Phase)

#### 1.1 Create CSS Variable System

**File**: `src/styles/themes/tokens.css`

```css
/* Base tokens - defaults to light mode */
:root {
  /* Colors */
  --color-primary: #4f46e5;
  --color-primary-dark: #4338ca;
  --color-text: #1f2937;
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-border: #e5e7eb;

  /* Typography */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-mono: 'IBM Plex Mono', 'Courier New', monospace;

  /* Spacing, shadows, etc. */
  /* ... (full list in tokens doc) */
}

/* Dark Mode (DOS) */
[data-theme="dark"] {
  --color-primary: #00ff00;
  --color-primary-dark: #00cc00;
  --color-text: #00ff00;
  --color-background: #000000;
  --color-surface: #001100;
  --color-border: #00ff00;
  --font-family-base: var(--font-family-mono);
}

/* Professional Dark Mode (Optional) */
[data-theme="dark-pro"] {
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-text: #e2e8f0;
  /* ... */
}
```

#### 1.2 Create Theme Context

**File**: `src/lib/theme/ThemeContext.tsx`

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'dark-pro' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark' | 'dark-pro'; // actual theme being used
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'kcg-theme-preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark' | 'dark-pro'>('light');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

    const initialTheme = stored || 'system';
    setThemeState(initialTheme);

    const resolved = initialTheme === 'system' ? systemPreference : initialTheme;
    setResolvedTheme(resolved as any);
    document.documentElement.setAttribute('data-theme', resolved);
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);

    if (newTheme === 'system') {
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      setResolvedTheme(systemPreference);
      document.documentElement.setAttribute('data-theme', systemPreference);
    } else {
      setResolvedTheme(newTheme as any);
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

#### 1.3 Create Theme Toggle Component

**File**: `src/components/theme/ThemeToggle.tsx`

```tsx
import React from 'react';
import { useTheme } from '@lib/theme/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' },
  ];

  return (
    <div className="theme-toggle">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={`theme-toggle-btn ${theme === option.value ? 'active' : ''}`}
          aria-label={`Switch to ${option.label} theme`}
          title={option.label}
        >
          <span className="theme-icon">{option.icon}</span>
          <span className="theme-label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
```

**File**: `src/components/theme/DosThemeToggle.tsx` (DOS-styled version)

```tsx
import React from 'react';
import { useTheme } from '@lib/theme/ThemeContext';

export default function DosThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="dos-theme-toggle">
      <button
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className="dos-theme-btn"
      >
        [{theme === 'light' ? 'DARK' : 'LIGHT'} MODE]
      </button>
    </div>
  );
}
```

#### 1.4 Prevent Flash of Wrong Theme

**File**: `src/scripts/theme-init.ts` (inline script in HTML head)

```typescript
// This must run BEFORE React hydration
(function() {
  const STORAGE_KEY = 'kcg-theme-preference';
  const stored = localStorage.getItem(STORAGE_KEY);
  const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

  const theme = stored === 'system' || !stored ? systemPreference : stored;
  document.documentElement.setAttribute('data-theme', theme);
})();
```

Add to `BaseLayout.astro`:
```html
<head>
  <!-- ... other head content ... -->
  <script is:inline>
    (function() {
      const STORAGE_KEY = 'kcg-theme-preference';
      const stored = localStorage.getItem(STORAGE_KEY);
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      const theme = stored === 'system' || !stored ? systemPreference : stored;
      document.documentElement.setAttribute('data-theme', theme);
    })();
  </script>
</head>
```

---

### Phase 2: Component Migration Strategy

#### Approach: Incremental Migration
We'll migrate components gradually to avoid breaking the entire app.

**Rules**:
1. Always use CSS variables (never hard-coded colors)
2. Test each component in both themes before committing
3. Maintain existing functionality
4. Add theme toggle to each page as it's completed

#### Migration Checklist Per Component:

```markdown
- [ ] Identify all color values (text, background, border)
- [ ] Replace with CSS variables
- [ ] Test light mode
- [ ] Test dark mode
- [ ] Test interactive states (hover, focus, active)
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Verify no hard-coded colors remain
- [ ] Check responsive behavior
- [ ] Commit changes
```

---

### Phase 3: Testing Strategy

#### Unit Tests (Optional but Recommended)
```typescript
// src/lib/theme/__tests__/ThemeContext.test.tsx
describe('ThemeProvider', () => {
  test('defaults to system preference', () => {
    // ...
  });

  test('persists theme to localStorage', () => {
    // ...
  });

  test('respects user override over system', () => {
    // ...
  });
});
```

#### Manual Testing Checklist
```markdown
**Per Page**:
- [ ] Light mode renders correctly
- [ ] Dark mode renders correctly
- [ ] Theme toggle works
- [ ] No flash on page load
- [ ] Theme persists on reload
- [ ] Smooth transition between themes
- [ ] All text is readable
- [ ] All icons are visible
- [ ] Focus indicators are clear
- [ ] Hover states work
- [ ] Forms are usable
- [ ] Buttons are clickable
- [ ] No layout shifts

**Accessibility**:
- [ ] Keyboard navigation works
- [ ] Screen reader announces theme changes
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators are visible
- [ ] No color-only information

**Performance**:
- [ ] No layout thrashing
- [ ] Smooth 60fps transitions
- [ ] No excessive repaints
- [ ] localStorage operations are fast
```

---

## Integration with Existing Code

### BaseLayout.astro Changes

```astro
---
import ThemeProvider from '@components/theme/ThemeProvider';
import ThemeToggle from '@components/theme/ThemeToggle';
// ... other imports
---

<!doctype html>
<html lang="en">
  <head>
    <!-- ... existing head content ... -->

    <!-- Theme initialization script (MUST be first) -->
    <script is:inline>
      (function() {
        const STORAGE_KEY = 'kcg-theme-preference';
        const stored = localStorage.getItem(STORAGE_KEY);
        const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
        const theme = stored === 'system' || !stored ? systemPreference : stored;
        document.documentElement.setAttribute('data-theme', theme);
      })();
    </script>

    <!-- Theme stylesheets -->
    <link rel="stylesheet" href="/src/styles/themes/tokens.css" />
    <link rel="stylesheet" href="/src/styles/themes/theme-transitions.css" />
  </head>
  <body>
    <ThemeProvider client:load>
      <nav class="main-nav">
        <div class="nav-container">
          <a href="/" class="nav-logo">Keep Choosing Good</a>

          <!-- Theme toggle in nav -->
          <ThemeToggle client:load />

          <NavigationAuth client:only="react" />
        </div>
      </nav>

      <main class="main-content">
        <slot />
      </main>
    </ThemeProvider>
  </body>
</html>
```

---

## CSS Migration Pattern

### Before (Hard-coded colors):
```css
.card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  color: #1f2937;
}

.card:hover {
  background: #ffffff;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

### After (CSS variables):
```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.card:hover {
  background: var(--color-background);
  box-shadow: var(--shadow-md);
}
```

---

## Special Cases

### 1. Clerk Components (Sign In/Sign Up)
Clerk provides `appearance` prop to customize theming:

```tsx
<ClerkSignIn
  appearance={{
    variables: {
      colorPrimary: 'var(--color-primary)',
      colorText: 'var(--color-text)',
      colorBackground: 'var(--color-background)',
      // ... more variables
    }
  }}
/>
```

**Challenge**: CSS variables don't work in JS objects.
**Solution**: Create separate appearance objects for each theme and conditionally apply:

```tsx
const { resolvedTheme } = useTheme();

const lightAppearance = {
  variables: {
    colorPrimary: '#4f46e5',
    colorText: '#1f2937',
    // ...
  }
};

const darkAppearance = {
  variables: {
    colorPrimary: '#00ff00',
    colorText: '#00ff00',
    colorBackground: '#000000',
    // ...
  }
};

<ClerkSignIn
  appearance={resolvedTheme === 'dark' ? darkAppearance : lightAppearance}
/>
```

### 2. DOS-Specific Effects (Scanlines, CRT Glow)
These should ONLY appear in dark mode:

```css
/* Only show in dark mode */
[data-theme="dark"] .dos-scanlines {
  display: block;
}

[data-theme="light"] .dos-scanlines,
[data-theme="dark-pro"] .dos-scanlines {
  display: none;
}
```

### 3. Font Family Switching
Some components (ChatGPT) use monospace in dark mode:

```css
.dos-chat {
  font-family: var(--font-family-base);
}

[data-theme="dark"] .dos-chat {
  font-family: var(--font-family-mono);
}
```

### 4. Third-Party Components
For components we don't control (charts, embeds, etc.):
- Wrap in a container with theme-specific classes
- Use CSS filters as last resort (`filter: invert(1)` for dark mode)
- Consider theme-aware alternatives

---

## Performance Considerations

### 1. CSS Variable Performance
- Modern browsers handle CSS variables efficiently
- Minimal performance impact for ~50-100 variables
- Changes propagate instantly via CSS cascade

### 2. Transition Performance
```css
/* Only transition properties that won't cause layout */
* {
  transition:
    background-color 200ms ease,
    color 200ms ease,
    border-color 200ms ease,
    box-shadow 200ms ease;
}

/* Don't transition layout properties */
/* Avoid: width, height, margin, padding, transform */
```

### 3. LocalStorage Operations
- Read once on mount
- Write on theme change only
- Synchronous operations are fast (<1ms)

### 4. Reduced Motion
Respect user preference:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
```

---

## Rollout Strategy

### Week 1: Infrastructure
- [ ] Create CSS variable system
- [ ] Implement ThemeProvider
- [ ] Create ThemeToggle components
- [ ] Integrate into BaseLayout
- [ ] Test on one simple page (About)

### Week 2: Core Pages
- [ ] Landing page
- [ ] Sign In/Sign Up
- [ ] Dashboard
- [ ] Profile

### Week 3: Chat Interfaces
- [ ] Claude Chat (/chat)
- [ ] ChatGPT (/chatgpt)
- [ ] Chat components

### Week 4: Remaining Pages & Polish
- [ ] Calendar Config
- [ ] Dev Dashboard
- [ ] Blog
- [ ] Error pages
- [ ] Final accessibility audit
- [ ] Cross-browser testing
- [ ] Performance optimization

---

## Success Metrics

### User Experience
- [ ] Theme preference persists across sessions
- [ ] No flash of wrong theme on load (<50ms)
- [ ] Smooth transitions (60fps)
- [ ] Theme toggle accessible from all pages

### Accessibility
- [ ] WCAG AA contrast ratios met (4.5:1 text, 3:1 UI)
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Focus indicators visible

### Performance
- [ ] Theme change <100ms
- [ ] Page load impact <10ms
- [ ] No layout shifts (CLS score 0)
- [ ] Lighthouse accessibility score >95

### Code Quality
- [ ] No hard-coded colors
- [ ] Consistent CSS variable usage
- [ ] Well-documented
- [ ] Reusable components
- [ ] Type-safe (TypeScript)

---

## Maintenance & Future Enhancements

### Adding New Components
1. Use CSS variables from the start
2. Test in both themes immediately
3. Follow the migration checklist
4. Document any special considerations

### Adding New Themes
To add a new theme (e.g., high contrast):
1. Add theme option to ThemeContext
2. Create CSS file: `src/styles/themes/high-contrast-theme.css`
3. Add data attribute: `[data-theme="high-contrast"]`
4. Update ThemeToggle component

### Adding Theme to User Profile
Future enhancement: Save theme preference to user profile in database

```typescript
// When user changes theme
const updateThemePreference = async (theme: Theme) => {
  setTheme(theme);

  // Also save to user profile
  await fetch('/api/user/preferences', {
    method: 'PATCH',
    body: JSON.stringify({ theme }),
  });
};
```

---

## Troubleshooting

### Issue: Flash of wrong theme on load
**Cause**: Theme being set after React hydration
**Solution**: Inline script in `<head>` that runs before hydration

### Issue: Theme not persisting
**Cause**: localStorage not being read/written correctly
**Solution**: Check browser console for errors, verify STORAGE_KEY constant

### Issue: Transitions too slow/fast
**Cause**: Wrong transition duration
**Solution**: Adjust `--transition-base` variable

### Issue: CSS variables not working in older browsers
**Cause**: IE11 doesn't support CSS variables
**Solution**: Add PostCSS plugin or drop IE11 support

### Issue: Clerk components not theming correctly
**Cause**: CSS variables don't work in JS appearance objects
**Solution**: Create separate appearance objects per theme

---

## Resources

### Documentation
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [React Context API](https://react.dev/reference/react/useContext)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Clerk Appearance Prop](https://clerk.com/docs/components/customization/overview)

### Tools
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

---

## Summary

This architecture provides:
✅ Unified theme system
✅ User preference persistence
✅ System preference detection
✅ Zero flash on load
✅ Smooth transitions
✅ Accessibility compliance
✅ Maintainable codebase
✅ Scalable to new themes

**Next Step**: Begin Phase 2.1 - Setup Theme System Infrastructure
