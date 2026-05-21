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
        <section className="storepulse-hero-v2">
          <div className="storepulse-hero-copy">
            <div className="storepulse-eyebrow">
              <span className="storepulse-dot" />
              StorePulse Health · Shopify Admin App
            </div>

            <h1 className="storepulse-title">
              A fun, practical health monitor for Shopify catalogs.
            </h1>

            <p className="storepulse-subtitle">
              Scan product content, inventory signals, and SEO fields. Then
              turn messy catalog data into a clean health score, priority list,
              and merchant-friendly action plan.
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

              <Link className="storepulse-secondary-button" to="/app/issues">
                View all issues
              </Link>
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

            <div className="storepulse-chip-row">
              <span>Product images</span>
              <span>SEO titles</span>
              <span>Descriptions</span>
              <span>Inventory</span>
              <span>SKUs</span>
            </div>
          </div>

          <div className="storepulse-score-panel">
            <div className="storepulse-score-orbit">
              <div className="storepulse-score-circle">
                <span className="storepulse-score-label">Health score</span>
                <strong>{healthScore ?? "--"}</strong>
                <span className="storepulse-score-total">/ 100</span>
              </div>
            </div>

            {scoreDetails ? (
              <div
                className={`storepulse-grade-card storepulse-grade-${scoreDetails.grade
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                <span>{scoreDetails.grade}</span>
                <p>{scoreDetails.summary}</p>
              </div>
            ) : (
              <div className="storepulse-grade-card">
                <span>No scan yet</span>
                <p>Run your first scan to calculate the store health score.</p>
              </div>
            )}

            {latestScan ? (
              <p className="storepulse-last-scan">
                Last scan: {formatDate(latestScan.createdAt)} ·{" "}
                {latestScan.totalProducts} product(s)
              </p>
            ) : null}
          </div>
        </section>

        <section className="storepulse-metric-grid">
          <MetricCard
            value={dashboard.scanCount}
            label="Scans completed"
            icon="↻"
          />
          <MetricCard value={totalIssues} label="Issues found" icon="!" />
          <MetricCard
            value={latestScan?.totalProducts ?? 0}
            label="Products checked"
            icon="◆"
          />
          <MetricCard
            value={criticalCount}
            label="Critical fixes"
            icon="●"
            extraClassName="storepulse-critical-card"
          />
        </section>

        <section className="storepulse-priority-strip">
          <PriorityBlock
            label="Critical"
            value={criticalCount}
            copy="Fix first"
            type="critical"
          />
          <PriorityBlock
            label="Warning"
            value={warningCount}
            copy="Improve soon"
            type="warning"
          />
          <PriorityBlock
            label="Suggestion"
            value={suggestionCount}
            copy="Nice upgrades"
            type="suggestion"
          />
        </section>

        <section className="storepulse-two-column">
          <section className="storepulse-card">
            <div className="storepulse-section-heading">
              <div>
                <p className="storepulse-section-kicker">Latest scan</p>
                <h2 className="storepulse-section-title">
                  Highest priority issues
                </h2>
                <p className="storepulse-section-copy">
                  A quick look at the problems merchants should notice first.
                </p>
              </div>

              <Link className="storepulse-secondary-button" to="/app/issues">
                View all
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
                No scan history yet. Click <strong>Run new scan</strong> to
                check your development store products.
              </div>
            )}
          </section>

          <section className="storepulse-card">
            <div className="storepulse-section-heading">
              <div>
                <p className="storepulse-section-kicker">Progress</p>
                <h2 className="storepulse-section-title">Scan history</h2>
                <p className="storepulse-section-copy">
                  Use repeated scans to show catalog cleanup progress.
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
                Completed scans will appear here.
              </div>
            )}
          </section>
        </section>

        <section className="storepulse-card storepulse-playbook">
          <div>
            <p className="storepulse-section-kicker">Merchant playbook</p>
            <h2 className="storepulse-section-title">
              How to improve the score
            </h2>
          </div>

          <div className="storepulse-playbook-grid">
            <PlaybookItem
              number="01"
              title="Fix critical blockers"
              copy="Start with missing images, zero-price variants, and active products that appear out of stock."
            />
            <PlaybookItem
              number="02"
              title="Strengthen product pages"
              copy="Improve thin descriptions, weak SEO titles, and missing SEO descriptions."
            />
            <PlaybookItem
              number="03"
              title="Clean catalog operations"
              copy="Add SKUs, product types, and vendor values so reporting and filtering work better."
            />
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
  icon,
  extraClassName = "",
}: {
  value: number;
  label: string;
  icon: string;
  extraClassName?: string;
}) {
  return (
    <div className={`storepulse-metric-card ${extraClassName}`}>
      <div className="storepulse-metric-icon">{icon}</div>
      <p className="storepulse-metric-value">{value}</p>
      <p className="storepulse-metric-label">{label}</p>
    </div>
  );
}

function PriorityBlock({
  label,
  value,
  copy,
  type,
}: {
  label: string;
  value: number;
  copy: string;
  type: "critical" | "warning" | "suggestion";
}) {
  return (
    <div className={`storepulse-priority-block storepulse-priority-block-${type}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{copy}</p>
    </div>
  );
}

function PlaybookItem({
  number,
  title,
  copy,
}: {
  number: string;
  title: string;
  copy: string;
}) {
  return (
    <article className="storepulse-playbook-item">
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
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