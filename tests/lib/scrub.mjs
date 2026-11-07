// Pure secret scrubber. Never throws.
/**
 * Replaces every occurrence of `key` (and its URL-encoded form) in `text` with "[REDACTED]".
 * Non-string text -> String(text). Empty/non-string key -> text unchanged (as string).
 */
export function scrub(text, key) {
  let out;
  try { out = typeof text === 'string' ? text : String(text); } catch { return ''; }
  try {
    if (typeof key !== 'string' || key.length === 0) return out;
    const variants = new Set([key]);
    try { variants.add(encodeURIComponent(key)); } catch { /* ignore */ }
    // Longest first so the encoded form is not partially consumed.
    for (const v of [...variants].filter(Boolean).sort((a, b) => b.length - a.length)) {
      out = out.split(v).join('[REDACTED]');
    }
  } catch { /* fall through with what we have */ }
  return out;
}
