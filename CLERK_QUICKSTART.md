# Clerk Integration - Quick Start Guide

This is a condensed guide to get Clerk authentication up and running quickly. For comprehensive documentation, see [CLERK_ARCHITECTURE.md](./CLERK_ARCHITECTURE.md).

## Prerequisites

- Node.js 18+ installed
- Astro 4.16+ project (already set up ✓)
- Clerk account (sign up at https://clerk.com)

## Step 1: Create Clerk Application

1. Go to https://dashboard.clerk.com
2. Click "Create Application"
3. Name it: "Keep Choosing Good"
4. Select authentication methods:
   - ✓ Email
   - ✓ Google
   - ✓ Microsoft
   <!-- GitHub and other providers will be evaluated in the future -->
5. Click "Create Application"

## Step 2: Get API Keys

1. In Clerk Dashboard, go to "API Keys"
2. Copy your keys from the "Quick Copy" section:
   - `Publishable Key` (starts with `pk_test_...`)
   - `Secret Key` (starts with `sk_test_...`)

## Step 3: Install Dependencies

```bash
npm install @clerk/astro @astrojs/node @astrojs/react react react-dom
npm install -D @types/react @types/react-dom
```

## Step 4: Configure Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Clerk keys:
   ```bash
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
   CLERK_SECRET_KEY=sk_test_your_key_here
   ```

## Step 5: Update Astro Config

Edit `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import clerk from '@clerk/astro';

export default defineConfig({
  site: 'https://keepchoosinggood.com',

  output: 'hybrid', // Changed from 'static'
  adapter: node({ mode: 'standalone' }), // Added

  integrations: [
    clerk(), // Added
    react(), // Added
  ],

  vite: {
    css: {
      transformer: 'lightningcss',
    },
  },
});
```

## Step 6: Create Middleware

Create `src/middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
]);

export const onRequest = clerkMiddleware((auth, context) => {
  const { userId, redirectToSignIn } = auth();
  const { request } = context;

  if (isProtectedRoute(request) && !userId) {
    return redirectToSignIn({ returnBackUrl: request.url });
  }
});
```

## Step 7: Create Auth Pages

### Sign-In Page

Create `src/pages/sign-in.astro`:

```astro
---
import BaseLayout from '@layouts/BaseLayout.astro';
import { SignIn } from '@clerk/astro/components';

export const prerender = false;
---

<BaseLayout title="Sign In - Keep Choosing Good">
  <div style="display: flex; justify-content: center; align-items: center; min-height: 80vh; padding: 2rem;">
    <SignIn
      client:load
      appearance={{
        variables: {
          colorPrimary: '#4f46e5',
        },
      }}
    />
  </div>
</BaseLayout>
```

### Sign-Up Page

Create `src/pages/sign-up.astro`:

```astro
---
import BaseLayout from '@layouts/BaseLayout.astro';
import { SignUp } from '@clerk/astro/components';

export const prerender = false;
---

<BaseLayout title="Sign Up - Keep Choosing Good">
  <div style="display: flex; justify-content: center; align-items: center; min-height: 80vh; padding: 2rem;">
    <SignUp
      client:load
      appearance={{
        variables: {
          colorPrimary: '#4f46e5',
        },
      }}
    />
  </div>
</BaseLayout>
```

## Step 8: Create Dashboard

Create `src/pages/dashboard/index.astro`:

```astro
---
import BaseLayout from '@layouts/BaseLayout.astro';
import { UserButton } from '@clerk/astro/components';

export const prerender = false;

const { userId, user } = Astro.locals.auth();

if (!userId) {
  return Astro.redirect('/sign-in');
}

const firstName = user?.firstName || 'User';
---

<BaseLayout title="Dashboard - Keep Choosing Good">
  <div style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
    <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
      <h1>Welcome back, {firstName}!</h1>
      <UserButton client:load />
    </header>

    <div>
      <h2>Your Dashboard</h2>
      <p>This is a protected page. Only authenticated users can see this.</p>
    </div>
  </div>
</BaseLayout>
```

## Step 9: Update Navigation

Edit `src/layouts/BaseLayout.astro` to add auth-aware navigation. Add this import at the top:

```astro
---
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/astro/components';
// ... existing imports
---
```

Then in your navigation, add:

```astro
<nav>
  <a href="/">Home</a>
  <a href="/about">About</a>
  <a href="/blog">Blog</a>

  <SignedOut client:load>
    <SignInButton client:load mode="modal">
      <button>Sign In</button>
    </SignInButton>
  </SignedOut>

  <SignedIn client:load>
    <a href="/dashboard">Dashboard</a>
    <UserButton client:load />
  </SignedIn>
</nav>
```

## Step 10: Test It Out!

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Visit http://localhost:4321

3. Try the authentication flow:
   - Click "Sign In" or "Sign Up"
   - Create an account
   - You should be redirected to `/dashboard`
   - Click the user button to see profile options

## Step 11: Configure Clerk Dashboard

1. Go to https://dashboard.clerk.com
2. Navigate to "User & Authentication"
3. Enable supported social providers:
   - Google
   - Microsoft
   - Note: Other social providers will be evaluated for support in the future
4. Customize email templates under "Emails"
5. Set up branding under "Customization"

## Troubleshooting

### Error: "Cannot read property 'auth' of undefined"

Make sure you've added `export const prerender = false;` to pages that use authentication.

### Error: "Invalid publishable key"

Double-check your environment variables in `.env` and make sure you're using the correct keys for your environment (test vs. live).

### Components not rendering

Make sure you've added the `client:load` directive to all Clerk React components.

### Middleware not protecting routes

Ensure `src/middleware.ts` exists and is properly configured. The middleware runs on every request.

## Next Steps

✓ Basic auth is working!

Now you can:
- Customize the look and feel
- Add user profile pages
- Implement role-based access control
- Set up webhooks for user events
- Add organization support

See [CLERK_ARCHITECTURE.md](./CLERK_ARCHITECTURE.md) for comprehensive documentation on advanced features.

## Resources

- **Clerk Dashboard**: https://dashboard.clerk.com
- **Clerk Docs**: https://clerk.com/docs
- **Astro Quickstart**: https://clerk.com/docs/quickstarts/astro
- **Discord Support**: https://clerk.com/discord

## Common Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run astro check
```

## Getting Help

- Check the [architecture document](./CLERK_ARCHITECTURE.md)
- Search Clerk's documentation
- Ask in Clerk's Discord community
- Check GitHub issues for @clerk/astro

Happy coding! 🚀
