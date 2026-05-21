import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import { getDashboardStats } from "../models/scan.server";
import { runProductScan } from "../services/product-scanner.server";
import styles from "../styles/storepulse.css?url";

export const links = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ request }: { request: Request }) {
  const { session } = await authenticate.admin(request);
  const dashboard = await getDashboardStats(session.shop);

  return {
    dashboard,
  };
}

export async function action({ request }: { request: Request }) {
  const { admin, session } = await authenticate.admin(request);

  try {
    const scan = await runProductScan({
      admin,
      shopDomain: session.shop,
    });

    return {
      ok: true,
      message: `Scan completed. ${scan.totalProducts} products checked and ${scan.totalIssues} issues found.`,
    };
  } catch (error) {
    console.error("StorePulse scan failed", error);

    return {
      ok: false,
      message:
        "The scan could not be completed. Check your terminal logs and Shopify app scopes.",
    };
  }
}

export default function AppIndex() {
  const { dashboard } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const latestScan = dashboard.latestScan;
  const isScanning = navigation.state === "submitting";

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
              StorePulse Health · MVP Phase 2
            </div>

            <h1 className="storepulse-title">
              Scan your Shopify catalog and find issues that deserve attention.
            </h1>

            <p className="storepulse-subtitle">
              StorePulse Health checks product content, inventory signals, and
              basic SEO fields, then turns the results into a simple health
              score and prioritized issue list.
            </p>

            <div className="storepulse-actions">
              <Form method="post">
                <button
                  className="storepulse-primary-button"
                  type="submit"
                  disabled={isScanning}
                >
                  {isScanning ? "Scanning products..." : "Run product scan"}
                </button>
              </Form>

              <span className="storepulse-action-note">
                Scans up to 250 recently updated products in this MVP.
              </span>
            </div>

            {actionData?.message ? (
              <div
                className={
                  actionData.ok
                    ? "storepulse-alert storepulse-alert-success"
                    : "storepulse-alert storepulse-alert-error"
                }
              >
                {actionData.message}
              </div>
            ) : null}

            <div className="storepulse-pill-row">
              <span className="storepulse-pill">Missing images</span>
              <span className="storepulse-pill">Weak descriptions</span>
              <span className="storepulse-pill">SEO gaps</span>
              <span className="storepulse-pill">Inventory warnings</span>
            </div>
          </div>

          <div className="storepulse-card storepulse-score-card">
            <div>
              <p className="storepulse-score-label">Current store health score</p>
              <p className="storepulse-score">{healthScore ?? "--"}</p>
              <p className="storepulse-score-note">
                {latestScan
                  ? "This score is based on your latest product scan."
                  : "Run your first scan to generate a health score."}
              </p>
            </div>

            {latestScan ? (
              <div className="storepulse-score-meta">
                Last scan checked {latestScan.totalProducts} product(s).
              </div>
            ) : null}
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

        <section className="storepulse-grid">
          <div className="storepulse-metric storepulse-critical">
            <p className="storepulse-metric-value">{criticalCount}</p>
            <p className="storepulse-metric-label">Critical</p>
          </div>

          <div className="storepulse-metric storepulse-warning">
            <p className="storepulse-metric-value">{warningCount}</p>
            <p className="storepulse-metric-label">Warning</p>
          </div>

          <div className="storepulse-metric storepulse-suggestion">
            <p className="storepulse-metric-value">{suggestionCount}</p>
            <p className="storepulse-metric-label">Suggestion</p>
          </div>
        </section>

        <section className="storepulse-card">
          <h2 className="storepulse-section-title">Latest issues found</h2>

          {latestScan && latestScan.issues.length > 0 ? (
            <div className="storepulse-issue-list">
              {latestScan.issues.map((issue) => (
                <article className="storepulse-issue" key={issue.id}>
                  <div>
                    <span
                      className={`storepulse-priority storepulse-priority-${issue.priority.toLowerCase()}`}
                    >
                      {issue.priority}
                    </span>
                  </div>

                  <div>
                    <h3 className="storepulse-issue-title">
                      {issue.productTitle}
                    </h3>
                    <p className="storepulse-issue-message">{issue.message}</p>
                    <p className="storepulse-issue-fix">
                      Fix: {issue.suggestedFix}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : latestScan ? (
            <div className="storepulse-empty">
              Great start. The latest scan did not find any issues using the
              current MVP rules.
            </div>
          ) : (
            <div className="storepulse-empty">
              No scan history yet. Click <strong>Run product scan</strong> to
              check your development store products.
            </div>
          )}
        </section>

        <section className="storepulse-card" style={{ marginTop: "24px" }}>
          <h2 className="storepulse-section-title">What this scanner checks</h2>

          <div className="storepulse-checklist">
            <div className="storepulse-check-item">
              <div className="storepulse-check-icon">1</div>
              <div>
                <p className="storepulse-check-title">Product content quality</p>
                <p className="storepulse-check-copy">
                  Missing images, short descriptions, short titles, missing
                  vendor, and missing product type.
                </p>
              </div>
            </div>

            <div className="storepulse-check-item">
              <div className="storepulse-check-icon">2</div>
              <div>
                <p className="storepulse-check-title">Inventory and variant setup</p>
                <p className="storepulse-check-copy">
                  Active products with zero inventory, variants without SKUs,
                  and variants with zero pricing.
                </p>
              </div>
            </div>

            <div className="storepulse-check-item">
              <div className="storepulse-check-icon">3</div>
              <div>
                <p className="storepulse-check-title">Basic SEO readiness</p>
                <p className="storepulse-check-copy">
                  Missing or weak SEO titles and SEO descriptions.
                </p>
              </div>
            </div>
          </div>
        </section>

        <p className="storepulse-footer">
          Built by Kazi Ahmed · StorePulse Health
        </p>
      </div>
    </main>
  );
}