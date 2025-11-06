# Keep Choosing Good (KCG)

A modern AI-powered chat application built with Astro, React, and the Anthropic Claude SDK. Features a production-ready chat interface with real-time streaming, multimodal support, conversation management, and robust PostgreSQL 17 database integration.

## Features

### AI Chat Experience
- **Real-time Streaming** - Server-Sent Events (SSE) for instant response streaming
- **Multimodal Support** - Upload and analyze images with Claude's vision capabilities
- **Conversation Management** - Persistent chat history with ability to resume conversations
- **Modern UI** - Responsive, accessible interface built with React and Tailwind CSS
- **Context-Aware** - Intelligent conversation pruning following Anthropic's best practices

### Database & Infrastructure
- **PostgreSQL 17 Database** - Robust database integration with connection pooling
- **Clerk.com Ready** - Pre-configured database schema for user authentication
- **Type-safe Operations** - Repository pattern with comprehensive TypeScript definitions
- **Migration System** - Version-controlled database schema management
- **Built with Astro** - Fast SSR with API routes for backend functionality
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
- PostgreSQL 17 (optional, for database features)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy the `.env.example` file to `.env`
   - Add your Anthropic API key (required for chat functionality):

```env
# Anthropic Claude API (Required for chat)
ANTHROPIC_API_KEY=sk-ant-...

# Analytics (Optional)
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GOOGLE_ADS_ID=ca-pub-XXXXXXXXXXXXXXXX
META_PIXEL_ID=1234567890
TWITTER_PIXEL_ID=o1abc

# Database (Optional)
DATABASE_URL=postgresql://username:password@localhost:5432/kcg_db
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:4321`

### Database Setup (Optional)

If you want to use the database features:

1. Set up PostgreSQL 17 and create a database
2. Configure database connection in `.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/kcg_db
```

3. Initialize the database:
```bash
npm run db:init
```

4. (Optional) Seed with sample data:
```bash
npm run db:seed
```

For detailed database documentation, see [DATABASE.md](DATABASE.md)

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run astro` - Run Astro CLI commands

### Database
- `npm run db:test` - Test database connection
- `npm run db:init` - Initialize database schema
- `npm run db:seed` - Seed database with sample data

## Project Structure

```
/
├── public/              # Static assets (images, fonts, etc.)
├── scripts/             # Database and utility scripts
│   ├── db-init.ts      # Database initialization
│   ├── db-test.ts      # Database connection test
│   └── db-seed.ts      # Sample data seeder
├── src/
│   ├── components/      # Reusable components
│   │   └── analytics/   # Analytics and tracking components
│   ├── layouts/         # Page layouts
│   │   └── BaseLayout.astro
│   ├── lib/
│   │   └── db/         # Database module
│   │       ├── client.ts         # Database client & pooling
│   │       ├── config.ts         # Database configuration
│   │       ├── types.ts          # TypeScript types
│   │       ├── schema.sql        # PostgreSQL schema
│   │       ├── migrations.ts     # Migration runner
│   │       └── repositories/     # Data access layer
│   │           ├── users.ts      # User operations
│   │           └── webhooks.ts   # Webhook operations
│   └── pages/          # File-based routing
│       ├── index.astro  # Homepage with chat interface
│       └── api/         # API endpoints
│           └── chat.ts  # Claude AI chat endpoint
├── astro.config.mjs    # Astro configuration
├── tsconfig.json       # TypeScript configuration
├── DATABASE.md         # Database documentation
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

## Future Roadmap

This application is designed with future expansion in mind:

- [x] **AI Chat Integration** - Real-time streaming chat with Claude
- [x] **Database Integration** - PostgreSQL 17 with Clerk.com schema
- [ ] Integrate Clerk.com user authentication
- [ ] Store chat conversations in database
- [ ] Implement user dashboard with chat history
- [ ] Add conversation sharing capabilities
- [ ] Add a CMS integration (Sanity, Contentful, or Markdown)
- [ ] Implement blog post pages with dynamic routing
- [ ] Add newsletter signup functionality
- [ ] Expand with more AI-powered features

## Learn More About Astro

- [Astro Documentation](https://docs.astro.build)
- [Astro Discord](https://astro.build/chat)
- [Astro GitHub](https://github.com/withastro/astro)

## License

MIT
