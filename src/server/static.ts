import { existsSync, statSync } from 'node:fs';
import { join, extname, resolve, relative } from 'node:path';

/**
 * MIME types for common static file extensions
 */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
  '.wasm': 'application/wasm',
};

/**
 * Cache control settings for different file types
 */
const CACHE_CONTROL: Record<string, string> = {
  // Hashed assets (immutable)
  hashed: 'public, max-age=31536000, immutable',
  // Frequently changing files
  html: 'no-cache',
  // Standard cacheable assets
  default: 'public, max-age=86400',
};

/**
 * Configuration options for the static file handler
 */
export interface StaticFileOptions {
  /**
   * Root directory to serve static files from
   */
  root: string;

  /**
   * Index file name to serve for directory requests
   * @default 'index.html'
   */
  index?: string;

  /**
   * Whether to serve gzip/brotli compressed versions if available
   * @default true
   */
  compression?: boolean;

  /**
   * Custom MIME type mappings
   */
  mimeTypes?: Record<string, string>;

  /**
   * Cache control header for responses
   */
  cacheControl?: string | ((path: string) => string);

  /**
   * Custom headers to add to all responses
   */
  headers?: Record<string, string>;

  /**
   * Patterns to exclude from serving
   */
  exclude?: RegExp[];

  /**
   * Enable directory listing
   * @default false
   */
  directoryListing?: boolean;
}

/**
 * Result of a static file lookup
 */
export interface StaticFileResult {
  /**
   * The file path on disk
   */
  filePath: string;

  /**
   * Whether the file exists
   */
  exists: boolean;

  /**
   * MIME type for the file
   */
  mimeType: string;

  /**
   * Cache control header
   */
  cacheControl: string;

  /**
   * Whether the file is compressed
   */
  compressed: 'gzip' | 'br' | null;

  /**
   * File stats (if exists)
   */
  stats?: {
    size: number;
    mtime: Date;
  };
}

/**
 * Static file handler for Bun servers
 *
 * Efficiently serves static files with proper MIME types, caching,
 * and compression support.
 */
export class BunStaticFileHandler {
  private readonly root: string;
  private readonly index: string;
  private readonly compression: boolean;
  private readonly mimeTypes: Record<string, string>;
  private readonly cacheControl: string | ((path: string) => string);
  private readonly headers: Record<string, string>;
  private readonly exclude: RegExp[];
  private readonly directoryListing: boolean;

  constructor(options: StaticFileOptions) {
    this.root = resolve(options.root);
    this.index = options.index ?? 'index.html';
    this.compression = options.compression ?? true;
    this.mimeTypes = { ...MIME_TYPES, ...options.mimeTypes };
    this.cacheControl = options.cacheControl ?? this.defaultCacheControl.bind(this);
    this.headers = options.headers ?? {};
    this.exclude = options.exclude ?? [];
    this.directoryListing = options.directoryListing ?? false;
  }

  /**
   * Default cache control strategy
   */
  private defaultCacheControl(filePath: string): string {
    const ext = extname(filePath).toLowerCase();

    // HTML files should not be cached
    if (ext === '.html') {
      return CACHE_CONTROL.html;
    }

    // Hashed assets (contain hash in filename)
    if (/\.[a-f0-9]{8,}\./i.test(filePath)) {
      return CACHE_CONTROL.hashed;
    }

    return CACHE_CONTROL.default;
  }

  /**
   * Get the MIME type for a file path
   */
  getMimeType(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    return this.mimeTypes[ext] ?? 'application/octet-stream';
  }

  /**
   * Check if a path is excluded
   */
  isExcluded(urlPath: string): boolean {
    return this.exclude.some((pattern) => pattern.test(urlPath));
  }

  /**
   * Resolve a URL path to a file path
   */
  private resolveFilePath(urlPath: string): string {
    // Normalize the path and prevent directory traversal
    const normalized = urlPath.replace(/\\/g, '/').replace(/\.\.+/g, '');
    const segments = normalized.split('/').filter(Boolean);
    return join(this.root, ...segments);
  }

