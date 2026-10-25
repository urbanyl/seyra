import { APPSTR } from './appstrings';
import { useEffect, useState } from 'react';

export type Lang = 'en' | 'fr' | 'zh' | 'ru' | 'ko' | 'ar';

export const LANGS: { id: Lang; label: string; flag: string; name: string }[] = [
  { id: 'en', label: 'EN', flag: '🇬🇧', name: 'English' },
  { id: 'fr', label: 'FR', flag: '🇫🇷', name: 'Français' },
  { id: 'zh', label: '中文', flag: '🇨🇳', name: '中文' },
  { id: 'ru', label: 'RU', flag: '🇷🇺', name: 'Русский' },
  { id: 'ko', label: '한국어', flag: '🇰🇵', name: '한국어' },
  { id: 'ar', label: 'AR', flag: '🇸🇦', name: 'العربية' },
];

const KEY = 'seyra.lang';
const subs = new Set<() => void>();

function read(): Lang {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw && LANGS.some((l) => l.id === raw)) return raw as Lang;
  } catch { /* stockage indisponible */ }
  return 'en';
}

let current: Lang = typeof localStorage === 'undefined' ? 'en' : read();

export function getLang() { return current; }

export function setLang(l: Lang) {
  current = l;
  try { localStorage.setItem(KEY, l); } catch { /* stockage indisponible */ }
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  for (const fn of subs) fn();
}

export function useLang(): Lang {
  const [l, set] = useState(current);
  useEffect(() => {
    const fn = () => set(current);
    subs.add(fn);
    return () => { subs.delete(fn); };
  }, []);
  return l;
}

export type Vars = Record<string, string | number>;

