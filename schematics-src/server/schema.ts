/**
 * Options for the server schematic
 */
export interface Schema {
  /**
   * The name of the project
   */
  project: string;

  /**
   * The port for the SSR server
   */
  port: number;

  /**
   * Name of the server file
   */
  serverFileName: string;
}
