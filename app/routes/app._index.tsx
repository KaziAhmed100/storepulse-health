import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { authenticate } from "../shopify.server";
import { getDashboardStats } from "../models/scan.server";
import { calculateHealthScore } from "../services/health-score.server";
import { runProductScan } from "../services/product-scanner.server";
import styles from "../styles/storepulse.css?url";

export const links = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ request }: { request: Request }) {
  const { session } = await authenticate.admin(request);
  const dashboard = await getDashboardStats(session.shop);

  const scoreDetails = dashboard.latestScan
    ? calculateHealthScore({
        productCount: dashboard.latestScan.totalProducts,
        issues: dashboard.latestScan.issues,
      })
    : null;

  return {
    dashboard,
    scoreDetails,
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
  const { dashboard, scoreDetails } = useLoaderData<typeof loader>();
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
              StorePulse Health · MVP Phase 3
            </div>

            <h1 className="storepulse-title">
              Prioritize the catalog fixes that matter most.
            </h1>

            <p className="storepulse-subtitle">
              StorePulse Health checks product content, inventory signals, and
              basic SEO fields, then turns the results into a store health score,
              priority summary, and scan history.
            </p>

            <div className="storepulse-actions">
              <Form method="post">
                <button
                  className="storepulse-primary-button"
                  type="submit"
                  disabled={isScanning}
                >
                  {isScanning ? "Scanning products..." : "Run new scan"}
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
              <span className="storepulse-pill">Health score</span>
              <span className="storepulse-pill">Priority labels</span>
              <span className="storepulse-pill">Scan history</span>
              <span className="storepulse-pill">Merchant-friendly fixes</span>
            </div>
          </div>

          <div className="storepulse-card storepulse-score-card">
            <div>
              <p className="storepulse-score-label">Current store health score</p>

              <div className="storepulse-score-row">
                <p className="storepulse-score">{healthScore ?? "--"}</p>

                {scoreDetails ? (
                  <span
                    className={`storepulse-grade storepulse-grade-${scoreDetails.grade
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {scoreDetails.grade}
                  </span>
                ) : null}
              </div>

              <p className="storepulse-score-note">
                {scoreDetails
                  ? scoreDetails.summary
                  : "Run your first scan to generate a health score."}
              </p>
            </div>

            {latestScan ? (
              <div className="storepulse-score-meta">
                Last scan: {formatDate(latestScan.createdAt)} ·{" "}
                {latestScan.totalProducts} product(s) checked
              </div>
            ) : null}
          </div>
        </section>

        <section className="storepulse-grid">
          <MetricCard value={dashboard.scanCount} label="Scans completed" />
          <MetricCard value={totalIssues} label="Issues found" />
          <MetricCard value={latestScan?.totalProducts ?? 0} label="Products checked" />
        </section>

        <section className="storepulse-grid">
          <MetricCard
            value={criticalCount}
            label="Critical"
            extraClassName="storepulse-critical"
          />
          <MetricCard
            value={warningCount}
            label="Warning"
            extraClassName="storepulse-warning"
          />
          <MetricCard
            value={suggestionCount}
            label="Suggestion"
            extraClassName="storepulse-suggestion"
          />
        </section>

        <section className="storepulse-two-column">
          <section className="storepulse-card">
            <div className="storepulse-section-heading">
              <div>
                <h2 className="storepulse-section-title">Latest priority issues</h2>
                <p className="storepulse-section-copy">
                  The scanner shows the highest-priority issues first.
                </p>
              </div>

              <Link className="storepulse-secondary-button" to="/app/issues">
                View all issues
              </Link>
            </div>

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
                No scan history yet. Click <strong>Run new scan</strong> to check
                your development store products.
              </div>
            )}
          </section>

          <section className="storepulse-card">
            <div className="storepulse-section-heading">
              <div>
                <h2 className="storepulse-section-title">Scan history</h2>
                <p className="storepulse-section-copy">
                  Recent scans help merchants see whether the store is improving.
                </p>
              </div>
            </div>

            {dashboard.scanHistory.length > 0 ? (
              <div className="storepulse-table-wrap">
                <table className="storepulse-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Score</th>
                      <th>Issues</th>
                      <th>Critical</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.scanHistory.map((scan) => (
                      <tr key={scan.id}>
                        <td>{formatDate(scan.createdAt)}</td>
                        <td>
                          <strong>{scan.healthScore}</strong>
                        </td>
                        <td>{scan.totalIssues}</td>
                        <td>{scan.criticalCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="storepulse-empty">
                No scan history yet. Your completed scans will appear here.
              </div>
            )}
          </section>
        </section>

        <section className="storepulse-card" style={{ marginTop: "24px" }}>
          <h2 className="storepulse-section-title">How to use this score</h2>

          <div className="storepulse-checklist">
            <div className="storepulse-check-item">
              <div className="storepulse-check-icon">1</div>
              <div>
                <p className="storepulse-check-title">
                  Fix critical issues first
                </p>
                <p className="storepulse-check-copy">
                  Critical issues usually affect product trust, inventory
                  readiness, or pricing accuracy.
                </p>
              </div>
            </div>

            <div className="storepulse-check-item">
              <div className="storepulse-check-icon">2</div>
              <div>
                <p className="storepulse-check-title">
                  Improve SEO and product descriptions
                </p>
                <p className="storepulse-check-copy">
                  Warning-level issues help merchants improve search visibility
                  and product page clarity.
                </p>
              </div>
            </div>

            <div className="storepulse-check-item">
              <div className="storepulse-check-icon">3</div>
              <div>
                <p className="storepulse-check-title">
                  Track progress after every cleanup
                </p>
                <p className="storepulse-check-copy">
                  Run another scan after making fixes to see whether the score
                  and issue counts improve.
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

function MetricCard({
  value,
  label,
  extraClassName = "",
}: {
  value: number;
  label: string;
  extraClassName?: string;
}) {
  return (
    <div className={`storepulse-metric ${extraClassName}`}>
      <p className="storepulse-metric-value">{value}</p>
      <p className="storepulse-metric-label">{label}</p>
    </div>
  );
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}