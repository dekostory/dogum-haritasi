/* Doğum Haritası Asistanı — canlı (tarayıcı) sürüm.
   Danışan verileri yalnızca bu cihazın tarayıcısında saklanır; sunucuya hiçbir şey gönderilmez. */
"use strict";
const $ = s => document.querySelector(s);
const e = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ANA = $("#ana");
let SABLON = "", YERLER = null, SURUM = "";

// ---------------- depo ----------------
const ANAHTAR = "dh.musteriler", MARKA = "dh.marka", PIN = "dh.pin", SINASTRI = "dh.sinastriler", SILINEN = "dh.silinenler", BASVURU = "dh.basvuru";
function jOku(k, v) { try { return JSON.parse(localStorage.getItem(k)) ?? v; } catch { return v; } }
function jYaz(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch (err) { alert("Kaydedilemedi: tarayıcı depolama alanı dolu ya da kapalı.\nAyarlar → Yedek indir ile verilerini yedekle."); return false; }
}
const tumu = () => jOku(ANAHTAR, {});
const musteri = id => tumu()[id];
function kaydet(m) { const t = tumu(); m.guncelleme = new Date().toISOString(); t[m.id] = m; jYaz(ANAHTAR, t); senkronZamanla(); }
function mezar(anahtar) { const s = jOku(SILINEN, {}); s[anahtar] = new Date().toISOString(); jYaz(SILINEN, s); }
function sil(id, kalici = true, yeniId = null) {
  const t = tumu(); delete t[id]; jYaz(ANAHTAR, t);
  if (!kalici) return;
  mezar(id);
  const st = jOku(SINASTRI, {});  // bağlı sinastriler: kişi silindiyse silinir, kimliği değiştiyse taşınır
  for (const x of Object.values(st)) {
    if (x.veri.a !== id && x.veri.b !== id) continue;
    delete st[x.id]; mezar("s:" + x.id);
    if (yeniId) { x.veri.a = x.veri.a === id ? yeniId : x.veri.a; x.veri.b = x.veri.b === id ? yeniId : x.veri.b; x.id = `${x.veri.a}__${x.veri.b}`; x.guncelleme = new Date().toISOString(); st[x.id] = x; }
  }
  jYaz(SINASTRI, st); senkronZamanla();
}
function danisanSil(id) {
  const m = musteri(id);
  if (!confirm(`${m.harita.kisi.ad} kalıcı olarak silinsin mi? (Eşitleme açıksa diğer cihazlardan da kaldırılır; Mac'te “_silinenler” klasörüne taşınır.)\n\nSadece listeden kaldırmak istiyorsan “Arşivle”yi kullan.`)) return;
  sil(id, true); tost("Silindi"); git("#liste");
}
const sinastriler = () => jOku(SINASTRI, {});
function sinastriKaydet(x) { const t = sinastriler(); x.guncelleme = new Date().toISOString(); t[x.id] = x; jYaz(SINASTRI, t); senkronZamanla(); }
function sinastriSil(id) { const t = sinastriler(); delete t[id]; jYaz(SINASTRI, t); mezar("s:" + id); senkronZamanla(); }
const PAKET_AD = { temel: "Temel Okuma", detayli: "Detaylı Okuma", premium: "Premium Okuma" };
function marka() {
  const m = jOku(MARKA, {});
  return { ad: "", instagram: "", whatsapp: "", eposta: "", ...m };
}

