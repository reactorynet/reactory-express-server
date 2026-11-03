# Transactional email — acceptance matrix (E5)

**Ticket:** REACTORY-302016408/20261103/1766701674 — E5 acceptance test: templated registration and password reset, per-application override and fallback
**Umbrella:** `workspace/notes/templated-email-registration-reset-plan.md` (§5, §6 — E6)
**Date:** 2026-11-03
**Status:** ⛔ **BLOCKED — not done.** One upstream defect (D1) prevents the delivery layer of all ten scenarios from executing. The harness is complete and the templating half is proven; the ticket's first acceptance criterion ("all 10 scenarios implemented and passing with real collaborators") is **not met**.

> A row is only `PASS` if an **executed** test produced it, and every `PASS` row
> states the HTTP status the test actually observed. Rows marked **NOT RUN** are
> gates that could not be attempted — they must never be read as green.
>
> This revision responds to review. The changes are listed in §9.

---

## 1. Gate summary

| Gate | What it proves | Status |
|---|---|---|
| Template + render layer | For each of the 10 scenarios, the real route resolved the intended template for the named purpose and the production renderer produced a **non-empty subject, html and text** with the expected value interpolated (`resetLink` / `activationLink`). | ✅ PASS — 13 executed rows, 10/10 scenarios |
| Override honoured | The application's `email_template_password_reset` / `email_template_registration` setting selects a custom template for **both** purposes, and the default is not used. | ✅ PASS |
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
| Audit sink (`ReactoryAuditService`) | **no-op recorder** — a PostgreSQL writer; this suite is Mongo-only, nothing under test reads it back, and `CommunicatorService.recordAudit()` already treats a failed audit write as non-fatal |

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
the `reason` the route's catch block recorded and asserts it matches the stage
expected for the current world:

* **committed state** → `Failed to create message` → `persistence` stage. So what
  is proven today is that the non-fatal wrapper survives a **persistence**
  failure.
* **after D1 is fixed** → `NO_PROVIDER_AVAILABLE`-style reason → `provider` stage.

The provider-stage path — the one the scenario's name describes — is therefore
**NOT proven by this run**. It is expected to behave identically (same wrapper,
same catch block), but expectation is not evidence, which is why the test asserts
the stage and fails if the world changes without the document changing.

---

## 4. Defect D1 — the templated send path cannot persist a message

**Severity: blocking.** Found by this suite. **Not fixed here** — see §4.4 for why,
and §4.3 for the proof that it is a one-line fix.

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
2. this suite: `DELIVERY_ENABLED = true` — the guard test fails first and says so;
3. re-run and republish §3.2 with observed rows.

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
| Forward verification (D1 patched locally, reverted) | `jest.integration.config.ts` | **1 suite passed — 20 passed, 2 skipped, 22 total** |

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

| Review item | Change |
|---|---|
| R1 — land the fix and flip the flag, **or** mark BLOCKED | **BLOCKED**, with the reason recorded in §4.4: the fix belongs to a separate repository that express-server does not track, and committing `DELIVERY_ENABLED = true` against an unmerged cross-repo change would commit a suite that is red on every clean checkout. §4.3 carries the forward-verification evidence that the fix works. |
| R2 — remove the unsupported `PASS` row for scenario 6 registration; add observed HTTP per row | Scenario 6 registration removed from §3.1 and present only as `NOT RUN` in §3.2. Every executed row now carries the HTTP status read from the response object at runtime; the evidence table in the suite has an `HTTP observed` column so the matrix cannot drift from the assertions. |
| R3 — qualify scenario 10 | §3.3 added. The test now derives the failure stage from the logged `reason` and asserts `persistence` while D1 exists, `provider` after. The row and the suite's note both say which stage was observed. |
| R4 — final committed-state counts, plus the unchanged baseline | §7 table: suite **15/7/22**, baseline **66/66**, forward verification **20/2/22**. |
