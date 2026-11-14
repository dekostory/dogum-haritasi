/* Canlı sürüm ek özellikleri: eşitleme, Bugün ekranı, sinastri, yıllık harita, PDF indirme, rapor linki, başvurular, sesle not. */
"use strict";
let SABLONLAR = {};
async function sablon(ad) {
  if (ad === "rapor") return SABLON;
  if (!SABLONLAR[ad]) SABLONLAR[ad] = await (await fetch(`sablon/${ad}.html.j2`)).text();
  return SABLONLAR[ad];
}
const sitekok = () => location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");

/* =================== EŞİTLEME =================== */
let snTmr = null, snPeriyot = null;
function yerelOku() {
  return { musteriler: tumu(), sinastriler: sinastriler(), silinenler: jOku(SILINEN, {}), marka: jOku(MARKA, {}), basvuru: jOku(BASVURU, null) };
}
function yerelYaz(M) {
  const F = Senkron.birlestir(yerelOku(), M);  // eşitleme sürerken yapılan değişiklikler kaybolmasın
  jYaz(ANAHTAR, F.musteriler); jYaz(SINASTRI, F.sinastriler); jYaz(SILINEN, F.silinenler);
  if (F.marka && Object.keys(F.marka).length) jYaz(MARKA, F.marka);
  if (F.basvuru) jYaz(BASVURU, F.basvuru);
}
function senkronIsaret(d, ipucu) {
  const x = $("#sn-durum"); if (!x) return;
  x.style.display = Senkron.kurulu() ? "" : "none";
  x.textContent = { ok: "☁︎", calisiyor: "⟳", hata: "⚠︎" }[d] || "☁︎";
  x.title = ipucu || ""; x.style.color = d === "hata" ? "var(--red)" : d === "ok" ? "var(--green)" : "var(--muted)";
}
function senkronZamanla(ms = 3000) { if (!Senkron.kurulu()) return; clearTimeout(snTmr); snTmr = setTimeout(() => senkronSimdi(true), ms); }
async function senkronSimdi(sessiz) {
  if (!Senkron.kurulu()) return;
  senkronIsaret("calisiyor", "Eşitleniyor…");
  try {
    const r = await Senkron.esitle(yerelOku, yerelYaz);
    senkronIsaret("ok", "Eşitlendi " + new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }));
    const a = document.activeElement;
    if (r.degisti && !(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) { yonlendir(); if (!sessiz) tost("Diğer cihazlardaki değişiklikler alındı"); }
    else if (!sessiz) tost("Eşitlendi");
    if ($("#senkron-kart")) senkronKart();
    return r;
  } catch (x) { senkronIsaret("hata", x.message); if (!sessiz) alert("Eşitlenemedi: " + x.message); }
}
function senkronBaslat() {
  senkronIsaret("ok");
  if (!Senkron.kurulu()) return;
  senkronSimdi(true);
  clearInterval(snPeriyot); snPeriyot = setInterval(() => senkronSimdi(true), 5 * 60000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") senkronZamanla(500); });
}
function senkronKart() {
  const a = Senkron.ayar(), k = Senkron.kurulu();
  $("#senkron-kart").innerHTML = `<h3 style="margin-bottom:8px">☁︎ Otomatik eşitleme (Mac ↔ telefon)</h3>
    <p class="muted" style="line-height:1.6;margin-bottom:12px">Danışanlar, sinastriler ve yıllık haritalar senin şifrenle <b>şifrelenip</b> GitHub'daki gizli bir alanda buluşur; Mac paneli ve bu cihaz aynı listeyi görür.
      GitHub dahil kimse içeriği okuyamaz. <b>Şifreyi unutursan buluttaki kopya açılamaz</b> (cihazlardaki kayıtlar durur).</p>
    ${k ? `<div class="bilgi" style="margin-bottom:12px">✓ Açık · ${a.son ? "Son eşitleme: " + new Date(a.son).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "henüz eşitlenmedi"}
      ${a.hata ? `<br><span style="color:var(--red)">Son hata: ${e(a.hata)}</span>` : ""}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn p" onclick="senkronSimdi()">⟳ Şimdi eşitle</button><button class="btn tehlike" onclick="senkronKapat()">Bu cihazda kapat</button></div>`
    : `<div class="form">
      <div class="tam"><label>GitHub anahtarı (yalnızca “gist” izni)</label><input id="sn-token" type="password" autocomplete="off" placeholder="ghp_…">
        <div class="durum" style="margin-top:6px"><a href="https://github.com/settings/tokens/new?scopes=gist&description=Dogum%20Haritasi%20esitleme" target="_blank" rel="noopener">Buradan oluştur</a> (dekostory hesabıyla giriş yap → süreyi “No expiration” seç → Generate → kopyala).</div></div>
      <div><label>Eşitleme şifresi</label><input id="sn-sifre" type="password" autocomplete="new-password" placeholder="Mac panelindekiyle aynı"></div>
      <div><label>Şifre (tekrar)</label><input id="sn-sifre2" type="password" autocomplete="new-password"></div></div>
      <button class="btn p" style="margin-top:14px" onclick="senkronKur()">Eşitlemeyi aç</button>`}`;
}
async function senkronKur() {
  const token = $("#sn-token").value.trim(), s1 = $("#sn-sifre").value, s2 = $("#sn-sifre2").value;
  if (!token) return alert("GitHub anahtarını yapıştır.");
  if (s1.length < 8) return alert("Şifre en az 8 karakter olmalı.");
  if (s1 !== s2) return alert("Şifreler aynı değil.");
  Senkron.ayarYaz({ token, sifre: s1, gist_id: null, hata: "" });
  const r = await senkronSimdi();
  if (!r) { Senkron.ayarYaz({ token: "", sifre: "" }); senkronKart(); return; }
  senkronBaslat(); senkronKart(); tost("Eşitleme açıldı");
}
function senkronKapat() { if (!confirm("Bu cihazda eşitleme kapatılsın mı? Kayıtlar bu cihazda kalır.")) return; Senkron.ayarYaz({ token: "", sifre: "", gist_id: null }); clearInterval(snPeriyot); senkronIsaret(); senkronKart(); }

/* =================== BUGÜN =================== */
const AY_UZUN = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
function sonrakiDogumGunu(tarih) {
  const [g, a] = tarih.split(".").map(Number), b = new Date(); b.setHours(0, 0, 0, 0);
  for (const y of [b.getFullYear(), b.getFullYear() + 1]) { const d = new Date(y, a - 1, g); if (d >= b) return { gun: Math.round((d - b) / 864e5), yil: y }; }
}
function bugunEkrani() {
  const t = Object.values(tumu()), aktif = t.filter(m => !(m.takip || {}).arsiv), simdi = new Date();
  const kart = (baslik, satirlar, bos) => `<div class="card"><h3 style="margin-bottom:10px">${baslik}</h3>${satirlar.length ? satirlar.join("") : `<div class="durum">${bos}</div>`}</div>`;
  const satir = (m, sag, alt, hedef = "") => `<div class="kisi" style="padding:9px 0;border-bottom:1px solid var(--soft)" onclick="git('#m/${e(m.id)}${hedef}')">
    <div style="flex:1;min-width:0"><div>${e(m.harita.kisi.ad)}</div>${alt ? `<div class="durum">${alt}</div>` : ""}</div><span class="durum" style="text-align:right">${sag}</span></div>`;
  const gor = aktif.filter(m => m.takip && m.takip.gorusme).map(m => [m, new Date(m.takip.gorusme)])
    .filter(([, d]) => !isNaN(d) && d > new Date(simdi - 3 * 3600e3) && d < new Date(+simdi + 7 * 864e5)).sort((a, b) => a[1] - b[1])
    .map(([m, d]) => satir(m, d.toLocaleString("tr-TR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), PAKET_AD[m.harita.kisi.paket], "/takip"));
  const odeme = aktif.filter(m => m.takip && m.takip.odeme === "bekliyor" && m.takip.durum !== "basvuru").map(m => satir(m, m.takip.ucret ? e(m.takip.ucret) + " ₺" : "", DURUM_AD[m.takip.durum], "/takip"));
  const rapor = aktif.filter(m => m.takip && m.takip.durum === "gorusme_yapildi").map(m => satir(m, "Rapor bekliyor", "", "/rapor"));
  const basv = aktif.filter(m => (m.takip || {}).durum === "basvuru").map(m => satir(m, "Başvuru", m.harita.kisi.tarih, "/takip"));
  const dg = t.map(m => [m, sonrakiDogumGunu(m.harita.kisi.tarih)]).filter(([, x]) => x && x.gun <= 30).sort((a, b) => a[1].gun - b[1].gun)
    .map(([m, x]) => satir(m, x.gun === 0 ? "🎂 Bugün" : `${x.gun} gün`, `${x.yil} yıllık haritası ${(m.yillik || {})[x.yil] ? "hazır" : "teklif edilebilir"}`, "/yillik"));
  const bugunIso = new Date().toISOString().slice(0, 10), donem = [];
  for (const m of t) {
    for (const tr of Astro.transitler(m.harita.noktalar, bugunIso, 0)) {
      if (["Ay", "Güneş", "Yükselen", "Tepe Noktası (MC)", "Venüs"].includes(tr.hedef))
        donem.push(satir(m, `<span style="color:${tr.tur === "zor" ? "var(--red)" : tr.tur === "uyumlu" ? "var(--blue)" : "var(--gold)"}">${e(tr.transit)} ${tr.aci_sembol} ${e(tr.hedef)}</span>`,
          (m.takip || {}).arsiv ? "Arşivde · yeniden iletişim fırsatı" : "", "/genel"));
    }
  }
  const tarih = `${simdi.getDate()} ${AY_UZUN[simdi.getMonth()]} ${simdi.getFullYear()}, ${simdi.toLocaleDateString("tr-TR", { weekday: "long" })}`;
  ANA.innerHTML = `<div class="eyebrow">${e(tarih)}</div><h1>Bugün</h1>
    <div id="bg-basvuru" style="margin-top:14px"></div>
    <div class="grid g2" style="margin-top:14px">
      ${kart("📅 Görüşmeler (7 gün)", gor, "Planlı görüşme yok.")}
      ${kart("📝 Rapor bekleyenler", rapor, "Görüşmesi yapılıp raporu gönderilmemiş kimse yok.")}
      ${kart("💳 Ödemesi bekleyenler", odeme, "Bekleyen ödeme yok.")}
      ${kart("📥 Başvuru aşamasında", basv, "Başvuru aşamasında kimse yok.")}
      ${kart("🎂 Yaklaşan doğum günleri (30 gün)", dg, "Önümüzdeki 30 günde doğum günü yok.")}
      ${kart("✨ Önemli dönemdekiler", donem, "Bugün yavaş gezegenlerden Güneş, Ay, Venüs, Yükselen ya da MC'ye tam açı alan danışan yok.")}
    </div>
    ${!t.length ? `<div class="bos">Henüz danışan yok. <a href="#yeni">İlk okumayı oluştur</a>${Senkron.kurulu() ? "" : " ya da Ayarlar'dan eşitlemeyi aç."}</div>` : ""}`;
  basvuruOzet();
}

/* =================== RAPOR İŞLEMLERİ (PDF / yazdır) =================== */
async function raporHtmlUret(tur, id, yil) {
  if (tur === "rapor") { const m = musteri(id); return [Rapor.html(SABLON, m.harita, m.yorumlar, marka()), `${slug(m.harita.kisi.ad)}-dogum-haritasi-raporu.pdf`]; }
  if (tur === "solar") { const m = musteri(id), x = m.yillik[yil]; return [Rapor.solarHtml(await sablon("solar"), x.harita, x.yorumlar, marka()), `${slug(m.harita.kisi.ad)}-${yil}-yillik-harita.pdf`]; }
  if (tur === "sinastri") {
    const x = sinastriler()[id], a = musteri(x.veri.a), b = musteri(x.veri.b);
    if (!a || !b) throw new Error("Bu sinastrideki danışanlardan biri bu cihazda yok.");
    const A = a.harita.kisi.ad.split(" ")[0], B = b.harita.kisi.ad.split(" ")[0];
    return [Rapor.sinastriHtml(await sablon("sinastri"), a.harita, b.harita, x.veri, x.yorumlar, marka()), `${slug(A)}-${slug(B)}-iliski-uyumu-raporu.pdf`];
  }
}
function raporIslemHtml(tur, id, yil = "") {
  return `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <button class="btn p" onclick="pdfIndir('${tur}','${e(id)}','${yil}',this)">⬇️ PDF indir / paylaş</button>
    <button class="btn" onclick="yazdirAc('${tur}','${e(id)}','${yil}')">🖨 Önizle / yazdır</button><span class="durum pdf-durum"></span></div>`;
}
async function pdfIndir(tur, id, yil, btn) {
  const durum = btn.parentElement.querySelector(".pdf-durum");
  btn.disabled = true;
  try {
    const [html, ad] = await raporHtmlUret(tur, id, yil);
    const dosya = await PDF.pdfUret(html, ad, (i, n) => durum.textContent = `Hazırlanıyor… ${i}/${n}`);
    durum.innerHTML = "";
    const b = document.createElement("button"); b.className = "btn p"; b.textContent = /iPhone|iPad|Android/i.test(navigator.userAgent) ? "📤 Paylaş / kaydet" : "💾 Kaydet";
    b.onclick = () => PDF.paylasVeyaIndir(dosya);
    durum.appendChild(b);
    durum.insertAdjacentHTML("beforeend", ` <span>${(dosya.size / 1048576).toFixed(1)} MB hazır</span>`);
    if (!/iPhone|iPad|Android/i.test(navigator.userAgent)) PDF.paylasVeyaIndir(dosya);
  } catch (x) { console.error(x); durum.textContent = ""; alert("PDF oluşturulamadı: " + x.message); }
  finally { btn.disabled = false; }
}
async function yazdirAc(tur, id, yil) {
  const w = window.open("", "_blank");
  if (!w) return alert("Tarayıcı yeni sekmeyi engelledi. Bu site için açılır pencerelere izin ver.");
  const [html, ad] = await raporHtmlUret(tur, id, yil);
  const cubuk = `<style>@media print{#yaz{display:none!important}}</style><div id="yaz" style="position:fixed;right:16px;top:16px;z-index:9">
    <button onclick="window.print()" style="font:600 15px Inter,Arial;background:#d8b46a;color:#1a1630;border:0;border-radius:10px;padding:12px 18px;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.5)">🖨 Yazdır / PDF</button></div>`;
  w.document.open(); w.document.write(html.replace("</body>", cubuk + "</body>").replace(/<title>[^<]*<\/title>/, `<title>${e(ad.replace(/\.pdf$/, ""))}</title>`)); w.document.close();
}

/* =================== RAPOR LİNKİ =================== */
function linkVerisi(m) {
  const h = m.harita;
  return { t: "rapor", s: 1, marka: (({ ad, instagram, whatsapp, eposta }) => ({ ad, instagram, whatsapp, eposta }))(marka()), y: m.yorumlar,
    h: { kisi: (({ ad, tarih, saat, yer, paket, rapor_tarihi }) => ({ ad, tarih, saat, yer, paket, rapor_tarihi }))(h.kisi),
      noktalar: h.noktalar.map(({ anahtar, ad, sembol, boylam, burc, burc_sembol, derece, retro, ev }) => ({ anahtar, ad, sembol, boylam, burc, burc_sembol, derece, retro, ev })),
      evler: h.evler, acilar: h.acilar.map(({ a, b, a_sembol, b_sembol, aci, aci_sembol, tur }) => ({ a, b, a_sembol, b_sembol, aci, aci_sembol, tur })),
      elementler: h.elementler, nitelikler: h.nitelikler, ay_aralik: h.ay_aralik, transitler: (h.transitler || []).map(({ donem, hareket, tur }) => ({ donem, hareket, tur })) } };
}
async function linkOlustur(id) {
  const m = musteri(id), sifre = $("#lk-sifre").value.trim();
  const url = sitekok() + "oku.html#" + await Kripto.linkKilitle(linkVerisi(m), sifre || null);
  const tel = ((m.takip || {}).telefon || "").replace(/\D/g, "").replace(/^0/, "90");
  const metin = `Merhaba ${m.harita.kisi.ad.split(" ")[0]}, doğum haritası raporun hazır ✨\n${url}` + (sifre ? `\nŞifre: ${sifre}` : "");
  $("#lk-sonuc").innerHTML = `<textarea readonly rows="3" id="lk-url" style="font-size:12px;min-height:0">${e(url)}</textarea>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn p" id="lk-kopya">📋 Linki kopyala</button>
      ${navigator.share ? `<button class="btn" id="lk-paylas">📤 Paylaş</button>` : ""}
      ${tel && url.length < 6000 ? `<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${tel}?text=${encodeURIComponent(metin)}">💬 WhatsApp'tan gönder</a>` : ""}
      <a class="btn" target="_blank" rel="noopener" href="${e(url)}">👁 Önizle</a></div>
    <div class="durum" style="margin-top:6px">${Math.round(url.length / 1024)} KB link${sifre ? " · şifreli: danışana şifreyi ayrıca söyle" : ""}. Rapor değişirse yeni link oluştur.</div>`;
  $("#lk-kopya").onclick = async () => { try { await navigator.clipboard.writeText(metin); tost("Kopyalandı (mesajla birlikte)"); } catch { $("#lk-url").select(); document.execCommand("copy"); tost("Kopyalandı"); } };
  if ($("#lk-paylas")) $("#lk-paylas").onclick = () => navigator.share({ text: metin }).catch(() => {});
}

/* =================== YILLIK HARİTA =================== */
const YILLIK_ALAN = [["giris", "Giriş"], ["tema", "↑ Yılın tonu"], ["odak", "☉ Yılın odağı"], ["duygu", "☽ Duygusal iklim"], ["guclu", "Öne çıkan gezegenler"],
                     ["kariyer", "Kariyer ve hedefler"], ["oneriler", "Öneriler"], ["kapanis", "Kapanış"]];
function sYillik(m) {
  const yil = new Date().getFullYear(), yillar = Object.keys(m.yillik || {}).sort();
  const sec = window._yilSec && (m.yillik || {})[window._yilSec] ? window._yilSec : yillar[yillar.length - 1];
  $("#ic").innerHTML = `<div class="card"><h3>Yıllık harita (Solar Return)</h3>
    <p class="muted" style="margin:8px 0 12px;line-height:1.6">Güneş'in doğumdaki konumuna döndüğü an için çıkarılır; doğum gününden itibaren bir yılın temalarını gösterir.
      Danışan o tarihte başka bir şehirdeyse oranın koordinatıyla hesapla.</p>
    <div class="form"><div><label>Yıl</label><select id="yl-yil">${[yil - 1, yil, yil + 1, yil + 2].map(y => `<option ${y === yil ? "selected" : ""}>${y}</option>`).join("")}</select></div>
      <div style="position:relative"><label>Doğum gününde bulunacağı yer (boşsa doğum yeri)</label><input id="f-yer" autocomplete="off" placeholder="${e(m.harita.kisi.yer)}">
        <div class="oneri" id="f-oneri" style="display:none"></div><div class="durum" id="f-yerbilgi"></div>
        <input id="f-enlem" type="hidden"><input id="f-boylam" type="hidden"><input id="f-tz" type="hidden"></div></div>
    <button class="btn p" style="margin-top:14px" onclick="yillikHesapla('${e(m.id)}')">Hesapla</button></div>
    ${yillar.length ? `<div class="sekmeler" style="margin-top:16px">${yillar.map(y => `<button class="${y === sec ? "on" : ""}" onclick="window._yilSec='${y}';sYillik(musteri('${e(m.id)}'))">${y}</button>`).join("")}</div><div id="yl-ic"></div>` : ""}`;
  yerSecici();
  if (sec) yillikGoster(m, sec);
}
function yerSecici() {  // formBagla'nın yer kısmı (yıllık harita için)
  const yer = $("#f-yer"), on = $("#f-oneri"); let sec = [];
  yer.addEventListener("focus", () => yerlerYukle());
  yer.addEventListener("input", async () => { $("#f-enlem").value = ""; $("#f-yerbilgi").textContent = ""; await yerlerYukle(); sec = yerAra(yer.value);
    on.innerHTML = sec.map((s, j) => `<div data-j="${j}">${e(s.etiket)}</div>`).join(""); on.style.display = sec.length ? "block" : "none"; });
  on.addEventListener("mousedown", ev => { const d = ev.target.closest("[data-j]"); if (!d) return; ev.preventDefault(); const s = sec[+d.dataset.j];
    yer.value = s.ad; on.style.display = "none"; $("#f-enlem").value = s.enlem; $("#f-boylam").value = s.boylam; $("#f-tz").value = s.tz; $("#f-yerbilgi").textContent = s.etiket; });
  yer.addEventListener("blur", () => setTimeout(() => on.style.display = "none", 150));
}
function yillikHesapla(id) {
  const m = musteri(id), yil = +$("#yl-yil").value;
  const yerB = $("#f-enlem").value ? { ad: $("#f-yer").value, enlem: +$("#f-enlem").value, boylam: +$("#f-boylam").value, tz: $("#f-tz").value } : null;
  if ($("#f-yer").value.trim() && !yerB) return alert("Yeri listeden seç ya da kutuyu boş bırak.");
  const eski = (m.yillik || {})[yil];
  if (eski && !confirm(`${yil} yıllık haritası zaten var. Yeniden hesaplansın mı? (Yazdığın yorumlar korunur.)`)) return;
  const sr = Sinastri.solarHesapla(m.harita, yil, yerB);
  m.yillik = m.yillik || {};
  m.yillik[yil] = { harita: sr, yorumlar: eski ? eski.yorumlar : Sinastri.solarTaslak(sr) };
  kaydet(m); window._yilSec = String(yil); sYillik(m); tost(`${yil} yıllık haritası hazır`);
}
function yillikGoster(m, yil) {
  const x = m.yillik[yil], N = Object.fromEntries(x.harita.noktalar.map(n => [n.anahtar, n])), y = x.yorumlar;
  const alan = ([k, a]) => k === "oneriler"
    ? `<div class="card alan"><div class="bas"><b>${a}</b></div>${(y.oneriler || []).map((o, i) => `<input data-yol="oneriler.${i}" value="${e(o)}" style="margin-bottom:6px">`).join("")}</div>`
    : `<div class="card alan"><div class="bas"><b>${a}</b></div><textarea data-yol="${k}" rows="4">${e(y[k] || "")}</textarea></div>`;
  $("#yl-ic").innerHTML = `<div class="grid g2"><div class="card carkk">${Cark.svg(x.harita, 460)}</div>
      <div class="card"><div class="durum">Dönüş anı</div><div style="font-size:18px;margin:4px 0 10px">${e(x.harita.kisi.sr_tarih_metin)}</div>
        <div class="durum">Yer: ${e(x.harita.kisi.sr_yer)}</div>
        <table style="margin-top:12px">${["yukselen", "gunes", "ay", "mc"].filter(k => N[k]).map(k => `<tr><td class="k">${N[k].sembol} ${e(N[k].ad)}</td><td>${e(N[k].burc)} ${N[k].derece}</td><td>${N[k].ev && !["yukselen", "mc"].includes(k) ? N[k].ev + ". ev" : ""}</td></tr>`).join("")}</table>
        <div style="margin-top:14px">${raporIslemHtml("solar", m.id, yil)}</div></div></div>
    <div style="display:flex;align-items:center;gap:8px;margin:16px 0 10px"><b>Yorumlar</b><span class="sp"></span><button class="btn k" onclick="yillikTaslak('${e(m.id)}','${yil}')">↻ Taslakla yenile</button><span class="durum" id="yl-durum"></span></div>
    ${YILLIK_ALAN.map(alan).join("")}`;
  let tmr;
  $("#yl-ic").addEventListener("input", ev => {
    const yol = ev.target.dataset.yol; if (!yol) return;
    const mm = musteri(m.id), yy = mm.yillik[yil].yorumlar, [a, i] = yol.split(".");
    if (i !== undefined) yy[a][+i] = ev.target.value; else yy[a] = ev.target.value;
    $("#yl-durum").textContent = "…"; clearTimeout(tmr); tmr = setTimeout(() => { kaydet(mm); $("#yl-durum").textContent = "✓ kaydedildi"; }, 600);
  });
}
function yillikTaslak(id, yil) {
  if (!confirm("Bu yılın yorumları taslakla değiştirilecek. Devam?")) return;
  const m = musteri(id); m.yillik[yil].yorumlar = Sinastri.solarTaslak(m.yillik[yil].harita); kaydet(m); sYillik(m);
}

/* =================== SİNASTRİ =================== */
function sinastriListe() {
  const t = Object.values(sinastriler()).sort((a, b) => (b.guncelleme || "").localeCompare(a.guncelleme || ""));
  const kisiler = Object.values(tumu()).sort((a, b) => a.harita.kisi.ad.localeCompare(b.harita.kisi.ad, "tr"));
  const sec = id => `<select id="${id}"><option value="">Seç…</option>${kisiler.map(m => `<option value="${e(m.id)}">${e(m.harita.kisi.ad)} · ${e(m.harita.kisi.tarih)}</option>`).join("")}</select>`;
  ANA.innerHTML = `<div class="eyebrow">İlişki uyumu</div><h1>Sinastri</h1>
    <div class="card" style="margin-top:16px"><div class="form"><div><label>1. kişi</label>${sec("sn-a")}</div><div><label>2. kişi</label>${sec("sn-b")}</div></div>
      <button class="btn p" style="margin-top:14px" onclick="sinastriOlustur()">💞 Uyumu hesapla</button>
      <div class="durum" style="margin-top:8px">İki kişinin de danışan olarak kayıtlı olması gerekir (gerekirse önce “Yeni Okuma” ile ekle).</div></div>
    <div class="liste">${t.map(x => `<div class="card kisi" onclick="git('#s/${e(x.id)}')"><div style="flex:1"><div class="ad">${e(x.veri.a_kisi.ad)} & ${e(x.veri.b_kisi.ad)}</div>
      <div class="alt">${Object.values(x.veri.puan).map(p => `${e(p.ad)} ${p.puan}`).join(" · ")}</div></div>
      <div style="font-size:30px;color:var(--gold)" class="serif">${x.veri.genel}</div></div>`).join("") || `<div class="bos">Henüz sinastri yok.</div>`}</div>`;
}
function sinastriOlustur(ida, idb) {
  ida = ida || $("#sn-a").value; idb = idb || $("#sn-b").value;
  if (!ida || !idb || ida === idb) return alert("İki farklı kişi seç.");
  const a = musteri(ida), b = musteri(idb), s = Sinastri.hesapla(a.harita, b.harita);
  const id = `${ida}__${idb}`, eski = sinastriler()[id] || sinastriler()[`${idb}__${ida}`];
  const x = eski && eski.id === id ? eski : { id };
  x.veri = { a: ida, b: idb, a_kisi: a.harita.kisi, b_kisi: b.harita.kisi, ...s };
  x.yorumlar = x.yorumlar || Sinastri.taslak(a.harita, b.harita, s);
  sinastriKaydet(x); git(`#s/${id}`);
}
const SIN_ALAN = [["genel", "Genel uyum"], ["duygusal", "Duygusal bağ"], ["cekim", "Çekim ve tutku"], ["iletisim", "İletişim"], ["uzun_vade", "Uzun vadeli bağlılık"],
                  ["degerler", "Değerler ve uyum"], ["acilar", "Öne çıkan açılar"], ["yerlesim_a", "Ev yerleşimleri (1. kişi)"], ["yerlesim_b", "Ev yerleşimleri (2. kişi)"], ["kapanis", "Kapanış"]];
function sinastriEkrani(id, sekme) {
  const x = sinastriler()[id], v = x.veri, a = musteri(v.a), b = musteri(v.b);
  ANA.innerHTML = `<div class="durum"><a href="#sinastri" style="text-decoration:none">← Sinastriler</a></div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px"><h1>${e(v.a_kisi.ad)} & ${e(v.b_kisi.ad)}</h1>
      ${a && b ? `<button class="btn k" onclick="sinastriOlustur('${e(v.a)}','${e(v.b)}')">↻ Yeniden hesapla</button>` : ""}
      <button class="btn k tehlike" onclick="if(confirm('Sinastri silinsin mi?')){sinastriSil('${e(id)}');git('#sinastri')}">Sil</button></div>
    <div class="sekmeler">${[["genel", "Uyum"], ["yorum", "Yorumlar"], ["rapor", "Rapor"]].map(([s, l]) => `<button class="${s === sekme ? "on" : ""}" onclick="location.hash='#s/${e(id)}/${s}'">${l}</button>`).join("")}</div><div id="ic"></div>`;
  if (sekme === "yorum") return sinastriYorum(id);
  if (sekme === "rapor") { $("#ic").innerHTML = `<div class="card"><h3 style="margin-bottom:12px">İlişki uyumu raporu (PDF)</h3>${a && b ? raporIslemHtml("sinastri", id) : `<div class="uyari">Danışanlardan biri bu cihazda yok; rapor oluşturulamaz.</div>`}</div>`; return; }
  $("#ic").innerHTML = `<div class="grid g2"><div class="card" style="text-align:center"><div class="durum">Genel uyum</div><div class="serif" style="font-size:64px;color:var(--gold)">${v.genel}</div>
      ${Object.values(v.puan).map(p => `<div class="row" style="text-align:left"><span>${e(p.ad)}</span><span style="color:var(--gold)">${p.puan}</span></div><div class="bar"><i style="width:${p.puan}%"></i></div>`).join("")}</div>
    <div class="card"><table><tr><th>Açı</th><th>Orb</th></tr>${v.acilar.slice(0, 14).map(c => `<tr><td class="k">${c.a_sembol} ${e(c.a_ad)} ${c.aci_sembol} ${c.b_sembol} ${e(c.b_ad)}<div class="durum" style="color:${c.tur === "zor" ? "var(--red)" : c.tur === "uyumlu" ? "var(--blue)" : "var(--gold)"}">${e(c.aci)}</div></td><td>${c.orb}°</td></tr>`).join("")}</table>
      <div class="durum" style="margin-top:8px">Satırlarda soldaki ${e(v.a_kisi.ad.split(" ")[0])}, sağdaki ${e(v.b_kisi.ad.split(" ")[0])}.</div></div></div>`;
}
function sinastriYorum(id) {
  const y = sinastriler()[id].yorumlar;
  $("#ic").innerHTML = `<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px"><span class="sp"></span><button class="btn k" onclick="sinastriTaslak('${e(id)}')">↻ Tümünü taslakla yenile</button><span class="durum" id="sy-durum"></span></div>`
    + SIN_ALAN.map(([k, a]) => k === "acilar"
      ? `<div class="card alan"><div class="bas"><b>${a}</b></div>${(y.acilar || []).map((c, i) => `<div class="durum" style="color:var(--ink);margin:6px 0 4px">${e(c.aci)}</div><textarea data-yol="acilar.${i}.yorum" rows="3">${e(c.yorum)}</textarea>`).join("")}</div>`
      : `<div class="card alan"><div class="bas"><b>${a}</b></div><textarea data-yol="${k}" rows="4">${e(y[k] || "")}</textarea></div>`).join("");
  let tmr;
  $("#ic").addEventListener("input", ev => {
    const yol = ev.target.dataset.yol; if (!yol) return;
    const x = sinastriler()[id], p = yol.split(".");
    if (p.length === 3) x.yorumlar.acilar[+p[1]].yorum = ev.target.value; else x.yorumlar[p[0]] = ev.target.value;
    $("#sy-durum").textContent = "…"; clearTimeout(tmr); tmr = setTimeout(() => { sinastriKaydet(x); $("#sy-durum").textContent = "✓ kaydedildi"; }, 600);
  });
}
function sinastriTaslak(id) {
  if (!confirm("Tüm sinastri yorumları taslakla değiştirilecek. Devam?")) return;
  const x = sinastriler()[id], a = musteri(x.veri.a), b = musteri(x.veri.b);
  if (!a || !b) return alert("Danışanlardan biri bu cihazda yok.");
  x.yorumlar = Sinastri.taslak(a.harita, b.harita, x.veri); sinastriKaydet(x); sinastriEkrani(id, "yorum");
}

/* =================== BAŞVURU FORMU =================== */
const basvuruAyar = () => jOku(BASVURU, null);
function appsScriptKodu(anahtar) {
  return `// Doğum Haritası başvuru kutusu — başvurular ŞİFRELİ gelir, bu tablo içerikleri okuyamaz.
const ANAHTAR = "${anahtar}";
function doPost(e) {
  const v = (e.postData && e.postData.contents) || "";
  if (v.length > 30000 || v.indexOf("e1.") !== 0) return yanit({ ok: false });
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sh.getLastRow() > 3000) return yanit({ ok: false });
  sh.appendRow([new Date().toISOString(), Utilities.getUuid(), v, ""]);
  return yanit({ ok: true });
}
function doGet(e) {
  const p = e.parameter || {};
  if (p.anahtar !== ANAHTAR) return yanit({ hata: "yetki yok" });
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const n = sh.getLastRow(), rows = n ? sh.getRange(1, 1, n, 4).getValues() : [];
  if (p.isle) {
    for (let i = 0; i < rows.length; i++) if (rows[i][1] === p.isle) sh.getRange(i + 1, 3, 1, 2).setValues([["", new Date().toISOString()]]);
    return yanit({ ok: true });
  }
  return yanit(rows.filter(r => r[1] && !r[3] && r[2]).map(r => ({ zaman: String(r[0]), id: r[1], veri: r[2] })));
}
function yanit(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }`;
}
function formLinki(b) {
  return `${sitekok()}basvuru.html#u=${encodeURIComponent(b.url)}&k=${b.acik}` + (marka().ad ? `&m=${encodeURIComponent(marka().ad)}` : "");
}
function basvuruKart() {
  const b = basvuruAyar(), x = $("#basvuru-kart"); if (!x) return;
  if (b && b.url) {
    x.innerHTML = `<h3 style="margin-bottom:8px">📥 Online başvuru formu</h3>
      <p class="muted" style="line-height:1.6;margin-bottom:10px">Form 7/24 açık. Başvurular gönderilmeden önce şifrelenir; Google tablosunda yalnızca okunamaz veri durur, sadece sen açabilirsin.
        Bu linki Instagram biyografine / WhatsApp'a koy:</p>
      <textarea readonly rows="3" style="font-size:12px;min-height:0" id="bv-link">${e(formLinki(b))}</textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn p" onclick="navigator.clipboard.writeText($('#bv-link').value).then(()=>tost('Kopyalandı'))">📋 Kopyala</button>
        <a class="btn" href="${e(formLinki(b))}" target="_blank" rel="noopener">👁 Formu aç</a><a class="btn" href="#basvurular">📥 Başvurular</a>
        <button class="btn tehlike" onclick="basvuruSifirla()">Formu sıfırla</button></div>`;
    return;
  }
  const yeni = b && b.anahtar ? b : null;
  x.innerHTML = `<h3 style="margin-bottom:8px">📥 Online başvuru formu (7/24)</h3>
    <p class="muted" style="line-height:1.6;margin-bottom:10px">Bilgisayar kapalıyken de başvuru alırsın. Başvurular senin Google hesabındaki bir tabloya <b>şifreli</b> düşer; burada açılıp tek tıkla danışana dönüşür. Kurulum bir kerelik, ~5 dakika.</p>
    ${!yeni ? `<button class="btn p" onclick="basvuruBasla()">Kuruluma başla</button>` : `
    <ol style="line-height:1.8;padding-left:20px;font-size:14px">
      <li><a href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a> ile boş bir Google tablosu aç (adı: “Doğum Haritası Başvurular”).</li>
      <li>Menüden <b>Uzantılar → Apps Script</b>. Açılan sayfadaki her şeyi sil, aşağıdaki kodu yapıştır, 💾 kaydet.</li>
      <li><b>Dağıt → Yeni dağıtım</b> → tür: <b>Web uygulaması</b> · Yürütme: <b>Ben</b> · Erişim: <b>Herkes</b> → Dağıt → izinleri onayla (“Gelişmiş → güvenli olmayana git” çıkarsa bu senin kendi betiğin).</li>
      <li>Verilen <b>Web uygulaması URL'sini</b> aşağıya yapıştır.</li></ol>
    <textarea readonly rows="6" style="font-family:ui-monospace,Menlo,monospace;font-size:12px" id="bv-kod">${e(appsScriptKodu(yeni.anahtar))}</textarea>
    <button class="btn k" style="margin:6px 0 12px" onclick="navigator.clipboard.writeText($('#bv-kod').value).then(()=>tost('Kod kopyalandı'))">📋 Kodu kopyala</button>
    <label>Web uygulaması URL'si</label><input id="bv-url" placeholder="https://script.google.com/macros/s/…/exec">
    <button class="btn p" style="margin-top:12px" onclick="basvuruBagla()">Bağla ve test et</button>`}`;
}
async function basvuruBasla() {
  const c = await Kripto.anahtarCiftiUret();
  const anahtar = Kripto.b64u(crypto.getRandomValues(new Uint8Array(18)));
  jYaz(BASVURU, { acik: c.acik, gizli: c.gizli, anahtar, url: "", guncelleme: new Date().toISOString() }); basvuruKart();
}
async function basvuruBagla() {
  const url = $("#bv-url").value.trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) return alert("URL “https://script.google.com/macros/s/…/exec” biçiminde olmalı.");
  try {
    const r = await (await fetch(`${url}?anahtar=${encodeURIComponent(basvuruAyar().anahtar)}`)).json();
    if (!Array.isArray(r)) throw new Error(r.hata || "beklenmeyen yanıt");
  } catch (x) { return alert("Bağlanılamadı: " + x.message + "\nDağıtımda “Erişim: Herkes” seçtiğinden ve kodun tamamını yapıştırdığından emin ol."); }
  jYaz(BASVURU, { ...basvuruAyar(), url, guncelleme: new Date().toISOString() }); senkronZamanla(); basvuruKart(); tost("Form hazır");
}
function basvuruSifirla() {
  if (!confirm("Form bağlantısı kaldırılsın mı? Eski form linki çalışmaz hale gelir; yeniden kurman gerekir.")) return;
  jYaz(BASVURU, { guncelleme: new Date().toISOString() }); senkronZamanla(); basvuruKart();
}
async function basvurulariCek() {
  const b = basvuruAyar(); if (!b || !b.url) return null;
  const r = await (await fetch(`${b.url}?anahtar=${encodeURIComponent(b.anahtar)}`, { cache: "no-store" })).json();
  if (!Array.isArray(r)) throw new Error(r.hata || "Başvurular alınamadı.");
  const out = [];
  for (const x of r) { try { out.push({ ...x, b: await Kripto.gizliAnahtarlaAc(x.veri, b.gizli) }); } catch { out.push({ ...x, hata: true }); } }
  return out;
}
async function basvuruOzet() {
  const x = $("#bg-basvuru"); if (!x || !(basvuruAyar() || {}).url) return;
  try { const l = await basvurulariCek(); if (l && l.length) x.innerHTML = `<a class="card kisi" href="#basvurular" style="text-decoration:none;color:var(--ink);border-color:var(--gold)"><span style="font-size:24px">📥</span><div style="flex:1"><b>${l.length} yeni başvuru</b><div class="durum">Görüntüle ve danışana dönüştür</div></div><span>→</span></a>`; }
  catch {}
}
async function basvuruEkrani() {
  ANA.innerHTML = `<div class="eyebrow">Online form</div><h1>Başvurular</h1><div id="bv-l" class="liste"><div class="durum">Yükleniyor…</div></div>`;
  if (!(basvuruAyar() || {}).url) { $("#bv-l").innerHTML = `<div class="bilgi">Form henüz kurulmadı. <a href="#ayarlar">Ayarlar → Online başvuru formu</a></div>`; return; }
  let l; try { l = await basvurulariCek(); } catch (x) { $("#bv-l").innerHTML = `<div class="uyari">${e(x.message)}</div>`; return; }
  window._bv = l;
  $("#bv-l").innerHTML = l.length ? l.map((x, i) => x.hata ? `<div class="card uyari">Açılamayan bir başvuru (${e(x.zaman)}). <button class="btn k" onclick="basvuruIsle('${e(x.id)}')">Kaldır</button></div>`
    : `<div class="card"><div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap"><div style="flex:1;min-width:220px"><div class="ad" style="font-size:17px">${e(x.b.ad)}</div>
      <div class="durum">${e(x.b.tarih)} · ${e(x.b.saat || "saat bilinmiyor")} · ${e(x.b.yer)}</div>
      <div class="durum">${e(PAKET_AD[x.b.paket] || x.b.paket)} · ${e(x.b.telefon)} ${x.b.eposta ? "· " + e(x.b.eposta) : ""} ${x.b.instagram ? "· " + e(x.b.instagram) : ""}</div>
      ${x.b.konu ? `<div style="margin-top:6px;font-size:14px">“${e(x.b.konu)}”</div>` : ""}<div class="durum" style="margin-top:4px">${new Date(x.zaman).toLocaleString("tr-TR")}</div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn p k" onclick="basvuruEkle(${i})">✨ Danışan olarak ekle</button><button class="btn k tehlike" onclick="if(confirm('Başvuru silinsin mi?'))basvuruIsle('${e(x.id)}')">Sil</button></div></div></div>`).join("")
    : `<div class="bos">Yeni başvuru yok.</div>`;
}
async function basvuruIsle(id) {
  const b = basvuruAyar();
  await fetch(`${b.url}?anahtar=${encodeURIComponent(b.anahtar)}&isle=${encodeURIComponent(id)}`).catch(() => {});
  basvuruEkrani();
}
async function basvuruEkle(i) {
  const x = window._bv[i].b;
  const [y, a, g] = x.tarih.split("-");
  const r = olustur({ ad: x.ad.trim(), tarih: `${g}.${a}.${y}`, saat: x.saat || null, yer: x.yer.split(",")[0], enlem: +x.enlem, boylam: +x.boylam, tz: x.tz,
                      paket: ["temel", "detayli", "premium"].includes(x.paket) ? x.paket : "detayli", rapor_tarihi: bugunTR(), doldur: true });
  if (musteri(r.id) && !confirm(`${x.ad} zaten kayıtlı. Yine de iletişim bilgileri güncellensin mi?`)) return;
  const eski = musteri(r.id) || {};
  kaydet({ ...eski, id: r.id, harita: eski.harita || r.harita, yorumlar: eski.yorumlar || r.yorumlar, olusturma: eski.olusturma || new Date().toISOString(),
    takip: { ...(eski.takip || { odeme: "bekliyor", durum: "basvuru", gecmis: [], arsiv: false, ucret: "", gorusme: "" }), telefon: x.telefon || "", eposta: x.eposta || "", instagram: x.instagram || "", kaynak: "Online form" },
    notlar: (eski.notlar ? eski.notlar + "\n\n" : "") + (x.konu ? `Başvuruda merak ettiği: ${x.konu}` : "") });
  await basvuruIsle(window._bv[i].id);
  tost("Danışan eklendi"); git(`#m/${r.id}`);
}

