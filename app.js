(function () {
  const config = window.APP_CONFIG || {};
  const sheetsWebhookUrl = (config.sheetsWebhookUrl || "").trim();

  const views = {
    form: document.getElementById("formView"),
    result: document.getElementById("resultView"),
    choice: document.getElementById("choiceView")
  };

  const form = document.getElementById("cardForm");
  const saveNotice = document.getElementById("saveNotice");
  const qrImage = document.getElementById("qrImage");
  const shareUrlNode = document.getElementById("shareUrl");
  const summaryBox = document.getElementById("summaryBox");
  const openChoiceLink = document.getElementById("openChoiceLink");
  const copyShareLink = document.getElementById("copyShareLink");
  const downloadKr = document.getElementById("downloadKr");
  const downloadEn = document.getElementById("downloadEn");
  const makeAnother = document.getElementById("makeAnother");
  const choiceKr = document.getElementById("choiceKr");
  const choiceEn = document.getElementById("choiceEn");
  const choiceKrBtn = document.getElementById("choiceKrBtn");
  const choiceEnBtn = document.getElementById("choiceEnBtn");

  let currentCard = null;

  function setActiveView(name) {
    Object.entries(views).forEach(([key, node]) => {
      node.classList.toggle("active", key === name);
    });
  }

  function getBaseUrl() {
    return window.location.origin + window.location.pathname;
  }

  function makeAppUrl(key, card) {
    const url = new URL(getBaseUrl());
    url.searchParams.set(key, encodeCard(card));
    return url.toString();
  }

  function makeLanguageUrl(card, language) {
    const url = new URL(getBaseUrl());
    url.searchParams.set("card", encodeCard(card));
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

  function encodeCard(card) {
    const utf8 = new TextEncoder().encode(JSON.stringify(card));
    let binary = "";
    utf8.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function decodeCard(encoded) {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded + "===".slice((padded.length + 3) % 4));
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function setResult(card) {
    currentCard = card;
    const shareUrl = makeAppUrl("card", card);
    const qrSrc = `${config.qrApiBase}${encodeURIComponent(shareUrl)}`;
    qrImage.src = qrSrc;
    shareUrlNode.textContent = shareUrl;
    openChoiceLink.href = shareUrl;
    summaryBox.innerHTML = [
      `<strong>국문</strong><br>${card.name_kr} / ${card.title_kr} / ${card.org_kr}`,
      `<br><br><strong>영문</strong><br>${card.name_en} / ${card.title_en} / ${card.org_en}`,
      `<br><br><strong>연락처</strong><br>${card.phone_mobile} / ${card.phone_office || "-"} / ${card.email}`
    ].join("");
    setActiveView("result");
  }

  function setChoice(card) {
    currentCard = card;
    choiceKr.innerHTML = `${card.name_kr}<br>${card.title_kr}<br>${card.org_kr}<br>${card.phone_mobile} / ${card.email}`;
    choiceEn.innerHTML = `${card.name_en}<br>${card.title_en}<br>${card.org_en}<br>${card.phone_mobile} / ${card.email}`;
    choiceKrBtn.href = makeLanguageUrl(card, "kr");
    choiceEnBtn.href = makeLanguageUrl(card, "en");
    setActiveView("choice");
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
      window.history.pushState({}, "", makeAppUrl("result", payload));
      setResult(payload);
    });
  }

  function handleRoute() {
    const params = new URLSearchParams(window.location.search);
    const cardValue = params.get("card");
    const resultValue = params.get("result");
    const langValue = params.get("lang");

    if (!cardValue && !resultValue) {
      setActiveView("form");
      return;
    }

    try {
      if (cardValue) {
        const card = decodeCard(cardValue);
        setChoice(card);
        if (langValue === "kr" || langValue === "en") {
          window.setTimeout(() => {
            downloadVcard(card, langValue);
          }, 120);
        }
        return;
      }
      if (resultValue) {
        const card = decodeCard(resultValue);
        setResult(card);
        return;
      }
    } catch (error) {
      console.error(error);
    }

    setActiveView("form");
  }

  form.addEventListener("submit", handleSubmit);
  copyShareLink.addEventListener("click", async () => {
    if (!currentCard) return;
    const shareUrl = makeAppUrl("card", currentCard);
    await navigator.clipboard.writeText(shareUrl);
    copyShareLink.textContent = "복사 완료";
    window.setTimeout(() => {
      copyShareLink.textContent = "링크 복사";
    }, 1500);
  });

  downloadKr.addEventListener("click", () => currentCard && downloadVcard(currentCard, "kr"));
  downloadEn.addEventListener("click", () => currentCard && downloadVcard(currentCard, "en"));
  makeAnother.addEventListener("click", () => {
    currentCard = null;
    window.history.pushState({}, "", getBaseUrl());
    form.reset();
    setActiveView("form");
  });

  window.addEventListener("popstate", handleRoute);
  handleRoute();
})();
