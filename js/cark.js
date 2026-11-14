/* Doğum haritası çarkı (SVG) — arac/cark.py'nin karşılığı. */
(function (G) {
  const ALTIN = "#d8b46a", METIN = "#f3eee3", SOLUK = "#b9b4c9", UYUM = "#7fb7d9", GERGIN = "#d9897f";
  const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
  function _xy(r, lon, asc) { const t = (180 + (lon - asc)) * Math.PI / 180; return [r * Math.cos(t), -r * Math.sin(t)]; }
  function _yay(nok, min = 7.5) {
    const s = [...nok].sort((a, b) => a.boylam - b.boylam), pos = s.map(n => n.boylam);
    for (let it = 0; it < 60; it++) {
      let moved = false;
      for (let i = 0; i < pos.length; i++) {
        const j = (i + 1) % pos.length, d = (((pos[j] - pos[i]) % 360) + 360) % 360;
        if (d < min && pos.length > 1) { const p = (min - d) / 2; pos[i] -= p; pos[j] += p; moved = true; }
      }
      if (!moved) break;
    }
    return s.map((n, i) => [n, pos[i]]);
  }
  function svg(h, boyut = 620) {
    const S = G.Astro.BURC_SEMBOL;
    const R = boyut / 2 - 10, rbd = R, rbi = R - 46, rev = rbi - 2, rgez = rbi - 34, ric = rbi - 92;
    const N = h.noktalar, ascN = N.find(n => n.anahtar === "yukselen"), asc = ascN ? ascN.boylam : 0;
    const o = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-boyut / 2} ${-boyut / 2} ${boyut} ${boyut}" width="${boyut}" height="${boyut}" font-family="DejaVu Sans, Apple Symbols, Segoe UI Symbol, serif">`];
    o.push(`<g fill="none" stroke="${ALTIN}" stroke-opacity=".7"><circle r="${rbd}"/><circle r="${rbi}"/><circle r="${ric}" stroke-opacity=".45"/></g>`);
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = _xy(rbi, i * 30, asc), [x2, y2] = _xy(rbd, i * 30, asc);
      o.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${ALTIN}" stroke-opacity=".7"/>`);
      const [tx, ty] = _xy((rbd + rbi) / 2, i * 30 + 15, asc);
      o.push(`<text x="${f1(tx)}" y="${f1(ty)}" fill="${ALTIN}" font-size="22" text-anchor="middle" dominant-baseline="central">${S[i]}</text>`);
      for (let k = 1; k < 6; k++) {
        const [a1x, a1y] = _xy(rbi, i * 30 + k * 5, asc), [a2x, a2y] = _xy(rbi + 6, i * 30 + k * 5, asc);
        o.push(`<line x1="${f1(a1x)}" y1="${f1(a1y)}" x2="${f1(a2x)}" y2="${f1(a2y)}" stroke="${ALTIN}" stroke-opacity=".4"/>`);
      }
    }
    if (h.evler) {
      for (const e of h.evler) {
        const ana = [1, 4, 7, 10].includes(e.no);
        const [x1, y1] = _xy(ric, e.boylam, asc), [x2, y2] = _xy(rev, e.boylam, asc);
        o.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${ana ? ALTIN : SOLUK}" stroke-opacity="${ana ? .9 : .35}" stroke-width="${ana ? 1.6 : 1}"/>`);
        const son = h.evler[e.no % 12].boylam, orta = e.boylam + ((((son - e.boylam) % 360) + 360) % 360) / 2;
        const [nx, ny] = _xy(ric + 12, orta, asc);
        o.push(`<text x="${f1(nx)}" y="${f1(ny)}" fill="${SOLUK}" font-size="11" font-family="Helvetica, Arial" text-anchor="middle" dominant-baseline="central" opacity=".8">${e.no}</text>`);
      }
      for (const [et, lon] of [["AC", asc], ["MC", N.find(n => n.anahtar === "mc").boylam]]) {
        const [x, y] = _xy(rbd + 2, lon, asc);
        o.push(`<g class="gz" data-k="${et === "AC" ? "yukselen" : "mc"}"><circle class="hl" cx="${f1(x)}" cy="${f1(y)}" r="9" fill="${ALTIN}" fill-opacity="0"/><circle cx="${f1(x)}" cy="${f1(y)}" r="3" fill="${ALTIN}"/></g>`);
      }
    }
    const idx = {}; N.forEach(n => idx[n.ad] = n);
    for (const a of h.acilar) {
      if (a.aci === "Kavuşum") continue;
      const p = idx[a.a], q = idx[a.b];
      if (["yukselen", "mc"].includes(p.anahtar) || ["yukselen", "mc"].includes(q.anahtar)) continue;
      const [x1, y1] = _xy(ric, p.boylam, asc), [x2, y2] = _xy(ric, q.boylam, asc);
      o.push(`<line class="acl" data-a="${p.anahtar}|${q.anahtar}" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${a.tur === "uyumlu" ? UYUM : GERGIN}" stroke-opacity=".55" stroke-width="1"/>`);
    }
    for (const [n, gl] of _yay(N.filter(n => !["yukselen", "mc", "gdugum"].includes(n.anahtar)))) {
      const [tx, ty] = _xy(rgez, gl, asc), [mx1, my1] = _xy(rbi, n.boylam, asc), [mx2, my2] = _xy(rbi - 10, n.boylam, asc);
      const [dx, dy] = _xy(rgez - 24, gl, asc);
      o.push(`<g class="gz" data-k="${n.anahtar}"><circle class="hl" cx="${f1(tx)}" cy="${f1(ty)}" r="17" fill="${ALTIN}" fill-opacity="0"/>`
        + `<line x1="${f1(mx1)}" y1="${f1(my1)}" x2="${f1(mx2)}" y2="${f1(my2)}" stroke="${METIN}" stroke-width="1.4"/>`
        + `<text x="${f1(tx)}" y="${f1(ty)}" fill="${METIN}" font-size="21" text-anchor="middle" dominant-baseline="central">${n.sembol}</text>`
        + `<text x="${f1(dx)}" y="${f1(dy)}" fill="${SOLUK}" font-size="10" font-family="Helvetica, Arial" text-anchor="middle" dominant-baseline="central">${n.derece.split("°")[0]}°${n.retro ? "℞" : ""}</text></g>`);
    }
    o.push("</svg>");
    return o.join("\n");
  }
  G.Cark = { svg };
})(typeof window !== "undefined" ? window : globalThis);
