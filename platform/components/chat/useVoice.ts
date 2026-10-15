'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useConversation as useElevenLabsConversation, type ConversationStatus } from '@elevenlabs/react';
import { fetchTts, fetchVoiceSession, transcribeAudio } from '@/lib/agent/client';

export type VoiceEngine = 'fallback' | 'conversational';
export type VoiceState = 'connecting' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'error';

const SILENCE_THRESHOLD = 0.02;
const SILENCE_HOLD_MS = 900;
const MAX_RECORD_MS = 15000;

/** Picks a MediaRecorder mime type the browser actually supports, preferring
 * opus-in-webm per the brief; falls back to whatever else is supported, or
 * to the recorder's own default when nothing on the shortlist is. Shared
 * with the composer's push-to-talk recorder. */
export function pickAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function micPermissionErrorMessage(error: unknown): string {
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) {
    return 'Microphone access was denied. Allow microphone access to talk to MerchFrom.';
  }
  return 'Could not access the microphone.';
}

/** Maps the ElevenLabs SDK's own connection/speaking state onto our shared
 * Listening/Thinking/Speaking/Paused vocabulary. */
function conversationalState(status: ConversationStatus, isSpeaking: boolean, muted: boolean): VoiceState {
  if (status === 'connecting') return 'connecting';
  if (status === 'error') return 'error';
  if (status === 'connected') return muted ? 'paused' : isSpeaking ? 'speaking' : 'listening';
  return 'paused';
}

interface ManualStopRef {
  current: (() => void) | null;
}

/** Records `stream` to a Blob until ~900ms of measured silence follows
 * detected speech, `MAX_RECORD_MS` elapses, or `manualStopRef.current()` is
 * invoked (a manual early stop / barge-in from the caller). */
function recordUntilSilence(stream: MediaStream, manualStopRef: ManualStopRef): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mimeType = pickAudioMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (error) {
      reject(error as Error);
      return;
    }
    const chunks: BlobPart[] = [];
    let audioContext: AudioContext | null = null;
    let rafId: number | null = null;
    let maxTimer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    function cleanup() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (maxTimer !== null) clearTimeout(maxTimer);
      audioContext?.close().catch(() => undefined);
      manualStopRef.current = null;
    }

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(new Blob(chunks, { type: mimeType ?? 'audio/webm' }));
    };
    recorder.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Recording failed.'));
    };

    manualStopRef.current = () => {
      if (recorder.state !== 'inactive') recorder.stop();
    };
    maxTimer = setTimeout(() => manualStopRef.current?.(), MAX_RECORD_MS);

    // The analyser is a nice-to-have silence detector — without one (e.g. an
    // environment that can't construct an AudioContext) recording still ends
    // via MAX_RECORD_MS or a manual stop.
    try {
      const AudioContextCtor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) throw new Error('AudioContext unavailable');
      audioContext = new AudioContextCtor();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let speechStarted = false;
      let silenceStart: number | null = null;
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (const sample of data) {
          const normalized = (sample - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        const now = performance.now();
        if (rms > SILENCE_THRESHOLD) {
          speechStarted = true;
          silenceStart = null;
        } else if (speechStarted) {
          if (silenceStart === null) silenceStart = now;
          else if (now - silenceStart >= SILENCE_HOLD_MS) {
            manualStopRef.current?.();
            return;
          }
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    } catch {
      // no analyser — bounded by MAX_RECORD_MS / manual stop instead
    }

    recorder.start();
  });
}

/** Resolves once `audio` stops playing — either naturally (`ended`) or via a
 * manual `pause()` (barge-in). A natural stop also fires `pause` first, but
 * by then `audio.ended` is already true, so that transient event is ignored. */
function playAndWaitForEnd(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve, reject) => {
    function cleanup() {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('pause', onPause);
    }
    function onEnded() {
      cleanup();
      resolve();
    }
    function onError() {
      cleanup();
      reject(new Error('Playback failed.'));
    }
    function onPause() {
      if (!audio.ended) {
        cleanup();
        resolve();
      }
    }
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('pause', onPause);
    audio.play().catch((error: unknown) => {
      cleanup();
      reject(error as Error);
    });
  });
}

