#!/usr/bin/env python3
"""Deploy dist/ to Cloudflare Pages and attach naildex.com + www.

Uses the stored custom.cloudflare credential (same pattern as the
cloudflare skill's cf-dns helper) and the Pages Direct Upload API.

REQUIRED TOKEN SCOPES (account that owns the naildex.com zone):
  Account / Cloudflare Pages / Edit
  Zone    / DNS / Edit            (for naildex.com)
  Zone    / Zone / Read           (to resolve the zone)

The token currently connected to this workspace is DNS-scoped to
sewinsnearme.com and skinnybbl.com only, so the preflight below fails
with Cloudflare error 10000 (Authentication error) on Pages endpoints
and cannot see the naildex.com zone. Reconnect Cloudflare with the
scopes above, then run:

  npm run build && python3 scripts/deploy-pages.py
"""
import base64
import hashlib
import json
import os
import subprocess
import sys

sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
import dynamic_credentials as dc

API = "https://api.cloudflare.com/client/v4"
PROJECT = "naildex"
DIST = os.path.join(os.path.dirname(__file__), "..", "dist")
DOMAINS = ["naildex.com", "www.naildex.com"]


def bearer():
    entry = dc.dynamic_credential_entry("custom.cloudflare", "access_token")
    return str(entry["surrogate"]).strip()


def curl(args, token=None, timeout=120):
    cmd = ["curl", "-sS", "--max-time", str(timeout),
           "-H", "Authorization: Bearer " + (token or bearer())] + args
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 30)
    if out.returncode != 0:
        raise RuntimeError("curl failed: " + out.stderr[-400:])
    return json.loads(out.stdout)


def api(method, path, body=None, token=None):
    args = ["-X", method, "-H", "Content-Type: application/json", API + path]
    if body is not None:
        args += ["--data-binary", json.dumps(body)]
    return curl(args, token=token)


def check(resp, what):
    if not resp.get("success"):
        raise RuntimeError(f"{what} failed: {json.dumps(resp.get('errors'))}")
    return resp["result"]


def main():
    if not os.path.isdir(DIST):
        sys.exit("dist/ missing. Run npm run build first.")

    # Preflight 1: naildex.com zone must be visible (gives the account id)
    zr = api("GET", "/zones?name=naildex.com")
    zones = zr.get("result") or []
    if not zones:
        sys.exit("BLOCKED: naildex.com zone is not visible to the connected "
                 "Cloudflare token. Reconnect with Zone Read + DNS Edit on "
                 "the account that registered naildex.com.")
    zone = zones[0]
    account_id = zone["account"]["id"]
    zone_id = zone["id"]
    print("account:", account_id, "| zone:", zone_id)

    # Preflight 2: Pages access
    pr = api("GET", f"/accounts/{account_id}/pages/projects")
    if not pr.get("success"):
        sys.exit("BLOCKED: Pages API rejected the connected token: "
                 + json.dumps(pr.get("errors"))
                 + " Reconnect with Account / Cloudflare Pages / Edit.")

    # Create the project if needed (Direct Upload project)
    names = [p["name"] for p in pr["result"]]
    if PROJECT not in names:
        r = api("POST", f"/accounts/{account_id}/pages/projects",
                {"name": PROJECT, "production_branch": "main"})
        check(r, "create project")
        print("project created:", PROJECT)
    subdomain = PROJECT + ".pages.dev"

    # Collect dist files and hash them (base64 md5, per Pages upload API)
    files = {}
    for base, _dirs, names_ in os.walk(DIST):
        for n in names_:
            full = os.path.join(base, n)
            rel = "/" + os.path.relpath(full, DIST).replace(os.sep, "/")
            data = open(full, "rb").read()
            h = base64.b64encode(hashlib.md5(data).digest()).decode()
            files[rel] = (h, data)
    print("files:", len(files))

    # Upload token + missing-asset upload
    jwt = check(api("GET", f"/accounts/{account_id}/pages/projects/{PROJECT}/upload-token"),
                "upload token")["jwt"]
    missing = check(curl(["-X", "POST", "-H", "Content-Type: application/json",
                          API + "/pages/assets/check-missing",
                          "--data-binary", json.dumps({"hashes": [v[0] for v in files.values()]})],
                         token=jwt), "check missing")
    if missing:
        form = []
        by_hash = {v[0]: v[1] for v in files.values()}
        for h in missing:
            form += ["-F", f"{h}={base64.b64encode(by_hash[h]).decode()}"]
        check(curl(["-X", "POST", API + "/pages/assets/upload"] + form, token=jwt, timeout=300),
              "asset upload")
        print("uploaded", len(missing), "assets")

    # Create the deployment
    manifest = {p: v[0] for p, v in files.items()}
    r = curl(["-X", "POST",
              API + f"/accounts/{account_id}/pages/projects/{PROJECT}/deployments",
              "-F", "manifest=" + json.dumps(manifest),
              "-F", "branch=main"])
    dep = check(r, "create deployment")
    print("deployment:", dep.get("url"), "| stage:", dep.get("latest_stage", {}).get("status"))

    # Attach custom domains
    for d in DOMAINS:
        r = api("POST", f"/accounts/{account_id}/pages/projects/{PROJECT}/domains", {"name": d})
        print("domain", d, "->", "attached" if r.get("success") else json.dumps(r.get("errors")))

    # DNS: CNAME apex + www to the Pages subdomain (proxied; apex uses flattening)
    recs = api("GET", f"/zones/{zone_id}/dns_records?per_page=100").get("result") or []
    for name in DOMAINS:
        existing = [x for x in recs if x["name"] == name]
        body = {"type": "CNAME", "name": name, "content": subdomain, "ttl": 1, "proxied": True}
        if existing:
            rec = existing[0]
            if rec["type"] == "CNAME" and rec["content"] == subdomain:
                print("dns ok:", name)
                continue
            r = api("PUT", f"/zones/{zone_id}/dns_records/{rec['id']}", body)
        else:
            r = api("POST", f"/zones/{zone_id}/dns_records", body)
        print("dns", name, "->", "set" if r.get("success") else json.dumps(r.get("errors")))

    print("done. Verify: https://naildex.com")


if __name__ == "__main__":
    main()
