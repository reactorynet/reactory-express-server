#!/usr/bin/env python3
"""Verify the secret pipeline lines up end to end, on every cloud.

Kubernetes Secret names and keys are plain strings, so a deployment can reference
a Secret or key that nothing creates, apply cleanly, and leave every pod in
CreateContainerConfigError. `terraform validate` cannot see it. That was the
original state of the AWS blueprints — they referenced `mongo`, `postgres`,
`valkey`, `opensearch`, `valkey-credentials` and `meilisearch-master-key`, none of
which were ever created.

Two mechanisms create those Secrets:

  modules/aws/external_secrets     `secret_schema` — External Secrets Operator
                                   projecting AWS Secrets Manager entries
  modules/kubernetes/app_secrets   `candidates` — native Secrets written by
                                   Terraform, for DigitalOcean and Linode, which
                                   have no secrets manager

The second deliberately mirrors the first so modules/kubernetes/reactory_app is
wired identically regardless of cloud. Drift between them is the first thing
checked here.

Checks:
  1. both mechanisms agree on Secret names and keys
  2. every service a workload layer requests exists in the schema
  3. every service a workload layer requests is enabled for that environment
  4. every key any shared module reads exists in the schema — this catches the
     master_key vs master-key class of mismatch
  5. no secret_key_ref uses a hardcoded literal Secret name

Usage: check-secret-refs.py <path-to-terraform>
Exits non-zero on any problem. Standard library only.
"""
import re
import sys
import pathlib

# (path, locals name, nested attribute holding the key map) per mechanism.
SCHEMA_SOURCES = [
    ("modules/aws/external_secrets/main.tf", "secret_schema", "keys"),
    ("aws/modules/external_secrets/main.tf", "secret_schema", "keys"),
    ("modules/kubernetes/app_secrets/main.tf", "candidates", "data"),
]

CLOUDS = ["aws", "digitalocean", "linode"]


def parse_schema(text, local_name, keys_attr):
    """Extract {service: {k8s_name, keys}} from a Terraform locals map."""
    block = re.search(r"%s\s*=\s*\{(.*?)\n  \}" % local_name, text, re.S)
    if not block:
        return {}

    schema = {}
    for svc, body in re.findall(r"(\w+)\s*=\s*\{(.*?)\n    \}", block.group(1), re.S):
        k8s_name = re.search(r'k8s_name\s*=\s*"([^"]+)"', body)
        keys_src = re.search(r"%s\s*=\s*\{([^}]*)\}" % keys_attr, body)
        if not (k8s_name and keys_src):
            continue
        # Left-hand sides only: app_secrets maps keys to var references rather
        # than to Secrets Manager property names, so only the key set is
        # comparable between the two mechanisms.
        keys = re.findall(r'"?([\w-]+)"?\s*=', keys_src.group(1))
        schema[svc] = {"k8s_name": k8s_name.group(1), "keys": sorted(keys)}
    return schema


def check_environments(root, schema):
    failures = 0
    for cloud in CLOUDS:
        envs_root = root / cloud / "environments"
        if not envs_root.is_dir():
            continue

        for env in sorted(p for p in envs_root.iterdir() if p.is_dir()):
            cluster_main = env / "cluster" / "main.tf"
            workload_dir = env / "workload"
            if not workload_dir.is_dir():
                continue

            body = "\n".join(tf.read_text() for tf in sorted(workload_dir.glob("*.tf")))

            # AWS declares enabled_secrets in the cluster layer, where Secrets
            # Manager lives. DigitalOcean and Linode declare it in the workload
            # layer, where the native Secrets are created.
            m = None
            if cluster_main.exists():
                m = re.search(r"enabled_secrets\s*=\s*\[([^\]]*)\]", cluster_main.read_text())
            if not m:
                m = re.search(r"enabled_secrets\s*=\s*\[([^\]]*)\]", body)
            enabled = re.findall(r'"([^"]+)"', m.group(1)) if m else []

            requested = sorted(set(re.findall(r'kubernetes_secret_names\["([^"]+)"\]', body)))

            print("\n%s/%s" % (cloud, env.name))
            print("  enabled   %s" % enabled)
            print("  requested %s" % requested)

            for svc in requested:
                if svc not in schema:
                    print("  FAIL '%s' is not in the secret schema" % svc)
                    failures += 1
                elif svc not in enabled:
                    print("  FAIL requests '%s' but it is not enabled — the Secret will never exist" % svc)
                    failures += 1

            for name, key in re.findall(
                r'secret_key_ref\s*\{\s*name\s*=\s*"([^"]+)"\s*key\s*=\s*"([^"]+)"', body
            ):
                print("  FAIL hardcoded Secret name '%s' (key '%s')" % (name, key))
                failures += 1
    return failures


