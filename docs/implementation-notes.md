# Implementation Notes

## Why audit_log is used for prototype-only extensions

Some prototype-only concepts, such as:
- vendor return replacement-loop visibility
- inventory intake metadata snapshots
- chat query audit events

are recorded in `audit_log` so the prototype can remain functional and auditable without expanding the relational schema in this step.

## Chatbot behavior

The chatbot flow is:
1. guardrail check
2. tool planning from the latest operator message
3. server-side tool execution
4. grounded answer synthesis
5. optional provider-based rewrite using grounded facts only
6. chat + audit logging

## Fallback actor IDs

Several tables require profile IDs. Because the prototype is deliberately usable without login, workflow and chat writes resolve a fallback active profile server-side while preserving operator attribution in metadata.

## Current limitations

- The SOP search is a documentation placeholder, not a full document retrieval system.
- Provider calls require external API keys and network access.
- Existing repo-wide dependency/toolchain issues may still affect local type-checking in constrained environments.
