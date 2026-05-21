# StorePulse Health

StorePulse Health is a Shopify embedded admin app that scans a store's product catalog for product, inventory, and SEO issues, calculates a store health score, and helps merchants prioritize fixes.

Built by **Kazi Ahmed**.

## Project Overview

Many Shopify merchants have product catalogs with missing images, weak descriptions, incomplete SEO fields, missing SKUs, or inventory issues. These problems can hurt conversion, search visibility, store trust, and operational clarity.

StorePulse Health gives merchants a simple dashboard that answers:

- How healthy is my product catalog?
- Which issues should I fix first?
- Which products are affected?
- Is my store improving after each cleanup?

This project was built as a portfolio-grade Shopify app MVP.

## Features

- Shopify OAuth install flow
- Embedded dashboard inside Shopify Admin
- Product scanning through Shopify Admin GraphQL API
- Product, inventory, and SEO issue detection
- Store health score calculation
- Priority labels: Critical, Warning, Suggestion
- Latest scan summary
- Scan history table
- Full issue detail page
- Filter by priority
- Filter by issue type
- Search by product title
- Product-level affected summary
- Direct links to Shopify product admin pages
- PostgreSQL production database with Prisma
- Render deployment-ready setup

## Tech Stack

- Shopify React Router app template
- React Router
- TypeScript
- Shopify App Bridge
- Shopify Admin GraphQL API
- Prisma ORM
- PostgreSQL / Neon
- Render
- CSS modules via route stylesheet imports

## Health Score Logic

The health score starts at 100 and loses points based on issue severity.

| Priority | Example Issues | Penalty Weight |
|---|---|---:|
| Critical | Missing image, zero price variant, active product out of stock | High |
| Warning | Short description, weak SEO title, weak SEO description | Medium |
| Suggestion | Missing SKU, missing vendor, missing product type | Low |

The score is normalized by product count so larger catalogs are not punished too aggressively for having more products.

## Scanner Rules

Current MVP scanner checks for:

- Missing product featured image
- Short or missing product description
- Very short product title
- Missing vendor
- Missing product type
- Weak SEO title
- Weak SEO description
- Active product with zero inventory
- Variants without SKUs
- Variants with zero price

## Local Development Setup

### 1. Install dependencies

```bash
npm install