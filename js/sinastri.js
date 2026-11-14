/* Sinastri (ilişki uyumu) ve yıllık harita (Solar Return) — arac/sinastri.py ve arac/solar.py karşılıkları. */
(function (G) {
  const NOKTALAR = ["gunes", "ay", "merkur", "venus", "mars", "jupiter", "saturn", "uranus", "neptun", "pluton", "yukselen", "mc", "kdugum"];
  const KISISEL = new Set(["gunes", "ay", "merkur", "venus", "mars", "yukselen"]);
  const KUSAK = new Set(["uranus", "neptun", "pluton"]);
  const esit = (s, l) => s.size === l.length && l.every(x => s.has(x));
  const KATEGORI = {
    duygusal: (a, b) => a === "ay" || b === "ay",
    cekim: (a, b) => { const s = new Set([a, b]); return [["venus", "mars"], ["mars"], ["venus", "pluton"], ["mars", "pluton"], ["venus", "uranus"]].some(l => esit(s, l)); },
    iletisim: (a, b) => a === "merkur" || b === "merkur",
    uzun_vade: (a, b) => ["saturn", "kdugum", "jupiter"].some(k => a === k || b === k),
    degerler: (a, b) => { const s = new Set([a, b]); return [["gunes"], ["gunes", "venus"], ["venus"], ["venus", "jupiter"], ["gunes", "jupiter"]].some(l => esit(s, l)) || a === "yukselen" || b === "yukselen"; },
  };
  const r2 = x => Math.round(x * 100) / 100;
  const S = () => G.Yorum.V.SIN, EV = no => G.Yorum.V.EV[String(no)];

  function iyelik(ad) {
    ad = ad.split(" ")[0];
    const unlu = [...ad.toLocaleLowerCase("tr")].filter(c => "aıoueiöü".includes(c));
    const son = unlu.length ? unlu[unlu.length - 1] : "e";
    let ek = { a: "ın", ı: "ın", o: "un", u: "un", e: "in", i: "in", ö: "ün", ü: "ün" }[son];
    if ("aıoueiöü".includes(ad.slice(-1).toLocaleLowerCase("tr"))) ek = "n" + ek;
    return `${ad}'${ek}`;
  }
  const _p = h => Object.fromEntries(h.noktalar.filter(n => NOKTALAR.includes(n.anahtar)).map(n => [n.anahtar, n]));

  function hesapla(ha, hb) {
    const A = _p(ha), B = _p(hb), acilar = [];
    for (const [ka, na] of Object.entries(A)) for (const [kb, nb] of Object.entries(B)) {
      if (KUSAK.has(ka) && KUSAK.has(kb)) continue;
      if ((ka === "mc" || kb === "mc") && !(KISISEL.has(ka) || KISISEL.has(kb))) continue;
      const fark = G.Astro.aci_farki(na.boylam, nb.boylam);
      for (const [ad, sem, der, orb, tur] of G.Astro.ACILAR) {
        const o_orb = orb - 2 + ((["gunes", "ay"].includes(ka) || ["gunes", "ay"].includes(kb)) ? 1 : 0);
        const o = Math.abs(fark - der);
        if (o <= o_orb) {
          const w = KISISEL.has(ka) && KISISEL.has(kb) ? 3 : (KISISEL.has(ka) || KISISEL.has(kb)) ? 2 : 1;
          acilar.push({ a: ka, a_ad: na.ad, a_sembol: na.sembol, b: kb, b_ad: nb.ad, b_sembol: nb.sembol, aci: ad, aci_sembol: sem, tur,
                        orb: r2(o), agirlik: w, puan: r2(w * 2 + (o_orb - o)) });
          break;
        }
      }
    }
    acilar.sort((x, y) => y.puan - x.puan);
    const yerlesim = (X, hy) => {
      if (!hy.evler) return [];
      const c = hy.evler.map(e => e.boylam);
      return Object.entries(X).filter(([k]) => ["gunes", "ay", "merkur", "venus", "mars", "jupiter", "saturn"].includes(k))
        .map(([k, n]) => ({ anahtar: k, ad: n.ad, sembol: n.sembol, ev: G.Astro.ev_bul(n.boylam, c) }));
    };
    const puan = {};
    for (const [kat, f] of Object.entries(KATEGORI)) {
      let s = 55.0, say = 0;
      for (const a of acilar) {
        if (!f(a.a, a.b)) continue;
        say++;
        const w = a.agirlik * (a.orb < 2 ? 1.3 : 1);
        if (a.tur === "uyumlu") s += 6 * w;
        else if (a.tur === "zor") s -= 4 * w;
        else s += ((["saturn", "pluton"].includes(a.a) || ["saturn", "pluton"].includes(a.b)) ? 2 : 6) * w;
      }
      puan[kat] = { ad: S().KAT_AD[kat], puan: Math.trunc(Math.max(20, Math.min(95, s))), aci_sayisi: say };
    }
    const genel = Math.trunc(Object.values(puan).reduce((a, p) => a + p.puan, 0) / Object.keys(puan).length);
    return { acilar, a_in_b: yerlesim(A, hb), b_in_a: yerlesim(B, ha), puan, genel };
  }

  function taslak(ha, hb, s) {
    const ad_a = ha.kisi.ad.split(" ")[0], ad_b = hb.kisi.ad.split(" ")[0], A = _p(ha), B = _p(hb), y = {};
    const ton = s.genel >= 75 ? "çok güçlü" : s.genel >= 62 ? "güçlü" : s.genel >= 50 ? "dengeli" : "öğretici";
    y.genel = `${ad_a} ve ${ad_b} arasındaki bağ ${ton} bir uyum tablosu çiziyor. ${ad_a} ${A.gunes.burc} Güneşi ve ${A.ay.burc} Ayı ile, `
      + `${ad_b} ise ${B.gunes.burc} Güneşi ve ${B.ay.burc} Ayı ile bu ilişkiye kendi rengini katıyor. `
      + "Bu rapor ilişkinizin güçlü yanlarını ve birlikte büyüyebileceğiniz alanları gösterir; ilişkinin geleceğini değil, potansiyelini anlatır.";
    for (const [kat, p] of Object.entries(s.puan)) y[kat] = S().KAT_METIN[kat][p.puan >= 58 ? 0 : 1];
    y.acilar = s.acilar.slice(0, 6).map(a => ({ aci: `${ad_a}: ${a.a_ad} ${a.aci} ${ad_b}: ${a.b_ad}`,
      yorum: `${iyelik(ad_a)} ${S().KISA3[a.a]} enerjisi ile ${iyelik(ad_b)} ${S().KISA3[a.b]} enerjisi ${S().ACI_SIN[a.aci]}` }));
    const yer = (lst, x, z) => {
      if (!lst.length) return `${iyelik(z)} doğum saati bilinmediği için ev yerleşimleri hesaplanamadı.`;
      const P = Object.fromEntries(lst.map(p => [p.anahtar, p])), t = [];
      if (P.gunes) t.push(`${iyelik(x)} Güneş'i ${iyelik(z)} ${P.gunes.ev}. evinde: ${x}, ${iyelik(z)} ${EV(P.gunes.ev)} alanını aydınlatır ve canlandırır.`);
      if (P.venus) t.push(`${iyelik(x)} Venüs'ü ${iyelik(z)} ${P.venus.ev}. evinde: ${z}, ${x} ile birlikteyken ${EV(P.venus.ev)} alanında sevgi ve uyum hisseder.`);
      return t.join(" ");
    };
    y.yerlesim_a = yer(s.a_in_b, ad_a, ad_b);
    y.yerlesim_b = yer(s.b_in_a, ad_b, ad_a);
    y.kapanis = "Hiçbir sinastri tek başına bir ilişkinin kaderini belirlemez; uyumlu açılar kolaylık, zorlayıcı açılar ise birlikte büyüme fırsatı sunar. "
      + "Bu raporu birbirinizi daha iyi anlamak için bir rehber olarak kullanın.";
    return y;
  }

  /* ---------------- yıllık harita ---------------- */
  const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const p2 = n => String(n).padStart(2, "0");
  function yerelParcalar(ms, tz) {
    const p = {}; new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(ms)).forEach(x => p[x.type] = +x.value);
    return { y: p.year, m: p.month, d: p.day, h: p.hour % 24, mi: p.minute };
  }
  function donusAni(ng, yil, ay, gun) {
    const A = G.Astronomy;
    const t = A.SearchSunLongitude(ng, A.MakeTime(new Date(Date.UTC(yil, ay - 1, Math.max(1, gun - 3)))), 20);
    return Math.round(t.date.getTime() / 60000) * 60000;
  }
  function solarHesapla(natal, yil, yerB) {
    const k = natal.kisi, [gun, ay] = k.tarih.split(".").map(Number);
    const ng = natal.noktalar.find(n => n.anahtar === "gunes").boylam;
    const enlem = yerB ? yerB.enlem : k.enlem, boylam = yerB ? yerB.boylam : k.boylam, tz = yerB ? yerB.tz : k.tz;
    const an = yerelParcalar(donusAni(ng, yil, ay, gun), tz);
    const h = G.Astro.harita_hesapla({ y: an.y, m: an.m, d: an.d }, [an.h, an.mi], enlem, boylam, tz);
    h.kisi = { ...k, yil, sr_an: `${p2(an.d)}.${p2(an.m)}.${an.y} ${p2(an.h)}:${p2(an.mi)}`, sr_yer: (yerB && yerB.ad) || k.yer,
               sr_enlem: enlem, sr_boylam: boylam, sr_tz: tz, sr_tarih_metin: `${an.d} ${AYLAR[an.m - 1]} ${an.y}, ${p2(an.h)}:${p2(an.mi)}` };
    h.transitler = [];
    return h;
  }
  function solarTaslak(sr) {
    const V = G.Yorum.V, B = V.BURC, N = Object.fromEntries(sr.noktalar.map(n => [n.anahtar, n])), yil = sr.kisi.yil;
    const cap = t => (t.slice(0, 1) === "i" ? "İ" + t.slice(1) : t.slice(0, 1).toLocaleUpperCase("tr") + t.slice(1));
    const asc = N.yukselen, gun = N.gunes, ay = N.ay, mc = N.mc, y = {};
    y.giris = `Bu harita, ${yil} doğum gününden itibaren bir yıl boyunca öne çıkacak temaları gösterir. `
      + `Güneş ${sr.kisi.sr_tarih_metin} anında doğduğundaki konumuna geri döndü; o anın gökyüzü yeni yaşının rehberidir.`;
    if (asc) { const b = B[asc.burc]; y.tema = `Yılın Yükseleni ${asc.burc}: bu yıl hayata ${b.yaklasim} bir tavırla yaklaşacaksın. ${cap(b.isik)} bu dönemin anahtar niteliği; ${b.golge} eğilimine ise dikkat etmekte fayda var.`; }
    else y.tema = "";
    y.odak = gun.ev ? `Yıllık haritada Güneş ${gun.ev}. evde: bu yılın ana odağı ${EV(gun.ev)}. Enerjini ve zamanını en çok bu alana harcayacak, en çok bu alanda görünür olacaksın.` : "";
    const b = B[ay.burc];
    y.duygu = `Yılın Ayı ${ay.burc}` + (ay.ev ? `, ${ay.ev}. evde` : "") + `: duygusal olarak bu yıl ${b.ihtiyac} ihtiyacın öne çıkıyor.`
      + (ay.ev ? ` Duygusal tatmini en çok ${EV(ay.ev)} alanında bulacaksın.` : "");
    const acisal = sr.noktalar.filter(n => [1, 4, 7, 10].includes(n.ev) && V.GEZ_AD[n.anahtar] && n.anahtar !== "gunes");
    y.guclu = acisal.length ? "Bu yıl köşe evlerdeki gezegenler belirgin rol oynuyor: " + acisal.map(n => `${n.ad} ${n.ev}. evde (${EV(n.ev)})`).join("; ")
      + ". Bu gezegenlerin temaları yıl boyunca sık sık karşına çıkacak." : "Köşe evlerde belirgin bir gezegen yok; yıl daha sakin ve içsel bir ritimde akabilir.";
    y.kariyer = mc ? `Yılın MC'si ${mc.burc}: kariyer ve hedeflerde ${B[mc.burc].isik} ön plana çıkıyor.` : "";
    y.oneriler = [gun.ev ? `${cap(EV(gun.ev))} alanına bilinçli zaman ayır` : "Yılın temalarını not al",
                  `Duygusal dengen için ${B[ay.burc].ihtiyac} ihtiyacını gözet`, "Doğum gününde yıl için niyetlerini yaz", ""];
    y.kapanis = "Yeni yaşın, yeni bir döngünün başlangıcı. Bu haritayı yıl içinde zaman zaman açıp temaları hatırlamanı öneririm.";
    return y;
  }
  G.Sinastri = { hesapla, taslak, iyelik, solarHesapla, solarTaslak };
})(typeof window !== "undefined" ? window : globalThis);
