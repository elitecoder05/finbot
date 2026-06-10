# Finance Recording Chatbot - Complete Product & Engineering Prompt

You are a world-class Product Architect, AI Engineer, Backend Engineer, Database Architect, and Full Stack Developer.

Your task is to design and build a complete production-ready web application called:

# Family Finance Recorder AI

The purpose of this application is to allow family members to record financial transactions using natural language while maintaining an approval workflow.

This is NOT a generic expense tracker.

This is an AI-powered accounting assistant that converts natural language into structured accounting records.

---

# IMPORTANT REQUIREMENT

Do NOT rely on Gemini alone to extract data.

My previous implementation had a major issue:

Input:

"Bought 1500 worth cement from Suresh"

Gemini extracted:

Vendor:
"worth cement from Suresh"

which is completely wrong.

I need a much more robust architecture.

---

# TECH STACK

You decide the best stack.

Preferred architecture:

Frontend:

* Next.js
* TypeScript
* Tailwind
* Shadcn UI

Backend:

* Next.js API Routes OR NestJS

Database:

* PostgreSQL

ORM:

* Prisma

Authentication:

* Simple role-based login

AI:

* Gemini API

State:

* TanStack Query

Deployment:

* Vercel + Supabase/Postgres

---

# CORE CONCEPT

Three users:

1. Father
2. Brother
3. Me

Each user can record transactions.

But approval rules are different.

---

# APPROVAL WORKFLOW

Transactions recorded by:

Father

Must be approved by:

* Me OR Brother

---

Transactions recorded by:

Brother

Must be approved by:

* Me

---

Transactions recorded by:

Me

Must be approved by:

* Brother

---

A transaction becomes FINAL only after approval.

---

# AI TRANSACTION ENTRY

Users can type:

"Bought 15000 worth cement from Ramesh"

"500 from Suresh for pens"

"Paid 2500 to Mahesh for sand"

"Purchased 20 bags of cement from Ravi for 12000"

"Paid labor charges 5000 to Kumar"

"Sold bricks worth 10000 to Vinod"

"Received 3000 from Ganesh"

Anything.

The wording is completely free-form.

---

# CRITICAL AI REQUIREMENT

Do NOT simply ask Gemini:

"Extract vendor"

That approach is unreliable.

Instead:

Use a structured extraction pipeline.

---

STEP 1

Classify transaction:

Purchase

Sale

Expense

Income

Transfer

Advance

Other

---

STEP 2

Extract entities:

Amount

Vendor

Customer

Product

Quantity

Transaction Type

Payment Direction

Date

Notes

---

STEP 3

Validate extracted entities.

Example:

Input:

"Bought 1500 worth cement from Suresh"

Correct extraction:

Amount:
1500

Product:
cement

Vendor:
Suresh

Transaction Type:
Purchase

---

NOT:

Vendor:
worth cement from Suresh

---

STEP 4

Run validation layer.

If confidence < threshold:

Ask user:

"I found:

Amount: 1500
Product: Cement
Vendor: Suresh

Is this correct?"

---

# STRUCTURED OUTPUT

Gemini must always return JSON.

Example:

{
"transactionType": "purchase",
"amount": 1500,
"product": "cement",
"vendor": "Suresh",
"customer": null,
"quantity": null,
"notes": null,
"confidence": 0.96
}

---

# DATABASE DESIGN

Create tables:

Users

Transactions

Approvals

Products

Parties

AuditLogs

AIExtractions

---

# TRANSACTION TABLE

Fields:

id

transactionType

amount

product

vendor

customer

quantity

notes

createdBy

createdAt

approvalStatus

approvedBy

approvedAt

---

# USER INTERFACE

Single-page application.

---

LEFT SIDEBAR

Dashboard

Transactions

Pending Approvals

Approved Transactions

Analytics

Settings

---

TOP BAR

User switcher

Current role

Statistics

---

# MAIN SCREEN

Chat interface.

Looks like:

ChatGPT

WhatsApp

Telegram

Hybrid experience.

---

CHAT FLOW

User types:

"Bought 1500 worth cement from Suresh"

AI displays:

Detected Transaction

Amount:
1500

Product:
Cement

Vendor:
Suresh

Type:
Purchase

Save Transaction

Edit Transaction

---

# APPROVAL CENTER

Show:

Pending approvals

Approve

Reject

View details

Comments

---

# ANALYTICS

Total Purchases

Total Sales

Total Expenses

Pending Approvals

