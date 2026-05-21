import { Form, Link, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import { getLatestScanIssues } from "../models/scan.server";
import styles from "../styles/storepulse.css?url";

export const links = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ request }: { request: Request }) {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  const priority = url.searchParams.get("priority") ?? "All";
  const issueType = url.searchParams.get("issueType") ?? "All";
  const search = url.searchParams.get("search") ?? "";

  const issueData = await getLatestScanIssues({
    shopDomain: session.shop,
    filters: {
      priority,
      issueType,
      search,
    },
  });

  return {
    shopDomain: session.shop,
    selectedPriority: priority,
    selectedIssueType: issueType,
    search,
    issueData,
  };
}

export default function IssuesPage() {
  const {
    shopDomain,
    selectedPriority,
    selectedIssueType,
    search,
    issueData,
  } = useLoaderData<typeof loader>();

  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  return (
    <main className="storepulse-page">
      <div className="storepulse-shell">
        <section className="storepulse-card storepulse-page-header">
          <div>
            <div className="storepulse-eyebrow">
              StorePulse Health · Issue Detail View
            </div>

            <h1 className="storepulse-title">Product issues from the latest scan</h1>

            <p className="storepulse-subtitle">
              Review the exact product, inventory, and SEO issues that were
              found. Start with critical issues, then move to warnings and
              suggestions.
            </p>
          </div>

          <div className="storepulse-header-actions">
            <Link className="storepulse-secondary-button" to="/app">
              Back to dashboard
            </Link>
          </div>
        </section>

        <section className="storepulse-grid">
          <MetricCard
            value={issueData.summary.totalIssues}
            label="Matching issues"
          />
          <MetricCard
            value={issueData.summary.totalProductsWithIssues}
            label="Products affected"
          />
          <MetricCard
            value={issueData.latestScan?.healthScore ?? 0}
            label="Latest health score"
          />
        </section>

        <section className="storepulse-grid">
          <MetricCard
            value={issueData.summary.criticalCount}
            label="Critical"
            extraClassName="storepulse-critical"
          />
          <MetricCard
            value={issueData.summary.warningCount}
            label="Warning"
            extraClassName="storepulse-warning"
          />
          <MetricCard
            value={issueData.summary.suggestionCount}
            label="Suggestion"
            extraClassName="storepulse-suggestion"
          />
        </section>

        <section className="storepulse-card">
          <div className="storepulse-section-heading">
            <div>
              <h2 className="storepulse-section-title">Filter issues</h2>
              <p className="storepulse-section-copy">
                Narrow the list by priority, issue type, or product title.
              </p>
            </div>
          </div>

          <Form method="get" className="storepulse-filter-form">
            <label className="storepulse-field">
              <span>Priority</span>
              <select name="priority" defaultValue={selectedPriority}>
                <option value="All">All priorities</option>
                <option value="Critical">Critical</option>
                <option value="Warning">Warning</option>
                <option value="Suggestion">Suggestion</option>
              </select>
            </label>

            <label className="storepulse-field">
              <span>Issue type</span>
              <select name="issueType" defaultValue={selectedIssueType}>
                <option value="All">All issue types</option>
                {issueData.issueTypes.map((issueType) => (
                  <option value={issueType} key={issueType}>
                    {formatIssueType(issueType)}
                  </option>
                ))}
              </select>
            </label>

            <label className="storepulse-field storepulse-search-field">
              <span>Product search</span>
              <input
                name="search"
                type="search"
                placeholder="Search product title"
                defaultValue={search}
              />
            </label>

            <div className="storepulse-filter-actions">
              <button className="storepulse-primary-button" type="submit">
                {isLoading ? "Filtering..." : "Apply filters"}
              </button>

              <Link className="storepulse-text-link" to="/app/issues">
                Clear filters
              </Link>
            </div>
          </Form>
        </section>

        <section className="storepulse-two-column" style={{ marginTop: "24px" }}>
          <section className="storepulse-card">
            <div className="storepulse-section-heading">
              <div>
                <h2 className="storepulse-section-title">Issues</h2>
                <p className="storepulse-section-copy">
                  Each issue includes a suggested merchant action.
                </p>
              </div>
            </div>

            {!issueData.latestScan ? (
              <EmptyScanState />
            ) : issueData.issues.length > 0 ? (
              <div className="storepulse-issue-list">
                {issueData.issues.map((issue) => (
                  <article className="storepulse-issue" key={issue.id}>
                    <div>
                      <span
                        className={`storepulse-priority storepulse-priority-${issue.priority.toLowerCase()}`}
                      >
                        {issue.priority}
                      </span>
                    </div>

                    <div>
                      <div className="storepulse-issue-heading-row">
                        <h3 className="storepulse-issue-title">
                          {issue.productTitle}
                        </h3>

                        <a
                          className="storepulse-product-link"
                          href={getShopifyProductAdminUrl({
                            shopDomain,
                            productId: issue.productId,
                          })}
                          target="_top"
                        >
                          Open product
                        </a>
                      </div>

                      <p className="storepulse-issue-type">
                        {formatIssueType(issue.issueType)}
                      </p>

                      <p className="storepulse-issue-message">{issue.message}</p>

                      <p className="storepulse-issue-fix">
                        Fix: {issue.suggestedFix}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="storepulse-empty">
                No issues match the current filters. Try clearing the filters or
                running a new scan.
              </div>
            )}
          </section>

          <section className="storepulse-card">
            <div className="storepulse-section-heading">
              <div>
                <h2 className="storepulse-section-title">Products affected</h2>
                <p className="storepulse-section-copy">
                  Products are sorted by critical issue count first.
                </p>
              </div>
            </div>

            {issueData.productGroups.length > 0 ? (
              <div className="storepulse-product-group-list">
                {issueData.productGroups.map((product) => (
                  <article
                    className="storepulse-product-group"
                    key={product.productId}
                  >
                    <div>
                      <h3>{product.productTitle}</h3>
                      <p>{product.issueCount} issue(s) found</p>
                    </div>

                    <div className="storepulse-mini-badges">
                      {product.criticalCount > 0 ? (
                        <span className="storepulse-mini-badge storepulse-mini-critical">
                          {product.criticalCount} critical
                        </span>
                      ) : null}

                      {product.warningCount > 0 ? (
                        <span className="storepulse-mini-badge storepulse-mini-warning">
                          {product.warningCount} warning
                        </span>
                      ) : null}

                      {product.suggestionCount > 0 ? (
                        <span className="storepulse-mini-badge storepulse-mini-suggestion">
                          {product.suggestionCount} suggestion
                        </span>
                      ) : null}
                    </div>

                    <a
                      className="storepulse-product-link"
                      href={getShopifyProductAdminUrl({
                        shopDomain,
                        productId: product.productId,
                      })}
                      target="_top"
                    >
                      Open in Shopify Admin
                    </a>
                  </article>
                ))}
              </div>
            ) : issueData.latestScan ? (
              <div className="storepulse-empty">
                No affected products match the current filters.
              </div>
            ) : (
              <EmptyScanState />
            )}
          </section>
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

function EmptyScanState() {
  return (
    <div className="storepulse-empty">
      No scan has been run yet. Go back to the dashboard and run a product scan
      first.
    </div>
  );
}

function formatIssueType(issueType: string) {
  return issueType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getShopifyProductAdminUrl({
  shopDomain,
  productId,
}: {
  shopDomain: string;
  productId: string;
}) {
  const storeHandle = shopDomain.replace(".myshopify.com", "");
  const numericProductId = productId.split("/").pop();

  return `https://admin.shopify.com/store/${storeHandle}/products/${numericProductId}`;
}