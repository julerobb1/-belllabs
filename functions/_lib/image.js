export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_PIXELS = 40_000_000;
export const DEFAULT_MAX_SIDE = 1920;

export function sniffType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function u16(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function u32(bytes, offset) {
  return (
    ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>>
    0
  );
}

function u24le(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function concatChunks(chunks) {
  let total = 0;
  for (const chunk of chunks) {
    total += chunk.length;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export function stripJpegMetadata(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error("invalid jpeg");
  }
  const out = [new Uint8Array([0xff, 0xd8])];
  let i = 2;
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) {
      throw new Error("invalid jpeg marker");
    }
    while (i < bytes.length && bytes[i] === 0xff) {
      i += 1;
    }
    if (i >= bytes.length) {
      break;
    }
    const marker = bytes[i];
    i += 1;
    if (marker === 0xd9) {
      out.push(new Uint8Array([0xff, 0xd9]));
      break;
    }
    if (marker === 0xda) {
      out.push(bytes.subarray(i - 2));
      break;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      out.push(new Uint8Array([0xff, marker]));
      continue;
    }
    if (marker === 0x01) {
      continue;
    }
    if (i + 1 >= bytes.length) {
      throw new Error("truncated jpeg");
    }
    const length = u16(bytes, i);
    if (length < 2 || i + length > bytes.length) {
      throw new Error("truncated jpeg segment");
    }
    const drop = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (!drop) {
      out.push(bytes.subarray(i - 2, i + length));
    }
    i += length;
  }
  return concatChunks(out);
}

const PNG_KEEP = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "sRGB", "cHRM", "pHYs", "sBIT", "bKGD"]);

function ascii(bytes, offset, length) {
  let text = "";
  for (let i = 0; i < length; i += 1) {
    text += String.fromCharCode(bytes[offset + i]);
  }
  return text;
}

export function stripPngMetadata(bytes) {
  if (sniffType(bytes) !== "image/png") {
    throw new Error("invalid png");
  }
  const chunks = [bytes.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= bytes.length) {
    const length = u32(bytes, i);
    const type = ascii(bytes, i + 4, 4);
    const end = i + 12 + length;
    if (end > bytes.length) {
      throw new Error("truncated png");
    }
    if (PNG_KEEP.has(type)) {
      chunks.push(bytes.subarray(i, end));
    }
    i = end;
    if (type === "IEND") {
      break;
    }
  }
  return concatChunks(chunks);
}

function fourcc(bytes, offset) {
  return ascii(bytes, offset, 4);
}

function setU32le(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

export function stripWebpMetadata(bytes) {
  if (sniffType(bytes) !== "image/webp") {
    throw new Error("invalid webp");
  }
  const chunks = [];
  let i = 12;
  while (i + 8 <= bytes.length) {
    const type = fourcc(bytes, i);
    const size = bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24);
    let payloadEnd = i + 8 + size;
    if (payloadEnd > bytes.length) {
      throw new Error("truncated webp");
    }
    const paddedEnd = payloadEnd + (size % 2);
    if (type === "EXIF" || type === "XMP ") {
      i = paddedEnd;
      continue;
    }
    if (type === "VP8X" && size >= 10) {
      const vp8x = bytes.slice(i, payloadEnd);
      vp8x[8] = vp8x[8] & ~0x0c;
      chunks.push(vp8x);
      if (size % 2 === 1 && paddedEnd <= bytes.length) {
        chunks.push(bytes.subarray(payloadEnd, paddedEnd));
      }
    } else {
      chunks.push(bytes.subarray(i, paddedEnd > bytes.length ? payloadEnd : paddedEnd));
    }
    i = paddedEnd;
  }
  const body = concatChunks(chunks);
  const out = new Uint8Array(12 + body.length);
  out.set(bytes.subarray(0, 12), 0);
  out.set(body, 12);
  setU32le(out, 4, out.length - 8);
  return out;
}

export function stripMetadata(bytes, type) {
  if (type === "image/jpeg") {
    return stripJpegMetadata(bytes);
  }
  if (type === "image/png") {
    return stripPngMetadata(bytes);
  }
  if (type === "image/webp") {
    return stripWebpMetadata(bytes);
  }
  throw new Error("unsupported type");
}

