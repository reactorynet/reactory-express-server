# Transactional email — acceptance matrix (E5)

**Ticket:** REACTORY-302016408/20261103/1766701674 — E5 acceptance test: templated registration and password reset, per-application override and fallback
**Umbrella:** `workspace/notes/templated-email-registration-reset-plan.md` (§5, §6 — E6)
**Date:** 2026-11-03
**Status:** ◐ **harness complete and executed; the delivery layer is BLOCKED by a defect this matrix found (§4). 15 executed tests pass, 7 delivery-layer tests are NOT RUN.**

> A row is only `PASS` if it was produced by the suite named in §7, against a real
> MongoDB, with only the provider adapter faked. Rows marked **NOT RUN** are gates
> that could not be attempted — they must never be read as green.
>
> **One defect blocks the delivery layer for every scenario** (§4). It is reported,
> not fixed: it lives in the communicator module (a separate repository) and is a
> production write path for every sender on every channel, so it is not something a
> test ticket may change. With the one-line fix applied locally, **all 20 non-guard
> tests pass, including every delivery assertion** — see §4.3.

---

## 1. Gate summary

| Gate | What it proves | Status |
|---|---|---|
| Template + render layer | For each of the 10 scenarios, the real route resolved the intended template for the named purpose and the production renderer produced a **non-empty subject, html and text** with the expected value interpolated (`resetLink` / `activationLink`). | ✅ PASS (10/10 scenarios) |
| Override honoured | The application's `email_template_password_reset` / `email_template_registration` setting selects a custom template for **both** purposes, and the default is not used. | ✅ PASS |
| Fallback chain | Unset, empty, `null` and `{}` settings fall back quietly to the default; a setting naming a **missing** template fails loudly, naming the setting and the value, and does **not** send the default. | ✅ PASS |
| Delivery layer | The same message is persisted, dispatched through the real queue/worker/workflow engine and received by the provider adapter. | ⛔ **NOT RUN — blocked by D1 (§4)** |
| Negative controls (scenarios 3 and 10) | Removing the feature makes the scenario fail. | ✅ PASS (§5) |

**Verdict:** the templating half of the requirement is proven end-to-end from the HTTP surface. The delivery half is **not** proven in the committed state, and cannot be until D1 is fixed; a suite that reported it green today would be the exact "green-but-broken" outcome this ticket exists to prevent.

---

## 2. What is real, and what is faked

| Collaborator | State |
|---|---|
| `POST /useraccount/register`, `POST /useraccount/forgot`, `GET /useraccount/activate` | **real** — exercised through `supertest` against the real router |
| `resolveEmailTemplate` + purpose registry | **real** |
| `TemplateService` (incl. `validateVariables`, `renderMessage`, `resolveTemplate` fallback tiers) | **real** |
| Template seed data | **real** — written by `installDefaultEmailTemplates()`, the production seeder, into `communicatortemplates` |
| `CommunicatorService.send` / `renderTemplate` / subject precedence | **real** |
| `UserService.selfRegister` / `activateUser`, `User` model | **real** |
| `MessageService`, `Message` model, `ProviderRegistry`, `CommunicatorQueueService`, `MessageDispatchWorker`, `@reactorynet/workflow-es` host, `SendMessageWorkflow` | **real** |
| Provider adapter | **FAKE** — the network edge only (records what it was asked to send) |
| MongoDB | **real, disposable** (`TRANSACTIONAL_EMAIL_MONGO_URI`, default `…/reactory-transactional-email-acceptance`) |
| Audit sink (`ReactoryAuditService`) | **no-op recorder** — it is a PostgreSQL writer and this suite is Mongo-only; nothing under test reads it back, and `CommunicatorService.recordAudit()` already treats a failed audit write as non-fatal |

`TemplateService.resolveTemplate` and `CommunicatorService.send` are wrapped in **call-through** spies (`jest.spyOn` with no replacement implementation). They record; they do not substitute.

---

## 3. The matrix

Produced by the suite's own evidence table (printed at the end of every run) — not transcribed by hand.

### 3.1 Template + render layer — executed

