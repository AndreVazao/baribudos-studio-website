# Production security and infrastructure audit — 2026-11-16

## Scope and safety

This is a read-only snapshot of the active Website repository, Vercel project metadata, Supabase project metadata/catalog, and PostgreSQL system catalogs.

- No production DDL, data writes, credential reads/rotations, deployment-setting changes, storage creation, or billing changes were performed.
- No row values from `public.system_metadata` were read.
- The Studio remains the editorial/commercial authority; this audit does not change that contract.

Related tracking:
- [P0: system_metadata RLS and grants](https://github.com/AndreVazao/baribudos-studio-website/issues/39)
- [Public production-domain access verification](https://github.com/AndreVazao/baribudos-studio-website/issues/40)
- [Durable Website asset materialization](https://github.com/AndreVazao/baribudos-studio-website/issues/30)
- [Atomic Studio publication ingestion](https://github.com/AndreVazao/baribudos-studio-website/issues/36)

## 1. Vercel production project

Read-only project inspection returned:

- Project: `baribudos-studio-website`
- Project ID: `prj_pGvd9eN0oSK5gTYgcfz4awAKK0uw`
- Framework: Next.js
- Latest production deployment: `READY`
- Production deployment commit: `2cf244cf0e741128e4af2e4bd6287d7bb23a2ccd`
- Listed domains: three generated `.vercel.app` aliases; no custom domain was returned.
- Vercel Authentication: enabled.
- Protection scope metadata: `all_except_custom_domains`.
- Password protection and trusted-IP protection: disabled.
- Project connector connections: none returned.

### Public storefront access remains unverified

The current protection metadata, together with the absence of a listed custom domain, raises a material risk that the generated production aliases are behind Vercel Authentication. The anonymous external request could not be reproduced in this audit: Browser Use had insufficient credits and the public web fetcher could not access the deployment. No shareable-link or protection-bypass URL was used.

Do not treat a READY deployment or an authenticated Vercel fetch as proof that anonymous customers can reach the storefront.

Official Vercel documentation distinguishes Standard Protection (production domains remain public) from All Deployments (production and generated deployment URLs are protected):
- https://vercel.com/docs/deployment-protection
- https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan

Required next check: use an unauthenticated external browser against the canonical production domain and test `/`, `/loja`, `/ips`, `/novidades`, `/api/catalog/home`, a product page and checkout entry. If protection blocks customers, change only the scope needed to keep previews protected while production remains public, after reviewing the exact Vercel configuration.

## 2. Supabase production database

Read-only project inspection returned:

- Project: `baribudos-studio-website`
- Project ref: `rpfyazuejafgxswrlbvw`
- Region: `eu-west-1`
- Status: `ACTIVE_HEALTHY`
- PostgreSQL: 17.6.1

### Confirmed P0: `public.system_metadata`

System-catalog queries returned:

| Property | Observed value |
|---|---|
| RLS enabled | No |
| FORCE RLS | No |
| Owner | `postgres` |
| Columns | `key text NOT NULL`, `value text NULL`, `updated_at timestamptz NULL` |
| Exact row count | 2 |
| RLS policies | 0 |
| Triggers | 0 |
| Dependent views found | 0 |

The two row values were deliberately not read.

Current table grants include the following for both `anon` and `authenticated`:

- SELECT, INSERT, UPDATE, DELETE
- TRUNCATE
- REFERENCES
- TRIGGER

Role attributes:
- `anon`: `BYPASSRLS=false`
- `authenticated`: `BYPASSRLS=false`
- `service_role`: `BYPASSRLS=true`

The table is not represented in the active Prisma schema, and no application-code reference was found in the active Website repository search. This is not proof that no external consumer exists.

### Important: enabling RLS alone is not sufficient

PostgreSQL documents that operations such as `TRUNCATE` and `REFERENCES` are not subject to row-level security. The current grants also include `TRIGGER`. Therefore, the advisor's minimal statement:

```sql
ALTER TABLE "public"."system_metadata" ENABLE ROW LEVEL SECURITY;
```

would default-deny ordinary row access when no policy exists, but it would not remove all excessive table privileges.

Reference: https://www.postgresql.org/docs/17/ddl-rowsecurity.html

Required remediation sequence:

1. Confirm that no legitimate external or client-side consumer needs direct access.
2. Review backend connection roles without revealing secret values.
3. Revoke excessive privileges from `anon` and `authenticated` (start from least privilege, then grant back only documented requirements).
4. Enable RLS.
5. Add narrow policies only if a legitimate client access path is demonstrated.
6. Verify SELECT/INSERT/UPDATE/DELETE/TRUNCATE behavior under `anon` and `authenticated`, and verify authorized backend access.
7. Re-run Supabase Security Advisor.

### Migration provenance gap

The Supabase migration history returned one entry: `20260527185301 / phase_42_3_lite_stabilization`. The active Website repository contains one Prisma migration source, `20260330_add_saga_visual_sets`; no source for the Supabase history entry or for `system_metadata` was found in the active repository tree.

Do not apply production DDL until the source of this table, external consumers and the migration baseline are reconciled. The issue remains open.

## 3. Commercial catalog and payment state

Exact read-only counts from the active production database:

| Table | Rows |
|---|---:|
| Product | 0 |
| Publication | 0 |
| PublicationVariant | 0 |
| PublicationAsset | 0 |
| BundleGroup | 0 |
| Checkout | 0 |
| CustomerLibrary | 0 |

The database is healthy, but the current production catalog has no products, publications, variants, assets, bundles, checkouts or library grants. This means the Website is not yet demonstrating a real sales path.

No synthetic products or publications were inserted.

## 4. Asset persistence and infrastructure

- The active Website `package.json` does not declare an object-storage SDK such as Vercel Blob, S3, R2 or Cloudinary.
- Vercel project connector connections returned an empty list.
- The current Vercel connector surface did not expose a complete inventory of Vercel Storage stores; an empty connector list is not proof that no storage store exists.
- The last recorded Supabase Storage audit (15 Nov 2026) reported zero buckets/objects; a bucket-listing action was not available in this audit run, so that count was not independently refreshed today.
- Neither active repository tree contains `render.yaml`, `Procfile`, `Dockerfile`, a Supabase configuration directory, or an explicit Render deployment manifest.
- The Render account and its services/disks were not directly accessible for inspection in this run. No Render service or persistent disk is assumed to exist.

Required next steps:
1. Verify the actual Render account/service configuration and persistent-disk attachments through an authorized account view.
2. Complete a provider-side Vercel Storage inventory; do not infer storage from deployment readiness.
3. Confirm the existing storage resources and limits before proposing any new provider.
4. Materialize every approved Website asset (cover, gallery, samples, EPUB, audio and video) into durable Website-controlled storage before marking the publication commercially available.
5. Verify MIME, byte length, SHA-256, retry/idempotency, protected downloads and Studio-offline behavior.

No new storage provider, bucket, disk, paid resource or credential was created.

## 5. External distribution roadmap

External distribution remains a later phase, after a publication is approved in Studio and confirmed in the Website. The Studio retains editorial and commercial authority, including prices, metadata, territories and per-channel approval.

The Website roadmap must continue to model channel-specific adapters, submission states, human approval where required, idempotency, audit, reconciliation and reporting for:
- Ebook platforms (including KDP, Apple Books, Google Play Books and Kobo).
- Audiobook platforms (including ACX, Spotify/INaudio and other eligible channels).
- YouTube series and the official YouTube Studio workflow for content intended for children.

Do not assume a direct YouTube Kids publishing API or automate external submissions without official API access, account permissions and explicit approval.

## 6. Execution summary

Confirmed in this audit:
- Vercel production deployment is READY, but public anonymous access is not independently verified.
- Supabase PostgreSQL is ACTIVE_HEALTHY.
- `system_metadata` has a confirmed RLS/grants exposure and an important TRUNCATE/REFERENCES privilege gap that RLS alone will not remove.
- The commercial catalog and related transaction tables are empty.
- No Vercel project connector is connected; no storage-store inventory was exposed by the current connector.
- Render account configuration remains unverified.

No production database, deployment, domain, credential, storage or billing setting was changed.


## 7. Revalidação operacional — 18 de novembro de 2026

### Vercel e acesso público

- Projeto: `baribudos-studio-website`, Next.js.
- Deployment de produção mais recente: READY no commit main `e72c08ffada86aadafe89674c4aa92fa590f4148`.
- O deployment mais recente no momento da consulta era um preview da PR #29, também READY; não foi confundido com produção.
- `ssoProtection.enabled=true` e `deploymentType=all_except_custom_domains`; `passwordProtection=false`; `trustedIps=false`.
- A configuração lista três domínios Vercel `*.vercel.app` e nenhum domínio customizado. A configuração indica proteção SSO nos domínios Vercel listados; acesso público anónimo não está demonstrado.
- A tentativa de leitura anónima não pôde ser concluída: Browser Use sem créditos e fetch web inacessível. Não foi observado nem inventado um HTTP 401/403.
- Não foram alterados domínios, SSO, aliases ou deployments.

### Supabase — atualização de segurança e catálogo

- Supabase continua `ACTIVE_HEALTHY`, PostgreSQL 17.6.1, região `eu-west-1`.
- Security Advisor em 18 Nov 10:49 UTC voltou a devolver `rls_disabled_in_public` como ERROR / EXTERNAL para `public.system_metadata`.
- RLS e FORCE RLS continuam desativados; existem 2 linhas e zero políticas. Os valores das linhas não foram lidos.
- `anon` e `authenticated` continuam com SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER. RLS sozinho não revoga os últimos três privilégios.
- A história de migrations continua a expor apenas `20260527185301 / phase_42_3_lite_stabilization`. Não executar DDL até recuperar baseline e identificar consumidores externos.
- Contagens exatas: Product 0, Publication 0, PublicationVariant 0, PublicationAsset 0, BundleGroup 0, Checkout 0; Supabase Storage buckets 0 e objects 0.

### Storage, Render e autonomia

- A listagem de integration configurations Vercel no âmbito do projeto devolveu lista vazia. O conector não expõe uma listagem completa de Vercel Storage stores; não concluir que não existe qualquer store externo.
- Não há conector Render disponível nesta sessão e não foi encontrado manifest `render.yaml`/configuração explícita de serviço ou disco nos repositórios ativos. A conta Render não foi inspecionada; serviços e discos permanecem desconhecidos.
- A ingestão Website continua a guardar URLs de origem em `PublicationAsset.fileUrl`; não prova materialização dos bytes nem autonomia face ao Studio desligado.

### PRs e critérios de integração

- PR #26: 45 commits à frente e 0 atrás de main; Website CI #170 e Repository Visibility Only #164 passaram; preview READY. Mantém-se Draft. `Product.publicationVariantId` não tem constraint UNIQUE; a baseline de migrations continua incompleta; materialização durável de assets continua pendente.
- PR #27: acrescentados helper puro e quatro testes da política de sessão ativa; Website CI #176 e Repository Visibility Only #170 passaram; preview READY. Os testes cobrem o helper, não o ciclo completo JWT-cookie + utilizador desativado + biblioteca/checkout. Mantém-se Draft.
- PRs #28 e #29: CI e previews anteriores passaram, mas continuam Draft sem testes de integração dedicados de pagamento/replay.
- PR #41 foi integrada em main; Website CI #44068506534, Repository Visibility #44068506634 e deployment de produção associado ficaram verdes/READY.

### No-go e próxima sequência

- Não abrir o storefront ao público apenas com base em deployment READY: resolver configuração de acesso/domínio e executar teste anónimo real.
- Não aplicar RLS/grants, migrations, criar storage, alterar SSO/domínios ou contratar recursos sem baseline, consumidores e autorização adequados.
- Fechar segurança Supabase; fechar testes de pagamento e sessão; recuperar baseline; estabelecer unicidade comercial declarativa; materializar e servir assets com MIME, tamanho, SHA-256 e retries; provar checkout/downloads com Studio desligado.
- Distribuição externa (ebooks, audiobooks e YouTube/YouTube Kids) continua fase posterior, com aprovação por canal no Studio e mecanismos oficiais; não presumir API direta de YouTube Kids.

Nenhum DDL, write de catálogo, segredo, credencial, recurso pago, domínio ou setting de infraestrutura foi alterado nesta revalidação.
