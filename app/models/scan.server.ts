import db from "../db.server";

export type ScanIssueInput = {
  productId: string;
  productTitle: string;
  issueType: string;
  priority: "Critical" | "Warning" | "Suggestion";
  message: string;
  suggestedFix: string;
};

export type IssueFilters = {
  priority?: string;
  issueType?: string;
  search?: string;
};

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
 * Returns the latest scan, a short scan history, and dashboard numbers.
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
        take: 6,
      },
    },
  });

  const sortedLatestScan = latestScan
    ? {
        ...latestScan,
        issues: sortIssuesByPriority(latestScan.issues),
      }
    : null;

  const scanHistory = await db.scan.findMany({
    where: {
      shopDomain: shop.shopDomain,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
    select: {
      id: true,
      healthScore: true,
      totalProducts: true,
      totalIssues: true,
      criticalCount: true,
      warningCount: true,
      suggestionCount: true,
      status: true,
      createdAt: true,
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
    latestScan: sortedLatestScan,
    scanHistory,
  };
}

/**
 * Returns the latest scan with all matching issues for the Issues page.
 */
export async function getLatestScanIssues({
  shopDomain,
  filters,
}: {
  shopDomain: string;
  filters: IssueFilters;
}) {
  await ensureShop(shopDomain);

  const latestScan = await db.scan.findFirst({
    where: {
      shopDomain,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      issues: true,
    },
  });

  if (!latestScan) {
    return {
      latestScan: null,
      issues: [],
      issueTypes: [],
      productGroups: [],
      summary: {
        totalIssues: 0,
        totalProductsWithIssues: 0,
        criticalCount: 0,
        warningCount: 0,
        suggestionCount: 0,
      },
    };
  }

  const allIssues = latestScan.issues;
  const issueTypes = Array.from(
    new Set(allIssues.map((issue) => issue.issueType)),
  ).sort();

  const filteredIssues = sortIssuesByPriority(
    allIssues.filter((issue) => {
      const priorityMatches =
        !filters.priority ||
        filters.priority === "All" ||
        issue.priority === filters.priority;

      const issueTypeMatches =
        !filters.issueType ||
        filters.issueType === "All" ||
        issue.issueType === filters.issueType;

      const searchMatches =
        !filters.search ||
        issue.productTitle
          .toLowerCase()
          .includes(filters.search.trim().toLowerCase());

      return priorityMatches && issueTypeMatches && searchMatches;
    }),
  );

  const productGroups = groupIssuesByProduct(filteredIssues);

  return {
    latestScan,
    issues: filteredIssues,
    issueTypes,
    productGroups,
    summary: {
      totalIssues: filteredIssues.length,
      totalProductsWithIssues: productGroups.length,
      criticalCount: filteredIssues.filter(
        (issue) => issue.priority === "Critical",
      ).length,
      warningCount: filteredIssues.filter(
        (issue) => issue.priority === "Warning",
      ).length,
      suggestionCount: filteredIssues.filter(
        (issue) => issue.priority === "Suggestion",
      ).length,
    },
  };
}

function groupIssuesByProduct(
  issues: Array<{
    productId: string;
    productTitle: string;
    priority: string;
    issueType: string;
    message: string;
    suggestedFix: string;
  }>,
) {
  const groups = new Map<
    string,
    {
      productId: string;
      productTitle: string;
      issueCount: number;
      criticalCount: number;
      warningCount: number;
      suggestionCount: number;
    }
  >();

  for (const issue of issues) {
    const existing = groups.get(issue.productId);

    if (!existing) {
      groups.set(issue.productId, {
        productId: issue.productId,
        productTitle: issue.productTitle,
        issueCount: 1,
        criticalCount: issue.priority === "Critical" ? 1 : 0,
        warningCount: issue.priority === "Warning" ? 1 : 0,
        suggestionCount: issue.priority === "Suggestion" ? 1 : 0,
      });

      continue;
    }

    existing.issueCount += 1;

    if (issue.priority === "Critical") {
      existing.criticalCount += 1;
    }

    if (issue.priority === "Warning") {
      existing.warningCount += 1;
    }

    if (issue.priority === "Suggestion") {
      existing.suggestionCount += 1;
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (b.criticalCount !== a.criticalCount) {
      return b.criticalCount - a.criticalCount;
    }

    return b.issueCount - a.issueCount;
  });
}

function sortIssuesByPriority<T extends { priority: string; createdAt?: Date }>(
  issues: T[],
) {
  const priorityWeight: Record<string, number> = {
    Critical: 1,
    Warning: 2,
    Suggestion: 3,
  };

  return [...issues].sort((a, b) => {
    const priorityDifference =
      (priorityWeight[a.priority] ?? 99) - (priorityWeight[b.priority] ?? 99);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    if (a.createdAt && b.createdAt) {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }

    return 0;
  });
}