#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const descriptions = new Map(Object.entries({
  "GET /v1/health": "Validate an API key and return its organization ID and scopes. Any valid Sybill API key can call this endpoint.",
  "POST /v1/ask-sybill": "Submit a one-shot question using organization-level Sybill data. Requires the **Ask Sybill** permission (`ask_sybill` scope). The request waits up to 60 seconds. A terminal run returns `200 OK`; a run still in progress returns `202 Accepted` with `Location` and `Retry-After` headers for polling.",
  "GET /v1/ask-sybill/{threadId}/{runId}": "Wait up to 60 seconds for a previously submitted Ask Sybill run. Requires the **Ask Sybill** permission (`ask_sybill` scope). Terminal runs return `200 OK`; active runs return `202 Accepted` with polling headers. Runs remain accessible to the originating organization for 30 days.",
  "GET /v1/conversations": "List organization-visible conversations. Requires the **Export** permission (`read` scope). Private conversations owned by individual users are excluded. Results use cursor-based pagination; `sourceId` accepts a custom source UUID or one of the native meeting-provider identifiers listed below.",
  "POST /v1/conversations": "Import a conversation into Sybill. Requires the **Import** permission (`ingest` scope). Include a non-empty transcript, a recording URL, or both. A `201 Created` response confirms acceptance for asynchronous transcription and enrichment; derived fields may not be available immediately.",
  "DELETE /v1/conversations": "Soft-delete a conversation previously imported through this API. Requires the **Import** permission (`ingest` scope). Identify the record with the custom source UUID and the external ID originally supplied as `id`.",
  "GET /v1/conversations/{conversationId}": "Return the available details for one organization-visible conversation, including transcript, recordings, and AI-generated summary when present. Requires the **Export** permission (`read` scope). Private conversations owned by individual users are excluded.",
  "GET /v1/deals": "List CRM deals available to the API key's organization. Requires the **Export** permission (`read` scope). Results use cursor-based pagination.",
  "GET /v1/deals/{dealId}": "Return the available details for one CRM deal, including its AI-generated summary, CRM autofill suggestions, and contacts when present. Requires the **Export** permission (`read` scope).",
  "GET /v1/accounts": "List CRM accounts available to the API key's organization. Requires the **Export** permission (`read` scope). Results use cursor-based pagination.",
  "GET /v1/accounts/{accountId}": "Return the available details for one CRM account, including contacts and synced CRM fields when present. Requires the **Export** permission (`read` scope).",
  "GET /v1/messages": "List organization-visible messages from native email and CRM integrations or custom sources. Requires the **Export** permission (`read` scope). Private messages owned by individual users are excluded. Results use cursor-based pagination.",
  "POST /v1/messages": "Import a message into Sybill. Requires the **Import** permission (`ingest` scope). A `201 Created` response confirms acceptance for asynchronous processing; derived fields may not be available immediately.",
  "DELETE /v1/messages": "Soft-delete a message previously imported through this API. Requires the **Import** permission (`ingest` scope). Identify the record with the custom source UUID and the external ID originally supplied as `id`.",
  "GET /v1/messages/{messageId}": "Return the available details for one organization-visible message, including its body and attachment metadata. Requires the **Export** permission (`read` scope). Private messages owned by individual users are excluded.",
  "POST /v1/rows": "Import a typed custom row. Requires the **Import** permission (`ingest` scope). Create its object type first, then ensure each field value matches the object type's schema. A `201 Created` response confirms acceptance for asynchronous processing.",
  "PATCH /v1/rows": "Partially update an imported row. Requires the **Import** permission (`ingest` scope). The `fields` map follows RFC 7396 merge-patch behavior: supplied keys replace values, omitted keys remain unchanged, and `null` deletes a field. `null` values for top-level fields are ignored.",
  "DELETE /v1/rows": "Soft-delete an imported row. Requires the **Import** permission (`ingest` scope). Identify the row with its custom source UUID and external ID.",
  "GET /v1/rows": "List organization-visible custom rows. Requires the **Export** permission (`read` scope). Private rows owned by individual users are excluded. Rows accept custom source UUIDs only and use cursor-based pagination.",
  "GET /v1/rows/{rowId}": "Return one organization-visible custom row by its Sybill ID. Requires the **Export** permission (`read` scope). The response shape matches a row returned by the list endpoint.",
  "POST /v1/sources": "Create a logical source for records imported into Sybill. Requires the **Import** permission (`ingest` scope). The source `name` is a stable machine identifier that must be unique within the organization; `displayName` is shown in the Sybill UI.",
  "GET /v1/sources": "List custom sources in the API key's organization. Requires the **Export** permission (`read` scope).",
  "GET /v1/sources/{sourceId}": "Return one custom source owned by the API key's organization. Requires the **Export** permission (`read` scope).",
  "PATCH /v1/sources/{sourceId}": "Update a source's `displayName`. Requires the **Import** permission (`ingest` scope). The stable machine-readable `name` cannot be changed.",
  "DELETE /v1/sources/{sourceId}": "Delete a custom source. Requires the **Import** permission (`ingest` scope). Deletion prevents future imports through the source but does not delete records or object types previously created under it.",
  "POST /v1/object-types": "Create a typed schema for custom rows within a source. Requires the **Import** permission (`ingest` scope). Field names must be unique, and each field definition declares the accepted value type.",
  "GET /v1/object-types": "List row object types in the API key's organization, optionally filtered by source. Requires the **Export** permission (`read` scope).",
  "GET /v1/object-types/{objectTypeId}": "Return one row object type owned by the API key's organization. Requires the **Export** permission (`read` scope).",
  "PATCH /v1/object-types/{objectTypeId}": "Update an object type's display name or field definitions. Requires the **Import** permission (`ingest` scope). Supplying `fieldDefinitions` replaces the complete field schema.",
  "DELETE /v1/object-types/{objectTypeId}": "Delete an object type. Requires the **Import** permission (`ingest` scope). Existing rows remain readable, but new rows and updates can no longer use the deleted type.",
  "GET /v1/documents": "List organization-visible documents from custom sources, chat uploads, and mailbox attachments. Requires the **Export** permission (`read` scope). Private documents owned by individual users are excluded. Results use cursor-based pagination.",
  "POST /v1/documents": "Import a document. Requires the **Import** permission (`ingest` scope). Provide exactly one of `url` or base64-encoded `content`. A `201 Created` response confirms acceptance for asynchronous conversion and indexing; search and AI features may not include the document immediately.",
  "PATCH /v1/documents": "Partially update an imported document. Requires the **Import** permission (`ingest` scope). Supplying `url` or `content` creates a new version and reprocesses the document; omitting both performs a metadata-only update. The author cannot be changed.",
  "DELETE /v1/documents": "Soft-delete a document previously imported through this API. Requires the **Import** permission (`ingest` scope). Identify the document with its custom source UUID and external ID.",
  "GET /v1/documents/{documentId}": "Return the available details for one organization-visible document. Requires the **Export** permission (`read` scope). Private documents owned by individual users are excluded."
}));

