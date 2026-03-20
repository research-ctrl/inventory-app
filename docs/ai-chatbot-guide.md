# AI Chatbot Guide

## Purpose

The AI operations assistant answers grounded questions about the prototype's live operational data and repository guidance.

## Supported tools

| Tool | Use |
|---|---|
| `find_stock` | find stock balance by PIN / description / part number |
| `get_requirement_status` | requirement status lookup |
| `get_po_status` | purchase order status lookup |
| `get_delivery_status` | delivery / replacement-loop lookup |
| `get_qc_status` | QC result lookup |
| `get_material_location` | live material location lookup |
| `trace_material_genealogy` | lifecycle and genealogy trace |
| `get_recovery_status` | recovery status lookup |
| `search_sop` | placeholder search across repo docs |

## Provider selection

- Default provider is set by `AI_DEFAULT_PROVIDER`.
- The UI can optionally override the provider at runtime.
- Provider keys stay server-side only.

## Guardrails

The chatbot:
- blocks prompt-injection style inputs
- treats stock, QC, delivery, and recovery questions as grounded factual requests
- refuses to invent operational facts
- falls back to grounded summaries even when an external provider is unavailable

## Logging

Each chat request:
- creates or updates a `chat_sessions` row
- stores messages in `chat_messages`
- writes an audit event to `audit_log`

## Example questions

- `Where is PIN-000001 stored right now?`
- `What is the status of REQ-0001?`
- `Show the delivery state for DLV-0001.`
- `What happened to REC-000002?`
- `How do I capture leftover and scrap?`
