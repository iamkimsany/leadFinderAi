async function fetchText(url: string, timeout = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text") && !ct.includes("html")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function normalizePhone(raw: string): string {
  // keep + and digits, replace multiple spaces/dots with single dash for readability
  const cleaned = raw.replace(/[^+\d]/g, "").replace(/(\+?\d{1,3})(\d{3,})/, "$1 $2");
  return cleaned.trim();
}

function findPhoneInText(text: string): string | null {
  if (!text) return null;
  // try JSON-LD telephone
  const jsLd = text.match(/"telephone"\s*:\s*"([^"]+)"/i);
  if (jsLd && jsLd[1]) return normalizePhone(jsLd[1]);

  // tel: links
  const telLink = text.match(/href=["']\s*tel:([^"'\s>]+)["']/i);
  if (telLink && telLink[1]) return normalizePhone(telLink[1]);

  // common visible patterns (loose match)
  const phonePattern = /(?:\+\d{1,3}[\s-.]?)?(?:\(\d{2,4}\)[\s-.]?)?\d{2,4}[\s-.]?\d{2,4}(?:[\s-.]?\d{2,4})?/g;
  const matches = text.match(phonePattern);
  if (matches) {
    // prefer matches containing at least 7 digits
    for (const m of matches) {
      const digits = m.replace(/\D/g, "");
      if (digits.length >= 7 && digits.length <= 16) return normalizePhone(m);
    }
  }
  return null;
}

function findEmailInText(text: string): string | null {
  if (!text) return null;
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailPattern);
  if (!matches) return null;
  return matches[0].toLowerCase();
}

interface ContactInfo {
  phone: string | null;
  email: string | null;
}

async function findContactInfo(text: string): Promise<ContactInfo> {
  return {
    phone: findPhoneInText(text),
    email: findEmailInText(text),
  };
}

/**
 * Try several likely pages on the same host to extract phone/email contact information.
 */
export async function scrapeWebsiteForContactInfo(
  url: string
): Promise<ContactInfo> {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const base = `${u.protocol}//${u.hostname}`;
    const attempts = [
      u.href,
      base,
      `${base}/contact`,
      `${base}/contact-us`,
      `${base}/about`,
      `${base}/about-us`,
      `${base}/company`,
      `${base}/customer-service`,
    ];

    const tried = new Set<string>();
    for (const attempt of attempts) {
      if (!attempt || tried.has(attempt)) continue;
      tried.add(attempt);
      const text = await fetchText(attempt, 8000);
      if (!text) continue;
      const found = await findContactInfo(text);
      if (found.phone || found.email) return found;
    }
  } catch {
    // ignore
  }
  return { phone: null, email: null };
}

export async function scrapeWebsiteForPhone(url: string): Promise<string | null> {
  const contact = await scrapeWebsiteForContactInfo(url);
  return contact.phone;
}

export async function scrapeWebsiteForEmail(url: string): Promise<string | null> {
  const contact = await scrapeWebsiteForContactInfo(url);
  return contact.email;
}

export default scrapeWebsiteForContactInfo;
