/**
 * Options for the prerender builder
 */
export interface Schema {
    /**
     * A browser builder target
     */
    browserTarget: string;
    /**
     * Array of routes to prerender
     */
    routes: string[];
    /**
     * Path to a file containing routes to prerender
     */
    routesFile?: string;
    /**
     * Output directory for prerendered files
     */
    outputPath?: string;
    /**
     * Number of concurrent renders
     */
    concurrency: number;
    /**
     * Generate sitemap.xml file
     */
    generateSitemap: boolean;
    /**
     * Base URL for sitemap generation
     */
    baseUrl?: string;
    /**
     * Minify HTML output
     */
    minify: boolean;
    /**
     * Enable verbose logging
     */
    verbose: boolean;
}
