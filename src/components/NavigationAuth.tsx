/**
 * NavigationAuth Component
 * Wraps Clerk components to ensure proper client-side hydration
 */
import React from 'react';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/astro/react';

interface NavigationAuthProps {
  isInNav?: boolean;
}

export default function NavigationAuth({ isInNav = false }: NavigationAuthProps) {
  const buttonStyles: React.CSSProperties = {
    padding: '0.5rem 1.5rem',
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  };

  return (
    <>
      <SignedOut>
        {isInNav && (
          <>
            <a href="/" className="nav-link">Home</a>
            <a href="/about" className="nav-link">About</a>
            <a href="/blog" className="nav-link">Blog</a>
          </>
        )}
        <SignInButton mode="modal">
          <button style={buttonStyles}>Sign In</button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        {isInNav && (
          <>
            <a href="/dashboard" className="nav-link">Dashboard</a>
            <a href="/chat" className="nav-link">Claude Chat</a>
            <a href="/chatgpt" className="nav-link">ChatGPT</a>
          </>
        )}
        <UserButton />
      </SignedIn>
    </>
  );
}
