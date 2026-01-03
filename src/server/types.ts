import type { Type, StaticProvider } from '@angular/core';

/**
 * Configuration options for the BunAngularEngine
 */
export interface BunAngularEngineOptions {
  /**
   * The Angular bootstrap function or module
   */
  bootstrap: (() => Promise<unknown>) | Type<unknown>;

  /**
   * Path to the browser distribution directory
   */
  browserDistFolder: string;

  /**
   * Path to the server distribution directory
   */
  serverDistFolder?: string;

  /**
   * Path to the index.html template
   */
  indexHtml?: string;

  /**
   * Additional providers to add during server-side rendering
   */
  providers?: StaticProvider[];

  /**
   * Enable in-memory LRU cache for rendered pages
   * @default true
   */
  enableCache?: boolean;

  /**
   * Maximum number of entries in the render cache
   * @default 100
   */
  maxCacheSize?: number;

  /**
   * Cache TTL in milliseconds
   * @default 300000 (5 minutes)
   */
  cacheTtl?: number;
}

/**
 * Options for rendering a specific request
 */
export interface RenderOptions {
  /**
   * The incoming request URL
   */
  url: string;

  /**
   * Original request object (if available)
   */
  request?: Request;

  /**
   * Additional providers for this specific render
   */
  providers?: StaticProvider[];

  /**
   * Custom document template (overrides default index.html)
   */
  document?: string;

  /**
   * Whether to skip cache lookup for this request
   * @default false
   */
  skipCache?: boolean;
}

/**
 * Result of a render operation
 */
export interface RenderResult {
  /**
   * The rendered HTML string
   */
  html: string;

  /**
   * HTTP status code
   */
  status: number;

  /**
   * Response headers to set
   */
  headers: Record<string, string>;

  /**
   * Whether the result was served from cache
   */
  fromCache: boolean;

  /**
   * Render duration in milliseconds
   */
  renderTime: number;
}

/**
 * Route configuration for SSR/SSG
 */
export interface RouteConfig {
  /**
   * The route path
   */
  path: string;

  /**
   * Render mode for this route
   */
  renderMode: 'server' | 'client' | 'prerender';

  /**
   * For prerender mode, additional paths to generate
   */
  getPrerenderParams?: () => Promise<Record<string, string>[]>;

  /**
   * Headers to set for this route
   */
  headers?: Record<string, string>;

  /**
   * Status code for this route
   */
  status?: number;
}

/**
 * Cache entry structure
 */
export interface CacheEntry {
  html: string;
  status: number;
  headers: Record<string, string>;
  timestamp: number;
  expiresAt: number;
}
