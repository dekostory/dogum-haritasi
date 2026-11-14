/* Tek tıkla PDF: rapor HTML'i gizli bir çerçevede çizilir, her sayfa görüntüye çevrilip PDF'e eklenir.
   Telefonda paylaşım menüsü açılır (WhatsApp'a doğrudan gönderilebilir); bilgisayarda dosya iner. */
(function (G) {
  const bekle = ms => new Promise(r => setTimeout(r, ms));
  async function pdfUret(html, dosyaAdi, ilerleme = () => {}) {
    const fr = document.createElement("iframe");
    fr.style.cssText = "position:fixed;left:-12000px;top:0;width:900px;height:1273px;border:0;visibility:hidden";
    const kok = location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
    html = html.replace("<head>", `<head><base href="${kok}">`).replace("</body>", `<script src="lib/html2canvas.min.js"></script></body>`);
    document.body.appendChild(fr);
    try {
      await new Promise(r => { fr.onload = r; fr.srcdoc = html; });
      const w = fr.contentWindow, d = fr.contentDocument;
      for (let i = 0; i < 50 && !w.html2canvas; i++) await bekle(100);
      if (!w.html2canvas) throw new Error("PDF aracı yüklenemedi (internet bağlantısını kontrol et).");
      try { await d.fonts.ready; } catch {}
      await bekle(400);
      const sayfalar = [...d.querySelectorAll(".slide")];
      const { jsPDF } = G.jspdf;
      const pdf = new jsPDF({ unit: "px", format: [900, 1273], orientation: "portrait", hotfixes: ["px_scaling"], compress: true });
      for (let i = 0; i < sayfalar.length; i++) {
        ilerleme(i + 1, sayfalar.length);
        const c = await w.html2canvas(sayfalar[i], { scale: 1.6, backgroundColor: "#0f1226", logging: false, useCORS: true, width: 900, height: 1273,
                                                      windowWidth: 900, windowHeight: 1273 });
        if (i) pdf.addPage([900, 1273], "portrait");
        pdf.addImage(c.toDataURL("image/jpeg", 0.88), "JPEG", 0, 0, 900, 1273, undefined, "FAST");
      }
      return new File([pdf.output("blob")], dosyaAdi, { type: "application/pdf" });
    } finally { fr.remove(); }
  }
  async function paylasVeyaIndir(dosya) {
    if (navigator.canShare && /iPhone|iPad|Android/i.test(navigator.userAgent) && navigator.canShare({ files: [dosya] })) {
      try { await navigator.share({ files: [dosya], title: dosya.name }); return "paylasildi"; } catch (e) { if (e.name === "AbortError") return "iptal"; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(dosya); a.download = dosya.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    return "indirildi";
  }
  G.PDF = { pdfUret, paylasVeyaIndir };
})(window);
