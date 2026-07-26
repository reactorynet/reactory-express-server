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
  3. cluster layers expose a consistent output set across environments, so the
     workload layers stay interchangeable

Usage: check-layer-contract.py <path-to-aws/environments>
Exits non-zero on any mismatch. Standard library only.
"""
import re
import sys
import pathlib

# Outputs dev legitimately reports as null because it runs those services
# in-cluster instead of using a managed equivalent.
NULLABLE_IN_DEV = {
    "mongodb_endpoint",
    "mongodb_port",
    "mongodb_reader_endpoint",
    "postgres_endpoint",
    "postgres_port",
    "postgres_reader_endpoint",
    "opensearch_endpoint",
    "opensearch_dashboard_endpoint",
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


def main() -> int:
    if len(sys.argv) != 2:
        sys.exit(__doc__)

    root = pathlib.Path(sys.argv[1])
    if not root.is_dir():
        sys.exit(f"Not a directory: {root}")

    failures = 0
    output_sets = {}

    envs = sorted(p for p in root.iterdir() if p.is_dir())
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

    # 3. cross-environment consistency
    if len(output_sets) > 1:
        print("\nCross-environment output consistency")
        union = set().union(*output_sets.values())
        for name in sorted(union):
            absent = sorted(e for e, o in output_sets.items() if name not in o)
            if not absent:
                continue
            if name in NULLABLE_IN_DEV and absent == ["dev"]:
                # dev is expected to differ here, but it should still declare the
                # output as null so the workload layers stay interchangeable.
                print(f"  FAIL '{name}' missing from dev/cluster — declare it as null instead of omitting it")
                failures += 1
            else:
                print(f"  FAIL '{name}' declared by some environments but missing from: {absent}")
                failures += 1

    print(f"\n{failures} layer contract problem(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
