# Phase 1: Architecture & Data Modeling — Family Finance Recorder AI

## 1. Complete User Flow

### Transaction Recording Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER TYPES MESSAGE                        │
│  e.g. "Bought 1500 worth cement from Suresh"                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  LAYER 1: REGEX EXTRACTION                   │
│  • Extract amounts (₹1500, 1500, 1,500)                     │
│  • Extract quantities (25 bags, 10 kg)                       │
│  • Extract dates (yesterday, 15 Jan, last week)              │
│  • Extract unit references                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  LAYER 2: RULE ENGINE                        │
│  • "bought/purchased" → Purchase                             │
│  • "sold" → Sale                                             │
│  • "received" → Income                                       │
│  • "paid" → Expense                                          │
│  • "transferred" → Transfer                                  │
│  • "advance" → Advance                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              LAYER 3: DICTIONARY MATCHING                    │
│  • Match product names against known Products table          │
│  • Match party names against known Parties table             │
│  • Match expense categories                                  │
│  • Cross-reference for disambiguation                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           LAYER 4: GEMINI STRUCTURED EXTRACTION             │
│  • Send raw text + regex results + rule results + known     │
│    products/parties to Gemini                                │
│  • Gemini fills ONLY missing fields                          │
│  • Returns structured JSON with confidence score             │
│  • Does NOT create transaction directly                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  LAYER 5: VALIDATION ENGINE                  │
│  • Amount exists and is valid                                │
│  • Transaction type exists and is valid                      │
│  • Party name is valid (not garbage text)                    │
│  • No contradictory fields (e.g. both vendor & customer      │
│    for a purchase)                                           │
│  • Confidence threshold check (≥ 0.7)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │  Confidence │
                    │   ≥ 0.7 ?   │
                    └──────┬──────┘
                    YES    │    NO
              ┌────────────┤    ├────────────┐
              ▼            │    │            ▼
┌─────────────────────┐    │    │  ┌─────────────────────┐
│  SHOW EXTRACTION    │    │    │  │  ASK USER TO         │
│  CONFIRMATION CARD  │    │    │  │  CONFIRM/CORRECT     │
│                     │    │    │  │  "I found:           │
│  Amount: 1500       │    │    │  │   Amount: 1500       │
│  Product: Cement    │    │    │  │   Product: Cement    │
│  Vendor: Suresh     │    │    │  │   Vendor: ?          │
│  Type: Purchase     │    │    │  │   Is this correct?"  │
│                     │    │    │  └─────────────────────┘
│  [Edit] [Confirm]   │    │    │
└──────────┬──────────┘    │    └────────────┬────────────┘
           │               │                 │
           └───────────────┴─────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              USER CONFIRMS / EDITS DATA                      │
│  • User reviews extracted fields                             │
│  • Can edit any field                                        │
│  • Clicks "Save Transaction"                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                TRANSACTION CREATED                           │
│  • Status: PENDING_APPROVAL                                  │
│  • Audit log created                                         │
│  • AI extraction record saved                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              APPROVAL WORKFLOW                                │
│  • Check approval matrix based on creator role               │
│  • Notify appropriate approver                               │
│  • Approver reviews in Approval Center                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │  Approver   │
                    │  Decision   │
                    └──────┬──────┘
              APPROVE      │      REJECT
         ┌─────────────────┤─────────────────┐
         ▼                                   ▼
