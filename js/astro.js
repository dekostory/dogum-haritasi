/* Doğum haritası hesaplama çekirdeği — tarayıcı sürümü.
   Mac panelindeki arac/astro.py ile aynı veri yapısını üretir (Astronomy Engine ile; Swiss Ephemeris'e ~1 yay dakikası yakın). */
(function (G) {
  const A = G.Astronomy;
  const VS = "︎";
  const BURCLAR = ["Koç", "Boğa", "İkizler", "Yengeç", "Aslan", "Başak", "Terazi", "Akrep", "Yay", "Oğlak", "Kova", "Balık"];
  const BURC_SEMBOL = [..."♈♉♊♋♌♍♎♏♐♑♒♓"].map(c => c + VS);
  const ELEMENT = ["Ateş", "Toprak", "Hava", "Su", "Ateş", "Toprak", "Hava", "Su", "Ateş", "Toprak", "Hava", "Su"];
  const NITELIK = ["Öncü", "Sabit", "Değişken", "Öncü", "Sabit", "Değişken", "Öncü", "Sabit", "Değişken", "Öncü", "Sabit", "Değişken"];
  const GEZEGENLER = [
    ["gunes", "Güneş", "☉", "Sun"], ["ay", "Ay", "☽", "Moon"], ["merkur", "Merkür", "☿", "Mercury"],
    ["venus", "Venüs", "♀", "Venus"], ["mars", "Mars", "♂", "Mars"], ["jupiter", "Jüpiter", "♃", "Jupiter"],
    ["saturn", "Satürn", "♄", "Saturn"], ["uranus", "Uranüs", "♅", "Uranus"], ["neptun", "Neptün", "♆", "Neptune"],
    ["pluton", "Plüton", "♇", "Pluto"], ["kdugum", "Kuzey Ay Düğümü", "☊", "NODE"],
  ].map(([k, a, s, c]) => [k, a, s + VS, c]);
  const ACILAR = [["Kavuşum", "☌", 0, 8, "nötr"], ["Karşıt", "☍", 180, 8, "zor"], ["Üçgen", "△", 120, 7, "uyumlu"],
                  ["Kare", "□", 90, 7, "zor"], ["Altıgen", "⚹", 60, 5, "uyumlu"]];
  const EV_ALANLARI = ["Benlik", "Para & Değerler", "İletişim", "Ev & Aile", "Yaratıcılık & Aşk", "İş & Sağlık Rutini", "İlişkiler",
                       "Dönüşüm & Ortak Kaynak", "İnanç & Yolculuk", "Kariyer & İtibar", "Arkadaşlık & Hayaller", "Bilinçaltı"];
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const norm = x => ((x % 360) + 360) % 360;
  const r4 = x => Math.round(x * 1e4) / 1e4;
  const r2 = x => Math.round(x * 100) / 100;

  const burc_index = lon => Math.floor(norm(lon) / 30) % 12;
  function derece_str(lon) {
    const d = norm(lon) % 30; let deg = Math.floor(d); let mn = Math.round((d - deg) * 60);
    if (mn === 60) { deg += 1; mn = 0; }
    return `${deg}°${String(mn).padStart(2, "0")}'`;
  }
  function aci_farki(a, b) { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

  // ---- saat dilimi (tarayıcının IANA veritabanı; tarihsel yaz saatleri dahil) ----
  const _dtf = {};
  function tzOfsetDk(utcMs, tz) {
    const f = _dtf[tz] || (_dtf[tz] = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    const p = {}; f.formatToParts(new Date(utcMs)).forEach(x => p[x.type] = x.value);
    return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - utcMs) / 60000;
  }
  function yereldenUtc(y, m, d, h, mi, tz) {
    const tahmin = Date.UTC(y, m - 1, d, h, mi);
    let ofs = tzOfsetDk(tahmin - tzOfsetDk(tahmin, tz) * 60000, tz);
    return { utc: tahmin - ofs * 60000, ofs };
  }
  function ofsetMetni(dk) {  // Python str(timedelta) biçimi: "2:00:00"
    const s = dk < 0 ? "-" : ""; dk = Math.abs(dk);
    return `${s}${Math.floor(dk / 60)}:${String(dk % 60).padStart(2, "0")}:00`;
  }
  function isoYerel(y, m, d, h, mi, ofs) {
    const p = n => String(n).padStart(2, "0"), a = Math.abs(ofs);
    return `${y}-${p(m)}-${p(d)}T${p(h)}:${p(mi)}:00${ofs < 0 ? "-" : "+"}${p(Math.floor(a / 60))}:${p(a % 60)}`;
  }

  // ---- gezegen konumları ----
  function ekliptikBoylam(govde, t) {
    if (govde === "NODE") return gercekDugum(t);
    return norm(A.Ecliptic(A.GeoVector(A.Body[govde], t, true)).elon);
  }
  function gercekDugum(t) {  // Ay yörüngesinin anlık (oskülatör) yükselen düğümü — Swiss "True Node"
    const s = A.RotateState(A.Rotation_EQJ_ECT(t), A.GeoMoonState(t));
    const hx = s.y * s.vz - s.z * s.vy, hy = s.z * s.vx - s.x * s.vz;
    return norm(Math.atan2(hx, -hy) * R2D);
  }
  function konumHiz(govde, t) {
    const l = ekliptikBoylam(govde, t);
    const a = ekliptikBoylam(govde, t.AddDays(-0.25)), b = ekliptikBoylam(govde, t.AddDays(0.25));
    let v = (b - a); if (v > 180) v -= 360; if (v < -180) v += 360;
    return [l, v * 2];
  }

  // ---- evler (Placidus; kutup bölgelerinde Whole Sign) ----
  function evler(t, enlem, boylam) {
    const eps = A.e_tilt(t).tobl * D2R, phi = enlem * D2R;
    const ramc = norm(A.SiderealTime(t) * 15 + boylam) * D2R;
    const mc = norm(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) * R2D);
    const asc = norm(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) * R2D);
    const raDanBoylam = ra => norm(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(eps)) * R2D);
    function kusp(f, gece) {  // f: yay oranı; gece: ufkun altındaki evler (2, 3)
      let ra = ramc + (gece ? Math.PI - f * Math.PI / 2 : f * Math.PI / 2), lon = raDanBoylam(ra);
      for (let i = 0; i < 60; i++) {
        const dek = Math.asin(Math.sin(eps) * Math.sin(lon * D2R));
        const x = -Math.tan(phi) * Math.tan(dek);
        if (Math.abs(x) > 1) return null;
        const dsa = Math.acos(x);
        ra = gece ? ramc + Math.PI - f * (Math.PI - dsa) : ramc + f * dsa;
        const yeni = raDanBoylam(ra);
        if (Math.abs(aci_farki(yeni, lon)) < 1e-7) { lon = yeni; break; }
        lon = yeni;
      }
      return lon;
    }
    const c11 = kusp(1 / 3, false), c12 = kusp(2 / 3, false), c2 = kusp(2 / 3, true), c3 = kusp(1 / 3, true);
    let c;
    if ([c11, c12, c2, c3].some(v => v === null)) {
      const b0 = Math.floor(asc / 30) * 30; c = Array.from({ length: 12 }, (_, i) => norm(b0 + i * 30));
    } else {
      c = [asc, c2, c3, norm(mc + 180), norm(c11 + 180), norm(c12 + 180), norm(asc + 180), norm(c2 + 180), norm(c3 + 180), mc, c11, c12];
    }
    return { cusps: c, asc, mc };
  }

  function ev_bul(lon, cusps) {
    for (let i = 0; i < 12; i++) {
      const a = cusps[i], b = cusps[(i + 1) % 12];
      if (norm(lon - a) < norm(b - a)) return i + 1;
    }
    return 12;
  }
  function nokta(anahtar, ad, sembol, lon, hiz, cusps) {
    const bi = burc_index(lon);
    return { anahtar, ad, sembol, boylam: r4(lon), burc: BURCLAR[bi], burc_sembol: BURC_SEMBOL[bi], derece: derece_str(lon),
             element: ELEMENT[bi], nitelik: NITELIK[bi], retro: hiz < 0 && anahtar !== "kdugum", ev: cusps ? ev_bul(lon, cusps) : null };
  }

  const zaman = utcMs => A.MakeTime(new Date(utcMs));

  /* tarih: {y,m,d}; saat: [h, mi] veya null */
  function harita_hesapla(tarih, saat, enlem, boylam, tz) {
    const bilinmiyor = !saat;
    const [h, mi] = saat || [12, 0];
    const { utc, ofs } = yereldenUtc(tarih.y, tarih.m, tarih.d, h, mi, tz);
    const t = zaman(utc);
    let cusps = null, asc = null, mc = null;
    if (!bilinmiyor) { const e = evler(t, enlem, boylam); cusps = e.cusps; asc = e.asc; mc = e.mc; }
    const noktalar = GEZEGENLER.map(([k, a, s, c]) => { const [l, v] = konumHiz(c, t); return nokta(k, a, s, l, v, cusps); });
    const kd = noktalar[noktalar.length - 1].boylam;
    noktalar.push(nokta("gdugum", "Güney Ay Düğümü", "☋" + VS, norm(kd + 180), 0, cusps));
    if (asc !== null) {
      noktalar.push(nokta("yukselen", "Yükselen", "AC", asc, 0, cusps));
      noktalar.push(nokta("mc", "Tepe Noktası (MC)", "MC", mc, 0, cusps));
    }
    let ay_aralik = null;
    if (bilinmiyor) {
      const a0 = ekliptikBoylam("Moon", zaman(yereldenUtc(tarih.y, tarih.m, tarih.d, 0, 0, tz).utc));
      const a1 = ekliptikBoylam("Moon", zaman(yereldenUtc(tarih.y, tarih.m, tarih.d, 23, 59, tz).utc));
      ay_aralik = { bas: BURCLAR[burc_index(a0)] + " " + derece_str(a0), son: BURCLAR[burc_index(a1)] + " " + derece_str(a1),
                    burc_degisiyor: burc_index(a0) !== burc_index(a1) };
    }
    const say = noktalar.filter(n => ["gunes", "ay", "merkur", "venus", "mars", "jupiter", "saturn", "uranus", "neptun", "pluton", "yukselen"].includes(n.anahtar));
    const elementler = {}; ["Ateş", "Toprak", "Hava", "Su"].forEach(e => elementler[e] = say.filter(n => n.element === e).length);
    const nitelikler = {}; ["Öncü", "Sabit", "Değişken"].forEach(e => nitelikler[e] = say.filter(n => n.nitelik === e).length);
    let evlerL = null;
    if (cusps) {
      evlerL = cusps.map((cl, i) => {
        const bi = burc_index(cl);
        const ic = noktalar.filter(n => n.ev === i + 1 && !["yukselen", "mc", "gdugum"].includes(n.anahtar));
        return { no: i + 1, alan: EV_ALANLARI[i], burc: BURCLAR[bi], burc_sembol: BURC_SEMBOL[bi], derece: derece_str(cl), boylam: r4(cl),
                 gezegenler: ic.map(n => ({ ad: n.ad, sembol: n.sembol })) };
      });
    }
    return { yerel_zaman: isoYerel(tarih.y, tarih.m, tarih.d, h, mi, ofs), utc_ofset: ofsetMetni(ofs), saat_bilinmiyor: bilinmiyor,
             ay_aralik, ev_sistemi: "Placidus", noktalar, evler: evlerL, acilar: aci_listesi(noktalar), elementler, nitelikler };
  }

  const ANA = ["gunes", "ay", "merkur", "venus", "mars", "jupiter", "saturn", "uranus", "neptun", "pluton", "yukselen", "mc"];
  const KISISEL = ["gunes", "ay", "merkur", "venus", "mars", "yukselen"];
  function aci_listesi(noktalar) {
    const ps = noktalar.filter(n => ANA.includes(n.anahtar)), s = [];
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j];
      if ([a.anahtar, b.anahtar].sort().join() === "mc,yukselen") continue;
      const fark = aci_farki(a.boylam, b.boylam);
      for (const [ad, sem, der, orb, tur] of ACILAR) {
        const ek = [a.anahtar, b.anahtar].some(k => k === "gunes" || k === "ay") ? 2 : 0;
        const o = Math.abs(fark - der);
        if (o <= orb + ek) {
          const puan = (KISISEL.includes(a.anahtar) ? 2 : 0) + (KISISEL.includes(b.anahtar) ? 2 : 0) + (orb + ek - o);
          s.push({ a: a.ad, a_sembol: a.sembol, b: b.ad, b_sembol: b.sembol, aci: ad, aci_sembol: sem, tur, orb: r2(o), puan: r2(puan) });
          break;
        }
      }
    }
    return s.sort((x, y) => y.puan - x.puan);
  }

  const TRANSIT_GEZ = [["Jüpiter", "Jupiter"], ["Satürn", "Saturn"], ["Uranüs", "Uranus"], ["Neptün", "Neptune"], ["Plüton", "Pluto"]];
  const TRANSIT_HEDEF = ["gunes", "ay", "merkur", "venus", "mars", "yukselen", "mc"];
  const isoGun = ms => new Date(ms).toISOString().slice(0, 10);
  /* basIso: "YYYY-MM-DD" */
  function transitler(noktalar, basIso, gun = 365, orb = 1.0) {
    const hedefler = noktalar.filter(n => TRANSIT_HEDEF.includes(n.anahtar));
    const acik = new Map(), donemler = [];
    const b0 = Date.parse(basIso + "T12:00:00Z");
    for (let g = 0; g <= gun; g++) {
      const ms = b0 + g * 86400000, t = zaman(ms);
      for (const [tad, code] of TRANSIT_GEZ) {
        const tl = ekliptikBoylam(code, t);
        for (const h of hedefler) {
          const fark = aci_farki(tl, h.boylam);
          for (const [ad, sem, der, , tur] of ACILAR) {
            const key = `${tad}|${h.anahtar}|${ad}`;
            if (Math.abs(fark - der) <= orb) {
              if (!acik.has(key)) acik.set(key, { transit: tad, hedef: h.ad, aci: ad, aci_sembol: sem, tur, bas: ms, son: ms, hedef_burc: h.burc, hedef_ev: h.ev });
              else acik.get(key).son = ms;
            } else if (acik.has(key) && (ms - acik.get(key).son) / 86400000 > 1) {
              donemler.push(acik.get(key)); acik.delete(key);
            }
          }
        }
      }
    }
    acik.forEach(v => donemler.push(v));
    donemler.forEach(x => { x.bas = isoGun(x.bas); x.son = isoGun(x.son); });
    return donemler.sort((a, b) => (a.bas < b.bas ? -1 : a.bas > b.bas ? 1 : 0));
  }

  G.Astro = { BURCLAR, BURC_SEMBOL, ELEMENT, NITELIK, ACILAR, EV_ALANLARI, harita_hesapla, aci_listesi, transitler, derece_str, aci_farki, burc_index, ev_bul };
})(typeof window !== "undefined" ? window : globalThis);
