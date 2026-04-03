# SNU Business Card QR App

서울대학교 교수형 QR 명함을 GitHub Pages에서 바로 실행할 수 있도록 만든 정적 웹앱입니다. 입력 정보는 브라우저 안에서만 처리됩니다.

## 현재 구조

- `index.html`, `styles.css`, `app.js`: GitHub Pages에서 실행되는 정적 앱
- `config.js`: QR 생성 관련 설정
- `app.py`, `templates/`: 이전 Flask 버전 백업

## 동작 방식

1. 사용자가 국문/영문 명함 정보를 입력합니다.
2. 브라우저에서 QR 선택 링크를 생성합니다.
3. QR을 스캔하면 `국문 연락처 저장` 또는 `영문 연락처 저장` 중 하나를 선택합니다.
4. 연락처는 `VCF` 파일로 다운로드됩니다.
5. 생성 데이터는 외부로 전송되지 않고 현재 브라우저 세션에서만 사용됩니다.

## GitHub Pages 배포

1. 저장소 `Settings > Pages`로 이동합니다.
2. Source를 `Deploy from a branch`로 설정합니다.
3. Branch는 `main`, 폴더는 `/ (root)`를 선택합니다.
4. 저장 후 몇 분 뒤 `https://kilkon.github.io/snu-business-card-app/` 형태의 URL이 생성됩니다.

## 참고

- GitHub Pages는 정적 파일만 실행하므로, 현재 버전은 별도 서버 없이 브라우저 안에서만 동작합니다.
