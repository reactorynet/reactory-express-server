# Transactional email — acceptance matrix (E5)

**Ticket:** REACTORY-302016408/20261103/1766701674 — E5 acceptance test: templated registration and password reset, per-application override and fallback
**Umbrella:** `workspace/notes/templated-email-registration-reset-plan.md` (§5, §6 — E6)
**Date:** 2026-11-03 (revision 3 — review response R5/R6 + notes N5/N6/N7)
**Status:** ⛔ **BLOCKED — not done.** One upstream defect (D1) prevents the delivery layer of all ten scenarios from executing. The harness is complete and the templating half is proven; the ticket's first acceptance criterion ("all 10 scenarios implemented and passing with real collaborators") is **not met**.

> A row is only `PASS` if an **executed** test produced it, and every `PASS` row
> states the HTTP status the test actually observed. Rows marked **NOT RUN** are
> gates that could not be attempted — they must never be read as green.
>
> This revision responds to the second review. The changes are listed in §9; §4.5 records the guard-behaviour correction and the two runs that prove it.

---

## 1. Gate summary

| Gate | What it proves | Status |
|---|---|---|
| Template + render layer | For the five scenarios that render an email (**1, 2, 3, 4, 6**), the real route resolved the intended template for the named purpose and the production renderer produced a **non-empty subject, html and text** with the expected value interpolated (`resetLink` / `activationLink`). 7 executed rows (§3.1 rows 1, 2, 3, 4, 6a, 6b, 6c). | ✅ PASS — 7 executed rows |
| Override honoured | The application's `email_template_password_reset` / `email_template_registration` setting selects a custom template for **both** purposes, and the default is not used. | ✅ PASS |
| Route behaviour, no render | Scenarios **5a, 5b** (override naming a missing template), **7** (activation round trip), **8** (expired token), **9** (unknown address) and **10** (send failure) assert route/domain behaviour, not rendered content: 5a/5b fail before render, 7/8/9/10 have no rendered message in their executed form. Their §3.1 rows record `n/a` or "resolution failed before render" — that is the honest value, and this row exists so §1 does not read as if they rendered. | ✅ PASS — 6 executed rows, asserted as behaviour |
| Fallback chain | Unset, empty, `null` and `{}` settings fall back quietly to the default; a setting naming a **missing** template fails loudly, naming the setting and the value, and does **not** send the default. | ✅ PASS |
| Delivery layer | The message is persisted, dispatched through the real queue/worker/workflow engine and received by the provider adapter. | ⛔ **NOT RUN — 7 tests, blocked by D1 (§4)** |
| Negative controls (scenarios 3 and 10) | Removing the feature makes the scenario fail. | ✅ PASS (§5) |

**Verdict:** the templating requirement is proven from the HTTP surface. The
delivery requirement is **not proven**, and cannot be until D1 is fixed. The
committed suite is green (15 passed / 7 skipped) only because the seven
unprovable tests are honestly skipped and guarded — a green suite is not the
same thing as a satisfied acceptance criterion, and this ticket must not be
closed on it.

**Disposition: BLOCKED on a communicator-repository fix (§4.4).**

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
| Queue **transport** | **in-memory** — `reactory-queue`'s `InMemoryQueueService`. The queue *service* above it (`CommunicatorQueueService`) and the worker that drains it (`MessageDispatchWorker`) are the real ones; only the broker is replaced, exactly as the W9 channel acceptance suite does for its CI-safe half. No Redis/RabbitMQ is contacted. |
| Workflow engine **persistence** | **in-memory** — `@reactorynet/workflow-es`'s `MemoryPersistenceProvider`, with `allowSingleNodeProviders(true)`. The engine host and `SendMessageWorkflow` are real and execute for real; only the durable instance store is replaced, so a workflow's terminal state is readable in-process rather than in a database. |
| Audit sink (`ReactoryAuditService`) | **no-op recorder** — a PostgreSQL writer; this suite is Mongo-only, nothing under test reads it back, and `CommunicatorService.recordAudit()` already treats a failed audit write as non-fatal |