┌──────────────────────┐          ┌──────────────────────┐
│  STATUS: APPROVED    │          │  STATUS: REJECTED    │
│  • approvedBy set    │          │  • isRejected = true  │
│  • approvedAt set    │          │  • Rejection comment  │
│  • Final transaction │          │  • Can be re-edited   │
│  • Audit logged      │          │  • Audit logged       │
└──────────────────────┘          └──────────────────────┘
```

### Chat Conversation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CHAT INTERFACE                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  👤 User: "Bought 1500 worth cement from Suresh"            │
│                                                              │
│  🤖 AI: [Transaction Card - PENDING]                         │
│         ┌─────────────────────────────────┐                  │
│         │ 📦 Purchase Transaction          │                  │
│         │                                  │                  │
│         │ Amount:      ₹1,500              │                  │
│         │ Product:     Cement              │                  │
│         │ Vendor:      Suresh              │                  │
│         │ Type:        Purchase            │                  │
│         │ Confidence:  96%                 │                  │
│         │                                  │                  │
│         │ [✏️ Edit]  [✅ Confirm & Save]   │                  │
│         └─────────────────────────────────┘                  │
│                                                              │
│  👤 User: [Clicks Confirm & Save]                            │
│                                                              │
│  🤖 AI: "Transaction saved! Awaiting approval from Brother." │
│         Status: ⏳ Pending Approval                          │
│                                                              │
│  ... later ...                                               │
│                                                              │
│  🤖 AI: "✅ Transaction #TXN-001 approved by Brother."       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Transaction Types

| Type | Description | Payment Direction | Example Input |
|------|-------------|-------------------|---------------|
| `purchase` | Buying goods/materials from a vendor | Money OUT | "Bought 1500 worth cement from Suresh" |
| `sale` | Selling goods to a customer | Money IN | "Sold bricks worth 10000 to Vinod" |
| `expense` | Paying for services, rent, labor, utilities | Money OUT | "Paid rent 12000" |
| `income` | Receiving money (non-sale) | Money IN | "Received 3000 from Ganesh" |
| `transfer` | Moving money between family members | Money OUT (from sender) | "Transferred 5000 to brother" |
| `advance` | Giving or receiving advance payment | Money OUT (given) / IN (received) | "Paid 2000 advance to Kumar" |
| `other` | Anything that doesn't fit above | Varies | "Gifted 1000 to aunt" |

### Payment Direction Rules

| Transaction Type | Default Payment Direction |
|------------------|--------------------------|
| `purchase` | `outgoing` |
| `sale` | `incoming` |
| `expense` | `outgoing` |
| `income` | `incoming` |
| `transfer` | `outgoing` |
| `advance` | `outgoing` (given) / `incoming` (received) |
| `other` | Determined by context / user input |

---

## 3. Transaction States

```
                    ┌──────────┐
                    │  DRAFT   │  (Optional: for auto-saved incomplete entries)
                    └────┬─────┘
                         │ User confirms
                         ▼
              ┌─────────────────────┐
              │  PENDING_APPROVAL   │  ← Default state on creation
              └─────────┬──────────┘
                   ┌────┴────┐
                   │         │
            APPROVE│         │REJECT
                   ▼         ▼
          ┌──────────┐  ┌──────────┐
          │ APPROVED │  │ REJECTED │
          └──────────┘  └────┬─────┘
                             │ User re-edits & resubmits
                             ▼
              ┌─────────────────────┐
              │  PENDING_APPROVAL   │  (Re-submitted)
              └─────────────────────┘
