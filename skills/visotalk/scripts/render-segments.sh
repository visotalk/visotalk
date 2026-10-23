#!/bin/bash
# Render a long film in segments you can resume, then join them.
#
#   render-segments.sh <doc.tsx> <doc id> <total frames> [frames per segment, default 2000] [render options, e.g. --scale 2]
#
# Why: one `visotalk render` of an eight-minute film is a single 25-40 minute job, and a cloud sandbox that goes idle is
# recycled, killing background work. Segments of ~2000 frames (about 5 minutes) finish inside one foreground tool call
# (`timeout 570 ...`); run the same command again after a restart and finished segments are skipped. The total is
# frames = seconds * 30 (`visotalk sheet` or the render log prints it). `visotalk` is read from $VT (default: `npx visotalk@latest`).
# A segment's frames are held in memory until it is encoded: at --scale 2 (3840 x 2160) a frame is up to ~6 MB, so give 4K segments of about 500.
# It prints each segment and its progress (frames done, rate, time left); the full output is in .visotalk/<id>/seg/NN.log.
# Result: .visotalk/<id>/final.mp4. Each segment's mix carries the narration to the end of the film, so every
# segment's audio is cut to its own picture before the join.
set -eo pipefail
DOC=$1; ID=$2; TOTAL=$3; SEG=${4:-2000}; VT=${VT:-npx visotalk@latest}; EXTRA=("${@:5}")
# absolute: the join's list names its files, and ffmpeg reads a relative name from the list's own directory
W=$(cd "$(dirname "$DOC")" && pwd)/.visotalk/$ID; mkdir -p "$W/seg"
N=$(((TOTAL + SEG - 1) / SEG)); n=0
for ((f = 0; f < TOTAL; f += SEG)); do
  t=$((f + SEG)); [ $t -gt "$TOTAL" ] && t=$TOTAL
  d=$W/seg/$(printf %02d $n)
  if [ -f "$d/final.mp4" ]; then echo "segment $((n + 1))/$N (frames $f-$t): done before"; n=$((n + 1)); continue; fi
  echo "segment $((n + 1))/$N (frames $f-$t)"
  rm -rf "$d"
  # the whole output goes to the segment's log; its progress lines are shown as they come
  $VT render "$DOC" --out "$d" --from $f --to $t --concurrency 3 "${EXTRA[@]}" 2>&1 | tee "$d.log" | awk '/^(frames|encoding|mixing)/ { print "  " $0; fflush() }' || { echo "segment $((n + 1)) failed: $d.log"; exit 1; }
  n=$((n + 1))
done
mkdir -p "$W/trim"; : > "$W/trim/list.txt"
for d in "$W"/seg/[0-9][0-9]/; do
  n=$(basename "$d"); v=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 "$d/final.mp4")
  ffmpeg -y -loglevel error -i "$d/final.mp4" -t "$v" -c:v copy -c:a aac -b:a 160k "$W/trim/$n.mp4"
  echo "file '$W/trim/$n.mp4'" >> "$W/trim/list.txt"
done
echo "joining $N segments"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$W/trim/list.txt" -c copy "$W/final.mp4"
echo "$W/final.mp4 (captions: $W/seg/00/captions.srt)"