Monthly Trends

Vendor Summary

Product Summary

---

# GEMINI SETTINGS

Create settings page.

Allow:

Gemini API Key input

Model selection

Temperature

Prompt testing

Extraction testing

Store key locally.

---

# IMPORTANT AI ENGINEERING REQUIREMENT

Do NOT depend on prompting alone.

Build a hybrid extraction engine:

Layer 1:
Regex

Layer 2:
Entity Detection

Layer 3:
Gemini Structured Extraction

Layer 4:
Validation Rules

Layer 5:
User Confirmation

This should drastically improve extraction accuracy.

---

# EXAMPLES TO TEST

Bought 1500 worth cement from Suresh

Purchased 25 bags cement from Ravi for 15000

Paid Kumar 5000 labor charges

Received 2500 from Vinod

Sold bricks worth 10000 to Ganesh

Paid rent 12000

Transferred 5000 to brother

---

# SECURITY

Role-based permissions

Audit logs

Approval history

Transaction history

---

# OUTPUT REQUIRED

Provide:

1. Complete architecture
2. Database schema
3. Prisma schema
4. API design
5. Frontend design
6. AI extraction engine
7. Approval workflow
8. Gemini integration
9. Full implementation plan
10. Production-ready code structure

---

# FINAL GOAL

Build the most reliable natural-language family finance recording system possible.

Accuracy of transaction extraction is more important than fancy UI.

Never blindly trust the LLM output.

Always validate and structure the data before saving.








------------------------------------------------
-----------------------------------------------------------
------------------------------------------------
-----------------------------------------------------------
------------------------------------------------
-----------------------------------------------------------
------------------------------------------------
-----------------------------------------------------------
------------------------------------------------
-----------------------------------------------------------
------------------------------------------------
-----------------------------------------------------------
------------------------------------------------
-----------------------------------------------------------
------------------------------------------------
-----------------------------------------------------------
------------------------------------------------
-----------------------------------------------------------
------------------------------------------------
-----------------------------------------------------------














Phase 1: Architecture & Data Modeling
Goal

Finalize how data flows through the system before writing code.

Step 1

Draw complete user flow.

Example:

User Types Message

↓

AI Extraction

↓

Validation

↓

User Confirmation

↓

Transaction Created

↓

Pending Approval

↓

Approval

↓

Final Transaction

Step 2

Define all transaction types.

Purchase

Sale

Expense

Income

Transfer

Advance

Other

Step 3

Define transaction states.

Draft

Pending Approval

Approved

Rejected

Step 4

Define approval matrix.

Father → Brother OR Me

Brother → Me

Me → Brother

Step 5

Design database entities.

Users

Transactions

Approvals

Parties

Products

AuditLogs

AIExtractions

Settings

Step 6

Define relationships.

Transaction belongs to User

Transaction belongs to Product

Transaction belongs to Vendor

Transaction belongs to Customer

Approval belongs to Transaction

Approval belongs to User

Deliverable

ER Diagram completed.

No coding yet.

Phase 2: Project Setup
Goal

Create the base application.

Step 1

Create Next.js project.

Step 2

Install TypeScript.

Step 3

Install Tailwind.

Step 4

Install Shadcn.

Step 5

Install Prisma.

Step 6

Connect PostgreSQL.

Step 7

Create folder structure.

Example:

src/
  app/
  components/
  features/
  services/
  lib/
  prisma/
  types/
Step 8

Configure environment variables.

Step 9

Setup ESLint.

Step 10

Setup Prettier.

Deliverable

Project runs successfully.

Database connection works.

Phase 3: Database Implementation
Goal

Create all tables.

Step 1

Create User model.

Step 2

Create Party model.

Step 3

Create Product model.

Step 4

Create Transaction model.

Step 5

Create Approval model.

Step 6

Create AuditLog model.

Step 7

Create AIExtraction model.

Step 8

Create Settings model.

Step 9

Run migration.

Step 10

Seed users.

Father

Brother

Me

Deliverable

Database fully operational.

Phase 4: Authentication & Permissions
Goal

Users can login and access only permitted features.

Step 1

Create login page.

Step 2

Create session management.

Step 3

Create role middleware.

Step 4

Protect routes.

Step 5

Create user switcher.

Step 6

Display current role.

Step 7

Implement approval permission rules.

Example:

If creator = Brother

Approver must = Me

Deliverable

Authentication working.

Authorization working.

Phase 5: AI Extraction Engine (Core System)