export function readJpegSize(bytes) {
  let i = 2;
  while (i + 4 < bytes.length) {
    if (bytes[i] !== 0xff) {
      return null;
    }
    while (i < bytes.length && bytes[i] === 0xff) {
      i += 1;
    }
    if (i >= bytes.length) {
      return null;
    }
    const marker = bytes[i];
    i += 1;
    if (marker === 0xda || marker === 0xd9) {
      return null;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      continue;
    }
    const length = u16(bytes, i);
    if (length < 2 || i + length > bytes.length) {
      return null;
    }
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof && length >= 7) {
      return { width: u16(bytes, i + 5), height: u16(bytes, i + 3) };
    }
    i += length;
  }
  return null;
}

export function readPngSize(bytes) {
  if (bytes.length < 24) {
    return null;
  }
  return { width: u32(bytes, 16), height: u32(bytes, 20) };
}

export function readWebpSize(bytes) {
  let i = 12;
  while (i + 8 <= bytes.length) {
    const type = fourcc(bytes, i);
    const size = bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24);
    const payload = i + 8;
    if (type === "VP8X" && size >= 10 && payload + 10 <= bytes.length) {
      return {
        width: u24le(bytes, payload + 4) + 1,
        height: u24le(bytes, payload + 7) + 1,
      };
    }
    if (type === "VP8 " && size >= 10 && payload + 10 <= bytes.length) {
      const width = (bytes[payload + 6] | (bytes[payload + 7] << 8)) & 0x3fff;
      const height = (bytes[payload + 8] | (bytes[payload + 9] << 8)) & 0x3fff;
      return { width, height };
    }
    if (type === "VP8L" && size >= 5 && payload + 5 <= bytes.length && bytes[payload] === 0x2f) {
      const bits =
        bytes[payload + 1] | (bytes[payload + 2] << 8) | (bytes[payload + 3] << 16) | (bytes[payload + 4] << 24);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
    i = payload + size + (size % 2);
  }
  return null;
}

export function readSize(bytes, type) {
  if (type === "image/jpeg") {
    return readJpegSize(bytes);
  }
  if (type === "image/png") {
    return readPngSize(bytes);
  }
  if (type === "image/webp") {
    return readWebpSize(bytes);
  }
  return null;
}

function blobStream(bytes) {
  return new Blob([bytes]).stream();
}

export async function resizeWithImages(env, bytes, maxSide) {
  if (!env || !env.IMAGES) {
    return null;
  }
  const info = await env.IMAGES.info(blobStream(bytes));
  const longest = Math.max(info.width || 0, info.height || 0);
  const transform = longest > maxSide ? { width: maxSide, height: maxSide, fit: "scale-down" } : {};
  const result = await env.IMAGES.input(blobStream(bytes))
    .transform(transform)
    .output({ format: "image/jpeg", quality: 80 });
  const response = result.response();
  const outBytes = new Uint8Array(await response.arrayBuffer());
  const size = readJpegSize(outBytes) || { width: info.width, height: info.height };
  return {
    bytes: outBytes,
    contentType: "image/jpeg",
    width: size.width,
    height: size.height,
  };
}

export async function prepareUpload(bytes, env) {
  if (bytes.length > MAX_BYTES) {
    return { error: "file too large", status: 413 };
  }
  const type = sniffType(bytes);
  if (!type) {
    return { error: "only jpg, png, and webp are accepted", status: 415 };
  }
  const stripped = stripMetadata(bytes, type);
  const size = readSize(stripped, type);
  if (size && size.width * size.height > MAX_PIXELS) {
    return { error: "image dimensions are too large", status: 413 };
  }
  const maxSide = Number(env && env.GALLERY_MAX_SIDE) || DEFAULT_MAX_SIDE;
  try {
    const resized = await resizeWithImages(env, stripped, maxSide);
    if (resized) {
      return {
        bytes: resized.bytes,
        contentType: resized.contentType,
        width: resized.width,
        height: resized.height,
      };
    }
  } catch (err) {
    /* Images binding missing or transformation failed: keep the stripped original. */
  }
  return {
    bytes: stripped,
    contentType: type,
    width: size ? size.width : null,
    height: size ? size.height : null,
  };
}
