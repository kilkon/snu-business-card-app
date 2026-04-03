# SNU Business Card QR App

서울대학교 교수형 QR 명함을 GitHub Pages에서 바로 실행할 수 있도록 만든 정적 웹앱입니다. 저장은 Google Sheets 웹앱으로 전송합니다.

## 현재 구조

- `index.html`, `styles.css`, `app.js`: GitHub Pages에서 실행되는 정적 앱
- `config.js`: Google Sheets 웹앱 URL 설정
- `google-apps-script/Code.gs`: Google Sheets 저장용 Apps Script
- `app.py`, `templates/`: 이전 Flask 버전 백업

## 동작 방식

1. 사용자가 국문/영문 명함 정보를 입력합니다.
2. 브라우저에서 QR 선택 링크를 생성합니다.
3. QR을 스캔하면 `국문 연락처 저장` 또는 `영문 연락처 저장` 중 하나를 선택합니다.
4. 연락처는 `VCF` 파일로 다운로드됩니다.
5. 생성 데이터는 Google Apps Script 웹앱으로 `POST`되어 Google Sheets에 누적 저장됩니다.

## GitHub Pages 배포

1. 저장소 `Settings > Pages`로 이동합니다.
2. Source를 `Deploy from a branch`로 설정합니다.
3. Branch는 `main`, 폴더는 `/ (root)`를 선택합니다.
4. 저장 후 몇 분 뒤 `https://kilkon.github.io/snu-business-card-app/` 형태의 URL이 생성됩니다.

## Google Sheets 연결

1. Google Sheets 새 문서를 만듭니다.
2. `확장 프로그램 > Apps Script`로 이동합니다.
3. [google-apps-script/Code.gs](./google-apps-script/Code.gs) 내용을 붙여넣습니다.
4. `배포 > 새 배포 > 웹 앱`을 선택합니다.
5. 실행 계정은 `나`, 접근 권한은 `모든 사용자`로 배포합니다.
6. 발급된 웹앱 URL을 [config.js](./config.js)의 `sheetsWebhookUrl`에 넣습니다.
7. 저장소에 다시 반영하면 GitHub Pages에서 입력 데이터가 시트에 저장됩니다.

## 참고

- GitHub Pages는 정적 파일만 실행하므로, 서버 저장은 Google Apps Script로 분리했습니다.
- Google Apps Script 웹앱은 `doPost(e)`를 포함한 웹앱으로 배포할 수 있습니다.
- Apps Script의 `Sheet.appendRow()`를 사용해 새 행을 추가합니다.
