# shellcheck shell=bash
# Sourced by the helpers in bin/ for the shared resource names (see
# agent-env.conf). They come from the first of:
#   1. agent-env.conf next to this file (committed in browserctrl only)
#   2. ~/.config/coding-agents/agent-env.conf, saved by `agent-access`
#   3. the AGENT_ENV_CONF Cursor team secret, which holds the same text, so
#      other repositories (some public) never commit the names
# With none of them, every integration is off.
#
# The text is parsed, never run: only NAME="value" lines for the names below
# are read, and anything else is ignored.
_agent_env_names=" TS_TAGS TS_CLIENT_ID_CURSOR TS_AUDIENCE_CURSOR TS_CLIENT_ID_DEVIN TS_AUDIENCE_DEVIN GCP_PROJECT GCP_WIF_POOL GCP_SERVICE_ACCOUNT AWS_ROLE_ARN AWS_REGION "
_agent_env_parse() {
  local line name value
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^[[:space:]]*([A-Z_][A-Z0-9_]*)=(\"([^\"]*)\"|\'([^\']*)\'|([^[:space:]\"\'#]*))[[:space:]]*(#.*)?$ ]] || continue
    name="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[3]}${BASH_REMATCH[4]}${BASH_REMATCH[5]}"
    [[ "$_agent_env_names" == *" $name "* ]] && printf -v "$name" '%s' "$value"
  done
}
_agent_env_dir="$(dirname "${BASH_SOURCE[0]}")"
if [ -f "$_agent_env_dir/agent-env.conf" ]; then
  _agent_env_parse <"$_agent_env_dir/agent-env.conf"
elif [ -f "$HOME/.config/coding-agents/agent-env.conf" ]; then
  _agent_env_parse <"$HOME/.config/coding-agents/agent-env.conf"
elif [ -n "${AGENT_ENV_CONF:-}" ]; then
  _agent_env_parse <<<"$AGENT_ENV_CONF"
fi
unset -f _agent_env_parse
unset _agent_env_dir _agent_env_names
: "${TS_TAGS:=}" "${TS_CLIENT_ID_CURSOR:=}" "${TS_AUDIENCE_CURSOR:=}" \
  "${TS_CLIENT_ID_DEVIN:=}" "${TS_AUDIENCE_DEVIN:=}" \
  "${GCP_PROJECT:=}" "${GCP_WIF_POOL:=}" "${GCP_SERVICE_ACCOUNT:=}" \
  "${AWS_ROLE_ARN:=}" "${AWS_REGION:=}"
