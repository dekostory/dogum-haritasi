/* Kural tabanlı yorum motoru — arac/yorum_motoru.py'nin birebir karşılığı.
   Sözlükler veri/yorum.json'dan gelir (Mac'teki metinler değişince canli_yayinla.py ile güncellenir). */
(function (G) {
  let V = null;
  const yukle = v => { V = v; };
  const _cap = t => (t.slice(0, 1) === "i" ? "İ" + t.slice(1) : t.slice(0, 1).toLocaleUpperCase("tr") + t.slice(1));
  const _ve = l => (l.length === 1 ? l[0] : l.slice(0, -1).join(", ") + " ve " + l[l.length - 1]);
  const _n = (h, k) => h.noktalar.find(n => n.anahtar === k) || null;
  const EVm = no => V.EV[String(no)];
  const _ev = n => (n.ev ? ` ${n.ev}. evde olması, bu enerjinin en çok ${EVm(n.ev)} alanında hissedildiğini gösteriyor.` : "");
  const KISA = k => V.KISA[k] || k;

  function iskelet(h, kisi, tr) {
    return {
      _not: "Boş bıraktığın alanlar raporda yönlendirme metni olarak görünür. Metinleri 'sen' diliyle yaz.",
      paket: kisi.paket, hosgeldin: "", gunes: "", ay: "", yukselen: "", merkur: "", venus: "", mars: "",
      jupiter: "", saturn: "", uranus: "", neptun: "", pluton: "", element_yorumu: "", evler_yorumu: "",
      acilar: h.acilar.slice(0, 5).map(a => ({ aci: `${a.a} ${a.aci} ${a.b}`, yorum: "" })),
      iliskiler: "", kariyer: "", yasam_yolu: "", guclu_yonler: ["", "", "", ""], gelisim_alanlari: ["", "", "", ""],
      transitler: tr.map(t => ({ donem: t.donem, hareket: t.hareket, anlam: "" })), kapanis: "",
    };
  }

  function taslaklar(h, y) {
    const B = V.BURC, T = {};
    const gun = _n(h, "gunes"), ay = _n(h, "ay"), asc = _n(h, "yukselen");
    const el = h.elementler, mx = Math.max(...Object.values(el));
    const baskinlar = Object.keys(el).filter(e => el[e] === mx);
    const b_ad = baskinlar.join(" ve "), b_ifade = baskinlar.map(e => V.ELEMENT_BASKIN[e]).join(" ile ");
    const eksik = Object.keys(el).filter(e => el[e] <= 1);
    const kucuk = s => s.toLocaleLowerCase("tr");

    T.hosgeldin = `Haritan; ${gun.burc} Güneşi, ${ay.burc} Ayı` + (asc ? ` ve ${asc.burc} Yükseleni` : "")
      + ` ile kendine özgü bir hikâye anlatıyor. ${b_ad} elementlerinin ağırlıkta olduğu bu gökyüzünde `
      + `${b_ifade} öne çıkıyor. Bu raporda güçlü yönlerine ve hayatının seni davet ettiği yöne birlikte bakacağız.`;

    let b = B[gun.burc];
    T.gunes = `Güneşin ${b.loc}: özünde ${b.sifat} birisin. Hayatı ${b.yaklasim} bir tavırla yaşamak istersin; `
      + `${b.isik} senin doğal güçlerin arasında.` + (gun.ev ? `\n\nGüneşin${_ev(gun)}` : "")
      + ` Gölge tarafta ${b.golge} eğilimine dikkat etmek seni dengeler.`;

    b = B[ay.burc];
    T.ay = `Ay ${b.loc}. Duygusal olarak güvende hissetmek için ${b.ihtiyac} ihtiyacın var. Duygularını ${b.yaklasim} bir şekilde yaşarsın.`
      + (ay.ev ? `\n\n${ay.ev}. evdeki Ay, duygularının en çok ${EVm(ay.ev)} alanında beslendiğini söylüyor.` : "")
      + " Kendine iyi bakmanın yolu: bu ihtiyaçları fark edip onlara bilinçli olarak alan açmak.";
    if (h.ay_aralik && h.ay_aralik.burc_degisiyor) T.ay += " (Not: Doğum saati bilinmediği için Ay'ın burcu kesin değildir.)";

    if (asc) {
      b = B[asc.burc]; const yon = _n(h, b.yonetici);
      T.yukselen = `${asc.burc} Yükselen sana ${b.sifat} bir dış duruş veriyor. İnsanlar seni ilk tanıdığında bu enerjiyi hisseder; `
        + `hayata ${b.yaklasim} bir yaklaşımla başlarsın.`;
      if (yon && yon.ev) T.yukselen += `\n\nYükselenin yöneticisi ${V.GEZ_AD[b.yonetici] || ""} ${B[yon.burc].loc} ve ${yon.ev}. evde. `
        + `Bu, hayatının merkezinde ${EVm(yon.ev)} temasının olduğunu gösteriyor.`;
      const birinci = h.noktalar.filter(n => n.ev === 1 && V.GEZ_AD[n.anahtar]).map(n => n.ad);
      if (birinci.length) T.yukselen += ` 1. evdeki ${birinci.join(", ")} dış duruşuna ayrıca belirgin bir renk katıyor.`;
    } else T.yukselen = "Doğum saati bilinmediği için Yükselen burç hesaplanamadı. Saat öğrenildiğinde bu bölüm tamamlanabilir.";

    for (const k of ["merkur", "venus", "mars"]) {
      const n = _n(h, k); b = B[n.burc];
      T[k] = `${V.GEZ_AD[k]} ${b.loc}: ${V.GEZ_IFADE[k]} ${b.sifat} bir karakter taşıyor. Bu alanda ${b.isik} senin doğal gücün.`
        + (n.ev ? `\n\n${V.IYELIK[k]}${_ev(n)}` : "")
        + (n.retro ? " Gezegenin geri hareketli olması, bu enerjiyi daha içe dönük ve yeniden değerlendirici biçimde yaşadığını gösterir." : "")
        + ` Dikkat edilecek nokta: ${b.golge}.`;
    }
    for (const k of ["jupiter", "saturn", "uranus", "neptun", "pluton"]) {
      const n = _n(h, k); b = B[n.burc];
      T[k] = `${V.GEZ_AD[k]} ${b.loc}` + (n.ev ? `, ${n.ev}. evde.` : ".") + ` ${V.GEZ_TEMA[k]} `
        + (n.ev ? `en çok ${EVm(n.ev)} alanında karşına çıkar.` : "hayatında önemli bir tema.")
        + ` Bu enerjiyi ${b.yaklasim} bir tarzla yaşarsın.` + (n.retro ? " (Geri hareketli: içsel bir süreç olarak işler.)" : "");
    }

    let t = `Haritanda ${kucuk(b_ad)} ${baskinlar.length > 1 ? "elementleri" : "elementi"} (${mx}) baskın: ${b_ifade} senin doğal gücün.`;
    for (const e of eksik) t += ` ${e} elementi ise az temsil ediliyor (${el[e]}). Bu yüzden ${V.ELEMENT_EKSIK[e]}`;
    const nit = h.nitelikler; const nb = Object.keys(nit).reduce((a, c) => (nit[c] > nit[a] ? c : a));
    t += { "Öncü": " Öncü niteliğin baskın olması başlatma ve inisiyatif alma gücün olduğunu gösterir.",
           "Sabit": " Sabit niteliğin baskın olması kararlılık ve sürdürme gücün olduğunu gösterir.",
           "Değişken": " Değişken niteliğin baskın olması uyum sağlama ve yön değiştirme esnekliğin olduğunu gösterir." }[nb];
    T.element_yorumu = t;

    if (h.evler) {
      const yogun = h.evler.filter(e => e.gezegenler.filter(g => !g.ad.includes("Düğüm")).length >= 1)
        .map((e, i) => [e, i]).sort((a, c) => c[0].gezegenler.length - a[0].gezegenler.length || a[1] - c[1]).slice(0, 3).map(x => x[0]);
      const ust = h.noktalar.filter(n => V.GEZ_AD[n.anahtar] && n.ev && n.ev >= 7).length;
      t = ust >= 6 ? "Gezegenlerinin çoğu haritanın üst yarısında; hayatının büyük ölçüde dış dünyada, ilişkilerde ve hedeflerde aktığını gösteriyor. "
        : ust <= 4 ? "Gezegenlerinin çoğu haritanın alt yarısında; iç dünyan, ailen ve kişisel temellerin hayatında merkezi bir yer tutuyor. "
        : "Gezegenlerin haritaya dengeli dağılmış; hem iç dünyana hem dış hedeflerine enerji ayırabiliyorsun. ";
      if (yogun.length) t += "Öne çıkan evler: " + yogun.map(e => `${e.no}. ev (${e.gezegenler.map(g => g.ad).join(", ")}) ${EVm(e.no)}`).join("; ") + ".";
      T.evler_yorumu = t;
    } else T.evler_yorumu = "";

    const detay = {}; h.acilar.forEach(a => detay[`${a.a} ${a.aci} ${a.b}`] = a);
    T.acilar = (y.acilar || []).map(a => {
      const d = detay[a.aci];
      return { aci: a.aci, yorum: d ? `${_cap(KISA(d.a))} ile ${KISA(d.b)} ${V.ACI_ANLAM[d.aci]}` : "" };
    });

    const ven = _n(h, "venus");
    t = `Venüs ${B[ven.burc].loc}` + (ven.ev ? ` ve ${ven.ev}. evde` : "") + `: ilişkilerde ${B[ven.burc].ihtiyac} ararsın.`;
    if (h.evler) {
      const e7 = h.evler[6];
      t += ` 7. evin başı ${B[e7.burc].loc}; seni ${B[e7.burc].sifat} partnerler çeker.`;
      if (e7.gezegenler.length) t += ` 7. evdeki ${_ve(e7.gezegenler.map(g => g.ad))} ilişkileri hayatında belirleyici kılıyor.`;
    }
    t += ` İlişkide ${B[ven.burc].golge} eğilimini fark etmek bağlarını güçlendirir.`;
    T.iliskiler = t;

    const mc = _n(h, "mc");
    if (mc) {
      b = B[mc.burc]; const yon = _n(h, b.yonetici);
      t = `MC ${b.loc}: kariyerde ${b.sifat} bir duruşla tanınmak istersin; ${b.isik} meslek hayatındaki güçlü kozun.`;
      if (yon && yon.ev === 10) t += ` MC'nin yöneticisi ${V.GEZ_AD[b.yonetici] || ""} kendi alanı olan 10. evde; bu güçlü bir kariyer imzası.`;
      else if (yon && yon.ev) t += ` MC'nin yöneticisi ${V.GEZ_AD[b.yonetici] || ""} ${yon.ev}. evde; kariyerin ${EVm(yon.ev)} ile bağlantılı gelişir.`;
      const e10 = h.evler[9];
      if (e10.gezegenler.length) t += ` 10. evdeki ${_ve(e10.gezegenler.map(g => g.ad))} kariyerini hayatının önemli bir sahnesi yapıyor.`;
    } else {
      const sat = _n(h, "saturn");
      t = `Doğum saati bilinmediği için MC hesaplanamadı. Satürn ${B[sat.burc].loc}: ${B[sat.burc].isik} kariyerde sabırla geliştirebileceğin bir alan.`;
    }
    T.kariyer = t;

    const kd = _n(h, "kdugum"), gd = _n(h, "gdugum");
    t = `Güney Ay Düğümü ${B[gd.burc].loc}` + (gd.ev ? ` ve ${gd.ev}. evde` : "") + `. Tanıdık konfor alanın: ${B[gd.burc].isik}`
      + (gd.ev ? `; ${EVm(gd.ev)} konuları` : "") + ". ";
    t += `Kuzey Ay Düğümü ${B[kd.burc].loc}` + (kd.ev ? ` ve ${kd.ev}. evde` : "") + `. Büyüme yönün: ${B[kd.burc].isik} niteliğini geliştirmek`
      + (kd.ev ? `, özellikle ${EVm(kd.ev)} alanında` : "") + ". ";
    t += "Hayatın seni bildiğin güvenli alandan çıkıp bu yeni niteliği geliştirmeye davet ediyor.";
    T.yasam_yolu = t;

    const uy = h.acilar.filter(a => a.tur === "uyumlu" || a.tur === "nötr").slice(0, 2);
    const zor = h.acilar.filter(a => a.tur === "zor").slice(0, 2);
    T.guclu_yonler = [`${_cap(B[gun.burc].isik)} (Güneş ${gun.burc})`, `${_cap(b_ifade)} (${b_ad} baskınlığı)`]
      .concat(uy.map(a => `${_cap(KISA(a.a))} ile ${KISA(a.b)} arasındaki uyum (${a.a}–${a.b} ${kucuk(a.aci)})`)).slice(0, 4);
    T.gelisim_alanlari = [`${_cap(B[gun.burc].golge)} eğilimini dengelemek`]
      .concat(zor.map(a => `${_cap(KISA(a.a))} ile ${KISA(a.b)} arasındaki gerilimi yönetmek (${a.a}–${a.b} ${kucuk(a.aci)})`))
      .concat(eksik.map(e => `${e} elementini beslemek`)).slice(0, 4);
    while (T.guclu_yonler.length < 4) T.guclu_yonler.push("");
    while (T.gelisim_alanlari.length < 4) T.gelisim_alanlari.push("");

    const trd = {}; (h.transitler || []).forEach(x => trd[x.hareket] = x);
    T.transitler = (y.transitler || []).map(x => {
      const d = trd[x.hareket];
      const sab = d && d.transit ? V.TRANSIT_TON[`${d.transit}|${d.tur}`] || "" : "";
      return { ...x, anlam: sab.replace("{t}", V.HEDEF_TEMA[d && d.hedef] || "ilgili") };
    });

    T.kapanis = `Haritanın ana mesajı: ${B[gun.burc].isik} senin özünde; ${kucuk(b_ad)} ${baskinlar.length > 1 ? "elementlerinin" : "elementinin"} gücü de en büyük kaynağın. `
      + `Büyüme yönün ${B[kd.burc].isik}. Kendine karşı sabırlı ol, güçlü yönlerine güven ve bu raporu zaman zaman yeniden oku.`;
    return T;
  }

  function uygula(h, y, alan, ustune_yaz) {
    const T = taslaklar(h, y);
    for (const k of alan ? [alan] : Object.keys(T)) {
      if (!(k in T)) continue;
      if (k === "acilar") (y.acilar || []).forEach((a, i) => { if (ustune_yaz || !a.yorum) a.yorum = T.acilar[i].yorum; });
      else if (k === "transitler") (y.transitler || []).forEach((x, i) => { if (ustune_yaz || !x.anlam) x.anlam = T.transitler[i].anlam; });
      else if (k === "guclu_yonler" || k === "gelisim_alanlari") { if (ustune_yaz || !(y[k] || []).some(Boolean)) y[k] = T[k]; }
      else if (ustune_yaz || !y[k]) y[k] = T[k];
    }
    return y;
  }

  G.Yorum = { yukle, iskelet, taslaklar, uygula, get V() { return V; } };
})(typeof window !== "undefined" ? window : globalThis);
