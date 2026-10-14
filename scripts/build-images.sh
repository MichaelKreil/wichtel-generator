#!/bin/sh
# Generates the WebP backgrounds and thumbnails in public/static/img from the source JPGs in assets/backgrounds.
# Requires cwebp (brew install webp), Google Chrome and sips (macOS).
set -eu
cd "$(dirname "$0")/.."
mkdir -p public/static/img/bg public/static/img/thumb
for src in assets/backgrounds/*.jpg; do
	name=$(basename "$src" .jpg)
	cwebp -quiet -q 72 -resize 2560 0 "$src" -o "public/static/img/bg/$name-lg.webp"
	cwebp -quiet -q 70 -resize 1280 0 "$src" -o "public/static/img/bg/$name-sm.webp"
	cwebp -quiet -q 75 -resize 384 0 "$src" -o "public/static/img/thumb/$name.webp"
done
# link preview image (1200x630), rendered from assets/og-image.html with headless Chrome
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
tmp=$(mktemp -d)
"$CHROME" --headless=new --hide-scrollbars --window-size=1200,630 --screenshot="$tmp/og.png" "file://$PWD/assets/og-image.html" 2>/dev/null
sips -s format jpeg -s formatOptions 82 "$tmp/og.png" --out public/static/og.jpg >/dev/null
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
echo "done: $(ls assets/backgrounds/*.jpg | wc -l) images"
