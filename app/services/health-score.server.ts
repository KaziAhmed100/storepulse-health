type ScoredIssue = {
  priority: string;
};

export type HealthScoreResult = {
  score: number;
  grade: "Excellent" | "Good" | "Needs Attention" | "Critical";
  summary: string;
};

/**
 * Calculates the store health score from scan issues.
 * This accepts saved database issues as well as new scanner issues.
 */
export function calculateHealthScore({
  productCount,
  issues,
}: {
  productCount: number;
  issues: ScoredIssue[];
}): HealthScoreResult {
  if (productCount === 0) {
    return {
      score: 100,
      grade: "Excellent",
      summary:
        "No products were found, so there are no catalog issues to report yet.",
    };
  }

  const penalty = issues.reduce((total, issue) => {
    if (issue.priority === "Critical") {
      return total + 8;
    }

    if (issue.priority === "Warning") {
      return total + 5;
    }

    return total + 2;
  }, 0);

  const normalizedPenalty = Math.min(
    100,
    Math.round(penalty / Math.max(1, productCount / 10)),
  );

  const score = Math.max(0, 100 - normalizedPenalty);

  return {
    score,
    grade: getHealthGrade(score),
    summary: getHealthSummary(score, issues.length),
  };
}

function getHealthGrade(score: number): HealthScoreResult["grade"] {
  if (score >= 90) {
    return "Excellent";
  }

  if (score >= 75) {
    return "Good";
  }

  if (score >= 55) {
    return "Needs Attention";
  }

  return "Critical";
}

function getHealthSummary(score: number, issueCount: number) {
  if (issueCount === 0) {
    return "Your latest scan did not find any product, inventory, or SEO issues using the current MVP rules.";
  }

  if (score >= 90) {
    return "Your catalog is in strong shape. A few small improvements can make it even better.";
  }

  if (score >= 75) {
    return "Your store looks healthy overall, but there are some useful fixes worth prioritizing.";
  }

  if (score >= 55) {
    return "Your store has several issues that may affect product trust, search visibility, or conversion.";
  }

  return "Your store needs attention. Start with critical product, inventory, and pricing issues first.";
}