```

### State Definitions

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| `draft` | Auto-saved incomplete extraction (optional) | Edit, Delete |
| `pending` | Created and awaiting approval | View, Approve (by authorized users), Reject (by authorized users) |
| `approved` | Final — approved by designated approver | View only (immutable) |
| `rejected` | Rejected by approver with comment | Edit, Re-submit, Delete |

---

## 4. Approval Matrix

### Rules

| Creator | Role | Required Approver(s) | Can Approve |
|---------|------|----------------------|-------------|
| Father | `father` | **Me** OR **Brother** | Either one can approve |
| Brother | `brother` | **Me** only | Only Me can approve |
| Me | `me` | **Brother** only | Only Brother can approve |

### Approval Permission Matrix (Who can approve whose transactions)

| ↓ Approver \ Creator → | Father | Brother | Me |
|------------------------|--------|---------|-----|
| **Father** | ❌ | ❌ | ❌ |
| **Brother** | ✅ | ❌ | ✅ |
| **Me** | ✅ | ✅ | ❌ |

### Approval Status Flow

1. **Transaction Created** → `status = "pending"`
2. **Approver clicks Approve** →
   - `status = "approved"`
   - `approvedById = approver.id`
   - `approvedAt = now()`
   - Approval record created
   - Audit log created
3. **Approver clicks Reject** →
   - `status = "rejected"`
   - `isRejected = true`
   - Rejection comment required
   - Approval record created
   - Audit log created
4. **Creator re-edits rejected transaction** →
   - `status = "pending"` (re-submitted)
   - `isRejected = false`
   - `approvedById = null`
   - `approvedAt = null`
   - Audit log created

---

## 5. Database Entities

### 5.1 User

Represents a family member who can record and approve transactions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, cuid | Unique identifier |
| `username` | String | UNIQUE, not null | Login username |
| `passwordHash` | String | not null | Hashed password |
| `role` | String | not null, default "me" | One of: `father`, `brother`, `me` |
| `name` | String | not null | Display name |
| `email` | String? | unique, nullable | Optional email |
| `createdAt` | DateTime | default now() | Account creation time |
| `updatedAt` | DateTime | auto-updated | Last update time |

**Seeded Users:**

| username | name | role |
|----------|------|------|
| `father` | Father | `father` |
| `brother` | Brother | `brother` |
| `me` | Me (Sidharth) | `me` |

---

### 5.2 Transaction

The core entity — a financial transaction extracted from natural language.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, cuid | Unique identifier |
| `transactionType` | String | not null | One of: `purchase`, `sale`, `expense`, `income`, `transfer`, `advance`, `other` |
| `amount` | Float | not null, ≥ 0 | Transaction amount in INR |
| `product` | String? | nullable | Product/material name |
| `vendor` | String? | nullable | Vendor/supplier name |
| `customer` | String? | nullable | Customer/buyer name |
| `quantity` | Float? | nullable, ≥ 0 | Quantity of items |
| `unit` | String? | nullable | Unit of measurement (bags, kg, liters, etc.) |
| `paymentDirection` | String | not null | `incoming` or `outgoing` |
| `category` | String? | nullable | Expense category (rent, labor, materials, etc.) |
| `notes` | String? | nullable | Additional notes/description |
| `date` | DateTime | not null | Transaction date |
| `confidence` | Float | not null, 0-1 | AI extraction confidence score |
| `status` | String | not null, default "pending" | One of: `draft`, `pending`, `approved`, `rejected` |
| `createdById` | String | FK → User, not null | Who created this transaction |
| `approvedById` | String? | FK → User, nullable | Who approved (set when approved) |
| `approvedAt` | DateTime? | nullable | When approved |
| `isRejected` | Boolean | default false | Quick rejection flag |
| `createdAt` | DateTime | default now() | Creation time |
| `updatedAt` | DateTime | auto-updated | Last update time |

**Indexes:**
- `createdById` — for querying by creator
- `status` — for filtering pending/approved/rejected
- `date` — for date-range queries and analytics

---

### 5.3 Approval

Records every approval/rejection action on a transaction.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, cuid | Unique identifier |
| `transactionId` | String | FK → Transaction, not null, cascade delete | Transaction being acted on |
| `approverId` | String | FK → User, not null | User who performed the action |
| `action` | String | not null | `approve` or `reject` |
| `comment` | String? | nullable | Comment (required for rejection) |
| `createdAt` | DateTime | default now() | When the action occurred |

**Indexes:**
- `transactionId` — for querying approvals on a transaction

---

### 5.4 Party

Known vendors, customers, and other financial parties.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, cuid | Unique identifier |
| `name` | String | unique, not null | Party name (e.g., "Suresh", "Ravi") |
| `type` | String | not null | `vendor`, `customer`, `both` |
| `createdAt` | DateTime | default now() | When first encountered |

**Purpose:** Used by the dictionary matching layer to improve extraction accuracy. When the AI encounters a known party name, it can confidently extract it without relying on Gemini.

**Pre-seeded parties (examples):** None initially — parties are learned over time as transactions are recorded.

---

### 5.5 Product

Known products/materials.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, cuid | Unique identifier |
| `name` | String | unique, not null | Product name (e.g., "cement", "bricks") |
| `createdAt` | DateTime | default now() | When first encountered |

**Purpose:** Same as Party — used by the dictionary matching layer for improved extraction.

**Pre-seeded products (examples):** None initially — products are learned over time.

---

### 5.6 AuditLog

Immutable log of every significant action in the system.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, cuid | Unique identifier |
| `action` | String | not null | Action performed (see below) |
| `entity` | String | not null | Entity type affected |
| `entityId` | String? | nullable | ID of the affected entity |
| `details` | String? | nullable | JSON string with additional details |
| `userId` | String | FK → User, not null | Who performed the action |
| `createdAt` | DateTime | default now() | When the action occurred |

**Index:** `userId` for querying by user.

**Audit Actions:**

| Action | Entity | Description |
|--------|--------|-------------|
| `transaction.created` | Transaction | New transaction created |
| `transaction.approved` | Transaction | Transaction approved |
| `transaction.rejected` | Transaction | Transaction rejected |
| `transaction.edited` | Transaction | Transaction edited |
| `transaction.deleted` | Transaction | Transaction deleted |
| `transaction.re_submitted` | Transaction | Rejected transaction re-submitted |
| `settings.updated` | AppSettings | AI settings changed |
| `user.login` | User | User logged in |

---

### 5.7 AIExtraction

Stores the raw AI extraction results for debugging and improvement.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, cuid | Unique identifier |
| `input` | String | not null | Raw user input text |
| `output` | String | not null | JSON string of extracted data |
| `regexResult` | String? | nullable | JSON string of regex extraction results |
| `ruleResult` | String? | nullable | JSON string of rule engine results |
| `confidence` | Float | not null, 0-1 | Overall confidence score |
| `isValidated` | Boolean | default false | Whether user confirmed the extraction |
| `validation` | String? | nullable | User corrections (JSON string) |
| `createdAt` | DateTime | default now() | When extraction occurred |

**Purpose:** Critical for debugging extraction accuracy and improving the system over time.

---

### 5.8 AppSettings

Singleton table for application configuration.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK, default "singleton" | "singleton" | Always a single row |
| `geminiApiKey` | String? | nullable | null | Gemini API key |
| `modelName` | String | not null | "gemini-2.5-flash" | Gemini model name |
| `temperature` | Float | not null | 0.1 | Model temperature (0-2) |
| `confidenceThreshold` | Float | not null | 0.7 | Minimum confidence to auto-suggest |

---

## 6. Entity Relationships (ER Diagram)

### Text-Based ER Diagram

```
┌──────────────┐         ┌──────────────────────┐         ┌──────────────┐
│     User     │         │     Transaction      │         │   Approval   │
├──────────────┤         ├──────────────────────┤         ├──────────────┤
│ id (PK)      │◄──┐     │ id (PK)              │◄──┐     │ id (PK)      │
│ username     │   │     │ transactionType      │   │     │ transactionId│──┐
│ passwordHash │   │     │ amount               │   │     │ approverId   │──┼──┐
│ role         │   │     │ product              │   │     │ action       │  │  │
│ name         │   │     │ vendor               │   │     │ comment      │  │  │
│ email        │   │     │ customer             │   │     │ createdAt    │  │  │
│ createdAt    │   │     │ quantity             │   │     └──────────────┘  │  │
│ updatedAt    │   │     │ unit                 │   │                      │  │
└──────────────┘   │     │ paymentDirection     │   │                      │  │
       ▲           │     │ category             │   │                      │  │
       │           │     │ notes                │   │                      │  │
       │           │     │ date                 │   │                      │  │
       │           │     │ confidence           │   │                      │  │
       │           │     │ status               │   │                      │  │
       │           │     │ createdById ─────────┼───┘                      │  │
       │           │     │ approvedById ────────┼──────────┐               │  │
       │           │     │ approvedAt           │          │               │  │
       │           │     │ isRejected           │          │               │  │
       │           │     │ createdAt            │          │               │  │
       │           │     │ updatedAt            │          │               │  │
       │           │     └──────────────────────┘          │               │  │
       │           │                                       │               │  │
       │           │     ┌──────────────────────┐          │               │  │
       │           │     │     AuditLog         │          │               │  │
       │           │     ├──────────────────────┤          │               │  │
       │           │     │ id (PK)              │          │               │  │
       │           ├─────│ userId ──────────────│          │               │  │
       │           │     │ action               │          │               │  │
       │           │     │ entity               │          │               │  │
       │           │     │ entityId             │          │               │  │
       │           │     │ details              │          │               │  │
       │           │     │ createdAt            │          │               │  │
       │           │     └──────────────────────┘          │               │  │
       │           │                                       │               │  │
       │           │     ┌──────────────────────┐          │               │  │
       │           │     │    AIExtraction      │          │               │  │
       │           │     ├──────────────────────┤          │               │  │
       │           │     │ id (PK)              │          │               │  │
       │           │     │ input                │          │               │  │
       │           │     │ output               │          │               │  │
       │           │     │ regexResult          │          │               │  │
       │           │     │ ruleResult           │          │               │  │
       │           │     │ confidence           │          │               │  │
       │           │     │ isValidated          │          │               │  │
       │           │     │ validation           │          │               │  │
       │           │     │ createdAt            │          │               │  │
       │           │     └──────────────────────┘          │               │  │
       │           │                                       │               │  │
       │           │     ┌──────────────────────┐          │               │  │
       │           │     │      Party           │          │               │  │
       │           │     ├──────────────────────┤          │               │  │
       │           │     │ id (PK)              │          │               │  │
       │           │     │ name (UNIQUE)        │          │               │  │
       │           │     │ type                 │          │               │  │
       │           │     │ createdAt            │          │               │  │
       │           │     └──────────────────────┘          │               │  │
       │           │                                       │               │  │
       │           │     ┌──────────────────────┐          │               │  │
       │           │     │     Product          │          │               │  │
       │           │     ├──────────────────────┤          │               │  │
       │           │     │ id (PK)              │          │               │  │
       │           │     │ name (UNIQUE)        │          │               │  │
       │           │     │ createdAt            │          │               │  │
       │           │     └──────────────────────┘          │               │  │
       │           │                                       │               │  │
       │           │     ┌──────────────────────┐          │               │  │
       │           │     │    AppSettings       │          │               │  │
       │           │     ├──────────────────────┤          │               │  │
       │           │     │ id = "singleton"     │          │               │  │
       │           │     │ geminiApiKey         │          │               │  │
       │           │     │ modelName            │          │               │  │
       │           │     │ temperature          │          │               │  │
       │           │     │ confidenceThreshold  │          │               │  │
       │           │     └──────────────────────┘          │               │  │
       │           │                                       │               │  │
       │           └───────────────────────────────────────┘               │  │
       │            User "created" Transaction                            │  │
       │           ┌───────────────────────────────────────────────────────┘  │
       │            User "approved" Transaction                              │
       │           ┌──────────────────────────────────────────────────────────┘
       │            User "gave" Approval
       │
       └─────────── User "performed" AuditLog
