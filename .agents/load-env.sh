# shellcheck shell=bash
# Sourced by the helpers in bin/ for the shared resource names (see
# agent-env.conf). They come from the first of:
#   1. agent-env.conf next to this file (committed in browserctrl only)
#   2. ~/.config/coding-agents/agent-env.conf, saved by `agent-access`
#   3. the AGENT_ENV_CONF Cursor team secret, which holds the same text, so
#      other repositories (some public) never commit the names
# With none of them, every integration is off.
_agent_env_dir="$(dirname "${BASH_SOURCE[0]}")"
if [ -f "$_agent_env_dir/agent-env.conf" ]; then
  # shellcheck source=/dev/null
  . "$_agent_env_dir/agent-env.conf"
elif [ -f "$HOME/.config/coding-agents/agent-env.conf" ]; then
  # shellcheck source=/dev/null
  . "$HOME/.config/coding-agents/agent-env.conf"
elif [ -n "${AGENT_ENV_CONF:-}" ]; then
  eval "$AGENT_ENV_CONF"
fi
unset _agent_env_dir
: "${TS_TAGS:=}" "${TS_CLIENT_ID_CURSOR:=}" "${TS_AUDIENCE_CURSOR:=}" \
  "${TS_CLIENT_ID_DEVIN:=}" "${TS_AUDIENCE_DEVIN:=}" \
  "${GCP_PROJECT:=}" "${GCP_WIF_POOL:=}" "${GCP_SERVICE_ACCOUNT:=}" \
  "${AWS_ROLE_ARN:=}" "${AWS_REGION:=}"
