(function () {
  const config = window.APP_CONFIG || {};
  const sheetsWebhookUrl = (config.sheetsWebhookUrl || "").trim();

  const views = {
    form: document.getElementById("formView"),
    result: document.getElementById("resultView")
  };

  const form = document.getElementById("cardForm");
  const saveNotice = document.getElementById("saveNotice");
  const qrImage = document.getElementById("qrImage");
  const summaryBox = document.getElementById("summaryBox");
  const openChoiceLink = document.getElementById("openChoiceLink");
  const showKrQr = document.getElementById("showKrQr");
  const showEnQr = document.getElementById("showEnQr");
  const downloadKr = document.getElementById("downloadKr");
  const downloadEn = document.getElementById("downloadEn");
  const makeAnother = document.getElementById("makeAnother");

  let currentCard = null;
  let currentQrLanguage = "kr";

  function setActiveView(name) {
    Object.entries(views).forEach(([key, node]) => {
      node.classList.toggle("active", key === name);
    });
  }

  function getBaseUrl() {
    return window.location.origin + window.location.pathname;
  }

  function makeAppUrl(key, value) {
    const url = new URL(getBaseUrl());
    url.searchParams.set(key, value);
    return url.toString();
  }

  function makeLanguageUrl(contactId, language) {
    const url = new URL(getBaseUrl());
    url.searchParams.set("id", contactId);
    url.searchParams.set("lang", language);
    return url.toString();
  }

  function makeId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeWebsite(value) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function escapeVcard(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function buildVcard(card, language) {
    const useEn = language === "en";
    const fullName = useEn ? (card.name_en || card.name_kr) : (card.name_kr || card.name_en);
    const title = useEn ? (card.title_en || card.title_kr) : (card.title_kr || card.title_en);
    const org = useEn ? (card.org_en || card.org_kr) : (card.org_kr || card.org_en);
    const address = useEn ? (card.address_en || card.address_kr) : (card.address_kr || card.address_en);
    const note = useEn ? (card.summary_en || card.summary_kr) : (card.summary_kr || card.summary_en);

    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${escapeVcard(fullName)}`,
      `N:${escapeVcard(fullName)};;;;`,
      `ORG:${escapeVcard(org)}`,
      `TITLE:${escapeVcard(title)}`,
      `TEL;TYPE=CELL:${escapeVcard(card.phone_mobile)}`,
      `TEL;TYPE=WORK,VOICE:${escapeVcard(card.phone_office)}`,
      `EMAIL;TYPE=INTERNET:${escapeVcard(card.email)}`
    ];

    const website = normalizeWebsite(card.website || "");
    if (website) lines.push(`URL:${escapeVcard(website)}`);
    if (address) lines.push(`ADR;TYPE=WORK:;;${escapeVcard(address)};;;;`);
    if (note) lines.push(`NOTE:${escapeVcard(note)}`);
    lines.push("END:VCARD");
    return lines.join("\n");
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

  function loadCardById(contactId) {
    if (!sheetsWebhookUrl) {
      return Promise.reject(new Error("Missing sheets webhook URL"));
    }

    const callbackName = `jsonpCallback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        delete window[callbackName];
        script.remove();
      };

      window[callbackName] = (payload) => {
        cleanup();
        if (!payload || !payload.ok || !payload.record) {
          reject(new Error("Record not found"));
          return;
        }
        resolve(payload.record);
      };

      const script = document.createElement("script");
      const url = new URL(sheetsWebhookUrl);
      url.searchParams.set("action", "get");
      url.searchParams.set("id", contactId);
      url.searchParams.set("callback", callbackName);
      script.src = url.toString();
      script.onerror = () => {
        cleanup();
        reject(new Error("JSONP request failed"));
      };
      document.body.appendChild(script);
    });
  }

  function renderQrForLanguage(card, language) {
    currentQrLanguage = language;
    const shareUrl = makeLanguageUrl(card.contact_id, language);
    qrImage.innerHTML = "";
    if (window.QRCode) {
      new window.QRCode(qrImage, {
        text: shareUrl,
        width: 320,
        height: 320,
        correctLevel: window.QRCode.CorrectLevel.M
      });
    } else {
      const fallbackImage = document.createElement("img");
      fallbackImage.alt = "QR code";
      fallbackImage.src = `${config.qrApiBase}${encodeURIComponent(shareUrl)}`;
      qrImage.appendChild(fallbackImage);
    }
    openChoiceLink.href = shareUrl;
    showKrQr.classList.toggle("ghost", language !== "kr");
    showEnQr.classList.toggle("ghost", language !== "en");
  }

  function setResult(card) {
    currentCard = card;
    renderQrForLanguage(card, currentQrLanguage);
    summaryBox.innerHTML = [
      `<strong>국문</strong><br>${card.name_kr} / ${card.title_kr} / ${card.org_kr}`,
      `<br><br><strong>영문</strong><br>${card.name_en} / ${card.title_en} / ${card.org_en}`,
      `<br><br><strong>연락처</strong><br>${card.phone_mobile} / ${card.phone_office || "-"} / ${card.email}`
    ].join("");
    setActiveView("result");
  }

  function buildPayload(formData) {
    const payload = Object.fromEntries(formData.entries());
    payload.contact_id = makeId();
    payload.created_at = new Date().toISOString();
    return payload;
  }

  function saveToSheets(payload) {
    if (!sheetsWebhookUrl) {
      saveNotice.textContent = "현재는 Google Sheets 저장 주소가 비어 있어 QR만 생성됩니다. config.js에 웹앱 URL을 넣으면 시트 저장이 함께 동작합니다.";
      return Promise.resolve();
    }

    saveNotice.textContent = "Google Sheets에 저장 요청을 보내는 중입니다.";
    return fetch(sheetsWebhookUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body: new URLSearchParams(payload).toString()
    }).then(() => {
      saveNotice.textContent = "Google Sheets 저장 요청이 전송되었습니다.";
    }).catch(() => {
      saveNotice.textContent = "Google Sheets 저장 요청은 실패했지만 QR 생성은 계속 사용할 수 있습니다.";
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = buildPayload(formData);
    saveToSheets(payload).finally(() => {
      window.history.pushState({}, "", getBaseUrl());
      setResult(payload);
    });
  }

  function handleRoute() {
    const params = new URLSearchParams(window.location.search);
    const contactId = params.get("id");
    const langValue = params.get("lang");

    if (!contactId) {
      setActiveView("form");
      return;
    }

    loadCardById(contactId)
      .then((card) => {
        setResult(card);
        if (langValue === "kr" || langValue === "en") {
          currentQrLanguage = langValue;
          window.setTimeout(() => {
            downloadVcard(card, langValue);
          }, 120);
        }
      })
      .catch((error) => {
        console.error(error);
        choiceKr.innerHTML = "명함 정보를 불러오지 못했습니다.";
        choiceEn.innerHTML = "Please try again later.";
        setActiveView("choice");
      });
  }

  form.addEventListener("submit", handleSubmit);
  downloadKr.addEventListener("click", () => currentCard && downloadVcard(currentCard, "kr"));
  downloadEn.addEventListener("click", () => currentCard && downloadVcard(currentCard, "en"));
  showKrQr.addEventListener("click", () => currentCard && renderQrForLanguage(currentCard, "kr"));
  showEnQr.addEventListener("click", () => currentCard && renderQrForLanguage(currentCard, "en"));
  makeAnother.addEventListener("click", () => {
    currentCard = null;
    currentQrLanguage = "kr";
    window.history.pushState({}, "", getBaseUrl());
    form.reset();
    setActiveView("form");
  });

  window.addEventListener("popstate", handleRoute);
  handleRoute();
})();
