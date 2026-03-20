# Workflow Map

## End-to-end material lifecycle

```text
Requirement
  -> Approval
  -> Purchase Order
  -> Delivery / Receiving
  -> QC
      -> Pass -----------> Inventory Intake -> PIN -> Issue / Distribution
      -> Partial Pass ---> Accepted Qty -> Inventory Intake
                          Rejected Qty -> Vendor Return -> Replacement Loop -> Delivery Tracking
      -> Fail -----------> Vendor Return / Replacement Loop

Issue / Distribution
  -> Usage Outcome Capture
      -> Not Used -----> Recovery Assessment
      -> Leftover -----> Recovery Assessment
      -> Scrap --------> Recovery Assessment

Recovery Assessment
  -> Reuse existing PIN
  -> Derive new PIN
  -> Repair + derive PIN
  -> Hold
  -> Scrap
```

## Exact QC behavior

### Pass
- accepted quantity = full received quantity
- rejected quantity = 0
- intake queue is created
- no vendor return record is required

### Partial pass
- accepted quantity > 0
- rejected quantity > 0
- accepted quantity proceeds to inventory intake
- rejected quantity opens vendor return / replacement tracking
- replacement loop remains visible in delivery tracking

### Fail
- accepted quantity = 0
- rejected quantity = full received quantity
- no inventory intake is created
- vendor return / replacement flow is opened

## Inventory intake

At intake the operator assigns:
- category
- location
- lifecycle phase
- min/max stock guardrails

The system then:
- creates a new PIN
- posts a `receipt` transaction
- logs workflow and audit history

## Issue / distribution

Issued material is distributed into shipbuilder operations.

The ledger records:
- `issue` transaction out of stock
- operational issue reference
- work order / vessel context

## Usage outcome capture

Supported outcomes:
- **not used**
- **leftover**
- **scrap**

Captured outcomes update issue return state and feed recovery assessment.

## Recovery decision tree

### Reusable
- return to existing PIN, or
- create a derived PIN for separated/recovered stock

### Repairable
- create a repaired / derived PIN after assessment

### Not reusable
- place on hold, or
- mark scrapped
