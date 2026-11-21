# Publication asset URL intake boundary — 21 Nov 2026

## Purpose

The Website currently validates publication asset fields with Zod `url()` and stores their URLs in `PublicationAsset.fileUrl`. URL syntax validation alone accepts absolute local/private hosts, non-HTTPS schemes and URLs containing embedded credentials. Those values are not suitable for a public catalogue and can create broken storefront assets or unsafe future fetch behavior.

This change adds a narrow intake guard for the asset fields already consumed by the Website.

## Accepted format

- HTTPS only.
- A DNS hostname containing a dot.
- No username/password embedded in the URL.
- No IP-literal hostname.
- No loopback/local/private naming suffixes such as `.localhost`, `.local`, `.internal`, `.home.arpa`, `.lan`, `.test`, `.invalid`, `.example` or `.arpa`.

The same schema is applied to cover, logos, gallery images, sample pages, audiobook previews, video trailers, downloadable files and the SEO Open Graph image. An empty cover sentinel remains normalized to an absent optional asset.

## Security and architecture limits

This is **not** asset materialization and does not prove Website autonomy. The Website still persists source URLs; it does not download or store the asset bytes in this change.

The validator does not resolve DNS, inspect remote responses, validate MIME/size/checksum or follow redirects. A public-looking hostname could still resolve to a private address. If a later asset materialization service fetches URLs, it must independently resolve and reject private/reserved IP ranges on every redirect hop, enforce timeouts/size/MIME limits, verify SHA-256, and write to Website-controlled durable storage before the catalogue becomes live.

The Studio remains the editorial/commercial authority. This guard does not alter Studio payload ownership, prices, publication versions or approval semantics.

## Infrastructure evidence — 21 Nov 2026

- Vercel project is linked to the Website repository and has a READY production deployment on `main` commit `083fea3860c15ad9c05da847da56cf88cd936701`.
- Vercel SSO remains enabled with `all_except_custom_domains`; no custom domain is attached. Public customer access is not proven by a READY deployment.
- Supabase Storage reports zero buckets and zero objects in the connected Website project.
- No complete Vercel Storage-store listing action or Render account connector is available in this inspection. Do not infer that an external store or Render disk exists or does not exist.
- The current Studio package resolver returns a local `/storage/... ` path when `STUDIO_CDN_BASE_URL` is absent. The Website schema already rejects relative paths, so a configured public asset host is required for the current URL-only ingest path. This is not a substitute for Website-owned materialization.

No Vercel/Render setting, Supabase schema, bucket, object, credential, secret, deployment or production data was changed.

## Next required phase

Materialize approved asset bytes in Website-controlled durable storage with source URL, publication/variant/role, MIME, byte length, SHA-256, version and audit metadata. Keep the publication non-live until every required asset is stored and verified. Then prove pages, checkout and purchased downloads work while the Studio is offline.