export interface UseVoiceOptions {
  /** owned by the caller (VoiceOverlay) and attached to its `<audio>` — kept
   * out of this hook's return value so the return stays plain reactive state,
   * not a mix of state and a ref (the latter trips the refs-during-render check) */
  audioRef: RefObject<HTMLAudioElement | null>;
  /** posts the transcript through the normal chat pipeline so cards land in
   * the thread underneath the overlay */
  sendText: (text: string) => void;
  /** resolves with the finished turn's text (possibly empty) once the
   * assistant is done responding */
  onAssistantDone: (callback: (text: string) => void) => () => void;
}

export interface UseVoiceReturn {
  engine: VoiceEngine | null;
  state: VoiceState;
  /** last thing heard from the user (transcribed turn, or a live ASR line
   * from the conversational engine) */
  heardText: string;
  /** the reply being — or about to be — spoken */
  replyText: string;
  errorMessage: string | null;
  muted: boolean;
  toggleMute: () => void;
  /** tap on the ring: barge-in while speaking, an early manual stop while
   * listening, or a best-effort interruption hint for the conversational engine */
  ringTap: () => void;
}

/** Drives the full-screen conversation mode (`VoiceOverlay`). Picks an
 * engine from `GET /api/voice/session` once, on mount, and tears everything
 * down on unmount — mic tracks, an in-flight recording, playback, an
 * ElevenLabs session — since `VoiceOverlay` unmounts this hook's owner
 * whenever the dialog closes and remounts it fresh next time (nothing here
 * is meant to persist). Must be rendered under `ConversationProvider`. */