// ---------------- yardımcılar ----------------
function slug(s) {
  s = s.replace(/ı/g, "i").replace(/İ/g, "I").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\x00-\x7f]/g, "");
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
const AYK = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
function ay_tr(iso) { const [y, m, d] = iso.split("-").map(Number); return `${d} ${AYK[m - 1]} ${y}`; }
const p2 = n => String(n).padStart(2, "0");
function bugunTR() { const d = new Date(); return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`; }
const trdenIso = s => { const [g, a, y] = s.split(".").map(Number); return `${y}-${p2(a)}-${p2(g)}`; };
const isodanTr = s => { const [y, a, g] = s.split("-"); return `${g}.${a}.${y}`; };
function tost(t) { const x = $("#tost"); x.textContent = t; x.style.display = "block"; clearTimeout(tost.z); tost.z = setTimeout(() => x.style.display = "none", 2200); }
function katla(s) {
  s = (s || "").replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
  const a = "ıöüşçğâîû", b = "iouscgaiu";
  for (let i = 0; i < a.length; i++) s = s.split(a[i]).join(b[i]);
  return s.split(/\s+/).filter(Boolean).join(" ");
}

// ---------------- hesaplama (arac/hesapla.py olustur karşılığı) ----------------
function olustur(g, eskiY, taslakYenile) {
  const [gg, aa, yy] = g.tarih.split(".").map(Number);
  const saat = g.saat ? g.saat.split(":").map(Number) : null;
  const h = Astro.harita_hesapla({ y: yy, m: aa, d: gg }, saat, g.enlem, g.boylam, g.tz);
  const rt = g.rapor_tarihi || bugunTR();
  const tr = [];
  if (g.paket === "premium") {
    for (const t of Astro.transitler(h.noktalar, trdenIso(rt))) {
      const ev = t.hedef_ev ? ` (${t.hedef_ev}. ev)` : "";
      tr.push({ donem: `${ay_tr(t.bas)} – ${ay_tr(t.son)}`, hareket: `Transit ${t.transit} ${t.aci_sembol} doğum ${t.hedef}${ev}`,
                transit: t.transit, hedef: t.hedef, aci: t.aci, tur: t.tur, bas: t.bas, son: t.son });
    }
  }
  const kisi = { ad: g.ad, tarih: g.tarih, saat: g.saat || "Bilinmiyor", yer: g.yer || `${g.enlem}, ${g.boylam}`,
                 enlem: g.enlem, boylam: g.boylam, tz: g.tz, paket: g.paket, rapor_tarihi: rt };
  h.kisi = kisi; h.transitler = tr;
  let y;
  if (eskiY && !taslakYenile) {
    y = eskiY;
    const eski = {}; (y.transitler || []).forEach(t => eski[t.hareket] = t.anlam || "");
    y.paket = g.paket;
    y.transitler = tr.map(t => ({ donem: t.donem, hareket: t.hareket, anlam: eski[t.hareket] || "" }));
    const yeniAci = h.acilar.slice(0, 5).map(a => `${a.a} ${a.aci} ${a.b}`);
    if (JSON.stringify(yeniAci) !== JSON.stringify((y.acilar || []).map(a => a.aci))) {  // tarih/saat düzeltilince açılar değişebilir
      const ey = {}; (y.acilar || []).forEach(a => ey[a.aci] = a.yorum);
      y.acilar = yeniAci.map(a => ({ aci: a, yorum: ey[a] || "" }));
      Yorum.uygula(h, y, "acilar", false);
    }
  } else {
    y = Yorum.iskelet(h, kisi, tr);
    if (g.doldur !== false) Yorum.uygula(h, y, null, false);
  }
  return { id: `${slug(g.ad)}-${yy}${p2(aa)}${p2(gg)}`, harita: h, yorumlar: y };
}

// ---------------- yer arama ----------------
async function yerlerYukle() {
  if (YERLER) return YERLER;
  YERLER = await (await fetch("veri/yerler.json")).json();
  YERLER.yerler.forEach(r => r[1] = "|" + r[1]);
  return YERLER;
}
function yerAra(q, limit = 12) {
  if (!YERLER) return [];
  q = katla(q); if (q.length < 2) return [];
  q = YERLER.tr_adlar[q] || q;
  const out = [], aranan = "|" + q;
  for (const r of YERLER.yerler) {
    if (r[1].includes(aranan)) {
      const [ad, , il, u, la, lo, tz] = r, ulke = YERLER.ulkeler[u];
      out.push({ ad, il, ulke, enlem: la, boylam: lo, tz: YERLER.tzler[tz], etiket: [ad, il, ulke].filter(Boolean).join(", ") });
      if (out.length >= limit) break;
    }
  }
  return out;
}

// ---------------- yönlendirme ----------------
function git(h) { if (location.hash === h) yonlendir(); else location.hash = h; }
window.addEventListener("hashchange", yonlendir);
function yonlendir() {
  const h = decodeURIComponent(location.hash.slice(1) || "bugun");
  const [v, id, sekme] = h.split("/");
  window.scrollTo(0, 0);
  if (v === "yeni") return formEkrani();
  if (v === "ayarlar") return ayarlarEkrani();
  if (v === "bugun") return bugunEkrani();
  if (v === "sinastri") return sinastriListe();
  if (v === "s" && id && sinastriler()[id]) return sinastriEkrani(id, sekme || "genel");
  if (v === "basvurular") return basvuruEkrani();
  if (v === "m" && id && musteri(id)) return musteriEkrani(id, sekme || "genel");
  return listeEkrani();
}

// ---------------- liste ----------------
let listeArsiv = false, listeQ = "";
const DURUM = [["basvuru", "Başvuru"], ["gorusme_planlandi", "Görüşme planlandı"], ["gorusme_yapildi", "Görüşme yapıldı"],
               ["rapor_gonderildi", "Rapor gönderildi"], ["tamamlandi", "Tamamlandı"]];
const DURUM_AD = Object.fromEntries(DURUM);
function listeEkrani() {
  const t = Object.values(tumu());
  const aktif = t.filter(m => !(m.takip || {}).arsiv).length, arsiv = t.length - aktif;
  ANA.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
      <div><div class="eyebrow">Danışanlar</div><h1>Kişiler</h1></div><span class="sp"></span>
      <div class="gecis"><button class="${listeArsiv ? "" : "on"}" onclick="listeArsiv=false;listeEkrani()">Aktif (${aktif})</button>
        <button class="${listeArsiv ? "on" : ""}" onclick="listeArsiv=true;listeEkrani()">Arşiv (${arsiv})</button></div>
    </div>
    <input id="lq" placeholder="İsim, burç ya da şehir ara…" value="${e(listeQ)}" style="margin-top:16px" oninput="listeQ=this.value;listeCiz()">
    <div class="liste" id="lst"></div>`;
  listeCiz();
}
function listeCiz() {
  const q = katla(listeQ);
  const t = Object.values(tumu()).filter(m => !!(m.takip || {}).arsiv === listeArsiv)
    .filter(m => !q || katla([m.harita.kisi.ad, m.harita.kisi.yer, ...m.harita.noktalar.filter(n => ["gunes", "ay", "yukselen"].includes(n.anahtar)).map(n => n.burc)].join(" ")).includes(q))
    .sort((a, b) => (b.guncelleme || "").localeCompare(a.guncelleme || ""));
  if (!t.length) {
    $("#lst").innerHTML = `<div class="bos">${listeArsiv ? "Arşivde kimse yok." : q ? "Eşleşen danışan yok." :
      `Henüz danışan yok.<br><br><button class="btn p" onclick="git('#yeni')">＋ İlk okumayı oluştur</button><br><br><span class="durum">Mac'teki danışanlarını getirmek için: Ayarlar → Yedek yükle</span>`}</div>`;
    return;
  }
  $("#lst").innerHTML = t.map(m => {
    const N = Object.fromEntries(m.harita.noktalar.map(n => [n.anahtar, n])), k = m.harita.kisi, tk = m.takip || {};
    const uc = [["☉", N.gunes], ["☽", N.ay], ["AC", N.yukselen]].filter(x => x[1]).map(x => `${x[0]} ${x[1].burc}`).join(" · ");
    return `<div class="card kisi" onclick="git('#m/${e(m.id)}')"><div style="flex:1;min-width:0"><div class="ad">${e(k.ad)}</div>
      <div class="alt">${e(k.tarih)} · ${e(k.saat)} · ${e(k.yer)}</div><div class="alt" style="color:var(--gold)">${e(uc)}</div></div>
      <div style="text-align:right;display:grid;gap:6px;justify-items:end"><span class="rozet">${e(PAKET_AD[k.paket] || k.paket)}</span>
      <span class="durum">${e(DURUM_AD[tk.durum] || "")}</span></div></div>`;
  }).join("");
}

