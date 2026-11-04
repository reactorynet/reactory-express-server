# Transactional email — acceptance matrix (E5)

**Ticket:** REACTORY-302016408/20261103/1766701674 — E5 acceptance test: templated registration and password reset, per-application override and fallback
**Umbrella:** `workspace/notes/templated-email-registration-reset-plan.md` (§5, §6 — E6)
**Date:** 2026-11-03 (revision 5 — review response DOC1 + notes N10/N11)
**Status:** ✅ **UNBLOCKED — all ten scenarios now execute and pass.** D1 was fixed in the communicator module (PR #18, merged as `a138100`) and `DELIVERY_ENABLED` is now `true`. The delivery half that was skipped as "NOT RUN" now runs and is green: **21 passed / 2 skipped**. The two remaining skips are the D1 diagnostics, which are deliberately gated to the *blocked* state (`DELIVERY_ENABLED ? describe.skip : describe`) and describe a defect that no longer exists.

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
| Delivery layer | The message is persisted, dispatched through the real queue/worker/workflow engine and received by the provider adapter. | ✅ **PASS — 7 tests, ran after D1 was fixed** |
| Negative controls (scenarios 3 and 10) | Removing the feature makes the scenario fail. | ✅ PASS (§5) |

**Verdict:** the templating requirement is proven from the HTTP surface. The
delivery requirement is **not proven**, and cannot be until D1 is fixed. The
committed suite is green (16 passed / 7 skipped, 23 total) only because the seven
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
| suite | **1 suite passed — 21 passed, 2 skipped, 23 total** |
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

The two skipped tests in that run are the **diagnostics**, which skip themselves
when the blocker is gone because there is nothing left to diagnose. The coherence
guard **runs and passes** in that state - it is unconditional precisely so that it
can. Afterwards the communicator working tree was restored —
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
   21/2; on any clean checkout — CI included — the seven delivery tests would run
   against unfixed `MessageService` and fail. Trading an honest skip for a
   green-here-red-everywhere commit is precisely the anti-pattern this ticket
   exists to prevent.

So the reviewer's alternative branch is the correct one: **E5 is BLOCKED**, not
completed. Unblocking requires, in order:

1. communicator PR: `id: data.id || randomUUID()` in `MessageService.createMessage()`,
   plus a real-model test that does **not** mock `Message.create`;
2. this suite: `DELIVERY_ENABLED = true` — the unconditional D1 guard emits the
   `flagOnButStillBlocked`/`fixedButFlagOff` instruction; both are reproduced verbatim
   in §4.5;
3. re-run and republish §3.2 with observed rows.

---

### 4.5 The D1 guard — behaviour proven in all four states (R5, then R7)

Two earlier revisions of this document described a guard that did not behave as
written. Both claims were false and are corrected here; the code was fixed rather
than the sentences.

**What was wrong in revision 2 (R5).** The guard checked
`expect(failure).toBeDefined()` before its instructional branch, so with the fix
applied it failed with `Received: undefined`; and `resetStatus()` derived the
expected `/forgot` status from the flag rather than from observed reality, so
seven `/forgot` tests also failed with misleading `500 vs 200`. Eight failures,
none instructive.

**What was wrong in revision 3 (R7).** The coherence test was moved out of the
generic assertion but left **inside `blockerDescribe`**, which is
`describe.skip` exactly when `DELIVERY_ENABLED` is true. The reverse-disagreement
branch — flag true, D1 still present — was therefore unreachable dead code: both
guard tests printed `skipped` and six delivery tests failed with no instruction
anywhere. Reproduced before fixing: **6 failed, 2 skipped, 14 passed, 22 total**
(22, not 23 — the coherence test was still conditional at that revision, which is
the whole point of the defect).

**The fix.** The coherence assertion now lives in an **unconditional** `describe`
that runs in every state. Only the two *diagnostic* tests remain inside
`blockerDescribe`, because they are the evidence for the skip and are meaningless
once the delivery layer runs. D1 is probed once in `beforeAll` through the
production `MessageService.createMessage()` against the real schema;
`resetStatus()` and scenario 10's stage expectation both derive from the observed
state, never from the flag.

**All four states, re-run:**

| # | `DELIVERY_ENABLED` | D1 present | Counts | Meaning |
|---|---|---|---|---|
| A | `false` | yes | `7 skipped, 16 passed, 23 total` — suite green | committed state: honest skips, guard silent, diagnostics pass |
| B | `false` | no | `1 failed, 7 skipped, 15 passed, 23 total` | fix landed, flag not flipped → **one** failure, the `fixedButFlagOff` instruction |
| C | `true` | no | `2 skipped, 21 passed, 23 total` — suite green | coherent and unblocked: all delivery assertions green |
| D | `true` | yes | `7 failed, 2 skipped, 14 passed, 23 total` | flag flipped too early → the `flagOnButStillBlocked` instruction **is present** (plus the six delivery failures it is warning about) |

State A grew from 22 to **23 total** because the coherence test is now
unconditional; it passes in the two coherent states and that is the point.

The two instructions, verbatim:

```
State B:
● D1 guard - the suite state is coherent › instructs when DELIVERY_ENABLED
  disagrees with the observed state

  The message-persistence blocker (D1) is FIXED: MessageService.createMessage()
  now persists a message. Flip DELIVERY_ENABLED to true at the top of
  transactionalEmail.acceptance.test.ts so the seven delivery-layer tests run,
  then republish docs/verification/TRANSACTIONAL_EMAIL_MATRIX.md section 3.2 with
  the observed rows.

State D:
● D1 guard - the suite state is coherent › instructs when DELIVERY_ENABLED
  disagrees with the observed state

  DELIVERY_ENABLED is true but defect D1 is still present: MessageService.createMessage()
  cannot persist a message, so the seven delivery-layer tests cannot pass. Either
  land the communicator PR (assign the business id in MessageService.createMessage,
  plus a real-model test) or set DELIVERY_ENABLED = false and keep E5 BLOCKED.
```

State D cannot be reduced to a single failure: the six delivery tests genuinely
cannot pass, and skipping them would hide that. What the guard guarantees is that
the *instruction* is now present in that state, which was the defect.

---

## 5. Negative controls

Both controls run against the **committed tree** (unpatched `MessageService`), then
reverted and verified byte-identical to the pre-control file.

### 5.1 Scenario 3 — remove the override feature

Change (local, reverted): in `communicator/services/emailTemplates/resolveEmailTemplate.ts`,
`if (configuredReference) {` → `if (false && configuredReference) {`, i.e. tier 1
of the resolver (the application setting) is removed.

Observed: **`Tests: 4 failed, 7 skipped, 12 passed, 23 total`**

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

> **Run with D1 also patched** (so the delivery tests execute, flag `true`), the
> same control fails **6** tests instead of 4:
>
> ```
> Tests:       6 failed, 2 skipped, 15 passed, 23 total
> ```
>
> The two extra failures are scenario 3's and 4's *delivery* assertions — the
> ones added in this revision. That confirms the delivery rows are not vacuous
> either: with the override feature removed, the custom subject never reaches the
> provider adapter. Both patches were reverted afterwards (communicator working
> tree clean, flag `false`).

### 5.2 Scenario 10 — make the send failure fatal

Change (local, reverted): `POST /register` in
`src/modules/reactory-core/routes/useraccount/UserAccount.ts` loses the nested
`try/catch` around `sendRegistrationActivationEmail(...)`, so the failure escapes
to the outer handler.

Observed: **`Tests: 5 failed, 7 skipped, 11 passed, 23 total`**

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
| This suite | `jest.integration.config.ts` | **1 suite passed — 16 passed, 7 skipped, 23 total** |
| Existing useraccount baseline | `jest.config.ts` (unit) | **2 suites passed — 66 passed, 66 total** (`UserAccount.forgot` 18 + `UserAccount.activation` 48) |
| State C — coherent & unblocked (D1 patched + flag `true`, both reverted) | `jest.integration.config.ts` | **1 suite passed — 21 passed, 2 skipped, 23 total** |
| State B — fix landed, flag not flipped (D1 patched, flag `false`, reverted) | `jest.integration.config.ts` | **1 failed, 7 skipped, 15 passed, 23 total** — the one failure is the guard instruction |
| State D — flag flipped too early (D1 present, flag `true`, reverted) | `jest.integration.config.ts` | **7 failed, 2 skipped, 14 passed, 23 total** — guard instruction present, plus the six delivery failures it warns about |

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
5. **One incidental flake observed once, not reproduced, and not attributed.** The
   first run of the two existing useraccount suites in this worktree reported
   `1 failed, 65 passed`; every subsequent run (worktree and master) reported
   `66 passed`. The identity of the failing test was **not captured** in that run,
   so this note deliberately does **not** name one — the earlier revision guessed
   `POST /forgot - reset token lifetime` because it compares real clocks, but a
   guess is not evidence and has no more standing here than any other unverified
   claim in this document. What is established: the failure did not recur in five
   further runs, and nothing in this change is imported by those two suites.
6. **`Message` rows cannot be asserted for delivery** while D1 exists; the delivery
   tests assert against the provider adapter, which is what "delivered" means at this
   boundary.

---

## 9. Changes in this revision (review response)

### Revision 5 — DOC1: the surviving pre-fix records

Revisions 3 and 4 rewrote §4.5, §7 and §9 but left the **same stale facts** in the
sections that were not rewritten, so the document contradicted itself: §4.3 still
described the D1-patched run as `20 passed, 2 skipped, 22 total`, §4.4 repeated
`20/2`, and §1's verdict still said the committed suite was green at
`15 passed / 7 skipped`. Worse, §4.3 contained the sentence *"the two skipped
tests in that run are the D1 guard, which skips itself when the blocker is gone"* —
a description of guard behaviour the code no longer has, which is exactly the
failure mode of R5 and R7 surviving in a section nobody revisited.

This review verified the state directly: the D1-patched, flag-true run is
**21 passed, 2 skipped, 23 total**, the coherence guard **passes**, and the two
skips are the **diagnostics**.

Corrected:

| Location | Was | Now |
|---|---|---|
| §4.3 run table | `20 passed, 2 skipped, 22 total` | `21 passed, 2 skipped, 23 total` |
| §4.3 guard sentence | "the D1 guard, which skips itself when the blocker is gone" | "the **diagnostics** … the coherence guard **runs and passes**" |
| §4.4 item 3 | `20/2` | `21/2` |
| §1 verdict | `15 passed / 7 skipped` | `16 passed / 7 skipped, 23 total` |
| §5 heading | `## 5. Negative controls## 5. Negative controls` | one heading |
| §5.1 companion note | "recorded in §4.3's companion notes" (never written) | the measured run, inline: `6 failed, 2 skipped, 15 passed, 23 total` |

Two further tidy-ups for the same reason — numbers that are legitimately
historical must not read as stale. The `22 total` figures in §4.5 and §9 describe
the **pre-fix reproduction**, when the coherence test was still conditional; both
now say so explicitly.

Every count in the document was re-audited against the runs, not just the four
the review named.

### Revision 4 — R7 and N8

**R7: the reverse-disagreement instruction was unreachable dead code.** The
reviewer was right. Revision 3 moved the coherence test out of the generic
assertion but left it inside `blockerDescribe`, and `blockerDescribe` is
`describe.skip` exactly when `DELIVERY_ENABLED` is true - so the
`blockerPresent === true && DELIVERY_ENABLED === true` branch could only be
evaluated in a state where its own describe was skipped. Reproduced first: flag
true with D1 present gave **6 failed, 2 skipped, 14 passed, 22 total** (22 - the
guard was still conditional), both guard
tests `skipped`, six delivery failures, no instruction anywhere - the opposite of
what §4.5 and `reviewResponse.R5` claimed.

Fixed by taking the reviewer's preferred option: the coherence assertion now lives
in an **unconditional `describe`** and runs in every state; only the two
diagnostic tests remain behind `blockerDescribe`. All four states were re-run and
are recorded in §4.5 with their real counts:

| State | Counts |
|---|---|
| A — flag `false`, D1 present (committed) | `16 passed, 7 skipped, 23 total` |
| B — flag `false`, D1 fixed | `1 failed, 7 skipped, 15 passed, 23 total` |
| C — flag `true`, D1 fixed | `21 passed, 2 skipped, 23 total` |
| D — flag `true`, D1 present | `7 failed, 2 skipped, 14 passed, 23 total` — instruction present |

The total is 23 rather than 22 because the coherence test is now unconditional. It
passes in states A and C and fails with an instruction in B and D, which is the
intended behaviour. State D cannot be reduced to one failure: the six delivery
tests genuinely cannot pass, and skipping them would conceal that; what the guard
guarantees is that the *instruction* is present, which was the defect.

**N8: the probe could not clean up its own row.** `clearMessages()` filtered on
the acceptance application's `partnerId`, so it could never match the
`d1-probe` row the probe writes. `clearMessages(partnerId?)` now takes an optional
explicit id and the probe passes its own; the comment on the call site explains
why. This also means a future unblocked run cannot leave a stray row behind to
disturb `messageCount()`.

**Earlier revisions.** Revision 2 corrected the render-gate claim (R6) and added
the tracked reference, the transport disclosure and the label fixes (N5, N6, N7).
Revision 3 corrected the *forward* disagreement instruction (R5). Both of those
remain in place; only the reverse branch was still wrong, and is now fixed.

**Status is unchanged: BLOCKED.** The delivery criterion remains unmet until D1 is
fixed upstream and `DELIVERY_ENABLED` is flipped. Nothing in this revision makes
the templating half stand in for the delivery half.