export function useVoice({ audioRef, sendText, onAssistantDone }: UseVoiceOptions): UseVoiceReturn {
  const [engine, setEngine] = useState<VoiceEngine | null>(null);
  // Driven imperatively by the fallback loop below; the conversational
  // engine's displayed state is derived from the SDK's own status instead
  // (see `conversationalState`), so this only matters when engine==='fallback'.
  const [fallbackState, setFallbackState] = useState<VoiceState>('connecting');
  const [heardText, setHeardText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const manualStopRef = useRef<(() => void) | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const engineRef = useRef<VoiceEngine | null>(null);
  const mutedRef = useRef(muted);
  const activeRef = useRef(true);

  // Keeps the async loop's view of `muted` current without reading state
  // during render (mutating a ref in the render body itself is unsafe).
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const elevenlabs = useElevenLabsConversation({
    onMessage: (payload) => {
      if (payload.role === 'user') setHeardText(payload.message);
      else setReplyText(payload.message);
    },
    onError: (message) => setErrorMessage(message),
  });
  const { status: elevenlabsStatus, isSpeaking: elevenlabsIsSpeaking, startSession, endSession, setMuted: setElevenLabsMuted, sendUserActivity } =
    elevenlabs;

  const state: VoiceState =
    engine === 'conversational' ? conversationalState(elevenlabsStatus, elevenlabsIsSpeaking, muted) : fallbackState;

  const waitUntilUnmuted = useCallback(async () => {
    while (mutedRef.current && activeRef.current) {
      setFallbackState('paused');
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }, []);

  const runFallbackLoop = useCallback(async () => {
    while (activeRef.current) {
      await waitUntilUnmuted();
      if (!activeRef.current) break;

      let stream = streamRef.current;
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
          setFallbackState('error');
          setErrorMessage(micPermissionErrorMessage(error));
          return;
        }
        streamRef.current = stream;
      }
      if (!activeRef.current) break;

      setErrorMessage(null);
      setFallbackState('listening');
      // eslint-disable-next-line no-console
      console.log('[voice-debug] listening (start)');
      let blob: Blob;
      try {
        blob = await recordUntilSilence(stream, manualStopRef);
      } catch (e) {
        if (!activeRef.current) break;
        setFallbackState('error');
        setErrorMessage('Recording failed.');
        // eslint-disable-next-line no-console
        console.log('[voice-debug] recordUntilSilence threw', e);
        return;
      }
      if (!activeRef.current) break;
      // eslint-disable-next-line no-console
      console.log('[voice-debug] recordUntilSilence resolved, blob size', blob.size);

      setFallbackState('thinking');
      let transcript: string;
      try {
        const result = await transcribeAudio(blob);
        transcript = result.text.trim();
      } catch (error) {
        if (!activeRef.current) break;
        setErrorMessage((error as Error).message);
        continue;
      }
      if (!transcript) continue;
      setHeardText(transcript);
      setReplyText('');
      if (!activeRef.current) break;
      // eslint-disable-next-line no-console
      console.log('[voice-debug] transcript', transcript);

      const assistantText = await new Promise<string>((resolve) => {
        const unsubscribe = onAssistantDone((text) => {
          unsubscribe();
          resolve(text);
        });
        sendText(transcript);
      });
      if (!activeRef.current) break;
      if (!assistantText) continue;
      setReplyText(assistantText);
      // eslint-disable-next-line no-console
      console.log('[voice-debug] assistantText', assistantText);

      let ttsBlob: Blob;
      try {
        ttsBlob = await fetchTts(assistantText);
      } catch (error) {
        if (!activeRef.current) break;
        setErrorMessage((error as Error).message);
        continue;
      }
      if (!activeRef.current) break;
      // eslint-disable-next-line no-console
      console.log('[voice-debug] tts blob size', ttsBlob.size);

      const url = URL.createObjectURL(ttsBlob);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = url;
      const audio = audioRef.current;
      if (!audio) break;
      audio.src = url;
      setFallbackState('speaking');
      // eslint-disable-next-line no-console
      console.log('[voice-debug] speaking, audio.src', audio.src);
      try {
        await playAndWaitForEnd(audio);
        // eslint-disable-next-line no-console
        console.log('[voice-debug] playAndWaitForEnd resolved normally');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('[voice-debug] playAndWaitForEnd threw', e);
        // playback failure just ends this turn — loop back and listen again
      }
    }
  }, [audioRef, onAssistantDone, sendText, waitUntilUnmuted]);

  useEffect(() => {
    activeRef.current = true;
    let cancelled = false;
    fetchVoiceSession().then((session) => {
      if (cancelled) return;
      // Without its caller token the bridge would not know who is talking.
      if (session.mode === 'conversational' && session.signedUrl && session.callerToken) {
        engineRef.current = 'conversational';
        setEngine('conversational');
        startSession({ signedUrl: session.signedUrl, dynamicVariables: { user_token: session.callerToken } });
      } else {
        engineRef.current = 'fallback';
        setEngine('fallback');
        runFallbackLoop();
      }
    });
    return () => {
      cancelled = true;
      activeRef.current = false;
      manualStopRef.current?.();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (engineRef.current === 'conversational') endSession();
    };
    // Runs once for this hook's whole mounted lifetime — VoiceOverlay
    // unmounts (and remounts fresh) its whole subtree on open/close, so
    // there is no "re-pick the engine" case to react to here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (engineRef.current === 'conversational') setElevenLabsMuted(next);
      return next;
    });
  }, [setElevenLabsMuted]);

  const ringTap = useCallback(() => {
    if (engineRef.current === 'conversational') {
      // No manual interrupt in the SDK's public surface; this is the closest
      // available hint that the user wants to cut in.
      sendUserActivity();
      return;
    }
    if (state === 'speaking') audioRef.current?.pause();
    else if (state === 'listening') manualStopRef.current?.();
  }, [audioRef, state, sendUserActivity]);

  return { engine, state, heardText, replyText, errorMessage, muted, toggleMute, ringTap };
}
