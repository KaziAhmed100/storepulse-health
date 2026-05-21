import db from "../db.server";

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
      issues: true,
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