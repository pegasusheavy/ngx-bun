import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  template: `
    <div class="container">
      <header>
        <h1>🚀 &#64;pegasusheavy/ngx-bun Demo</h1>
        <p class="subtitle">Angular 19 + Bun SSR</p>
      </header>

      <main>
        <section class="info-card">
          <h2>Server-Side Rendering Status</h2>
          <div class="status">
            <div class="status-item">
              <span class="label">Rendered on:</span>
              <span class="value" [class.server]="isServer" [class.browser]="isBrowser">
                {{ platform }}
              </span>
            </div>
            <div class="status-item">
              <span class="label">Timestamp:</span>
              <span class="value">{{ timestamp }}</span>
            </div>
            <div class="status-item">
              <span class="label">Hydrated:</span>
              <span class="value">{{ hydrated ? 'Yes ✅' : 'No ⏳' }}</span>
            </div>
          </div>
        </section>

        <section class="info-card">
          <h2>How to Verify SSR</h2>
          <ol>
            <li>View page source (Ctrl+U / Cmd+U)</li>
            <li>Look for the rendered HTML content</li>
            <li>The "Rendered on" should show "Server" in the source</li>
            <li>After hydration, it will show "Browser"</li>
          </ol>
        </section>

        <section class="info-card">
          <h2>Features</h2>
          <ul>
            <li>⚡ Blazing fast Bun runtime</li>
            <li>🔄 Full SSR with hydration</li>
            <li>📦 Static file serving</li>
            <li>💾 Built-in render caching</li>
            <li>🛠️ Angular CLI integration</li>
          </ul>
        </section>
      </main>

      <footer>
        <p>Built with ❤️ by <a href="https://github.com/pegasusheavy">Pegasus Heavy Industries</a></p>
      </footer>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #eee;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    header {
      text-align: center;
      margin-bottom: 3rem;
    }

    h1 {
      font-size: 2.5rem;
      margin: 0;
      background: linear-gradient(90deg, #e94560, #ff6b6b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      color: #888;
      margin-top: 0.5rem;
    }

    .info-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .info-card h2 {
      margin-top: 0;
      font-size: 1.25rem;
      color: #e94560;
    }

    .status {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .status-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 6px;
    }

    .label {
      color: #888;
    }

    .value {
      font-weight: 600;
    }

    .value.server {
      color: #4ade80;
    }

    .value.browser {
      color: #60a5fa;
    }

    ol, ul {
      padding-left: 1.5rem;
    }

    li {
      margin-bottom: 0.5rem;
      line-height: 1.6;
    }

    footer {
      text-align: center;
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      color: #666;
    }

    footer a {
      color: #e94560;
      text-decoration: none;
    }

    footer a:hover {
      text-decoration: underline;
    }
  `]
})
export class AppComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  
  isServer = isPlatformServer(this.platformId);
  isBrowser = isPlatformBrowser(this.platformId);
  platform = this.isServer ? '🖥️ Server' : '🌐 Browser';
  timestamp = new Date().toISOString();
  hydrated = false;

  ngOnInit() {
    if (this.isBrowser) {
      this.hydrated = true;
      this.platform = '🌐 Browser';
      this.timestamp = new Date().toISOString();
    }
  }
}
