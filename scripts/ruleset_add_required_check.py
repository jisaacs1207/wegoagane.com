#!/usr/bin/env python3
"""
Append a required status check to the repo branch ruleset (default: wegoagane-main-ci).

Requires: GitHub CLI (`gh`) authenticated with permission to edit rulesets.

Usage:
  python3 scripts/ruleset_add_required_check.py "Lint"
  RULESET_NAME=protect-main python3 scripts/ruleset_add_required_check.py "Typecheck"

After adding a new job to .github/workflows/ci.yml, run this with the job's
`name:` field (what appears in the PR checks UI), once that job has reported
at least once on a PR (GitHub may reject unknown contexts).
"""
from __future__ import annotations

import json
import os
import subprocess
import sys


def gh_api(method: str, path: str, body: dict | None = None) -> dict | list | None:
    cmd = ["gh", "api", "-X", method, path]
    if body is not None:
        cmd.extend(["--input", "-"])
        proc = subprocess.run(
            cmd,
            input=json.dumps(body),
            text=True,
            capture_output=True,
        )
    else:
        proc = subprocess.run(cmd, text=True, capture_output=True)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr or proc.stdout or "gh api failed\n")
        raise SystemExit(proc.returncode)
    out = (proc.stdout or "").strip()
    if not out:
        return None
    return json.loads(out)


def main() -> None:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        raise SystemExit(2)
    new_context = sys.argv[1].strip()
    if not new_context:
        raise SystemExit("empty context")

    ruleset_name = os.environ.get("RULESET_NAME", "wegoagane-main-ci")

    raw = subprocess.run(
        ["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"],
        text=True,
        capture_output=True,
        check=True,
    ).stdout.strip()
    owner, repo = raw.split("/", 1)

    rulesets = gh_api("GET", f"repos/{owner}/{repo}/rulesets")
    if not isinstance(rulesets, list):
        raise SystemExit("unexpected rulesets response")
    rid = None
    for rs in rulesets:
        if rs.get("name") == ruleset_name:
            rid = rs.get("id")
            break
    if rid is None:
        raise SystemExit(f'no ruleset named "{ruleset_name}" — list: gh api repos/{owner}/{repo}/rulesets')

    current = gh_api("GET", f"repos/{owner}/{repo}/rulesets/{rid}")
    if not isinstance(current, dict):
        raise SystemExit("unexpected ruleset body")

    rules = current.get("rules") or []
    found = False
    for rule in rules:
        if rule.get("type") != "required_status_checks":
            continue
        found = True
        params = rule.setdefault("parameters", {})
        checks = params.setdefault("required_status_checks", [])
        contexts = {c.get("context") for c in checks if isinstance(c, dict)}
        if new_context in contexts:
            print(f'check "{new_context}" already required — nothing to do')
            return
        checks.append({"context": new_context})
        break
    if not found:
        raise SystemExit(
            'ruleset has no required_status_checks rule — add "Require status checks" in the UI first'
        )

    # PUT body: only fields documented for update (avoid echoing read-only noise).
    body: dict = {
        "name": current["name"],
        "target": current.get("target") or "branch",
        "enforcement": current.get("enforcement") or "active",
        "rules": rules,
    }
    if current.get("bypass_actors") is not None:
        body["bypass_actors"] = current["bypass_actors"]
    if current.get("conditions") is not None:
        body["conditions"] = current["conditions"]

    gh_api("PUT", f"repos/{owner}/{repo}/rulesets/{rid}", body)
    print(f'OK — added required check "{new_context}" to ruleset "{ruleset_name}" (id {rid})')


if __name__ == "__main__":
    main()
