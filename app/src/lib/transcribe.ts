/* Reconnaissance vocale 100 % locale.
 * Aucun repli vers la version réseau : si le navigateur ne peut pas transcrire
 * sur l'appareil, on ne renvoie rien et la fonctionnalité reste cachée.
 */

export type LocalSpeech = {
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type Result = { isFinal: boolean; length: number; [index: number]: { transcript: string } | undefined };
type ResultEvent = { resultIndex: number; results: { length: number; [index: number]: Result | undefined } };
type ErrorEvent = { error?: string; message?: string };

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  onresult: ((event: ResultEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionCtor = new () => Recognition;

type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionCtor & {
    available?: (options: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
  };
  webkitSpeechRecognition?: RecognitionCtor;
};

async function localCtor(lang: string): Promise<RecognitionCtor | null> {
  const win = window as SpeechWindow;
  const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  if (!Ctor) return null;

  const available = win.SpeechRecognition?.available;
  if (typeof available === 'function') {
    try {
      const ok = await available.call(win.SpeechRecognition, { langs: [lang], processLocally: true });
      if (!ok) return null;
    } catch {
      return null;
    }
  }

  const probe = new Ctor();
  if (!('processLocally' in probe)) return null;
  return Ctor;
}

export async function createLocalSpeech(
  lang: string,
  handlers: {
    onText: (text: string, final: boolean) => void;
    onError: (message: string) => void;
    onEnd: () => void;
  },
): Promise<LocalSpeech | null> {
  const Ctor = await localCtor(lang);
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.processLocally = true;

  rec.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const text = result?.[0]?.transcript ?? '';
      if (!text.trim()) continue;
      if (result?.isFinal) handlers.onText(text.trim(), true);
      else interim += text;
    }
    const rest = interim.trim();
    if (rest) handlers.onText(rest, false);
  };

  rec.onerror = (event) => {
    handlers.onError(event?.error || event?.message || 'speech-error');
  };

  rec.onend = () => { handlers.onEnd(); };

  return {
    start: () => {
      try { rec.start(); } catch { handlers.onError('speech-start-failed'); }
    },
    stop: () => {
      try { rec.stop(); } catch { /* déjà arrêté */ }
    },
    abort: () => {
      try { rec.abort(); } catch { /* déjà arrêté */ }
    },
  };
}

export async function localSpeechAvailable(lang: string): Promise<boolean> {
  return (await localCtor(lang)) !== null;
}