| # | Scenario | Template view used | Subject observed | Result |
|---|---|---|---|---|
| 1 | Password reset, no setting | `forgot-password-email` | `Follow the steps below to reset your password for Acceptance Application.` | ✅ PASS |
| 2 | Registration, no setting | `activation-email` | `Welcome to Acceptance Application Ada, please confirm your account` | ✅ PASS |
| 3 | Password reset, application override | `acceptance-reset-email` | `Custom reset for Acceptance Application` | ✅ PASS |
| 4 | Registration, application override | `acceptance-activation-email` | `Confirm your Acceptance Application account` | ✅ PASS |
| 5 | Override points at a missing template (reset) | `this-template-does-not-exist` | — resolution failed before render | ✅ PASS — 500 naming `email_template_password_reset` and the value; no fallback sent |
| 5 | Override points at a missing template (registration) | `this-activation-template-does-not-exist` | — resolution failed before render | ✅ PASS — 200 + user created; failure logged naming `email_template_registration` and the value; no fallback sent |
| 6 | Setting malformed: `""` / `null` / `{}` | `forgot-password-email` (all three) | `Follow the steps below to reset your password for Acceptance Application.` | ✅ PASS |
| 6 | Setting `{}` on registration | `activation-email` | (delivery-layer row below) | ✅ PASS |
| 7 | Activation round trip | `activation-email` | n/a (route exercised) | ✅ PASS — `activated` once, `already_activated` on repeat, original timestamp preserved |
| 8 | Expired activation token | n/a | n/a | ✅ PASS — `410 expired_token`; `400 invalid_token` for a malformed token; account untouched |
| 9 | Forgot for an unknown address | n/a — no resolution attempted | n/a | ✅ PASS — `200`, generic acknowledgement, **0** sends, **0** messages |
| 10 | Send failure during registration | resolution succeeded | n/a | ✅ PASS — `200` + JWT + user created + failure logged |

Per-scenario assertions (all of them content assertions, never "a document exists"):

* non-empty `subject`, `html` and `text` in every rendered message;
* the interpolated `resetLink` / `activationLink` **appears in the rendered body** and equals the value the route supplied;
* the subject is **not** the route's last-resort literal — i.e. the template supplied it;
* the resolved template is identified by document id, and its `view` is asserted;
* for the override scenarios, the **custom** subject and body marker are present and the default body text is asserted absent.

### 3.2 Delivery layer — NOT RUN

| # | Scenario | Template view it would use | Result | Reason |
|---|---|---|---|---|
| 1 | Password reset, no setting | `forgot-password-email` | ⛔ NOT RUN | D1: `Message.create` rejects `id is required` |
| 2 | Registration, no setting | `activation-email` | ⛔ NOT RUN | D1 |
| 3 | Password reset, application override | `acceptance-reset-email` | ⛔ NOT RUN | D1 |
| 4 | Registration, application override | `acceptance-activation-email` | ⛔ NOT RUN | D1 |
| 6 | Malformed setting (registration) | `activation-email` | ⛔ NOT RUN | D1 |
| 7 | Activation round trip from the **delivered** email | `activation-email` | ⛔ NOT RUN | D1 — the body the recipient would receive is never produced |
| 10 | Provider failure, delivery view | — | ⛔ NOT RUN | D1 — no dispatch stage is reachable |

These seven tests are written and will run unchanged once D1 is fixed; §4.3 is the
run that proves it.

---

## 4. Defect D1 — the templated send path cannot persist a message

**Severity: blocking.** Found by this suite; not fixed here.

### 4.1 What happens

```
Message validation failed: CommunicatorMessage validation failed:
  id: Path `id` is required.
```

`communicator/services/MessageService.ts` — `createMessage(data)` spreads the
caller's data into `messageData` and calls `this.messageModel.create(messageData)`.
The `Message` schema declares

```ts
id: { type: String, required: true, unique: true, index: true }
```

and nothing — neither `MessageService`, nor `CommunicatorService.createMessage()`,
nor `ISendPayload` (which has no `id` field at all) — ever assigns it. The write
therefore always fails with `VALIDATION_ERROR`, which `CommunicatorService.send()`
wraps as `MESSAGE_CREATE_FAILED`.

**Consequences, all observed through the real routes in this suite:**

| Surface | Observed |
|---|---|
| `POST /useraccount/forgot` (known address) | `500 { error: 'Failed to send reset email', message: 'Failed to create message' }` — no email, no message row |
| `POST /useraccount/register` | `200` + JWT (non-fatal by design) but **no email**; the failure is logged |
| Any other `CommunicatorService.send()` caller | same failure — this is the single production send path (`sendFacade`) |
| Enumeration side effect | while D1 exists `/forgot` answers **500 for a known address and 200 for an unknown one**, which is exactly the oracle the route's uniform acknowledgement is designed to avoid. It disappears when D1 is fixed. |

