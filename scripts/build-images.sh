#!/bin/sh
# Generates the WebP backgrounds and thumbnails in public/static/img from the source JPGs in assets/backgrounds.
# Requires cwebp (brew install webp / apt install webp).
set -eu
cd "$(dirname "$0")/.."
mkdir -p public/static/img/bg public/static/img/thumb
for src in assets/backgrounds/*.jpg; do
	name=$(basename "$src" .jpg)
	cwebp -quiet -q 72 -resize 2560 0 "$src" -o "public/static/img/bg/$name-lg.webp"
	cwebp -quiet -q 70 -resize 1280 0 "$src" -o "public/static/img/bg/$name-sm.webp"
	cwebp -quiet -q 75 -resize 384 0 "$src" -o "public/static/img/thumb/$name.webp"
done
echo "done: $(ls assets/backgrounds/*.jpg | wc -l) images"
