import assert from "node:assert/strict";
import test from "node:test";
import { readSize, sniffType, stripMetadata } from "./image.js";
import { tokensEqual } from "./auth.js";
import { nowSql, parseLimit } from "./http.js";

function bytes(...values) {
  return Uint8Array.from(values);
}

function concat(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function u16(n) {
  return [(n >> 8) & 0xff, n & 0xff];
}

test("sniffType recognizes jpeg png webp", () => {
  assert.equal(sniffType(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
  assert.equal(sniffType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), "image/png");
  const webp = new Uint8Array(12);
  webp.set(Buffer.from("RIFF"), 0);
  webp.set(Buffer.from("WEBP"), 8);
  assert.equal(sniffType(webp), "image/webp");
  assert.equal(sniffType(bytes(0x00, 0x01, 0x02)), null);
});

test("stripJpegMetadata drops APP1 Exif/GPS and COM", () => {
  const soi = bytes(0xff, 0xd8);
  const app0 = bytes(0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00);
  const exifPayload = Buffer.from("Exif\0\0MM\0*\0\0\0\x08GPS\0\0\0\0");
  const app1 = concat([bytes(0xff, 0xe1, ...u16(exifPayload.length + 2)), exifPayload]);
  const com = concat([bytes(0xff, 0xfe, ...u16(9)), Buffer.from("secret!")]);
  const sof = bytes(0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x10, 0x00, 0x20, 0x01, 0x01, 0x11, 0x00);
  const sos = bytes(0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xaa, 0xff, 0xd9);
  const jpeg = concat([soi, app0, app1, com, sof, sos]);
  const stripped = stripMetadata(jpeg, "image/jpeg");
  const asText = Buffer.from(stripped).toString("latin1");
  assert.equal(stripped[0], 0xff);
  assert.equal(stripped[1], 0xd8);
  assert.equal(asText.includes("Exif"), false);
  assert.equal(asText.includes("GPS"), false);
  assert.equal(asText.includes("secret"), false);
  assert.equal(asText.includes("JFIF"), true);
  assert.deepEqual(readSize(stripped, "image/jpeg"), { width: 32, height: 16 });
});

test("stripPngMetadata drops eXIf and tEXt", () => {
  const png1x1 = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const signature = png1x1.subarray(0, 8);
  const rest = png1x1.subarray(8);
  const textData = Buffer.concat([Buffer.from("Comment\0GPS:1,2"), Buffer.from([0, 0, 0, 0])]);
  const type = Buffer.from("tEXt");
  const length = Buffer.from([0, 0, 0, textData.length]);
  const crc = Buffer.from([0, 0, 0, 0]);
  const injected = concat([signature, length, type, textData, crc, rest]);
  const stripped = stripMetadata(injected, "image/png");
  const asText = Buffer.from(stripped).toString("latin1");
  assert.equal(asText.includes("GPS:1,2"), false);
  assert.equal(sniffType(stripped), "image/png");
  assert.deepEqual(readSize(stripped, "image/png"), { width: 1, height: 1 });
});

test("stripWebpMetadata drops EXIF chunk and VP8X flags", () => {
  const vp8x = bytes(
    0x56, 0x50, 0x38, 0x58, 0x0a, 0x00, 0x00, 0x00,
    0x0c, 0x00, 0x00, 0x00,
    0x0f, 0x00, 0x00,
    0x07, 0x00, 0x00
  );
  const exif = concat([bytes(0x45, 0x58, 0x49, 0x46, 0x04, 0x00, 0x00, 0x00), Buffer.from("GPS!")]);
  const vp8 = bytes(0x56, 0x50, 0x38, 0x20, 0x00, 0x00, 0x00, 0x00);
  const body = concat([vp8x, exif, vp8]);
  const riff = new Uint8Array(12 + body.length);
  riff.set(Buffer.from("RIFF"), 0);
  riff[4] = (riff.length - 8) & 0xff;
  riff.set(Buffer.from("WEBP"), 8);
  riff.set(body, 12);
  const stripped = stripMetadata(riff, "image/webp");
  const asText = Buffer.from(stripped).toString("latin1");
  assert.equal(asText.includes("GPS!"), false);
  assert.equal(asText.includes("EXIF"), false);
  assert.equal(stripped[20] & 0x0c, 0);
  assert.deepEqual(readSize(stripped, "image/webp"), { width: 16, height: 8 });
});

test("tokensEqual is true only for matching secrets", async () => {
  assert.equal(await tokensEqual("secret-token", "secret-token"), true);
  assert.equal(await tokensEqual("secret-token", "other-token"), false);
  assert.equal(await tokensEqual("", "secret-token"), false);
});

test("http helpers", () => {
  const url = new URL("https://example.test/api/gallery?limit=999");
  assert.equal(parseLimit(url), 50);
  assert.match(nowSql(), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});
