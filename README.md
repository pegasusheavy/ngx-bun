# @pegasusheavy/ngx-bun

<div align="center">
  <img src="https://angular.io/assets/images/logos/angular/angular.svg" width="80" alt="Angular" />
  <span style="font-size: 48px; margin: 0 20px;">+</span>
  <img src="https://bun.sh/logo.svg" width="80" alt="Bun" />
</div>

<br />

<div align="center">
  <strong>High-performance SSR/SSG adapter for Angular 19+ using Bun's built-in server</strong>
</div>

<br />

<div align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#api">API</a> •
  <a href="#prerendering">Prerendering</a>
</div>

---

## Features

- 🚀 **Blazing Fast** - Leverages Bun's high-performance HTTP server and runtime
- 📦 **Full SSR Support** - Complete server-side rendering for Angular 19+
- 🏗️ **SSG/Prerendering** - Generate static HTML files at build time
- 🔄 **Automatic Hydration** - Seamless client-side hydration
- 📁 **Static File Serving** - Optimized static asset serving with compression
- 💾 **Built-in Caching** - LRU cache for rendered pages
- 🛠️ **Angular CLI Integration** - Schematics for easy setup with `ng add`
- 🔧 **Custom Builders** - Angular CLI builders for development and production

## Requirements

- **Angular** 19.0.0 or higher
- **Bun** 1.0.0 or higher
- **Node.js** 20.0.0 or higher (for Angular CLI)

## Installation

### Using Angular CLI (Recommended)

```bash
ng add @pegasusheavy/ngx-bun
```

This will:
1. Install the package and dependencies
2. Generate the server file (`server.ts`)
3. Create server-side configuration files
4. Update `angular.json` with SSR targets
5. Add npm scripts for development and production

### Manual Installation

```bash
# Install the package
pnpm add @pegasusheavy/ngx-bun

# Install peer dependencies
pnpm add @angular/ssr @angular/platform-server
```

## Quick Start

### 1. Add SSR to your Angular project

```bash
ng add @pegasusheavy/ngx-bun
```

### 2. Start the development server

```bash
pnpm dev:ssr
```

### 3. Build for production

```bash
pnpm build:ssr
```

### 4. Serve production build

```bash
pnpm serve:ssr
```

## Configuration

### Server Configuration

The generated `server.ts` file can be customized:

```typescript
import { createBunServer, createBunAngularEngine } from '@pegasusheavy/ngx-bun';

const engine = createBunAngularEngine({
  bootstrap: () => import('./src/main.server'),
  browserDistFolder: './dist/my-app/browser',

  // Cache configuration
  enableCache: true,
  maxCacheSize: 100,
  cacheTtl: 300_000, // 5 minutes
});

createBunServer({
  engine,
  port: 4000,
  hostname: 'localhost',

  // Enable request logging
  logging: true,

  // Routes to skip SSR (client-only)
  clientOnlyRoutes: ['/admin/*'],

  // Development mode
  development: process.env.NODE_ENV !== 'production',
});
```

### Route Rendering Configuration

Configure how each route is rendered in `app.routes.server.ts`:

```typescript
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Client-side only (no SSR)
  { path: 'admin/**', renderMode: RenderMode.Client },

  // Prerendered at build time (SSG)
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'blog/:slug', renderMode: RenderMode.Prerender },

  // Server-side rendered on each request (SSR)
  { path: '**', renderMode: RenderMode.Server },
];
```

### Angular.json Targets

The schematic adds these targets to your `angular.json`:

```json
{
  "serve-ssr": {
    "builder": "@pegasusheavy/ngx-bun:serve",
    "options": {
      "browserTarget": "my-app:build",
      "port": 4000
    }
  },
  "prerender": {
    "builder": "@pegasusheavy/ngx-bun:prerender",
    "options": {
      "browserTarget": "my-app:build:production",
      "routes": ["/", "/about", "/contact"]
    }
  }
}
```

## API

### `createBunAngularEngine(options)`

Creates the Angular SSR engine.

```typescript
interface BunAngularEngineOptions {
  // Angular bootstrap function
  bootstrap: () => Promise<ApplicationRef>;

  // Path to browser distribution
  browserDistFolder: string;

  // Path to server distribution (optional)
  serverDistFolder?: string;

  // Custom index.html path (optional)
  indexHtml?: string;

  // Additional providers (optional)
  providers?: Provider[];

  // Enable render caching (default: true)
  enableCache?: boolean;

  // Max cache entries (default: 100)
  maxCacheSize?: number;

  // Cache TTL in ms (default: 300000)
  cacheTtl?: number;
}
```

