function keyFor(id) {
  return "gallery/" + id;
}

export function objectKey(id) {
  return keyFor(id);
}

export async function putImage(env, id, bytes, contentType) {
  const key = keyFor(id);
  if (env.GALLERY_BUCKET) {
    await env.GALLERY_BUCKET.put(key, bytes, {
      httpMetadata: { contentType },
    });
    return key;
  }
  if (env.GALLERY_KV) {
    await env.GALLERY_KV.put(key, bytes, {
      metadata: { contentType },
    });
    return key;
  }
  throw new Error("no gallery object store bound");
}

export async function getImage(env, key) {
  if (env.GALLERY_BUCKET) {
    const object = await env.GALLERY_BUCKET.get(key);
    if (!object) {
      return null;
    }
    return {
      body: object.body,
      contentType: (object.httpMetadata && object.httpMetadata.contentType) || "application/octet-stream",
      size: object.size,
    };
  }
  if (env.GALLERY_KV) {
    const object = await env.GALLERY_KV.get(key, { type: "arrayBuffer" });
    if (!object) {
      return null;
    }
    return {
      body: object,
      contentType: "application/octet-stream",
      size: object.byteLength,
    };
  }
  return null;
}

export async function deleteImage(env, key) {
  if (env.GALLERY_BUCKET) {
    await env.GALLERY_BUCKET.delete(key);
    return;
  }
  if (env.GALLERY_KV) {
    await env.GALLERY_KV.delete(key);
  }
}

export function storageConfigured(env) {
  return Boolean(env.GALLERY_BUCKET || env.GALLERY_KV);
}
