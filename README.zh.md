# Seyra

加密聊天会话。一个代码，不用账号，什么也不留下。

在线：[seyra.website](https://seyra.website)

**其他语言：** [English](README.md) · [Français](README.fr.md) · [Русский](README.ru.md) · [한국어](README.ko.md)

## 功能

- 代码就是密钥。PBKDF2-HMAC-SHA256（21 万次）生成 32 字节密钥和 32 字节房间标识。
- 消息在离开浏览器前用 XSalsa20-Poly1305 密封，作者标识也一起密封。
- 文字、语音、照片、最大 8 MB 的文件、投票、话题、置顶消息、提及。
- 群组通话、摄像头、带声音的屏幕共享，WebRTC 点对点。
- 全部只存在内存里。关闭会话后所有人都不留任何内容。

## 不做的事

- 没有前向保密，也没有 PAKE。房间标识相当于代码的离线校验值。
- 没有填充，消息大小会泄露信息。
- 没有找回。代码丢了，会话就没了。
- 目前没有外部审计。

完整的技术说明（数据、威胁模型）在 [/securite](https://seyra.website/securite)。

## 运行

需要 Node 20 以上。

```sh
cd app && npm install && npm run build   # 客户端编译到 server/public
cd ../server && npm install
node src/index.js                        # 127.0.0.1:3000
```

前面放带 TLS 的 nginx（见 `deploy/nginx-seyra.conf`）。环境变量：`PORT`、`ALLOWED_ORIGINS`、`TURN_HOST`、`TURN_SECRET`。

TURN 中继是可选的，在严格网络下有用（`deploy/setup-turn.sh`）。

## 目录

```
app/      React + Vite 客户端
server/   Node WebSocket 服务端，同时提供编译后的客户端
deploy/   nginx 配置、systemd 单元、coturn 安装
```

## 测试

```sh
cd app && npm run check
```

## 限制

单台 VPS，没有备份，没有冗余。不要把代码泄露后会毁掉你的事情放进会话里。

## 许可

MIT，见 [LICENSE](LICENSE)。