// ---------------- yeni / düzenle formu ----------------
let secilenYer = null;
function formHtml(m) {
  const k = m ? m.harita.kisi : null;
  return `
  <div class="form">
    <div class="tam"><label>Ad Soyad</label><input id="f-ad" value="${e(k ? k.ad : "")}" autocomplete="off"></div>
    <div><label>Doğum tarihi</label><input id="f-tarih" type="date" value="${k ? trdenIso(k.tarih) : ""}"></div>
    <div><label>Doğum saati (yerel)</label><input id="f-saat" type="time" value="${k && k.saat !== "Bilinmiyor" ? e(k.saat) : ""}">
      <label class="chk" style="margin-top:8px"><input type="checkbox" id="f-saatyok" ${k && k.saat === "Bilinmiyor" ? "checked" : ""}> Saat bilinmiyor</label></div>
    <div class="tam" style="position:relative"><label>Doğum yeri</label>
      <input id="f-yer" placeholder="Şehir ya da ilçe yaz (ör. İnegöl, Münih)…" value="${e(k ? k.yer : "")}" autocomplete="off">
      <div class="oneri" id="f-oneri" style="display:none"></div>
      <div class="durum" id="f-yerbilgi" style="margin-top:6px">${k ? `${k.enlem}, ${k.boylam} · ${e(k.tz)}` : ""}</div>
      <details style="margin-top:8px"><summary class="durum" style="cursor:pointer">Koordinatı elle gir</summary>
        <div class="grid g3" style="margin-top:8px"><div><label>Enlem</label><input id="f-enlem" inputmode="decimal" value="${k ? k.enlem : ""}"></div>
        <div><label>Boylam</label><input id="f-boylam" inputmode="decimal" value="${k ? k.boylam : ""}"></div>
        <div><label>Saat dilimi</label><input id="f-tz" value="${e(k ? k.tz : "Europe/Istanbul")}"></div></div></details>
    </div>
    <div><label>Paket</label><select id="f-paket">${Object.entries(PAKET_AD).map(([v, a]) => `<option value="${v}" ${(k ? k.paket : "detayli") === v ? "selected" : ""}>${a}</option>`).join("")}</select></div>
    <div><label>Rapor tarihi</label><input id="f-rt" type="date" value="${trdenIso(k ? k.rapor_tarihi : bugunTR())}"></div>
    ${m ? `<label class="chk tam"><input type="checkbox" id="f-taslak"> Yorumları yeni haritaya göre baştan taslakla (elle yazdıkların silinir)</label>`
        : `<label class="chk tam"><input type="checkbox" id="f-doldur" checked> Yorum taslaklarını otomatik doldur</label>`}
  </div>`;
}
function formBagla(m) {
  secilenYer = m ? { ad: m.harita.kisi.yer, enlem: m.harita.kisi.enlem, boylam: m.harita.kisi.boylam, tz: m.harita.kisi.tz } : null;
  const yer = $("#f-yer"), on = $("#f-oneri"); let sec = [], i = -1;
  yer.addEventListener("focus", () => yerlerYukle());
  yer.addEventListener("input", async () => {
    secilenYer = null; $("#f-yerbilgi").textContent = "";
    await yerlerYukle(); sec = yerAra(yer.value); i = -1;
    on.innerHTML = sec.map((s, j) => `<div data-j="${j}">${e(s.etiket)}</div>`).join("");
    on.style.display = sec.length ? "block" : "none";
  });
  const sec_ = j => { const s = sec[j]; secilenYer = { ad: s.ad, enlem: s.enlem, boylam: s.boylam, tz: s.tz };
    yer.value = s.ad; on.style.display = "none"; $("#f-yerbilgi").textContent = `${s.etiket} · ${s.enlem}, ${s.boylam} · ${s.tz}`;
    $("#f-enlem").value = s.enlem; $("#f-boylam").value = s.boylam; $("#f-tz").value = s.tz; };
  on.addEventListener("mousedown", ev => { const d = ev.target.closest("[data-j]"); if (d) { ev.preventDefault(); sec_(+d.dataset.j); } });
  yer.addEventListener("keydown", ev => {
    if (on.style.display === "none") return;
    if (ev.key === "ArrowDown") { i = Math.min(sec.length - 1, i + 1); ev.preventDefault(); }
    else if (ev.key === "ArrowUp") { i = Math.max(0, i - 1); ev.preventDefault(); }
    else if (ev.key === "Enter" && sec.length) { sec_(Math.max(0, i)); ev.preventDefault(); return; }
    [...on.children].forEach((c, j) => c.classList.toggle("on", j === i));
  });
  yer.addEventListener("blur", () => setTimeout(() => on.style.display = "none", 150));
  $("#f-saatyok").addEventListener("change", ev => { $("#f-saat").disabled = ev.target.checked; });
  $("#f-saat").disabled = $("#f-saatyok").checked;
}
function formOku() {
  const ad = $("#f-ad").value.trim(), t = $("#f-tarih").value, saatYok = $("#f-saatyok").checked, saat = $("#f-saat").value;
  if (!ad) throw "Ad Soyad gerekli.";
  if (!t) throw "Doğum tarihi gerekli.";
  if (!saatYok && !saat) throw "Doğum saatini gir ya da “Saat bilinmiyor”u işaretle.";
  let enlem = parseFloat(String($("#f-enlem").value).replace(",", ".")), boylam = parseFloat(String($("#f-boylam").value).replace(",", "."));
  const tz = $("#f-tz").value.trim();
  const yer = $("#f-yer").value.trim();
  if (isNaN(enlem) || isNaN(boylam)) throw "Doğum yerini listeden seç ya da koordinatı elle gir.";
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); } catch { throw `Saat dilimi tanınmadı: ${tz}`; }
  const rt = $("#f-rt").value;
  return { ad, tarih: isodanTr(t), saat: saatYok ? null : saat, yer: yer || (secilenYer && secilenYer.ad) || "", enlem, boylam, tz,
           paket: $("#f-paket").value, rapor_tarihi: rt ? isodanTr(rt) : bugunTR() };
}
function formEkrani() {
  ANA.innerHTML = `<div class="eyebrow">Yeni Okuma</div><h1>Doğum bilgileri</h1>
    <div class="card" style="margin-top:18px">${formHtml(null)}
      <div style="display:flex;gap:10px;margin-top:18px;align-items:center"><button class="btn p" id="f-git">✨ Haritayı hesapla</button><span class="durum" id="f-durum"></span></div></div>`;
  formBagla(null);
  $("#f-git").onclick = () => {
    let g; try { g = formOku(); } catch (x) { return alert(x); }
    g.doldur = $("#f-doldur").checked;
    $("#f-durum").textContent = "Hesaplanıyor…";
    setTimeout(() => {
      try {
        const r = olustur(g);
        const var_ = musteri(r.id);
        if (var_ && !confirm(`${g.ad} (${g.tarih}) zaten kayıtlı. Yorumları korunarak yeniden hesaplansın mı?`)) { $("#f-durum").textContent = ""; return; }
        const m = var_ ? { ...var_, ...olustur(g, var_.yorumlar) } : { id: r.id, harita: r.harita, yorumlar: r.yorumlar, olusturma: new Date().toISOString(),
          takip: { telefon: "", eposta: "", instagram: "", ucret: "", odeme: "bekliyor", gorusme: "", durum: "basvuru", kaynak: "", gecmis: [], arsiv: false }, notlar: "" };
        kaydet(m); tost("Harita hazır"); git(`#m/${m.id}`);
      } catch (x) { console.error(x); alert("Hesaplanamadı: " + x.message); $("#f-durum").textContent = ""; }
    }, 30);
  };
}
function duzenleAc(id) {
  const m = musteri(id);
  const o = document.createElement("div"); o.className = "ortu";
  o.innerHTML = `<div class="card"><h2>Bilgileri düzenle</h2><div class="durum" style="margin-bottom:14px">Yanlış girilen tarih, saat ya da yeri düzelt. Harita yeniden hesaplanır; yazdığın yorumlar korunur.</div>
    ${formHtml(m)}<div style="display:flex;gap:10px;margin-top:18px"><button class="btn p" id="d-kaydet">Kaydet ve yeniden hesapla</button>
    <button class="btn" id="d-iptal">Vazgeç</button></div></div>`;
  document.body.appendChild(o);
  formBagla(m);
  $("#d-iptal").onclick = () => o.remove();
  $("#d-kaydet").onclick = () => {
    let g; try { g = formOku(); } catch (x) { return alert(x); }
    const yenile = $("#f-taslak").checked;
    if (yenile && !confirm("Tüm yorumlar yeni haritaya göre baştan yazılacak. Emin misin?")) return;
    try {
      const r = olustur(g, yenile ? null : JSON.parse(JSON.stringify(m.yorumlar)), yenile);
      if (r.id !== id && musteri(r.id) && !confirm("Bu ad ve tarihle başka bir kayıt var; üzerine yazılsın mı?")) return;
      const yeni = { ...m, id: r.id, harita: r.harita, yorumlar: r.yorumlar };
      if (r.id !== id) sil(id, true, r.id);
      kaydet(yeni); o.remove(); tost("Güncellendi"); git(`#m/${r.id}`);
    } catch (x) { console.error(x); alert("Hesaplanamadı: " + x.message); }
  };
}

