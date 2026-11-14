/* Şifreli eşitleme (Mac ↔ telefon ↔ diğer cihazlar). Kurallar arac/senkron.py ile aynıdır.
   Veri GitHub'daki gizli bir gist'te yalnızca ŞİFRELİ durur; şifre bu cihazda saklanır, hiçbir yere gönderilmez. */
(function (G) {
  const ACIKLAMA = "dogum-haritasi-senkron", DOSYA = "kasa.json", AYAR = "dh.senkron";
  const ayar = () => { try { return JSON.parse(localStorage.getItem(AYAR)) || {}; } catch { return {}; } };
  const ayarYaz = a => localStorage.setItem(AYAR, JSON.stringify({ ...ayar(), ...a }));
  const kurulu = () => { const a = ayar(); return !!(a.token && a.sifre); };

  async function api(yol, yontem = "GET", govde) {
    const r = await fetch("https://api.github.com" + yol, { method: yontem, cache: "no-store",
      headers: { Authorization: "Bearer " + ayar().token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
                 ...(govde ? { "Content-Type": "application/json" } : {}) }, body: govde ? JSON.stringify(govde) : undefined });
    if (r.status === 401) throw new Error("GitHub anahtarı geçersiz ya da süresi dolmuş.");
    if (!r.ok) { const e = new Error(`GitHub hatası (${r.status})`); e.kod = r.status; throw e; }
    return r.status === 204 ? null : r.json();
  }
  async function gistBul() {
    const gid = ayar().gist_id;
    if (gid) { try { return await api(`/gists/${gid}`); } catch (e) { if (e.kod !== 404) throw e; } }
    for (let s = 1; s <= 10; s++) {
      const l = await api(`/gists?per_page=100&page=${s}`);
      const g = l.find(x => x.description === ACIKLAMA && x.files && x.files[DOSYA]);
      if (g) { ayarYaz({ gist_id: g.id }); return api(`/gists/${g.id}`); }
      if (l.length < 100) break;
    }
    return null;
  }
  async function icerik(g) {
    const f = g.files[DOSYA];
    return f.truncated ? (await fetch(f.raw_url, { cache: "no-store" })).text() : f.content;
  }

  const sabit = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, a) => (o[a] = x[a], o), {}) : x);
  function birlestir(L, R) {
    const sil = { ...(R.silinenler || {}) };
    for (const [k, v] of Object.entries(L.silinenler || {})) if (v > (sil[k] || "")) sil[k] = v;
    const kume = (a = {}, b = {}, onek) => {
      const out = {};
      for (const i of new Set([...Object.keys(a), ...Object.keys(b)])) {
        const x = a[i], y = b[i];
        const sec = (!y || (x && (x.guncelleme || "") > (y.guncelleme || ""))) ? x : y;  // eşitlikte bulut
        if ((onek + i) in sil && sil[onek + i] >= (sec.guncelleme || "")) continue;
        const diger = sec === x ? y : x;
        out[i] = !onek && diger && (diger.yillik || sec.yillik) ? { ...sec, yillik: { ...(diger.yillik || {}), ...(sec.yillik || {}) } } : sec;  // yıllık haritalar birleşir
      }
      return out;
    };
    const yeni = (a, b) => ((a || {}).guncelleme || "") > ((b || {}).guncelleme || "") ? a : (b || a);
    return { surum: 2, musteriler: kume(L.musteriler, R.musteriler, ""), sinastriler: kume(L.sinastriler, R.sinastriler, "s:"),
             silinenler: sil, marka: yeni(L.marka, R.marka) || {}, basvuru: yeni(L.basvuru, R.basvuru) || null };
  }

  let calisiyor = null, bekleyen = false;
  /* yerelOku(): {musteriler, sinastriler, silinenler, marka, basvuru};  yerelYaz(M) → yerel depoya uygular */
  async function esitle(yerelOku, yerelYaz) {
    if (!kurulu()) throw new Error("Eşitleme kurulmamış.");
    if (calisiyor) { bekleyen = true; return calisiyor; }
    calisiyor = (async () => {
      try {
        const sifre = ayar().sifre;
        const g = await gistBul();
        const kasa = g ? JSON.parse(await icerik(g)) : null;
        const R = kasa ? await Kripto.kasaAc(kasa, sifre) : {};
        const L = yerelOku();
        const M = birlestir(L, R);
        const once = sabit(L);
        yerelYaz(M);
        let gonderildi = false;
        if (sabit(M) !== sabit(R)) {
          const govde = { files: { [DOSYA]: { content: JSON.stringify(await Kripto.kasaKilitle(M, sifre, kasa && kasa.salt)) } } };
          if (g) await api(`/gists/${g.id}`, "PATCH", govde);
          else { const y = await api("/gists", "POST", { description: ACIKLAMA, public: false, ...govde }); ayarYaz({ gist_id: y.id }); }
          gonderildi = true;
        }
        const degisti = sabit(yerelOku()) !== once;
        ayarYaz({ son: new Date().toISOString(), hata: "" });
        return { degisti, gonderildi };
      } catch (e) { ayarYaz({ hata: e.message }); throw e; }
      finally { calisiyor = null; }
    })();
    const s = await calisiyor;
    if (bekleyen) { bekleyen = false; return esitle(yerelOku, yerelYaz); }
    return s;
  }
  G.Senkron = { ayar, ayarYaz, kurulu, esitle, birlestir };
})(typeof window !== "undefined" ? window : globalThis);
