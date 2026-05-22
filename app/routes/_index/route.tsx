import type { ActionFunctionArgs } from "react-router";
import { Form, redirect, useActionData } from "react-router";

export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);

  const shop = url.searchParams.get("shop");
  const host = url.searchParams.get("host");
  const embedded = url.searchParams.get("embedded");

  if (shop || host || embedded) {
    return redirect(`/app?${url.searchParams.toString()}`);
  }
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const shop = formData.get("shop");

  if (!shop || typeof shop !== "string") {
    return {
      error: "Enter a Shopify store domain to continue.",
    };
  }

  return redirect(`/auth/login?shop=${encodeURIComponent(shop)}`);
};

export default function Index() {
  const actionData = useActionData<typeof action>();

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.copy}>
          <div style={styles.badge}>StorePulse Health · Shopify Admin App</div>

          <h1 style={styles.title}>
            Find product, inventory, and SEO issues before they hurt a Shopify store.
          </h1>

          <p style={styles.subtitle}>
            StorePulse Health is a portfolio-grade Shopify embedded admin app
            that scans a merchant’s catalog, calculates a health score, and
            helps prioritize the fixes that matter most.
          </p>

          <div style={styles.cardGrid}>
            <FeatureCard
              title="Product scanning"
              copy="Checks product images, descriptions, titles, vendors, product types, and variant setup."
            />
            <FeatureCard
              title="Health score"
              copy="Turns catalog problems into a simple score that merchants can understand quickly."
            />
            <FeatureCard
              title="Issue priorities"
              copy="Labels fixes as Critical, Warning, or Suggestion so teams know where to start."
            />
          </div>

          <div style={styles.portfolioNote}>
            Built by <strong>Kazi Ahmed</strong> as a Shopify app development
            portfolio project.
          </div>
        </div>

        <aside style={styles.loginPanel}>
          <div style={styles.scoreMock}>
            <span>Health score</span>
            <strong>92</strong>
            <small>/ 100</small>
          </div>

          <h2 style={styles.panelTitle}>Open the app</h2>

          <p style={styles.panelCopy}>
            Enter a Shopify development store domain to start the OAuth install
            or login flow.
          </p>

          <Form method="post" style={styles.form}>
            <label style={styles.label}>
              <span>Shop domain</span>
              <input
                style={styles.input}
                type="text"
                name="shop"
                placeholder="storepulse-health-test.myshopify.com"
              />
            </label>

            {actionData?.error ? (
              <p style={styles.error}>{actionData.error}</p>
            ) : null}

            <button style={styles.button} type="submit">
              Log in with Shopify
            </button>
          </Form>

          <p style={styles.smallText}>
            This app is deployed for demo/testing only and is not listed on the
            Shopify App Store.
          </p>
        </aside>
      </section>
    </main>
  );
}

function FeatureCard({ title, copy }: { title: string; copy: string }) {
  return (
    <article style={styles.featureCard}>
      <h3 style={styles.featureTitle}>{title}</h3>
      <p style={styles.featureCopy}>{copy}</p>
    </article>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "48px 24px",
    background:
      "radial-gradient(circle at 10% 0%, rgba(0,128,96,0.20), transparent 32rem), radial-gradient(circle at 90% 12%, rgba(124,58,237,0.18), transparent 28rem), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
    color: "#111827",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },
  hero: {
    maxWidth: "1180px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.25fr) minmax(360px, 0.75fr)",
    gap: "28px",
    alignItems: "stretch",
  },
  copy: {
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: "32px",
    padding: "42px",
    boxShadow: "0 24px 70px rgba(15,23,42,0.10)",
    backdropFilter: "blur(18px)",
  },
  badge: {
    display: "inline-flex",
    borderRadius: "999px",
    padding: "9px 14px",
    background: "#dffbea",
    color: "#005c45",
    fontWeight: 850,
    fontSize: "13px",
    marginBottom: "18px",
  },
  title: {
    margin: "0 0 18px",
    fontSize: "clamp(38px, 6vw, 72px)",
    lineHeight: 0.94,
    letterSpacing: "-0.07em",
    fontWeight: 950,
  },
  subtitle: {
    margin: 0,
    color: "#667085",
    fontSize: "18px",
    lineHeight: 1.7,
    maxWidth: "760px",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "14px",
    marginTop: "30px",
  },
  featureCard: {
    background: "#ffffff",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: "22px",
    padding: "18px",
  },
  featureTitle: {
    margin: "0 0 8px",
    fontSize: "17px",
    fontWeight: 900,
  },
  featureCopy: {
    margin: 0,
    color: "#667085",
    lineHeight: 1.55,
    fontSize: "14px",
  },
  portfolioNote: {
    marginTop: "28px",
    color: "#475467",
    fontSize: "14px",
  },
  loginPanel: {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: "32px",
    padding: "30px",
    boxShadow: "0 24px 70px rgba(15,23,42,0.12)",
  },
  scoreMock: {
    height: "220px",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    borderRadius: "28px",
    background:
      "radial-gradient(circle, #ffffff 0%, #ffffff 40%, transparent 41%), conic-gradient(from 120deg, #008060, #3b82f6, #7c3aed, #f59e0b, #008060)",
    marginBottom: "24px",
    textAlign: "center",
  },
  panelTitle: {
    margin: "0 0 8px",
    fontSize: "24px",
    letterSpacing: "-0.04em",
  },
  panelCopy: {
    margin: "0 0 20px",
    color: "#667085",
    lineHeight: 1.6,
  },
  form: {
    display: "grid",
    gap: "14px",
  },
  label: {
    display: "grid",
    gap: "8px",
    fontWeight: 800,
    color: "#344054",
  },
  input: {
    width: "100%",
    border: "1px solid rgba(15,23,42,0.16)",
    borderRadius: "16px",
    padding: "13px 14px",
    fontSize: "14px",
  },
  button: {
    border: 0,
    borderRadius: "999px",
    padding: "13px 18px",
    background: "linear-gradient(135deg, #008060, #00a47c)",
    color: "#ffffff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 16px 34px rgba(0,128,96,0.26)",
  },
  error: {
    margin: 0,
    color: "#b42318",
    fontWeight: 700,
    fontSize: "13px",
  },
  smallText: {
    marginTop: "16px",
    color: "#667085",
    fontSize: "13px",
    lineHeight: 1.55,
  },
};