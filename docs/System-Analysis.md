
# System Analysis — HeavenlyQR

Real-Time Service Request Management System, applied to a QR code generation
domain: an operator submits a **URL + an ID range**, the system generates one
QR code per ID in that range as a background batch job, and supervisors watch
the batch progress live.

Why qr? Back in the day, when i was starting in this field i did a project name 
QR-Bee which had a simillar problem. Due to lack of knowladge and experience 
build a system which we are not proud of, we talk about how we should have 
made the system. So now i am trying to make it bit better.

## 1. Problem Statement

### Business objectives

- Replace manual, QR generation with a system operators can submit
  work to and walk away from — no manual tracking of "did this finish yet."
- Give supervisors a live view of everything in flight, across every
  operator, without refreshing a page.
- Handle batches of meaningfully large size (up to thousands of QR codes per
  request) without a single slow request blocking the API or the UI.
- Keep a durable, queryable record of every request and every generated QR
  code after the fact.

### Users

| Role | Needs from the system |
|---|---|
| **Operator** | Submit a new request (URL + ID range); see their own requests' status; cancel a request they submitted; retrieve generated QR codes. |
| **Supervisor** | See all requests across all operators; monitor progress in real time; search/filter the request queue; investigate failures. |

No distinct system administrator role is defined — see Assumptions below on
authentication/authorization being out of scope for this submission.

### Assumptions

- **No authentication/authorization.** Operator vs. Supervisor is a UI-level
  distinction (what a screen shows), not an enforced permission boundary.
  Anyone with access can submit, view, and cancel any request. Explicitly
  out of scope for this submission.
- **A "QR code" encodes one URL variant per ID** the system treats the ID
  as an opaque integer combined with the base URL (`{url}/{id}`); it doesn't
  assume what the ID means to the business.
- **A request is a fixed-size batch, not an open-ended stream.** The ID
  range is capped at 5,000 IDs and fixed at creation time.
- **Single-region, single-deployment scale** — not multi-tenant SaaS.
- **Generated QR images are stored server-side** (a shared volume between
  the API and worker containers) and served back through the API, rather
  than generated client-side.

### Scope

**In scope:** submitting a request, background generation of one QR per ID,
live progress updates, viewing/searching/filtering requests and their
per-item results, cancelling in-flight requests, persistent storage of
requests and results.

**Out of scope (this submission):** authentication/authorization, multi-user
account management, rate limiting per user, email/webhook notifications on
completion, bulk download as a zip, multi-region deployment. Several of
these map directly to the assignment's "Bonus Considerations" and are
intentionally deferred rather than half-implemented.

## 2. Functional Requirements

| ID | Requirement | Notes |
|---|---|---|
| FR-1 | Create a service request from a URL and an ID range (`idRangeStart`, `idRangeEnd`) | Returns immediately (`202`-style semantics) — creation does not wait for generation |
| FR-2 | View a paginated list of service requests | Supports `page`/`limit` |
| FR-3 | View a single service request's detail (status, aggregate progress) | |
| FR-4 | View the individual QR items belonging to a request, paginated | Needed once ranges get large |
| FR-5 | Retrieve/download the generated QR image for a single item | |
| FR-6 | Search requests (by URL substring) | |
| FR-7 | Filter requests by status | `PENDING`, `PROCESSING`, `COMPLETED`, `PARTIALLY_FAILED`, `FAILED`, `CANCELLED` |
| FR-8 | Sort requests by creation or last-updated time | |
| FR-9 | Cancel a request | Only valid from a non-terminal status; already-completed items are not undone |
| FR-10 | System automatically transitions a request's status as its items complete | Driven by workers, not by client calls |
| FR-11 | Monitor a request's live progress (completed/failed/total counts) | |
| FR-12 | Receive live updates over WebSocket as items complete, without polling | Scoped per request via a subscribe/room mechanism |
| FR-13 | Reject invalid input with a clear error: malformed URL, inverted or oversized ID range | Range capped (5,000 IDs) to bound worst-case load from one request |
| FR-14 | Process multiple requests' items concurrently without blocking incoming API calls | Generation happens in a separate worker process, not inline in the request handler |
| FR-15 | Persist all requests and their results durably, surviving a server restart | |

## 3. Non-Functional Requirements

| Requirement | Applies? | Justification |
|---|---|---|
| **Performance** | Yes | `POST /service-requests` must return quickly regardless of range size — it persists + enqueues, it never generates inline. This is the entire reason generation is pushed to a worker (FR-14). |
| **Scalability** | Yes | Load is dominated by generation work, not request volume. The worker is a separate horizontally-scalable process (`docker-compose.yml`'s `worker` service). Add replicas or raise `WORKER_CONCURRENCY` to absorb bigger batches without touching the API. |
| **Reliability** | Yes | Jobs use BullMQ retry with exponential backoff (3 attempts) rather than failing an item permanently on a transient error; a request's status only reaches a terminal state once every item has resolved. |
| **Security** | Partial | Input validation (zod, all layers) and standard hardening (Helmet headers, CORS allowlist, Prisma parameterized queries means no raw SQL) are in scope. Authentication/authorization and rate limiting are explicitly **not**. Treated as partial rather than N/A because "no auth" is a scoping decision, not a claim that security doesn't apply. |
| **Maintainability** | Yes | Layered architecture (routes → controllers → services), one validation convention (zod schema + `validateRequest` middleware), one response envelope, strict TypeScript, ESLint/Prettier chosen specifically so a reviewer or a future contributor doesn't have to learn a different pattern per file. |
| **Availability** | Yes, at single-instance scope | Docker Compose healthchecks gate service startup order; both the listener and worker handle `SIGTERM`/`SIGINT` for graceful shutdown. Multi-instance failover/HA is out of scope |
| **Usability** | Yes | Form validation mirrors backend rules client-side before submit; request status is visible without a manual refresh; errors surface the same `message`/`details` shape the API returns, not a generic failure. |
| **Responsiveness (UI)** | Yes | Tailwind-based responsive layout (mobile → desktop) using shadcn-svelte components; live state updates arrive over WebSocket, so the UI reflects worker progress within about a second rather than on the next poll/refresh. |

