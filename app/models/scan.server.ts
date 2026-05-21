import db from "../db.server";

export type ScanIssueInput = {
  productId: string;
  productTitle: string;
  issueType: string;
  priority: "Critical" | "Warning" | "Suggestion";
  message: string;
  suggestedFix: string;
};

/**
 * Makes sure we have a Shop record for the installed store.
 * Shopify's session table stores OAuth sessions, but our app needs its own
 * shop row so scans and issues have a clean parent record.
 */
export async function ensureShop(shopDomain: string) {
  return db.shop.upsert({
    where: {
      shopDomain,
    },
    update: {},
    create: {
      shopDomain,
    },
  });
}

/**
 * Saves a completed scan and all of the issues found during that scan.
 */
export async function createScanRun({
  shopDomain,
  healthScore,
  totalProducts,
  issues,
}: {
  shopDomain: string;
  healthScore: number;
  totalProducts: number;
  issues: ScanIssueInput[];
}) {
  await ensureShop(shopDomain);

  const criticalCount = issues.filter(
    (issue) => issue.priority === "Critical",
  ).length;

  const warningCount = issues.filter(
    (issue) => issue.priority === "Warning",
  ).length;

  const suggestionCount = issues.filter(
    (issue) => issue.priority === "Suggestion",
  ).length;

  return db.scan.create({
    data: {
      shopDomain,
      healthScore,
      totalProducts,
      totalIssues: issues.length,
      criticalCount,
      warningCount,
      suggestionCount,
      status: "COMPLETED",
      issues: {
        create: issues,
      },
    },
    include: {
      issues: true,
    },
  });
}

/**
 * Returns the latest scan and simple dashboard numbers.
 */
export async function getDashboardStats(shopDomain: string) {
  const shop = await ensureShop(shopDomain);

  const latestScan = await db.scan.findFirst({
    where: {
      shopDomain: shop.shopDomain,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      issues: {
        orderBy: [
          {
            priority: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
        take: 6,
      },
    },
  });

  const scanCount = await db.scan.count({
    where: {
      shopDomain: shop.shopDomain,
    },
  });

  return {
    shopDomain: shop.shopDomain,
    scanCount,
    latestScan,
  };
}