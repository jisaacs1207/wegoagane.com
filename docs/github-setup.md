# GitHub setup — follow along (granular)

Use this page **in order**. **Step 2 is not the finish line** — after green CI on `main`, you still do **Steps 3 → 6** (ruleset, day-to-day habits, then Cloudflare when the app exists).

Do **not** skip **Step 2** before **Step 4**, or the “required status check” list will be empty when you create the ruleset.

Official GitHub docs (same UI we describe): [Creating rulesets for a repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository).

---

## All steps at a glance (check off as you go)

| Step | What it’s for | You are done when… |
|------|----------------|---------------------|
| **Before** | Access | You’re logged in and Admin on the repo. |
| **1** | Local Git ↔ GitHub | `origin` exists and `main` is on GitHub. |
| **2** | Unlock status checks | Latest **CI** on **`main`** is green (**Handbook layout**). |
| **3** | Avoid double rules | You checked **Settings → Branches** (or branch rules) and removed duplicate protection on `main` if needed. |
| **4** | Protect `main` | Ruleset **`wegoagane-main-ci`** exists, **Active**, required check added, **4.9** test done. |
| **5** | How you work daily | You know Profile A vs B behavior for pushes/PRs. |
| **6** | Public `.com` site | (Later) Cloudflare Pages connected when `dist/` (or similar) exists. |

---

## Before you start (30 seconds)

- [ ] You are logged into GitHub in the browser.
- [ ] You can open **your** `wegoagane.com` repository (not someone else’s fork).
- [ ] You have **Admin** on that repo (you own it → yes).

---

## Step 1: Git on your machine + `origin`

**Goal:** local repo is clean and `origin` points at GitHub.

1. Open a terminal.
2. Go to the project (adjust if your path differs):

   ```bash
   cd ~/Developer/wegoagane.com
   ```

3. Run:

   ```bash
   git status
   git remote -v
   ```

4. **If you see `origin` with your GitHub URL** → Step 1 done. Skip to Step 2.

5. **If there is no `origin`**, add it (replace `YOUR_USER`):

   ```bash
   git remote add origin https://github.com/YOUR_USER/wegoagane.com.git
   git push -u origin main
   ```

6. **If `git push` fails**, fix auth (HTTPS token or SSH key) using GitHub’s current docs, then push again. Do not continue until `main` exists on GitHub.

**Checkpoint:** [ ] `git remote -v` shows `origin` → `github.com/.../wegoagane.com.git`

---

## Step 2: One green CI run on `main` (required before Step 4)

**Goal:** GitHub has seen a successful check on **`main`**, so Step 4 can **require** that check by name.

