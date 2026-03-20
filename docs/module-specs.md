# Module Specifications

## 1. Dashboard
- live operational metrics from server-side queries
- low-stock watchlist
- QC attention queue
- quick actions into the prototype workflows

## 2. Receiving
- display incoming deliveries
- route received deliveries into QC
- keep replacement-loop deliveries visible for follow-up

## 3. QC
- exact pass / partial pass / fail capture
- accepted quantity and rejected quantity tracking
- vendor return / replacement-loop creation for rejected material
- category / phase preparation for inventory intake

## 4. Vendor returns and replacements
- append-only prototype audit tracking
- replacement loop visibility from QC back into delivery tracking
- no separate auth workflow

## 5. Inventory
- intake queue sourced from QC dispositions
- PIN generation using sequence-style business IDs
- location and phase assignment
- ledger views derived from inventory transactions

## 6. Issues / distribution
- issue material into shipbuilder operations
- support work-order and vessel context
- update ledger on issue

## 7. Usage outcome capture
- not used
- leftover
- scrap
- partial vs full return status updates on the issue

## 8. Recovery
- recovery assessment queue
- reusable vs not reusable path
- reuse existing PIN, derive new PIN, repair+derive, hold, scrap

## 9. Traceability
- PIN detail screen with upstream delivery/PO/requirement context where available
- issue and recovery chain visibility
- genealogy and audit trail visibility

## 10. AI chatbot
- grounded operational Q&A using server-side tools
- env-selected provider with runtime override
- chat history and audit logging
- SOP/document placeholder search across repo docs