**What the in-memory transport and persistence mean for the evidence.** A green
delivery row therefore proves the message reached the *provider adapter* through
the real producer, worker, workflow engine and registry — it does **not** prove
anything about a specific broker's delivery guarantees, retry timing under a real
queue, or crash recovery from a durable workflow store. Those are properties of
the transport, are covered (or not) by the W9/operator procedures in the
communicator module, and are out of scope here. Stated so a reader cannot mistake
"dispatched" for "a broker durably accepted it".

`TemplateService.resolveTemplate` and `CommunicatorService.send` are wrapped in **call-through** spies (`jest.spyOn` with no replacement implementation). They record; they do not substitute.

---

## 3. The matrix

Produced by the suite's own evidence table, printed at the end of every run —
including the HTTP column, which is read from the response object the assertions
ran on and is never typed in by hand.

### 3.1 Template + render layer — executed (13 rows)

| # | Scenario | HTTP observed | Template view used | Subject observed | Result |
|---|---|---|---|---|---|
| 1 | Password reset, no setting | `POST /useraccount/forgot -> 500` | `forgot-password-email` | `Follow the steps below to reset your password for Acceptance Application.` | ✅ PASS |
| 2 | Registration, no setting | `POST /useraccount/register -> 200` | `activation-email` | `Welcome to Acceptance Application Ada, please confirm your account` | ✅ PASS |
| 3 | Password reset, application override | `POST /useraccount/forgot -> 500` | `acceptance-reset-email` | `Custom reset for Acceptance Application` | ✅ PASS |
| 4 | Registration, application override | `POST /useraccount/register -> 200` | `acceptance-activation-email` | `Confirm your Acceptance Application account` | ✅ PASS |
| 5a | Override names a missing template — reset | `POST /useraccount/forgot -> 500` | `this-template-does-not-exist` | — resolution failed before render | ✅ PASS — message names `email_template_password_reset` **and** the value, states it does not fall back; 0 sends |
| 5b | Override names a missing template — registration | `POST /useraccount/register -> 200` | `this-activation-template-does-not-exist` | — resolution failed before render | ✅ PASS — user created, failure logged naming `email_template_registration` **and** the value; 0 sends |
| 6a | Malformed setting `""` — reset | `POST /useraccount/forgot -> 500` | `forgot-password-email` | `Follow the steps below to reset your password for Acceptance Application.` | ✅ PASS |
| 6b | Malformed setting `null` — reset | `POST /useraccount/forgot -> 500` | `forgot-password-email` | `Follow the steps below to reset your password for Acceptance Application.` | ✅ PASS |
| 6c | Malformed setting `{}` — reset | `POST /useraccount/forgot -> 500` | `forgot-password-email` | `Follow the steps below to reset your password for Acceptance Application.` | ✅ PASS |
| 7 | Activation round trip | `GET /useraccount/activate -> 200, repeat -> 200` | `activation-email` | n/a (route exercised) | ✅ PASS — `activated` once, `already_activated` on repeat, original timestamp preserved |
| 8 | Expired activation token | `GET /useraccount/activate -> 410; malformed token -> 400` | n/a | n/a | ✅ PASS — distinct `expired_token` vs `invalid_token`; account untouched |
| 9 | Forgot for an unknown address | `POST /useraccount/forgot -> 200` | none — no resolution attempted | n/a | ✅ PASS — generic acknowledgement, **0** sends, **0** messages |
| 10 | Send failure during registration is non-fatal | `POST /useraccount/register -> 200` | resolution succeeded; the send failed | n/a | ✅ PASS — **for a persistence-stage failure only** (see §3.3) |

Rows that were previously claimed as `PASS` without an executed test behind them
have been removed. Specifically, **scenario 6's registration half is no longer in
this table**: its only supporting test is the delivery-layer test, which is
skipped, so it now appears solely in §3.2 as `NOT RUN`.

### 3.2 Delivery layer — NOT RUN (7 tests)

| # | Scenario | Template view it would use | Result | Reason |
|---|---|---|---|---|
| 1 | Password reset, no setting | `forgot-password-email` | ⛔ NOT RUN | D1: `Message.create` rejects `id is required` |
| 2 | Registration, no setting | `activation-email` | ⛔ NOT RUN | D1 |
| 3 | Password reset, application override | `acceptance-reset-email` | ⛔ NOT RUN | D1 |
| 4 | Registration, application override | `acceptance-activation-email` | ⛔ NOT RUN | D1 |
| 6 | Malformed setting (registration) | `activation-email` | ⛔ NOT RUN | D1 |
| 7 | Activation round trip from the **delivered** email | `activation-email` | ⛔ NOT RUN | D1 — the body the recipient would receive is never produced |
| 10 | Provider-stage failure, delivery view | — | ⛔ NOT RUN | D1 — no dispatch stage is reachable |

