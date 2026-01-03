import {
  BuilderContext,
  BuilderOutput,
  createBuilder,
  targetFromTargetString,
} from '@angular-devkit/architect';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import type { Schema } from './schema';

/**
 * Convert Observable to AsyncIterable
 */
async function* observableToAsyncIterable(observable: {
  subscribe: (observer: { next: (v: BuilderOutput) => void; error: (e: Error) => void; complete: () => void }) => { unsubscribe: () => void }
}): AsyncGenerator<BuilderOutput> {
  type T = BuilderOutput;
  const queue: T[] = [];
  let resolve: (() => void) | null = null;
  let reject: ((e: Error) => void) | null = null;
  let done = false;
  let error: Error | null = null;

  const subscription = observable.subscribe({
    next: (value: T) => {
      queue.push(value);
      if (resolve) {
        resolve();
        resolve = null;
      }
    },
    error: (e: Error) => {
      error = e;
      done = true;
      if (reject) {
        reject(e);
        reject = null;
      }
    },
    complete: () => {
      done = true;
      if (resolve) {
        resolve();
        resolve = null;
      }
    },
  });

  try {
    while (true) {
      if (queue.length > 0) {
        yield queue.shift()!;
      } else if (done) {
        if (error) throw error;
        return;
      } else {
        await new Promise<void>((res, rej) => {
          resolve = res;
          reject = rej;
        });
      }
    }
  } finally {
    subscription.unsubscribe();
  }
}

/**
 * Execute the Bun SSR serve builder
 */
async function* execute(
  options: Schema,
  context: BuilderContext
): AsyncGenerator<BuilderOutput> {
  const { browserTarget, port, host, watch, ssl, sslKey, sslCert, verbose, open } = options;

  // Parse the browser target
  const target = targetFromTargetString(browserTarget);

  context.logger.info(`🔧 Building browser application...`);

  // Schedule the browser build
  const browserBuild = await context.scheduleTarget(target, {
    watch,
  });

  let serverProcess: ChildProcess | null = null;
  let isFirstBuild = true;

  try {
    // Watch for build results using async iterable
    for await (const buildResult of observableToAsyncIterable(browserBuild.output)) {
      if (!buildResult.success) {
        yield { success: false, error: 'Browser build failed' } as BuilderOutput;
        continue;
      }

      // Get the output path from the build
      const outputPath = (buildResult as BuilderOutput & { outputPath?: string }).outputPath ||
        join(context.workspaceRoot, `dist/${target.project}/browser`);
      const serverOutputPath = join(context.workspaceRoot, `dist/${target.project}/server`);

      context.logger.info(`📦 Browser build complete: ${outputPath}`);

      // Stop existing server if running
      if (serverProcess) {
        context.logger.info('🔄 Restarting server...');
        serverProcess.kill();
        serverProcess = null;
      }

      // Find the server file
      const serverFile = join(context.workspaceRoot, 'server.ts');
      const serverJsFile = join(serverOutputPath, 'server.js');

      let serverEntryPoint: string;
      if (existsSync(serverJsFile)) {
        serverEntryPoint = serverJsFile;
      } else if (existsSync(serverFile)) {
        serverEntryPoint = serverFile;
      } else {
        yield {
          success: false,
          error: 'Server file not found. Run `ng add @pegasusheavy/ngx-bun` to generate one.'
        } as BuilderOutput;
        continue;
      }

      // Set environment variables
      const env = {
        ...process.env,
        NODE_ENV: context.target?.configuration === 'production' ? 'production' : 'development',
        PORT: String(port),
        HOST: host,
        BROWSER_DIST_FOLDER: outputPath,
        SERVER_DIST_FOLDER: serverOutputPath,
      };

      // Start the Bun server
      context.logger.info(`🚀 Starting Bun SSR server on ${ssl ? 'https' : 'http'}://${host}:${port}`);

      serverProcess = spawn('bun', ['run', serverEntryPoint], {
        env,
        cwd: context.workspaceRoot,
        stdio: verbose ? 'inherit' : 'pipe',
      });

      if (!verbose && serverProcess.stdout) {
        serverProcess.stdout.on('data', (data: Buffer) => {
          context.logger.info(data.toString().trim());
        });
      }

      if (serverProcess.stderr) {
        serverProcess.stderr.on('data', (data: Buffer) => {
          context.logger.error(data.toString().trim());
        });
      }

      serverProcess.on('error', (error: Error) => {
        context.logger.error(`Server error: ${error.message}`);
      });

      // Open browser on first build
      if (isFirstBuild && open) {
        const url = `${ssl ? 'https' : 'http'}://${host}:${port}`;
        const openCommand = process.platform === 'darwin' ? 'open' :
                          process.platform === 'win32' ? 'start' : 'xdg-open';
        spawn(openCommand, [url], { detached: true, stdio: 'ignore' });
        isFirstBuild = false;
      }

      yield { success: true };
    }
  } finally {
    // Cleanup
    if (serverProcess) {
      serverProcess.kill();
    }
    await browserBuild.stop();
  }
}

/**
 * Bun SSR Serve Builder
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default createBuilder(execute) as any;
