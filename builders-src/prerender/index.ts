import {
  BuilderContext,
  BuilderOutput,
  createBuilder,
  targetFromTargetString,
} from '@angular-devkit/architect';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import type { Schema } from './schema';

/**
 * Execute the prerender builder
 */
async function execute(
  options: Schema,
  context: BuilderContext
): Promise<BuilderOutput> {
  const {
    browserTarget,
    routes,
    routesFile,
    outputPath,
    concurrency,
    generateSitemap,
    baseUrl,
    minify,
    verbose,
  } = options;

  // Parse the browser target
  const target = targetFromTargetString(browserTarget);

  context.logger.info(`🔧 Building browser application for prerendering...`);

  // Schedule the browser build first
  const browserBuild = await context.scheduleTarget(target);
  const buildResult = await browserBuild.result;

  if (!buildResult.success) {
    return { success: false, error: 'Browser build failed' };
  }

  const browserDistFolder = (buildResult as any).outputPath ||
    join(context.workspaceRoot, `dist/${target.project}/browser`);

  const serverDistFolder = join(context.workspaceRoot, `dist/${target.project}/server`);
  const prerenderOutputPath = outputPath || browserDistFolder;

  context.logger.info(`📦 Browser build complete: ${browserDistFolder}`);

  // Collect routes to prerender
  let allRoutes = [...routes];

  // Read routes from file if specified
  if (routesFile) {
    const routesFilePath = join(context.workspaceRoot, routesFile);
    if (existsSync(routesFilePath)) {
      const fileRoutes = readFileSync(routesFilePath, 'utf-8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      allRoutes = [...allRoutes, ...fileRoutes];
    } else {
      context.logger.warn(`Routes file not found: ${routesFilePath}`);
    }
  }

  // Remove duplicates
  allRoutes = [...new Set(allRoutes)];

  if (allRoutes.length === 0) {
    context.logger.warn('No routes to prerender');
    return { success: true };
  }

  context.logger.info(`🔄 Prerendering ${allRoutes.length} route(s)...`);

  try {
    // Import the prerender function dynamically from the package
    const prerenderModule = await import('@pegasusheavy/ngx-bun/prerender');
    const { prerenderRoutes } = prerenderModule;

    // Find the server bootstrap
    const serverMainPath = join(serverDistFolder, 'main.server.mjs');
    let bootstrap: (() => Promise<unknown>) | undefined;

    if (existsSync(serverMainPath)) {
      const serverModule = await import(serverMainPath);
      bootstrap = serverModule.default || serverModule.bootstrap;
    } else {
      // Try to find it in the source
      const srcServerMain = join(context.workspaceRoot, 'src/main.server.ts');
      if (existsSync(srcServerMain)) {
        const serverModule = await import(srcServerMain);
        bootstrap = serverModule.default || serverModule.bootstrap;
      }
    }

    if (!bootstrap) {
      return {
        success: false,
        error: 'Could not find server bootstrap function. Make sure main.server.ts exists.'
      } as BuilderOutput;
    }

    // Run prerendering
    const result = await prerenderRoutes({
      engineOptions: {
        bootstrap,
        browserDistFolder,
        serverDistFolder,
        enableCache: false,
      },
      routes: allRoutes,
      outputDir: prerenderOutputPath,
      concurrency,
      minify,
      generateSitemap,
      baseUrl: baseUrl || 'http://localhost',
      onProgress: (completed: number, total: number, path: string) => {
        if (verbose) {
          context.logger.info(`[${completed}/${total}] Prerendered: ${path}`);
        }
      },
      onError: (error: Error, path: string) => {
        context.logger.error(`Failed to prerender ${path}: ${error.message}`);
        return true; // Continue with other routes
      },
    });

    // Log results
    context.logger.info(`\n✨ Prerendering complete!`);
    context.logger.info(`   Total: ${result.total}`);
    context.logger.info(`   Success: ${result.success}`);
    context.logger.info(`   Failed: ${result.failed}`);
    context.logger.info(`   Time: ${(result.totalTime / 1000).toFixed(2)}s`);
    context.logger.info(`   Output: ${prerenderOutputPath}\n`);

    if (generateSitemap) {
      context.logger.info(`📄 Sitemap generated: ${join(prerenderOutputPath, 'sitemap.xml')}`);
    }

    if (result.failed > 0) {
      return {
        success: false,
        error: `${result.failed} route(s) failed to prerender`,
      } as BuilderOutput;
    }
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    context.logger.error(`Prerender failed: ${errorMessage}`);
    return { success: false, error: errorMessage } as BuilderOutput;
  }
}

/**
 * Bun SSG Prerender Builder
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default createBuilder(execute) as any;