### `createBunServer(options)`

Creates and starts the Bun server.

```typescript
interface BunServerOptions {
  // The Angular engine instance
  engine: BunAngularEngine;

  // Server port (default: 4000)
  port?: number;

  // Server hostname (default: 'localhost')
  hostname?: string;

  // Enable static file serving (default: true)
  serveStatic?: boolean;

  // Static files directory
  staticDir?: string;

  // Development mode (default: false)
  development?: boolean;

  // Enable request logging (default: false)
  logging?: boolean;

  // Routes to skip SSR
  clientOnlyRoutes?: string[];

  // TLS configuration for HTTPS
  tls?: { cert: string; key: string };

  // Server start callback
  onStart?: (server: Server) => void;
}
```

### `createRequestHandler(options)`

Creates a request handler for custom server setups.

```typescript
import { createRequestHandler } from '@pegasusheavy/ngx-bun';

const handler = createRequestHandler({
  engine,
  staticHandler,
  logging: true,
});

// Use with Bun.serve directly
Bun.serve({
  fetch: handler,
  port: 4000,
});
```

### `createStaticFileHandler(options)`

Creates a static file handler with caching and compression.

```typescript
interface StaticFileOptions {
  // Root directory for static files
  root: string;

  // Index file name (default: 'index.html')
  index?: string;

  // Enable compression (default: true)
  compression?: boolean;

  // Custom MIME types
  mimeTypes?: Record<string, string>;

  // Cache control header
  cacheControl?: string | ((path: string) => string);
}
```

## Prerendering (SSG)

### Using Angular CLI

```bash
ng run my-app:prerender
```

### Programmatic API

```typescript
import { prerenderRoutes } from '@pegasusheavy/ngx-bun/prerender';

const result = await prerenderRoutes({
  engineOptions: {
    bootstrap,
    browserDistFolder: './dist/browser',
  },
  routes: ['/', '/about', '/blog/post-1', '/blog/post-2'],
  outputDir: './dist/prerendered',
  concurrency: 5,
  generateSitemap: true,
  baseUrl: 'https://example.com',
  onProgress: (completed, total, path) => {
    console.log(`[${completed}/${total}] ${path}`);
  },
});

console.log(`Prerendered ${result.success} routes in ${result.totalTime}ms`);
```

### Dynamic Route Parameters

```typescript
const result = await prerenderRoutes({
  routes: [
    '/',
    '/about',
    {
      path: '/blog/:slug',
      getParams: async () => {
        // Fetch slugs from CMS or database
        const posts = await fetchBlogPosts();
        return posts.map(post => ({ slug: post.slug }));
      },
    },
  ],
  // ...
});
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `4000` |
| `HOST` | Server hostname | `localhost` |
| `BROWSER_DIST_FOLDER` | Browser dist path | Auto-detected |
| `SERVER_DIST_FOLDER` | Server dist path | Auto-detected |

## Performance Tips

1. **Enable caching** in production for frequently accessed pages
2. **Use prerendering** for static content that doesn't change often
3. **Set appropriate cache headers** for static assets
4. **Use `clientOnlyRoutes`** for pages that don't benefit from SSR
5. **Monitor render times** using the `X-Render-Time` response header

## Comparison with Express-based SSR

| Feature | @pegasusheavy/ngx-bun | Express SSR |
|---------|-------------------|-------------|
| Cold Start | ~50ms | ~200ms |
| Memory Usage | Lower | Higher |
| Requests/sec | Higher | Lower |
| Bundle Size | Smaller | Larger |
| Native TypeScript | ✅ | ❌ |

## Troubleshooting

### "Could not find index.html"

Make sure you've built the browser application first:

```bash
ng build
```

### "Server bootstrap not found"

Ensure `main.server.ts` exists and exports a bootstrap function:

```typescript
// src/main.server.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

const bootstrap = () => bootstrapApplication(AppComponent, config);
export default bootstrap;
```

### Hydration Mismatch Errors

Ensure your components handle server/browser differences:

```typescript
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

@Component({...})
export class MyComponent {
  private platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Browser-only code
    }
  }
}
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [Pegasus Heavy Industries](https://github.com/PegasusHeavyIndustries)

## Support

- 📖 [Documentation](https://github.com/quinnjr/ngx-bun#readme)
- 🐛 [Issue Tracker](https://github.com/quinnjr/ngx-bun/issues)
- 💬 [Discussions](https://github.com/quinnjr/ngx-bun/discussions)

---

<div align="center">
  Made with ❤️ for the Angular community
</div>