These seven tests are written and run unchanged once D1 is fixed (§4.3).

### 3.3 What scenario 10 does and does not prove

Scenario 10 unregisters the email provider from the real registry and asserts the
route still returns 200, the user is still created, no email reaches the adapter,
and the failure is logged with `purpose: registration` and the recipient address.

**Which stage failed is machine-checked, not asserted in prose.** The test reads
the `reason` the route's catch block recorded, classifies it (`/id.*is required/` or
`/Failed to create message/` → `persistence`; anything else → `provider`) and
asserts the stage matches the **observed** blocker state - not the
`DELIVERY_ENABLED` flag, which was the earlier defect corrected in R5:

* **committed state** (`blockerPresent = true`) → `Failed to create message` →
  `persistence` stage. So what is proven today is that the non-fatal wrapper
  survives a **persistence** failure.
* **after D1 is fixed** (`blockerPresent = false`) → `NO_PROVIDER_AVAILABLE`-style
  reason → `provider` stage.

The provider-stage path — the one the scenario's name describes — is therefore
**NOT proven by this run**. It is expected to behave identically (same wrapper,
same catch block), but expectation is not evidence, which is why the test asserts
the stage and fails if the world changes without the document changing.

---

## 4. Defect D1 — the templated send path cannot persist a message

**Severity: blocking.** Found by this suite. **Not fixed here** — see §4.4 for why,
and §4.3 for the proof that it is a one-line fix.

**Tracked reference (N5).** Pinned to a revision rather than left as prose:

