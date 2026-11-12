# External distribution roadmap

**Status:** architecture and discovery only; no external channel is enabled by this document.  
**Authority:** Baribudos Studio remains the editorial and commercial source of truth.  
**Primary channel:** the Baribudos Website remains the first owned public and sales channel. External distribution starts only after a frozen Studio publication has been accepted by the Website.

## 1. Non-negotiable operating model

1. A Studio publication package is frozen and approved before it can be distributed.
2. The Website receives and persists the approved snapshot and its assets. External channel delivery is a later, separate action.
3. Studio explicitly approves each channel, territory, language, format, price policy, rights scope and release window. Website operators cannot override Studio metadata or pricing authority.
4. Every adapter must record the source publication/version/checksum, target account, channel item ID, submission state, timestamps, responses and operator actions.
5. Retries must be bounded and idempotent. A retry must not create a second listing, upload or purchase item.
6. A channel's terms, exclusivity, territory restrictions, royalty model and content policies must be checked before approval. Rights conflicts block submission.
7. Human review remains mandatory wherever a platform requires it or where eligibility/rights cannot be established automatically.
8. Do not store platform credentials in the publication payload. Use separately managed, least-privilege credentials and never expose them to the Studio desktop client or public Website.

## 2. Channel discovery and integration posture

The following is an initial evidence-based map, not a promise that an API or account is available. Re-check official terms and onboarding requirements before implementation.

| Channel | Current official route identified | Automation posture |
| --- | --- | --- |
| Amazon Kindle Direct Publishing (ebooks) | KDP Bookshelf and its manuscript/cover upload workflow | No public general-purpose publishing API was established by the official material reviewed. Treat as operator-assisted submission unless Amazon provides approved partner access or an official supported interface. |
| Apple Books (ebooks) | iTunes Connect and Apple Books Publishing Portal; EPUB, cover, sample and metadata submission | Portal workflow is confirmed. Evaluate Apple-preferred delivery partners for scale. Do not automate browser interaction or infer a public upload API. |
| Google Play Books (ebooks and audiobooks) | Partner Center; upload, review, pricing, territories and file-status workflows; bulk file upload is supported for eligible workflows | Partner Center workflow is confirmed. The official help reviewed describes portal/bulk uploads, not a general public publishing API. Treat as operator-assisted until an official supported integration is confirmed. |
| Kobo Writing Life (ebooks) | Publisher dashboard and partner onboarding must be assessed directly before selection | No API capability is assumed. Keep as discovery-only until current official documentation, territories, file requirements and publisher terms are verified. |
| Spotify for Authors (audiobooks) | Author/publisher upload workflow; optional referral of uploaded audiobooks to Voices by INaudio | Account permissions and referral terms must be confirmed. Spotify's consumer Web API is not a publishing/upload API. |
| ACX / Audible (audiobooks) | ACX production and distribution workflow | Rights and exclusivity are critical. ACX states exclusive titles cannot be distributed elsewhere under that agreement; non-exclusive distribution outside its stated destinations must be arranged independently. Never submit without a Studio-approved rights decision. |
| YouTube (series/video) | YouTube Studio or YouTube Data API v3 `videos.insert` with OAuth and video metadata | The API supports upload and a `selfDeclaredMadeForKids` audience declaration. Use the official YouTube API/Studio workflow only; check quota, channel authorization and current API project eligibility. |
| YouTube Kids | Separate, filtered YouTube Kids app with its own content policies and quality review | There is no direct YouTube Kids publishing API assumed. Publishing to YouTube and marking content made for kids does **not** guarantee inclusion in YouTube Kids. Eligibility is determined separately by YouTube's policies and systems. |

### Official references reviewed