  /**
   * Look up a static file
   */
  lookup(urlPath: string): StaticFileResult {
    // Check exclusions
    if (this.isExcluded(urlPath)) {
      return {
        filePath: '',
        exists: false,
        mimeType: 'application/octet-stream',
        cacheControl: 'no-cache',
        compressed: null,
      };
    }

    let filePath = this.resolveFilePath(urlPath);

    // Prevent directory traversal
    const relativePath = relative(this.root, filePath);
    if (relativePath.startsWith('..') || relativePath.startsWith('/')) {
      return {
        filePath: '',
        exists: false,
        mimeType: 'application/octet-stream',
        cacheControl: 'no-cache',
        compressed: null,
      };
    }

    // Check if it's a directory and append index file
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, this.index);
    }

    // Check for compressed versions
    let compressed: 'gzip' | 'br' | null = null;
    let actualPath = filePath;

    if (this.compression) {
      if (existsSync(`${filePath}.br`)) {
        actualPath = `${filePath}.br`;
        compressed = 'br';
      } else if (existsSync(`${filePath}.gz`)) {
        actualPath = `${filePath}.gz`;
        compressed = 'gzip';
      }
    }

    // Check if file exists (use original if no compressed version)
    const exists = existsSync(compressed ? actualPath : filePath);
    if (!exists) {
      return {
        filePath,
        exists: false,
        mimeType: this.getMimeType(filePath),
        cacheControl: 'no-cache',
        compressed: null,
      };
    }

    const stats = statSync(compressed ? actualPath : filePath);
    const cacheControl =
      typeof this.cacheControl === 'function'
        ? this.cacheControl(filePath)
        : this.cacheControl;

    return {
      filePath: compressed ? actualPath : filePath,
      exists: true,
      mimeType: this.getMimeType(filePath),
      cacheControl,
      compressed,
      stats: {
        size: stats.size,
        mtime: stats.mtime,
      },
    };
  }

  /**
   * Serve a static file as a Bun Response
   */
  async serve(urlPath: string, request?: Request): Promise<Response | null> {
    const result = this.lookup(urlPath);

    if (!result.exists) {
      return null;
    }

    // Check Accept-Encoding for compressed responses
    let useCompressed = false;
    if (result.compressed && request) {
      const acceptEncoding = request.headers.get('Accept-Encoding') ?? '';
      if (result.compressed === 'br' && acceptEncoding.includes('br')) {
        useCompressed = true;
      } else if (result.compressed === 'gzip' && acceptEncoding.includes('gzip')) {
        useCompressed = true;
      }
    }

    const filePath = useCompressed
      ? result.filePath
      : result.filePath.replace(/\.(br|gz)$/, '');

    // Use Bun's native file serving
    const file = Bun.file(filePath);

    const headers: Record<string, string> = {
      'Content-Type': result.mimeType,
      'Cache-Control': result.cacheControl,
      ...this.headers,
    };

    if (useCompressed && result.compressed) {
      headers['Content-Encoding'] = result.compressed === 'br' ? 'br' : 'gzip';
    }

    if (result.stats) {
      headers['Last-Modified'] = result.stats.mtime.toUTCString();
      headers['ETag'] = `"${result.stats.size}-${result.stats.mtime.getTime()}"`;
    }

    // Handle conditional requests
    if (request && result.stats) {
      const ifNoneMatch = request.headers.get('If-None-Match');
      const ifModifiedSince = request.headers.get('If-Modified-Since');
      const etag = headers['ETag'];

      if (ifNoneMatch === etag) {
        return new Response(null, { status: 304, headers });
      }

      if (ifModifiedSince) {
        const ifModifiedDate = new Date(ifModifiedSince);
        if (result.stats.mtime <= ifModifiedDate) {
          return new Response(null, { status: 304, headers });
        }
      }
    }

    return new Response(file, { headers });
  }

  /**
   * Get the root directory
   */
  getRoot(): string {
    return this.root;
  }
}

/**
 * Factory function to create a static file handler
 */
export function createStaticFileHandler(
  options: StaticFileOptions
): BunStaticFileHandler {
  return new BunStaticFileHandler(options);
}
