#!/usr/bin/env bash
# sync-site.sh — the only way this site reaches the public repository.
#
#   bash sync-site.sh                  # dry run: stage the tracked files, gate them, report
#   bash sync-site.sh --apply          # commit and push
#   bash sync-site.sh --apply --message "..."
#
# Same posture as the product's own publish script: an ephemeral copy built from **git-tracked** files
# only (an untracked scratch file cannot ride along), a gate that FAILS the sync rather than warning,
# and a commit identity that is PINNED here — never inherited from the machine's git config, because the
# work machine's global config carries a corporate address and a public commit is content too.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE="${VIBESTAFF_SITE_REMOTE:-https://github.com/todor-rusev/vibestaff.bot.git}"
BRANCH="main"
PUB_NAME="Todor Rusev"
PUB_EMAIL="todor.rosenov.rusev@gmail.com"

APPLY=false
MESSAGE="Update the download page"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY=true ;;
    --message) shift; MESSAGE="${1:-$MESSAGE}" ;;
    *) printf '[sync-site] unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
  shift
done

info() { printf '[sync-site] %s\n' "$*"; }
abort() { printf '[sync-site] FATAL: %s\n' "$*" >&2; exit 1; }

command -v node >/dev/null || abort "node is required (the gate runs on it)"
[[ -d "$HERE/site" ]] || abort "no site/ beside this script"

TMP="$(mktemp -d)"
TMP="$(cd "$TMP" && pwd)"
[[ "$TMP" == /* && "$TMP" != / ]] || abort "temporary directory must be absolute"
touch "$TMP/.sync-site-owned"
cleanup() {
  [[ -f "$TMP/.sync-site-owned" ]] || return
  rm -rf -- "$TMP"
}
trap cleanup EXIT
STAGE="$TMP/stage"
mkdir -p "$STAGE"

# --- 1. exactly the tracked files ----------------------------------------------------------------
info "Staging the tracked files..."
( cd "$HERE" && git ls-files -z . | tar --null -T - -cf - ) | ( cd "$STAGE" && tar -xf - )
[[ -f "$STAGE/site/index.html" ]] || abort "nothing tracked yet — commit this folder in the notebook first"

# --- 2. the gate ----------------------------------------------------------------------------------
info "Gate: pages present, links resolve, leak scan..."
node "$STAGE/scripts/check.mjs" "$STAGE/site" || abort "the gate refused this tree; nothing was published"

if [[ "$APPLY" != true ]]; then
  info "Dry run: the tree is publishable. Re-run with --apply to commit and push."
  exit 0
fi

# --- 3. the public repository ----------------------------------------------------------------------
CLONE="$TMP/clone"
info "Cloning $REMOTE ..."
if ! git clone --depth 1 --branch "$BRANCH" "$REMOTE" "$CLONE" 2>/dev/null; then
  info "No $BRANCH there yet; starting one."
  git init -q -b "$BRANCH" "$CLONE"
  git -C "$CLONE" remote add origin "$REMOTE"
fi

# replace the tree wholesale: a file deleted here must disappear there too
[[ "$(cd "$CLONE" && pwd)" == "$TMP/clone" && -d "$CLONE/.git" ]] \
  || abort "public clone escaped the owned temporary directory"
find "$CLONE" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$STAGE/." "$CLONE/"

GIT_ID=(-c "user.name=$PUB_NAME" -c "user.email=$PUB_EMAIL")
git -C "$CLONE" add -A
if git -C "$CLONE" diff --cached --quiet; then
  info "Nothing changed there; nothing to push."
  exit 0
fi
git -C "$CLONE" "${GIT_ID[@]}" commit -q -m "$MESSAGE"

# the identity gate: what was actually written, not what was asked for
AUTHORED="$(git -C "$CLONE" log -1 --format='%an <%ae> / %cn <%ce>')"
[[ "$AUTHORED" == "$PUB_NAME <$PUB_EMAIL> / $PUB_NAME <$PUB_EMAIL>" ]] \
  || abort "identity gate: the commit carries $AUTHORED"

info "Pushing to $BRANCH ..."
git -C "$CLONE" push -q origin "$BRANCH"
info "Published. GitHub Pages deploys it through .github/workflows/pages.yml."
