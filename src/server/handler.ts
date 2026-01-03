import type { BunAngularEngine } from './engine';
import type { BunStaticFileHandler } from './static';
import type { StaticProvider } from '@angular/core';

/**
 * Options for creating a request handler
 */
export interface RequestHandlerOptions {
  /**
   * The Angular SSR engine instance
   */
  engine: BunAngularEngine;

  /**
   * Static file handler for serving assets
   */
  staticHandler?: BunStaticFileHandler;

  /**
   * Routes that should skip SSR and serve static HTML
   */
  staticRoutes?: string[];

  /**
   * Routes that should skip SSR and return index.html for client-side hydration
   */
  clientOnlyRoutes?: string[];

  /**
   * Base href for the application
   * @default '/'
   */
  baseHref?: string;

  /**
   * Enable request logging
   * @default false
   */
  logging?: boolean;

  /**
   * Custom error handler
   */
  onError?: (error: Error, request: Request) => Response | Promise<Response>;

  /**
   * Hook to add custom providers per request
   */
  getProviders?: (request: Request) => StaticProvider[];
}

/**
 * Request handler type for Bun.serve
 */
export type BunRequestHandler = (request: Request) => Promise<Response>;

/**
 * Create a request handler for Bun.serve that handles Angular SSR
 */
export function createRequestHandler(
  options: RequestHandlerOptions
): BunRequestHandler {
  const {
    engine,
    staticHandler,
    staticRoutes = [],
    clientOnlyRoutes = [],
    baseHref = '/',
    logging = false,
    onError,
    getProviders,
  } = options;

  // Compile route patterns
  const staticRoutePatterns = staticRoutes.map((route) =>
    new RegExp(`^${route.replace(/\*/g, '.*')}$`)
  );
  const clientOnlyPatterns = clientOnlyRoutes.map((route) =>
    new RegExp(`^${route.replace(/\*/g, '.*')}$`)
  );

  // Common static file extensions
  const staticExtensions = new Set([
    '.js',
    '.mjs',
    '.css',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.ico',
    '.webp',
    '.avif',
    '.woff',
    '.woff2',
    '.ttf',
    '.otf',
    '.eot',
    '.map',
    '.json',
    '.xml',
    '.txt',
    '.pdf',
    '.mp4',
    '.webm',
    '.mp3',
    '.ogg',
    '.wav',
    '.wasm',
  ]);

  /**
   * Check if a path is for a static file
   */
  function isStaticFile(pathname: string): boolean {
    const lastDot = pathname.lastIndexOf('.');
    if (lastDot === -1) return false;
    const ext = pathname.slice(lastDot).toLowerCase();
    return staticExtensions.has(ext);
  }

  /**
   * Check if a path matches any of the given patterns
   */
  function matchesPatterns(pathname: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(pathname));
  }

  /**
   * Log a request
   */
  function logRequest(
    method: string,
    pathname: string,
    status: number,
    duration: number,
    type: 'ssr' | 'static' | 'client' | 'error'
  ): void {
    if (!logging) return;
    const timestamp = new Date().toISOString();
    const typeColors: Record<string, string> = {
      ssr: '\x1b[35m', // magenta
      static: '\x1b[36m', // cyan
      client: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    console.log(
      `${timestamp} ${typeColors[type]}[${type.toUpperCase()}]${reset} ${method} ${pathname} ${status} ${duration.toFixed(2)}ms`
    );
  }

  return async function handler(request: Request): Promise<Response> {
    const startTime = performance.now();
    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // Handle static files first
      if (staticHandler && isStaticFile(pathname)) {
        const response = await staticHandler.serve(pathname, request);
        if (response) {
          const duration = performance.now() - startTime;
          logRequest(request.method, pathname, response.status, duration, 'static');
          return response;
        }
      }

      // Check for static routes (serve without SSR)
      if (matchesPatterns(pathname, staticRoutePatterns)) {
        if (staticHandler) {
          // Try to serve a prerendered HTML file
          const htmlPath = pathname.endsWith('/')
            ? `${pathname}index.html`
            : `${pathname}.html`;
          const response = await staticHandler.serve(htmlPath, request);
          if (response) {
            const duration = performance.now() - startTime;
            logRequest(request.method, pathname, response.status, duration, 'static');
            return response;
          }
        }
      }

      // Check for client-only routes (skip SSR)
      if (matchesPatterns(pathname, clientOnlyPatterns)) {
        if (staticHandler) {
          const response = await staticHandler.serve('/index.html', request);
          if (response) {
            const duration = performance.now() - startTime;
            logRequest(request.method, pathname, response.status, duration, 'client');
            return response;
          }
        }
      }

      // SSR rendering
      const requestUrl = `${url.pathname}${url.search}`;
      const providers = getProviders ? getProviders(request) : [];

      const result = await engine.render({
        url: requestUrl,
        request,
        providers,
      });

      const response = new Response(result.html, {
        status: result.status,
        headers: {
          ...result.headers,
          'X-Render-Time': `${result.renderTime.toFixed(2)}ms`,
          'X-Cache-Hit': result.fromCache ? 'true' : 'false',
        },
      });

      const duration = performance.now() - startTime;
      logRequest(request.method, pathname, response.status, duration, 'ssr');
      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      logRequest(request.method, pathname, 500, duration, 'error');

      if (onError && error instanceof Error) {
        return onError(error, request);
      }

      console.error('[BunAngularSSR] Request error:', error);

      return new Response(
        `<!DOCTYPE html>
<html>
<head><title>500 Internal Server Error</title></head>
<body>
  <h1>500 Internal Server Error</h1>
  <p>An unexpected error occurred.</p>
</body>
</html>`,
        {
          status: 500,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        }
      );
    }
  };
}