// ---------------- danışan ekranı ----------------
const SEKMELER = [["genel", "Genel"], ["evler", "Evler"], ["acilar", "Açılar"], ["transit", "Transit"], ["yorum", "Yorumlar"], ["takip", "Takip"], ["yillik", "Yıllık"], ["rapor", "Rapor"]];
function musteriEkrani(id, sekme) {
  const m = musteri(id), k = m.harita.kisi, ar = (m.takip || {}).arsiv;
  ANA.innerHTML = `
    <div class="durum"><a href="#liste" style="text-decoration:none">← Danışanlar</a></div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px">
      <h1>${e(k.ad)}</h1>
      <button class="btn k" onclick="duzenleAc('${e(id)}')">✏️ Bilgileri düzenle</button>
      <button class="btn k" onclick="arsivle('${e(id)}', ${!ar})">${ar ? "↩︎ Arşivden çıkar" : "🗄 Arşivle"}</button>
      ${ar ? `<button class="btn k tehlike" onclick="danisanSil('${e(id)}')">🗑 Sil</button>` : ""}
    </div>
    <div class="muted" style="margin-top:6px">${e(k.tarih)} · ${e(k.saat)} · ${e(k.yer)} <span class="durum">(UTC+${e(m.harita.utc_ofset.replace(/:00$/, ""))})</span> · <span class="rozet">${e(PAKET_AD[k.paket])}</span>${ar ? ' <span class="rozet" style="color:var(--muted)">Arşivde</span>' : ""}</div>
    <div class="sekmeler">${SEKMELER.map(([s, a]) => `<button class="${s === sekme ? "on" : ""}" onclick="location.hash='#m/${e(id)}/${s}'">${a}</button>`).join("")}</div>
    <div id="ic"></div>`;
  ({ genel: sGenel, evler: sEvler, acilar: sAcilar, transit: sTransit, yorum: sYorum, takip: sTakip, yillik: sYillik, rapor: sRapor }[sekme] || sGenel)(m);
}
function arsivle(id, durum) {
  const m = musteri(id); m.takip = m.takip || {}; m.takip.arsiv = durum; m.takip.arsiv_tarihi = durum ? bugunTR() : "";
  kaydet(m); tost(durum ? "Arşive taşındı" : "Arşivden çıkarıldı"); musteriEkrani(id, "genel");
}
function sGenel(m) {
  const h = m.harita, N = Object.fromEntries(h.noktalar.map(n => [n.anahtar, n]));
  const toplam = Math.max(Object.values(h.elementler).reduce((a, b) => a + b, 0), 1);
  const SIRA = ["gunes", "ay", "merkur", "venus", "mars", "jupiter", "saturn", "uranus", "neptun", "pluton", "kdugum", "gdugum", "yukselen", "mc"];
  $("#ic").innerHTML = `
    ${h.ay_aralik ? `<div class="uyari" style="margin-bottom:14px">Saat bilinmiyor: evler ve yükselen hesaplanmadı. Ay gün içinde ${e(h.ay_aralik.bas)} → ${e(h.ay_aralik.son)}${h.ay_aralik.burc_degisiyor ? " — <b>burç değiştiriyor!</b>" : "."}</div>` : ""}
    <div class="ust3">${[["gunes", "Güneş"], ["ay", "Ay"], ["yukselen", "Yükselen"]].map(([kk, a]) => { const n = N[kk];
      return `<div class="card"><div class="s">${kk === "yukselen" ? "↑" : n.sembol}</div><div class="b">${n ? e(n.burc) : "—"}</div><div class="e">${a}${n && n.ev && kk !== "yukselen" ? ` · ${n.ev}. ev` : ""}</div></div>`; }).join("")}</div>
    <div class="grid g2" style="margin-top:14px">
      <div class="card carkk">${Cark.svg(h, 520)}</div>
      <div class="card"><table><tr><th>Nokta</th><th>Burç</th><th>Derece</th><th>Ev</th></tr>
        ${SIRA.filter(s => N[s]).map(s => { const n = N[s]; return `<tr><td class="k">${n.sembol} ${e(n.ad)}</td><td>${n.burc_sembol} ${e(n.burc)}</td><td>${n.derece}${n.retro ? " ℞" : ""}</td><td>${n.ev || "—"}</td></tr>`; }).join("")}</table></div>
    </div>
    <div class="grid g2" style="margin-top:14px">
      <div class="card"><h3 style="margin-bottom:10px">Elementler</h3>${Object.entries(h.elementler).map(([a, v]) => `<div class="row"><span>${a}</span><span style="color:var(--gold)">${v}</span></div><div class="bar"><i style="width:${Math.round(v / toplam * 100)}%"></i></div>`).join("")}</div>
      <div class="card"><h3 style="margin-bottom:10px">Nitelikler</h3>${Object.entries(h.nitelikler).map(([a, v]) => `<div class="row"><span>${a}</span><span style="color:var(--gold)">${v}</span></div><div class="bar"><i style="width:${Math.round(v / toplam * 100)}%"></i></div>`).join("")}</div>
    </div>`;
}
function sEvler(m) {
  const h = m.harita;
  if (!h.evler) { $("#ic").innerHTML = `<div class="uyari">Doğum saati bilinmediği için evler hesaplanamadı. Saat öğrenilirse “Bilgileri düzenle” ile ekleyebilirsin.</div>`; return; }
  const Y = Evler.evYorumlari(h);
  $("#ic").innerHTML = `<p class="muted" style="margin-bottom:14px;line-height:1.6">Her evin yorumu; evin burcu, içindeki gezegenler ve ev yöneticisinin durumuna (burcu, evi, gücü, geri hareketi, açıları) göre otomatik hazırlanır. Kopyalayıp rapora ya da mesaja ekleyebilirsin.</p>
    <div class="grid g2">${h.evler.map(ev => `<div class="card"><div class="durum" style="color:var(--gold)">${ev.no}. ev · ${e(ev.alan)}</div>
    <div style="font-size:17px;margin-top:4px">${ev.burc_sembol} ${e(ev.burc)} <span class="durum">${ev.derece}</span></div>
    <div class="durum" style="margin-top:4px">${ev.gezegenler.map(g => `${g.sembol} ${e(g.ad)}`).join(", ") || "&nbsp;"}</div>
    <div class="ev-yorum">${e(Y[ev.no]).split("\n\n").map(x => `<p>${x}</p>`).join("")}</div>
    <button class="btn ev-kopya" data-no="${ev.no}">Kopyala</button></div>`).join("")}</div>`;
  $("#ic").querySelectorAll(".ev-kopya").forEach(b => b.onclick = async () => {
    try { await navigator.clipboard.writeText(Y[b.dataset.no]); tost("Ev yorumu kopyalandı"); } catch { tost("Kopyalanamadı"); }
  });
}
function sAcilar(m) {
  const renk = { uyumlu: "var(--blue)", zor: "var(--red)", "nötr": "var(--gold)" };
  $("#ic").innerHTML = `<div class="card"><table><tr><th>Açı</th><th>Tür</th><th>Orb</th></tr>
    ${m.harita.acilar.map(a => `<tr><td class="k">${a.a_sembol} ${e(a.a)} ${a.aci_sembol} ${a.b_sembol} ${e(a.b)}<div class="durum">${e(a.aci)}</div></td>
    <td style="color:${renk[a.tur]}">${e(a.tur)}</td><td>${a.orb}°</td></tr>`).join("")}</table>
    <div class="durum" style="margin-top:10px">Önem sırasına göre (kişisel noktalar ve dar orb önce). Raporda ilk 5 açı yorumlanır.</div></div>`;
}
function sTransit(m) {
  const tr = m.harita.transitler || [];
  if (m.harita.kisi.paket !== "premium") {
    $("#ic").innerHTML = `<div class="bilgi">Önümüzdeki 12 ayın transitleri Premium pakette hesaplanır. Paketi “Bilgileri düzenle”den Premium yaparsan otomatik eklenir.</div>`; return;
  }
  $("#ic").innerHTML = tr.length ? `<div class="card"><table><tr><th>Dönem</th><th>Hareket</th></tr>
    ${tr.map(t => `<tr><td class="k">${e(t.donem)}</td><td style="color:${t.tur === "zor" ? "var(--red)" : t.tur === "uyumlu" ? "var(--blue)" : "var(--gold)"}">${e(t.hareket)}</td></tr>`).join("")}</table>
    <div class="durum" style="margin-top:10px">Rapor tarihinden (${e(m.harita.kisi.rapor_tarihi)}) itibaren 12 ay, 1° orb.</div></div>`
    : `<div class="bilgi">Önümüzdeki 12 ayda yavaş gezegenlerden kişisel noktalara majör açı yok.</div>`;
}

