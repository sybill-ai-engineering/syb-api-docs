# Sybill API documentation instructions

## Project

- This repository is the Mintlify site for Sybill's public REST API and MCP server.
- Pages are MDX files with YAML frontmatter.
- Site configuration and navigation live in `docs.json`.
- `openapi.yaml` drives the interactive API reference and playground.
- The API implementation and OpenAPI generator live in the `flamingo-fer` repository under `src/sybill_py/runtimes/public_api_server/`.

## Content rules

- Preserve documented API behavior exactly. Do not infer endpoints, fields, limits, scopes, defaults, or error responses.
- Use the terms **Import**, **Export**, and **Ask Sybill** for customer-facing permissions. Use `ingest`, `read`, and `ask_sybill` only for their API scope values.
- Use camelCase for REST parameters and fields. Preserve snake_case only where the API explicitly documents it, including MCP tool parameters and the health response.
- Keep the alpha notice until the public API is formally stabilized.
- Do not document internal endpoints, admin-only behavior, implementation details, or private data models.

## Writing style

- Use active voice and second person.
- Use sentence case for headings.
- Keep sentences concise and technical.
- Use code formatting for commands, paths, parameters, fields, values, and status codes.
- Use root-relative paths without file extensions for internal links.
- Prefer native Mintlify components such as `Info`, `Tip`, `Warning`, `Columns`, and `Card`.
- Give every code block a language identifier.

## API changes

When an API contract changes:

1. Regenerate the OpenAPI specification from `flamingo-fer`.
2. Replace `openapi.yaml` with the generated specification.
3. Update `endpoints.mdx` for behavior, filters, examples, and errors.
4. Update `data-models.mdx` for request and response shape changes.
5. Update authentication, pagination, or rate-limit guides when the shared contract changes.
6. Run `mint openapi-check openapi.yaml`, `mint broken-links`, and `mint validate`.

## Mintlify tooling

- The official Mintlify skill is installed under `.agents/skills/mintlify/`.
- Consult current Mintlify documentation before changing components or `docs.json`.
- Run `mint dev` for a local preview.
