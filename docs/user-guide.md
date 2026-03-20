# User Guide

## Start here
1. Open the dashboard.
2. If prompted, set your **operator identity** in the modal.
3. Use the sidebar to move through the lifecycle modules.
4. Remember: the operator identity is for attribution only, not security.

## Receiving and QC
1. Open **Receiving** to review incoming deliveries.
2. Open **QC** to record a disposition for each received line.
3. Enter the exact accepted and rejected quantities.
4. Choose **Pass**, **Partial pass**, or **Fail**.
5. If rejected quantity exists, mark whether a vendor replacement is required.

## Inventory intake
1. After QC, open **Inventory**.
2. Review the **Inventory intake queue**.
3. Confirm category, lifecycle phase, and store location.
4. Submit intake to generate a new PIN and post the receipt transaction.

## Issue / distribution
1. Open **Issues**.
2. Select a PIN and shipbuilder recipient.
3. Enter the quantity, work order, and purpose.
4. Submit to dispatch the material and post the issue transaction.

## Usage outcome capture
1. In **Issues**, locate the active issue.
2. Enter any combination of:
   - not used
   - leftover
   - scrap
3. Submit the outcome to feed recovery assessment.

## Recovery assessment
1. Open **Recovery**.
2. Choose the correct decision path:
   - reusable → return to existing PIN
   - reusable → derive new PIN
   - repairable → derive repaired PIN
   - not reusable → hold
   - not reusable → scrap
3. Add condition and disposition notes.

## Traceability
- Use **Inventory → PIN registry** to open a PIN detail page.
- Review ledger entries, issue/recovery chain, genealogy, and audit entries.
- Use **Recovery → Derived PINs** to inspect parent-child reuse genealogy.

## Chatbot
- Open **Chatbot** for operational questions.
- Ask specific questions using real references when possible.
- Good examples:
  - `Where is PIN-000001?`
  - `What is the status of PO-0001?`
  - `Trace PIN-000005.`
  - `Show QC for DLV-0001.`
