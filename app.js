(function () {
  const config = window.APP_CONFIG || {};

  const views = {
    form: document.getElementById("formView"),
    result: document.getElementById("resultView")
  };

  const form = document.getElementById("cardForm");
  const saveNotice = document.getElementById("saveNotice");
  const qrImage = document.getElementById("qrImage");
  const downloadQrImage = document.getElementById("downloadQrImage");
  const summaryBox = document.getElementById("summaryBox");
  const qrModeLabel = document.getElementById("qrModeLabel");
  const showKrQr = document.getElementById("showKrQr");
  const showEnQr = document.getElementById("showEnQr");
  const downloadKr = document.getElementById("downloadKr");
  const downloadEn = document.getElementById("downloadEn");
  const makeAnother = document.getElementById("makeAnother");
  const buildSamples = document.getElementById("buildSamples");
  const businessCardGallery = document.getElementById("businessCardGallery");

  let currentCard = null;
  let currentQrLanguage = "kr";
  let currentQrImageUrl = "";
  let samplesBuilt = false;

  const sampleThemes = [
    {
      key: "official-horizontal",
      className: "sample-card official-horizontal featured",
      footer: "Seoul National University"
    },
    {
      key: "classic-navy",
      className: "sample-card classic-navy featured",
      footer: "Intellectual Pioneer"
    },
    {
      key: "cream-border",
      className: "sample-card cream-border featured",
      footer: "Knowledge for the Future"
    },
    {
      key: "slate-modern",
      className: "sample-card slate-modern featured",
      footer: "Public Innovation at SNU"
    },
    {
      key: "crimson",
      className: "sample-card crimson",
      footer: "Global Academic Network"
    },
    {
      key: "forest",
      className: "sample-card forest",
      footer: "Data, Policy, Impact"
    },
    {
      key: "skyline",
      className: "sample-card skyline",
      footer: "Leading Future Scholarship"
    },
    {
      key: "minimal-line",
      className: "sample-card minimal-line",
      footer: "Seoul National University"
    }
  ];

  function setActiveView(name) {
    Object.entries(views).forEach(([key, node]) => {
      node.classList.toggle("active", key === name);
    });
  }

  function getBaseUrl() {
    return window.location.origin + window.location.pathname;
  }

  function makeId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeWebsite(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeVcard(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function escapeMeCard(value) {
    return String(value || "")
      .replace(/\\/g, "")
      .replace(/:/g, "")
      .replace(/;/g, "")
      .replace(/"/g, "")
      .trim();
  }

  function getLocalizedCard(card, language) {
    const useEn = language === "en";
    return {
      name: useEn ? (card.name_en || card.name_kr) : (card.name_kr || card.name_en),
      secondaryName: useEn ? (card.name_kr || "") : (card.name_en || ""),
      title: useEn ? (card.title_en || card.title_kr) : (card.title_kr || card.title_en),
      org: useEn ? (card.org_en || card.org_kr) : (card.org_kr || card.org_en),
      address: useEn ? (card.address_en || card.address_kr) : (card.address_kr || card.address_en),
      summary: useEn ? (card.summary_en || card.summary_kr) : (card.summary_kr || card.summary_en),
      website: normalizeWebsite(card.website || "")
    };
  }

  function buildVcard(card, language) {
    const localized = getLocalizedCard(card, language);
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${escapeVcard(localized.name)}`,
      `N:${escapeVcard(localized.name)};;;;`,
      `ORG:${escapeVcard(localized.org)}`,
      `TITLE:${escapeVcard(localized.title)}`,
      `TEL;TYPE=CELL:${escapeVcard(card.phone_mobile)}`,
      `TEL;TYPE=WORK,VOICE:${escapeVcard(card.phone_office)}`,
      `EMAIL;TYPE=INTERNET:${escapeVcard(card.email)}`
    ];

    if (localized.website) lines.push(`URL:${escapeVcard(localized.website)}`);
    if (localized.address) lines.push(`ADR;TYPE=WORK:;;${escapeVcard(localized.address)};;;;`);
    if (localized.summary) lines.push(`NOTE:${escapeVcard(localized.summary)}`);
    lines.push("END:VCARD");
    return lines.join("\n");
  }

  function buildMeCard(card, language) {
    const localized = getLocalizedCard(card, language);
    const note = localized.title && localized.org ? `${localized.title}, ${localized.org}` : (localized.title || localized.org);

    const chunks = [
      `N:${escapeMeCard(localized.name)}`,
      `TEL:${escapeMeCard(card.phone_mobile)}`,
      card.phone_office ? `TEL:${escapeMeCard(card.phone_office)}` : "",
      card.email ? `EMAIL:${escapeMeCard(card.email)}` : "",
      localized.website ? `URL:${escapeMeCard(localized.website)}` : "",
      localized.address ? `ADR:${escapeMeCard(localized.address)}` : "",
      note ? `NOTE:${escapeMeCard(note)}` : ""
    ].filter(Boolean);

    return `MECARD:${chunks.join(";")};;`;
  }

  function buildQrUrl(card, language) {
    const qrPayload = buildMeCard(card, language);
    return `${config.qrApiBase}${encodeURIComponent(qrPayload)}`;
  }

  function downloadVcard(card, language) {
    const content = buildVcard(card, language);
    const blob = new Blob([content], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeName = (language === "en" ? (card.name_en || card.name_kr) : (card.name_kr || card.name_en) || "snu-card")
      .replace(/\s+/g, "-");
    anchor.href = url;
    anchor.download = `${safeName}-${language}.vcf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function renderQrForLanguage(card, language) {
    currentQrLanguage = language;
    currentQrImageUrl = buildQrUrl(card, language);
    qrImage.innerHTML = "";

    const image = document.createElement("img");
    image.alt = `${language === "en" ? "English" : "Korean"} contact QR code`;
    image.src = currentQrImageUrl;
    qrImage.appendChild(image);

    qrModeLabel.textContent = language === "kr" ? "현재: 국문 연락처 QR" : "현재: 영문 연락처 QR";
    showKrQr.classList.toggle("ghost", language !== "kr");
    showEnQr.classList.toggle("ghost", language !== "en");

    if (samplesBuilt && currentCard) renderBusinessCardSamples(currentCard);
  }

  async function saveQrImage() {
    if (!currentQrImageUrl) return;

    const fileName = currentQrLanguage === "en" ? "english-contact-qr.png" : "korean-contact-qr.png";

    try {
      const response = await fetch(currentQrImageUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch QR image");

      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type || "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        await navigator.share({
          title: fileName,
          files: [file]
        });
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      window.open(currentQrImageUrl, "_blank", "noopener");
    }
  }

  function renderBusinessCardSamples(card) {
    businessCardGallery.innerHTML = sampleThemes.map((theme) => {
      const pairMarkup = ["kr", "en"].map((language) => {
        const localized = getLocalizedCard(card, language);
        const qrUrl = buildQrUrl(card, language);
        const logoMarkup = `<img src="./assets/snu-horizontal-logo.png" alt="서울대학교 가로형 로고">`;

        return `
        <article class="${theme.className} sample-card" data-language="${language}">
          <div class="sample-card-body">
            <div class="sample-brand">
              <div class="sample-badge">
                ${logoMarkup}
              </div>
              <div class="sample-brand-copy">
                <strong>SEOUL NATIONAL UNIVERSITY</strong>
                <span>${escapeHtml(localized.org)}</span>
              </div>
            </div>
            <div class="sample-main">
              <div class="sample-person">
                <h3>${escapeHtml(localized.name)}</h3>
                <p class="sample-secondary-name">${escapeHtml(localized.secondaryName)}</p>
                <p class="sample-title">${escapeHtml(localized.title)}</p>
                <p class="sample-summary">${escapeHtml(localized.summary)}</p>
              </div>
              <div class="sample-qr-wrap">
                <img src="${escapeHtml(qrUrl)}" alt="명함 QR">
              </div>
            </div>
            <div class="sample-divider"></div>
            <div class="sample-contact">
              <p><strong>T</strong> ${escapeHtml(card.phone_office || "-")}</p>
              <p><strong>M</strong> ${escapeHtml(card.phone_mobile)}</p>
              <p><strong>E</strong> ${escapeHtml(card.email)}</p>
              <p><strong>W</strong> ${escapeHtml(card.website || "-")}</p>
            </div>
            <div class="sample-address">${escapeHtml(localized.address)}</div>
            <div class="sample-footer-line">${escapeHtml(theme.footer)}</div>
          </div>
        </article>
      `;
      }).join("");

      return `
      <section class="sample-pair" data-sample-key="${escapeHtml(theme.key)}">
        <div class="sample-pair-cards">
          ${pairMarkup}
        </div>
        <div class="sample-actions">
          <button class="button secondary sample-save-button" type="button" data-sample-key="${escapeHtml(theme.key)}">국문+영문 한 번에 저장</button>
        </div>
      </section>
    `;
    }).join("");
  }

  async function saveSampleCard(button) {
    const cardNode = button.closest(".sample-pair");
    if (!cardNode) return;

    if (!window.html2canvas) {
      window.alert("이미지 저장 라이브러리를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.");
      return;
    }

    const key = button.getAttribute("data-sample-key") || "snu-card";
    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = "이미지 생성 중...";

    try {
      const canvas = await window.html2canvas(cardNode, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false
      });

      const dataUrl = canvas.toDataURL("image/png");
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `${key}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      window.alert("이미지 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      button.disabled = false;
      button.textContent = previousText;
    }
  }

  function setResult(card) {
    currentCard = card;
    samplesBuilt = false;
    businessCardGallery.innerHTML = "";
    renderQrForLanguage(card, currentQrLanguage);
    summaryBox.innerHTML = [
      `<strong>국문</strong><br>${escapeHtml(card.name_kr)} / ${escapeHtml(card.title_kr)} / ${escapeHtml(card.org_kr)}`,
      `<br><br><strong>영문</strong><br>${escapeHtml(card.name_en)} / ${escapeHtml(card.title_en)} / ${escapeHtml(card.org_en)}`,
      `<br><br><strong>연락처</strong><br>${escapeHtml(card.phone_mobile)} / ${escapeHtml(card.phone_office || "-")} / ${escapeHtml(card.email)}`
    ].join("");
    setActiveView("result");
  }

  function buildPayload(formData) {
    const payload = Object.fromEntries(formData.entries());
    payload.contact_id = makeId();
    payload.created_at = new Date().toISOString();
    return payload;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = buildPayload(formData);
    saveNotice.textContent = "입력 정보는 브라우저 안에서만 사용되며 외부로 전송되지 않습니다.";
    window.history.pushState({}, "", getBaseUrl());
    setResult(payload);
  }

  function handleRoute() {
    setActiveView("form");
  }

  form.addEventListener("submit", handleSubmit);
  downloadKr.addEventListener("click", () => currentCard && downloadVcard(currentCard, "kr"));
  downloadEn.addEventListener("click", () => currentCard && downloadVcard(currentCard, "en"));
  showKrQr.addEventListener("click", () => currentCard && renderQrForLanguage(currentCard, "kr"));
  showEnQr.addEventListener("click", () => currentCard && renderQrForLanguage(currentCard, "en"));
  downloadQrImage.addEventListener("click", saveQrImage);
  buildSamples.addEventListener("click", () => {
    if (!currentCard) return;
    samplesBuilt = true;
    renderBusinessCardSamples(currentCard);
    businessCardGallery.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  businessCardGallery.addEventListener("click", (event) => {
    const button = event.target.closest(".sample-save-button");
    if (!button) return;
    saveSampleCard(button);
  });
  makeAnother.addEventListener("click", () => {
    currentCard = null;
    currentQrLanguage = "kr";
    currentQrImageUrl = "";
    samplesBuilt = false;
    businessCardGallery.innerHTML = "";
    window.history.pushState({}, "", getBaseUrl());
    form.reset();
    setActiveView("form");
  });

  window.addEventListener("popstate", handleRoute);
  handleRoute();
})();