1. On GitHub, open your repo.
2. Click the **Actions** tab (top nav).
3. Click **CI** in the left list (workflow name from [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — the file says `name: CI`).
4. Open the **most recent** run that ran for **`main`** (not only a PR). The commit message line should be on `main`.
5. Confirm the job named **Handbook layout** is **green**.

**If there is no run on `main` yet:**

```bash
cd ~/Developer/wegoagane.com
git checkout main
git pull origin main
# optional tiny change:
echo "" >> docs/handoff/STATUS.md
git add docs/handoff/STATUS.md
git commit -m "chore: trigger CI on main"
git push origin main
```

Then refresh **Actions** until a green **Handbook layout** appears on a `main` run.

**Checkpoint:** [ ] Latest **CI** run on **`main`** shows **Handbook layout** = success.

**About “Node.js 20 actions are deprecated” annotations:** that comes from older `actions/checkout@v4` (and similar) running on Node 20. This repo’s workflow uses **`actions/checkout@v5`** plus **`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`** so hosted runners use the Node 24 path GitHub is moving everyone to. After you pull the latest `main` and push, new runs should stop flagging checkout for Node 20. If GitHub still shows a warning for another action later, bump that action’s major version in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

**Write down the exact check label** (you will paste or match it in Step 4):

1. Stay on that successful workflow run page.
2. Look at the **job** title in the left column or the graph — it should read **`Handbook layout`** (that comes from `jobs.handbook.name` in the YAML).
3. On a **pull request**, the same thing often appears in the checks area as **`Handbook layout`** or prefixed with the workflow name (e.g. **`CI / Handbook layout`**). **Use the exact string GitHub shows** when you add the required check in Step 4.

> **Step 2 is complete — keep going.** Scroll down to **Step 3**, then **Step 4** (the big one), **Step 5**, and **Step 6** (Step 6 only after you have a built SPA).

---

## Step 3: Avoid duplicate branch rules (1 minute)

**Goal:** You do **not** stack **classic branch protection** and **rulesets** on `main` unless you intend to (GitHub applies the **stricter** of both, which is confusing).

1. Repo → **Settings** → **Code and automation** → **Branches** (or **Rules** → **Branch rules** — GitHub sometimes moves this).
2. Look for a **branch protection rule** that targets **`main`** (or “default branch”).
3. **If you see none** → nothing to remove. Prefer completing **Step 4** (rulesets only).
4. **If you see one and you are about to add `wegoagane-main-ci` in Step 4** → either **delete** the classic rule so only the ruleset remains, or **skip Step 4** and keep only classic (not recommended for this guide).

**Checkpoint:** [ ] `main` is not protected twice (classic + ruleset) unless you did that on purpose.

**Next:** → **Step 4** below.

---

## Step 4: Create the branch ruleset (click-by-click)

**Goal:** `main` is protected in a predictable way, and **CI must pass** before updates land on `main`.

### 4.1 Open the ruleset creator

1. Repo page → **Settings** (top bar of the repo, not your global GitHub settings).
2. Left sidebar → **Code and automation** → **Rules**.
3. Click **Rulesets** (sub-item under **Rules**).
4. Green button **New ruleset** → click **New branch ruleset** (not “New tag ruleset”, not “New push ruleset” for this guide).

**Checkpoint:** [ ] You see a blank **branch ruleset** form (name field at top).

---

### 4.2 Ruleset name (copy this)

In **Ruleset name**, type **exactly** (lowercase, hyphens, no spaces):

```text
wegoagane-main-ci
```

That name is arbitrary but **stable** — you will recognize it in the list later. You can use `protect-main` instead if you prefer; only consistency matters.

**Checkpoint:** [ ] Name field = `wegoagane-main-ci`

---

### 4.3 Enforcement status

Find **Enforcement status** (sometimes shown as a dropdown near the top).

- **First time / you want it live immediately:** choose **Active**.
- **If you only want to draft the rules without enforcing yet:** choose **Disabled**, click **Create** at the bottom, then later edit the ruleset and switch to **Active**.

**Recommended:** **Active** once you are sure Step 2 is green.

**Checkpoint:** [ ] Enforcement = **Active** (or **Disabled** on purpose).

---

### 4.4 Bypass list (solo default)

Section **Bypass list** lets some actors skip rules.

**Recommended for solo:** leave **Bypass list empty** for now. You remain **admin** of the repo; if you ever lock yourself out, you can edit the ruleset as admin or temporarily set enforcement to **Disabled**.

Optional later: **Add bypass** → your user → **For pull requests only** if you want a paper trail but still merge your own PRs when checks fail (rare).

**Checkpoint:** [ ] Bypass list is empty **or** you deliberately added one bypass.

---

### 4.5 Target branches (only `main`)

Under **Target branches**:

1. Click **Add target** (or **Add inclusion** / similar wording).
2. Choose **Include by pattern** (not “exclude”).
3. In the pattern box, type **exactly**:

   ```text
   main
   ```

   Use this **only** if your default branch is named `main`. If your default is `master`, type `master` instead and keep everything else the same.

**Do not** use a wildcard like `*` for this guide — that would target every branch.

**Checkpoint:** [ ] One inclusion: pattern **`main`** (or **`master`** if that is your default).

---

### 4.6 Branch protections — pick **Profile A** or **Profile B**

Expand **Branch protections** (sometimes you must click the section header to see toggles).

Below are two **complete** profiles. Pick **one** and set toggles exactly as written.

#### Profile A — **Solo, push to `main`, CI must pass** (recommended for you now)

| Toggle / rule | Setting |
|----------------|---------|
| **Restrict deletions** | **On** |
| **Restrict updates** | **Off** (you need to push to `main`) |
| **Block force pushes** | **On** |
| **Require a pull request before merging** | **Off** (you push from laptop without a PR) |
| **Require status checks to pass before merging** | **On** |
| **Require linear history** | **Off** (unless you know you want it) |
| **Require signed commits** | **Off** (unless you already sign every commit) |

Then continue with **4.7** (status checks).

#### Profile B — **Everything through PRs** (stricter habit)

| Toggle / rule | Setting |
|----------------|---------|
| **Restrict deletions** | **On** |
| **Block force pushes** | **On** |
| **Require a pull request before merging** | **On** (minimum approvals often **0** or **1** in sub-options — set **0** if you are truly solo and only want the PR shell) |
| **Require status checks to pass before merging** | **On** |
| **Require linear history** | **Off** unless you always squash-merge |

Then continue with **4.7**.

**Checkpoint:** [ ] Every row in **Profile A** or **Profile B** matches your repo.

---

### 4.7 Required status checks (the part that was “stuck”)

This only appears if you turned **Require status checks to pass before merging** **On**.

1. In the same **Branch protections** area, find **Status checks** / **Require status checks** subsection.
2. Click **Add checks**, **Add status check**, or **Search** (GitHub changes the label; you want the control that opens a searchable list).
3. In the search box, type: **`Handbook`**
4. Select the entry that matches your green run from Step 2 — usually **`Handbook layout`** or **`CI / Handbook layout`**.  
5. Confirm it appears in the **list of required checks** below (sometimes you must click a **+** or **Add** to confirm).

**Sub-option — “up to date before merging”:**

- Find **Require branches to be up to date before merging** (or wording like “Require branch to be up to date”).
- **Solo recommended:** **Off** (looser — fewer surprise rebuilds).
- Turn **On** only if you want strict “must merge latest `main` into PR before merge” behavior.

**Checkpoint:** [ ] At least **one** required check listed, matching a green job from Step 2.

---

### 4.8 Save

1. Scroll to the bottom.
2. Click **Create** (new ruleset) or **Save changes** (edit).

**Checkpoint:** [ ] Rulesets list shows **`wegoagane-main-ci`** with status **Active** (or **Disabled** if you chose that).

---

### 4.9a Push to `main` rejected (GH013 / “Handbook layout is expected”)

If you see:

```text
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: - Required status check "Handbook layout" is expected.
! [remote rejected] main -> main
```

that means you ran **`git push origin main`**. With **required status checks** on `main`, GitHub often **refuses to move `main`** until **Handbook layout** is already green on the commits you are pushing — so a **failing or brand-new** commit cannot reach `main` by direct push. That is expected; it is **not** the Step 4.9 test (4.9 never pushes a broken commit to `main`).

**Unblock your normal work (pick one):**

1. **Temporary (simplest):** GitHub → **Settings** → **Rules** → **Rulesets** → **`wegoagane-main-ci`** → **Edit** → set **Enforcement status** to **Disabled** → **Save** → `git push origin main` → wait for **Actions** to go green on `main` → turn the ruleset back to **Active**.
2. **Bypass (good for solo):** Edit the same ruleset → **Bypass list** → **Add bypass** → add **Repository admin** (or your user, if listed) → choose **Always allow** for pushes if GitHub offers it — so you can push `main` when needed; CI still runs and shows red/green.
3. **No direct pushes to `main`:** treat **`main` as merge-only**: always `git push origin my-branch` then open a **PR → `main`**; merge only when **Handbook layout** is green (same idea as Profile B).

After you can sync `main` again, do **4.9** below (push goes to **`chore/test-ruleset-ci`**, not `main`).

---

### 4.9 Prove it works (2-minute test, safe)

**Important:** the only `git push` in this test must be **`git push -u origin chore/test-ruleset-ci`**. Do **not** run `git push origin main` with the broken commit on it — that will hit GH013 (see **4.9a**).

Do **not** delete handbook files on `main` to test. Use a **throwaway branch + PR**:

```bash
cd ~/Developer/wegoagane.com
git checkout main
git pull origin main
# If pull fails because you have local commits you can't push, use 4.9a first or stash:
#   git stash push -m "wip"   then pull, then stash pop on a branch

git checkout -b chore/test-ruleset-ci
# break CI in a commit that only exists on this branch:
rm docs/handoff/README.md
git add -A
git commit -m "test: break CI on purpose (will not merge)"
git push -u origin chore/test-ruleset-ci
```

**Expected:** this push should **succeed** (ruleset targets **`main`**, not `chore/test-ruleset-ci`). If it still fails, paste the full `remote:` message — something else may be targeting all branches.

1. On GitHub → **Pull requests** → **New pull request**: base **`main`**, compare **`chore/test-ruleset-ci`**.
2. Create the PR.
3. Wait for **CI** / **Handbook layout** to run → it should turn **red**.
4. **Expected:** the **Merge** button stays **disabled** (or warns) until checks pass — that proves the ruleset is wired.
5. Close the PR **without merging**. Locally:

   ```bash
   git checkout main
   git branch -D chore/test-ruleset-ci
   git push origin --delete chore/test-ruleset-ci
   ```

**Profile A note:** many GitHub accounts now **block direct `git push` to `main`** when required checks are on, until those checks pass (GH013). Practically, **solo + required checks** usually means either **PRs into `main`** or a **ruleset bypass** for admins — see **4.9a**. The PR test in 4.9 is still the safest way to see red/green behavior without touching `main`’s tip with a bad commit.

**Checkpoint:** [ ] You saw a **red** required check block merge on a test PR, then cleaned up the branch.

**Next:** → **Step 5** below.

---

## Step 5: Day-to-day (after the ruleset exists)

> **Your choice:** you are on **Profile B** — every change to `main` goes through a **pull request**; you merge only when required checks (e.g. **Handbook layout**) are green.

### Profile B + new CI jobs (required checks list)

Whenever **`.github/workflows/ci.yml`** gains a **new job** with a new `name:` (for example **Lint** or **Typecheck**) and you want that job to **block merging to `main`** like **Handbook layout** does:

1. **Merge a PR first** that only adds the workflow (or run the job on a PR once) so GitHub has seen that check name at least once.
2. **Add the check to the ruleset** — same place as Step 4.7: **Settings → Rules → Rulesets → `wegoagane-main-ci` → Edit** → required status checks → add the **exact** job name from the PR checks UI.

**From Cursor / this assistant:** whenever we add such a job in this repo, we will end the change with an explicit line you can search for:

```text
RULESET: add required check `Exact Job Name`
```

That is your reminder to add that name in the GitHub UI **or** run the CLI helper below (we cannot edit your GitHub rules from here without your `gh` auth).

### Add a required check from the CLI (`gh`)

Requires [GitHub CLI](https://cli.github.com/) (`gh auth login` already done).

```bash
cd /path/to/wegoagane.com
python3 scripts/ruleset_add_required_check.py "Exact Job Name"
```

Optional: `RULESET_NAME=wegoagane-main-ci` (default) if you named the ruleset differently.

If the script errors, use the **UI** path in step 2 above — the API payload must match what GitHub already stored for your ruleset.

### Profile A vs Profile B — what that actually is

**It is a choice you already made in Step 4.6** when you flipped toggles on the ruleset. There is no separate “Profile mode” in GitHub — only those toggles (especially **Require a pull request before merging** and **Require status checks before merging**).

| Your Step 4.6 choice | Name in this guide | What it means day-to-day |
|------------------------|--------------------|---------------------------|
| **Require PR before merging = Off** + **Require status checks = On** | **Profile A** | You *intend* to push straight to `main` from your laptop. CI must pass for the branch to accept updates — **but** GitHub may **reject `git push origin main`** until **Handbook layout** is already green on the commits you are pushing (see **§4.9a** above — GH013). So “Profile A” in practice often means: **add a bypass for yourself as admin**, or **use a short-lived branch + PR to merge into `main`** whenever you hit that block — unless you temporarily **Disable** the ruleset for one push. |
| **Require PR before merging = On** + **Require status checks = On** | **Profile B** | Every change reaches `main` only through a **merged PR**. Checks run on the PR; **Merge** stays off until green (and until approvals if you set them). No surprise: GitHub and your mental model match. |

**If you want to “be Profile A”:** keep **Require PR = Off** (that is the Profile A ruleset shape). Accept that **direct pushes to `main` can be refused (GH013)** until checks exist for those commits — then use one of the **unblock** paths in **§4.9a** (bypass for admin, or PR that one change, or briefly Disable). Many solos end up **mostly** using small PRs into `main` even with “Profile A” toggles, because it avoids fighting the server.

**If you want the least friction with required checks:** switch the ruleset to **Profile B** (turn **Require a pull request before merging** **On**, approvals **0** if you like). Then you always: branch → push branch → PR → merge when green. No mystery pushes to `main`.

When you add **lint** or **test** jobs later, come back to **Settings → Rules → Rulesets → `wegoagane-main-ci` → Edit** and **add** those check names the same way you added **Handbook layout**.

**Checkpoint:** [ ] You know which Step **4.6** profile you configured, and you know what to do when **`main` push is rejected** (scroll up to **§4.9a**): bypass, PR, or temporary Disable.

**Next:** → **Step 6** when the front-end exists; until then you are **done** with GitHub setup for this milestone.

---

## Step 6: Live wegoagane.com (later, when there is a real build)

The app lives in **`apps/web`** and builds to **`apps/web/dist`**. Follow **[`docs/deploy-wegoagane-com.md`](../deploy-wegoagane-com.md)** for Cloudflare Pages (root `apps/web`, build `npm ci && npm run build`, output `dist`, custom domain **wegoagane.com**).

Until DNS + Pages are connected, **`npm run dev`** inside `apps/web` is the fastest way to click through flows locally.

---

## Quick links

| Topic | GitHub Docs |
|--------|-------------|
| Rulesets overview | [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) |
| Create / edit | [Creating rulesets for a repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository) |
| Rule reference | [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) |

---

## If you are still stuck

| Symptom | What to do |
|---------|------------|
| No checks in the search list | Complete **Step 2** again — a **green** workflow on **`main`** is mandatory first. |
| Check name unclear | Open **Actions** → green **CI** run on `main` → copy job title **Handbook layout** exactly. |
| Cannot create / push a new branch | Temporarily set ruleset **Enforcement** to **Disabled**, finish your first green `main` run, then set **Active** again; see [community thread](https://github.com/orgs/community/discussions/167194). |
| **`GH013` / `main -> main` / “Handbook layout is expected”** | You pushed **to `main`** before CI could pass. Use **§4.9a** (disable briefly, bypass, or PR-only). Step **4.9** only pushes **`chore/test-ruleset-ci`**, not `main`. |
| UI labels differ slightly | GitHub renames sidebars sometimes; you want **Settings → Rules → Rulesets → New branch ruleset**. |

---

*Last reviewed: repository **branch rulesets** under **Settings → Rules → Rulesets**.*
