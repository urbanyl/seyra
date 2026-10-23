import { useEffect, useRef, useState } from 'react';
import { useT } from '../lib/i18n';
import { IconMic, IconMicOff } from './Icons';
import { createLocalSpeech, localSpeechAvailable, type LocalSpeech } from '../lib/transcribe';

export default function VoiceType({ lang, onAppend, disabled }: {
  lang: string;
  onAppend: (text: string) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const speech = useRef<LocalSpeech | null>(null);
  const append = useRef(onAppend);
  append.current = onAppend;

  useEffect(() => {
    let alive = true;
    setSupported(false);
    localSpeechAvailable(lang)
      .then((ok) => { if (alive) setSupported(ok); })
      .catch(() => { if (alive) setSupported(false); });
    return () => { alive = false; };
  }, [lang]);

  useEffect(() => {
    return () => {
      speech.current?.abort();
      speech.current = null;
    };
  }, [lang]);

  if (!supported) return null;

  const start = async () => {
    setError('');
    const local = await createLocalSpeech(lang, {
      onText: (text, final) => {
        if (final && text.trim()) append.current(text.trim() + ' ');
      },
      onError: (message) => {
        speech.current = null;
        setListening(false);
        setError(message);
      },
      onEnd: () => {
        speech.current = null;
        setListening(false);
      },
    });
    if (!local) {
      setSupported(false);
      setError(t('transcribe.unsupported'));
      return;
    }
    if (speech.current) return;
    speech.current = local;
    setListening(true);
    local.start();
  };

  const toggle = () => {
    if (listening) {
      speech.current?.stop();
      speech.current = null;
      setListening(false);
      return;
    }
    void start();
  };

  return (
    <button
      type="button"
      className={`icon-btn ${listening ? 'active' : ''}`}
      style={{ position: 'relative' }}
      onClick={toggle}
      disabled={disabled}
      aria-pressed={listening}
      aria-label={listening ? t('transcribe.stop') : t('transcribe.start')}
      title={error || t('transcribe.local')}
    >
      {listening && (
        <span
          className="rec-dot"
          style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7 }}
        />
      )}
      {listening ? <IconMic size={18} /> : <IconMicOff size={18} />}
    </button>
  );
}
