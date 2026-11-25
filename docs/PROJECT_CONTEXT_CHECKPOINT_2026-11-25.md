# Baribudos Website — checkpoint de continuidade
**Atualizado:** 2026-11-25 UTC  
**Main de referência:** `720f606091b88d0e4271ddf6704d932b0e649742`

## Como retomar
Este checkpoint preserva o estado técnico e decisões. Consultar PRs/CI/Issues atuais antes de assumir que os estados históricos continuam iguais.

## Segurança e produção
- Supabase project `rpfyazuejafgxswrlbvw`, eu-west-1.
- P0 `public.system_metadata` containment aplicado em produção com migração `20261124175649_secure_system_metadata_rls_and_client_grants`: REVOKE ALL de anon/authenticated; RLS enabled; sem policies. Não foi lido/alterado conteúdo de tabela. Postgres/service_role mantêm acesso.
- Security Advisor: finding crítico rls_disabled_in_public desapareceu; INFO rls_enabled_no_policy é esperado para tabela privada.
- HTTP negative PostgREST request não foi executado; não afirmar validação direta por HTTP. Histórico/proveniência e consumidores externos ainda precisam de levantamento.
- PR #51 Draft: https://github.com/AndreVazao/baribudos-studio-website/pull/51, branch `security/system-metadata-rls-containment-2026-11-24`, head `f27e4307eec08b448849f2a5190ff3ee31c40153`, 3 commits ahead/0 behind; CI reportada verde (Website CI run 235, visibility-only 226); Preview READY reportado para head. Não merge.
- Issue #39 acompanha RLS; #40 public access; #30 assets; #25 sync; #45 PayPal.

## Website e monetização
- PR #47 PayPal capture authorization Draft, head histórico 46 ahead/3 behind; CI e Preview READY reportados para head anterior. Riscos: reserva durável/concorrrência antes provider, adapter/cookie tests, recovery de orphan, revogação, baseline migration, guest checkout. Nenhum pagamento executado.
- PR #50 roadmap distribuição externa merged; main commit `720f606091b88d0e4271ddf6704d932b0e649742`.
- PR #49 audit merged `cec6a16e86f8ecd5c527cdb7c820f3a95748038`.
- Supabase catálogo Product, Publication, PublicationVariant, PublicationAsset, BundleGroup, Checkout, CustomerLibrary: zero rows no snapshot auditado; buckets/objectos zero.
- Vercel: 14 env vars, 8 classificados readable-secret, todos vistos decrypted=false. Nunca decrypt.
- Produção Vercel main commit 720f606 READY no snapshot; default Vercel domain sem custom domain, SSO `all_except_custom_domains`, password protection off. Acessibilidade anónima não provada; `/loja` fetcher error observado. Não alterar domínio/access settings sem autorização.

## Contexto cruzado Studio
- Studio main ref `ee9acd90ff62bf8f751f60d3652918a8741b13b9`.
- Auth/security P0 continua ativo: PIN plaintext/default, falta principal server-side, client-trusted roles, rotas sem gate central demonstrado.
- Studio PR #76 adiciona fundação session-manager, Draft, ainda sem login integration, RBAC, client migration ou CI verificada: https://github.com/AndreVazao/baribudos-studio/pull/76.
- Studio PR #63 auth migration divergente; #75 route audit Draft; não rebasear branches divergentes sem autorização.

## Próximos passos
1. Revalidar estado atual de PR #51, #47 e issues antes de atuar.
2. Revisar e validar diretamente a containment de system_metadata (negative HTTP test, sem ler valores).
3. Corrigir/validar Website import/asset durable bytes (Issue #30) e sync Studio→Website (#25).
4. Continuar checkout PayPal apenas com testes de reserva concorrente, idempotência, recuperação e sessões; não executar pagamentos.
5. Confirmar catálogo e biblioteca real com dados de teste isolados; não inserir conteúdo real sem autorização.
6. Manter Website autónomo: import durável, publicação e acesso cliente, RLS e gates admin.

## Segurança de execução
Sem decrypt secrets, sem operações financeiras, sem deployments, sem merges ou alterações de access/domain em produção sem aprovação. Distinguir code/CI/Preview/production evidences e nunca reportar validação que não foi realizada.
