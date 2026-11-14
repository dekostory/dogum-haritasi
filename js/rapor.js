/* Rapor HTML'i — Mac panelindeki aynı Jinja şablonu (sablon/rapor.html.j2) Nunjucks ile işlenir. */
(function (G) {
  const nj = G.nunjucks;
  let env = null;
  function ortam() {
    if (env) return env;
    if (nj.installJinjaCompat) nj.installJinjaCompat();
    env = new nj.Environment(null, { autoescape: true });
    const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&#34;").replace(/'/g, "&#39;");
    env.addFilter("metin", (v, ipucu) => {
      if (!v || !String(v).trim()) return new nj.runtime.SafeString(`<p class="hint">[${esc(ipucu || "")}]</p>`);
      return new nj.runtime.SafeString(String(v).split("\n\n").map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join(""));
    });
    env.addFilter("format", (fmt, ...a) => fmt.replace(/%0?(\d*)d/, (m, w) => String(a[0]).padStart(+w || 0, "0")));
    return env;
  }
  const SIRA = ["gunes", "ay", "merkur", "venus", "mars", "jupiter", "saturn", "uranus", "neptun", "pluton", "kdugum", "yukselen", "mc"];
  function html(sablon, h, y, marka) {
    const N = {}; h.noktalar.forEach(n => N[n.anahtar] = n);
    const detay = {}; h.acilar.forEach(a => detay[`${a.a} ${a.aci} ${a.b}`] = a);
    const acilar = (y.acilar || []).slice(0, 5).filter(a => detay[a.aci]).map(a => ({ ...detay[a.aci], yorum: a.yorum || "" }));
    const S = x => new nj.runtime.SafeString(x);
    // Jinja'da {% set X %}…{% endset %} blokları güvenli sayılır; Nunjucks kaçırır → |safe ekle
    for (const [, ad] of sablon.matchAll(/\{%\s*set\s+(\w+)\s*%\}/g)) sablon = sablon.split(`{{ ${ad} }}`).join(`{{ ${ad}|safe }}`);
    return ortam().renderString(sablon, {
      h, y, kisi: h.kisi, N, tablo: SIRA.filter(s => N[s]).map(s => N[s]), acilar, marka, ipucu: G.Yorum.V.IPUCU,
      toplam: Math.max(Object.values(h.elementler).reduce((a, b) => a + b, 0), 1),
      cark: S(G.Cark.svg(h, 620)), cark_kucuk: S(G.Cark.svg(h, 420)),
    });
  }
  G.Rapor = { html };
})(typeof window !== "undefined" ? window : globalThis);