const summaries = new Map(Object.entries({
  "POST /v1/conversations": "Import Conversation",
  "DELETE /v1/conversations": "Delete Imported Conversation",
  "POST /v1/messages": "Import Message",
  "DELETE /v1/messages": "Delete Imported Message",
  "POST /v1/rows": "Import Row",
  "PATCH /v1/rows": "Update Imported Row",
  "DELETE /v1/rows": "Delete Imported Row",
  "POST /v1/documents": "Import Document",
  "PATCH /v1/documents": "Update Imported Document",
  "DELETE /v1/documents": "Delete Imported Document"
}));

const targetPath = resolve(process.argv[2] ?? "openapi.yaml");
const source = await readFile(targetPath, "utf8");
const lines = source.replace(/\r\n/g, "\n").split("\n");
const found = new Set();

function descriptionLines(description) {
  return [
    "      description: |-",
    ...description.split("\n").map((line) => `        ${line}`)
  ];
}

for (let index = 0, currentPath = null; index < lines.length; index += 1) {
  const pathMatch = lines[index].match(/^  (\/[^:]+):$/);
  if (pathMatch) {
    currentPath = pathMatch[1];
    continue;
  }

  const methodMatch = lines[index].match(/^    (get|post|patch|delete):$/);
  if (!methodMatch || currentPath === null) continue;

  const key = `${methodMatch[1].toUpperCase()} ${currentPath}`;
  const description = descriptions.get(key);
  if (!description) continue;

  let operationEnd = index + 1;
  while (
    operationEnd < lines.length &&
    !/^    (get|post|patch|delete):$/.test(lines[operationEnd]) &&
    !/^  \/[^:]+:$/.test(lines[operationEnd]) &&
    !/^components:$/.test(lines[operationEnd])
  ) {
    operationEnd += 1;
  }

  const operationIdIndex = lines.findIndex(
    (line, lineIndex) => lineIndex > index && lineIndex < operationEnd && /^      operationId:/.test(line)
  );
  if (operationIdIndex === -1) {
    throw new Error(`Could not find operationId for ${key}`);
  }

  const summaryIndex = lines.findIndex(
    (line, lineIndex) => lineIndex > index && lineIndex < operationIdIndex && /^      summary:/.test(line)
  );
  if (summaryIndex === -1) {
    throw new Error(`Could not find summary for ${key}`);
  }
  if (summaries.has(key)) {
    lines[summaryIndex] = `      summary: ${summaries.get(key)}`;
  }

  const existingDescriptionIndex = lines.findIndex(
    (line, lineIndex) => lineIndex > index && lineIndex < operationIdIndex && /^      description:/.test(line)
  );
  const insertAt = existingDescriptionIndex === -1 ? operationIdIndex : existingDescriptionIndex;
  const removeCount = existingDescriptionIndex === -1 ? 0 : operationIdIndex - existingDescriptionIndex;
  const replacement = descriptionLines(description);

  lines.splice(insertAt, removeCount, ...replacement);
  index = insertAt + replacement.length - 1;
  found.add(key);
}

const missing = [...descriptions.keys()].filter((key) => !found.has(key));
if (missing.length > 0) {
  throw new Error(`Missing OpenAPI operations:\n${missing.join("\n")}`);
}

const infoStart = lines.indexOf("info:");
const contactIndex = lines.findIndex((line, index) => index > infoStart && line === "  contact:");
const versionIndex = lines.findIndex((line, index) => index > infoStart && index < contactIndex && /^  version:/.test(line));
const infoDescriptionIndex = lines.findIndex(
  (line, index) => index > versionIndex && index < contactIndex && /^  description:/.test(line)
);

if (infoStart === -1 || contactIndex === -1 || versionIndex === -1 || infoDescriptionIndex === -1) {
  throw new Error("Could not locate the OpenAPI info metadata");
}

lines[versionIndex] = "  version: v1";
lines.splice(
  infoDescriptionIndex,
  contactIndex - infoDescriptionIndex,
  "  description: >-",
  "    Programmatic access to your Sybill workspace through REST endpoints for exports, imports, and Ask Sybill."
);

await writeFile(targetPath, `${lines.join("\n").replace(/\n+$/, "")}\n`);
console.log(`Enriched ${found.size} operations in ${targetPath}`);
