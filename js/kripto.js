/* Şifreleme yardımcıları (Web Crypto). Biçim Mac tarafındaki arac/senkron.py ile birebir uyumludur.
   Kasa: {"v":1,"iter":N,"salt":b64,"iv":b64,"ct":b64}  ct = AES-256-GCM( gzip(JSON) ), anahtar = PBKDF2-SHA256(şifre, salt, N) */
(function (G) {
  const C = G.crypto.subtle, TE = new TextEncoder(), TD = new TextDecoder();
  const ITER = 210000;
  const b64 = u8 => { let s = ""; const a = new Uint8Array(u8); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64u = u8 => b64(u8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unb64u = s => unb64(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  async function akis(veri, tur, sikistir) {
    const s = new Blob([veri]).stream().pipeThrough(sikistir ? new CompressionStream(tur) : new DecompressionStream(tur));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  const gzip = u8 => akis(u8, "gzip", true), gunzip = u8 => akis(u8, "gzip", false);
  const _anahtarlar = new Map();
  async function sifredenAnahtar(sifre, salt, iter = ITER) {
    const k = sifre + "|" + b64(salt) + "|" + iter;
    if (_anahtarlar.has(k)) return _anahtarlar.get(k);
    const ham = await C.importKey("raw", TE.encode(sifre), "PBKDF2", false, ["deriveKey"]);
    const a = await C.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, ham, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    _anahtarlar.set(k, a); return a;
  }
  async function kasaKilitle(obj, sifre, saltB64) {
    const salt = saltB64 ? unb64(saltB64) : G.crypto.getRandomValues(new Uint8Array(16));
    const iv = G.crypto.getRandomValues(new Uint8Array(12));
    const ct = await C.encrypt({ name: "AES-GCM", iv }, await sifredenAnahtar(sifre, salt), await gzip(TE.encode(JSON.stringify(obj))));
    return { v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
  }
  async function kasaAc(k, sifre) {
    let duz;
    try { duz = await C.decrypt({ name: "AES-GCM", iv: unb64(k.iv) }, await sifredenAnahtar(sifre, unb64(k.salt), k.iter || ITER), unb64(k.ct)); }
    catch { throw new Error("Şifre yanlış ya da veri bozuk."); }
    return JSON.parse(TD.decode(await gunzip(new Uint8Array(duz))));
  }
  // Paylaşım linki: rastgele anahtar (linkte taşınır) ya da şifre
  async function linkKilitle(obj, sifre) {
    const veri = await gzip(TE.encode(JSON.stringify(obj))), iv = G.crypto.getRandomValues(new Uint8Array(12));
    if (sifre) {
      const salt = G.crypto.getRandomValues(new Uint8Array(16));
      const ct = await C.encrypt({ name: "AES-GCM", iv }, await sifredenAnahtar(sifre, salt), veri);
      return `p.${b64u(salt)}.${b64u(iv)}.${b64u(ct)}`;
    }
    const ham = G.crypto.getRandomValues(new Uint8Array(16));
    const a = await C.importKey("raw", ham, "AES-GCM", false, ["encrypt"]);
    const ct = await C.encrypt({ name: "AES-GCM", iv }, a, veri);
    return `k.${b64u(ham)}.${b64u(iv)}.${b64u(ct)}`;
  }
  async function linkAc(s, sifre) {
    const [t, x, iv, ct] = s.split(".");
    const a = t === "p" ? await sifredenAnahtar(sifre, unb64u(x)) : await C.importKey("raw", unb64u(x), "AES-GCM", false, ["decrypt"]);
    let duz;
    try { duz = await C.decrypt({ name: "AES-GCM", iv: unb64u(iv) }, a, unb64u(ct)); } catch { throw new Error("Şifre yanlış ya da link eksik kopyalanmış."); }
    return JSON.parse(TD.decode(await gunzip(new Uint8Array(duz))));
  }
  // Başvuru formu: herkese açık anahtarla şifrele (ECDH P-256 + AES-GCM); yalnızca gizli anahtar sahibi açar
  async function anahtarCiftiUret() {
    const c = await C.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
    return { acik: b64u(await C.exportKey("raw", c.publicKey)), gizli: await C.exportKey("jwk", c.privateKey) };
  }
  async function acikAnahtarlaKilitle(obj, acikB64u) {
    const alici = await C.importKey("raw", unb64u(acikB64u), { name: "ECDH", namedCurve: "P-256" }, false, []);
    const gecici = await C.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
    const a = await C.deriveKey({ name: "ECDH", public: alici }, gecici.privateKey, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
    const iv = G.crypto.getRandomValues(new Uint8Array(12));
    const ct = await C.encrypt({ name: "AES-GCM", iv }, a, TE.encode(JSON.stringify(obj)));
    return `e1.${b64u(await C.exportKey("raw", gecici.publicKey))}.${b64u(iv)}.${b64u(ct)}`;
  }
  async function gizliAnahtarlaAc(s, gizliJwk) {
    const [, pub, iv, ct] = s.split(".");
    const gizli = await C.importKey("jwk", gizliJwk, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]);
    const gonderen = await C.importKey("raw", unb64u(pub), { name: "ECDH", namedCurve: "P-256" }, false, []);
    const a = await C.deriveKey({ name: "ECDH", public: gonderen }, gizli, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    return JSON.parse(TD.decode(await C.decrypt({ name: "AES-GCM", iv: unb64u(iv) }, a, unb64u(ct))));
  }
  G.Kripto = { kasaKilitle, kasaAc, linkKilitle, linkAc, anahtarCiftiUret, acikAnahtarlaKilitle, gizliAnahtarlaAc, b64u, unb64u };
})(typeof window !== "undefined" ? window : globalThis);
