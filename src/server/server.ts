import type { BunAngularEngine } from './engine';
import type { BunStaticFileHandler } from './static';
import { createRequestHandler, type RequestHandlerOptions } from './handler';

// Use ReturnType to get the correct server type
type BunServer = ReturnType<typeof Bun.serve>;

/**
 * Options for creating a Bun server with Angular SSR
 */
export interface BunServerOptions extends Omit<RequestHandlerOptions, 'engine' | 'staticHandler'> {
  /**
   * The Angular SSR engine instance
   */
  engine: BunAngularEngine;

  /**
   * Port to listen on
   * @default 4000
   */
  port?: number;

  /**
   * Hostname to bind to
   * @default 'localhost'
   */
  hostname?: string;

  /**
   * Enable serving static files
   * @default true
   */
  serveStatic?: boolean;

  /**
   * Path to static files directory (defaults to engine's browserDistFolder)
   */
  staticDir?: string;

  /**
   * Custom static file handler
   */
  staticHandler?: BunStaticFileHandler;

  /**
   * Enable development mode (hot reload, detailed errors)
   * @default false
   */
  development?: boolean;

  /**
   * TLS configuration for HTTPS
   */
  tls?: {
    cert: string;
    key: string;
    passphrase?: string;
  };

  /**
   * Callback when server starts
   */
  onStart?: (server: BunServer) => void;

  /**
   * Callback for each request (before handling)
   */
  onRequest?: (request: Request) => void | Promise<void>;
}

/**
 * Server instance with additional utilities
 */
export interface BunAngularServer {
  /**
   * The underlying Bun server instance
   */
  server: BunServer;

  /**
   * The Angular SSR engine
   */
  engine: BunAngularEngine;

  /**
   * Stop the server
   */
  stop(): void;

  /**
   * Reload the server (useful for development)
   */
  reload(): void;

  /**
   * Clear the render cache
   */
  clearCache(): void;

  /**
   * Get server info
   */
  info(): {
    hostname: string;
    port: number;
    url: string;
  };
}

/**
 * Create and start a Bun server with Angular SSR support
 */
export function createBunServer(options: BunServerOptions): BunAngularServer {
  const {
    engine,
    port = 4000,
    hostname = 'localhost',
    serveStatic = true,
    staticDir,
    development = false,
    tls,
    onStart,
    onRequest,
    logging = development,
    ...handlerOptions
  } = options;

  // Create or use provided static handler
  let staticHandler = options.staticHandler;
  if (serveStatic && !staticHandler) {
    // Dynamic import to avoid issues when static handling isn't needed
    const { createStaticFileHandler } = require('./static');
    staticHandler = createStaticFileHandler({
      root: staticDir ?? engine.getBrowserDistFolder(),
      compression: true,
    });
  }

  // Create the request handler
  const handler = createRequestHandler({
    engine,
    staticHandler,
    logging,
    ...handlerOptions,
  });

  // Wrap handler with onRequest hook if provided
  const wrappedHandler = onRequest
    ? async (request: Request) => {
        await onRequest(request);
        return handler(request);
      }
    : handler;

  // Create server configuration
  const serveConfig = {
    port,
    hostname,
    fetch: wrappedHandler,
    development,
    tls: tls as { cert: string; key: string } | undefined,
  };

  // Start the server
  const server = Bun.serve(serveConfig);

  // Call onStart callback
  if (onStart) {
    onStart(server);
  }

  // Log startup message
  const protocol = tls ? 'https' : 'http';
  const url = `${protocol}://${hostname}:${port}`;
  console.log(`\n🚀 Angular SSR server running at ${url}`);
  if (development) {
    console.log('   Mode: Development');
  }
  console.log('');

  return {
    server,
    engine,

    stop() {
      server.stop(true);
      console.log('Server stopped');
    },

    reload() {
      engine.reloadTemplate();
      engine.clearCache();
      console.log('Server reloaded');
    },

    clearCache() {
      engine.clearCache();
      console.log('Cache cleared');
    },

    info() {
      return {
        hostname: server.hostname ?? hostname,
        port: server.port ?? port,
        url,
      };
    },
  };
}
