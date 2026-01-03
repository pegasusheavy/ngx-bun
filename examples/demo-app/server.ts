/**
 * Bun SSR Server for Angular Demo
 * Proper Angular 19 SSR approach
 */

// Import Angular compiler for JIT support
import '@angular/compiler';

import { renderApplication } from '@angular/platform-server';
import { bootstrapApplication, type ApplicationRef } from '@angular/platform-browser';
import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { AppComponent } from './src/app/app.component';
import { config } from './src/app/app.config.server';

// Paths
const distFolder = join(import.meta.dir, 'dist/demo-app/browser');
const indexHtml = join(distFolder, 'index.html');

// Read index.html template
const indexHtmlContent = readFileSync(indexHtml, 'utf-8');

// MIME types
const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function getMimeType(path: string): string {
  const ext = path.substring(path.lastIndexOf('.'));
  return mimeTypes[ext] || 'application/octet-stream';
}

// Bootstrap function that accepts platform context (Angular 19 requirement)
async function bootstrap(context?: { platformRef?: any }): Promise<ApplicationRef> {
  return bootstrapApplication(AppComponent, {
    ...config,
    // Pass the platformRef if provided (for server-side rendering)
    ...(context?.platformRef && { platformRef: context.platformRef }),
  });
}

// Create server
const server = Bun.serve({
  port: Number(process.env.PORT) || 4000,
  hostname: process.env.HOST || 'localhost',
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    console.log(`[${new Date().toISOString()}] ${request.method} ${pathname}`);
    
    // Try to serve static files first
    const staticPath = join(distFolder, pathname);
    if (pathname !== '/' && existsSync(staticPath)) {
      const file = Bun.file(staticPath);
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            'Content-Type': getMimeType(pathname),
            'Cache-Control': pathname.includes('.') ? 'public, max-age=31536000' : 'no-cache',
          },
        });
      }
    }
    
    // SSR render for all other routes
    try {
      const startTime = performance.now();
      
      const html = await renderApplication(bootstrap, {
        document: indexHtmlContent,
        url: pathname,
      });
      
      const renderTime = performance.now() - startTime;
      
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Render-Time': `${renderTime.toFixed(2)}ms`,
          'X-Rendered-By': 'bun-angular-ssr',
        },
      });
    } catch (error) {
      console.error('SSR Error:', error);
      
      // Fallback to client-side rendering
      return new Response(indexHtmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Render-Mode': 'csr-fallback',
        },
      });
    }
  },
});

console.log(`
🚀 Angular SSR Demo Server
   URL: http://${server.hostname}:${server.port}
   Static files: ${distFolder}
   Environment: ${process.env.NODE_ENV || 'development'}
`);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.stop();
  process.exit(0);
});
