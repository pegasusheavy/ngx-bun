import {
  Rule,
  SchematicContext,
  Tree,
  chain,
  schematic,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import {
  addPackageJsonDependency,
  NodeDependencyType,
} from '@schematics/angular/utility/dependencies';
import { getWorkspace, updateWorkspace } from '@schematics/angular/utility/workspace';
import type { Schema } from './schema';

/**
 * Get the default project name from workspace
 */
async function getDefaultProjectName(tree: Tree): Promise<string | undefined> {
  const workspace = await getWorkspace(tree);

  // Try to get from workspace extensions
  const defaultProject = workspace.extensions['defaultProject'] as string | undefined;
  if (defaultProject) {
    return defaultProject;
  }

  // Get first project
  const projects = Array.from(workspace.projects.keys());
  return projects[0];
}

/**
 * Add required dependencies to package.json
 */
function addDependencies(options: Schema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    // Add peer dependencies
    addPackageJsonDependency(tree, {
      type: NodeDependencyType.Default,
      name: '@angular/ssr',
      version: '^19.0.0',
    });

    addPackageJsonDependency(tree, {
      type: NodeDependencyType.Default,
      name: '@angular/platform-server',
      version: '^19.0.0',
    });

    // Add dev dependencies
    addPackageJsonDependency(tree, {
      type: NodeDependencyType.Dev,
      name: '@types/bun',
      version: '^1.1.14',
    });

    context.logger.info('✅ Added required dependencies');
    return tree;
  };
}

/**
 * Update angular.json with SSR configuration
 */
function updateAngularJson(options: Schema): Rule {
  return updateWorkspace((workspace) => {
    const projectName = options.project;
    if (!projectName) {
      throw new Error('Project name is required');
    }

    const project = workspace.projects.get(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found in workspace`);
    }

    // Get build target
    const buildTarget = project.targets.get('build');
    if (!buildTarget) {
      throw new Error(`Build target not found for project "${projectName}"`);
    }

    // Update build target for SSR
    if (!buildTarget.options) {
      buildTarget.options = {};
    }
    buildTarget.options['prerender'] = false;
    buildTarget.options['ssr'] = {
      entry: `${options.serverFileName}`,
    };

    // Add server target if it doesn't exist
    if (!project.targets.has('serve-ssr')) {
      project.targets.set('serve-ssr', {
        builder: '@pegasusheavy/ngx-bun:serve',
        options: {
          browserTarget: `${projectName}:build`,
          port: options.port,
        },
        configurations: {
          production: {
            browserTarget: `${projectName}:build:production`,
          },
          development: {
            browserTarget: `${projectName}:build:development`,
          },
        },
        defaultConfiguration: 'development',
      });
    }

    // Add prerender target
    if (!project.targets.has('prerender')) {
      project.targets.set('prerender', {
        builder: '@pegasusheavy/ngx-bun:prerender',
        options: {
          browserTarget: `${projectName}:build:production`,
          routes: ['/'],
        },
        configurations: {
          production: {
            browserTarget: `${projectName}:build:production`,
          },
        },
        defaultConfiguration: 'production',
      });
    }
  });
}

/**
 * Update package.json scripts
 */
function updatePackageJsonScripts(options: Schema): Rule {
  return (tree: Tree) => {
    const packageJsonPath = '/package.json';
    const packageJsonContent = tree.read(packageJsonPath);

    if (!packageJsonContent) {
      throw new Error('Could not find package.json');
    }

    const packageJson = JSON.parse(packageJsonContent.toString());

    // Add/update scripts
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts['dev:ssr'] = `ng run ${options.project}:serve-ssr`;
    packageJson.scripts['build:ssr'] = `ng build && bun build ${options.serverFileName} --outdir dist/${options.project}/server --target bun`;
    packageJson.scripts['serve:ssr'] = `bun dist/${options.project}/server/server.js`;
    packageJson.scripts['prerender'] = `ng run ${options.project}:prerender`;

    tree.overwrite(packageJsonPath, JSON.stringify(packageJson, null, 2));

    return tree;
  };
}

/**
 * Install packages
 */
function installPackages(options: Schema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    if (!options.skipInstall) {
      context.addTask(new NodePackageInstallTask());
    }
    return tree;
  };
}

/**
 * Main ng-add schematic
 */
export function ngAdd(options: Schema): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    // Get project name if not provided
    if (!options.project) {
      options.project = await getDefaultProjectName(tree);
    }

    if (!options.project) {
      throw new Error(
        'Could not determine project name. Please specify using --project flag.'
      );
    }

    context.logger.info(`\n🚀 Adding @pegasusheavy/ngx-bun to project "${options.project}"...\n`);

    return chain([
      addDependencies(options),
      schematic('server', {
        project: options.project,
        port: options.port,
        serverFileName: options.serverFileName,
      }),
      updateAngularJson(options),
      updatePackageJsonScripts(options),
      installPackages(options),
      (tree: Tree, context: SchematicContext) => {
        context.logger.info('\n✨ @pegasusheavy/ngx-bun has been added to your project!\n');
        context.logger.info('Available commands:');
        context.logger.info('  • npm run dev:ssr     - Start development server with SSR');
        context.logger.info('  • npm run build:ssr   - Build for production');
        context.logger.info('  • npm run serve:ssr   - Serve production build');
        context.logger.info('  • npm run prerender   - Generate static pages');
        context.logger.info('');
        return tree;
      },
    ]);
  };
}
