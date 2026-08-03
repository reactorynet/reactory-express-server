#!/usr/bin/env python3
"""Verify the cluster -> workload layer contract for every environment.

`terraform validate` cannot help here. Remote state outputs are resolved at
runtime, so a workload layer referencing
data.terraform_remote_state.cluster.outputs.something_missing validates cleanly
and only fails once you apply it against a real cluster — after the cluster layer
has already been built.

Checks, per environment:
  1. every `local.cluster.<name>` the workload layer reads is declared as an
     output by that environment's cluster layer
  2. the state key the workload layer reads matches the key the cluster layer's
     backend actually writes
  3. cluster layers expose a consistent output set within each cloud, so the
     workload layers stay interchangeable

Usage: check-layer-contract.py <path-to-terraform>
Exits non-zero on any mismatch. Standard library only.
"""
import re
import sys
import pathlib

# Outputs a lower tier legitimately reports as null because it runs that service
# in-cluster instead of using a managed equivalent. They must still be DECLARED,
# so the workload layers stay interchangeable — that is what this enforces.
NULLABLE = {
    # AWS naming
    "mongodb_endpoint", "mongodb_port", "mongodb_reader_endpoint",
    "postgres_endpoint", "postgres_port", "postgres_reader_endpoint",
    "opensearch_endpoint", "opensearch_dashboard_endpoint",
    # DigitalOcean / Linode naming
    "mongodb_host", "mongodb_username", "mongodb_password", "mongodb_database",
    "postgres_host", "postgres_username", "postgres_password", "postgres_database",
    "valkey_host", "valkey_port", "valkey_password",
    "opensearch_host", "opensearch_port", "opensearch_username", "opensearch_password",
}


def declared_outputs(layer_dir: pathlib.Path) -> set:
    names = set()
    for tf in layer_dir.glob("*.tf"):
        names |= set(re.findall(r'^output\s+"([^"]+)"', tf.read_text(), re.M))
    return names


def backend_key(layer_dir: pathlib.Path) -> str | None:
    for tf in layer_dir.glob("*.tf"):
        m = re.search(r'backend\s+"s3"\s*\{[^}]*?key\s*=\s*"([^"]+)"', tf.read_text(), re.S)
        if m:
            return m.group(1)
    return None


def remote_state_key(layer_dir: pathlib.Path) -> str | None:
    for tf in layer_dir.glob("*.tf"):
        m = re.search(
            r'data\s+"terraform_remote_state".*?key\s*=\s*"([^"]+)"',
            tf.read_text(),
            re.S,
        )
        if m:
            return m.group(1)
    return None


CLOUDS = ["aws", "digitalocean", "linode"]


def check_cloud(root: pathlib.Path, cloud: str) -> int:
    """Check one cloud's environments. Each cloud is its own contract."""
    failures = 0
    output_sets = {}

    envs = sorted(p for p in root.iterdir() if p.is_dir())
    print(f"\n═══ {cloud} ═══")
    for env in envs:
        cluster, workload = env / "cluster", env / "workload"
        if not (cluster.is_dir() and workload.is_dir()):
            print(f"{env.name}: missing cluster or workload layer — skipped")
            continue

        outputs = declared_outputs(cluster)
        output_sets[env.name] = outputs

        body = "\n".join(tf.read_text() for tf in sorted(workload.glob("*.tf")))
        consumed = set(re.findall(r"\blocal\.cluster\.([A-Za-z0-9_]+)", body))

        missing = consumed - outputs
        print(f"\n{env.name}: workload reads {len(consumed)} cluster output(s)")

        for name in sorted(missing):
            print(f"  FAIL local.cluster.{name} — {env.name}/cluster declares no such output")
            failures += 1

        # 2. state key agreement
        written = backend_key(cluster)
        read = remote_state_key(workload)
        if written and read and written != read:
            print(
                f"  FAIL workload reads state key '{read}' but "
                f"{env.name}/cluster writes '{written}'"
            )
            failures += 1
        elif not read:
            print(f"  note: {env.name}/workload declares no terraform_remote_state")

        unused = outputs - consumed
        if unused:
            print(f"  note: cluster outputs not consumed by workload: {sorted(unused)}")

    # 3. cross-environment consistency, within this cloud
    if len(output_sets) > 1:
        print(f"\n{cloud}: cross-tier output consistency")
        union = set().union(*output_sets.values())
        for name in sorted(union):
            absent = sorted(e for e, o in output_sets.items() if name not in o)
            if not absent:
                continue
            if name in NULLABLE and len(absent) < len(output_sets):
                # dev is expected to differ here, but it should still declare the
                # output as null so the workload layers stay interchangeable.
                for env in absent:
                    print(f"  FAIL '{name}' missing from {env}/cluster — declare it as null instead of omitting it")
                    failures += 1
            else:
                print(f"  FAIL '{name}' declared by some environments but missing from: {absent}")
                failures += 1

    return failures


def main() -> int:
    if len(sys.argv) != 2:
        sys.exit(__doc__)

    root = pathlib.Path(sys.argv[1])
    if not root.is_dir():
        sys.exit(f"Not a directory: {root}")

    failures = 0
    checked = 0
    for cloud in CLOUDS:
        envs_root = root / cloud / "environments"
        if not envs_root.is_dir():
            continue
        checked += 1
        failures += check_cloud(envs_root, cloud)

    if checked == 0:
        sys.exit(f"No <cloud>/environments directories found under {root}")

    print(f"\n{failures} layer contract problem(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
