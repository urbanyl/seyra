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
  kind: 'text' | 'call';
};

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
