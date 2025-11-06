# Keep Choosing Good (KCG)

A modern AI-powered chat application built with Astro, React, and the Anthropic Claude SDK. Features a production-ready chat interface with real-time streaming, multimodal support, and conversation management.

## Features

### AI Chat Experience
- **Real-time Streaming** - Server-Sent Events (SSE) for instant response streaming
- **Multimodal Support** - Upload and analyze images with Claude's vision capabilities
- **Conversation Management** - Persistent chat history with ability to resume conversations
- **Modern UI** - Responsive, accessible interface built with React and Tailwind CSS
- **Context-Aware** - Intelligent conversation pruning following Anthropic's best practices

### Infrastructure
- **Built with Astro** - Fast SSR with API routes for backend functionality
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
   - Add your Anthropic API key (required for chat functionality):

```env
# Anthropic Claude API (Required)
ANTHROPIC_API_KEY=sk-ant-...

# Analytics (Optional)
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GOOGLE_ADS_ID=ca-pub-XXXXXXXXXXXXXXXX
META_PIXEL_ID=1234567890
TWITTER_PIXEL_ID=o1abc
```

Get your Anthropic API key from: https://console.anthropic.com/settings/keys

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

## Future Roadmap

Additional features planned:

- [ ] Agent capabilities with tool use (calculator, search, etc.)
- [ ] Custom system prompts per conversation
- [ ] Model selection in UI
- [ ] Export conversations (JSON, Markdown)
- [ ] Search conversation history
- [ ] Token usage tracking and display
- [ ] User authentication and multi-user support
- [ ] Prompt caching for long conversations
- [ ] Add a CMS integration for blog content
- [ ] Newsletter signup functionality

## Learn More About Astro

- [Astro Documentation](https://docs.astro.build)
- [Astro Discord](https://astro.build/chat)
- [Astro GitHub](https://github.com/withastro/astro)

## License

MIT
