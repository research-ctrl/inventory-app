# Module Specifications

## 1. Requirements
- Create, edit, and submit material requirements
- Fields: title, description, vessel, department, urgency, items list
- Triggers approval workflow on submit

## 2. Approvals
- Centralized queue for approvers
- Supports approve/reject with comment
- Email notifications (TODO)

## 3. Vendors
- Approved vendor registry
- Compare vendors by category/rating
- Quote management (TODO)

## 4. Procurement
- Purchase Orders linked to Requirements
- Payments tracking
- Delivery scheduling

## 5. Receiving
- Receive items against POs
- Partial receiving supported
- Triggers QC workflow

## 6. QC
- Inspector assigns pass/fail/conditional per delivery
- Failed items trigger return flow

## 7. Inventory
- PIN (Physical Inventory Number) management
- Location-based storage
- Real-time quantity via transaction log

## 8. Issues
- Issue materials to vessels/work orders
- Deducts from inventory on approval

## 9. Recovery
- Return materials from vessels
- Assess condition and route to reuse/repair/scrap/sell
- Derived PINs for repaired/split material

## 10. AI Chatbot
- Natural language queries on all modules
- Tool-calling for real-time data
- Provider: Gemini (primary), Grok (fallback)
