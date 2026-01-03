import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import type { BunAngularEngine } from '../server/engine';
import type { BunAngularEngineOptions } from '../server/types';

/**
 * Route to prerender
 */
export interface PrerenderRoute {
  /**
   * The route path (e.g., '/about', '/blog/:slug')
   */
  path: string;

  /**
   * For parameterized routes, function to get parameter combinations
   */
  getParams?: () => Promise<Record<string, string>[]>;

  /**
   * Custom output filename (defaults to path + '/index.html')
   */
  outputPath?: string;
}

/**
 * Options for prerendering routes
 */
export interface PrerenderOptions {
  /**
   * Engine options (used to create engine if not provided)
   */
  engineOptions?: BunAngularEngineOptions;

  /**
   * Existing engine instance to use
   */
  engine?: BunAngularEngine;

  /**
   * Routes to prerender
   */
  routes: (string | PrerenderRoute)[];

  /**
   * Output directory for prerendered files
   */
  outputDir: string;

  /**
   * Number of concurrent renders
   * @default 5
   */
  concurrency?: number;

  /**
   * Whether to minify HTML output
   * @default false
   */
  minify?: boolean;

  /**
   * Callback for progress updates
   */
  onProgress?: (completed: number, total: number, path: string) => void;

  /**
   * Callback for errors (return true to continue, false to stop)
   */
  onError?: (error: Error, path: string) => boolean;

  /**
   * Whether to generate sitemap.xml
   * @default true
   */
  generateSitemap?: boolean;

  /**
   * Base URL for sitemap
   */
  baseUrl?: string;
}

/**
 * Result of prerendering
 */
export interface PrerenderResult {
  /**
   * Total number of routes prerendered
   */
  total: number;

  /**
   * Number of successful renders
   */
  success: number;

  /**
   * Number of failed renders
   */
  failed: number;

  /**
   * Prerendered routes with their output paths
   */
  routes: Array<{
    path: string;
    outputPath: string;
    success: boolean;
    error?: string;
    renderTime: number;
  }>;

  /**
   * Total time taken
   */
  totalTime: number;
}

/**
 * Normalize a route path
 */
function normalizePath(path: string): string {
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  return path.replace(/\/+/g, '/');
}

/**
 * Convert a route path to an output file path
 */
function pathToOutputFile(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === '/') {
    return '/index.html';
  }
  // Remove trailing slash and add index.html
  const clean = normalized.replace(/\/$/, '');
  return `${clean}/index.html`;
}

/**
 * Expand a parameterized route
 */
async function expandRoute(route: PrerenderRoute): Promise<string[]> {
  if (!route.getParams) {
    return [route.path];
  }

  const paramSets = await route.getParams();
  return paramSets.map((params) => {
    let expanded = route.path;
    for (const [key, value] of Object.entries(params)) {
      expanded = expanded.replace(`:${key}`, value);
      expanded = expanded.replace(`[${key}]`, value);
    }
    return expanded;
  });
}

/**
 * Simple HTML minification
 */
function minifyHtml(html: string): string {
  return html
    .replace(/<!--(?!<!)[^\[>].*?-->/gs, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/>\s+</g, '><') // Remove whitespace between tags
    .trim();
}

/**
 * Generate a sitemap.xml file
 */
function generateSitemap(routes: string[], baseUrl: string): string {
  const urls = routes
    .map((route) => {
      const loc = new URL(route, baseUrl).href;
      return `  <url>
    <loc>${loc}</loc>
    <changefreq>weekly</changefreq>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/**
 * Chunk an array into smaller arrays
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Prerender Angular routes to static HTML files
 *
 * This function renders Angular routes to static HTML files for SSG (Static Site Generation).
 * It supports parameterized routes, concurrent rendering, and sitemap generation.
 */
export async function prerenderRoutes(
  options: PrerenderOptions
): Promise<PrerenderResult> {
  const startTime = performance.now();
  const {
    routes,
    outputDir,
    concurrency = 5,
    minify = false,
    onProgress,
    onError,
    generateSitemap: shouldGenerateSitemap = true,
    baseUrl = 'http://localhost',
  } = options;

  // Create or use engine
  let engine: BunAngularEngine;
  if (options.engine) {
    engine = options.engine;
  } else if (options.engineOptions) {
    const { createBunAngularEngine } = await import('../server/engine');
    engine = createBunAngularEngine({
      ...options.engineOptions,
      enableCache: false, // No caching needed for prerendering
    });
  } else {
    throw new Error('Either engine or engineOptions must be provided');
  }

  // Expand all routes
  const expandedRoutes: Array<{ path: string; outputPath: string }> = [];
  for (const route of routes) {
    if (typeof route === 'string') {
      expandedRoutes.push({
        path: route,
        outputPath: pathToOutputFile(route),
      });
    } else {
      const paths = await expandRoute(route);
      for (const path of paths) {
        expandedRoutes.push({
          path,
          outputPath: route.outputPath
            ? route.outputPath.replace(/\$path/g, path)
            : pathToOutputFile(path),
        });
      }
    }
  }

  const result: PrerenderResult = {
    total: expandedRoutes.length,
    success: 0,
    failed: 0,
    routes: [],
    totalTime: 0,
  };

  // Create output directory
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  // Process routes in chunks for concurrency control
  const chunks = chunk(expandedRoutes, concurrency);
  let completed = 0;

  for (const routeChunk of chunks) {
    const promises = routeChunk.map(async ({ path, outputPath }) => {
      const routeStartTime = performance.now();
      const fullOutputPath = join(outputDir, outputPath);

      try {
        const renderResult = await engine.render({
          url: path,
          skipCache: true,
        });

        if (renderResult.status !== 200) {
          throw new Error(`Render returned status ${renderResult.status}`);
        }

        let html = renderResult.html;
        if (minify) {
          html = minifyHtml(html);
        }

        // Ensure directory exists
        const dir = dirname(fullOutputPath);
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        await writeFile(fullOutputPath, html, 'utf-8');

        completed++;
        onProgress?.(completed, result.total, path);

        result.success++;
        result.routes.push({
          path,
          outputPath: fullOutputPath,
          success: true,
          renderTime: performance.now() - routeStartTime,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const shouldContinue = onError?.(error instanceof Error ? error : new Error(errorMessage), path);

        completed++;
        onProgress?.(completed, result.total, path);

        result.failed++;
        result.routes.push({
          path,
          outputPath: fullOutputPath,
          success: false,
          error: errorMessage,
          renderTime: performance.now() - routeStartTime,
        });

        if (shouldContinue === false) {
          throw error;
        }
      }
    });

    await Promise.all(promises);
  }

  // Generate sitemap
  if (shouldGenerateSitemap && result.success > 0) {
    const successfulRoutes = result.routes
      .filter((r) => r.success)
      .map((r) => r.path);
    const sitemapContent = generateSitemap(successfulRoutes, baseUrl);
    await writeFile(join(outputDir, 'sitemap.xml'), sitemapContent, 'utf-8');
  }

  result.totalTime = performance.now() - startTime;
  return result;
}
