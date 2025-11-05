# Clerk.com Authentication Architecture
## Best-in-Class Integration Plan for Keep Choosing Good

**Version:** 1.0
**Date:** 2025-11-05
**Status:** Architecture Design

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Architecture Overview](#architecture-overview)
4. [Technical Implementation](#technical-implementation)
5. [Security & Best Practices](#security--best-practices)
6. [User Experience Flows](#user-experience-flows)
7. [Implementation Phases](#implementation-phases)
8. [Future Enhancements](#future-enhancements)

---

## Executive Summary

This document outlines a comprehensive, production-ready Clerk.com integration for the Keep Choosing Good website. Clerk provides enterprise-grade authentication with a developer-friendly experience, perfectly suited for an Astro-based application.

### Key Benefits

- **Zero-to-Production Auth**: Pre-built components eliminate months of custom development
- **Security First**: SOC 2 Type II compliant, automatic threat detection, session management
- **Excellent UX**: Beautiful, customizable UI components with social login support
- **Scalable**: From MVP to millions of users without architectural changes
- **Developer Experience**: Type-safe SDK, excellent docs, modern API design

### What We'll Achieve

- Complete user authentication (email/password, social logins, magic links)
- User profile management with customizable metadata
- Protected routes and role-based access control (RBAC)
- Organization support for future multi-tenant features
- Webhook integration for real-time event handling
- Fully customized branding to match Keep Choosing Good aesthetic

---

## Current State Analysis

### Existing Infrastructure

**Framework:** Astro 4.16.18 (TypeScript)
**Output Mode:** Static SSG (will migrate to Hybrid)
**Backend:** None (will add SSR capabilities)
**Dependencies:** Minimal (5 packages)
**Authentication:** None

### Required Changes

1. **Output Mode:** Static → Hybrid (enables server-side auth while keeping static pages fast)
2. **Adapter:** Add Node.js adapter for server-side rendering
3. **Integrations:** Add `@clerk/astro` and `@astrojs/react` (for Clerk components)
4. **Middleware:** Implement authentication middleware for route protection
5. **Environment:** Add Clerk API keys and configuration

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Public Pages │  │ Auth Pages   │  │ Protected    │      │
│  │ (Static)     │  │ (SSR)        │  │ Pages (SSR)  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ├──────────────────┴──────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│              Astro Application (Hybrid Mode)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Clerk Middleware Layer                   │   │
│  │  - Authentication Check                               │   │
│  │  - Session Validation                                 │   │
│  │  - Route Protection                                   │   │
│  └─────────────────────┬────────────────────────────────┘   │
│                        │                                     │
│  ┌─────────────────────▼────────────────────────────────┐   │
│  │           Server-Side Routes (API)                    │   │
│  │  - /api/auth/*     - Auth endpoints                   │   │
│  │  - /api/user/*     - User management                  │   │
│  │  - /api/webhooks/* - Clerk webhooks                   │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                    Clerk Service (External)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ User Store   │  │ Session Mgmt │  │ Organizations│       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Webhooks     │  │ Analytics    │  │ Admin Portal │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└───────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
src/
├── middleware.ts                      # Clerk authentication middleware
├── layouts/
│   ├── BaseLayout.astro              # Existing base layout (updated)
│   └── AuthLayout.astro              # New: Layout for auth pages
├── pages/
│   ├── index.astro                   # Public homepage (static)
│   ├── about.astro                   # Public about (static)
│   ├── blog.astro                    # Public blog (static)
│   ├── sign-in.astro                 # Sign-in page (SSR)
│   ├── sign-up.astro                 # Sign-up page (SSR)
│   ├── dashboard/
│   │   ├── index.astro               # User dashboard (SSR, protected)
│   │   └── profile.astro             # User profile (SSR, protected)
│   └── api/
│       ├── auth/
│       │   └── [...clerk].ts         # Clerk auth handlers
│       ├── user/
│       │   └── update.ts             # User management endpoints
│       └── webhooks/
│           └── clerk.ts              # Clerk webhook handler
├── components/
│   ├── analytics/                    # Existing analytics
│   └── auth/
│       ├── SignInButton.tsx          # React component (client:load)
│       ├── UserButton.tsx            # User menu component
│       ├── ProtectedContent.tsx      # Show/hide based on auth
│       └── OrganizationSwitcher.tsx  # For future org features
└── lib/
    ├── clerk.ts                      # Clerk configuration & helpers
    └── auth-utils.ts                 # Auth utility functions
```

---

## Technical Implementation

### 1. Environment Configuration

Create `.env` with Clerk credentials:

```bash
# Clerk Configuration
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional: Clerk Frontend API (auto-generated from dashboard)
PUBLIC_CLERK_SIGN_IN_URL=/sign-in
PUBLIC_CLERK_SIGN_UP_URL=/sign-up
PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Existing Analytics
GA_MEASUREMENT_ID=...
GOOGLE_ADS_ID=...
META_PIXEL_ID=...
TWITTER_PIXEL_ID=...
```

### 2. Package Installation

```bash
npm install @clerk/astro @astrojs/node @astrojs/react react react-dom
npm install -D @types/react @types/react-dom
```

**Dependencies:**
- `@clerk/astro` - Official Clerk Astro SDK
- `@astrojs/node` - Node.js adapter for SSR
- `@astrojs/react` - React integration for Clerk components
- `react`, `react-dom` - Required peer dependencies

### 3. Astro Configuration

**astro.config.mjs:**

```javascript
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import clerk from '@clerk/astro';

export default defineConfig({
  site: 'https://keepchoosinggood.com',

  // Hybrid mode: static by default, opt-in to SSR per page
  output: 'hybrid',

  // Node.js adapter for server-side rendering
  adapter: node({ mode: 'standalone' }),

  // Integrations
  integrations: [
    clerk({
      // Optional: customize Clerk behavior
      afterSignInUrl: '/dashboard',
      afterSignUpUrl: '/dashboard',
      signInUrl: '/sign-in',
      signUpUrl: '/sign-up',
    }),
    react(), // Required for Clerk React components
  ],

  // Existing Vite config
  vite: {
    css: {
      transformer: 'lightningcss',
    },
  },
});
```

### 4. Middleware Setup

**src/middleware.ts:**

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/user(.*)',
]);

// Define admin routes (for future use)
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
]);

export const onRequest = clerkMiddleware((auth, context) => {
  const { userId, redirectToSignIn } = auth();
  const { request } = context;

  // Protect dashboard and user API routes
  if (isProtectedRoute(request) && !userId) {
    return redirectToSignIn({ returnBackUrl: request.url });
  }

  // Future: Admin route protection
  if (isAdminRoute(request)) {
    // Check for admin role/permission
    const { orgRole } = auth();
    if (orgRole !== 'admin') {
      return new Response('Unauthorized', { status: 403 });
    }
  }
});
```

### 5. Authentication Pages

**src/pages/sign-in.astro:**

```astro
---
import BaseLayout from '@layouts/BaseLayout.astro';
import { SignIn } from '@clerk/astro/components';

export const prerender = false; // Force SSR for auth pages
---

<BaseLayout title="Sign In - Keep Choosing Good">
  <div class="auth-container">
    <SignIn
      client:load
      appearance={{
        elements: {
          rootBox: 'auth-root',
          card: 'auth-card',
        },
        variables: {
          colorPrimary: '#4f46e5', // Match brand colors
        },
      }}
    />
  </div>
</BaseLayout>

<style>
  .auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 2rem;
  }
</style>
```

**src/pages/sign-up.astro:**

```astro
---
import BaseLayout from '@layouts/BaseLayout.astro';
import { SignUp } from '@clerk/astro/components';

export const prerender = false; // Force SSR
---

<BaseLayout title="Sign Up - Keep Choosing Good">
  <div class="auth-container">
    <SignUp
      client:load
      appearance={{
        elements: {
          rootBox: 'auth-root',
          card: 'auth-card',
        },
        variables: {
          colorPrimary: '#4f46e5',
        },
      }}
    />
  </div>
</BaseLayout>

<style>
  .auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 2rem;
  }
</style>
```

### 6. Protected Dashboard

**src/pages/dashboard/index.astro:**

```astro
---
import BaseLayout from '@layouts/BaseLayout.astro';
import { UserButton } from '@clerk/astro/components';

export const prerender = false; // Force SSR

const { userId, user } = Astro.locals.auth();

// Double-check authentication (middleware handles redirect)
if (!userId) {
  return Astro.redirect('/sign-in');
}

// Access user data
const firstName = user?.firstName || 'User';
const email = user?.primaryEmailAddress?.emailAddress;
---

<BaseLayout title="Dashboard - Keep Choosing Good">
  <div class="dashboard">
    <header class="dashboard-header">
      <h1>Welcome back, {firstName}!</h1>
      <UserButton client:load />
    </header>

    <div class="dashboard-content">
      <section class="profile-card">
        <h2>Your Profile</h2>
        <p><strong>Email:</strong> {email}</p>
        <a href="/dashboard/profile">Edit Profile</a>
      </section>

      <section class="activity-card">
        <h2>Recent Activity</h2>
        <p>Your journey of choosing good starts here.</p>
      </section>
    </div>
  </div>
</BaseLayout>

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .dashboard-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
  }

  .profile-card,
  .activity-card {
    background: var(--surface);
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
</style>
```

### 7. User Profile Page

**src/pages/dashboard/profile.astro:**

```astro
---
import BaseLayout from '@layouts/BaseLayout.astro';
import { UserProfile } from '@clerk/astro/components';

export const prerender = false; // Force SSR

const { userId } = Astro.locals.auth();

if (!userId) {
  return Astro.redirect('/sign-in');
}
---

<BaseLayout title="Profile - Keep Choosing Good">
  <div class="profile-container">
    <UserProfile
      client:load
      appearance={{
        variables: {
          colorPrimary: '#4f46e5',
        },
      }}
    />
  </div>
</BaseLayout>

<style>
  .profile-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
  }
</style>
```

### 8. Navigation with Auth State

**Update src/layouts/BaseLayout.astro:**

```astro
---
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/astro/components';

// ... existing props
---

<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Existing head content -->
</head>
<body>
  <nav class="main-nav">
    <div class="nav-container">
      <a href="/" class="logo">Keep Choosing Good</a>

      <div class="nav-links">
        <a href="/about">About</a>
        <a href="/blog">Blog</a>

        <!-- Show when signed out -->
        <SignedOut client:load>
          <SignInButton client:load mode="modal">
            <button class="btn-primary">Sign In</button>
          </SignInButton>
        </SignedOut>

        <!-- Show when signed in -->
        <SignedIn client:load>
          <a href="/dashboard">Dashboard</a>
          <UserButton client:load />
        </SignedIn>
      </div>
    </div>
  </nav>

  <main>
    <slot />
  </main>

  <!-- Existing footer and analytics -->
</body>
</html>

<style>
  .main-nav {
    background: var(--surface);
    padding: 1rem 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .nav-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nav-links {
    display: flex;
    gap: 2rem;
    align-items: center;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
    padding: 0.5rem 1.5rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-primary:hover {
    opacity: 0.9;
  }
</style>
```

### 9. Webhook Handler (Advanced)

**src/pages/api/webhooks/clerk.ts:**

```typescript
import type { APIRoute } from 'astro';
import { Webhook } from 'svix';

export const POST: APIRoute = async ({ request }) => {
  // Get webhook secret from Clerk Dashboard
  const WEBHOOK_SECRET = import.meta.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response('Webhook secret not configured', { status: 500 });
  }

  // Get headers
  const svix_id = request.headers.get('svix-id');
  const svix_timestamp = request.headers.get('svix-timestamp');
  const svix_signature = request.headers.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  // Get raw body
  const payload = await request.text();

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  // Handle events
  const eventType = evt.type;

  switch (eventType) {
    case 'user.created':
      // Handle new user creation
      const { id, email_addresses, first_name, last_name } = evt.data;
      console.log('New user created:', { id, email_addresses, first_name, last_name });

      // TODO: Save to your database, send welcome email, etc.
      break;

    case 'user.updated':
      // Handle user updates
      console.log('User updated:', evt.data.id);
      break;

    case 'session.created':
      // Track user sessions
      console.log('New session:', evt.data.id);
      break;

    default:
      console.log('Unhandled event type:', eventType);
  }

  return new Response('Webhook processed', { status: 200 });
};
```

### 10. Utility Functions

**src/lib/clerk.ts:**

```typescript
import { clerkClient } from '@clerk/astro/server';

/**
 * Get full user details by ID
 */
export async function getFullUser(userId: string) {
  try {
    const user = await clerkClient.users.getUser(userId);
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Update user metadata
 */
export async function updateUserMetadata(
  userId: string,
  metadata: Record<string, any>
) {
  try {
    const user = await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: metadata,
    });
    return user;
  } catch (error) {
    console.error('Error updating metadata:', error);
    return null;
  }
}

/**
 * Check if user has specific role
 */
export function hasRole(user: any, role: string): boolean {
  return user?.publicMetadata?.role === role;
}

/**
 * Check if user is admin
 */
export function isAdmin(user: any): boolean {
  return hasRole(user, 'admin');
}
```

**src/lib/auth-utils.ts:**

```typescript
import type { AstroGlobal } from 'astro';

/**
 * Require authentication or redirect
 */
export function requireAuth(Astro: AstroGlobal, redirectTo = '/sign-in') {
  const { userId } = Astro.locals.auth();

  if (!userId) {
    return Astro.redirect(redirectTo);
  }

  return userId;
}

/**
 * Require admin role or return 403
 */
export async function requireAdmin(Astro: AstroGlobal) {
  const { userId, user } = Astro.locals.auth();

  if (!userId) {
    return Astro.redirect('/sign-in');
  }

  const isAdmin = user?.publicMetadata?.role === 'admin';

  if (!isAdmin) {
    return new Response('Forbidden', { status: 403 });
  }

  return userId;
}

/**
 * Get current user or null
 */
export function getCurrentUser(Astro: AstroGlobal) {
  return Astro.locals.auth();
}
```

---

## Security & Best Practices

### 1. Environment Variable Management

**Best Practices:**
- Never commit `.env` files to version control
- Use different Clerk instances for dev/staging/production
- Rotate secret keys periodically
- Use Clerk's built-in development environment for testing

**Environment Setup:**

```bash
# Development
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Production (via hosting platform env vars)
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

### 2. Route Protection Strategy

**Three Levels of Protection:**

1. **Middleware Level** (Primary)
   - Fast, runs before page rendering
   - Redirects unauthenticated users
   - Best for broad route protection

2. **Page Level** (Secondary)
   - Double-check in page component
   - Access user data for rendering
   - Handle edge cases

3. **Component Level** (Tertiary)
   - `<SignedIn>` / `<SignedOut>` components
   - Show/hide UI elements
   - Client-side reactivity

### 3. Session Management

**Clerk Handles:**
- Automatic session refresh
- Multi-device session management
- Session token rotation
- Secure cookie handling
- Session activity tracking

**Configuration in Clerk Dashboard:**
- Session lifetime: 7 days (default, configurable)
- Inactive period: 30 minutes (default)
- Multi-session handling: Allow/Block
- Session token format: JWT

### 4. Data Privacy & GDPR Compliance

**User Data Handling:**
- Clerk is SOC 2 Type II compliant
- GDPR and CCPA compliant
- Data residency options (EU/US)
- Built-in user data export
- Account deletion support

**Metadata Strategy:**

```typescript
// Public Metadata (visible to frontend)
{
  role: 'user' | 'admin',
  preferences: {
    theme: 'light' | 'dark',
    notifications: boolean,
  },
}

// Private Metadata (backend only)
{
  stripeCustomerId: string,
  subscriptionTier: string,
  internalNotes: string,
}

// Unsafe Metadata (set during signup)
{
  referralCode: string,
  utmSource: string,
}
```

### 5. Authentication Methods

**Recommended Setup:**

```typescript
// Enable in Clerk Dashboard → User & Authentication → Email, Phone, Username

Primary Methods:
✓ Email + Password
✓ Email OTP (Magic Link)
✓ Google OAuth
✓ Microsoft OAuth

Evaluating for Future:
○ GitHub OAuth - evaluating for future
○ Apple Sign In - evaluating for future
○ Other providers - evaluating for future
○ Phone (SMS) - evaluating for future

Security Features:
✓ Email verification required
✓ Multi-factor authentication (optional for users)
✓ Password strength requirements
✓ Bot detection
✓ Rate limiting
```

### 6. Error Handling

**Example Error Boundary:**

```typescript
// src/pages/api/user/update.ts
import type { APIRoute } from 'astro';
import { clerkClient } from '@clerk/astro/server';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { userId } = locals.auth();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();

    // Update user
    const user = await clerkClient.users.updateUser(userId, data);

    return new Response(
      JSON.stringify({ success: true, user }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('User update error:', error);

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

---

## User Experience Flows

### 1. New User Registration

```
User visits site → Clicks "Sign Up" →
→ Clerk SignUp component modal/page
→ User enters email + password (or social)
→ Email verification sent
→ User verifies email
→ Redirect to /dashboard
→ Optional: Onboarding flow
```

### 2. Existing User Sign In

```
User visits site → Clicks "Sign In" →
→ Clerk SignIn component
→ Email + password (or social, magic link)
→ Optional: MFA challenge
→ Redirect to /dashboard (or return URL)
```

### 3. Password Reset

```
User on sign-in page → "Forgot password?" →
→ Enter email
→ Receive reset email
→ Click link → Enter new password
→ Redirect to sign-in
→ Sign in with new password
```

### 4. Profile Management

```
User in dashboard → Click profile/avatar →
→ UserButton dropdown opens
→ "Manage account" →
→ Clerk UserProfile component
→ Edit: Name, email, password, profile image
→ Add: Additional emails, phone numbers
→ Security: Enable MFA, view sessions
```

### 5. Session Expiration

```
User inactive for 30 minutes →
→ Session expires (configurable)
→ Next action triggers re-authentication
→ Clerk shows sign-in modal
→ User signs in → Returns to original action
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Basic authentication working

- [ ] Install Clerk SDK and dependencies
- [ ] Configure `astro.config.mjs` for hybrid mode
- [ ] Set up environment variables
- [ ] Create middleware for route protection
- [ ] Build sign-in and sign-up pages
- [ ] Test authentication flow end-to-end
- [ ] Deploy to staging environment

**Deliverables:**
- Working sign-in/sign-up
- Protected dashboard route
- User can see their profile

### Phase 2: User Experience (Week 2)
**Goal:** Polish and enhance UX

- [ ] Update navigation with auth state
- [ ] Build comprehensive dashboard
- [ ] Add user profile management
- [ ] Customize Clerk component styling
- [ ] Add loading states and error handling
- [ ] Implement responsive design for auth pages
- [ ] Add analytics tracking for auth events

**Deliverables:**
- Beautiful, branded auth experience
- Full dashboard with user info
- Mobile-responsive auth flows

### Phase 3: Advanced Features (Week 3)
**Goal:** Power features and integrations

- [ ] Set up Clerk webhooks
- [ ] Implement user metadata system
- [ ] Add role-based access control (admin/user)
- [ ] Create admin dashboard (if needed)
- [ ] Set up email template customization
- [ ] Configure MFA options
- [ ] Configure social login providers (Google and Microsoft)

**Deliverables:**
- Webhook integration for user events
- RBAC system
- Custom email templates
- Multi-factor authentication

### Phase 4: Production Hardening (Week 4)
**Goal:** Production-ready deployment

- [ ] Security audit and penetration testing
- [ ] Performance optimization
- [ ] Error monitoring setup (Sentry/etc)
- [ ] Documentation for team
- [ ] User acceptance testing
- [ ] Production deployment
- [ ] Post-launch monitoring

**Deliverables:**
- Production deployment
- Monitoring dashboards
- Team documentation
- Incident response plan

---

## Future Enhancements

### Organizations & Multi-Tenancy

**Use Case:** Support for teams, companies, or communities

```typescript
// Enable organizations in Clerk Dashboard

// User creates/joins organization
<OrganizationSwitcher client:load />

// Check organization membership
const { orgId, orgRole } = Astro.locals.auth();

// Organization-specific metadata
{
  orgId: 'org_xxx',
  role: 'admin' | 'member',
  permissions: ['read', 'write', 'delete'],
}
```

**Implementation:**
- Organization switcher in navigation
- Org-specific dashboards
- Permission-based feature flags
- Org-level billing integration

### User Analytics & Insights

**Integration Options:**
- Clerk Dashboard: Built-in user analytics
- Segment: Send Clerk events to Segment
- Mixpanel: User behavior tracking
- Custom: Webhook → Your analytics DB

**Events to Track:**
- User registration (source, referral)
- Sign-in frequency
- Feature usage
- Profile completeness
- Conversion events

### Email Communication

**Customization:**
- Branded email templates in Clerk Dashboard
- Custom SMTP server (optional)
- Transactional emails (welcome, reset, verify)
- Marketing emails (via separate service)

**Best Practice:**
- Keep auth emails simple and clear
- Use separate service for marketing (SendGrid, Mailchimp)
- A/B test email copy in Clerk

### Mobile App Support

**Clerk Native SDKs:**
- React Native SDK
- iOS SDK (Swift)
- Android SDK (Kotlin)

**Shared Authentication:**
- Same Clerk instance across web/mobile
- Universal sessions
- Deep linking support
- Biometric authentication on mobile

### Advanced Security Features

**Available in Clerk:**
- Bot detection and CAPTCHA
- Device fingerprinting
- Anomaly detection
- IP blocking
- Rate limiting
- Custom authentication rules

**Future Implementation:**
- Risk-based authentication
- Step-up authentication for sensitive actions
- Security event webhooks
- Compliance reporting

### Internationalization (i18n)

**Clerk Supports:**
- 30+ languages out of the box
- Customizable translations
- Locale-based formatting
- RTL language support

**Implementation:**

```typescript
// astro.config.mjs
clerk({
  localization: {
    locale: 'en-US', // or detect from user
  },
})

// Dynamic locale in component
<SignIn
  client:load
  localization={{ locale: userLocale }}
/>
```

### Integration Ecosystem

**Clerk Integrates With:**
- Stripe (payments, subscriptions)
- Supabase (database, storage)
- Hasura (GraphQL)
- Firebase (backend services)
- Vercel (deployment)
- Netlify (deployment)

**Future Integrations:**
- Payment processing → Clerk user = Stripe customer
- Database → Sync user data to Supabase
- CRM → Send user events to HubSpot/Salesforce

---

## Appendix

### A. Clerk Dashboard Configuration Checklist

**User & Authentication:**
- [x] Enable email/password
- [x] Enable social providers (Google, Microsoft)
- [x] Set password requirements
- [ ] Configure MFA options
- [ ] Set session lifetime
- [ ] Configure email verification

**Application Settings:**
- [x] Set application name
- [x] Configure domain
- [x] Set up redirect URLs
- [ ] Add staging/production instances
- [ ] Configure CORS settings

**Security:**
- [ ] Review rate limits
- [ ] Enable bot detection
- [ ] Configure allowed redirect URLs
- [ ] Set up webhook endpoints
- [ ] Review security logs

**Branding:**
- [ ] Upload logo
- [ ] Set brand colors
- [ ] Customize email templates
- [ ] Configure social preview images

### B. Environment Variables Reference

```bash
# Required
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional - Clerk Configuration
PUBLIC_CLERK_SIGN_IN_URL=/sign-in
PUBLIC_CLERK_SIGN_UP_URL=/sign-up
PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/dashboard
PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard

# Optional - Webhooks
CLERK_WEBHOOK_SECRET=whsec_...

# Optional - Advanced
CLERK_API_URL=https://api.clerk.com
CLERK_API_VERSION=v1
CLERK_JS_VERSION=latest
```

### C. TypeScript Types

```typescript
// User type (from Clerk)
interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: EmailAddress[];
  primaryEmailAddressId: string | null;
  profileImageUrl: string;
  publicMetadata: Record<string, any>;
  privateMetadata: Record<string, any>;
  unsafeMetadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Auth object (from Astro.locals)
interface Auth {
  userId: string | null;
  sessionId: string | null;
  user: ClerkUser | null;
  orgId: string | null;
  orgRole: string | null;
  isAuthenticated: boolean;
}

// Custom metadata types
interface PublicMetadata {
  role: 'user' | 'admin' | 'moderator';
  preferences: UserPreferences;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  newsletter: boolean;
}
```

### D. Useful Resources

**Official Documentation:**
- Clerk Docs: https://clerk.com/docs
- Astro Quickstart: https://clerk.com/docs/quickstarts/astro
- Astro SDK Reference: https://clerk.com/docs/references/astro/overview

**Community:**
- Clerk Discord: https://clerk.com/discord
- Clerk GitHub: https://github.com/clerk
- Stack Overflow: Tag `clerk`

**Support:**
- Clerk Dashboard → Support (chat)
- Email: support@clerk.com
- Status: https://status.clerk.com

---

## Conclusion

This architecture provides a solid foundation for enterprise-grade authentication with Clerk.com. The phased implementation approach allows for incremental delivery while maintaining production quality at each step.

**Next Steps:**
1. Review and approve this architecture
2. Set up Clerk account and obtain API keys
3. Create a staging environment
4. Begin Phase 1 implementation
5. Regular check-ins during each phase

**Success Metrics:**
- Auth conversion rate > 80%
- Sign-up completion < 30 seconds
- Zero security incidents
- 99.9% authentication uptime
- Positive user feedback on auth experience

**Questions or Concerns:**
Please review this document and provide feedback. Once approved, we'll begin implementation following the phased approach outlined above.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Author:** Claude (AI Assistant)
**Status:** Ready for Review
