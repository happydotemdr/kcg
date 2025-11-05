# Keep Choosing Good (KCG)

A modern, performance-focused content website built with Astro, designed for future expansion into a full web application.

## Features

- **Built with Astro** - Lightning-fast static site generation with the islands architecture
- **Analytics Ready** - Pre-configured integrations for:
  - Google Analytics 4 (GA4)
  - Google Ads / AdSense
  - Meta (Facebook) Pixel
  - Twitter/X Pixel
- **SEO Optimized** - Meta tags, Open Graph, Twitter Cards, and canonical URLs
- **TypeScript** - Strict type checking for reliability
- **Responsive Design** - Mobile-first approach with modern CSS
- **Content-Focused** - Perfect starting point for blogs, marketing sites, and content platforms

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure your analytics (optional but recommended):
   - Copy the `.env.example` file to `.env`
   - Add your tracking IDs to `.env`:

```env
# Google Analytics 4
GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Google Ads / AdSense
GOOGLE_ADS_ID=ca-pub-XXXXXXXXXXXXXXXX

# Meta (Facebook) Pixel
META_PIXEL_ID=1234567890

# Twitter/X Pixel
TWITTER_PIXEL_ID=o1abc
```

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

## Future Roadmap

This site is designed with future expansion in mind:

- [ ] Add a CMS integration (Sanity, Contentful, or Markdown)
- [ ] Implement blog post pages with dynamic routing
- [ ] Add newsletter signup functionality
- [ ] Integrate user authentication
- [ ] Expand into a full web application with interactive features
- [ ] Add database integration
- [ ] Implement user dashboard

## Learn More About Astro

- [Astro Documentation](https://docs.astro.build)
- [Astro Discord](https://astro.build/chat)
- [Astro GitHub](https://github.com/withastro/astro)

## License

MIT
