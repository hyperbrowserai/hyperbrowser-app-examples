<!-- agent-access:begin (synced from hyperbrowserai/browserctrl .agents/kit; edit there) -->

## Cloud agent access (Cursor and Devin)

Cloud agent VMs have keyless access to GCP, AWS and the company tailnet
through short-lived platform OIDC tokens (`.agents/README.md`):

- gcloud: configuration `coding-agents`; check with `gcloud auth list`. If
  another configuration is active, add `--configuration=coding-agents`.
- aws: profile `coding-agents`, read-only; check with
  `aws sts get-caller-identity`. If `AWS_PROFILE` is not set in the shell,
  add `--profile coding-agents`.
- tailscale: the VM joins the tailnet on its own and rejoins after sleeping.
  If `tailscale status` shows no connection, run `agent-tailscale-up`.
  `agent-tailscale-devices` lists the tailnet's devices.

On Cursor, reach tailnet hosts through the local proxies:

```bash
export ALL_PROXY=socks5h://localhost:1055/ HTTPS_PROXY=http://localhost:1054/ HTTP_PROXY=http://localhost:1054/
```

<!-- agent-access:end -->
