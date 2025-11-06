# Keep Choosing Good (KCG)

A modern AI-powered web application built with Astro, React, and the Anthropic Claude SDK. Features a production-ready chat interface with real-time streaming, multimodal support, conversation management, and secure user authentication via Clerk.com.

## Features

### AI Chat Experience
- **Real-time Streaming** - Server-Sent Events (SSE) for instant response streaming
- **Multimodal Support** - Upload and analyze images with Claude's vision capabilities
- **Conversation Management** - Persistent chat history with ability to resume conversations
- **Modern UI** - Responsive, accessible interface built with React and Tailwind CSS
- **Context-Aware** - Intelligent conversation pruning following Anthropic's best practices

### Authentication & User Management
- **Clerk.com Integration** - Production-ready authentication with social logins (Google, Microsoft)
- **Protected Routes** - Middleware-based route protection for secure areas
- **User Dashboard** - Personalized user dashboard with profile management
- **Webhook Support** - Real-time user event handling for database synchronization
- **Role-Based Access** - Support for admin roles and custom permissions

### Infrastructure
- **Built with Astro** - Fast hybrid rendering (SSR + SSG) with API routes
- **Claude SDK Integration** - Using official @anthropic-ai/sdk for TypeScript
- **File-based Storage** - JSON-based conversation persistence
- **Analytics Ready** - Pre-configured integrations for:
  - Google Analytics 4 (GA4)
  - Google Ads / AdSense
  - Meta (Facebook) Pixel
  - Twitter/X Pixel
- **TypeScript** - Full type safety across frontend and backend
- **Responsive Design** - Mobile-first approach with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy the `.env.example` file to `.env`
   - Add your API keys and configuration:

```env
# Anthropic Claude API (Required for chat)
ANTHROPIC_API_KEY=sk-ant-...

# Clerk Authentication (Required for auth features)
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Analytics (Optional)
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GOOGLE_ADS_ID=ca-pub-XXXXXXXXXXXXXXXX
META_PIXEL_ID=1234567890
TWITTER_PIXEL_ID=o1abc
```

Get your API keys from:
- Anthropic: https://console.anthropic.com/settings/keys
- Clerk: https://dashboard.clerk.com/

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:4321`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run astro` - Run Astro CLI commands

## Project Structure

```
/
├── public/              # Static assets (images, fonts, etc.)
├── src/
│   ├── components/      # Reusable components
│   │   └── analytics/   # Analytics and tracking components
│   ├── layouts/         # Page layouts
│   │   └── BaseLayout.astro
│   └── pages/          # File-based routing
│       ├── index.astro  # Homepage
│       ├── about.astro  # About page
│       └── blog.astro   # Blog listing
├── astro.config.mjs    # Astro configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies and scripts
```

## Analytics Setup Guide

### Google Analytics 4

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property
3. Copy your Measurement ID (format: `G-XXXXXXXXXX`)
4. Add it to your `.env` file

### Google Ads / AdSense

1. Sign up for [Google AdSense](https://www.google.com/adsense/)
2. Get your publisher ID (format: `ca-pub-XXXXXXXXXXXXXXXX`)
3. Add it to your `.env` file

### Meta (Facebook) Pixel

1. Go to [Facebook Events Manager](https://business.facebook.com/events_manager)
2. Create a new pixel
3. Copy your Pixel ID (numeric)
4. Add it to your `.env` file

### Twitter/X Pixel

1. Go to [Twitter Ads](https://ads.twitter.com/)
2. Create a new pixel
3. Copy your Pixel ID
4. Add it to your `.env` file

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Make sure to add your environment variables in the Vercel dashboard!

### Netlify

```bash
npm install -g netlify-cli
netlify deploy
```

Add environment variables in the Netlify dashboard.

### Other Platforms

Astro can be deployed to any static hosting platform:
- Cloudflare Pages
- AWS S3 + CloudFront
- GitHub Pages
- And many more!

See the [Astro deployment docs](https://docs.astro.build/en/guides/deploy/) for more options.

## AI Chat Features

The `/chat` page provides a complete AI chat experience:

- ✅ Real-time streaming responses from Claude
- ✅ Upload and analyze images (vision support)
- ✅ Persistent conversation history
- ✅ Start new chats or resume existing ones
- ✅ Delete conversations
- ✅ Auto-generated conversation titles
- ✅ Responsive, modern UI with Tailwind CSS
- ✅ Full TypeScript type safety

## Authentication Features

Secure user authentication powered by Clerk.com:

- ✅ Sign up / Sign in with email
- ✅ Social login (Google, Microsoft)
- ✅ Protected routes and middleware
- ✅ User dashboard at `/dashboard`
- ✅ Profile management at `/dashboard/profile`
- ✅ Webhook integration for user events
- ✅ Role-based access control

## Future Roadmap

Additional features planned:

- [ ] Agent capabilities with tool use (calculator, search, etc.)
- [ ] Custom system prompts per conversation
- [ ] Model selection in UI
- [ ] Export conversations (JSON, Markdown)
- [ ] Search conversation history
- [ ] Token usage tracking and display
- [ ] Prompt caching for long conversations
- [ ] Database integration for user data persistence
- [ ] Organization/multi-tenancy support
- [ ] Add a CMS integration for blog content
- [ ] Newsletter signup functionality

## Learn More About Astro

- [Astro Documentation](https://docs.astro.build)
- [Astro Discord](https://astro.build/chat)
- [Astro GitHub](https://github.com/withastro/astro)

## License

MIT
