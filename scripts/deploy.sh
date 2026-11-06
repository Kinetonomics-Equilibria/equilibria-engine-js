#!/usr/bin/env bash
# Deploy apps/web/dist to the econ.knovia.com.au Static Web App from this
# machine. Run it as `npm run deploy` from the repo root, which typechecks and
# builds first; `npm run deploy:dist` ships the dist/ already there.
#
# The GitHub workflow (.github/workflows/azure-static-web-apps.yml) deploys
# every push to master; this is the same deploy without it. Neither runs the
# tests, so run them yourself before shipping anything you have not seen pass.
#
# The deployment token is the Static Web App's (portal: Overview → Manage
# deployment token). It is a credential, so it is read from a file outside the
# repo and never lands in the working tree, shell history or the clipboard. It
# is not Knovia's token: each Static Web App has its own.
set -euo pipefail

TOKEN_FILE="${SWA_TOKEN_FILE:-$HOME/.config/knovia/econ-swa-token}"
DIST="apps/web/dist"

if [[ ! -f "$TOKEN_FILE" ]]; then
  cat >&2 <<MSG
No deployment token at $TOKEN_FILE.

Copy the token from the Azure portal (Static Web App → Overview → Manage
deployment token), then save it once:

  mkdir -p ~/.config/knovia && (umask 077; pbpaste > ~/.config/knovia/econ-swa-token)
MSG
  exit 1
fi

# `tr -d` because a token pasted through an editor usually arrives with a
# trailing newline, and the CLI sends the token verbatim.
TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")"

if [[ -z "$TOKEN" ]]; then
  echo "Deployment token file $TOKEN_FILE is empty." >&2
  exit 1
fi

if [[ ! -f "$DIST/index.html" ]]; then
  echo "No $DIST/index.html — run 'npm run build' first (or use 'npm run deploy')." >&2
  exit 1
fi

# --env production: the CLI's default is a preview environment, which would
# leave econ.knovia.com.au where it was. The config is named rather than
# searched for, which from the repo root would also find apps/web/public's.
npx --yes @azure/static-web-apps-cli deploy "./$DIST" \
  --swa-config-location "./$DIST" \
  --deployment-token "$TOKEN" \
  --env production
