# Cloud agent access kit

Copied from `hyperbrowserai/browserctrl` (`.agents/`) by `.agents/sync-kit`.
Change the scripts there and sync them again rather than editing these copies.

Cursor Cloud Agents and Devin VMs get short-lived credentials for GCP, AWS
and the company tailnet by exchanging an OIDC token that the platform issues
inside the VM. Nothing long-lived is stored in the repository, the image or
the snapshot.

- `bin/agent-access install` (Cursor install step) installs `gcloud`, `aws`,
  `tailscale` and `jq` when missing and links the helpers into
  `/usr/local/bin`.
- `bin/agent-access start` (Cursor start step) writes the `coding-agents`
  gcloud configuration and AWS profile and keeps the VM on the tailnet.
- The resource names the helpers use come from the `AGENT_ENV_CONF` Cursor
  team secret (see `load-env.sh`); without it, access stays off.

Devin sets up the same access for every repository from the browserctrl
blueprint, so these copies are only used on Cursor.
