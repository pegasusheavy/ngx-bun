import { renderApplication } from '@angular/platform-server';
import type { StaticProvider } from '@angular/core';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type {
  BunAngularEngineOptions,
  RenderOptions,
  RenderResult,
  CacheEntry,
} from './types';
import { LRUCache } from './cache';

/**
 * BunAngularEngine - Core SSR engine for Angular applications running on Bun
 *
 * This engine handles server-side rendering of Angular applications,
 * with built-in caching and optimizations for Bun's runtime.
 */
export class BunAngularEngine {
  private readonly bootstrap: (() => Promise<unknown>) | unknown;
  private readonly browserDistFolder: string;
  private readonly serverDistFolder: string;
  private readonly indexHtmlPath: string;
  private readonly providers: StaticProvider[];
  private readonly cache: LRUCache<CacheEntry> | null;
  private readonly cacheTtl: number;
  private indexHtmlContent: string | null = null;

  constructor(options: BunAngularEngineOptions) {
    this.bootstrap = options.bootstrap;
    this.browserDistFolder = resolve(options.browserDistFolder);
    this.serverDistFolder = options.serverDistFolder
      ? resolve(options.serverDistFolder)
      : this.browserDistFolder;
    this.indexHtmlPath = options.indexHtml
      ? resolve(options.indexHtml)
      : join(this.browserDistFolder, 'index.html');
    this.providers = options.providers ?? [];
    this.cacheTtl = options.cacheTtl ?? 300_000; // 5 minutes default

    // Initialize cache if enabled
    if (options.enableCache !== false) {
      this.cache = new LRUCache<CacheEntry>(options.maxCacheSize ?? 100);
    } else {
      this.cache = null;
    }

    // Pre-load index.html
    this.loadIndexHtml();
  }

  /**
   * Load the index.html template
   */
  private loadIndexHtml(): void {
    if (existsSync(this.indexHtmlPath)) {
      this.indexHtmlContent = readFileSync(this.indexHtmlPath, 'utf-8');
    }
  }

  /**
   * Get the index.html content
   */
  private getDocument(customDocument?: string): string {
    if (customDocument) {
      return customDocument;
    }
    if (!this.indexHtmlContent) {
      this.loadIndexHtml();
    }
    if (!this.indexHtmlContent) {
      throw new Error(
        `Could not find index.html at ${this.indexHtmlPath}. ` +
          'Please ensure the browser build output exists.'
      );
    }
    return this.indexHtmlContent;
  }

  /**
   * Generate a cache key for the given URL
   */
  private getCacheKey(url: string): string {
    // Normalize the URL for caching
    const parsedUrl = new URL(url, 'http://localhost');
    return `${parsedUrl.pathname}${parsedUrl.search}`;
  }

  /**
   * Check if a cached entry is still valid
   */
  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() < entry.expiresAt;
  }

  /**
   * Render an Angular application for the given URL
   */
  async render(options: RenderOptions): Promise<RenderResult> {
    const startTime = performance.now();
    const cacheKey = this.getCacheKey(options.url);

    // Check cache first (unless skipped)
    if (!options.skipCache && this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return {
          html: cached.html,
          status: cached.status,
          headers: cached.headers,
          fromCache: true,
          renderTime: performance.now() - startTime,
        };
      }
    }

    try {
      const document = this.getDocument(options.document);
      const url = new URL(options.url, 'http://localhost');

      // Combine providers
      const providers: StaticProvider[] = [...this.providers, ...(options.providers ?? [])];

      // Render the application
      const html = await renderApplication(this.bootstrap as Parameters<typeof renderApplication>[0], {
        document,
        url: url.pathname + url.search,
        platformProviders: providers,
      });

      const result: RenderResult = {
        html,
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Rendered-By': 'bun-angular-ssr',
        },
        fromCache: false,
        renderTime: performance.now() - startTime,
      };

      // Cache the result
      if (!options.skipCache && this.cache) {
        const cacheEntry: CacheEntry = {
          html: result.html,
          status: result.status,
          headers: result.headers,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.cacheTtl,
        };
        this.cache.set(cacheKey, cacheEntry);
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`[BunAngularEngine] Render error for ${options.url}:`, error);

      return {
        html: this.renderErrorPage(errorMessage),
        status: 500,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
        fromCache: false,
        renderTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Render an error page
   */
  private renderErrorPage(message: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Server Error</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #0f0f0f;
      color: #fff;
    }
    .error-container {
      text-align: center;
      padding: 2rem;
      max-width: 600px;
    }
    h1 {
      font-size: 4rem;
      margin: 0;
      background: linear-gradient(135deg, #ff6b6b, #feca57);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    p {
      color: #888;
      margin-top: 1rem;
    }
    code {
      display: block;
      margin-top: 1rem;
      padding: 1rem;
      background: #1a1a1a;
      border-radius: 8px;
      font-size: 0.875rem;
      color: #ff6b6b;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>500</h1>
    <p>An error occurred while rendering this page.</p>
    ${process.env['NODE_ENV'] !== 'production' ? `<code>${message}</code>` : ''}
  </div>
</body>
</html>`;
  }

  /**
   * Clear the render cache
   */
  clearCache(): void {
    this.cache?.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } | null {
    if (!this.cache) return null;
    return {
      size: this.cache.size,
      maxSize: this.cache.maxSize,
    };
  }

  /**
   * Reload the index.html template (useful for development)
   */
  reloadTemplate(): void {
    this.indexHtmlContent = null;
    this.loadIndexHtml();
  }

  /**
   * Get the browser distribution folder path
   */
  getBrowserDistFolder(): string {
    return this.browserDistFolder;
  }
}

/**
 * Factory function to create a BunAngularEngine instance
 */
export function createBunAngularEngine(
  options: BunAngularEngineOptions
): BunAngularEngine {
  return new BunAngularEngine(options);
}