### 4.2 Why nothing caught it

`services/__tests__/MessageService.test.ts` asserts
`mockMessageModel.create` was called with `messageData` — and the mock accepts any
shape. The W9 acceptance harness seeds `Message` rows directly and never calls
`createMessage()`, so it exercises every stage *after* the broken one. This is the
same shape as the three prior failures named in the ticket.

### 4.3 Forward verification (revert-and-observe, in the other direction)

The one-line fix was applied **locally and then reverted** (nothing committed):

```diff
-      const messageData = { ...data };
+      const messageData = { ...data, id: (data as any).id || randomUUID() };
```

With that patch and `DELIVERY_ENABLED = true`:

```
Test Suites: 1 passed, 1 total
Tests:       2 skipped, 20 passed, 22 total
```

Every delivery row then PASSes against the provider adapter, with these observed
subjects (the adapter received them):

| Scenario | Subject the provider adapter received |
|---|---|
| 1 — reset default | `Follow the steps below to reset your password for Acceptance Application.` |
| 2 — registration default | `Welcome to Acceptance Application Ada, please confirm your account` |
| 3 — reset override | `Custom reset for Acceptance Application` |
| 4 — registration override | `Confirm your Acceptance Application account` |
| 6 — malformed setting | `Welcome to Acceptance Application Ada, please confirm your account` |
| 7 — activation from the delivered body | link extracted from the email body activated the account, twice idempotently |
| 10 — provider failure | no email delivered; registration unaffected |

The two skipped tests in that run are the D1 guard, which skips itself when the
blocker is gone. After the verification the communicator working tree was restored:

```
$ git -C src/modules/reactory-communicator status --porcelain
(clean)
```

**Follow-up needed:** a ticket in the communicator repository to assign the business
`id` in `MessageService.createMessage()` (and a real-model test that does not mock
`create`). Then set `DELIVERY_ENABLED = true` in this suite.

---

## 5. Negative controls

Both controls were run against the **committed** suite, then reverted and verified.

### 5.1 Scenario 3 — remove the override feature

Change (local, reverted): `if (configuredReference) {` → `if (false && configuredReference) {` in
`communicator/services/emailTemplates/resolveEmailTemplate.ts`, i.e. tier 1 of the
resolver (the application setting) is removed.

Observed: **6 failed, 2 skipped, 14 passed**. Exactly the override-dependent
scenarios failed and nothing else:

| Test | Result |
|---|---|
| scenario 3 — uses the custom template | ❌ FAIL |
| scenario 3 — delivers the custom subject and body | ❌ FAIL |
| scenario 4 — uses the custom template | ❌ FAIL |
| scenario 4 — delivers the custom subject and body | ❌ FAIL |
| scenario 5 — reset: missing-template override fails loudly | ❌ FAIL (the setting is no longer read) |
| scenario 5 — registration: missing-template override fails loudly | ❌ FAIL |
| scenarios 1, 2, 6, 7, 8, 9, 10 | ✅ still pass |

Concrete failure message (delivery layer, run with D1 patched so the assertion is
made against what the provider received):

```
● scenario 3 › delivers the custom subject and body
  Expected: "Custom reset for Acceptance Application"
  Received: "Follow the steps below to reset your password for Acceptance Application."
```

Reverted: `git -C src/modules/reactory-communicator checkout -- services/emailTemplates/resolveEmailTemplate.ts`
→ working tree clean → suite back to 15 passed / 7 skipped.

### 5.2 Scenario 10 — make the send failure fatal

Change (local, reverted): in `reactory-core/routes/useraccount/UserAccount.ts`,
`POST /register` loses the nested `try/catch` around
`sendRegistrationActivationEmail(...)`, so the failure escapes to the outer handler.

Observed: **3 failed, 2 skipped, 17 passed**:

| Test | Result |
|---|---|
| scenario 10 — a send failure during registration is non-fatal | ❌ FAIL |
| scenario 10 — delivery view | ❌ FAIL |
| scenario 5 — registration half (it asserts the non-fatal 200) | ❌ FAIL |
| everything else | ✅ still pass |

Concrete failure message:

```
● scenario 10 › still creates the user, still returns 200, and logs the failure
  Expected: 200
  Received: 500
```

Reverted: `git checkout -- src/modules/reactory-core/routes/useraccount/UserAccount.ts`
→ suite back to 15 passed / 7 skipped.

