# Seyra

암호화된 채팅 세션. 코드 하나, 계정 없음, 아무것도 남지 않습니다.

사이트: [seyra.website](https://seyra.website)

**다른 언어:** [English](README.md) · [Français](README.fr.md) · [中文](README.zh.md) · [Русский](README.ru.md)

## 하는 일

- 코드가 곧 키입니다. PBKDF2-HMAC-SHA256(21만 회)로 32바이트 키와 32바이트 방 식별자를 만듭니다.
- 메시지는 브라우저를 떠나기 전에 XSalsa20-Poly1305로 봉인됩니다. 작성자 식별자도 함께 봉인됩니다.
- 텍스트, 음성, 사진, 최대 8MB 파일, 투표, 스레드, 고정 메시지, 멘션.
- 그룹 통화, 카메라, 소리가 있는 화면 공유. WebRTC P2P.
- 전부 메모리에만 있습니다. 세션을 닫으면 모두에게서 지워집니다.

## 하지 않는 일

- 포워드 시크리시 없음, PAKE 없음. 방 식별자가 코드의 오프라인 검증값 역할을 합니다.
- 패딩이 없어 메시지 크기가 드러납니다.
- 복구 없음. 코드를 잃으면 세션도 잃습니다.
- 아직 외부 감사 없음.

숫자와 위협 모델이 담긴 전체 문서: [/securite](https://seyra.website/securite).

## 실행

Node 20 이상.

```sh
cd app && npm install && npm run build   # 클라이언트가 server/public 으로 빌드됨
cd ../server && npm install
node src/index.js                        # 127.0.0.1:3000
```

앞단에 TLS를 붙인 nginx를 두세요(`deploy/nginx-seyra.conf`). 환경 변수: `PORT`, `ALLOWED_ORIGINS`, `TURN_HOST`, `TURN_SECRET`.

TURN 릴레이는 선택이지만 엄격한 네트워크에서 도움이 됩니다(`deploy/setup-turn.sh`).

## 구조

```
app/      React + Vite 클라이언트
server/   Node WebSocket 서버, 빌드된 클라이언트 제공
deploy/   nginx 설정, systemd 유닛, coturn 설치
```

## 테스트

```sh
cd app && npm run check
```

## 한계

VPS 한 대, 백업 없음, 이중화 없음. 코드가 유출되면 곤란해질 내용은 세션에 넣지 마세요.
