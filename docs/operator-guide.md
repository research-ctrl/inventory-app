# Operator Guide

## Purpose

This guide is for stores, QC, and shipbuilder operators using the prototype day-to-day.

## Operator identity modal

The prototype stores the following in browser `localStorage`:
- operator name
- team / desk
- badge / call sign

This identity is attached to actions for attribution and audit readability.
It does **not** grant or deny access.

## Recommended workflow discipline

### QC
- Always reconcile accepted quantity + rejected quantity = received quantity.
- Use **partial pass** only when both accepted and rejected quantities exist.
- Record whether the rejected quantity needs a replacement loop.

### Intake
- Do not skip category, location, or phase assignment.
- Confirm the accepted quantity before generating the PIN.
- Use intake only for accepted material.

### Issue / distribution
- Issue only what is actually being handed into shipbuilder operations.
- Use work-order references whenever possible.

### Usage outcomes
- Capture not used, leftover, and scrap promptly.
- Do not wait until the full job is finished if partial returns are already known.

### Recovery assessment
- Use the reusable path only when the material can genuinely re-enter controlled stock.
- Use derived PIN creation when the recovered item becomes a distinct traceable stock line.
- Use hold when the decision is not yet complete.
