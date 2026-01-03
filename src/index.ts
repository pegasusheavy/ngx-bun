/**
 * @pegasusheavy/ngx-bun - Bun SSR/SSG adapter for Angular 19+
 *
 * This package provides a high-performance server adapter for Angular applications
 * using Bun's built-in HTTP server.
 */

export { BunAngularEngine, createBunAngularEngine } from './server/engine';
export { createBunServer } from './server/server';
export type { BunServerOptions } from './server/server';
export { createRequestHandler } from './server/handler';
export type { RequestHandlerOptions } from './server/handler';
export {
  BunStaticFileHandler,
  createStaticFileHandler,
} from './server/static';
export type { StaticFileOptions } from './server/static';
export { prerenderRoutes } from './prerender/prerender';
export type {
  PrerenderOptions,
  PrerenderResult,
} from './prerender/prerender';
export type {
  BunAngularEngineOptions,
  RenderOptions,
  RenderResult,
} from './server/types';