def check_module_keys(root, all_keys):
    failures = 0
    print("\nKey names read by shared modules")
    modules_root = root / "modules" / "kubernetes"
    if not modules_root.is_dir():
        print("  (no shared kubernetes modules found)")
        return 0

    for mod in sorted(p for p in modules_root.iterdir() if p.is_dir()):
        body = "\n".join(tf.read_text() for tf in sorted(mod.glob("*.tf")))
        if "secret_key_ref" not in body and "secret_name" not in body:
            continue

        requested = set(re.findall(r'secret_key_ref\s*\{[^}]*?key\s*=\s*"([^"]+)"', body, re.S))

        for var_body in re.findall(r'variable\s+"[\w]*_key"\s*\{(.*?)\n\}', body, re.S):
            d = re.search(r'default\s*=\s*"([^"]+)"', var_body)
            if d:
                requested.add(d.group(1))

        for _, default in re.findall(r'(\w*_key)\s*=\s*optional\(string,\s*"([^"]+)"\)', body):
            requested.add(default)

        unknown = sorted(k for k in requested if k not in all_keys)
        for k in unknown:
            print("  FAIL modules/kubernetes/%s reads key '%s', which nothing projects" % (mod.name, k))
            failures += 1
        if requested and not unknown:
            print("  ok modules/kubernetes/%s: %s" % (mod.name, sorted(requested)))
    return failures


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)

    root = pathlib.Path(sys.argv[1])
    if not root.is_dir():
        sys.exit("Not a directory: %s" % root)

    schemas = {}
    for rel, local_name, keys_attr in SCHEMA_SOURCES:
        path = root / rel
        if path.exists():
            parsed = parse_schema(path.read_text(), local_name, keys_attr)
            if parsed:
                schemas[pathlib.Path(rel).parent.name] = parsed

    if not schemas:
        sys.exit("No secret schema found under %s" % root)

    failures = 0

    # --- 1: the two mechanisms must agree ----------------------------------
    print("secret schemas found: %s" % ", ".join(sorted(schemas)))
    names = sorted(schemas)
    ref_name = names[0]
    ref = schemas[ref_name]
    for other_name in names[1:]:
        other = schemas[other_name]
        for svc in sorted(set(ref) | set(other)):
            a, b = ref.get(svc), other.get(svc)
            if a is None or b is None:
                print("  FAIL '%s' present in %s only" % (svc, ref_name if a else other_name))
                failures += 1
            elif a != b:
                print("  FAIL '%s' differs between %s and %s" % (svc, ref_name, other_name))
                print("       %s: %s" % (ref_name, a))
                print("       %s: %s" % (other_name, b))
                failures += 1
    if failures == 0 and len(names) > 1:
        print("  ok all mechanisms project identical names and keys")

    schema = ref
    all_keys = set()
    for s in schema.values():
        all_keys.update(s["keys"])

    failures += check_environments(root, schema)
    failures += check_module_keys(root, all_keys)

    print("\n%d secret reference problem(s)" % failures)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
