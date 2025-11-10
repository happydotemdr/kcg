import { SignIn, SignUp, UserProfile } from '@clerk/astro/react';
import { useState } from 'react';

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
 * Reads static light theme variables once on mount.
 */
function useClerkTheme(): ClerkTheme {
  const [theme] = useState<ClerkTheme>(() => getThemeColors());
  return theme;
}

/**
 * Reads CSS variables from the document and returns Clerk-compatible colors.
 * Light theme only - static configuration.
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

  return {
    colorPrimary,
    colorText,
    colorTextSecondary: '#6b7280',
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
