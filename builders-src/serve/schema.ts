/**
 * Options for the serve builder
 */
export interface Schema {
  /**
   * A browser builder target to serve
   */
  browserTarget: string;

  /**
   * Port to listen on
   */
  port: number;

  /**
   * Host to listen on
   */
  host: string;

  /**
   * Opens the URL in default browser
   */
  open: boolean;

  /**
   * Rebuild on change
   */
  watch: boolean;

  /**
   * Serve using HTTPS
   */
  ssl: boolean;

  /**
   * SSL key path
   */
  sslKey?: string;

  /**
   * SSL certificate path
   */
  sslCert?: string;

  /**
   * Enable verbose logging
   */
  verbose: boolean;
}
