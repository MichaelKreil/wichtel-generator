#!/bin/sh
# Renders the link preview image (public/static/og.jpg) and the PNG icons with headless Chrome.
# Requires Google Chrome and sips (macOS).
set -eu
cd "$(dirname "$0")/.."
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
tmp=$(mktemp -d)
# link preview image (1200x630) from assets/og-image.html
"$CHROME" --headless=new --hide-scrollbars --window-size=1200,630 --screenshot="$tmp/og.png" "file://$PWD/assets/og-image.html" 2>/dev/null
sips -s format jpeg -s formatOptions 85 "$tmp/og.png" --out public/static/og.jpg >/dev/null
# icons: PNG for home screens (apple-touch-icon) and /favicon.ico (PNG data works in all browsers)
# (iOS rounds icons itself and fills transparent corners black, hence the solid background)
for size in 180 32; do
	bg=$([ $size = 180 ] && echo '#a4161a' || echo transparent)
	printf '<body style="margin:0;background:%s"><img src="file://%s/public/static/icon.svg" width="%s" height="%s">' "$bg" "$PWD" $size $size > "$tmp/icon.html"
	"$CHROME" --headless=new --hide-scrollbars --default-background-color=00000000 --window-size=$size,$size --screenshot="$tmp/icon-$size.png" "file://$tmp/icon.html" 2>/dev/null
done
cp "$tmp/icon-180.png" public/apple-touch-icon.png
cp "$tmp/icon-32.png" public/favicon.ico
rm -rf "$tmp"
echo "done"