/** Remplace les {marqueurs} d’une chaîne traduite. */
export function fill(value: string, vars?: Vars): string {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function t(lang: Lang, k: string, vars?: Vars): string {
  return fill(DICT[lang]?.[k] ?? DICT.en[k] ?? k, vars);
}

export function useT() {
  const lang = useLang();
  return (k: string, vars?: Vars) => t(lang, k, vars);
}

export type Dict = Record<string, string>;

const en: Dict = {
  'nav.features': 'Features', 'nav.how': 'How it works', 'nav.security': 'Security', 'nav.news': "What's new", 'nav.open': 'Open', 'nav.home': 'Home',
  'announce.title': 'Private by default. Nothing kept.',
  'announce.text': 'Encrypted sessions, group calls, camera and screen sharing. No account.',
  'announce.cta': "See what's new",
  'hero.eyebrow': 'Private messaging, no account',
  'hero.h1a': 'One session.', 'hero.h1b': 'One code.', 'hero.h1c': 'Nothing stays.',
  'hero.lede': 'Seyra opens private conversations encrypted on your device. Share a code, people join, the session ends when you decide.',
  'hero.cta1': 'Open a session', 'hero.cta2': 'Join with a code',
  'hero.p1': 'No account', 'hero.p2': 'No history', 'hero.p3': 'Group calls',
  'mock.title': 'Private session', 'mock.online': '3 online', 'mock.q': 'Who brings the plans?',
  'mock.a': 'Sending them, they stay encrypted.', 'mock.poll': 'Pizza tonight?', 'mock.yes': 'Yes', 'mock.no': 'No', 'mock.foot': 'The server sees nothing',
  'feat.kicker': 'Features', 'feat.h2': 'What matters',
  'f1.t': 'No account', 'f1.d': 'No sign-up, no phone number, no email. Open a session and that is it.',
  'f2.t': 'Encrypted on your device', 'f2.d': 'The key is derived from the code. Messages are sealed before leaving the browser.',
  'f3.t': 'Ephemeral', 'f3.d': 'Nothing is written to disk. Closing the session erases everything, for everyone.',
  'f4.t': 'Calls and camera', 'f4.d': 'Peer-to-peer voice, camera and screen sharing with sound. Mute mic or headphones at any time.',
  'f5.t': 'Polls and threads', 'f5.d': 'Start a poll in one command, reply in a thread. Votes stay encrypted.',
  'f6.t': 'Read receipts', 'f6.d': 'Optional, chosen when the session is created. Off by default.',
  'how.kicker': 'How', 'how.h2': 'Three steps',
  's1.t': 'Open a session', 's1.d': 'A 12-character code appears. It is the key.',
  's2.t': 'Share it', 's2.d': 'Link, code or QR code, your choice.',
  's3.t': 'Talk', 's3.d': 'Messages, calls, change your name at any time.',
  'sec.kicker': 'Security', 'sec.h2': 'What is encrypted, and how',
  'sec1.t': 'Key from the code', 'sec1.d': 'PBKDF2-SHA256, 210,000 iterations. The code is never sent to the server.',
  'sec2.t': 'Sealed messages', 'sec2.d': 'XSalsa20-Poly1305 with a random nonce for every message.',
  'sec3.t': 'No logs', 'sec3.d': 'Sessions live in RAM. A restart erases everything.',
  'sec4.t': 'Encrypted calls', 'sec4.d': 'WebRTC, DTLS-SRTP media encryption, TURN relay for strict networks.',
  'sec.link': 'Read the full technical dossier: primitives, limits, numbers, threat model →',
  'final.h2': 'Open a session now.', 'final.cta': 'Open a session', 'share.title': 'Share Seyra', 'share.copy': 'Copy link', 'share.copied': 'Link copied',
  'news.kicker': "What's new", 'news.h1': 'What changed', 'news.lede': 'Every version is tested before release. Newest first.', 'news.latest': 'Latest',
  'common.pseudo': 'Your name', 'common.pseudoPh': 'Guest (default)',
  'create.title': 'Open a session', 'create.desc': 'A code appears. Share it to chat.',
  'join.title': 'Join a session', 'join.desc': 'Enter the code you were given.',
  'create.password': 'Protect the session with a password', 'create.passwordLabel': 'Session password', 'create.passwordPh': 'Share it with guests',
  'create.passwordHint': 'Never sent to the server: it is mixed into the encryption key.',
  'create.history': 'Let newcomers see the history', 'create.historyOn': 'People who join will see messages sent before.', 'create.historyOff': 'By default a newcomer sees nothing said before they arrived.',
  'create.receipts': 'Read receipts', 'create.receiptsOn': 'Everyone sees who read what. This choice is visible to all.', 'create.receiptsOff': 'Off: nobody sees who read what.',
  'join.codeLabel': 'Session code', 'join.codePh': 'ABCD-EFGH-IJKL', 'join.join': 'Join', 'join.back': 'Back', 'join.password': 'Session password', 'join.busy': 'Connecting…',
  'app.brandSub': 'private session', 'app.appearance': 'Appearance', 'app.invite': 'Invite', 'app.code': 'Session code', 'app.codeNote': 'This code is the key. Anyone with it can join.',
  'app.copyCode': 'Code', 'app.copyLink': 'Invite link', 'app.linkCopied': 'Link copied', 'app.participants': 'Participants', 'app.duration': 'time', 'app.messages': 'messages', 'app.files': 'files',
  'app.closeSession': 'Close session', 'app.closeNote': 'Closing erases everything for all participants.', 'app.owner': 'owner',
  'chat.placeholder': 'Encrypted message…', 'chat.reply': 'Reply…', 'chat.send': 'Send', 'chat.voice': 'Record a voice message',
  'chat.search': 'Search this session', 'chat.allSenders': 'All senders', 'chat.allTypes': 'All types', 'chat.you': 'You',
  'settings.title': 'Customize', 'settings.theme': 'Theme', 'settings.wallShared': 'Conversation background — for everyone', 'settings.wallSharedHint': 'The pattern applies to the session: everyone sees it. Keep it light for readability.',
  'settings.wallPersonal': 'Personal background — you only, never sent', 'settings.textSize': 'Text size', 'settings.small': 'Small', 'settings.normal': 'Normal', 'settings.large': 'Large',
  'settings.comfort': 'Comfort', 'settings.compact': 'Compact density', 'settings.compactHint': 'More messages on screen', 'settings.discreet': 'Discreet mode', 'settings.discreetHint': 'Text blurs until you hover', 'settings.sound': 'Message sounds', 'settings.soundHint': 'A short beep on each new message',
  'settings.import': 'Import an image',
  'help.title': 'Shortcuts', 'help.send': 'Send the message', 'help.newline': 'New line', 'help.find': 'Search this session', 'help.paste': 'Paste an image or a file', 'help.escape': 'Close a window, exit fullscreen', 'help.help': 'Show this help', 'help.poll': 'Question | option | option: single-choice poll',
  'common.cancel': 'Cancel', 'common.save': 'Save', 'common.delete': 'Delete', 'common.close': 'Close', 'common.back': 'Back',
};

const fr: Dict = {
  'nav.features': 'Fonctions', 'nav.how': 'Comment', 'nav.security': 'Sécurité', 'nav.news': 'Nouveautés', 'nav.open': 'Ouvrir', 'nav.home': 'Accueil',
  'announce.title': 'Privé par défaut. Rien ne reste.',
  'announce.text': 'Sessions chiffrées, appels de groupe, caméra et partage d’écran. Sans compte.',
  'announce.cta': 'Voir les nouveautés',
  'hero.eyebrow': 'Messagerie privée, sans compte',
  'hero.h1a': 'Une session.', 'hero.h1b': 'Un code.', 'hero.h1c': 'Rien ne reste.',
  'hero.lede': 'Seyra ouvre des conversations privées chiffrées sur l’appareil. Vous partagez un code, les autres entrent, la session se ferme quand vous le décidez.',
  'hero.cta1': 'Ouvrir une session', 'hero.cta2': 'Rejoindre avec un code',
  'hero.p1': 'Aucun compte', 'hero.p2': 'Aucun historique', 'hero.p3': 'Appels de groupe',
  'mock.title': 'Session privée', 'mock.online': '3 connectés', 'mock.q': 'Qui apporte les plans ?',
  'mock.a': 'Je les envoie, ils restent chiffrés.', 'mock.poll': 'Pizza ce soir ?', 'mock.yes': 'Oui', 'mock.no': 'Non', 'mock.foot': 'Le serveur ne voit rien',
  'feat.kicker': 'Fonctions', 'feat.h2': 'Ce qui compte',
  'f1.t': 'Sans compte', 'f1.d': 'Aucune inscription, aucun numéro, aucune adresse e-mail. Ouvrez une session et c’est tout.',
  'f2.t': 'Chiffré sur votre appareil', 'f2.d': 'La clé est dérivée du code. Les messages sont scellés avant de quitter le navigateur.',
  'f3.t': 'Éphémère', 'f3.d': 'Rien n’est écrit sur disque. Fermer la session efface tout, pour tous les participants.',
  'f4.t': 'Appels et caméra', 'f4.d': 'Voix en pair-à-pair, caméra et partage d’écran avec le son. Micro et casque coupables à tout moment.',
  'f5.t': 'Sondages et fil', 'f5.d': 'Lancez un sondage en une commande, répondez en fil. Les votes restent chiffrés.',
  'f6.t': 'Accusés de lecture', 'f6.d': 'Optionnels, choisis à la création. Désactivés par défaut.',
  'how.kicker': 'Comment', 'how.h2': 'Trois gestes',
  's1.t': 'Ouvrez une session', 's1.d': 'Un code à 12 caractères apparaît. Il est la clé.',
  's2.t': 'Partagez-le', 's2.d': 'Lien, code ou QR code, au choix.',
  's3.t': 'Discutez', 's3.d': 'Messages, appels, pseudo modifiable à tout moment.',
  'sec.kicker': 'Sécurité', 'sec.h2': 'Ce qui est chiffré, et comment',
  'sec1.t': 'Clé dérivée du code', 'sec1.d': 'PBKDF2-SHA256, 210 000 itérations. Le code n’est jamais envoyé au serveur.',
  'sec2.t': 'Messages scellés', 'sec2.d': 'XSalsa20-Poly1305 avec un nonce aléatoire par message.',
  'sec3.t': 'Pas de journal', 'sec3.d': 'Les sessions vivent en mémoire vive. Un redémarrage efface tout.',
  'sec4.t': 'Appels chiffrés', 'sec4.d': 'WebRTC, média chiffré DTLS-SRTP, relais TURN pour les réseaux restrictifs.',
  'sec.link': 'Lire le dossier technique complet : primitives, limites, chiffres, modèle de menace →',
  'final.h2': 'Ouvrez une session maintenant.', 'final.cta': 'Ouvrir une session', 'share.title': 'Partager Seyra', 'share.copy': 'Copier le lien', 'share.copied': 'Lien copié',
  'news.kicker': 'Nouveautés', 'news.h1': 'Ce qui change', 'news.lede': 'Chaque version est testée avant publication. La plus récente en haut.', 'news.latest': 'Dernière',
  'common.pseudo': 'Votre pseudo', 'common.pseudoPh': 'Invité (par défaut)',
  'create.title': 'Ouvrir une session', 'create.desc': 'Un code apparaît. Partagez-le pour discuter.',
  'join.title': 'Rejoindre une session', 'join.desc': 'Entrez le code reçu d’un proche.',
  'create.password': 'Protéger la session par un mot de passe', 'create.passwordLabel': 'Mot de passe de la session', 'create.passwordPh': 'À communiquer aux invités',
  'create.passwordHint': 'Jamais envoyé au serveur : il est mélangé à la clé de chiffrement.',
  'create.history': 'Autoriser les nouveaux arrivants à voir l’historique', 'create.historyOn': 'Les personnes qui rejoignent verront les messages déjà envoyés.', 'create.historyOff': 'Par défaut, un nouvel arrivant ne voit rien de ce qui a été dit avant son arrivée.',
  'create.receipts': 'Accusés de lecture', 'create.receiptsOn': 'Chaque participant voit qui a lu les messages. Ce choix est visible de tous.', 'create.receiptsOff': 'Désactivés : personne ne voit qui a lu quoi.',
  'join.codeLabel': 'Code de session', 'join.codePh': 'ABCD-EFGH-IJKL', 'join.join': 'Rejoindre', 'join.back': 'Retour', 'join.password': 'Mot de passe de la session', 'join.busy': 'Connexion…',
  'app.brandSub': 'session privée', 'app.appearance': 'Apparence', 'app.invite': 'Inviter', 'app.code': 'Code de session', 'app.codeNote': 'Ce code est la clé. Toute personne qui l’a peut rejoindre.',
  'app.copyCode': 'Code', 'app.copyLink': 'Lien d’invitation', 'app.linkCopied': 'Lien copié', 'app.participants': 'Participants', 'app.duration': 'durée', 'app.messages': 'messages', 'app.files': 'fichiers',
  'app.closeSession': 'Fermer la session', 'app.closeNote': 'Fermer efface tout pour tous les participants.', 'app.owner': 'propriétaire',
  'chat.placeholder': 'Message chiffré…', 'chat.reply': 'Répondre…', 'chat.send': 'Envoyer', 'chat.voice': 'Enregistrer un message vocal',
  'chat.search': 'Rechercher dans la session', 'chat.allSenders': 'Tous les expéditeurs', 'chat.allTypes': 'Tous les types', 'chat.you': 'Vous',
  'settings.title': 'Personnaliser', 'settings.theme': 'Thème', 'settings.wallShared': 'Fond de la conversation — pour tout le monde', 'settings.wallSharedHint': 'Le motif s’applique à la session : tout le monde le voit. Restez léger pour la lisibilité.',
  'settings.wallPersonal': 'Image de fond personnelle — vous seulement, jamais envoyée', 'settings.textSize': 'Taille du texte', 'settings.small': 'Petit', 'settings.normal': 'Normal', 'settings.large': 'Grand',
  'settings.comfort': 'Confort', 'settings.compact': 'Densité compacte', 'settings.compactHint': 'Plus de messages à l’écran', 'settings.discreet': 'Mode discret', 'settings.discreetHint': 'Le texte se floute jusqu’au survol', 'settings.sound': 'Son des messages', 'settings.soundHint': 'Un petit bip à chaque nouveau message',
  'settings.import': 'Importer une image',
  'help.title': 'Raccourcis', 'help.send': 'Envoyer le message', 'help.newline': 'Nouvelle ligne', 'help.find': 'Rechercher dans la session', 'help.paste': 'Coller une image ou un fichier', 'help.escape': 'Fermer une fenêtre, quitter le plein écran', 'help.help': 'Afficher cette aide', 'help.poll': 'Question | option | option : sondage à choix unique',
  'common.cancel': 'Annuler', 'common.save': 'Enregistrer', 'common.delete': 'Supprimer', 'common.close': 'Fermer', 'common.back': 'Retour',
};

const zh: Dict = {
  'nav.features': '功能', 'nav.how': '使用方法', 'nav.security': '安全', 'nav.news': '更新', 'nav.open': '打开', 'nav.home': '首页',
  'announce.title': '默认私密，不留痕迹。',
  'announce.text': '加密会话、群组通话、摄像头与屏幕共享。无需账号。',
  'announce.cta': '查看更新',
  'hero.eyebrow': '私密通讯，无需账号',
  'hero.h1a': '一个会话。', 'hero.h1b': '一个代码。', 'hero.h1c': '不留痕迹。',
  'hero.lede': 'Seyra 在您的设备上加密对话。分享代码，他人加入，由您决定何时结束。',
  'hero.cta1': '创建会话', 'hero.cta2': '用代码加入',
  'hero.p1': '无需账号', 'hero.p2': '无历史记录', 'hero.p3': '群组通话',
  'mock.title': '私密会话', 'mock.online': '3 人在线', 'mock.q': '谁带图纸？',
  'mock.a': '我发过去，内容保持加密。', 'mock.poll': '今晚吃披萨？', 'mock.yes': '是', 'mock.no': '否', 'mock.foot': '服务器看不到内容',
  'feat.kicker': '功能', 'feat.h2': '重要的功能',
  'f1.t': '无需账号', 'f1.d': '无需注册、手机号或邮箱。创建会话即可。',
  'f2.t': '在您的设备上加密', 'f2.d': '密钥由代码派生。消息在离开浏览器前就已加密。',
  'f3.t': '临时性', 'f3.d': '不写入磁盘。关闭会话即为所有人清除内容。',
  'f4.t': '通话与摄像头', 'f4.d': '点对点语音、摄像头与带声音的屏幕共享。随时静音。',
  'f5.t': '投票与话题', 'f5.d': '一条命令发起投票，在话题中回复。投票保持加密。',
  'f6.t': '已读回执', 'f6.d': '可选，创建会话时选择。默认关闭。',
  'how.kicker': '使用方法', 'how.h2': '三步',
  's1.t': '创建会话', 's1.d': '生成 12 位代码。它就是密钥。',
  's2.t': '分享代码', 's2.d': '链接、代码或二维码，任选其一。',
  's3.t': '开始聊天', 's3.d': '发送消息、通话，随时改名。',
  'sec.kicker': '安全', 'sec.h2': '加密了什么，如何加密',
  'sec1.t': '由代码派生密钥', 'sec1.d': 'PBKDF2-SHA256，210,000 次迭代。代码不会发送到服务器。',
  'sec2.t': '消息密封', 'sec2.d': 'XSalsa20-Poly1305，每条消息使用随机 nonce。',
  'sec3.t': '不留日志', 'sec3.d': '会话只存在内存中。重启即清除。',
  'sec4.t': '加密通话', 'sec4.d': 'WebRTC，DTLS-SRTP 媒体加密，严格网络使用 TURN 中继。',
  'sec.link': '阅读完整技术说明：原语、限制、数据、威胁模型 →',
  'final.h2': '现在创建会话。', 'final.cta': '创建会话', 'share.title': '分享 Seyra', 'share.copy': '复制链接', 'share.copied': '已复制链接',
  'news.kicker': '更新', 'news.h1': '更新内容', 'news.lede': '每个版本发布前都会测试。最新在最前。', 'news.latest': '最新',
  'common.pseudo': '您的昵称', 'common.pseudoPh': '访客（默认）',
  'create.title': '创建会话', 'create.desc': '生成代码，分享后即可聊天。',
  'join.title': '加入会话', 'join.desc': '输入他人给您的代码。',
  'create.password': '用密码保护会话', 'create.passwordLabel': '会话密码', 'create.passwordPh': '告知受邀者',
  'create.passwordHint': '不会发送到服务器：它与加密密钥混合。',
  'create.history': '允许新加入者查看历史', 'create.historyOn': '加入的人将看到之前发送的消息。', 'create.historyOff': '默认情况下，新加入者看不到之前的内容。',
  'create.receipts': '已读回执', 'create.receiptsOn': '每个人都能看到谁读了消息。此设置所有人可见。', 'create.receiptsOff': '关闭：无人能看到已读状态。',
  'join.codeLabel': '会话代码', 'join.codePh': 'ABCD-EFGH-IJKL', 'join.join': '加入', 'join.back': '返回', 'join.password': '会话密码', 'join.busy': '连接中…',
  'app.brandSub': '私密会话', 'app.appearance': '外观', 'app.invite': '邀请', 'app.code': '会话代码', 'app.codeNote': '此代码即密钥。任何持有者都可加入。',
  'app.copyCode': '代码', 'app.copyLink': '邀请链接', 'app.linkCopied': '已复制链接', 'app.participants': '参与者', 'app.duration': '时长', 'app.messages': '消息', 'app.files': '文件',
  'app.closeSession': '关闭会话', 'app.closeNote': '关闭将为所有参与者清除内容。', 'app.owner': '创建者',
  'chat.placeholder': '加密消息…', 'chat.reply': '回复…', 'chat.send': '发送', 'chat.voice': '录制语音消息',
  'chat.search': '在会话中搜索', 'chat.allSenders': '所有发送者', 'chat.allTypes': '所有类型', 'chat.you': '您',
  'settings.title': '个性化', 'settings.theme': '主题', 'settings.wallShared': '聊天背景 — 所有人共享', 'settings.wallSharedHint': '图案应用于整个会话，所有人可见。建议保持清淡以便阅读。',
  'settings.wallPersonal': '个人背景 — 仅自己可见，不会发送', 'settings.textSize': '文字大小', 'settings.small': '小', 'settings.normal': '标准', 'settings.large': '大',
  'settings.comfort': '舒适度', 'settings.compact': '紧凑布局', 'settings.compactHint': '屏幕上显示更多消息', 'settings.discreet': '隐私模式', 'settings.discreetHint': '悬停前文字模糊', 'settings.sound': '消息提示音', 'settings.soundHint': '每条新消息响一声',
  'settings.import': '导入图片',
  'help.title': '快捷键', 'help.send': '发送消息', 'help.newline': '换行', 'help.find': '在会话中搜索', 'help.paste': '粘贴图片或文件', 'help.escape': '关闭窗口，退出全屏', 'help.help': '显示此帮助', 'help.poll': '问题 | 选项 | 选项：单选投票',
  'common.cancel': '取消', 'common.save': '保存', 'common.delete': '删除', 'common.close': '关闭', 'common.back': '返回',
};

const ru: Dict = {
  'nav.features': 'Возможности', 'nav.how': 'Как это работает', 'nav.security': 'Безопасность', 'nav.news': 'Обновления', 'nav.open': 'Открыть', 'nav.home': 'Главная',
  'announce.title': 'Приватно по умолчанию. Ничего не остаётся.',
  'announce.text': 'Шифрованные сессии, групповые звонки, камера и демонстрация экрана. Без аккаунта.',
  'announce.cta': 'Что нового',
  'hero.eyebrow': 'Приватные сообщения без аккаунта',
  'hero.h1a': 'Одна сессия.', 'hero.h1b': 'Один код.', 'hero.h1c': 'Ничего не остаётся.',
  'hero.lede': 'Seyra открывает приватные беседы, зашифрованные на вашем устройстве. Поделитесь кодом, люди подключаются, сессия завершается по вашему решению.',
  'hero.cta1': 'Открыть сессию', 'hero.cta2': 'Войти по коду',
  'hero.p1': 'Без аккаунта', 'hero.p2': 'Без истории', 'hero.p3': 'Групповые звонки',
  'mock.title': 'Приватная сессия', 'mock.online': '3 онлайн', 'mock.q': 'Кто берёт чертежи?',
  'mock.a': 'Отправляю, они остаются зашифрованными.', 'mock.poll': 'Пицца сегодня?', 'mock.yes': 'Да', 'mock.no': 'Нет', 'mock.foot': 'Сервер ничего не видит',
  'feat.kicker': 'Возможности', 'feat.h2': 'Что важно',
  'f1.t': 'Без аккаунта', 'f1.d': 'Без регистрации, номера телефона и e-mail. Открыли сессию — и всё.',
  'f2.t': 'Шифрование на устройстве', 'f2.d': 'Ключ выводится из кода. Сообщения запечатываются до отправки из браузера.',
  'f3.t': 'Эфемерность', 'f3.d': 'Ничего не пишется на диск. Закрытие сессии стирает всё для всех.',
  'f4.t': 'Звонки и камера', 'f4.d': 'Голос напрямую, камера и демонстрация экрана со звуком. Микрофон и звук отключаются в любой момент.',
  'f5.t': 'Опросы и ветки', 'f5.d': 'Опрос одной командой, ответы в ветке. Голоса остаются зашифрованными.',
  'f6.t': 'Уведомления о прочтении', 'f6.d': 'Необязательно, выбирается при создании. По умолчанию выключено.',
  'how.kicker': 'Как это работает', 'how.h2': 'Три шага',
  's1.t': 'Откройте сессию', 's1.d': 'Появляется код из 12 символов. Это ключ.',
  's2.t': 'Поделитесь им', 's2.d': 'Ссылка, код или QR-код — на выбор.',
  's3.t': 'Общайтесь', 's3.d': 'Сообщения, звонки, имя можно менять в любой момент.',
  'sec.kicker': 'Безопасность', 'sec.h2': 'Что шифруется и как',
  'sec1.t': 'Ключ из кода', 'sec1.d': 'PBKDF2-SHA256, 210 000 итераций. Код никогда не отправляется на сервер.',
  'sec2.t': 'Запечатанные сообщения', 'sec2.d': 'XSalsa20-Poly1305 со случайным nonce для каждого сообщения.',
  'sec3.t': 'Без журналов', 'sec3.d': 'Сессии живут в памяти. Перезапуск стирает всё.',
  'sec4.t': 'Шифрованные звонки', 'sec4.d': 'WebRTC, шифрование медиа DTLS-SRTP, релей TURN для строгих сетей.',
  'sec.link': 'Полное техническое досье: примитивы, ограничения, числа, модель угроз →',
  'final.h2': 'Откройте сессию сейчас.', 'final.cta': 'Открыть сессию', 'share.title': 'Поделиться Seyra', 'share.copy': 'Скопировать ссылку', 'share.copied': 'Ссылка скопирована',
  'news.kicker': 'Обновления', 'news.h1': 'Что изменилось', 'news.lede': 'Каждая версия проверяется перед публикацией. Новое сверху.', 'news.latest': 'Последняя',
  'common.pseudo': 'Ваше имя', 'common.pseudoPh': 'Гость (по умолчанию)',
  'create.title': 'Открыть сессию', 'create.desc': 'Появится код. Поделитесь им, чтобы общаться.',
  'join.title': 'Войти в сессию', 'join.desc': 'Введите код, который вам дали.',
  'create.password': 'Защитить сессию паролем', 'create.passwordLabel': 'Пароль сессии', 'create.passwordPh': 'Сообщите гостям',
  'create.passwordHint': 'Никогда не отправляется на сервер: смешивается с ключом шифрования.',
  'create.history': 'Разрешить новым участникам видеть историю', 'create.historyOn': 'Присоединившиеся увидят ранее отправленные сообщения.', 'create.historyOff': 'По умолчанию новый участник не видит того, что было до него.',
  'create.receipts': 'Уведомления о прочтении', 'create.receiptsOn': 'Все видят, кто прочитал сообщения. Этот выбор виден всем.', 'create.receiptsOff': 'Выключено: никто не видит, кто прочитал.',
  'join.codeLabel': 'Код сессии', 'join.codePh': 'ABCD-EFGH-IJKL', 'join.join': 'Войти', 'join.back': 'Назад', 'join.password': 'Пароль сессии', 'join.busy': 'Подключение…',
  'app.brandSub': 'приватная сессия', 'app.appearance': 'Оформление', 'app.invite': 'Пригласить', 'app.code': 'Код сессии', 'app.codeNote': 'Этот код — ключ. Любой, у кого он есть, может войти.',
  'app.copyCode': 'Код', 'app.copyLink': 'Ссылка-приглашение', 'app.linkCopied': 'Ссылка скопирована', 'app.participants': 'Участники', 'app.duration': 'время', 'app.messages': 'сообщения', 'app.files': 'файлы',
  'app.closeSession': 'Закрыть сессию', 'app.closeNote': 'Закрытие стирает всё для всех участников.', 'app.owner': 'владелец',
  'chat.placeholder': 'Зашифрованное сообщение…', 'chat.reply': 'Ответить…', 'chat.send': 'Отправить', 'chat.voice': 'Записать голосовое',
  'chat.search': 'Поиск в сессии', 'chat.allSenders': 'Все отправители', 'chat.allTypes': 'Все типы', 'chat.you': 'Вы',
  'settings.title': 'Настроить', 'settings.theme': 'Тема', 'settings.wallShared': 'Фон беседы — для всех', 'settings.wallSharedHint': 'Узор применяется ко всей сессии, его видят все. Оставьте его светлым для читаемости.',
  'settings.wallPersonal': 'Личный фон — только для вас, не отправляется', 'settings.textSize': 'Размер текста', 'settings.small': 'Малый', 'settings.normal': 'Обычный', 'settings.large': 'Крупный',
  'settings.comfort': 'Удобство', 'settings.compact': 'Компактный режим', 'settings.compactHint': 'Больше сообщений на экране', 'settings.discreet': 'Скрытный режим', 'settings.discreetHint': 'Текст размыт до наведения', 'settings.sound': 'Звук сообщений', 'settings.soundHint': 'Короткий сигнал на каждое сообщение',
  'settings.import': 'Импортировать изображение',
  'help.title': 'Горячие клавиши', 'help.send': 'Отправить сообщение', 'help.newline': 'Новая строка', 'help.find': 'Поиск в сессии', 'help.paste': 'Вставить изображение или файл', 'help.escape': 'Закрыть окно, выйти из полноэкранного режима', 'help.help': 'Показать эту справку', 'help.poll': 'Вопрос | вариант | вариант: опрос с одним выбором',
  'common.cancel': 'Отмена', 'common.save': 'Сохранить', 'common.delete': 'Удалить', 'common.close': 'Закрыть', 'common.back': 'Назад',
};

const ko: Dict = {
  'nav.features': '기능', 'nav.how': '사용 방법', 'nav.security': '보안', 'nav.news': '새 소식', 'nav.open': '열기', 'nav.home': '홈',
  'announce.title': '기본이 비공개. 아무것도 남지 않습니다.',
  'announce.text': '암호화 세션, 그룹 통화, 카메라와 화면 공유. 계정이 필요 없습니다.',
  'announce.cta': '새 소식 보기',
  'hero.eyebrow': '계정 없는 비공개 메시지',
  'hero.h1a': '하나의 세션.', 'hero.h1b': '하나의 코드.', 'hero.h1c': '아무것도 남지 않습니다.',
  'hero.lede': 'Seyra는 기기에서 암호화된 비공개 대화를 엽니다. 코드를 공유하면 참여하고, 세션은 원할 때 끝납니다.',
  'hero.cta1': '세션 열기', 'hero.cta2': '코드로 참여',
  'hero.p1': '계정 없음', 'hero.p2': '기록 없음', 'hero.p3': '그룹 통화',
  'mock.title': '비공개 세션', 'mock.online': '3명 접속', 'mock.q': '누가 도면을 가져오나요?',
  'mock.a': '보냅니다, 암호화된 채로 남습니다.', 'mock.poll': '오늘 저녁 피자?', 'mock.yes': '네', 'mock.no': '아니요', 'mock.foot': '서버는 아무것도 보지 못합니다',
  'feat.kicker': '기능', 'feat.h2': '중요한 것',
  'f1.t': '계정 없음', 'f1.d': '가입, 전화번호, 이메일이 필요 없습니다. 세션을 열면 끝입니다.',
  'f2.t': '기기에서 암호화', 'f2.d': '키는 코드에서 생성됩니다. 메시지는 브라우저를 떠나기 전에 봉인됩니다.',
  'f3.t': '일회성', 'f3.d': '디스크에 아무것도 쓰지 않습니다. 세션을 닫으면 모두에게서 지워집니다.',
  'f4.t': '통화와 카메라', 'f4.d': 'P2P 음성, 카메라와 소리가 있는 화면 공유. 언제든 음소거할 수 있습니다.',
  'f5.t': '투표와 스레드', 'f5.d': '한 줄 명령으로 투표를 열고 스레드로 답합니다. 투표는 암호화됩니다.',
  'f6.t': '읽음 확인', 'f6.d': '선택 사항이며 세션 생성 시 정합니다. 기본은 꺼짐입니다.',
  'how.kicker': '사용 방법', 'how.h2': '세 단계',
  's1.t': '세션 열기', 's1.d': '12자리 코드가 나타납니다. 그것이 키입니다.',
  's2.t': '공유하기', 's2.d': '링크, 코드, QR 코드 중 선택하세요.',
  's3.t': '대화하기', 's3.d': '메시지와 통화, 이름은 언제든 바꿀 수 있습니다.',
  'sec.kicker': '보안', 'sec.h2': '무엇을 어떻게 암호화하는지',
  'sec1.t': '코드에서 만든 키', 'sec1.d': 'PBKDF2-SHA256, 210,000회 반복. 코드는 서버로 전송되지 않습니다.',
  'sec2.t': '봉인된 메시지', 'sec2.d': 'XSalsa20-Poly1305, 메시지마다 무작위 nonce를 사용합니다.',
  'sec3.t': '로그 없음', 'sec3.d': '세션은 메모리에만 존재합니다. 재시작하면 모두 지워집니다.',
  'sec4.t': '암호화 통화', 'sec4.d': 'WebRTC, DTLS-SRTP 미디어 암호화, 제한된 네트워크에는 TURN 중계.',
  'sec.link': '전체 기술 문서 읽기: 기법, 한계, 수치, 위협 모델 →',
  'final.h2': '지금 세션을 여세요.', 'final.cta': '세션 열기', 'share.title': 'Seyra 공유', 'share.copy': '링크 복사', 'share.copied': '링크 복사됨',
  'news.kicker': '새 소식', 'news.h1': '무엇이 바뀌었나', 'news.lede': '모든 버전은 배포 전에 테스트됩니다. 최신이 위에 있습니다.', 'news.latest': '최신',
  'common.pseudo': '닉네임', 'common.pseudoPh': '게스트 (기본)',
  'create.title': '세션 열기', 'create.desc': '코드가 나타납니다. 공유하면 대화할 수 있습니다.',
  'join.title': '세션 참여', 'join.desc': '받은 코드를 입력하세요.',
  'create.password': '비밀번호로 세션 보호', 'create.passwordLabel': '세션 비밀번호', 'create.passwordPh': '초대한 사람에게 알려주세요',
  'create.passwordHint': '서버로 전송되지 않습니다. 암호화 키에 섞입니다.',
  'create.history': '새 참가자가 기록을 보도록 허용', 'create.historyOn': '참여한 사람이 이전 메시지를 봅니다.', 'create.historyOff': '기본적으로 새 참가자는 이전 내용을 볼 수 없습니다.',
  'create.receipts': '읽음 확인', 'create.receiptsOn': '모두가 누가 읽었는지 봅니다. 이 설정은 모두에게 보입니다.', 'create.receiptsOff': '꺼짐: 누가 읽었는지 아무도 보지 못합니다.',
  'join.codeLabel': '세션 코드', 'join.codePh': 'ABCD-EFGH-IJKL', 'join.join': '참여', 'join.back': '뒤로', 'join.password': '세션 비밀번호', 'join.busy': '연결 중…',
  'app.brandSub': '비공개 세션', 'app.appearance': '모양', 'app.invite': '초대', 'app.code': '세션 코드', 'app.codeNote': '이 코드가 키입니다. 가진 사람은 누구나 참여할 수 있습니다.',
  'app.copyCode': '코드', 'app.copyLink': '초대 링크', 'app.linkCopied': '링크 복사됨', 'app.participants': '참가자', 'app.duration': '시간', 'app.messages': '메시지', 'app.files': '파일',
  'app.closeSession': '세션 닫기', 'app.closeNote': '닫으면 모든 참가자의 내용이 지워집니다.', 'app.owner': '소유자',
  'chat.placeholder': '암호화된 메시지…', 'chat.reply': '답장…', 'chat.send': '보내기', 'chat.voice': '음성 메시지 녹음',
  'chat.search': '세션에서 검색', 'chat.allSenders': '모든 발신자', 'chat.allTypes': '모든 유형', 'chat.you': '나',
  'settings.title': '꾸미기', 'settings.theme': '테마', 'settings.wallShared': '대화 배경 — 모두에게 적용', 'settings.wallSharedHint': '무늬가 세션 전체에 적용되어 모두가 봅니다. 읽기 쉽게 가볍게 유지하세요.',
  'settings.wallPersonal': '개인 배경 — 나만 보기, 전송되지 않음', 'settings.textSize': '글자 크기', 'settings.small': '작게', 'settings.normal': '보통', 'settings.large': '크게',
  'settings.comfort': '편의', 'settings.compact': '조밀한 배치', 'settings.compactHint': '화면에 더 많은 메시지', 'settings.discreet': '은밀 모드', 'settings.discreetHint': '가리키기 전까지 글자가 흐려집니다', 'settings.sound': '메시지 소리', 'settings.soundHint': '새 메시지마다 짧은 알림음',
  'settings.import': '이미지 가져오기',
  'help.title': '단축키', 'help.send': '메시지 보내기', 'help.newline': '줄 바꿈', 'help.find': '세션에서 검색', 'help.paste': '이미지나 파일 붙여넣기', 'help.escape': '창 닫기, 전체 화면 종료', 'help.help': '이 도움말 보기', 'help.poll': '질문 | 선택지 | 선택지: 단일 선택 투표',
  'common.cancel': '취소', 'common.save': '저장', 'common.delete': '삭제', 'common.close': '닫기', 'common.back': '뒤로',
};

const ar: Dict = {
  'nav.features': 'الميزات', 'nav.how': 'كيف يعمل', 'nav.security': 'الأمان', 'nav.news': 'الجديد', 'nav.open': 'فتح', 'nav.home': 'الرئيسية',
  'announce.title': 'خاص افتراضيًا. لا يبقى شيء.',
  'announce.text': 'جلسات مشفرة، مكالمات جماعية، كاميرا ومشاركة الشاشة. بدون حساب.',
  'announce.cta': 'اكتشف الجديد',
  'hero.eyebrow': 'رسائل خاصة، بدون حساب',
  'hero.h1a': 'جلسة واحدة.', 'hero.h1b': 'رمز واحد.', 'hero.h1c': 'لا شيء يبقى.',
  'hero.lede': 'يفتح Seyra محادثات خاصة مشفرة على جهازك. شارك رمزًا، فينضم الآخرون، وتنتهي الجلسة عندما تقرر.',
  'hero.cta1': 'افتح جلسة', 'hero.cta2': 'انضم برمز',
  'hero.p1': 'بدون حساب', 'hero.p2': 'بدون سجل', 'hero.p3': 'مكالمات جماعية',
  'mock.title': 'جلسة خاصة', 'mock.online': '3 متصلين', 'mock.q': 'من يحضر المخططات؟',
  'mock.a': 'أرسلها، وتبقى مشفرة.', 'mock.poll': 'بيتزا الليلة؟', 'mock.yes': 'نعم', 'mock.no': 'لا', 'mock.foot': 'الخادم لا يرى شيئًا',
  'feat.kicker': 'الميزات', 'feat.h2': 'ما يهم',
  'f1.t': 'بدون حساب', 'f1.d': 'بدون تسجيل أو رقم هاتف أو بريد إلكتروني. افتح جلسة وانتهى الأمر.',
  'f2.t': 'مشفر على جهازك', 'f2.d': 'يُشتق المفتاح من الرمز. تُختم الرسائل قبل مغادرة المتصفح.',
  'f3.t': 'مؤقت', 'f3.d': 'لا شيء يُكتب على القرص. إغلاق الجلسة يمحو كل شيء للجميع.',
  'f4.t': 'مكالمات وكاميرا', 'f4.d': 'صوت بين الأقران، كاميرا ومشاركة شاشة مع الصوت. اكتم الميكروفون أو السماعات في أي وقت.',
  'f5.t': 'استطلاعات وسلاسل', 'f5.d': 'ابدأ استطلاعًا بأمر واحد، وردّ في سلسلة. تبقى الأصوات مشفرة.',
  'f6.t': 'إشعارات القراءة', 'f6.d': 'اختيارية، تُحدد عند إنشاء الجلسة. معطلة افتراضيًا.',
  'how.kicker': 'كيف', 'how.h2': 'ثلاث خطوات',
  's1.t': 'افتح جلسة', 's1.d': 'يظهر رمز من 12 حرفًا. إنه المفتاح.',
  's2.t': 'شاركه', 's2.d': 'رابط أو رمز أو رمز QR، كما تشاء.',
  's3.t': 'تحدث', 's3.d': 'رسائل ومكالمات، وغيّر اسمك في أي وقت.',
  'sec.kicker': 'الأمان', 'sec.h2': 'ما المشفر، وكيف',
  'sec1.t': 'مفتاح من الرمز', 'sec1.d': 'PBKDF2-SHA256، 210,000 تكرار. لا يُرسل الرمز إلى الخادم أبدًا.',
  'sec2.t': 'رسائل مختومة', 'sec2.d': 'XSalsa20-Poly1305 مع nonce عشوائي لكل رسالة.',
  'sec3.t': 'بلا سجلات', 'sec3.d': 'تعيش الجلسات في الذاكرة. إعادة التشغيل تمحو كل شيء.',
  'sec4.t': 'مكالمات مشفرة', 'sec4.d': 'WebRTC، تشفير وسائط DTLS-SRTP، ومرحّل TURN للشبكات المقيدة.',
  'sec.link': 'اقرأ الملف التقني الكامل: الأساسيات، الحدود، الأرقام، نموذج التهديد ←',
  'final.h2': 'افتح جلسة الآن.', 'final.cta': 'افتح جلسة', 'share.title': 'شارك Seyra', 'share.copy': 'نسخ الرابط', 'share.copied': 'تم نسخ الرابط',
  'news.kicker': 'الجديد', 'news.h1': 'ما تغيّر', 'news.lede': 'تُختبر كل نسخة قبل النشر. الأحدث أولًا.', 'news.latest': 'الأحدث',
  'common.pseudo': 'اسمك', 'common.pseudoPh': 'ضيف (افتراضي)',
  'create.title': 'افتح جلسة', 'create.desc': 'يظهر رمز. شاركه للدردشة.',
  'join.title': 'انضم إلى جلسة', 'join.desc': 'أدخل الرمز الذي أُعطي لك.',
  'create.password': 'احمِ الجلسة بكلمة مرور', 'create.passwordLabel': 'كلمة مرور الجلسة', 'create.passwordPh': 'شاركها مع الضيوف',
  'create.passwordHint': 'لا تُرسل إلى الخادم أبدًا: تُدمج في مفتاح التشفير.',
  'create.history': 'اسمح للقادمين برؤية السجل', 'create.historyOn': 'سيرى المنضمون الرسائل المرسلة سابقًا.', 'create.historyOff': 'افتراضيًا لا يرى القادم شيئًا قيل قبل وصوله.',
  'create.receipts': 'إشعارات القراءة', 'create.receiptsOn': 'يرى الجميع من قرأ ماذا. هذا الخيار ظاهر للجميع.', 'create.receiptsOff': 'معطلة: لا يرى أحد من قرأ ماذا.',
  'join.codeLabel': 'رمز الجلسة', 'join.codePh': 'ABCD-EFGH-IJKL', 'join.join': 'انضم', 'join.back': 'رجوع', 'join.password': 'كلمة مرور الجلسة', 'join.busy': 'جارٍ الاتصال…',
  'app.brandSub': 'جلسة خاصة', 'app.appearance': 'المظهر', 'app.invite': 'دعوة', 'app.code': 'رمز الجلسة', 'app.codeNote': 'هذا الرمز هو المفتاح. أي شخص يملكه يمكنه الانضمام.',
  'app.copyCode': 'الرمز', 'app.copyLink': 'رابط الدعوة', 'app.linkCopied': 'تم نسخ الرابط', 'app.participants': 'المشاركون', 'app.duration': 'المدة', 'app.messages': 'الرسائل', 'app.files': 'الملفات',
  'app.closeSession': 'أغلق الجلسة', 'app.closeNote': 'الإغلاق يمحو كل شيء لجميع المشاركين.', 'app.owner': 'المالك',
  'chat.placeholder': 'رسالة مشفرة…', 'chat.reply': 'رد…', 'chat.send': 'إرسال', 'chat.voice': 'سجّل رسالة صوتية',
  'chat.search': 'ابحث في هذه الجلسة', 'chat.allSenders': 'كل المرسلين', 'chat.allTypes': 'كل الأنواع', 'chat.you': 'أنت',
  'settings.title': 'تخصيص', 'settings.theme': 'السمة', 'settings.wallShared': 'خلفية المحادثة — للجميع', 'settings.wallSharedHint': 'يُطبق النمط على الجلسة: يراه الجميع. أبقِه خفيفًا لسهولة القراءة.',
  'settings.wallPersonal': 'خلفية شخصية — لك وحدك، لا تُرسل أبدًا', 'settings.textSize': 'حجم النص', 'settings.small': 'صغير', 'settings.normal': 'عادي', 'settings.large': 'كبير',
  'settings.comfort': 'الراحة', 'settings.compact': 'كثافة مضغوطة', 'settings.compactHint': 'رسائل أكثر على الشاشة', 'settings.discreet': 'الوضع الحذر', 'settings.discreetHint': 'يضباب النص حتى تمرر المؤشر', 'settings.sound': 'أصوات الرسائل', 'settings.soundHint': 'صفير قصير عند كل رسالة جديدة',
  'settings.import': 'استيراد صورة',
  'help.title': 'الاختصارات', 'help.send': 'أرسل الرسالة', 'help.newline': 'سطر جديد', 'help.find': 'ابحث في هذه الجلسة', 'help.paste': 'الصق صورة أو ملفًا', 'help.escape': 'أغلق نافذة، اخرج من ملء الشاشة', 'help.help': 'اعرض هذه المساعدة', 'help.poll': 'سؤال | خيار | خيار: استطلاع بخيار واحد',
  'common.cancel': 'إلغاء', 'common.save': 'حفظ', 'common.delete': 'حذف', 'common.close': 'إغلاق', 'common.back': 'رجوع',
};

const DICT: Record<Lang, Dict> = { en, fr, zh, ru, ko, ar };

/** Chaînes des applications (appstrings) : même clés pour les six langues. */
for (const lang of Object.keys(APPSTR) as Lang[]) {
  if (DICT[lang]) Object.assign(DICT[lang], APPSTR[lang]);
}

Object.assign(DICT.ar, {
  'wall.none': 'سادة', 'wall.dots': 'نقاط', 'wall.grid': 'شبكة', 'wall.lines': 'خطوط', 'wall.cross': 'صلبان', 'wall.bubbles': 'فقاعات', 'wall.waves': 'أمواج', 'wall.arcs': 'أقواس',
  'wall.signature': 'توقيع',
  'chat.sessionTitle': 'جلسة خاصة', 'chat.connected': 'متصل', 'chat.online': 'متصل', 'chat.connecting': 'جارٍ الاتصال…', 'chat.offline': 'غير متصل',
  'chat.results': 'نتائج', 'chat.e2e': 'مشفر على هذا الجهاز بالمفتاح المشتق من الرمز. الخادم لا يرى شيئًا.', 'chat.noResult': 'لا نتائج',
  'chat.open': 'الجلسة مفتوحة', 'chat.tryOther': 'جرّب كلمة أخرى.', 'chat.openHint': 'شارك الرمز لدعوة شخص. كل شيء يختفي عند إغلاق الجلسة.',
  'chat.guest': 'ضيف', 'app.remove': 'إزالة', 'app.copied': 'تم النسخ', 'time.today': 'اليوم', 'time.yesterday': 'أمس',
  'poll.new': 'استطلاع جديد', 'poll.question': 'السؤال', 'poll.options': 'الخيارات', 'poll.removeOption': 'إزالة الخيار',
  'poll.add': 'إضافة خيار', 'poll.hint': 'الأصوات مشفرة. يمكن لكل مشارك التصويت، والنقر مرة أخرى يزيل صوته.', 'poll.create': 'إنشاء استطلاع',
  'edit.title': 'تعديل الرسالة', 'edit.hint': 'سيرى الآخرون النص المعدّل، مع علامة «معدّل». لا يُحتفظ بالأصل.',
  'chat.replyTo': 'رد', 'chat.copy': 'نسخ', 'chat.replyingTo': 'الرد على', 'chat.mentionList': 'مشاركون للإشارة إليهم', 'chat.pinnedList': 'الرسائل المثبتة',
  'thread.title': 'سلسلة', 'thread.root': 'الرسالة الأصلية',
  'poll.example': 'بيتزا الليلة؟',
  'settings.tip': 'نصيحة: زر الشاشة في الرأس يشارك شاشتك أثناء مكالمة.',
  'wall.matrix': 'مصفوفة', 'wall.cracks': 'أرض متشققة', 'wall.plates': 'بلاط',
  'settings.wallPersonalLabel': 'خلفية المحادثة', 'settings.wallPersonalHint': 'على هذا الجهاز فقط، محفوظة في متصفحك. لا يُرسل شيء إلى الجلسة.',
  'invite.copyFail': 'تعذر النسخ: حدد الرابط يدويًا.', 'invite.copied': 'تم نسخ الرابط', 'invite.copyLink': 'نسخ الرابط',
  'invite.hideQr': 'إخفاء رمز QR', 'invite.showQr': 'إظهار رمز QR', 'invite.title': 'دعوة',
  'invite.hint': 'يفتح الرابط ورمز QR التطبيق مع الرمز معبأً مسبقًا.', 'invite.close': 'إغلاق',
  'rename.title': 'اسمك', 'rename.hint': 'سيراه المشاركون الآخرون. يمكنك تغييره في أي وقت.',
  'code.title': 'الجلسة مفتوحة', 'code.hint': 'شارك هذا الرمز. إنه مفتاح التشفير: بدونه لا يمكن قراءة الرسائل.',
  'code.copy': 'نسخ', 'code.copied': 'تم النسخ', 'code.trust': 'شاركه فقط عبر قناة تثق بها.', 'code.start': 'لنبدأ',
  'kick.title': 'إزالة', 'kick.hint': 'سيُفصل هذا المشارك ولن يتمكن من العودة إلى هذه الجلسة.', 'kick.confirm': 'إزالة',
  'close.title': 'إغلاق الجلسة؟', 'close.hint': 'ستُمحى كل الرسائل نهائيًا، لك وللمشاركين الآخرين.', 'close.confirm': 'أغلق وامحُ',
  'help.enter': 'أرسل الرسالة', 'help.newline': 'سطر جديد', 'help.find': 'ابحث في هذه الجلسة', 'help.paste': 'الصق صورة أو ملفًا',
  'help.escape': 'أغلق نافذة، اخرج من ملء الشاشة', 'help.help': 'اعرض هذه المساعدة', 'help.poll': 'سؤال | خيار | خيار: استطلاع بخيار واحد',
  'notice.joined': 'انضم {name} إلى الجلسة', 'notice.left': 'غادر {name} الجلسة', 'notice.kicked': 'أُزيل {name} من الجلسة',
  'notice.closed': 'أُغلقت الجلسة. مُحيت الرسائل.', 'notice.removed': 'أزالك المالك من الجلسة.',
  'err.sessionUnavailable': 'الجلسة غير متاحة.', 'err.createFailed': 'تعذر إنشاء الجلسة.', 'err.voiceTooLong': 'الرسالة الصوتية طويلة جدًا. جرّب رسالة أقصر.',
  'share.watch': 'شاهد واستمع إلى هذه المشاركة', 'share.reopen': 'أعد فتح مشاركة',
  'type.text': 'نص', 'type.photo': 'صور', 'type.video': 'فيديو', 'type.file': 'ملفات', 'type.voice': 'صوت', 'type.poll': 'استطلاعات',
  'ttl.perm': 'دائم', 'ttl.s30': '30 ثانية', 'ttl.m1': 'دقيقة واحدة', 'ttl.m5': '5 دقائق', 'ttl.m15': '15 دقيقة', 'ttl.h1': 'ساعة واحدة',
  'poll.incomplete': 'استطلاع غير مكتمل. الصيغة:', 'poll.votes': 'أصوات', 'poll.choose': 'اختر خيارًا', 'poll.removeVote': 'انقر مرة أخرى لإزالة صوتك',
  'call.leave': 'مغادرة المكالمة', 'call.voice': 'مكالمة صوتية', 'call.incoming': 'بدأ {name} مكالمة صوتية',
  'pin.goto': 'اذهب إلى الرسالة المثبتة', 'pin.unpin': 'إلغاء التثبيت', 'pin.pin': 'تثبيت', 'react.add': 'أضف تفاعلًا',
  'attach.file': 'أرفق ملفًا', 'attach.photoLight': 'صورة · خفيفة', 'attach.photoBalanced': 'صورة · متوازنة',
  'attach.photoMax': 'صورة · أعلى جودة', 'attach.photoOriginal': 'صورة · أصلية',
  'qr.failed': 'تعذر إنشاء رمز QR.', 'qr.loading': 'جارٍ إنشاء رمز QR…', 'qr.alt': 'رمز QR للدعوة',
  'edit.action': 'تعديل', 'ttl.badge': 'رسالة مؤقتة', 'reply.cancel': 'إلغاء الرد', 'rec.cancel': 'إلغاء التسجيل',
  'voice.unreadable': 'غير قابل للقراءة', 'voice.oldFormat': 'لا يستطيع هذا المتصفح تشغيل هذه الصيغة القديمة',
  'select.enter': 'اختر الرسائل', 'select.exit': 'إلغاء التحديد', 'select.count': '{n} محدد', 'select.copy': 'نسخ', 'select.delete': 'حذف',
  'select.none': 'لم تُحدد أي رسالة', 'select.copied': 'تم نسخ {n} رسالة', 'select.copyFail': 'تعذر نسخ التحديد',
  'help.navKeys': 'J / K: الرسالة التالية / السابقة',
  'wait.title': 'في انتظار الموافقة', 'wait.hint': 'يجب أن يسمح لك مالك الجلسة بالدخول.', 'wait.pending': 'في الانتظار',
  'wait.admit': 'اسمح بالدخول', 'wait.deny': 'رفض', 'wait.toggle': 'غرفة الانتظار', 'wait.toggleHint': 'يوافق المالك على كل قادم جديد.',
  'wait.admitted': 'يمكنك الدخول الآن.', 'wait.denied': 'لم يسمح لك المالك بالدخول.',
  'owner.make': 'اجعله مالكًا', 'owner.badge': 'مالك', 'owner.changed': 'أصبح {name} المالك الآن',
  'settings.colorblind': 'مناسب لعمى الألوان', 'settings.colorblindHint': 'أزرق وبرتقالي بدل الأخضر والأحمر', 'theme.contrast': 'تباين عالٍ',
  'poll.noVotes': 'لا أصوات', 'msg.voice': 'رسالة صوتية', 'ttl.titleOn': 'تختفي هذه الرسالة للجميع بعد هذه المدة',
  'ttl.titleOff': 'تبقى هذه الرسالة في الجلسة', 'rec.hint': 'رسالة صوتية…', 'rec.send': 'أرسل الرسالة الصوتية', 'rec.start': 'سجّل رسالة صوتية',
  'search.close': 'أغلق البحث', 'share.close': 'إغلاق: التوقف عن رؤية وسماع هذه المشاركة',
  'board.title': 'لوح أبيض', 'board.hint': 'الخطوط مشفرة وتختفي مع الجلسة.', 'board.clear': 'مسح', 'board.close': 'إغلاق', 'board.open': 'لوح أبيض',
  'transcribe.start': 'إملاء', 'transcribe.stop': 'إيقاف الإملاء', 'transcribe.local': 'يعمل على هذا الجهاز', 'transcribe.unsupported': 'غير متاح على هذا المتصفح',
  'whisper.toggle': 'همس', 'whisper.to': 'إلى', 'whisper.hint': 'هذا الشخص وحده يستلمها. لا تُخزن.', 'whisper.badge': 'همس',
  'ghost.option': 'جلسة شبح', 'ghost.hint': 'تُغلق تلقائيًا بعد مغادرة المنشئ', 'ghost.min': '{n} دقيقة', 'ghost.off': 'معطلة',
  'ghost.banner': 'غادر المنشئ. تُغلق الجلسة خلال', 'ghost.closed': 'أُغلقت الجلسة بعد مغادرة المنشئ.', 'panic.done': 'غادرت الجلسة.',
});

// langue du document au chargement
if (typeof document !== 'undefined') {
  document.documentElement.lang = current;
  document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
}

/* Libellés des motifs de fond (ajoutés après le dictionnaire principal). */
Object.assign(DICT.en, { 'wall.none': 'Plain', 'wall.dots': 'Dots', 'wall.grid': 'Grid', 'wall.lines': 'Lines', 'wall.cross': 'Crosses', 'wall.bubbles': 'Bubbles', 'wall.waves': 'Waves', 'wall.arcs': 'Arcs' });
Object.assign(DICT.fr, { 'wall.none': 'Uni', 'wall.dots': 'Points', 'wall.grid': 'Grille', 'wall.lines': 'Lignes', 'wall.cross': 'Croix', 'wall.bubbles': 'Bulles', 'wall.waves': 'Vagues', 'wall.arcs': 'Arcs' });
Object.assign(DICT.zh, { 'wall.none': '??', 'wall.dots': '??', 'wall.grid': '??', 'wall.lines': '??', 'wall.cross': '??', 'wall.bubbles': '??', 'wall.waves': '??', 'wall.arcs': '??' });
Object.assign(DICT.ru, { 'wall.none': '??????????', 'wall.dots': '?????', 'wall.grid': '?????', 'wall.lines': '?????', 'wall.cross': '????????', 'wall.bubbles': '??????', 'wall.waves': '?????', 'wall.arcs': '????' });
Object.assign(DICT.ko, { 'wall.none': '??', 'wall.dots': '?', 'wall.grid': '??', 'wall.lines': '?', 'wall.cross': '??', 'wall.bubbles': '??', 'wall.waves': '??', 'wall.arcs': '?' });

Object.assign(DICT.en, { 'wall.signature': 'Signature' });
Object.assign(DICT.fr, { 'wall.signature': 'Signature' });
Object.assign(DICT.zh, { 'wall.signature': '??' });
Object.assign(DICT.ru, { 'wall.signature': '?????????' });
Object.assign(DICT.ko, { 'wall.signature': '????' });

/* Chaîne de l'application (session, recherche, dates). */
Object.assign(DICT.en, {
  "chat.sessionTitle": "Private session",
  "chat.connected": "connected",
  "chat.online": "online",
  "chat.connecting": "connecting…",
  "chat.offline": "offline",
  "chat.results": "results",
  "chat.e2e": "Encrypted on this device with the key derived from the code. The server sees nothing.",
  "chat.noResult": "No results",
  "chat.open": "Session open",
  "chat.tryOther": "Try another word.",
  "chat.openHint": "Share the code to invite someone. Everything disappears when the session closes.",
  "chat.guest": "Guest",
  "app.remove": "Remove",
  "app.copied": "Copied",
  "time.today": "Today",
  "time.yesterday": "Yesterday"
});
Object.assign(DICT.fr, {
  "chat.sessionTitle": "Session privée",
  "chat.connected": "connecté",
  "chat.online": "en ligne",
  "chat.connecting": "connexion…",
  "chat.offline": "hors ligne",
  "chat.results": "résultats",
  "chat.e2e": "Chiffré sur cet appareil avec la clé dérivée du code. Le serveur ne voit rien.",
  "chat.noResult": "Aucun résultat",
  "chat.open": "Session ouverte",
  "chat.tryOther": "Essayez un autre mot.",
  "chat.openHint": "Partagez le code pour inviter quelqu’un. Tout disparaît quand la session se ferme.",
  "chat.guest": "Invité",
  "app.remove": "Retirer",
  "app.copied": "Copié",
  "time.today": "Aujourd’hui",
  "time.yesterday": "Hier"
});
Object.assign(DICT.zh, {
  "chat.sessionTitle": "私密会话",
  "chat.connected": "人在线",
  "chat.online": "在线",
  "chat.connecting": "连接中…",
  "chat.offline": "离线",
  "chat.results": "条结果",
  "chat.e2e": "使用由代码派生的密钥在本设备加密。服务器看不到任何内容。",
  "chat.noResult": "无结果",
  "chat.open": "会话已开启",
  "chat.tryOther": "换个词试试。",
  "chat.openHint": "分享代码即可邀请他人。关闭会话后全部消失。",
  "chat.guest": "访客",
  "app.remove": "移除",
  "app.copied": "已复制",
  "time.today": "今天",
  "time.yesterday": "昨天"
});
Object.assign(DICT.ru, {
  "chat.sessionTitle": "Приватная сессия",
  "chat.connected": "на связи",
  "chat.online": "в сети",
  "chat.connecting": "подключение…",
  "chat.offline": "не в сети",
  "chat.results": "результатов",
  "chat.e2e": "Зашифровано на этом устройстве ключом, выведенным из кода. Сервер ничего не видит.",
  "chat.noResult": "Ничего не найдено",
  "chat.open": "Сессия открыта",
  "chat.tryOther": "Попробуйте другое слово.",
  "chat.openHint": "Поделитесь кодом, чтобы пригласить. Всё исчезнет при закрытии сессии.",
  "chat.guest": "Гость",
  "app.remove": "Удалить",
  "app.copied": "Скопировано",
  "time.today": "Сегодня",
  "time.yesterday": "Вчера"
});
Object.assign(DICT.ko, {
  "chat.sessionTitle": "비공개 세션",
  "chat.connected": "명 접속",
  "chat.online": "온라인",
  "chat.connecting": "연결 중…",
  "chat.offline": "오프라인",
  "chat.results": "개 결과",
  "chat.e2e": "코드에서 만든 키로 이 기기에서 암호화합니다. 서버는 아무것도 보지 못합니다.",
  "chat.noResult": "결과 없음",
  "chat.open": "세션 열림",
  "chat.tryOther": "다른 단어를 입력해 보세요.",
  "chat.openHint": "코드를 공유해 초대하세요. 세션을 닫으면 모두 사라집니다.",
  "chat.guest": "게스트",
  "app.remove": "내보내기",
  "app.copied": "복사됨",
  "time.today": "오늘",
  "time.yesterday": "어제"
});

Object.assign(DICT.en, {
  "poll.new": "New poll",
  "poll.question": "Question",
  "poll.options": "Options",
  "poll.removeOption": "Remove option",
  "poll.add": "Add an option",
  "poll.hint": "Votes are encrypted. Each participant can vote, and clicking again removes their vote.",
  "poll.create": "Create poll",
  "edit.title": "Edit message",
  "edit.hint": "Others will see the edited text, marked “edited”. The original is not kept.",
  "chat.replyTo": "Reply",
  "chat.copy": "Copy",
  "chat.replyingTo": "Replying to",
  "chat.mentionList": "Participants to mention",
  "chat.pinnedList": "Pinned messages",
  "thread.title": "Thread",
  "thread.root": "Original message"
});
Object.assign(DICT.fr, {
  "poll.new": "Nouveau sondage",
  "poll.question": "Question",
  "poll.options": "Options",
  "poll.removeOption": "Retirer l’option",
  "poll.add": "Ajouter une option",
  "poll.hint": "Le vote est chiffré. Chaque participant peut voter, et cliquer à nouveau retire son vote.",
  "poll.create": "Créer le sondage",
  "edit.title": "Modifier le message",
  "edit.hint": "Les autres verront le texte modifié, avec la mention « modifié ». L’original n’est pas conservé.",
  "chat.replyTo": "Répondre",
  "chat.copy": "Copier",
  "chat.replyingTo": "Répondre à",
  "chat.mentionList": "Participants à mentionner",
  "chat.pinnedList": "Messages épinglés",
  "thread.title": "Fil de discussion",
  "thread.root": "Message d’origine"
});

Object.assign(DICT.en, { 'poll.example': 'Pizza tonight?' });
Object.assign(DICT.fr, { 'poll.example': 'Pizza ce soir ?' });

Object.assign(DICT.en, { 'settings.tip': 'Tip: the screen button in the header shares your screen during a call.' });
Object.assign(DICT.fr, { 'settings.tip': 'Astuce : le bouton écran dans l’en-tête partage votre écran pendant un appel.' });

Object.assign(DICT.en, { 'wall.matrix': 'Matrix' });
Object.assign(DICT.fr, { 'wall.matrix': 'Matrix' });
Object.assign(DICT.zh, { 'wall.matrix': '??' });
Object.assign(DICT.ru, { 'wall.matrix': '???????' });
Object.assign(DICT.ko, { 'wall.matrix': '????' });

Object.assign(DICT.en, { 'wall.cracks': 'Cracked earth' });
Object.assign(DICT.zh, { 'wall.cracks': '????' });
Object.assign(DICT.ru, { 'wall.cracks': '???????' });
Object.assign(DICT.ko, { 'wall.cracks': '??? ?' });

Object.assign(DICT.en, { 'wall.plates': 'Tiles' });
Object.assign(DICT.zh, { 'wall.plates': '??' });
Object.assign(DICT.ru, { 'wall.plates': '???????' });
Object.assign(DICT.ko, { 'wall.plates': '??' });

Object.assign(DICT.en, { 'settings.wallPersonalLabel': 'Conversation background', 'settings.wallPersonalHint': 'Only on this device, saved in your browser. Nothing is sent to the session.' });
Object.assign(DICT.fr, { 'settings.wallPersonalLabel': 'Fond de la conversation', 'settings.wallPersonalHint': 'Uniquement sur cet appareil, enregistré dans le navigateur. Rien n’est envoyé à la session.' });
Object.assign(DICT.zh, { 'settings.wallPersonalLabel': '聊天背景', 'settings.wallPersonalHint': '仅保存在本设备浏览器中，不会发送到会话。' });
Object.assign(DICT.ru, { 'settings.wallPersonalLabel': 'Фон беседы', 'settings.wallPersonalHint': 'Только на этом устройстве, сохраняется в браузере. В сессию ничего не отправляется.' });
Object.assign(DICT.ko, { 'settings.wallPersonalLabel': '대화 배경', 'settings.wallPersonalHint': '이 기기의 브라우저에만 저장되며 세션으로 전송되지 않습니다.' });

/* Chaînes des fenêtres, menus et notifications. */
Object.assign(DICT.en, {"invite.copyFail":"Could not copy: select the link manually.","invite.copied":"Link copied","invite.copyLink":"Copy link","invite.hideQr":"Hide QR code","invite.showQr":"Show QR code","invite.title":"Invite","invite.hint":"The link and QR code open the app with the code already filled in.","invite.close":"Close","rename.title":"Your name","rename.hint":"Other participants will see it. You can change it at any time.","code.title":"Session open","code.hint":"Share this code. It is the encryption key: without it, messages are unreadable.","code.copy":"Copy","code.copied":"Copied","code.trust":"Only share it over a channel you trust.","code.start":"Let's go","kick.title":"Remove","kick.hint":"This participant will be disconnected and cannot rejoin this session.","kick.confirm":"Remove","close.title":"Close the session?","close.hint":"All messages will be permanently erased, for you and for the other participants.","close.confirm":"Close and erase","help.enter":"Send the message","help.newline":"New line","help.find":"Search this session","help.paste":"Paste an image or a file","help.escape":"Close a window, exit fullscreen","help.help":"Show this help","help.poll":"Question | option | option: single-choice poll","notice.joined":"{name} joined the session","notice.left":"{name} left the session","notice.kicked":"{name} was removed from the session","notice.closed":"The session was closed. Messages were erased.","notice.removed":"The owner removed you from the session.","err.sessionUnavailable":"Session unavailable.","err.createFailed":"Could not create the session.","err.voiceTooLong":"Voice message too long. Try a shorter one.","share.watch":"Watch and hear this share","share.reopen":"Reopen the share of","type.text":"Text","type.photo":"Photos","type.video":"Videos","type.file":"Files","type.voice":"Voice","type.poll":"Polls","ttl.perm":"Permanent","ttl.s30":"30 seconds","ttl.m1":"1 minute","ttl.m5":"5 minutes","ttl.m15":"15 minutes","ttl.h1":"1 hour","poll.incomplete":"Incomplete poll. Format:","poll.votes":"votes","poll.choose":"choose an option","poll.removeVote":"click again to remove your vote","call.leave":"Leave the call","call.voice":"Voice call","call.incoming":"{name} started a voice call","pin.goto":"Go to the pinned message","pin.unpin":"Unpin","pin.pin":"Pin","react.add":"Add a reaction","attach.file":"Attach a file","attach.photoLight":"Photo · light","attach.photoBalanced":"Photo · balanced","attach.photoMax":"Photo · max quality","attach.photoOriginal":"Photo · original","qr.failed":"Could not generate the QR code.","qr.loading":"Generating the QR code…","qr.alt":"Invite QR code"});
Object.assign(DICT.fr, {"invite.copyFail":"Copie impossible : sélectionnez le lien à la main.","invite.copied":"Lien copié","invite.copyLink":"Copier le lien","invite.hideQr":"Masquer le QR code","invite.showQr":"Afficher le QR code","invite.title":"Inviter","invite.hint":"Le lien et le QR code ouvrent l’app avec le code déjà rempli.","invite.close":"Fermer","rename.title":"Votre pseudo","rename.hint":"Les autres participants le verront. Vous pouvez le changer à tout moment.","code.title":"Session ouverte","code.hint":"Partagez ce code. Il sert de clé de chiffrement : sans lui, les messages sont illisibles.","code.copy":"Copier","code.copied":"Copié","code.trust":"Ne le partagez que par un canal de confiance.","code.start":"C’est parti","kick.title":"Retirer","kick.hint":"Ce participant sera déconnecté et ne pourra plus rejoindre cette session.","kick.confirm":"Retirer","close.title":"Fermer la session ?","close.hint":"Tous les messages seront définitivement effacés, pour vous et pour les autres participants.","close.confirm":"Fermer et effacer","help.enter":"Envoyer le message","help.newline":"Nouvelle ligne","help.find":"Rechercher dans la session","help.paste":"Coller une image ou un fichier","help.escape":"Fermer une fenêtre, quitter le plein écran","help.help":"Afficher cette aide","help.poll":"Question | option | option : sondage à choix unique","notice.joined":"{name} a rejoint la session","notice.left":"{name} a quitté la session","notice.kicked":"{name} a été retiré de la session","notice.closed":"La session a été fermée. Les messages ont été effacés.","notice.removed":"Le propriétaire vous a retiré de la session.","err.sessionUnavailable":"Session indisponible.","err.createFailed":"Impossible de créer la session.","err.voiceTooLong":"Message vocal trop long. Réessayez plus court.","share.watch":"Voir et entendre ce partage","share.reopen":"Rouvrir le partage de","type.text":"Texte","type.photo":"Photos","type.video":"Vidéos","type.file":"Fichiers","type.voice":"Vocaux","type.poll":"Sondages","ttl.perm":"Permanent","ttl.s30":"30 secondes","ttl.m1":"1 minute","ttl.m5":"5 minutes","ttl.m15":"15 minutes","ttl.h1":"1 heure","poll.incomplete":"Sondage incomplet. Format :","poll.votes":"votes","poll.choose":"choisissez une option","poll.removeVote":"cliquez à nouveau pour retirer votre vote","call.leave":"Quitter l’appel","call.voice":"Appel vocal","call.incoming":"{name} a lancé un appel vocal","pin.goto":"Aller au message épinglé","pin.unpin":"Désépingler","pin.pin":"Épingler","react.add":"Ajouter une réaction","attach.file":"Joindre un fichier","attach.photoLight":"Photo · légère","attach.photoBalanced":"Photo · équilibrée","attach.photoMax":"Photo · qualité max","attach.photoOriginal":"Photo · originale","qr.failed":"Impossible de générer le QR code.","qr.loading":"Génération du QR code…","qr.alt":"QR code d’invitation"});
Object.assign(DICT.zh, {"invite.copyFail":"无法复制：请手动选择链接。","invite.copied":"链接已复制","invite.copyLink":"复制链接","invite.hideQr":"隐藏二维码","invite.showQr":"显示二维码","invite.title":"邀请","invite.hint":"链接和二维码会打开应用并自动填入代码。","invite.close":"关闭","rename.title":"您的昵称","rename.hint":"其他参与者会看到，随时可以更改。","code.title":"会话已开启","code.hint":"分享此代码，它是加密密钥：没有它消息无法读取。","code.copy":"复制","code.copied":"已复制","code.trust":"只通过可信渠道分享。","code.start":"开始","kick.title":"移除","kick.hint":"该参与者将被断开，且无法再加入此会话。","kick.confirm":"移除","close.title":"关闭会话？","close.hint":"所有消息将被永久删除，您和其他参与者都无法恢复。","close.confirm":"关闭并删除","help.enter":"发送消息","help.newline":"换行","help.find":"在会话中搜索","help.paste":"粘贴图片或文件","help.escape":"关闭窗口，退出全屏","help.help":"显示此帮助","help.poll":"问题 | 选项 | 选项：单选投票","notice.joined":"{name} 加入了会话","notice.left":"{name} 离开了会话","notice.kicked":"{name} 已被移出会话","notice.closed":"会话已关闭，消息已删除。","notice.removed":"创建者已将您移出会话。","err.sessionUnavailable":"会话不可用。","err.createFailed":"无法创建会话。","err.voiceTooLong":"语音消息太长，请缩短。","share.watch":"观看并收听此共享","share.reopen":"重新打开共享：","type.text":"文本","type.photo":"照片","type.video":"视频","type.file":"文件","type.voice":"语音","type.poll":"投票","ttl.perm":"永久","ttl.s30":"30 秒","ttl.m1":"1 分钟","ttl.m5":"5 分钟","ttl.m15":"15 分钟","ttl.h1":"1 小时","poll.incomplete":"投票不完整。格式：","poll.votes":"票","poll.choose":"请选择一个选项","poll.removeVote":"再次点击可撤回投票","call.leave":"离开通话","call.voice":"语音通话","call.incoming":"{name} 发起了语音通话","pin.goto":"前往置顶消息","pin.unpin":"取消置顶","pin.pin":"置顶","react.add":"添加表情回应","attach.file":"添加文件","attach.photoLight":"照片 · 轻量","attach.photoBalanced":"照片 · 均衡","attach.photoMax":"照片 · 最高质量","attach.photoOriginal":"照片 · 原图","qr.failed":"无法生成二维码。","qr.loading":"正在生成二维码…","qr.alt":"邀请二维码"});
Object.assign(DICT.ru, {"invite.copyFail":"Не удалось скопировать: выделите ссылку вручную.","invite.copied":"Ссылка скопирована","invite.copyLink":"Скопировать ссылку","invite.hideQr":"Скрыть QR-код","invite.showQr":"Показать QR-код","invite.title":"Пригласить","invite.hint":"Ссылка и QR-код открывают приложение с уже введённым кодом.","invite.close":"Закрыть","rename.title":"Ваше имя","rename.hint":"Другие увидят его. Можно изменить в любой момент.","code.title":"Сессия открыта","code.hint":"Поделитесь кодом. Это ключ шифрования: без него сообщения не читаются.","code.copy":"Копировать","code.copied":"Скопировано","code.trust":"Делитесь только по доверенному каналу.","code.start":"Поехали","kick.title":"Удалить","kick.hint":"Участник будет отключён и не сможет вернуться в сессию.","kick.confirm":"Удалить","close.title":"Закрыть сессию?","close.hint":"Все сообщения будут удалены навсегда — у вас и у других участников.","close.confirm":"Закрыть и удалить","help.enter":"Отправить сообщение","help.newline":"Новая строка","help.find":"Поиск в сессии","help.paste":"Вставить изображение или файл","help.escape":"Закрыть окно, выйти из полноэкранного режима","help.help":"Показать справку","help.poll":"Вопрос | вариант | вариант: опрос с одним выбором","notice.joined":"{name} присоединился к сессии","notice.left":"{name} покинул сессию","notice.kicked":"{name} удалён из сессии","notice.closed":"Сессия закрыта. Сообщения удалены.","notice.removed":"Владелец удалил вас из сессии.","err.sessionUnavailable":"Сессия недоступна.","err.createFailed":"Не удалось создать сессию.","err.voiceTooLong":"Голосовое сообщение слишком длинное.","share.watch":"Смотреть и слушать","share.reopen":"Открыть снова трансляцию","type.text":"Текст","type.photo":"Фото","type.video":"Видео","type.file":"Файлы","type.voice":"Голос","type.poll":"Опросы","ttl.perm":"Постоянно","ttl.s30":"30 секунд","ttl.m1":"1 минута","ttl.m5":"5 минут","ttl.m15":"15 минут","ttl.h1":"1 час","poll.incomplete":"Опрос неполный. Формат:","poll.votes":"голосов","poll.choose":"выберите вариант","poll.removeVote":"нажмите снова, чтобы отменить голос","call.leave":"Выйти из звонка","call.voice":"Голосовой звонок","call.incoming":"{name} начал голосовой звонок","pin.goto":"К закреплённому сообщению","pin.unpin":"Открепить","pin.pin":"Закрепить","react.add":"Добавить реакцию","attach.file":"Прикрепить файл","attach.photoLight":"Фото · лёгкое","attach.photoBalanced":"Фото · сбалансированное","attach.photoMax":"Фото · максимум","attach.photoOriginal":"Фото · оригинал","qr.failed":"Не удалось создать QR-код.","qr.loading":"Создание QR-кода…","qr.alt":"QR-код приглашения"});
Object.assign(DICT.ko, {"invite.copyFail":"복사할 수 없습니다. 링크를 직접 선택하세요.","invite.copied":"링크 복사됨","invite.copyLink":"링크 복사","invite.hideQr":"QR 코드 숨기기","invite.showQr":"QR 코드 표시","invite.title":"초대","invite.hint":"링크와 QR 코드로 코드가 채워진 채 앱이 열립니다.","invite.close":"닫기","rename.title":"닉네임","rename.hint":"다른 참가자에게 보입니다. 언제든 바꿀 수 있습니다.","code.title":"세션 열림","code.hint":"이 코드를 공유하세요. 암호화 키이므로 없으면 메시지를 읽을 수 없습니다.","code.copy":"복사","code.copied":"복사됨","code.trust":"신뢰할 수 있는 경로로만 공유하세요.","code.start":"시작하기","kick.title":"내보내기","kick.hint":"이 참가자는 연결이 끊기고 다시 참여할 수 없습니다.","kick.confirm":"내보내기","close.title":"세션을 닫을까요?","close.hint":"모든 메시지가 영구 삭제되며 복구할 수 없습니다.","close.confirm":"닫고 삭제","help.enter":"메시지 보내기","help.newline":"줄 바꿈","help.find":"세션에서 검색","help.paste":"이미지나 파일 붙여넣기","help.escape":"창 닫기, 전체 화면 종료","help.help":"이 도움말 보기","help.poll":"질문 | 선택지 | 선택지: 단일 선택 투표","notice.joined":"{name} 님이 참여했습니다","notice.left":"{name} 님이 나갔습니다","notice.kicked":"{name} 님이 내보내졌습니다","notice.closed":"세션이 닫혔습니다. 메시지가 삭제되었습니다.","notice.removed":"소유자가 회원님을 내보냈습니다.","err.sessionUnavailable":"세션을 사용할 수 없습니다.","err.createFailed":"세션을 만들 수 없습니다.","err.voiceTooLong":"음성 메시지가 너무 깁니다.","share.watch":"공유 보기 및 듣기","share.reopen":"공유 다시 열기","type.text":"텍스트","type.photo":"사진","type.video":"동영상","type.file":"파일","type.voice":"음성","type.poll":"투표","ttl.perm":"영구","ttl.s30":"30초","ttl.m1":"1분","ttl.m5":"5분","ttl.m15":"15분","ttl.h1":"1시간","poll.incomplete":"투표가 완성되지 않았습니다. 형식:","poll.votes":"표","poll.choose":"항목을 선택하세요","poll.removeVote":"다시 클릭하면 투표가 취소됩니다","call.leave":"통화 나가기","call.voice":"음성 통화","call.incoming":"{name} 님이 음성 통화를 시작했습니다","pin.goto":"고정된 메시지로 이동","pin.unpin":"고정 해제","pin.pin":"고정","react.add":"반응 추가","attach.file":"파일 첨부","attach.photoLight":"사진 · 가벼움","attach.photoBalanced":"사진 · 균형","attach.photoMax":"사진 · 최고 품질","attach.photoOriginal":"사진 · 원본","qr.failed":"QR 코드를 만들 수 없습니다.","qr.loading":"QR 코드 생성 중…","qr.alt":"초대 QR 코드"});


Object.assign(DICT.en, {"edit.action":"Edit","ttl.badge":"Temporary message","reply.cancel":"Cancel reply","rec.cancel":"Cancel recording","voice.unreadable":"unreadable","voice.oldFormat":"This browser cannot play this older format"});
Object.assign(DICT.zh, {"edit.action":"??","ttl.badge":"????","reply.cancel":"????","rec.cancel":"????","voice.unreadable":"????","voice.oldFormat":"????????????"});
Object.assign(DICT.ru, {"edit.action":"????????","ttl.badge":"????????? ?????????","reply.cancel":"???????? ?????","rec.cancel":"???????? ??????","voice.unreadable":"?? ????????","voice.oldFormat":"??????? ?? ???????????? ???? ?????? ??????"});
Object.assign(DICT.ko, {"edit.action":"??","ttl.badge":"?? ???","reply.cancel":"?? ??","rec.cancel":"?? ??","voice.unreadable":"?? ??","voice.oldFormat":"? ??????? ?? ??? ??? ? ????"});

Object.assign(DICT.en, {"select.enter":"Select messages","select.exit":"Cancel selection","select.count":"{n} selected","select.copy":"Copy","select.delete":"Delete","select.none":"No message selected","select.copied":"{n} messages copied","select.copyFail":"Could not copy the selection","help.navKeys":"J / K: next / previous message","wait.title":"Waiting for approval","wait.hint":"The owner of the session must let you in.","wait.pending":"Waiting","wait.admit":"Admit","wait.deny":"Deny","wait.toggle":"Waiting room","wait.toggleHint":"The owner approves each new arrival.","wait.admitted":"You can enter now.","wait.denied":"The owner did not let you in.","owner.make":"Make owner","owner.badge":"owner","owner.changed":"{name} is now the owner","settings.colorblind":"Colour-blind friendly","settings.colorblindHint":"Blue and orange instead of green and red","theme.contrast":"High contrast"});
Object.assign(DICT.zh, {"select.enter":"????","select.exit":"????","select.count":"??? {n} ?","select.copy":"??","select.delete":"??","select.none":"?????","select.copied":"??? {n} ???","select.copyFail":"????????","help.navKeys":"J / K:??? / ?????","wait.title":"????","wait.hint":"????????????","wait.pending":"???","wait.admit":"????","wait.deny":"??","wait.toggle":"???","wait.toggleHint":"?????????????","wait.admitted":"????????","wait.denied":"???????????","owner.make":"?????","owner.badge":"???","owner.changed":"{name} ??????","settings.colorblind":"????","settings.colorblindHint":"?????????????","theme.contrast":"????"});
Object.assign(DICT.ru, {"select.enter":"??????? ?????????","select.exit":"???????? ?????","select.count":"???????: {n}","select.copy":"??????????","select.delete":"???????","select.none":"????????? ?? ???????","select.copied":"??????????? ?????????: {n}","select.copyFail":"?? ??????? ???????????","help.navKeys":"J / K: ????????? / ?????????? ?????????","wait.title":"???????? ?????????","wait.hint":"???????? ?????? ?????? ??? ????????.","wait.pending":"???????","wait.admit":"????????","wait.deny":"?????????","wait.toggle":"??????? ????????","wait.toggleHint":"???????? ???????? ??????? ?????? ?????????.","wait.admitted":"?????? ????? ?????.","wait.denied":"???????? ?? ??????? ???.","owner.make":"??????? ??????????","owner.badge":"????????","owner.changed":"{name} ?????? ????????","settings.colorblind":"????? ??? ???????????","settings.colorblindHint":"????? ? ????????? ?????? ???????? ? ????????","theme.contrast":"??????? ????????"});

/* Chaînes ajoutées après coup (réinjectées proprement). */
Object.assign(DICT.en, {"poll.noVotes":"No votes","msg.voice":"Voice message","ttl.titleOn":"This message disappears for everyone after this delay","ttl.titleOff":"This message stays in the session","rec.hint":"Voice message…","rec.send":"Send the voice message","rec.start":"Record a voice message","search.close":"Close search","share.close":"Close: stop seeing and hearing this share"});
Object.assign(DICT.fr, {"poll.noVotes":"Aucun vote","msg.voice":"Message vocal","ttl.titleOn":"Ce message disparaîtra pour tout le monde après ce délai","ttl.titleOff":"Ce message reste dans la session","rec.hint":"Message vocal…","rec.send":"Envoyer le message vocal","rec.start":"Enregistrer un message vocal","search.close":"Fermer la recherche","share.close":"Fermer : ne plus voir ni entendre ce partage"});
Object.assign(DICT.zh, {"poll.noVotes":"暂无投票","msg.voice":"语音消息","ttl.titleOn":"此消息将在该时间后对所有人消失","ttl.titleOff":"此消息会保留在会话中","rec.hint":"语音消息…","rec.send":"发送语音消息","rec.start":"录制语音消息","search.close":"关闭搜索","share.close":"关闭：不再观看和收听此共享"});
Object.assign(DICT.ru, {"poll.noVotes":"Нет голосов","msg.voice":"Голосовое сообщение","ttl.titleOn":"Сообщение исчезнет у всех через это время","ttl.titleOff":"Сообщение останется в сессии","rec.hint":"Голосовое сообщение…","rec.send":"Отправить голосовое","rec.start":"Записать голосовое","search.close":"Закрыть поиск","share.close":"Закрыть: не видеть и не слышать трансляцию"});
Object.assign(DICT.ko, {"poll.noVotes":"투표 없음","msg.voice":"음성 메시지","ttl.titleOn":"이 시간이 지나면 모두에게서 사라집니다","ttl.titleOff":"이 메시지는 세션에 남습니다","rec.hint":"음성 메시지…","rec.send":"음성 메시지 보내기","rec.start":"음성 메시지 녹음","search.close":"검색 닫기","share.close":"닫기: 이 공유를 더 이상 보거나 듣지 않음"});
Object.assign(DICT.en, {"edit.action":"Edit","ttl.badge":"Temporary message","reply.cancel":"Cancel reply","rec.cancel":"Cancel recording","voice.unreadable":"unreadable","voice.oldFormat":"This browser cannot play this older format"});
Object.assign(DICT.fr, {"edit.action":"Modifier","ttl.badge":"Message temporaire","reply.cancel":"Annuler la réponse","rec.cancel":"Annuler l’enregistrement","voice.unreadable":"illisible","voice.oldFormat":"Ce navigateur ne peut pas lire cet ancien format"});
Object.assign(DICT.zh, {"edit.action":"编辑","ttl.badge":"临时消息","reply.cancel":"取消回复","rec.cancel":"取消录音","voice.unreadable":"无法播放","voice.oldFormat":"此浏览器无法播放该旧格式"});
Object.assign(DICT.ru, {"edit.action":"Изменить","ttl.badge":"Временное сообщение","reply.cancel":"Отменить ответ","rec.cancel":"Отменить запись","voice.unreadable":"не читается","voice.oldFormat":"Браузер не поддерживает этот старый формат"});
Object.assign(DICT.ko, {"edit.action":"수정","ttl.badge":"임시 메시지","reply.cancel":"답장 취소","rec.cancel":"녹음 취소","voice.unreadable":"재생 불가","voice.oldFormat":"이 브라우저에서는 이전 형식을 재생할 수 없습니다"});
Object.assign(DICT.en, {"select.enter":"Select messages","select.exit":"Cancel selection","select.count":"{n} selected","select.copy":"Copy","select.delete":"Delete","select.none":"No message selected","select.copied":"{n} messages copied","select.copyFail":"Could not copy the selection","help.navKeys":"J / K: next / previous message","wait.title":"Waiting for approval","wait.hint":"The owner of the session must let you in.","wait.pending":"Waiting","wait.admit":"Admit","wait.deny":"Deny","wait.toggle":"Waiting room","wait.toggleHint":"The owner approves each new arrival.","wait.admitted":"You can enter now.","wait.denied":"The owner did not let you in.","owner.make":"Make owner","owner.badge":"owner","owner.changed":"{name} is now the owner","settings.colorblind":"Colour-blind friendly","settings.colorblindHint":"Blue and orange instead of green and red","theme.contrast":"High contrast"});
Object.assign(DICT.fr, {"select.enter":"Sélectionner des messages","select.exit":"Annuler la sélection","select.count":"{n} sélectionné(s)","select.copy":"Copier","select.delete":"Supprimer","select.none":"Aucun message sélectionné","select.copied":"{n} messages copiés","select.copyFail":"Copie impossible","help.navKeys":"J / K : message suivant / précédent","wait.title":"En attente d’approbation","wait.hint":"Le propriétaire de la session doit vous laisser entrer.","wait.pending":"En attente","wait.admit":"Faire entrer","wait.deny":"Refuser","wait.toggle":"Salon d’attente","wait.toggleHint":"Le propriétaire approuve chaque nouvel arrivant.","wait.admitted":"Vous pouvez entrer.","wait.denied":"Le propriétaire ne vous a pas laissé entrer.","owner.make":"Nommer propriétaire","owner.badge":"propriétaire","owner.changed":"{name} est maintenant propriétaire","settings.colorblind":"Adapté au daltonisme","settings.colorblindHint":"Bleu et orange au lieu de vert et rouge","theme.contrast":"Contraste élevé"});
Object.assign(DICT.zh, {"select.enter":"选择消息","select.exit":"取消选择","select.count":"已选择 {n} 条","select.copy":"复制","select.delete":"删除","select.none":"未选择消息","select.copied":"已复制 {n} 条消息","select.copyFail":"无法复制所选内容","help.navKeys":"J / K：下一条 / 上一条消息","wait.title":"等待批准","wait.hint":"会话创建者需要让你进入。","wait.pending":"等待中","wait.admit":"允许进入","wait.deny":"拒绝","wait.toggle":"等候室","wait.toggleHint":"创建者批准每一位新加入者。","wait.admitted":"你现在可以进入。","wait.denied":"创建者没有允许你进入。","owner.make":"设为创建者","owner.badge":"创建者","owner.changed":"{name} 现在是创建者","settings.colorblind":"色盲友好","settings.colorblindHint":"用蓝色和橙色代替绿色和红色","theme.contrast":"高对比度"});
Object.assign(DICT.ru, {"select.enter":"Выбрать сообщения","select.exit":"Отменить выбор","select.count":"Выбрано: {n}","select.copy":"Копировать","select.delete":"Удалить","select.none":"Сообщения не выбраны","select.copied":"Скопировано сообщений: {n}","select.copyFail":"Не удалось скопировать","help.navKeys":"J / K: следующее / предыдущее сообщение","wait.title":"Ожидание одобрения","wait.hint":"Владелец сессии должен вас впустить.","wait.pending":"Ожидают","wait.admit":"Впустить","wait.deny":"Отклонить","wait.toggle":"Комната ожидания","wait.toggleHint":"Владелец одобряет каждого нового участника.","wait.admitted":"Теперь можно войти.","wait.denied":"Владелец не впустил вас.","owner.make":"Сделать владельцем","owner.badge":"владелец","owner.changed":"{name} теперь владелец","settings.colorblind":"Режим для дальтоников","settings.colorblindHint":"Синий и оранжевый вместо зелёного и красного","theme.contrast":"Высокий контраст"});
Object.assign(DICT.ko, {"select.enter":"메시지 선택","select.exit":"선택 취소","select.count":"{n}개 선택됨","select.copy":"복사","select.delete":"삭제","select.none":"선택된 메시지 없음","select.copied":"메시지 {n}개 복사됨","select.copyFail":"선택 항목을 복사할 수 없습니다","help.navKeys":"J / K: 다음 / 이전 메시지","wait.title":"승인 대기 중","wait.hint":"세션 소유자가 입장을 허용해야 합니다.","wait.pending":"대기 중","wait.admit":"입장 허용","wait.deny":"거절","wait.toggle":"대기실","wait.toggleHint":"소유자가 새 참가자를 한 명씩 승인합니다.","wait.admitted":"이제 입장할 수 있습니다.","wait.denied":"소유자가 입장을 허용하지 않았습니다.","owner.make":"소유자로 지정","owner.badge":"소유자","owner.changed":"{name} 님이 소유자가 되었습니다","settings.colorblind":"색약 친화","settings.colorblindHint":"초록·빨강 대신 파랑·주황 사용","theme.contrast":"고대비"});

Object.assign(DICT.en, {"board.title":"Whiteboard","board.hint":"Strokes are encrypted and disappear with the session.","board.clear":"Clear","board.close":"Close","board.open":"Whiteboard","transcribe.start":"Dictate","transcribe.stop":"Stop dictation","transcribe.local":"Runs on this device","transcribe.unsupported":"Not available on this browser","whisper.toggle":"Whisper","whisper.to":"To","whisper.hint":"Only this person receives it. Not stored.","whisper.badge":"whisper","ghost.option":"Ghost session","ghost.hint":"Closes automatically after the creator leaves","ghost.min":"{n} min","ghost.off":"Off","ghost.banner":"Creator left. Session closes in","ghost.closed":"The session closed after the creator left.","panic.done":"Left the session."});
Object.assign(DICT.fr, {"board.title":"Tableau blanc","board.hint":"Les traits sont chiffrés et disparaissent avec la session.","board.clear":"Effacer","board.close":"Fermer","board.open":"Tableau blanc","transcribe.start":"Dicter","transcribe.stop":"Arrêter la dictée","transcribe.local":"Fonctionne sur cet appareil","transcribe.unsupported":"Indisponible sur ce navigateur","whisper.toggle":"Chuchoter","whisper.to":"À","whisper.hint":"Seule cette personne le reçoit. Rien n'est stocké.","whisper.badge":"chuchotement","ghost.option":"Session fantôme","ghost.hint":"Se ferme automatiquement après le départ du créateur","ghost.min":"{n} min","ghost.off":"Non","ghost.banner":"Le créateur est parti. Fermeture dans","ghost.closed":"La session s'est fermée après le départ du créateur.","panic.done":"Session quittée."});
Object.assign(DICT.zh, {"board.title":"??","board.hint":"??????,????????","board.clear":"??","board.close":"??","board.open":"??","transcribe.start":"????","transcribe.stop":"??????","transcribe.local":"???????","transcribe.unsupported":"???????","whisper.toggle":"??","whisper.to":"??","whisper.hint":"???????,?????","whisper.badge":"??","ghost.option":"????","ghost.hint":"??????????","ghost.min":"{n} ??","ghost.off":"??","ghost.banner":"??????,???????????","ghost.closed":"????????????","panic.done":"??????"});
Object.assign(DICT.ru, {"board.title":"?????","board.hint":"?????? ??????????? ? ???????? ?????? ? ???????.","board.clear":"????????","board.close":"???????","board.open":"?????","transcribe.start":"?????????","transcribe.stop":"?????????? ????????","transcribe.local":"???????? ?? ???? ??????????","transcribe.unsupported":"?????????? ? ???? ????????","whisper.toggle":"?????","whisper.to":"????","whisper.hint":"??????? ?????? ???? ???????. ?? ???????????.","whisper.badge":"?????","ghost.option":"??????-???????","ghost.hint":"??????????? ????????????? ????? ????? ?????????","ghost.min":"{n} ???","ghost.off":"????","ghost.banner":"????????? ????. ???????? ?????","ghost.closed":"?????? ????????? ????? ????? ?????????.","panic.done":"?? ????? ?? ??????."});
Object.assign(DICT.ko, {"board.title":"?????","board.hint":"?? ????? ??? ?? ?????.","board.clear":"???","board.close":"??","board.open":"?????","transcribe.start":"????","transcribe.stop":"???? ??","transcribe.local":"? ???? ??","transcribe.unsupported":"? ??????? ??? ? ??","whisper.toggle":"???","whisper.to":"?? ??","whisper.hint":"? ??? ????. ???? ????.","whisper.badge":"???","ghost.option":"?? ??","ghost.hint":"???? ??? ???? ??","ghost.min":"{n}?","ghost.off":"?","ghost.banner":"???? ?????. ????","ghost.closed":"???? ?? ? ??? ?????.","panic.done":"???? ?????."});


/* Applications de bureau et Android. */
Object.assign(DICT.en, {"dl.kicker":"Apps","dl.title":"Seyra on desktop and Android","dl.sub":"The web version stays available. Same encryption, same sessions. Install it as an app and open it in one click.","dl.win":"Windows installer","dl.winNote":"Windows 10 / 11 · 64-bit · installs in your user folder, no admin","dl.android":"Android APK","dl.apkNote":"Android 6 and later · install directly","dl.version":"Version 2.4.3","dl.verify":"Verify (SHA-256)"});
Object.assign(DICT.fr, {"dl.kicker":"Applications","dl.title":"Seyra sur ordinateur et sur Android","dl.sub":"La version web reste disponible. Même chiffrement, mêmes sessions. Installez-la comme une appli et ouvrez-la en un clic.","dl.win":"Installateur Windows","dl.winNote":"Windows 10 / 11 · 64 bits · installation dans votre dossier utilisateur, sans administrateur","dl.android":"APK Android","dl.apkNote":"Android 6 et plus · installation directe","dl.version":"Version 2.4.3","dl.verify":"Vérifier (SHA-256)"});
Object.assign(DICT.zh, {"dl.kicker":"应用","dl.title":"在电脑和安卓上使用 Seyra","dl.sub":"网页版仍然可用。同样的加密，同样的会话。把它安装成应用，一键打开。","dl.win":"Windows 安装程序","dl.winNote":"Windows 10 / 11 · 64 位 · 安装到用户目录，无需管理员","dl.android":"Android APK","dl.apkNote":"Android 6 及以上 · 直接安装","dl.version":"版本 2.4.3","dl.verify":"校验 (SHA-256)"});
Object.assign(DICT.ru, {"dl.kicker":"Приложения","dl.title":"Seyra на компьютере и на Android","dl.sub":"Веб-версия остаётся доступной. То же шифрование, те же сессии. Установите приложение и открывайте в один клик.","dl.win":"Установщик Windows","dl.winNote":"Windows 10 / 11 · 64 бита · установка в папку пользователя, без администратора","dl.android":"APK для Android","dl.apkNote":"Android 6 и новее · прямая установка","dl.version":"Версия 2.4.3","dl.verify":"Проверить (SHA-256)"});
Object.assign(DICT.ko, {"dl.kicker":"앱","dl.title":"컴퓨터와 Android에서 Seyra","dl.sub":"웹 버전은 그대로 사용할 수 있습니다. 같은 암호화, 같은 세션. 앱으로 설치하면 한 번에 열 수 있습니다.","dl.win":"Windows 설치 프로그램","dl.winNote":"Windows 10 / 11 · 64비트 · 사용자 폴더에 설치, 관리자 권한 불필요","dl.android":"Android APK","dl.apkNote":"Android 6 이상 · 바로 설치","dl.version":"버전 2.4.3","dl.verify":"확인 (SHA-256)"});
Object.assign(DICT.ar, {"dl.kicker":"التطبيقات","dl.title":"سيرا على الحاسوب وأندرويد","dl.sub":"نسخة الويب تبقى متاحة. نفس التشفير ونفس الجلسات. ثبّتها كتطبيق وافتحها بنقرة واحدة.","dl.win":"مثبّت ويندوز","dl.winNote":"ويندوز 10 / 11 · 64 بت · التثبيت في مجلد المستخدم دون صلاحيات إدارية","dl.android":"ملف أندرويد APK","dl.apkNote":"أندرويد 6 فما فوق · تثبيت مباشر","dl.version":"الإصدار 2.4.3","dl.verify":"التحقق (SHA-256)"});

/* Piece jointe : une seule qualite photo. */
Object.assign(DICT.en, {"attach.photo":"Photo"});
Object.assign(DICT.fr, {"attach.photo":"Photo"});
Object.assign(DICT.zh, {"attach.photo":"照片"});
Object.assign(DICT.ru, {"attach.photo":"Фото"});
Object.assign(DICT.ko, {"attach.photo":"사진"});
Object.assign(DICT.ar, {"attach.photo":"صورة"});

/* Libellés d'accessibilité passés en i18n. */
Object.assign(DICT.en, {"act.filterSender":"Filter by sender","act.forged":"The author announced by the server does not match the one sealed in the message.","act.showShare":"Show the share again","act.stopShare":"Stop sharing","act.showCall":"Show the call again","act.moveCall":"Drag to move","act.hideCall":"Hide the call window","act.download":"Download","act.attach":"Attach","ttl.duration":"Message duration","lock.protected":"Protected session"});
Object.assign(DICT.fr, {"act.filterSender":"Filtrer par expéditeur","act.forged":"L'auteur annoncé par le serveur ne correspond pas à celui scellé dans le message.","act.showShare":"Réafficher le partage","act.stopShare":"Arrêter le partage","act.showCall":"Réafficher l'appel","act.moveCall":"Glissez pour déplacer","act.hideCall":"Masquer la fenêtre d'appel","act.download":"Télécharger","act.attach":"Joindre","ttl.duration":"Durée du message","lock.protected":"Session protégée"});
Object.assign(DICT.zh, {"act.filterSender":"按发送者筛选","act.forged":"服务器声明的作者与消息中封存的作者不一致。","act.showShare":"重新显示共享","act.stopShare":"停止共享","act.showCall":"重新显示通话","act.moveCall":"拖动以移动","act.hideCall":"隐藏通话窗口","act.download":"下载","act.attach":"附件","ttl.duration":"消息有效期","lock.protected":"受保护的会话"});
Object.assign(DICT.ru, {"act.filterSender":"Фильтр по отправителю","act.forged":"Автор, указанный сервером, не совпадает с запечатанным в сообщении.","act.showShare":"Снова показать показ экрана","act.stopShare":"Остановить показ","act.showCall":"Снова показать звонок","act.moveCall":"Перетащите, чтобы переместить","act.hideCall":"Скрыть окно звонка","act.download":"Скачать","act.attach":"Прикрепить","ttl.duration":"Срок жизни сообщения","lock.protected":"Защищённая сессия"});
Object.assign(DICT.ko, {"act.filterSender":"보낸 사람으로 필터","act.forged":"서버가 알린 작성자가 메시지에 봉인된 작성자와 다릅니다.","act.showShare":"공유 다시 표시","act.stopShare":"공유 중지","act.showCall":"통화 다시 표시","act.moveCall":"끌어서 이동","act.hideCall":"통화 창 숨기기","act.download":"다운로드","act.attach":"첨부","ttl.duration":"메시지 유효 시간","lock.protected":"보호된 세션"});
Object.assign(DICT.ar, {"act.filterSender":"تصفية حسب المرسل","act.forged":"المؤلف المعلن من الخادم لا يطابق المؤلف المختوم في الرسالة.","act.showShare":"إظهار المشاركة مجددًا","act.stopShare":"إيقاف المشاركة","act.showCall":"إظهار المكالمة مجددًا","act.moveCall":"اسحب للتحريك","act.hideCall":"إخفاء نافذة المكالمة","act.download":"تنزيل","act.attach":"إرفاق","ttl.duration":"مدة الرسالة","lock.protected":"جلسة محمية"});

/* Applications macOS et Linux. */
Object.assign(DICT.en, {"dl.mac":"macOS","dl.macNote":"Apple Silicon and Intel · universal","dl.linux":"Linux","dl.linuxNote":"AppImage · portable","dl.deb":"Debian / Ubuntu package:","dl.unsigned":"Not code-signed yet. On macOS, right-click the app and choose Open the first time."});
Object.assign(DICT.fr, {"dl.mac":"macOS","dl.macNote":"Apple Silicon et Intel · universel","dl.linux":"Linux","dl.linuxNote":"AppImage · portable","dl.deb":"Paquet Debian / Ubuntu :","dl.unsigned":"Pas encore signé. Sur macOS, faites un clic droit sur l’app puis Ouvrir la première fois."});
Object.assign(DICT.zh, {"dl.mac":"macOS","dl.macNote":"Apple Silicon 与 Intel · 通用","dl.linux":"Linux","dl.linuxNote":"AppImage · 便携","dl.deb":"Debian / Ubuntu 安装包：","dl.unsigned":"尚未签名。macOS 首次打开时请右键点击应用并选择“打开”。"});
Object.assign(DICT.ru, {"dl.mac":"macOS","dl.macNote":"Apple Silicon и Intel · универсальный","dl.linux":"Linux","dl.linuxNote":"AppImage · портативный","dl.deb":"Пакет Debian / Ubuntu:","dl.unsigned":"Пока без подписи. В macOS при первом запуске нажмите на приложение правой кнопкой и выберите «Открыть»."});
Object.assign(DICT.ko, {"dl.mac":"macOS","dl.macNote":"Apple Silicon 및 Intel · 유니버설","dl.linux":"Linux","dl.linuxNote":"AppImage · 포터블","dl.deb":"Debian / Ubuntu 패키지:","dl.unsigned":"아직 서명되지 않았습니다. macOS에서는 처음 실행할 때 앱을 마우스 오른쪽 버튼으로 클릭하고 '열기'를 선택하세요."});
Object.assign(DICT.ar, {"dl.mac":"macOS","dl.macNote":"Apple Silicon و Intel · شامل","dl.linux":"Linux","dl.linuxNote":"AppImage · محمول","dl.deb":"حزمة Debian / Ubuntu:","dl.unsigned":"غير موقّع بعد. على macOS، انقر بزر الفأرة الأيمن على التطبيق واختر فتح في المرة الأولى."});
