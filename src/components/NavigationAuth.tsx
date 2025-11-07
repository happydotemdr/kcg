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
    padding: '0.75rem 2rem',
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontWeight: 600,
    fontSize: '0.9375rem',
    cursor: 'pointer',
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'inherit',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = '#4338ca';
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = '#4f46e5';
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
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
          <button
            style={buttonStyles}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            Sign In
          </button>
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
        <UserButton
          appearance={{
            variables: {
              colorPrimary: '#4f46e5',
              colorText: '#1f2937',
              borderRadius: '0.5rem',
            }
          }}
        />
      </SignedIn>
    </>
  );
}