| | |
|---|---|
| repository | `reactorynet/reactory-communicator` |
| revision | **`03da474`** (HEAD of that repo's `master` when this suite was written) |
| schema constraint | `src/modules/Message.ts:22-27` — `id: { type: String, required: true, unique: true, index: true }` |
| defect | `src/modules/MessageService.ts:68-72` — `createMessage()` spreads the caller's data and calls `messageModel.create()` without ever assigning `id` |
| observed error | `Message validation failed: CommunicatorMessage validation failed: id: Path `id` is required.` |

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

### 4.3 Forward verification — the fix is one line

The fix was applied **locally and then reverted** (nothing committed anywhere):

```diff
-      const messageData = { ...data };
+      const messageData = { ...data, id: (data as any).id || randomUUID() };
```

With that patch and `DELIVERY_ENABLED = true`:

| Run | Result |
|---|---|
| suite | **1 suite passed — 20 passed, 2 skipped, 22 total** |
| delivery assertions | all green against the provider adapter |

Observed subjects the provider adapter received in that run:

| Scenario | Subject the adapter received |
|---|---|
| 1 — reset default | `Follow the steps below to reset your password for Acceptance Application.` |
| 2 — registration default | `Welcome to Acceptance Application Ada, please confirm your account` |
| 3 — reset override | `Custom reset for Acceptance Application` |
| 4 — registration override | `Confirm your Acceptance Application account` |
| 6 — malformed setting | `Welcome to Acceptance Application Ada, please confirm your account` |
| 7 — activation from the delivered body | link extracted from the email body activated the account; repeat was idempotent |
| 10 — provider-stage failure | no email delivered; registration unaffected |

The two skipped tests in that run are the D1 guard, which skips itself when the
blocker is gone. Afterwards the communicator working tree was restored —
`git -C src/modules/reactory-communicator status --porcelain` → empty.

### 4.4 Why the fix is not in this commit

This is a worktree limitation, as the review correctly identified — but not one
that can be worked around by ignoring it, and it is worth being precise about why:

1. **`src/modules/reactory-communicator` is a separate git repository.**
   `git remote -v` there reports `git@github.com:reactorynet/reactory-communicator.git`,
   and `git ls-files src/modules/reactory-communicator` in express-server returns
   **nothing** — express-server does not track the module at all (it is gitignored
   under `src/modules/*`). A commit made in that repository is not part of this
   branch, this PR, or this reviewable diff.
2. **Pushing is out of scope for this run**, and a communicator fix belongs in its
   own PR with its own review, exactly as #16 and #17 were.
3. **Committing `DELIVERY_ENABLED = true` against an unmerged cross-repo fix would
   commit a suite that is red for everyone.** In this worktree it would read
   20/2; on any clean checkout — CI included — the seven delivery tests would run
   against unfixed `MessageService` and fail. Trading an honest skip for a
   green-here-red-everywhere commit is precisely the anti-pattern this ticket
   exists to prevent.

So the reviewer's alternative branch is the correct one: **E5 is BLOCKED**, not
completed. Unblocking requires, in order:

1. communicator PR: `id: data.id || randomUUID()` in `MessageService.createMessage()`,
   plus a real-model test that does **not** mock `Message.create`;
2. this suite: `DELIVERY_ENABLED = true` — the D1 guard fails **first and alone**, with
   the instruction reproduced verbatim in §4.5;
3. re-run and republish §3.2 with observed rows.

---

### 4.5 The D1 guard — behaviour proven in both directions (R5)

An earlier revision of this document claimed the guard "fails and tells you to
flip DELIVERY_ENABLED". **That claim was false and is corrected here.** The guard
then checked `expect(failure).toBeDefined()` before its instructional branch, so
with the fix applied it failed with `Received: undefined`, and because
`resetStatus()` was derived from the flag rather than from observed reality,
`/forgot` tests also failed with misleading `500 vs 200` errors — 8 failures in
total, none of them instructive.

The guard now detects D1 **once** in `beforeAll`, by probing the production
`MessageService.createMessage()` against the real schema, and compares that
observed state with `DELIVERY_ENABLED`. `resetStatus()` and scenario 10's stage
expectation both derive from the observed state, not from the flag. On
disagreement the guard throws one instruction and is the **only** failing test.

Both states were re-run to prove it:

| State | Command outcome | Result |
|---|---|---|
| `DELIVERY_ENABLED = false` + D1 patched (fix landed, flag not flipped) | `Tests: 1 failed, 7 skipped, 14 passed, 22 total` | **one instructive failure**, exactly as documented |
| `DELIVERY_ENABLED = true` + D1 patched (coherent, unblocked) | `Test Suites: 1 passed` · `Tests: 2 skipped, 20 passed, 22 total` | all delivery assertions green |

The single failure in the first state reads, verbatim:

```
● D1 guard - the suite state is coherent › instructs when DELIVERY_ENABLED
  disagrees with the observed state, and diagnoses the blocker

  The message-persistence blocker (D1) is FIXED: MessageService.createMessage()
  now persists a message. Flip DELIVERY_ENABLED to true at the top of
  transactionalEmail.acceptance.test.ts so the seven delivery-layer tests run,
  then republish docs/verification/TRANSACTIONAL_EMAIL_MATRIX.md section 3.2 with
  the observed rows.
```

The reverse disagreement is covered too: `DELIVERY_ENABLED = true` with D1 still
present throws a different instruction telling the operator to land the
communicator PR or set the flag back to `false`. Both directions are asserted
against the observed state, so neither can be satisfied by editing the flag alone.

> Before the correction, the first state produced `8 failed, 7 skipped, 7 passed`:
> the guard failed on `Received: undefined` and seven other tests failed on
> `Expected: 500, Received: 200`. That reproduction is why this section exists.

---

## 5. Negative controls

Both controls run against the **committed tree** (unpatched `MessageService`), then
reverted and verified byte-identical to the pre-control file.

### 5.1 Scenario 3 — remove the override feature

Change (local, reverted): in `communicator/services/emailTemplates/resolveEmailTemplate.ts`,
`if (configuredReference) {` → `if (false && configuredReference) {`, i.e. tier 1
of the resolver (the application setting) is removed.

Observed: **`Tests: 4 failed, 7 skipped, 11 passed, 22 total`**

| Test | Result |
|---|---|
| scenario 3 — uses the custom template | ❌ FAIL |
| scenario 4 — uses the custom template | ❌ FAIL |
| scenario 5 — reset: missing-template override fails loudly | ❌ FAIL (the setting is no longer read) |
| scenario 5 — registration: missing-template override fails loudly | ❌ FAIL |
| scenarios 1, 2, 6, 7, 8, 9, 10 | ✅ still pass |
| the 7 delivery tests | ○ skipped, as in the committed state |

Concrete failure:

```
● scenario 3 › uses the custom template, not the default
  Expected: "acceptance-reset-email"
  Received: "forgot-password-email"
```

Reverted: `git -C src/modules/reactory-communicator checkout -- services/emailTemplates/resolveEmailTemplate.ts`
→ `git status --porcelain` empty.

> With D1 also patched (so the delivery tests execute) the same control fails
> **6** tests instead of 4 — the two extra being scenario 3's and 4's delivery
> assertions — confirming the delivery rows are not vacuous either. That run is
> recorded in §4.3's companion notes.

### 5.2 Scenario 10 — make the send failure fatal

Change (local, reverted): `POST /register` in
`src/modules/reactory-core/routes/useraccount/UserAccount.ts` loses the nested
`try/catch` around `sendRegistrationActivationEmail(...)`, so the failure escapes
to the outer handler.

Observed: **`Tests: 5 failed, 7 skipped, 10 passed, 22 total`**

| Test | Result |
|---|---|
| scenario 10 — a send failure during registration is non-fatal | ❌ FAIL |
| scenario 2 — registration template + JWT | ❌ FAIL (registration now 500s) |
| scenario 4 — registration override | ❌ FAIL |
| scenario 5 — registration half | ❌ FAIL |
| scenario 7 — activation round trip | ❌ FAIL (no registration → no token) |
| everything else | ✅ still pass |

Concrete failure:

```
● scenario 10 › still creates the user, still returns 200, and logs the failure
  Expected: 200
  Received: 500
```

Reverted: `git checkout -- src/modules/reactory-core/routes/useraccount/UserAccount.ts`,
then `diff` against the pre-control copy → identical.

**Why this matters:** removing the feature fails the scenarios that depend on it,
and the failures name the missing behaviour. Neither control leaves the suite
green.

---

## 6. Already covered vs newly written

| Behaviour | Existing evidence | This ticket |
|---|---|---|
| `/forgot` names the purpose, carries the client scope, passes the resolved document id, subject precedence, non-enumeration, token lifetime, link normalisation | `UserAccount.forgot.test.ts` (18 tests) — **all with a fake resolver, fake TemplateService and fake CommunicatorService** | re-proven against the real resolver, real seeded templates and real renderer |
| Activation token mint/inspect/expiry/scope, `activateUser` idempotency, redirects | `UserAccount.activation.test.ts` (48 tests) + `UserService.activateUser.test.ts` (5) | round trip re-proven through the real route with a token produced by the real registration flow |
| Seeded templates render (subject/body elements, `$ref://` bodies, localisation) | communicator `TemplateService` suite + E4's seeded-render test | re-proven through `CommunicatorService.renderTemplate` with the route's own payload |
| **Cross-cutting**: one template system driving both flows, the same override mechanism for both purposes, the fallback chain, the distinct failure modes, dispatch to the provider boundary | none | **new** — all 10 scenarios (delivery rows written, NOT RUN) |

No weaker duplicate was written: where an existing test already covers a behaviour,
this suite asserts the *cross-cutting* property (same resolver, same renderer, same
dispatch path) instead of repeating the unit-level assertion.

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

### Final committed-state counts — 2026-11-03, node v20.19.4

| Run | Command config | Count |
|---|---|---|
| This suite | `jest.integration.config.ts` | **1 suite passed — 15 passed, 7 skipped, 22 total** |
| Existing useraccount baseline | `jest.config.ts` (unit) | **2 suites passed — 66 passed, 66 total** (`UserAccount.forgot` 18 + `UserAccount.activation` 48) |
| Forward verification, coherent (D1 patched + `DELIVERY_ENABLED = true`, both reverted) | `jest.integration.config.ts` | **1 suite passed — 20 passed, 2 skipped, 22 total** |
| Guard verification, incoherent (D1 patched, flag left `false`, both reverted) | `jest.integration.config.ts` | **1 failed, 7 skipped, 14 passed, 22 total** — the single failure is the D1 guard instruction (§4.5) |

The new suite is **not selected** by the unit config, so the 66-test baseline is
unchanged by construction as well as by measurement.

The database is created, seeded and cleaned by the suite: it drops and recreates the
disposable database at start, and `teardown()` deletes only the rows it wrote
(messages by `partnerId`, templates by `client`, users by the acceptance email
domain, and its own `ReactoryClient`). It refuses to run with
`NODE_ENV=production`.

---

## 8. Caveats and open items

1. **D1 blocks the delivery layer** (§4). This is the whole of the blocker.
2. **Scenario 10 proves the non-fatal wrapper for a persistence failure today**, not
   for a provider failure; the test asserts which stage it observed and will fail
   when the stage changes without this document changing (§3.3).
3. **`/forgot` currently distinguishes known from unknown addresses** by HTTP status
   (500 vs 200) because of D1 — the opposite of the route's design intent. It
   resolves with D1.
4. **Subject localisation depends on `APP_DATA_ROOT`.** The seeded subject elements
   are `<%= t('emails.forgotPassword.subject', …) %>`. With the real i18n bundles the
   subject is the English sentence above; with no bundle the translator's documented
   key-echo fallback yields the key name. The suite therefore asserts properties that
   hold in both worlds (non-empty, not the route literal, the override's literal
   subject for custom templates) rather than pinning one bundle's text. Rows above are
   from a run with the bundles present.
5. **One incidental flake observed once, not reproduced.** The first run of the two
   existing useraccount suites in this worktree reported `1 failed, 65 passed`; four
   subsequent runs (worktree and master) reported `66 passed`. That suite compares
   real clocks (`POST /forgot - reset token lifetime`). Nothing here is imported by
   those suites.
6. **`Message` rows cannot be asserted for delivery** while D1 exists; the delivery
   tests assert against the provider adapter, which is what "delivered" means at this
   boundary.

---

## 9. Changes in this revision (review response)

Revision 3 addresses the two precision defects the reviewer found in the evidence
artefacts, plus the three non-blocking notes requested in the same pass.

| Item | Change |
|---|---|
| **R5** — the guard must emit the documented instruction, or the promise must be withdrawn | The claim was **false**, so the code was fixed rather than the sentence. D1 is now detected once in `beforeAll` by probing the production `createMessage()`, and the guard compares that **observed** state with `DELIVERY_ENABLED`. `resetStatus()` and scenario 10's stage expectation derive from the observed state instead of the flag. Result: `DELIVERY_ENABLED = false` + D1 patched → **1 failed, 7 skipped, 14 passed** (one instructive failure, reproduced verbatim in §4.5); `DELIVERY_ENABLED = true` + D1 patched → **20 passed, 2 skipped**. Both re-run; the pre-fix behaviour (`8 failed, 7 skipped, 7 passed`) is recorded in §4.5 as the reason for the change. |
| **R6** — §1 must not claim 10/10 rendered | §1 now states the render gate passed for **the five scenarios that render** (1, 2, 3, 4, 6 — 7 executed rows) and a new row lists 5a/5b/7/8/9/10 as **behaviour assertions, not rendered content**, pointing at the `n/a` / "resolution failed before render" values in §3.1. §1 and §3.1 now agree row for row. |
| **N5** — cite a tracked reference for D1 | §4 and the suite header now pin the defect to `reactorynet/reactory-communicator` @ **`03da474`**, with the schema path (`Message.ts:22-27`), the offending method (`MessageService.ts:68-72`) and the observed message. |
| **N6** — disclose the in-memory transport and workflow persistence | §2 gained two rows: the queue **transport** is `InMemoryQueueService` (the queue service and worker above it are real) and workflow **persistence** is `MemoryPersistenceProvider` (the engine and `SendMessageWorkflow` are real). A paragraph after the table states exactly what that does and does not prove. |
| **N7** — "a empty string setting" | The `it.each` label is now `'falls back to the default for a setting of %s'`, so the three cases read "…for a setting of empty string / null / empty object". |

**Status is unchanged: BLOCKED.** The delivery criterion remains unmet until D1 is
fixed upstream and `DELIVERY_ENABLED` is flipped. Nothing in this revision makes
the templating half stand in for the delivery half.