- Amazon KDP: [Upload and Preview Book Content](https://kdp.amazon.com/en_US/help/topic/G200641240)
- Apple Books: [Publish your book](https://authors.apple.com/publish) and [Publish from the web](https://authors.apple.com/support/4574-publish-book-from-web)
- Google Play Books: [Partner Center](https://www.google.com/googlebooks/partners/) and [Upload & update files](https://support.google.com/books/partner/answer/14173419)
- Spotify: [Getting your audiobook on other listening platforms](https://support.spotify.com/gq-en/authors/article/getting-your-audiobook-on-other-listening-platforms/)
- ACX: [Choose a distribution option](https://help.acx.com/s/article/choose-a-distribution-option)
- YouTube: [YouTube Data API videos](https://developers.google.com/youtube/data/reference/rest/v3/videos), [videos.insert](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert), [YouTube Kids content policies](https://support.google.com/youtube/answer/10938174), [Made for Kids FAQ](https://support.google.com/youtube/answer/9684541)

## 3. Adapter contract

Implement one adapter per supported destination behind a common internal contract. Do not couple the editorial package to a provider's API shape.

Each channel submission should carry:

- immutable Studio publication ID, variant ID, project version and source checksum;
- content type, language, age/audience declaration and approved metadata;
- ISBN or other platform identifier where required;
- approved territories, release date/window, price policy and currency;
- rights owner, rights evidence/reference, licence scope and exclusivity choice;
- asset manifest with role, MIME type, byte length and SHA-256;
- explicit Studio approval record and approver timestamp.

Each adapter must expose a normalized result containing:

- provider and account reference (never credentials);
- external listing/upload ID and canonical URL when available;
- state, provider status/reason and last successful reconciliation;
- submitted asset hashes and provider processing state;
- retryability and next permitted action;
- revenue/royalty/report references when the provider supplies them.

Suggested lifecycle:

`NOT_CONFIGURED → DRAFT → AWAITING_STUDIO_APPROVAL → APPROVED → QUEUED → SUBMITTING → PROCESSING → LIVE`

Alternative terminal or intervention states: `REJECTED`, `ACTION_REQUIRED`, `WITHDRAWN`, `FAILED_RETRYABLE`, `FAILED_FINAL`. A provider's own processing state must be preserved alongside this normalized state.

Idempotency key: `publication_id + variant_id + channel + target_account + approved_snapshot_checksum`. A changed approved snapshot creates a new submission revision; it must not silently overwrite an existing live listing.

## 4. Pricing, rights and reconciliation

- Studio defines the canonical list price and currency. Channel-specific price conversion, minimums, tax handling, discounts and territories require an explicit approved mapping; never silently replace the Studio price.
- Store platform price/royalty results as channel observations, not as a new source of truth.
- Record distribution agreements, exclusivity, territories, languages, formats, expiry/termination and rights evidence before submission.
- Reconcile listing status, content processing, takedowns, territory availability, price changes, sales and royalty reports when supported.
- Surface discrepancies in the Studio dashboard for review. A channel outage must not affect Website sales or the local Studio catalogue.

## 5. Render, Vercel and asset autonomy

Render + Vercel is the confirmed hosting architecture, but the exact responsibility of each deployed service must be read from repository configuration and the connected provider accounts rather than inferred from the provider names.

### 5.1 Verified infrastructure snapshot — 2026-11-12

**Vercel — verified from the connected project account**
- The project named baribudos-studio-website is linked to AndreVazao/baribudos-studio-website and uses the Next.js framework.
- The connected team is on the Hobby plan.
- The latest production deployment is READY and points to main commit 2d10a14b39daa996341fbd3183ddaa7a03edf415 (the external-distribution roadmap documentation change).
- Project metadata currently lists Vercel-managed .vercel.app domains; no custom domain was returned.
- The environment-variable inventory returned 14 visible variable names and zero hidden production variables. None of the names indicates Vercel Blob, S3, R2, Cloudinary or another dedicated asset store. Values were not decrypted or inspected.
- The Website package and code search did not identify an object-storage SDK or upload adapter. The current publication model still stores asset URLs in PublicationAsset.

**Render — repository-side evidence only**
- No Render manifest or Render deployment reference was found in either active Baribudos repository.
- The Render account/service configuration could not be inspected in this run. Service type, deploy command, persistent disk, mount path, environment-variable names and retention/backup policy therefore remain unknown.

**Conclusion**
- Vercel hosting and a READY production deployment are confirmed, but durable asset storage is not evidenced by the inspected project configuration.
- This is not proof that no external storage exists outside the inspected repository/account metadata. Keep Website issue #30 open until the actual storage and byte-delivery path are verified.
- No storage resource, subscription, secret, deployment setting or infrastructure was created or changed.

Before implementing asset delivery:

1. Inventory current Vercel projects, Render services, deployment configuration, environment-variable **names** (never values), persistent disks, mounted paths, build outputs and backup/retention settings.
2. Determine which service currently serves the Website and which service, if any, runs its backend/API.
3. Trace cover, gallery, sample, EPUB, audiobook and video bytes from Studio package through Website ingestion to public delivery and authenticated library download.
4. Prove that the final Website URL resolves to Website-controlled durable storage and remains readable after the Studio is offline.
5. Verify MIME, byte length, SHA-256, access policy, cache behaviour, range requests for audio/video, retention and restore procedure.

A Vercel deployment or a URL stored in PostgreSQL is not, by itself, proof of durable asset storage. Render disk persistence must likewise be verified against the actual service and mount configuration. Prefer resources already configured and paid for. Do not create buckets, disks, subscriptions, secrets or infrastructure changes without explicit approval.

## 6. Delivery phases and acceptance gates

### Phase A — Website autonomy (blocking)

- Materialize every public/downloadable asset into Website-controlled durable storage.
- Reject incomplete, mismatched or unverified assets before making a publication live.
- Prove retries, partial-upload recovery, hash validation and no partial catalogue activation.
- Run an end-to-end test with the Studio unavailable after publication; pages, checkout, preview and purchased downloads must still work.

### Phase B — metadata and rights readiness

- Add per-channel metadata profiles and validation reports without changing the frozen Studio source.
- Add explicit per-channel Studio approval, territory and rights/exclusivity checks.
- Add operator-assisted submission records even for channels with no supported API.

### Phase C — first ebook destinations

- Select a destination only after account access, supported territories, file requirements, commercial terms and submission route are verified.
- Start with one title and one territory in a controlled/manual submission.
- Reconcile provider listing ID, processing status, live URL, price and royalty terms before scaling.

### Phase D — audiobook destinations

- Validate audio masters, chapter order, metadata, cover, narrator/voice credits, language and rights.
- Compare exclusivity and non-exclusivity before any ACX submission.
- Pilot one approved non-exclusive or explicitly exclusive route; never infer that one platform's distribution covers every retailer.

### Phase E — YouTube series

- Build a video package with title, description, language, captions, thumbnail, rights, episode/series metadata and audience assessment.
- Require an explicit audience decision and human approval before upload.
- Upload through YouTube Studio or the authorized YouTube Data API integration, initially private/unlisted for review.
- Validate YouTube Kids policy eligibility separately. Do not promise or record YouTube Kids availability until the platform actually includes the content.

## 7. Current blockers / no-go conditions

- Website issue #30 remains open: asset bytes are not yet guaranteed to be materialized in durable Website storage.
- The actual Render/Vercel service and storage configuration has not yet been verified from provider accounts.
- Platform publisher accounts, API/partner access, territory rights, ISBN/identifiers, royalty terms and contractual exclusivity have not been confirmed.
- No channel adapter may submit content until Studio approval, rights and destination-specific validation are represented and auditable.

**Next engineering priority:** complete Website asset autonomy and the current Studio → Website ingest integrity work before implementing external publishing. External distribution must never make the Website dependent on the Studio being online.