**Why this matters:** each control removes only the feature under test and fails only
the scenarios that depend on it. Neither suite would pass "before and after".

---

## 6. Already covered vs newly written

| Behaviour | Existing evidence | This ticket |
|---|---|---|
| `/forgot` names the purpose, carries the client scope, passes the resolved document id, subject precedence, non-enumeration, token lifetime, link normalisation | `UserAccount.forgot.test.ts` (18 tests) — **all with a fake resolver, fake TemplateService and fake CommunicatorService** | re-proven against the real resolver, real templates and real renderer |
| Activation token mint/inspect/expiry/scope, `activateUser` idempotency, redirects | `UserAccount.activation.test.ts` (48 tests) + `UserService.activateUser.test.ts` (5) | round trip re-proven through the real route with a token produced by the real registration flow |
| Seeded templates render (subject/body elements, `$ref://` bodies, localisation) | communicator `TemplateService` suite + E4's seeded-render test | re-proven through `CommunicatorService.renderTemplate` with the route's own payload |
| **Cross-cutting**: one template system driving both flows, the same override mechanism for both purposes, the fallback chain, the distinct failure modes, delivery to the provider boundary | none | **new** — all 10 scenarios |

No weaker duplicate was written: where an existing test already covers a behaviour,
this suite asserts the *cross-cutting* property (the same resolver, the same renderer,
the same dispatch path) instead of repeating the unit-level assertion.

---

## 7. How to run it

The suite needs a live MongoDB, so it is a categorised **integration** suite
(`test/integrationSuites.js`) and is excluded from the unit pass by configuration,
not quarantined.

```sh
cd <express-server checkout>
MONGO_USER=... MONGO_PASSWORD=... \
TRANSACTIONAL_EMAIL_MONGO_URI="mongodb://127.0.0.1:27017/reactory-transactional-email-acceptance" \
npx --no-install jest --config jest.integration.config.ts --runInBand --forceExit \
  --testPathPattern "useraccount/__tests__/acceptance/transactionalEmail"
```

Files:

| Path | Purpose |
|---|---|
| `src/modules/reactory-core/routes/useraccount/__tests__/acceptance/transactionalEmail.acceptance.test.ts` | the 10 scenarios + D1 guard + evidence table |
| `src/modules/reactory-core/routes/useraccount/__tests__/support/transactionalEmail/acceptanceHarness.ts` | real collaborator graph, fake adapter, disposable-database lifecycle |
| `test/integrationSuites.js` | categorisation (needs MongoDB) |

Results, this machine, 2026-11-03 (node v20.19.4):

| Run | Count |
|---|---|
| Committed state (blocked) | **15 passed, 7 skipped, 22 total** — suite green |
| With D1 patched locally | **20 passed, 2 skipped, 22 total** — suite green |
| Existing useraccount suites (`jest.config.ts`, unit) | **66 passed, 66 total** — unchanged before and after; the new suite is not selected by the unit config |

The database is created, seeded and cleaned by the suite: it drops and recreates the
disposable database at start, and `teardown()` deletes only the rows it wrote
(messages by `partnerId`, templates by `client`, users by the acceptance email
domain, and its own `ReactoryClient`). It refuses to run with
`NODE_ENV=production`.

---

## 8. Caveats and open items

1. **D1 blocks the delivery layer** (§4). The single most important line in this document.
2. **Subject localisation depends on `APP_DATA_ROOT`.** The seeded subject elements are
   `<%= t('emails.forgotPassword.subject', …) %>`. With the real i18n bundles present
   the subject is the English sentence shown above; with no bundle the translator's
   documented key-echo fallback yields the key name. The suite therefore asserts the
   *properties* that must hold in both worlds (non-empty, not the route literal, the
   override's literal subject for custom templates) rather than pinning one bundle's
   text. Rows above are from a run where the bundles were present.
3. **One incidental flake observed, not reproducible.** The first run of the two
   existing useraccount suites in this worktree reported `1 failed, 65 passed`; three
   subsequent runs (worktree and master) reported `66 passed`. The suite is
   timing-sensitive (`POST /forgot - reset token lifetime` compares real clocks). Not
   caused by this ticket — nothing here is imported by those suites — but worth knowing
   before attributing a red module run to the matrix.
4. **`Message` rows cannot be asserted for delivery** while D1 exists; the delivery
   tests assert against the provider adapter instead, which is what "delivered" means
   at this boundary.
