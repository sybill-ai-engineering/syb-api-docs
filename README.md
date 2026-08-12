# Sybill API documentation

This repository hosts the Sybill public API documentation on Mintlify.

- Preview site: [sybill.mintlify.site](https://sybill.mintlify.site)
- Production API: [api.sybill.ai](https://api.sybill.ai)
- API key management: [Sybill dashboard](https://app.sybill.ai/settings/integrations/api-keys)

## Local development

Use an LTS release of Node.js, then install the Mintlify CLI:

```bash
npm install --global mint
mint dev
```

The preview runs at `http://localhost:3000`.

## Validation

Run these checks before publishing:

```bash
mint openapi-check openapi.yaml
mint broken-links
mint validate
mint a11y
```

## Updating the API reference

The API implementation and OpenAPI generator live in the `flamingo-fer` repository. Regenerate the specification there:

```bash
cd /path/to/flamingo-fer
set -a && source .env && set +a
source .venv/bin/activate
cd src
python -m scripts.script_generate_public_api_openapi
```

Copy the generated file from `src/sybill_py/runtimes/public_api_server/docs/content/openapi.yaml` into this repository as `openapi.yaml`, then restore the reference-specific descriptions and public metadata:

```bash
node scripts/enrich-openapi.mjs openapi.yaml
```

The enrichment script is intentionally idempotent. It keeps endpoint-specific context in the generated API reference instead of a duplicate endpoint guide. Update `api-guide.mdx` only for behavior shared across endpoints, and update `data-models.mdx` when a schema change benefits from a standalone model index.

Mintlify deploys changes automatically after they are merged into `main`.
