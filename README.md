# PromptOS

GitHub + Vercel, for AI prompts. Store, version, test, and deploy AI prompts the same way engineers manage code.

## Features

- **Prompt Library** — Store and organize prompts with semantic search
- **Version Control** — Every save creates an immutable version with diff viewer
- **A/B Testing** — Run experiments comparing prompt versions
- **Analytics** — Track latency, tokens, and costs
- **Public API** — Serve prompts to external apps via REST API
- **Team Collaboration** — Invite teammates with roles (Owner/Editor/Viewer)

## Tech Stack

- **Next.js 15** — App Router, React Server Components
- **Tailwind CSS v4** — Styling
- **shadcn/ui** — Component library
- **tRPC** — Type-safe API
- **Drizzle + Neon** — Database ORM
- **Auth.js** — Authentication
- **OpenRouter** — AI models (free tier)
- **Inngest** — Background jobs
- **pgvector** — Semantic search
- **Upstash** — Cache + rate limiting
- **UploadThing** — File attachments
- **Stripe** — Billing (Pro plan)

## Local Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/your-org/promptos.git
   cd promptos
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env.local` and fill in the values:

   ```
   DATABASE_URL=postgresql://...
   AUTH_SECRET=生成: openssl rand -base64 32
   AUTH_GITHUB_ID=from github.com/settings/developers
   AUTH_GITHUB_SECRET=from github.com/settings/developers
   OPENROUTER_API_KEY=from openrouter.ai
   INNGEST_EVENT_KEY=from dashboard.inngest.com
   INNGEST_SIGNING_KEY=from dashboard.inngest.com
   UPSTASH_REDIS_REST_URL=from console.upstash.com
   UPSTASH_REDIS_REST_TOKEN=from console.upstash.com
   NEXT_PUBLIC_SENTRY_DSN=from sentry.io
   NEXT_PUBLIC_POSTHOG_KEY=from app.posthog.com
   STRIPE_SECRET_KEY=from dashboard.stripe.com
   STRIPE_PRICE_ID=price_xxx
   UPLOADTHING_TOKEN=from uploadthing.com
   ```

4. **Push database schema**
   ```bash
   pnpm db:push
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

   Open http://localhost:3000

## Deployment

Deploy to Vercel:

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Contributing

1. Fork the repo
2. Create a feature branch
3. Submit a PR

## License

MIT