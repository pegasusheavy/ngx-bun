/**
 * Options for the ng-add schematic
 */
export interface Schema {
  /**
   * The name of the project to add SSR to
   */
  project?: string;

  /**
   * The port for the SSR server
   */
  port: number;

  /**
   * Skip package installation
   */
  skipInstall: boolean;

  /**
   * Name of the server file
   */
  serverFileName: string;
}
