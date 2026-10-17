import crypto from "crypto";

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function mac(secret: string | Buffer, purpose: string, id: string): string {
  return b64url(crypto.createHmac("sha256", secret).update(`${purpose}:${id}`).digest());
}

/** Creates `v1.<random id>.<hmac>` signed with the server secret for `purpose`. */
export function issueSignedToken(secret: string | Buffer, purpose: string): { token: string; id: string } {
  const id = b64url(crypto.randomBytes(18));
  return { token: `v1.${id}.${mac(secret, purpose, id)}`, id };
}

/** Returns the token's id if the signature is valid, otherwise null. */
export function verifySignedToken(secret: string | Buffer, purpose: string, token: unknown): string | null {
  if (typeof token !== "string" || token.length > 200) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [, id, sig] = parts;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(id)) return null;
  const expected = Buffer.from(mac(secret, purpose, id));
  const given = Buffer.from(sig);
  if (expected.length !== given.length) return null;
  return crypto.timingSafeEqual(expected, given) ? id : null;
}
