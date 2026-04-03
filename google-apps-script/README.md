# Google Sheets Setup

1. Google Sheets에서 새 스프레드시트를 만듭니다.
2. `확장 프로그램 > Apps Script`로 이동합니다.
3. `Code.gs` 내용을 이 폴더의 `Code.gs` 파일 내용으로 교체합니다.
4. `배포 > 새 배포 > 웹 앱`을 선택합니다.
5. 실행 계정은 `나`, 액세스 권한은 `모든 사용자`로 설정합니다.
6. 배포 후 받은 웹앱 URL을 `config.js`의 `sheetsWebhookUrl`에 넣습니다.
7. GitHub Pages를 다시 배포하면 생성 데이터가 시트의 `responses` 시트에 쌓입니다.

주의:
- 이 구성은 브라우저에서 `POST` 요청을 보내고 결과는 읽지 않는 방식입니다.
- 즉, GitHub Pages 정적 사이트에서도 저장 요청 전송은 가능하지만, 성공 응답을 엄밀하게 확인하지는 않습니다.