This is where most projects fail.

Do NOT start with Gemini.

Start with deterministic extraction.

Layer 1

Regex Engine

Build extractors for:

Amount

Quantity

Date

Units

Party references

Example:

Input:

Purchased 25 bags cement from Ravi for 15000

Extract:

{
 "quantity":25,
 "unit":"bags",
 "amount":15000
}

without AI.

Layer 2

Rule Engine

Create classification rules.

Examples:

contains("bought")

→ Purchase

contains("sold")

→ Sale

contains("received")

→ Income

contains("paid")

→ Expense

Layer 3

Dictionary Matching

Maintain known:

Products

Vendors

Customers

Expense Categories

Example:

"Cement"

should immediately match product.

Layer 4

Gemini Extraction

Only now call Gemini.

Send:

{
 "rawText":"Bought 1500 worth cement from Suresh",
 "regexResult":{},
 "ruleResult":{},
 "knownProducts":[]
}

Let Gemini fill missing fields.

Not everything.

Layer 5

Validation Engine

Check:

Amount exists

Transaction type exists

Party name valid

No contradictory fields

Deliverable

Extraction service returns clean JSON.

Phase 6: Transaction Creation Workflow
Goal

Convert AI output into transactions.

Step 1

Create Chat Input.

Step 2

Submit text.

Step 3

Call extraction API.

Step 4

Show extracted fields.

Example:

Amount: 1500
Product: Cement
Vendor: Suresh
Type: Purchase
Step 5

Allow editing.

Step 6

Allow confirmation.

Step 7

Save transaction.

Step 8

Create audit log.

Deliverable

Transaction recording works.

Phase 7: Approval System
Goal

Make transactions legally valid only after approval.

Step 1

Create Pending Approval page.

Step 2

Fetch pending transactions.

Step 3

Check approval matrix.

Step 4

Show Approve button.

Step 5

Show Reject button.

Step 6

Add comments.

Step 7

Record approval history.

Step 8

Update transaction status.

Deliverable

Approval workflow complete.

Phase 8: Chat-Based User Experience
Goal

Make application feel like ChatGPT.

Step 1

Create conversation layout.

Step 2

Display user messages.

Step 3

Display AI extraction cards.

Step 4

Display confirmation cards.

Step 5

Display saved transaction messages.

Step 6

Display approval updates.

Deliverable

Chat interface feels natural.

Phase 9: Analytics
Goal

Generate meaningful reports.

Step 1

Create transaction summary APIs.

Step 2

Calculate purchases.

Step 3

Calculate sales.

Step 4

Calculate expenses.

Step 5

Calculate income.

Step 6

Generate monthly trends.

Step 7

Generate vendor summaries.

Step 8

Generate product summaries.

Step 9

Generate approval metrics.

Deliverable

Dashboard provides business insights.

Phase 10: Gemini Management
Goal

Allow AI tuning without code changes.

Step 1

Create AI settings page.

Step 2

Save Gemini API key.

Step 3

Save model name.

Step 4

Save temperature.

Step 5

Create extraction testing screen.

Step 6

Show raw Gemini response.

Step 7

Show parsed output.

Step 8

Show confidence score.

Deliverable

AI can be debugged easily.

Phase 11: Production Hardening

Most developers skip this phase.

Do not.

Step 1

Add request logging.

Step 2

Add AI logs.

Step 3

Add retry mechanism.

Step 4

Add Gemini timeout.

Step 5

Add malformed JSON handling.

Step 6

Add transaction rollback.

Step 7

Add audit tracking.

Step 8

Add rate limiting.

Step 9

Add database backups.

Step 10

Deploy to staging.

Step 11

Run real-world testing.

Step 12

Deploy production.

Recommended Build Order (Actual Development Sequence)

Week 1:

Phase 1
Phase 2
Phase 3

Week 2:

Phase 4
Phase 5

Week 3:

Phase 6
Phase 7

Week 4:

Phase 8
Phase 9

Week 5:

Phase 10
Phase 11

The most important decision in the entire project is this:

Never let Gemini directly create transactions.

The flow should always be:

User Input
    ↓
Regex Extraction
    ↓
Rule Engine
    ↓
Dictionary Matching
    ↓
Gemini Enhancement
    ↓
Validation
    ↓
User Confirmation
    ↓
Database Save
    ↓
Approval Workflow

That architecture is what separates a reliable finance recorder from a chatbot that occasionally invents accounting data.

