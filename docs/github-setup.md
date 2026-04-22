# GitHub setup (repo, CI gate, deploy)

Step-by-step for this repository, aligned with **current GitHub UI** (repository **rulesets**, not the old “Branches → Branch protection rule”-only flow). Official reference: [Creating rulesets for a repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository), [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).

---

## Step 1 — Confirm Git and remotes

```bash
cd /path/to/wegoagane.com
git status
git remote -v
```

If `origin` is missing, add your GitHub repo (replace URL):

```bash
git remote add origin https://github.com/YOUR_USER/wegoagane.com.git
git push -u origin main
```

---

## Step 2 — Let CI run on `main` once

**Rulesets → “Require status checks before merging”** only lists checks that have **already reported successfully** on the target branch (recently, within GitHub’s window). If nothing runs on `main`, the check name will not appear and Step 4 feels “stuck.”

1. Push any commit to **`main`** (or merge a PR into `main`).
2. Open the repo on GitHub → **Actions** → open the latest **CI** run → confirm the job **Handbook layout** is green.

This repo’s workflow is [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): it runs on **`push` to `main`** and on **pull requests** to `main`, so merges to `main` satisfy the usual requirement.

---

## Step 3 — (Optional) Legacy branch protection

GitHub still supports **Rules → Branch rules** (classic branch protection). **Rulesets** are the newer, clearer model (toggle Active/Disabled, targets by pattern, readable to anyone with repo read access in many cases).

You can use **only rulesets**, or **both**; if both apply, GitHub applies the **stricter** requirement. For a solo repo, **one branch ruleset on `main`** is enough to avoid confusion.

---

## Step 4: Protect main with a branch ruleset

Do **not** hunt only under “Branches” in Settings unless you prefer the legacy screen. Use **Rulesets**:

1. Open the repository on GitHub.
2. Click **Settings**.
3. In the left sidebar, under **Code and automation**, click **Rules**, then **Rulesets**.
4. Click **New ruleset** → **New branch ruleset**.
5. **Ruleset name:** e.g. `protect-main`.
6. **Enforcement status:** choose **Active** when you are ready (or **Evaluate** first to test metadata rules without blocking — see GitHub docs).
7. **Bypass list:** optional. As solo admin you can bypass by default; add **Repository admin** or yourself if you want explicit bypass for emergencies.
8. **Target branches:** click **Add target** → **Include default branch** *or* **Include by pattern** → `main` (use the pattern that matches how you name your default branch).
9. Under **Branch protections**, enable what you need. For this project, a practical solo setup:

   | Rule | Suggestion |
   |------|------------|
   | **Restrict deletions** | On (helps prevent accidental branch delete). |
   | **Block force pushes** | On (default; keeps history recoverable). |
   | **Require status checks to pass before merging** | On if you want **CI to gate merges to `main`**. |
   | **Require a pull request before merging** | Optional for solo: **off** if you only push to `main` locally; **on** if you want every change via PR. |
   | **Require linear history** | Optional; only if you always squash/rebase merge. |

10. If you turned on **Require status checks to pass before merging**:

    - Click **Add checks** (or the equivalent control in the UI).
    - Add the check that corresponds to this repo’s workflow job. After Step 2, GitHub usually shows something derived from the workflow **`CI`** and job name **`Handbook layout`** (exact label can vary; copy it from a green run: **Actions** → latest workflow run → check name in the sidebar).
    - **“Require branches to be up to date before merging”** = *strict* (more rebuilds). For solo work you can leave it **unchecked** (*looser*) unless you need strict freshness.

11. Click **Create** (or **Save changes** if editing).

### If you are “stuck” — no checks in the dropdown

- Confirm **Step 2**: a workflow run completed **on `main`** with a green conclusion.
- Confirm the workflow triggers on **`push`** to `main` (this repo does).
- Try **typing** the check name GitHub shows on the run summary, then add it (rulesets may require explicit add per [Creating rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)).
- If a **new** branch cannot be created because checks are required before any run exists, see GitHub’s ruleset option **“Do not require status checks on creation”** (when available) or temporarily set enforcement to **Disabled**, push `main`, then re-enable — see [community discussion on status checks and branch creation](https://github.com/orgs/community/discussions/167194).

More: [Troubleshooting rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/troubleshooting-rules).

---

## Step 5 — Day-to-day workflow with a ruleset

- **Direct push to `main`:** allowed only if the ruleset does **not** require a PR *and* all **required** checks pass on the commits you push.
- **PR into `main`:** merge button stays disabled until required checks pass (and any other rules you enabled).

When you add a Vite app and more jobs (lint, test), add each required check to the same ruleset (or split into multiple rulesets; GitHub merges rules by “most restrictive”).

---

## Step 6 — Live site on wegoagane.com (Cloudflare Pages)

When the SPA exists (build output directory, e.g. `dist/`):

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select this repo and production branch **`main`**.
3. Set **build command** and **build output directory** per your framework (see [handbook §17](handoff/04-engineering-data-ops.md)).
4. Attach custom domain **wegoagane.com** on the Pages project.

Until then, GitHub hosts the **source + CI**; the public `.com` static app goes live once Pages is connected to a real build.

---

## Quick links

| Topic | GitHub Docs |
|--------|-------------|
| Rulesets overview | [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) |
| Create / edit | [Creating rulesets for a repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository) |
| Rule reference | [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) |
| Import / JSON | [github/ruleset-recipes](https://github.com/github/ruleset-recipes) |

---

*Last reviewed against GitHub docs: repository branch rulesets under **Settings → Rules → Rulesets**.*
