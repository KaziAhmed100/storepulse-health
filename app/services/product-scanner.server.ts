import { createScanRun, type ScanIssueInput } from "../models/scan.server";

type ShopifyAdminClient = {
  graphql: (
    query: string,
    options?: {
      variables?: Record<string, unknown>;
    },
  ) => Promise<Response>;
};

type ShopifyProductVariant = {
  id: string;
  title: string;
  sku: string | null;
  inventoryQuantity: number | null;
  price: string;
};

type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  descriptionHtml: string | null;
  vendor: string | null;
  productType: string | null;
  totalInventory: number | null;
  featuredImage: {
    url: string;
    altText: string | null;
  } | null;
  seo: {
    title: string | null;
    description: string | null;
  } | null;
  variants: {
    nodes: ShopifyProductVariant[];
  };
};

type ProductsQueryResponse = {
  data: {
    products: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      nodes: ShopifyProduct[];
    };
  };
};

const PRODUCTS_QUERY = `#graphql
  query StorePulseProducts($cursor: String) {
    products(first: 50, after: $cursor, sortKey: UPDATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        handle
        status
        descriptionHtml
        vendor
        productType
        totalInventory
        featuredImage {
          url
          altText
        }
        seo {
          title
          description
        }
        variants(first: 50) {
          nodes {
            id
            title
            sku
            inventoryQuantity
            price
          }
        }
      }
    }
  }
`;

/**
 * Runs a catalog scan for the current shop.
 * For the MVP, this scans up to 250 recently updated products.
 */
export async function runProductScan({
  admin,
  shopDomain,
}: {
  admin: ShopifyAdminClient;
  shopDomain: string;
}) {
  const products = await fetchProducts(admin);
  const issues = products.flatMap((product) => detectProductIssues(product));
  const healthScore = calculateHealthScore(products.length, issues);

  const scan = await createScanRun({
    shopDomain,
    healthScore,
    totalProducts: products.length,
    issues,
  });

  return scan;
}

/**
 * Fetches products from Shopify Admin GraphQL API.
 * We keep a practical MVP cap so the scan stays fast during local development.
 */
async function fetchProducts(admin: ShopifyAdminClient) {
  const products: ShopifyProduct[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage && products.length < 250) {
    const response = await admin.graphql(PRODUCTS_QUERY, {
      variables: {
        cursor,
      },
    });

    const payload = (await response.json()) as ProductsQueryResponse;

    const productPage = payload.data.products;
    products.push(...productPage.nodes);

    cursor = productPage.pageInfo.endCursor;
    hasNextPage = productPage.pageInfo.hasNextPage;
  }

  return products;
}

/**
 * Applies our first set of practical product, inventory, and SEO rules.
 */
function detectProductIssues(product: ShopifyProduct): ScanIssueInput[] {
  const issues: ScanIssueInput[] = [];
  const plainDescription = stripHtml(product.descriptionHtml ?? "");
  const variants = product.variants.nodes ?? [];

  if (!product.featuredImage) {
    issues.push({
      productId: product.id,
      productTitle: product.title,
      issueType: "PRODUCT_IMAGE_MISSING",
      priority: "Critical",
      message: "This product does not have a featured image.",
      suggestedFix:
        "Add a clear product image so shoppers can understand the item quickly.",
    });
  }

  if (plainDescription.length < 80) {
    issues.push({
      productId: product.id,
      productTitle: product.title,
      issueType: "DESCRIPTION_TOO_SHORT",
      priority: "Warning",
      message: "This product description is missing or too short.",
      suggestedFix:
        "Add a helpful description with product benefits, use cases, materials, sizing, or care details.",
    });
  }

  if (product.title.trim().length < 8) {
    issues.push({
      productId: product.id,
      productTitle: product.title,
      issueType: "TITLE_TOO_SHORT",
      priority: "Suggestion",
      message: "This product title may be too short to explain the item clearly.",
      suggestedFix:
        "Use a more descriptive product title that includes the item type or key feature.",
    });
  }

  if (!product.vendor || product.vendor.trim().length === 0) {
    issues.push({
      productId: product.id,
      productTitle: product.title,
      issueType: "VENDOR_MISSING",
      priority: "Suggestion",
      message: "This product does not have a vendor.",
      suggestedFix:
        "Add a vendor or brand name to keep the catalog easier to filter and manage.",
    });
  }

  if (!product.productType || product.productType.trim().length === 0) {
    issues.push({
      productId: product.id,
      productTitle: product.title,
      issueType: "PRODUCT_TYPE_MISSING",
      priority: "Suggestion",
      message: "This product does not have a product type.",
      suggestedFix:
        "Add a product type so collections, filters, and reporting are easier to organize.",
    });
  }

  if (!product.seo?.title || product.seo.title.trim().length < 20) {
    issues.push({
      productId: product.id,
      productTitle: product.title,
      issueType: "SEO_TITLE_WEAK",
      priority: "Warning",
      message: "This product has a missing or weak SEO title.",
      suggestedFix:
        "Add a clear SEO title that includes the product name and an important search phrase.",
    });
  }

  if (!product.seo?.description || product.seo.description.trim().length < 50) {
    issues.push({
      productId: product.id,
      productTitle: product.title,
      issueType: "SEO_DESCRIPTION_WEAK",
      priority: "Warning",
      message: "This product has a missing or weak SEO description.",
      suggestedFix:
        "Add an SEO description that summarizes the product and gives shoppers a reason to click.",
    });
  }

  if (product.status === "ACTIVE" && product.totalInventory !== null && product.totalInventory <= 0) {
    issues.push({
      productId: product.id,
      productTitle: product.title,
      issueType: "ACTIVE_PRODUCT_OUT_OF_STOCK",
      priority: "Critical",
      message: "This active product appears to have no inventory available.",
      suggestedFix:
        "Restock the product, hide it from sales channels, or update the product status if it should not be sold.",
    });
  }

  const variantsWithoutSku = variants.filter(
    (variant) => !variant.sku || variant.sku.trim().length === 0,
  );

  if (variantsWithoutSku.length > 0) {
    issues.push({
      productId: product.id,
      productTitle: product.title,
      issueType: "VARIANT_SKU_MISSING",
      priority: "Suggestion",
      message: `${variantsWithoutSku.length} variant(s) do not have SKUs.`,
      suggestedFix:
        "Add SKUs to variants so inventory, fulfillment, and reporting are easier to manage.",
    });
  }

  const zeroPriceVariants = variants.filter((variant) => {
    const price = Number(variant.price);
    return Number.isFinite(price) && price <= 0;
  });

  if (zeroPriceVariants.length > 0) {
    issues.push({
      productId: product.id,
      productTitle: product.title,
      issueType: "VARIANT_PRICE_ZERO",
      priority: "Critical",
      message: `${zeroPriceVariants.length} variant(s) have a price of 0.`,
      suggestedFix:
        "Check variant pricing so shoppers are not shown incorrect product prices.",
    });
  }

  return issues;
}

/**
 * Calculates a first-pass store health score.
 * Phase 3 will improve this with clearer weighting and better score messages.
 */
function calculateHealthScore(
  productCount: number,
  issues: ScanIssueInput[],
): number {
  if (productCount === 0) {
    return 100;
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

  return Math.max(0, 100 - penalty);
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}