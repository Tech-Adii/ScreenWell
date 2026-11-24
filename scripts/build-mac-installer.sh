#!/bin/bash
set -euo pipefail

if [[ "$(uname -s)" != Darwin || $# != 4 ]]; then
  echo 'Usage on macOS: bash scripts/build-mac-installer.sh INPUT.dmg OUTPUT.pkg ARCH VERSION' >&2
  exit 1
fi

image="$1"
output="$2"
version="$4"
case "$3" in
  arm64) expected_arch=arm64 ;;
  x64) expected_arch=x86_64 ;;
  *) echo 'Expected arm64 or x64.' >&2; exit 1 ;;
esac
if [[ -e "$output" ]]; then
  echo "Installer already exists at $output." >&2
  exit 1
fi

work_dir="$(mktemp -d "${TMPDIR:-/tmp}/screenwell-installer.XXXXXX")"
volume="$work_dir/image"
payload="$work_dir/payload"
mounted=false
cleanup() {
  if [[ "$mounted" == true ]]; then
    hdiutil detach "$volume" >/dev/null || return
  fi
  rm -rf -- "$work_dir"
}
trap cleanup EXIT
mkdir "$volume" "$payload"
hdiutil attach -readonly -nobrowse -mountpoint "$volume" "$image"
mounted=true

app="$volume/ScreenWell.app"
codesign --verify --deep --strict "$app"
test "$(lipo -archs "$app/Contents/MacOS/ScreenWell")" = "$expected_arch"
test "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Contents/Info.plist")" = in.screenwell.desktop
test "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app/Contents/Info.plist")" = "$version"
ditto "$app" "$payload/ScreenWell.app"

components="$work_dir/components.plist"
pkgbuild --analyze --root "$payload" "$components"
/usr/libexec/PlistBuddy -c 'Set :0:BundleIsRelocatable false' "$components"
pkgbuild --root "$payload" --component-plist "$components" \
  --identifier in.screenwell.desktop --version "$version" --install-location /Applications "$output"
