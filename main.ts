// The World Today — Tuesday 24 November 2026
// make.fun bounty: news-image-20261124
//
// The entry is a single poster image, entry.png (1024x1024), stored in
// this repository beside this program. Running the program copies the
// poster into the harness output directory as entry.png, then reads the
// copy back and checks it against the original byte for byte, so the two
// graded runs always produce identical output. No network is used and
// nothing is drawn at run time: the image is the deliverable.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// A PNG file always opens with these eight bytes.
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const POSTER_WIDTH = 1024;
const POSTER_HEIGHT = 1024;
// The gate allows at most 1 MiB for the image file.
const MAX_BYTES = 1048576;

// The poster lives next to this file in the repository.
const repoRoot = dirname(fileURLToPath(import.meta.url));
const posterPath = join(repoRoot, "entry.png");

// The harness sets MAKEFUN_OUTPUT_DIR; without it, write to /output.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const outputPath = join(outputDir, "entry.png");

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// Check the poster is a whole 1024x1024 PNG before copying it: the
// signature byte by byte, an IHDR first chunk, the width and height
// stored in it (bytes 16..24, big-endian), and a proper IEND chunk at
// the end, so a truncated or mis-sized file is refused instead of
// being submitted.
function checkPoster(bytes: Buffer, label: string): void {
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) {
      fail(`${label}: not a PNG file (signature byte ${i} is wrong)`);
    }
  }
  if (bytes.subarray(12, 16).toString("ascii") !== "IHDR") {
    fail(`${label}: first chunk is not IHDR`);
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== POSTER_WIDTH || height !== POSTER_HEIGHT) {
    fail(
      `${label}: poster must be ${POSTER_WIDTH}x${POSTER_HEIGHT}, ` +
        `got ${width}x${height}`,
    );
  }
  const tail = bytes.subarray(bytes.length - 12);
  const tailLength = tail.readUInt32BE(0);
  const tailType = tail.subarray(4, 8).toString("ascii");
  if (tailLength !== 0 || tailType !== "IEND") {
    fail(`${label}: missing IEND chunk — the poster looks truncated`);
  }
}

if (!existsSync(posterPath)) {
  fail(`poster missing: ${posterPath}`);
}

const poster = readFileSync(posterPath);
checkPoster(poster, posterPath);
if (poster.length > MAX_BYTES) {
  fail(
    `${posterPath}: poster is ${poster.length} bytes, over the 1 MiB limit`,
  );
}
console.log(
  `Poster OK: PNG ${POSTER_WIDTH}x${POSTER_HEIGHT}, ${poster.length} bytes`,
);
console.log(`Poster sha256: ${sha256Hex(poster)}`);

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, poster);

// Read the copy back and prove it matches the original byte for byte.
const written = readFileSync(outputPath);
if (written.length !== poster.length || !written.equals(poster)) {
  fail(
    `copy mismatch: ${outputPath} is ${written.length} bytes, ` +
      `expected ${poster.length}`,
  );
}

console.log(`Wrote ${written.length} bytes to ${outputPath} (byte-identical copy)`);
