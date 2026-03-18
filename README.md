# baribudos-studio-website

baribudos-studio-website/
├── .env.example
├── .gitignore
├── next.config.mjs
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── studio/
    │   │   └── page.tsx
    │   ├── ips/
    │   │   └── page.tsx
    │   ├── ip/
    │   │   └── [slug]/
    │   │       └── page.tsx
    │   ├── loja/
    │   │   ├── page.tsx
    │   │   └── [slug]/
    │   │       └── page.tsx
    │   ├── biblioteca/
    │   │   └── page.tsx
    │   ├── sucesso/
    │   │   └── page.tsx
    │   ├── paypal/
    │   │   └── return/
    │   │       └── page.tsx
    │   ├── admin/
    │   │   ├── page.tsx
    │   │   ├── import/
    │   │   │   └── page.tsx
    │   │   ├── publications/
    │   │   │   └── page.tsx
    │   │   ├── products/
    │   │   │   └── page.tsx
    │   │   ├── orders/
    │   │   │   └── page.tsx
    │   │   └── customers/
    │   │       └── page.tsx
    │   └── api/
    │       ├── publications/
    │       │   ├── ingest/
    │       │   │   └── route.ts
    │       │   └── variant/
    │       │       └── [variantId]/
    │       │           └── route.ts
    │       ├── checkout/
    │       │   ├── stripe/
    │       │   │   └── route.ts
    │       │   └── paypal/
    │       │       ├── create-order/
    │       │       │   └── route.ts
    │       │       └── capture-order/
    │       │           └── route.ts
    │       ├── webhook/
    │       │   └── stripe/
    │       │       └── route.ts
    │       ├── library/
    │       │   └── access/
    │       │       └── route.ts
    │       └── admin/
    │           ├── import-package/
    │           │   └── route.ts
    │           ├── publications/
    │           │   └── route.ts
    │           ├── products/
    │           │   └── route.ts
    │           ├── orders/
    │           │   └── route.ts
    │           └── customers/
    │               └── route.ts
    ├── components/
    │   ├── admin-nav.tsx
    │   ├── brand/
    │   │   └── BrandLogos.tsx
    │   ├── checkout-box.tsx
    │   ├── paypal-button.tsx
    │   ├── product-card.tsx
    │   └── publication-card.tsx
    ├── lib/
    │   ├── auth.ts
    │   ├── library.ts
    │   ├── paypal.ts
    │   ├── pricing.ts
    │   ├── prisma.ts
    │   ├── publication-mapper.ts
    │   ├── publication-query.ts
    │   ├── publication-schema.ts
    │   ├── slug.ts
    │   ├── stripe.ts
    │   └── sync-commerce.ts
    └── styles/
        └── brand.css
