# Trivy security scan: what it scanned and what the result means

## Short explanation (for the submission form)

Trivy scans each built container image in the CI pipeline: the operating-system packages (Debian
for the backend, Alpine for the frontend) and every language package inside it (Python
`site-packages`, including libraries vendored inside other tools). It compares them with
vulnerability databases. The pipeline fails if any **HIGH or CRITICAL** vulnerability **with an
available fix** is found, so a vulnerable image is never pushed to GHCR. The current scan of both
images is **clean (0 HIGH/CRITICAL)**, which means no known, fixable high-risk CVEs at scan time.
It doesn't guarantee the images are secure: new CVEs appear daily, unfixed issues are ignored by
design, and Trivy doesn't test our own code's logic.

## The CVEs we actually found (and fixed)

The first local scan (`aquasec/trivy:0.70.0 image --severity HIGH,CRITICAL --ignore-unfixed`)
reported **4 HIGH** vulnerabilities in the backend image. The frontend image was clean.

| Library | ID | Installed → Fixed | Issue |
|---|---|---|---|
| urllib3 | CVE-2026-97687 | 2.7.0 → 2.8.0 | Traffic interception via HTTPS-proxy TLS configuration override |
| urllib3 | CVE-2026-97689 | 2.7.0 → 2.8.0 | Denial of service through unbounded memory allocation in the chunk parser |
| msgpack | GHSA-6v7p-g79w-8964 | 1.1.2 → 1.2.1 | Out-of-bounds read / crash when an `Unpacker` is reused |
| setuptools | CVE-2025-47273 | 70.3.0 → 78.1.1 | Path traversal in `PackageIndex` (could write files outside the target directory) |

**Investigation:** none of these were MediSlot dependencies. Searching the image showed they were
copies **vendored inside `pip`** (`site-packages/pip/_vendor/...`) and in the `ensurepip` bundle of
the base image. Even the newest pip still shipped the older vendored versions.

**Fix:** the application never installs packages at runtime, so the runtime stage of
`backend/Dockerfile` now removes pip and ensurepip entirely. This also shrinks the attack surface:
an attacker who gets code execution can't `pip install` tools. Re-scanning gave **0 HIGH / 0
CRITICAL**, and the image still passes all health checks.

**Why the CVE mattered (urllib3 CVE-2026-97687):** urllib3 is the HTTP client underneath
`requests`/pip. A flaw that lets a proxy override TLS settings could let a man-in-the-middle read or
modify traffic that the program believes is encrypted. In our image only pip used that copy, but
Trivy can't know whether vulnerable code is reachable, so the safe action is to remove or upgrade it.

## How the gate is configured (`.github/workflows/ci-cd.yml`)

```yaml
- uses: aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25 # v0.36.0
  with:
    image-ref: ghcr.io/<owner>/medislot-<service>:<commit-sha>
    severity: HIGH,CRITICAL
    ignore-unfixed: true      # don't block on CVEs that have no patch yet
    vuln-type: os,library
    exit-code: "1"            # any finding ⇒ job fails ⇒ image is NOT pushed
```

* The action is pinned to a **commit SHA**, not a tag: in 2026 the `trivy-action` tags were
  hijacked in a supply-chain attack, and a SHA can't be silently moved.
* A second Trivy run writes a SARIF report that's uploaded to **Security → Code scanning**.

## Reproduce locally

```bash
docker build -t medislot-backend:local ./backend
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.70.0 \
  image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 medislot-backend:local
```

## Where Trivy fits among security layers

| Layer | Example | In this project |
|---|---|---|
| SAST (code) | Semgrep, CodeQL, Bandit | `ruff` with the `S` (bandit) rule set |
| Dependency scanning | Dependabot, `npm audit`, pip-audit | `npm audit` = 0; pinned versions + lockfile |
| Secret scanning | GitHub secret scanning, gitleaks | No secrets in Git; OIDC instead of AWS keys |
| **Container scanning** | **Trivy** | **CI gate on both images** |
| Runtime security | Pod Security Standards, Falco | `restricted` PSS, non-root, read-only root FS, dropped capabilities |
