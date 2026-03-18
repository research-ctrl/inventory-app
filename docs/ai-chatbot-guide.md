# AI Chatbot Guide

## Overview
The SMLS chatbot provides natural language access to operational data.

## Supported Queries
- "Find stock for [material description]"
- "What is the status of requirement REQ-001?"
- "Where is PIN-12345 stored?"
- "Show me pending QC inspections"
- "Trace the history of PIN-5678"

## AI Tools Available
| Tool | Description |
|------|-------------|
| find_stock | Search inventory by description or PIN |
| get_requirement_status | Status of a requirement |
| get_po_status | Status of a purchase order |
| get_delivery_status | Delivery tracking |
| get_qc_status | QC inspection results |
| get_material_location | Warehouse location |
| trace_material_genealogy | Full lifecycle trace |
| get_recovery_status | Recovery assessment status |
| search_sop | Search SOPs and procedures |

## Providers
- Primary: Google Gemini
- Fallback: Grok
- Controlled via `AI_DEFAULT_PROVIDER` env var

## Guardrails
- Prompt injection detection
- No fabrication of inventory data
- Audit log of all chatbot queries