```

### Relationship Summary

| Relationship | Type | Description |
|-------------|------|-------------|
| User → Transaction (created) | One-to-Many | A user creates many transactions |
| User → Transaction (approved) | One-to-Many | A user approves many transactions |
| Transaction → Approval | One-to-Many | A transaction can have multiple approval actions |
| User → Approval | One-to-Many | A user can give many approvals |
| User → AuditLog | One-to-Many | A user generates many audit logs |
| AIExtraction | Standalone | Linked to transactions by input reference (not FK) |
| Party | Standalone | Referenced by name in transactions (soft link) |
| Product | Standalone | Referenced by name in transactions (soft link) |

**Note on Party/Product:** These are NOT foreign-keyed in the Transaction table. They serve as a dictionary for extraction improvement. Transactions store the party/product name as a string. This is intentional — it avoids breaking transactions if a party/product record is deleted, and keeps the extraction pipeline simple.

---

## 7. Data Flow Summary

### Complete Data Flow Diagram

```
┌─────────┐    ┌─────────────┐    ┌──────────────┐    ┌───────────┐
│  User   │───▶│  Chat Input │───▶│  API Route   │───▶│ Extraction│
│ (React) │    │  Component  │    │  /api/       │    │  Engine   │
└─────────┘    └─────────────┘    │  extract     │    │  (5 Layer)│
                                  └──────────────┘    └─────┬─────┘
                                                            │
                                                            ▼
