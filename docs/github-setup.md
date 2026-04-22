# GitHub setup — follow along (granular)

Use this page **in order**. Do **not** skip **Step 2** before **Step 4**, or the “required status check” list will be empty and you will feel stuck.

Official GitHub docs (same UI we describe): [Creating rulesets for a repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository).

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

**Write down the exact check label** (you will paste or match it in Step 4):

1. Stay on that successful workflow run page.
2. Look at the **job** title in the left column or the graph — it should read **`Handbook layout`** (that comes from `jobs.handbook.name` in the YAML).
3. On a **pull request**, the same thing often appears in the checks area as **`Handbook layout`** or prefixed with the workflow name (e.g. **`CI / Handbook layout`**). **Use the exact string GitHub shows** when you add the required check in Step 4.

---

## Step 3: Ignore legacy “Branch protection” for now (optional read)

GitHub still has **Settings → Branches** (classic rules). You **do not** need it if you complete **Step 4** below.

Using **both** classic rules and **rulesets** on the same branch can confuse you (GitHub applies the **stricter** of the two). For this repo, prefer **only a branch ruleset** unless you already use classic rules for something else.

**Checkpoint:** [ ] I have not added duplicate rules on `main` unless I mean to.

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

### 4.9 Prove it works (2-minute test, safe)

Do **not** delete handbook files on `main` to test. Use a **throwaway branch + PR**:

```bash
cd ~/Developer/wegoagane.com
git checkout main
git pull origin main
git checkout -b chore/test-ruleset-ci
# break CI in a commit that only exists on this branch:
rm docs/handoff/README.md
git add -A
git commit -m "test: break CI on purpose (will not merge)"
git push -u origin chore/test-ruleset-ci
```

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

**Profile A note:** you normally push straight to `main`; the ruleset still applies to **merges** and to **required checks** on the default branch. The PR test above is the safest way to see red/green behavior without breaking `main`.

**Checkpoint:** [ ] You saw a **red** required check block merge on a test PR, then cleaned up the branch.

---

## Step 5: Day-to-day (after the ruleset exists)

- **Profile A:** `git push origin main` only works when **required checks pass** on the new commits (and you are not blocked by other toggles).
- **Profile B:** you always open a **PR → `main`**; the **Merge** button stays inactive until checks pass (and until approvals if you enabled them).

When you add **lint** or **test** jobs later, come back to **Settings → Rules → Rulesets → `wegoagane-main-ci` → Edit** and **add** those check names the same way you added **Handbook layout**.

---

## Step 6: Live wegoagane.com (later, when there is a real build)

When the Vite (or other) app exists and produces a folder like **`dist/`**:

1. Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Repo: this one. Production branch: **`main`**.
3. Build command / output dir: per [handbook §17](handoff/04-engineering-data-ops.md) when you scaffold the app.
4. **Custom domains** → add **wegoagane.com**.

Until then, **GitHub + Actions + rulesets** are your “live” pipeline for **source integrity**; the **public site** goes live when Pages is connected.

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
| UI labels differ slightly | GitHub renames sidebars sometimes; you want **Settings → Rules → Rulesets → New branch ruleset**. |

---

*Last reviewed: repository **branch rulesets** under **Settings → Rules → Rulesets**.*