const ALANLAR = [["hosgeldin", "Hoş geldin"], ["gunes", "☉ Güneş"], ["ay", "☽ Ay"], ["yukselen", "↑ Yükselen"], ["merkur", "☿ Merkür"], ["venus", "♀ Venüs"],
  ["mars", "♂ Mars"], ["jupiter", "♃ Jüpiter"], ["saturn", "♄ Satürn"], ["uranus", "♅ Uranüs"], ["neptun", "♆ Neptün"], ["pluton", "♇ Plüton"],
  ["element_yorumu", "Element dengesi"], ["evler_yorumu", "Evler"], ["acilar", "Açılar"], ["iliskiler", "♡ İlişkiler"], ["kariyer", "◈ Kariyer"],
  ["yasam_yolu", "☊ Yaşam yolu"], ["guclu_yonler", "Güçlü yönler"], ["gelisim_alanlari", "Gelişim alanları"], ["transitler", "Dönemler (Premium)"], ["kapanis", "Kapanış"]];
let yzTmr;
function sYorum(m) {
  const y = m.yorumlar, ip = Yorum.V.IPUCU;
  const ta = (yol, v, ipucu, sat = 5) => `<textarea data-yol="${yol}" rows="${sat}" placeholder="${e(ipucu || "")}">${e(v)}</textarea>`;
  const blok = ([k, a]) => {
    if (k === "transitler" && !(y.transitler || []).length) return "";
    let ic;
    if (k === "acilar") ic = (y.acilar || []).map((x, i) => `<div style="margin-bottom:10px"><div class="durum" style="margin-bottom:4px;color:var(--ink)">${e(x.aci)}</div>${ta(`acilar.${i}.yorum`, x.yorum, ip.aci, 3)}</div>`).join("");
    else if (k === "transitler") ic = y.transitler.map((x, i) => `<div style="margin-bottom:10px"><div class="durum" style="margin-bottom:4px;color:var(--ink)">${e(x.donem)} · ${e(x.hareket)}</div>${ta(`transitler.${i}.anlam`, x.anlam, "Bu dönemin anlamı", 2)}</div>`).join("");
    else if (k === "guclu_yonler" || k === "gelisim_alanlari") ic = (y[k] || []).map((x, i) => `<input data-yol="${k}.${i}" value="${e(x)}" style="margin-bottom:6px">`).join("");
    else ic = ta(k, y[k], ip[k], k === "hosgeldin" || k === "kapanis" ? 4 : 6);
    return `<div class="card alan" id="a-${k}"><div class="bas"><b>${a}</b><span class="sp"></span><button class="btn k" onclick="taslak('${e(m.id)}','${k}')">↻ Taslak</button></div>${ic}</div>`;
  };
  $("#ic").innerHTML = `
    <div class="bilgi" style="margin-bottom:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <span style="flex:1;min-width:220px">Yazdıkların otomatik kaydedilir. Boş bıraktığın bölümler raporda yönlendirme metni olarak görünür.</span>
      <button class="btn k" onclick="bosDoldur('${e(m.id)}')">✨ Boşları taslakla doldur</button><span class="durum" id="yz-durum"></span></div>
    ${ALANLAR.map(blok).join("")}`;
  const boy = t => { t.style.height = "auto"; t.style.height = (t.scrollHeight + 2) + "px"; };
  document.querySelectorAll("#ic textarea").forEach(boy);
  $("#ic").addEventListener("input", ev => {
    if (ev.target.tagName === "TEXTAREA") boy(ev.target);
    const yol = ev.target.dataset.yol; if (!yol) return;
    const mm = musteri(m.id), p = yol.split(".");
    let o = mm.yorumlar; for (let i = 0; i < p.length - 1; i++) o = o[isNaN(p[i]) ? p[i] : +p[i]];
    o[isNaN(p[p.length - 1]) ? p[p.length - 1] : +p[p.length - 1]] = ev.target.value;
    $("#yz-durum").textContent = "…"; clearTimeout(yzTmr);
    yzTmr = setTimeout(() => { kaydet(mm); $("#yz-durum").textContent = "✓ kaydedildi"; }, 500);
  });
}
function taslak(id, alan) {
  const m = musteri(id);
  const dolu = alan === "acilar" ? m.yorumlar.acilar.some(a => a.yorum) : alan === "transitler" ? m.yorumlar.transitler.some(t => t.anlam)
    : Array.isArray(m.yorumlar[alan]) ? m.yorumlar[alan].some(Boolean) : !!m.yorumlar[alan];
  if (dolu && !confirm("Bu bölümdeki metnin taslakla değiştirilecek. Devam edilsin mi?")) return;
  Yorum.uygula(m.harita, m.yorumlar, alan, true); kaydet(m);
  const sc = window.scrollY; musteriEkrani(id, "yorum"); window.scrollTo(0, sc); tost("Taslak yazıldı");
}
function bosDoldur(id) {
  const m = musteri(id); Yorum.uygula(m.harita, m.yorumlar, null, false); kaydet(m); musteriEkrani(id, "yorum"); tost("Boş bölümler dolduruldu");
}
function sTakip(m) {
  const t = { telefon: "", eposta: "", instagram: "", ucret: "", odeme: "bekliyor", gorusme: "", durum: "basvuru", kaynak: "", gecmis: [], ...(m.takip || {}) };
  const sel = (id, v, ops) => `<select id="${id}">${ops.map(([a, b]) => `<option value="${e(a)}" ${a === v ? "selected" : ""}>${e(b)}</option>`).join("")}</select>`;
  const tel = (t.telefon || "").replace(/\D/g, "").replace(/^0/, "90");
  $("#ic").innerHTML = `<div class="card"><div class="form">
    <div><label>Telefon</label><input id="tk-telefon" type="tel" value="${e(t.telefon)}"></div>
    <div><label>E-posta</label><input id="tk-eposta" type="email" value="${e(t.eposta)}"></div>
    <div><label>Instagram</label><input id="tk-instagram" value="${e(t.instagram)}"></div>
    <div><label>Nereden geldi?</label>${sel("tk-kaynak", t.kaynak, [["", "—"], ["Instagram", "Instagram"], ["Tavsiye", "Tavsiye"], ["Online form", "Online form"], ["Hediye kartı", "Hediye kartı"], ["Diğer", "Diğer"]])}</div>
    <div><label>Ücret</label><input id="tk-ucret" inputmode="decimal" value="${e(t.ucret)}"></div>
    <div><label>Ödeme</label>${sel("tk-odeme", t.odeme, [["bekliyor", "Bekliyor"], ["alindi", "Alındı"], ["yok", "Ücretsiz / yok"]])}</div>
    <div><label>Görüşme tarihi</label><input id="tk-gorusme" type="datetime-local" value="${e(t.gorusme)}"></div>
    <div><label>Durum</label>${sel("tk-durum", t.durum, DURUM)}</div>
    <div class="tam"><div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><label style="margin:0">Görüşme notları</label><span class="sp"></span>
      <button class="btn k" type="button" id="tk-ses" onclick="sesleYaz('#tk-notlar', this)">🎙 Sesle yaz</button></div><textarea id="tk-notlar" rows="6" placeholder="Danışanın söyledikleri, soruları, öne çıkan konular…">${e(m.notlar || "")}</textarea></div>
  </div>
  <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;align-items:center"><button class="btn p" id="tk-kaydet">Kaydet</button>
    ${tel ? `<a class="btn" href="https://wa.me/${tel}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ""}
    ${t.eposta ? `<a class="btn" href="mailto:${e(t.eposta)}">✉️ E-posta</a>` : ""}<span class="durum">${t.odeme_tarihi ? `Ödeme alındı: ${e(t.odeme_tarihi)}` : ""}</span></div>
  ${t.gecmis.length ? `<div class="durum" style="margin-top:14px">${t.gecmis.slice().reverse().map(g => `${e(g.zaman)} · ${e(DURUM_AD[g.durum] || g.durum)}`).join("<br>")}</div>` : ""}</div>`;
  let ntTmr; $("#tk-notlar").addEventListener("input", () => { clearTimeout(ntTmr); ntTmr = setTimeout(() => { const mm = musteri(m.id); mm.notlar = $("#tk-notlar").value; kaydet(mm); }, 800); });
  $("#tk-kaydet").onclick = () => {
    const mm = musteri(m.id), tk = { ...t, ...(mm.takip || {}) }, yeni = {};
    ["telefon", "eposta", "instagram", "kaynak", "ucret", "odeme", "gorusme", "durum"].forEach(a => yeni[a] = $("#tk-" + a).value);
    const zaman = new Date().toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }).replace(",", "");
    if (yeni.durum !== tk.durum) tk.gecmis = [...(tk.gecmis || []), { durum: yeni.durum, zaman }];
    if (yeni.odeme === "alindi" && tk.odeme !== "alindi") tk.odeme_tarihi = bugunTR();
    mm.takip = { ...tk, ...yeni }; mm.notlar = $("#tk-notlar").value; kaydet(mm); tost("Kaydedildi"); musteriEkrani(m.id, "takip");
  };
}
function kontrol(m) {
  const y = m.yorumlar, bos = [];
  ALANLAR.forEach(([k, a]) => {
    if (k === "acilar") { if (y.acilar.some(x => !x.yorum)) bos.push(a); }
    else if (k === "transitler") { if (m.harita.kisi.paket === "premium" && y.transitler.some(x => !x.anlam)) bos.push(a); }
    else if (Array.isArray(y[k])) { if (y[k].some(x => !x)) bos.push(a); }
    else if (k === "evler_yorumu" && !m.harita.evler) { /* saat yok */ }
    else if (!String(y[k] || "").trim()) bos.push(a);
  });
  const kosel = ALANLAR.filter(([k]) => typeof y[k] === "string" && /\[[^\]]{2,}\]/.test(y[k])).map(x => x[1]);
  return { bos, kosel };
}
function sRapor(m) {
  const k = kontrol(m), mk = marka();
  $("#ic").innerHTML = `<div class="card">
    <h3>Kişisel rapor (PDF)</h3>
    <p class="muted" style="margin:8px 0 14px;line-height:1.6"><b>PDF indir</b> raporu doğrudan dosya olarak hazırlar (10–20 sn). Telefonda ardından “Paylaş” ile WhatsApp'a gönderebilir ya da Dosyalar'a kaydedebilirsin.
      <b>Önizle / yazdır</b> raporu yeni sekmede açar; oradan da yazdırıp PDF alabilirsin.</p>
    ${k.bos.length ? `<div class="uyari" style="margin-bottom:12px">Boş bölümler (raporda yönlendirme metni görünecek): ${k.bos.map(e).join(", ")}</div>` : `<div class="bilgi" style="margin-bottom:12px">✓ Tüm bölümler dolu.</div>`}
    ${k.kosel.length ? `<div class="uyari" style="margin-bottom:12px">Köşeli parantez içinde kalmış metin var: ${k.kosel.map(e).join(", ")}</div>` : ""}
    ${!mk.ad ? `<div class="uyari" style="margin-bottom:12px">Marka adı girilmemiş; raporun alt bilgisi boş kalacak. <a href="#ayarlar">Ayarlar</a></div>` : ""}
    ${raporIslemHtml("rapor", m.id)}</div>
    <div class="card" style="margin-top:14px"><h3>🔗 Danışana rapor linki</h3>
      <p class="muted" style="margin:8px 0 12px;line-height:1.6">PDF yerine telefonda rahat okunan bir sayfa. Rapor linkin içinde şifreli taşınır; hiçbir sunucuya kaydedilmez.
        İstersen bir şifre koy, şifreyi danışana ayrıca söyle.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="lk-sifre" placeholder="Şifre (isteğe bağlı)" style="max-width:240px" autocomplete="off">
        <button class="btn p" onclick="linkOlustur('${e(m.id)}')">Link oluştur</button></div><div id="lk-sonuc" style="margin-top:12px"></div></div>`;
}
function raporAc(id) {
  const m = musteri(id);
  const w = window.open("", "_blank");
  if (!w) return alert("Tarayıcı yeni sekmeyi engelledi. Bu site için açılır pencerelere izin ver.");
  const cubuk = `<style>@media print{#yaz{display:none!important}}</style><div id="yaz" style="position:fixed;right:16px;top:16px;z-index:9;display:flex;gap:8px">
    <button onclick="window.print()" style="font:600 15px Inter,Arial;background:#d8b46a;color:#1a1630;border:0;border-radius:10px;padding:12px 18px;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.5)">🖨 PDF olarak kaydet</button></div>`;
  let html = Rapor.html(SABLON, m.harita, m.yorumlar, marka());
  html = html.replace("</body>", cubuk + "</body>").replace(/<title>[^<]*<\/title>/, `<title>${e(slug(m.harita.kisi.ad))}-dogum-haritasi-raporu</title>`);
  w.document.open(); w.document.write(html); w.document.close();
}

// ---------------- ayarlar ----------------
function ayarlarEkrani() {
  const mk = marka(), t = Object.keys(tumu()).length;
  setTimeout(() => { senkronKart(); basvuruKart(); }, 0);
  ANA.innerHTML = `<div class="eyebrow">Ayarlar</div><h1>Marka, yedek ve güvenlik</h1>
  <div class="grid" style="margin-top:18px">
    <div class="card"><h3 style="margin-bottom:12px">Marka bilgileri (raporda görünür)</h3><div class="form">
      <div><label>Marka adı</label><input id="mk-ad" value="${e(mk.ad)}"></div><div><label>Instagram</label><input id="mk-instagram" value="${e(mk.instagram)}"></div>
      <div><label>WhatsApp</label><input id="mk-whatsapp" value="${e(mk.whatsapp)}"></div><div><label>E-posta</label><input id="mk-eposta" value="${e(mk.eposta)}"></div></div>
      <button class="btn p" style="margin-top:14px" onclick="markaKaydet()">Kaydet</button></div>
    <div class="card" id="senkron-kart"></div>
    <div class="card" id="basvuru-kart"></div>
    <div class="card"><h3 style="margin-bottom:8px">Yedek ve Mac ile aktarım</h3>
      <p class="muted" style="line-height:1.6;margin-bottom:12px">Danışanlar <b>sadece bu cihazda</b> saklanır (${t} kişi). Telefonu değiştirir ya da tarayıcı verilerini silersen kaybolur; ara ara yedek indir.
        Aynı yedek dosyası Mac'teki panele de yüklenebilir, Mac'teki danışanlar da buraya alınabilir (Mac panelinde: Ayarlar → Canlı sürüm).</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn p" onclick="yedekIndir()">⬇️ Yedek indir</button>
        <label class="btn" style="margin:0">⬆️ Yedek yükle<input type="file" accept=".json,application/json" style="display:none" onchange="yedekYukle(this.files[0]);this.value=''"></label></div></div>
    <div class="card"><h3 style="margin-bottom:8px">PIN kilidi</h3>
      <p class="muted" style="line-height:1.6;margin-bottom:12px">Bu cihazda uygulama açılırken PIN sorulur. ${localStorage.getItem(PIN) ? "<b>Şu an açık.</b>" : "Şu an kapalı."}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="yeni-pin" type="password" inputmode="numeric" placeholder="Yeni PIN (en az 4 hane)" style="max-width:220px">
        <button class="btn" onclick="pinAyarla()">PIN belirle</button>${localStorage.getItem(PIN) ? `<button class="btn tehlike" onclick="pinKaldir()">Kilidi kaldır</button>` : ""}</div></div>
    <div class="card"><h3 style="margin-bottom:8px">Hakkında</h3><p class="muted" style="line-height:1.6">Sürüm: ${e(SURUM)} · Hesaplama: tropikal zodyak, Placidus evler, gerçek Ay düğümü (Astronomy Engine; Mac panelindeki Swiss Ephemeris ile ~1 yay dakikası içinde aynı).
      Yer verisi: GeoNames (CC-BY 4.0). Mac panelindeki sinastri, yıllık harita, içerik stüdyosu, sesli rapor ve Claude yazımı bu sürümde yok.</p>
      ${t ? `<button class="btn tehlike" style="margin-top:12px" onclick="hepsiniSil()">Bu cihazdaki tüm danışanları sil</button>` : ""}</div>
  </div>`;
}
function markaKaydet() { const m = {}; ["ad", "instagram", "whatsapp", "eposta"].forEach(a => m[a] = $("#mk-" + a).value.trim()); m.guncelleme = new Date().toISOString(); jYaz(MARKA, m); senkronZamanla(); tost("Kaydedildi"); }
function yedekIndir() {
  const veri = { tur: "dogum-haritasi-yedek", surum: 2, tarih: new Date().toISOString(), kaynak: "canli", marka: marka(), musteriler: Object.values(tumu()),
                 sinastriler: Object.values(sinastriler()), silinenler: jOku(SILINEN, {}) };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(veri, null, 1)], { type: "application/json" }));
  const d = new Date(); a.download = `dogum-haritasi-yedek-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}.json`;
  document.body.appendChild(a); a.click(); a.remove(); tost("Yedek indirildi");
}
async function yedekYukle(f) {
  if (!f) return;
  let v; try { v = JSON.parse(await f.text()); } catch { return alert("Dosya okunamadı (JSON değil)."); }
  if (v.tur !== "dogum-haritasi-yedek" || !Array.isArray(v.musteriler)) return alert("Bu bir Doğum Haritası yedek dosyası değil.");
  const t = tumu(); let yeni = 0, guncel = 0, atla = 0;
  for (const m of v.musteriler) {
    if (!m.id || !m.harita || !m.yorumlar) continue;
    const var_ = t[m.id];
    if (!var_) { t[m.id] = m; yeni++; }
    else if ((m.guncelleme || "") > (var_.guncelleme || "")) { t[m.id] = m; guncel++; }
    else atla++;
  }
  const st = sinastriler();
  for (const x of v.sinastriler || []) if (x.id && x.veri && (!st[x.id] || (x.guncelleme || "") > (st[x.id].guncelleme || ""))) st[x.id] = x;
  jYaz(SINASTRI, st);
  const mk = marka();
  if (v.marka && !mk.ad && v.marka.ad && !String(v.marka.ad).startsWith("[")) jYaz(MARKA, v.marka);
  if (jYaz(ANAHTAR, t)) { senkronZamanla(); alert(`Yüklendi.\nYeni: ${yeni}\nGüncellenen: ${guncel}\nDeğişmeyen (bu cihazdaki daha yeni): ${atla}`); git("#liste"); }
}
function hepsiniSil() {
  if (Senkron.kurulu()) return alert("Eşitleme açıkken danışanlar buluttan geri gelir. Önce Ayarlar → Otomatik eşitleme → “Bu cihazda kapat”.");
  if (!confirm("Bu cihazdaki TÜM danışanlar silinecek. Önce yedek indirdin mi?")) return;
  if (prompt("Onay için SİL yaz") !== "SİL") return;
  localStorage.removeItem(ANAHTAR); tost("Silindi"); git("#liste");
}

// ---------------- PIN ----------------
async function ozet(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("dh:" + s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
async function pinAyarla() { const p = $("#yeni-pin").value.trim(); if (p.length < 4) return alert("PIN en az 4 karakter olmalı."); localStorage.setItem(PIN, await ozet(p)); tost("PIN kilidi açık"); ayarlarEkrani(); }
function pinKaldir() { if (confirm("PIN kilidi kaldırılsın mı?")) { localStorage.removeItem(PIN); ayarlarEkrani(); } }
async function kilitAc() {
  if (await ozet($("#pin").value) === localStorage.getItem(PIN)) { $("#kilit").style.display = "none"; sessionStorage.setItem("dh.acik", "1"); yonlendir(); }
  else { $("#pinhata").textContent = "PIN yanlış"; $("#pin").value = ""; }
}

// ---------------- başlangıç ----------------
(async function () {
  try {
    const [yv, sb, sv] = await Promise.all([fetch("veri/yorum.json").then(r => r.json()), fetch("sablon/rapor.html.j2").then(r => r.text()),
      fetch("veri/surum.json").then(r => r.json()).catch(() => ({}))]);
    Yorum.yukle(yv); SABLON = sb; SURUM = sv.surum || "";
  } catch (x) { ANA.innerHTML = `<div class="uyari">Uygulama dosyaları yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.</div>`; return; }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  senkronBaslat();
  if (localStorage.getItem(PIN) && !sessionStorage.getItem("dh.acik")) {
    $("#kilit").style.display = "flex"; $("#pin").focus();
    $("#pin").addEventListener("keydown", ev => { if (ev.key === "Enter") kilitAc(); });
    return;
  }
  yonlendir();
})();