┌─────────┐    ┌─────────────┐    ┌──────────────┐    ┌───────────┐
│  User   │◀───│  Chat UI    │◀───│ Confirmation │◀───│  Extracted│
│ Reviews │    │  (Cards)    │    │   Card       │    │  JSON     │
└────┬────┘    └─────────────┘    └──────────────┘    └───────────┘
     │
     │ Confirms
     ▼
┌──────────────┐    ┌───────────┐    ┌──────────────┐    ┌─────────┐
│  POST /api/  │───▶│  Prisma   │───▶│  PostgreSQL  │    │  Audit  │
│  transaction │    │  Create   │    │  (SQLite dev)│    │  Log    │
└──────────────┘    └───────────┘    └──────────────┘    └─────────┘
     │
     │ Transaction created (pending)
     ▼
┌──────────────┐    ┌───────────┐    ┌──────────────┐
│  Approval    │───▶│ Approver  │───▶│  Transaction │
│  Center UI   │    │  Reviews  │    │  → Approved  │
└──────────────┘    └───────────┘    │  or Rejected │
                                     └──────────────┘
```

---

## 8. API Route Design (Phase 1 Outline)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/login` | Login and get session |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | Get current user |
| `POST` | `/api/extract` | Send text → get extracted transaction data |
| `GET` | `/api/transactions` | List transactions (with filters) |
| `POST` | `/api/transactions` | Create transaction from confirmed extraction |
| `GET` | `/api/transactions/:id` | Get transaction detail |
| `PUT` | `/api/transactions/:id` | Edit a pending/rejected transaction |
| `DELETE` | `/api/transactions/:id` | Delete a pending/rejected transaction |
| `POST` | `/api/transactions/:id/approve` | Approve a transaction |
| `POST` | `/api/transactions/:id/reject` | Reject a transaction with comment |
| `GET` | `/api/approvals/pending` | Get pending approvals for current user |
| `GET` | `/api/analytics/summary` | Transaction summary stats |
| `GET` | `/api/analytics/monthly` | Monthly trends |
| `GET` | `/api/analytics/vendors` | Vendor summary |
| `GET` | `/api/analytics/products` | Product summary |
| `GET` | `/api/settings` | Get AI settings |
| `PUT` | `/api/settings` | Update AI settings |
| `POST` | `/api/settings/test` | Test extraction with current settings |
| `GET` | `/api/audit` | Get audit logs |

