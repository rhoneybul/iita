// Voice-note hook — wraps expo-speech-recognition with a small surface
// for "tap to dictate" UX. Lifted from etapa with the non-essentials
// (metering / audio file path) trimmed off.
//
//   const v = useVoiceTranscription({ onFinal, lang });
//   v.supported  — false on web / SDKs without the native module
//   v.start() / v.stop()
//   v.isListening
//   v.partial    — live transcript while recording

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

let SpeechModule = null;
let useSpeechRecognitionEvent = null;
try {
  const mod = require('expo-speech-recognition');
  SpeechModule = mod?.ExpoSpeechRecognitionModule || null;
  useSpeechRecognitionEvent = mod?.useSpeechRecognitionEvent || null;
} catch {
  // not installed in this build
}

const SUPPORTED = !!(SpeechModule && useSpeechRecognitionEvent && Platform.OS !== 'web');

function noopEventHook() {}

export default function useVoiceTranscription({ onFinal, lang = 'en-US' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [error, setError] = useState(null);

  const finalRef = useRef('');
  const onFinalRef = useRef(onFinal);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);

  const eventHook = SUPPORTED ? useSpeechRecognitionEvent : noopEventHook;

  eventHook('result', (event) => {
    const r = event?.results?.[0];
    const text = (r?.transcript || '').trim();
    setPartial(text);
    if (r?.isFinal) finalRef.current = text;
  });
  eventHook('error', (event) => {
    setError(event?.error || 'recognition error');
    setIsListening(false);
  });
  eventHook('end', () => {
    setIsListening(false);
    const final = finalRef.current || partial;
    if (final && onFinalRef.current) onFinalRef.current(final);
  });

  async function start() {
    if (!SUPPORTED) { setError('not_supported'); return; }
    try {
      const perm = await SpeechModule.requestPermissionsAsync();
      if (!perm?.granted) { setError('permission_denied'); return; }
      finalRef.current = '';
      setPartial('');
      setError(null);
      await SpeechModule.start({
        lang,
        interimResults: true,
        continuous: true,
      });
      setIsListening(true);
    } catch (e) {
      setError(e?.message || 'start failed');
    }
  }

  function stop() {
    try { SpeechModule?.stop(); } catch {}
    setIsListening(false);
  }

  return { supported: SUPPORTED, isListening, partial, error, start, stop };
}
