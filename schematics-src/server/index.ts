import {
  Rule,
  SchematicContext,
  Tree,
  apply,
  url,
  template,
  move,
  mergeWith,
  MergeStrategy,
} from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';
import { getWorkspace } from '@schematics/angular/utility/workspace';
import type { Schema } from './schema';

/**
 * Generate the server file for Bun SSR
 */
export function server(options: Schema): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const workspace = await getWorkspace(tree);
    const project = workspace.projects.get(options.project);

    if (!project) {
      throw new Error(`Project "${options.project}" not found in workspace`);
    }

    const projectRoot = project.root || '';

    // Get source root
    const sourceRoot = project.sourceRoot || `${projectRoot}/src`;

    context.logger.info(`Creating server file for project "${options.project}"...`);

    // Template options
    const templateOptions = {
      ...options,
      ...strings,
      projectRoot,
      sourceRoot,
    };

    // Apply templates
    const templateSource = apply(url('./files'), [
      template(templateOptions),
      move(projectRoot),
    ]);

    return mergeWith(templateSource, MergeStrategy.Overwrite);
  };
}