---

## 9. Frontend Route Design (Phase 1 Outline)

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | User login page |
| `/` | Chat (Home) | Main chat interface for recording transactions |
| `/transactions` | Transactions | List of all transactions |
| `/transactions/:id` | Transaction Detail | View/edit a single transaction |
| `/approvals` | Pending Approvals | Approval center |
| `/analytics` | Analytics | Dashboard with charts and summaries |
| `/settings` | Settings | AI configuration (API key, model, etc.) |

---

## 10. Key Architecture Decisions

1. **Party/Product as soft references:** Transaction stores party/product names as strings, not foreign keys. The Party and Product tables serve as a dictionary for extraction improvement, not as strict references.

2. **AIExtraction is standalone:** Each extraction is logged independently. When a transaction is created, it references the extraction input text but not via FK. This keeps the extraction pipeline decoupled.

3. **SQLite for development, PostgreSQL for production:** The Prisma schema uses SQLite for easy local dev. The schema is compatible with both.

4. **No draft state in initial implementation:** Transactions go directly to `pending` on creation. The `draft` state is reserved for future auto-save functionality.

5. **Approval is append-only:** Even if a transaction is approved, all approval/rejection history is preserved in the Approval table for full audit trail.

6. **Confidence threshold at 0.7:** Below this threshold, the system forces user confirmation before proceeding. Above it, the system shows the extraction but allows quick confirm.

7. **Hybrid extraction (5-layer):** This is the core differentiator. Gemini is Layer 4 of 5, not the sole extraction method. Regex, rules, and dictionary matching handle the bulk of extraction reliably.

---

## 11. Transaction Validation Rules

| Rule | Description | Action |
|------|-------------|--------|
| Amount required | Every transaction must have an amount > 0 | Reject if missing |
| Type required | Transaction type must be one of the defined types | Reject if missing |
| Party validation | Vendor/Customer name must not contain common words (worth, from, for, etc.) | Flag for review |
| No dual parties on purchase | A purchase should have vendor, not customer | Warn user |
| No dual parties on sale | A sale should have customer, not vendor | Warn user |
| Confidence threshold | If confidence < 0.7, require explicit user confirmation | Force confirmation |
| Date validation | Date must not be in the future (±1 day tolerance) | Warn user |
| Amount plausibility | Flag unusually large amounts (> ₹10,00,000) | Warn user |

---

*This document serves as the complete Phase 1 deliverable. No code changes are made in this phase. The architecture, data model, and relationships are finalized here to guide all subsequent implementation phases.*