/* =================== SESLE NOT =================== */
let _tanima = null;
function sesleYaz(hedef, btn) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return alert("Bu tarayıcı sesle yazmayı desteklemiyor. iPhone'da klavyedeki 🎤 mikrofon tuşuyla da dikte edebilirsin.");
  if (_tanima) { _tanima.stop(); return; }
  const ta = $(hedef), r = new SR();
  r.lang = "tr-TR"; r.continuous = true; r.interimResults = true;
  let taban = ta.value && !/\s$/.test(ta.value) ? ta.value + " " : ta.value;
  r.onresult = ev => {
    let kesin = "", gecici = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) (ev.results[i].isFinal ? (kesin += ev.results[i][0].transcript) : (gecici += ev.results[i][0].transcript));
    if (kesin) { taban += kesin.trim() + " "; }
    ta.value = taban + gecici; ta.dispatchEvent(new Event("input", { bubbles: true }));
  };
  r.onend = () => { _tanima = null; btn.textContent = "🎙 Sesle yaz"; btn.classList.remove("p"); ta.value = taban.trimEnd(); ta.dispatchEvent(new Event("input", { bubbles: true })); };
  r.onerror = ev => { if (ev.error === "not-allowed") alert("Mikrofon izni verilmedi."); };
  r.start(); _tanima = r; btn.textContent = "⏹ Durdur"; btn.classList.add("p");
}
