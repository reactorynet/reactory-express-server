#!/usr/bin/env python3
"""Verify the secret pipeline lines up end to end.

Kubernetes Secret names and keys are plain strings, so a deployment can reference
a Secret or key that nothing projects, apply cleanly, and leave every pod in
CreateContainerConfigError. `terraform validate` cannot see it. That was the
original state of these blueprints — they referenced `mongo`, `postgres`,
`valkey`, `opensearch`, `valkey-credentials` and `meilisearch-master-key`, none of
which were ever created.

The pipeline spans three places:

  environments/<env>/cluster    secrets_manager.enabled_secrets — which Secrets
                                Manager entries exist
  modules/external_secrets      secret_schema — which Kubernetes Secret each maps
                                to, and which keys it carries
  environments/<env>/workload   kubernetes_secret_names["<svc>"] — what workloads
                                ask for
  modules/*                     the key names consumers actually read

Checks:
  1. every service a workload layer requests is in the schema
  2. every service a workload layer requests is enabled in its cluster layer
  3. every key any module reads exists in the schema — this catches the
     master_key vs master-key class of mismatch
  4. no secret_key_ref uses a hardcoded literal Secret name

Usage: check-secret-refs.py <path-to-terraform/aws>
Exits non-zero on any problem. Standard library only.
"""
import re
import sys
import pathlib


def parse_schema(text: str) -> dict:
    block = re.search(r"secret_schema\s*=\s*\{(.*?)\n  \}", text, re.S)
    if not block:
        sys.exit("Could not locate secret_schema in modules/external_secrets/main.tf")

    schema = {}
    for svc, body in re.findall(r"(\w+)\s*=\s*\{(.*?)\n    \}", block.group(1), re.S):
        k8s_name = re.search(r'k8s_name\s*=\s*"([^"]+)"', body)
        keys_src = re.search(r"keys\s*=\s*\{([^}]*)\}", body)
        if not (k8s_name and keys_src):
            continue
        schema[svc] = {
            "k8s_name": k8s_name.group(1),
            "keys": dict(re.findall(r'"?([\w-]+)"?\s*=\s*"([^"]+)"', keys_src.group(1))),
        }
    return schema


def main() -> int:
    if len(sys.argv) != 2:
        sys.exit(__doc__)

    aws = pathlib.Path(sys.argv[1])
    schema_file = aws / "modules" / "external_secrets" / "main.tf"
    if not schema_file.exists():
        sys.exit(f"Not found: {schema_file}")

    schema = parse_schema(schema_file.read_text())
    all_keys = {k for s in schema.values() for k in s["keys"]}

    print(f"schema projects {len(schema)} service(s): {', '.join(sorted(schema))}")
    print(f"schema key names: {', '.join(sorted(all_keys))}")

    failures = 0

    # --- 1 & 2: per-environment service references -------------------------
    envs_root = aws / "environments"
    if envs_root.is_dir():
        for env in sorted(p for p in envs_root.iterdir() if p.is_dir()):
            cluster_main = env / "cluster" / "main.tf"
            workload_dir = env / "workload"
            if not (cluster_main.exists() and workload_dir.is_dir()):
                continue

            m = re.search(r"enabled_secrets\s*=\s*\[([^\]]*)\]", cluster_main.read_text())
            enabled = re.findall(r'"([^"]+)"', m.group(1)) if m else []

            body = "\n".join(tf.read_text() for tf in sorted(workload_dir.glob("*.tf")))
            requested = sorted(set(
                re.findall(r'kubernetes_secret_names\["([^"]+)"\]', body)
            ))

            print(f"\n{env.name}: enabled={enabled}")
            print(f"{' ' * len(env.name)}  requested={requested}")

            for svc in requested:
                if svc not in schema:
                    print(f"  FAIL '{svc}' is not in the external_secrets schema")
                    failures += 1
                elif svc not in enabled:
                    print(
                        f"  FAIL workload requests '{svc}' but {env.name}/cluster "
                        f"does not enable it — the Secret will never exist"
                    )
                    failures += 1

            for name, key in re.findall(
                r'secret_key_ref\s*\{\s*name\s*=\s*"([^"]+)"\s*key\s*=\s*"([^"]+)"', body
            ):
                print(f"  FAIL hardcoded Secret name '{name}' (key '{key}')")
                failures += 1

    # --- 3: key names any module reads -------------------------------------
    print("\nKey names read by modules")
    modules_root = aws / "modules"
    for mod in sorted(p for p in modules_root.iterdir() if p.is_dir()):
        body = "\n".join(tf.read_text() for tf in sorted(mod.glob("*.tf")))
        if "secret_key_ref" not in body and "secret_name" not in body:
            continue

        requested = set()

        # Literal keys inside secret_key_ref blocks.
        requested |= set(re.findall(r'secret_key_ref\s*\{[^}]*?key\s*=\s*"([^"]+)"', body, re.S))

        # Defaults of *_key variables — the key a consumer reads unless overridden.
        for var_body in re.findall(r'variable\s+"[\w]*_key"\s*\{(.*?)\n\}', body, re.S):
            d = re.search(r'default\s*=\s*"([^"]+)"', var_body)
            if d:
                requested.add(d.group(1))

        # optional(string, "…") defaults inside object-typed variables.
        for attr, default in re.findall(r'(\w*_key)\s*=\s*optional\(string,\s*"([^"]+)"\)', body):
            requested.add(default)

        unknown = sorted(k for k in requested if k not in all_keys)
        if unknown:
            for k in unknown:
                print(f"  FAIL modules/{mod.name} reads key '{k}', which the schema never projects")
                failures += 1
        elif requested:
            print(f"  ok modules/{mod.name}: {sorted(requested)}")

    print(f"\n{failures} secret reference problem(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
