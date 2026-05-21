import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getDashboardStats } from "../models/scan.server";
import styles from "../styles/storepulse.css?url";

export const links = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ request }: { request: Request }) {
  const { session } = await authenticate.admin(request);
  const dashboard = await getDashboardStats(session.shop);

  return {
    dashboard,
  };
}

export default function AppIndex() {
  const { dashboard } = useLoaderData<typeof loader>();
  const latestScan = dashboard.latestScan;

  const healthScore = latestScan?.healthScore ?? null;
  const totalIssues = latestScan?.totalIssues ?? 0;
  const criticalCount = latestScan?.criticalCount ?? 0;
  const warningCount = latestScan?.warningCount ?? 0;
  const suggestionCount = latestScan?.suggestionCount ?? 0;

  return (
    <main className="storepulse-page">
      <div className="storepulse-shell">
        <section className="storepulse-hero">
          <div className="storepulse-card">
            <div className="storepulse-eyebrow">
              StorePulse Health · MVP Phase 1
            </div>

            <h1 className="storepulse-title">
              Find product, inventory, and SEO issues before they hurt your store.
            </h1>

            <p className="storepulse-subtitle">
              StorePulse Health scans a Shopify store, calculates a simple health
              score, and gives merchants a prioritized list of fixes. This first
              phase sets up the embedded app, authentication, database, and
              dashboard foundation.
            </p>

            <div className="storepulse-pill-row">
              <span className="storepulse-pill">Product scanning</span>
              <span className="storepulse-pill">Inventory checks</span>
              <span className="storepulse-pill">SEO issue detection</span>
              <span className="storepulse-pill">Fix priority labels</span>
            </div>
          </div>

          <div className="storepulse-card storepulse-score-card">
            <div>
              <p className="storepulse-score-label">Current store health score</p>
              <p className="storepulse-score">{healthScore ?? "--"}</p>
              <p className="storepulse-score-note">
                {latestScan
                  ? "This score is based on the latest completed scan."
                  : "No scan has been run yet. The scan engine will be added in Phase 2."}
              </p>
            </div>
          </div>
        </section>

        <section className="storepulse-grid">
          <div className="storepulse-metric">
            <p className="storepulse-metric-value">{dashboard.scanCount}</p>
            <p className="storepulse-metric-label">Scans completed</p>
          </div>

          <div className="storepulse-metric">
            <p className="storepulse-metric-value">{totalIssues}</p>
            <p className="storepulse-metric-label">Issues found</p>
          </div>

          <div className="storepulse-metric">
            <p className="storepulse-metric-value">{criticalCount}</p>
            <p className="storepulse-metric-label">Critical fixes</p>
          </div>
        </section>

        <section className="storepulse-card">
          <h2 className="storepulse-section-title">Phase 1 setup status</h2>

          <div className="storepulse-checklist">
            <div className="storepulse-check-item">
              <div className="storepulse-check-icon">✓</div>
              <div>
                <p className="storepulse-check-title">
                  Shopify embedded app foundation
                </p>
                <p className="storepulse-check-copy">
                  The app is running inside Shopify Admin and protected by
                  Shopify authentication.
                </p>
              </div>
            </div>

            <div className="storepulse-check-item">
              <div className="storepulse-check-icon">✓</div>
              <div>
                <p className="storepulse-check-title">Database models added</p>
                <p className="storepulse-check-copy">
                  StorePulse now has tables for shops, scans, and product-level
                  issues.
                </p>
              </div>
            </div>

            <div className="storepulse-check-item">
              <div className="storepulse-check-icon">✓</div>
              <div>
                <p className="storepulse-check-title">Dashboard shell created</p>
                <p className="storepulse-check-copy">
                  The dashboard is ready for the product scanner, health score,
                  and scan history features.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="storepulse-card" style={{ marginTop: "24px" }}>
          <h2 className="storepulse-section-title">Latest scan</h2>

          {latestScan ? (
            <div className="storepulse-grid" style={{ marginBottom: 0 }}>
              <div className="storepulse-metric">
                <p className="storepulse-metric-value">{warningCount}</p>
                <p className="storepulse-metric-label">Warnings</p>
              </div>

              <div className="storepulse-metric">
                <p className="storepulse-metric-value">{suggestionCount}</p>
                <p className="storepulse-metric-label">Suggestions</p>
              </div>

              <div className="storepulse-metric">
                <p className="storepulse-metric-value">
                  {latestScan.totalProducts}
                </p>
                <p className="storepulse-metric-label">Products scanned</p>
              </div>
            </div>
          ) : (
            <div className="storepulse-empty">
              No scan history yet. In Phase 2, we will add the product scanner
              and connect it to Shopify’s GraphQL Admin API.
            </div>
          )}
        </section>

        <p className="storepulse-footer">
          Built by Kazi Ahmed · StorePulse Health
        </p>
      </div>
    </main>
  );
}