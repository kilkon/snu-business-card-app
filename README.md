# SNU Business Card QR App

서울대학교 교직원 학생들의 전자명함을 생성하고, QR 스캔 시 국문 또는 영문 연락처 저장을 선택할 수 있는 웹앱입니다.

## 기능

- 사용자 입력 폼으로 국문/영문 명함 정보 생성
- 제출 데이터를 `data/contacts.csv`에 저장
- 각 사용자마다 고유 QR 링크 생성
- QR 스캔 시 `국문 명함 저장` / `영문 명함 저장` 선택 페이지 제공
- `VCF` 연락처 다운로드 지원
- 간단한 JSON 조회 엔드포인트 제공: `/api/contacts`

## 실행

```bash
cd business_card_app
pip install -r requirements.txt
python app.py
```

브라우저에서 `http://127.0.0.1:5050`을 열면 됩니다.

## 배포 예시

- Render, Railway, Fly.io, Azure App Service 같은 Flask 호스팅 서비스에 바로 올릴 수 있습니다.
- CSV 파일은 단일 서버에서는 동작하지만, 다중 인스턴스 환경에서는 SQLite 같은 DB로 바꾸는 것이 더 안전합니다.

## 파일

- `app.py`: Flask 서버
- `templates/`: 화면 템플릿
- `data/contacts.csv`: 생성된 명함 데이터 저장 파일
