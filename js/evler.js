/* Ev yorumları — arac/ev_yorum.py'nin birebir karşılığı. Metinler veri/yorum.json → EVY. */
(function (G) {
  const V = () => G.Yorum.V, E = () => V().EVY;
  const EVm = no => V().EV[String(no)];
  const _cap = t => (t.slice(0, 1) === "i" ? "İ" + t.slice(1) : t.slice(0, 1).toUpperCase() + t.slice(1));
  const _nokta = (h, k) => h.noktalar.find(n => n.anahtar === k) || null;
  const karsi = b => E().BURCLAR[(E().BURCLAR.indexOf(b) + 6) % 12];

  function onur(k, burc) {
    const ev = E().EVINDE[k] || [], yu = E().YUCELIM[k];
    if (ev.includes(burc)) return "evinde";
    if (yu === burc) return "yucelim";
    if (ev.some(b => karsi(b) === burc)) return "zarar";
    if (yu && karsi(yu) === burc) return "dusus";
    return null;
  }

  function yoneticiCumle(h, ev, k, es) {
    const n = _nokta(h, k);
    if (!n) return "";
    const ad = V().GEZ_AD[k], no = ev.no, z = n.ev, o = onur(k, n.burc);
    const yer = V().BURC[n.burc].loc + (z ? ` ve ${z}. evde` : "");
    if (es) return `Geleneksel eş yöneticisi ${ad} ise ${V().BURC[n.burc].loc}${o ? ` (${E().ONUR_AD[o]})` : ""}${z ? ` ve ${z}. evde` : ""}; `
      + (z && z !== no ? `bu konulara ${EVm(z)} üzerinden de ikinci bir renk katıyor.` : "bu evin gücünü artırıyor.");
    let t = `Bu evin yöneticisi ${ad} ${yer}. `;
    if (z === no) t += `Yöneticinin kendi evinde durması bu alanı güçlü ve kendi kendine yeten bir alan yapıyor; ${EVm(no)} konuları hayatında belirgin.`;
    else if (z) {
      t += `Yani ${EVm(no)} konuları ${EVm(z)} alanıyla iç içe; bu evle ilgili gelişmeler çoğu zaman ${z}. evin konuları üzerinden tetiklenir.`;
      if ([1, 4, 7, 10].includes(z)) t += " Yöneticinin köşe evde olması bu alana görünürlük ve güç katıyor.";
      else if ([6, 8, 12].includes(z)) t += ` Yöneticinin ${z}. evde olması, alanın daha çok perde arkasında, emekle ve içsel bir süreçle olgunlaştığını gösterir.`;
    }
    if (o) t += " " + E().ONUR[o];
    if (n.retro) t += " Geri hareketli olduğu için bu evin konuları içe dönük, gecikmeli ya da tekrar ele alınarak olgunlaşır.";
    const acilar = (h.acilar || []).filter(a => a.a === ad || a.b === ad).slice().sort((x, y) => x.orb - y.orb).slice(0, 2);
    if (acilar.length) {
      t += " Yöneticinin öne çıkan açıları: " + acilar.map(a => `${a.a === ad ? a.b : a.a} ile ${a.aci} (${E().ACI_TON[a.tur] || "etkili"})`).join(", ") + ".";
      const tur = new Set(acilar.map(a => a.tur));
      t += tur.size === 1 && tur.has("uyumlu") ? " Bu alanda işler görece kolay akar."
        : tur.has("zor") ? " Buradaki gerilim, bu alanda en çok büyüdüğün yer olur." : "";
    }
    return t;
  }

  function evYorumu(h, ev) {
    const B = V().BURC, b = B[ev.burc], no = ev.no;
    const p = [`${no}. ev ${EVm(no)} alanını anlatır. Evin ${b.loc} başlıyor: bu konulara ${b.yaklasim} bir tavırla yaklaşırsın.`];
    const ters = {};
    for (const [k, v] of Object.entries(V().GEZ_AD)) ters[v] = k;
    for (const [k, v] of Object.entries(E().EV_GOREV)) ters[v] = k;
    const gez = [];
    for (const g of ev.gezegenler) {
      const k = ters[g.ad], n = k ? _nokta(h, k) : null;
      if (k in E().EVDE) gez.push(g.ad + (n && n.burc !== ev.burc ? ` (${B[n.burc].loc})` : "") + " " + E().EVDE[k]);
    }
    p.push(gez.length ? gez.map(_cap).join(" ") : "Bu evde gezegen yok. Boş ev önemsiz demek değildir; bu alanın hikâyesini daha çok yöneticisi anlatır.");
    p.push(yoneticiCumle(h, ev, b.yonetici, false));
    if (E().ES_YONETICI[ev.burc]) p.push(yoneticiCumle(h, ev, E().ES_YONETICI[ev.burc], true));
    return p.filter(Boolean).join("\n\n");
  }

  const evYorumlari = h => Object.fromEntries((h.evler || []).map(ev => [String(ev.no), evYorumu(h, ev)]));
  G.Evler = { evYorumu, evYorumlari, onur };
})(typeof window !== "undefined" ? window : globalThis);
