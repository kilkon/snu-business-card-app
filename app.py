from __future__ import annotations

import csv
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from flask import Flask, Response, abort, redirect, render_template, request, url_for


BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
CONTACTS_FILE = DATA_DIR / "contacts.csv"

FIELDS = [
    "contact_id",
    "created_at",
    "name_kr",
    "name_en",
    "title_kr",
    "title_en",
    "org_kr",
    "org_en",
    "phone_mobile",
    "phone_office",
    "email",
    "website",
    "address_kr",
    "address_en",
    "summary_kr",
    "summary_en",
]

DEFAULT_CONTACT = {
    "name_kr": "홍길동",
    "name_en": "Hong Gil-dong",
    "title_kr": "행정대학원 교수",
    "title_en": "Professor, Graduate School of Public Administration",
    "org_kr": "서울대학교 행정대학원",
    "org_en": "Graduate School of Public Administration, Seoul National University",
    "phone_mobile": "010-1234-5678",
    "phone_office": "+82-2-880-1371",
    "email": "hong@example.com",
    "website": "gspa.snu.ac.kr",
    "address_kr": "08826 서울시 관악구 관악로 1",
    "address_en": "1 Gwanak-ro, Gwanak-gu, Seoul 08826, Republic of Korea",
    "summary_kr": "공공문제를 데이터와 정책분석으로 해결합니다.",
    "summary_en": "Solving public problems with data and policy analysis.",
}

app = Flask(__name__)


def ensure_storage() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not CONTACTS_FILE.exists():
        with CONTACTS_FILE.open("w", newline="", encoding="utf-8-sig") as handle:
            writer = csv.DictWriter(handle, fieldnames=FIELDS)
            writer.writeheader()


