export type Participant = {
  id: string;
  name: string;
  color: number;
};

export type Msg = {
  id: string;
  from: string;
  cipher: string;
  nonce: string;
  ts: number;
  kind: 'text' | 'call' | 'react' | 'voice' | 'file' | 'filechunk' | 'ack';
  /** Limite d'expiration pour un message temporaire. */
  expiresAt?: number;
  /** Identifiant de transfert (fichier découpé en morceaux). */
  fid?: string;
};

/** Réponse à un message : l'aperçu est chiffré dans l'enveloppe. */
export type ReplyTo = { id: string; from: string; text: string };

/** Clip vocal chiffré dans l'enveloppe (base64, format du navigateur). */
export type VoiceClip = { mime: string; data: string; dur: number };

/** Métadonnées d'un fichier, scellées avec le contenu. */
export type FileMeta = {
  fid: string;
  name: string;
  mime: string;
  size: number;
  kind: 'image' | 'video' | 'file';
  w?: number;
  h?: number;
};

/** Corps chiffré d'un message texte, vocal ou fichier.
 *  `from` est scellé avec le contenu : le serveur ne peut pas réattribuer
 *  un message sans casser le déchiffrement. */
export type Envelope = {
  text?: string;
  audio?: VoiceClip;
  file?: FileMeta;
  reply?: ReplyTo | null;
  poll?: Poll;
  /** Texte remplacé par une édition de l'auteur (affiché avec « modifié »). */
  edited?: boolean;
  from?: string;
};

/** Sondage à choix unique, scellé dans le message. `id` relie les votes. */
export type Poll = { id: string; q: string; opts: string[] };

/** Votes : pollId -> participant -> index de l'option choisie. */
export type Votes = Record<string, Record<string, number>>;

/** Contrôle scellé (kind 'react') : réaction, épingle, vote, édition.
 *  Le kind 'ack' ne porte que `read` (accusé de lecture, non stocké). */
export type ControlBody = {
  react?: { rid?: unknown; emoji?: unknown; on?: unknown };
  pin?: { mid?: unknown; on?: unknown };
  vote?: { pid?: unknown; opt?: unknown };
  edit?: { mid?: unknown; text?: unknown };
  read?: { ts?: unknown };
};

/** Un morceau de fichier : base64 brut, scellé séparément. */
export type ChunkBody = { chunk: { fid: string; i: number; n: number; data: string } };

/** Corps chiffré d'une réaction (message de kind 'react'). */
export type ReactBody = { react: { rid: string; emoji: string; on: boolean } };

/** msgId -> emoji -> identifiants des participants. */
export type Reactions = Record<string, Record<string, string[]>>;

export type Notice = {
  id: string;
  text: string;
  ts: number;
};

export type SessionInfo = {
  roomId: string;
  selfId: string;
  selfName: string;
  createdAt: number;
};
