import { SignIn, SignUp, UserProfile } from '@clerk/astro/react';
import { useEffect, useState } from 'react';

interface ClerkTheme {
  colorPrimary: string;
  colorText: string;
  colorTextSecondary: string;
  colorBackground: string;
  colorInputBackground: string;
  colorInputText: string;
}

/**
 * Hook to read CSS variables and convert them to Clerk theme colors.
 * Re-reads values when theme changes by listening to storage events.
 */
function useClerkTheme(): ClerkTheme {
  const [theme, setTheme] = useState<ClerkTheme>(() => getThemeColors());

  useEffect(() => {
    // Update theme when CSS variables change
    const updateTheme = () => {
      setTheme(getThemeColors());
    };

    // Listen for theme changes via storage event (from ThemeToggle component)
    window.addEventListener('storage', updateTheme);

    // Also listen for custom theme change event
    window.addEventListener('themechange', updateTheme);

    // Check theme on mount in case it changed before component loaded
    updateTheme();

    return () => {
      window.removeEventListener('storage', updateTheme);
      window.removeEventListener('themechange', updateTheme);
    };
  }, []);

  return theme;
}

/**
 * Reads CSS variables from the document and returns Clerk-compatible colors
 */
function getThemeColors(): ClerkTheme {
  if (typeof window === 'undefined') {
    // SSR fallback - return light theme defaults
    return {
      colorPrimary: '#4f46e5',
      colorText: '#1f2937',
      colorTextSecondary: '#6b7280',
      colorBackground: '#ffffff',
      colorInputBackground: '#ffffff',
      colorInputText: '#1f2937',
    };
  }

  const root = document.documentElement;
  const styles = getComputedStyle(root);

  // Read CSS variables
  const colorPrimary = styles.getPropertyValue('--color-primary').trim();
  const colorText = styles.getPropertyValue('--color-text').trim();
  const colorBackground = styles.getPropertyValue('--color-background').trim();
  const colorSurface = styles.getPropertyValue('--color-surface').trim();

  // Derive secondary text color (lighter version of text color)
  // In dark mode (green text), use a slightly dimmer green
  // In light mode (gray text), use a lighter gray
  const isDarkMode = colorText.startsWith('#00');
  const colorTextSecondary = isDarkMode ? '#00cc00' : '#6b7280';

  return {
    colorPrimary,
    colorText,
    colorTextSecondary,
    colorBackground,
    colorInputBackground: colorSurface || colorBackground,
    colorInputText: colorText,
  };
}

interface ThemeAwareSignInProps {
  appearance?: any;
}

export function ThemeAwareSignIn({ appearance = {} }: ThemeAwareSignInProps) {
  const themeColors = useClerkTheme();

  return (
    <SignIn
      appearance={{
        ...appearance,
        variables: {
          ...themeColors,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
          borderRadius: '0.5rem',
          fontSize: '1rem',
          ...appearance?.variables,
        },
      }}
    />
  );
}

interface ThemeAwareSignUpProps {
  appearance?: any;
}

export function ThemeAwareSignUp({ appearance = {} }: ThemeAwareSignUpProps) {
  const themeColors = useClerkTheme();

  return (
    <SignUp
      appearance={{
        ...appearance,
        variables: {
          ...themeColors,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
          borderRadius: '0.5rem',
          fontSize: '1rem',
          ...appearance?.variables,
        },
      }}
    />
  );
}

interface ThemeAwareUserProfileProps {
  appearance?: any;
}

export function ThemeAwareUserProfile({ appearance = {} }: ThemeAwareUserProfileProps) {
  const themeColors = useClerkTheme();

  return (
    <UserProfile
      appearance={{
        ...appearance,
        variables: {
          ...themeColors,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
          borderRadius: '0.5rem',
          fontSize: '1rem',
          ...appearance?.variables,
        },
      }}
    />
  );
}