def read_contacts() -> list[dict[str, str]]:
    ensure_storage()
    with CONTACTS_FILE.open("r", newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def get_contact(contact_id: str) -> dict[str, str] | None:
    for row in read_contacts():
        if row["contact_id"] == contact_id:
            return row
    return None


def save_contact(payload: dict[str, str]) -> str:
    ensure_storage()
    contact_id = uuid.uuid4().hex[:10]
    record = {
        "contact_id": contact_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    for field in FIELDS:
        if field in record:
            continue
        record[field] = payload.get(field, "").strip()

    with CONTACTS_FILE.open("a", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writerow(record)

    return contact_id


def normalize_website(value: str) -> str:
    trimmed = value.strip()
    if not trimmed:
        return ""
    if trimmed.startswith(("http://", "https://")):
        return trimmed
    return f"https://{trimmed}"


def vcard_escape(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace(",", "\\,")
        .replace(";", "\\;")
    )


def build_vcard(contact: dict[str, str], language: str) -> str:
    if language == "en":
        full_name = contact["name_en"] or contact["name_kr"]
        title = contact["title_en"] or contact["title_kr"]
        org = contact["org_en"] or contact["org_kr"]
        address = contact["address_en"] or contact["address_kr"]
        note = contact["summary_en"] or contact["summary_kr"]
    else:
        full_name = contact["name_kr"] or contact["name_en"]
        title = contact["title_kr"] or contact["title_en"]
        org = contact["org_kr"] or contact["org_en"]
        address = contact["address_kr"] or contact["address_en"]
        note = contact["summary_kr"] or contact["summary_en"]

    lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        f"FN:{vcard_escape(full_name)}",
        f"N:{vcard_escape(full_name)};;;;",
        f"ORG:{vcard_escape(org)}",
        f"TITLE:{vcard_escape(title)}",
        f"TEL;TYPE=CELL:{vcard_escape(contact['phone_mobile'])}",
        f"TEL;TYPE=WORK,VOICE:{vcard_escape(contact['phone_office'])}",
        f"EMAIL;TYPE=INTERNET:{vcard_escape(contact['email'])}",
    ]

    website = normalize_website(contact["website"])
    if website:
        lines.append(f"URL:{vcard_escape(website)}")
    if address:
        lines.append(f"ADR;TYPE=WORK:;;{vcard_escape(address)};;;;")
    if note:
        lines.append(f"NOTE:{vcard_escape(note)}")
    lines.append("END:VCARD")
    return "\n".join(lines)


def make_qr_url(target_url: str) -> str:
    return f"https://api.qrserver.com/v1/create-qr-code/?size=360x360&format=png&data={quote(target_url, safe='')}"


def infer_design_types() -> list[dict[str, str]]:
    return [
        {
            "title": "공식 기관형",
            "description": "서울대 UI 가이드의 가로형/양면형처럼 기관명과 시그니처를 중심에 둔 안정적인 유형입니다.",
            "recommended_for": "교수, 학장, 연구소장, 공식 대외 명함",
            "source_label": "서울대 UI 가이드",
            "source_url": "https://identity.snu.ac.kr/ui/3/1",
        },
        {
            "title": "교수 연락처형",
            "description": "실제 교수 프로필 페이지처럼 이름, 직위, 연구실, 전화, 이메일을 빠르게 읽히게 정리한 유형입니다.",
            "recommended_for": "학회, 공동연구, 강연 후 네트워킹",
            "source_label": "SNU GSIS 교수진",
            "source_url": "https://gsis.snu.ac.kr/%EA%B5%90%EC%88%98%EC%A7%84-%EB%AA%A9%EB%A1%9D/",
        },
        {
            "title": "세로형·행사용",
            "description": "세로 비율 UI 예시처럼 행사 배지나 좁은 화면에 잘 맞는 유형입니다.",
            "recommended_for": "행사 QR, 포스터, 세미나 패스",
            "source_label": "서울대 UI 세로형 예시",
            "source_url": "https://identity.snu.ac.kr/webdata/uploads/identity/image/2021/06/5-6-8.png",
        },
        {
            "title": "영문 우선 글로벌형",
            "description": "영문 이름, 영문 소속, 국제 표기 연락처를 우선 배치해 해외 연구자에게 읽히기 쉬운 유형입니다.",
            "recommended_for": "국제학회, 해외협력, 영문 이메일 시그니처",
            "source_label": "SNU 영문 교수 프로필",
            "source_url": "https://enchem.snu.ac.kr/professor/",
        },
    ]


@app.route("/")
def index() -> str:
    return render_template(
        "index.html",
        default_contact=DEFAULT_CONTACT,
        design_types=infer_design_types(),
        total_contacts=len(read_contacts()),
    )


@app.post("/create")
def create_contact():
    payload = {field: request.form.get(field, "") for field in FIELDS if field not in {"contact_id", "created_at"}}
    contact_id = save_contact(payload)
    return redirect(url_for("result", contact_id=contact_id))


@app.get("/result/<contact_id>")
def result(contact_id: str) -> str:
    contact = get_contact(contact_id)
    if contact is None:
        abort(404)

    chooser_url = request.url_root.rstrip("/") + url_for("contact_choice", contact_id=contact_id)
    return render_template(
        "result.html",
        contact=contact,
        contact_id=contact_id,
        chooser_url=chooser_url,
        qr_url=make_qr_url(chooser_url),
    )


@app.get("/c/<contact_id>")
def contact_choice(contact_id: str) -> str:
    contact = get_contact(contact_id)
    if contact is None:
        abort(404)

    return render_template(
        "choice.html",
        contact=contact,
        contact_id=contact_id,
    )


@app.get("/vcf/<contact_id>/<language>.vcf")
def download_vcf(contact_id: str, language: str):
    contact = get_contact(contact_id)
    if contact is None:
        abort(404)
    if language not in {"kr", "en"}:
        abort(404)

    vcard_text = build_vcard(contact, "en" if language == "en" else "kr")
    filename_base = (contact["name_en"] or contact["name_kr"] or "snu-card").replace(" ", "-")
    filename = f"{filename_base}-{language}.vcf"
    return Response(
        vcard_text,
        mimetype="text/vcard",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/contacts")
def api_contacts():
    return Response(
        json.dumps(read_contacts(), ensure_ascii=False, indent=2),
        mimetype="application/json",
    )


if __name__ == "__main__":
    ensure_storage()
    app.run(debug=True, port=5050)
