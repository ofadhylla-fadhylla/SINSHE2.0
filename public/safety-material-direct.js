(() => {
  const PATH = '/safety-briefing';
  if (!location.pathname.startsWith(PATH)) return;

  const PARTS = 16;
  let pdfUrlPromise = null;

  function materialIdFrom(scope) {
    let node = scope;
    for (let i = 0; i < 8 && node; i += 1, node = node.parentElement) {
      const text = node.innerText || '';
      let m = text.match(/KPNPLT-HSE-SK-(\d{3})/i);
      if (m) {
        const id = Number(m[1]);
        if (id >= 1 && id <= 41) return id;
      }
      m = text.match(/(?:^|\n|\s)([1-9]|[1-3]\d|4[01])\.\s+[^\n]+/);
      if (m) return Number(m[1]);
    }
    return null;
  }

  async function bundledPdfUrl() {
    if (pdfUrlPromise) return pdfUrlPromise;
    pdfUrlPromise = (async () => {
      const requests = Array.from({ length: PARTS }, (_, i) => {
        const n = String(i + 1).padStart(2, '0');
        return fetch(`/safety-materials/pdf-part-${n}.txt`, { cache: 'force-cache' }).then((r) => {
          if (!r.ok) throw new Error(`Material bundle part ${n} gagal dimuat.`);
          return r.text();
        });
      });
      const base64 = (await Promise.all(requests)).join('').replace(/\s+/g, '');
      const raw = atob(base64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
      return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    })();
    return pdfUrlPromise;
  }

  function hideLegacyImport() {
    document.querySelectorAll('label,button').forEach((el) => {
      const text = (el.textContent || '').trim();
      if (text.includes('Import ZIP Materi') || text.includes('Mengimport…')) {
        el.style.display = 'none';
      }
    });
    document.querySelectorAll('p,span,b').forEach((el) => {
      const text = (el.textContent || '').trim();
      if (text.includes('Import ZIP materi KPN Plantations satu kali')) {
        el.style.display = 'none';
      }
    });
  }

  async function mountDirectViewer(stage) {
    if (!stage || stage.dataset.directMaterialMounted === '1') return;
    const id = materialIdFrom(stage);
    if (!id) return;
    stage.dataset.directMaterialMounted = '1';
    stage.innerHTML = `
      <div style="min-height:480px;display:grid;place-items:center;background:#f6f8f7;border:1px solid #e0e6e2;border-radius:12px;padding:20px;text-align:center;color:#53605a">
        <div><strong style="display:block;color:#0d6b3d;margin-bottom:6px">Membuka materi ${id}…</strong><span style="font-size:12px">Materi bawaan SINSHE 2.0 sedang disiapkan.</span></div>
      </div>`;
    try {
      const url = await bundledPdfUrl();
      const pageUrl = `${url}#page=${id}&zoom=page-width&toolbar=1&navpanes=0`;
      stage.innerHTML = `
        <div style="display:grid;gap:10px;width:100%">
          <div style="display:flex;justify-content:flex-end">
            <a href="${pageUrl}" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;gap:6px;border:1px solid #cfe1d5;background:#fff;color:#0d6b3d;border-radius:9px;padding:8px 11px;font-size:11px;font-weight:800;text-decoration:none">Buka layar penuh</a>
          </div>
          <iframe title="Materi Safety Briefing ${id}" src="${pageUrl}" style="width:100%;height:min(72vh,820px);min-height:520px;border:1px solid #dfe5e1;border-radius:12px;background:#fff"></iframe>
        </div>`;
    } catch (err) {
      stage.innerHTML = `<div style="padding:24px;border:1px solid #f0cccc;background:#fff7f7;border-radius:12px;color:#9b2c2c"><b>Materi belum dapat dibuka.</b><div style="margin-top:5px;font-size:12px">${String(err && err.message ? err.message : err)}</div></div>`;
    }
  }

  function scan() {
    hideLegacyImport();
    document.querySelectorAll('div').forEach((el) => {
      if (el.dataset.directMaterialMounted === '1') return;
      const text = (el.textContent || '').trim();
      if (
        text.includes('Poster materi belum ada di central storage.') ||
        text.includes('Materi belum dimuat.')
      ) {
        const childrenText = Array.from(el.children).map((c) => c.textContent || '').join(' ');
        if (childrenText.includes('Import ZIP Materi') || text.length < 450) mountDirectViewer(el);
      }
    });
  }

  const observer = new MutationObserver(() => requestAnimationFrame(scan));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();