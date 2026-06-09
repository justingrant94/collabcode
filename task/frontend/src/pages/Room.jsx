/**
 * Room.jsx — collaborative coding room.
 *
 * Wires the live state hook to the Editor + cursors + roster.
 * Layout breakdown:
 *
 *   [ ShareBar | UserAvatars ]
 *   [ Editor                  ] (Phase 4 will add Toolbar + Output)
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { Spinner } from '../components/Spinner.jsx';
import { RoomShareBar } from '../components/RoomShareBar.jsx';
import { UserAvatars } from '../components/UserAvatars.jsx';
import { Editor } from '../components/Editor.jsx';
import { UserCursors } from '../components/UserCursors.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { Output } from '../components/Output.jsx';
import { SnippetsSidebar } from '../components/SnippetsSidebar.jsx';
import { useRoomSocket } from '../hooks/useRoomSocket.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../components/ToastProvider.jsx';
import './Room.css';

export function Room() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [metaState, setMetaState] = useState({ status: 'loading', error: null });
  const handledEntryStateRef = useRef(false);

  // Verify the room exists before opening a socket — avoids a
  // confusing "join-room → room_not_found" error popup.
  useEffect(() => {
    let cancelled = false;
    setMetaState({ status: 'loading', error: null });
    api(`/api/rooms/${roomId}`)
      .then(() => !cancelled && setMetaState({ status: 'ok', error: null }))
      .catch((err) => {
        if (cancelled) return;
        const notFound = err instanceof ApiError && err.status === 404;
        setMetaState({
          status: notFound ? 'not_found' : 'error',
          error: err.message,
        });
      });
    return () => { cancelled = true; };
  }, [roomId]);

  const {
    status, error, code, language, users,
    sendCode, sendCursor, sendLanguage, applyCode, remoteEvents,
  } = useRoomSocket(metaState.status === 'ok' ? roomId : null);

  const [editor, setEditor] = useState(null);
  // ranCode / ranLanguage = the inputs the visible result was produced from.
  // Used to detect when the displayed output no longer matches the editor
  // (stale) and to hard-clear when the runtime itself changes (language).
  const [runState, setRunState] = useState({
    running: false,
    result: null,
    error: null,
    ranCode: null,
    ranLanguage: null,
  });
  const callApi = useApi();
  const { push } = useToast();

  useEffect(() => {
    handledEntryStateRef.current = false;
  }, [roomId]);

  const clearOutput = () =>
    setRunState({
      running: false,
      result: null,
      error: null,
      ranCode: null,
      ranLanguage: null,
    });

  // Hard-clear on language switch: a Python traceback under a JS editor
  // is just noise. Soft "stale" on code edits is handled below.
  useEffect(() => {
    setRunState((prev) => {
      if (prev.ranLanguage && prev.ranLanguage !== language) {
        return { running: false, result: null, error: null, ranCode: null, ranLanguage: null };
      }
      return prev;
    });
  }, [language]);

  // Derived flag: result exists but the buffer has been edited since the run.
  const stale =
    !!runState.result &&
    runState.ranCode !== null &&
    runState.ranCode !== code;

  useEffect(() => {
    if (status !== 'ready') return;
    if (handledEntryStateRef.current) return;
    if (!location.state?.justCreated && !location.state?.bootstrapSnippet) return;

    handledEntryStateRef.current = true;

    if (location.state?.bootstrapSnippet) {
      const snippet = location.state.bootstrapSnippet;
      if (snippet.language && snippet.language !== language) {
        sendLanguage(snippet.language);
      }
      if (snippet.code) {
        applyCode(snippet.code);
      }
      push(`Started a room from "${snippet.title}"`, { variant: 'success' });
    } else if (location.state?.justCreated) {
      push('Room live. Copy the invite link to bring in a second cursor.', {
        variant: 'success',
        duration: 4200,
      });
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [
    applyCode,
    language,
    location.pathname,
    location.state,
    navigate,
    push,
    sendLanguage,
    status,
  ]);

  const handleRun = async () => {
    // Client-side guard so the user gets an immediate, useful
    // hint instead of a backend 400 → opaque "missing_code" toast.
    if (!code || !code.trim()) {
      push('Write some code first', { variant: 'danger' });
      return;
    }
    // Snapshot inputs at submit time so the result we eventually
    // receive is compared against what was actually sent, not
    // whatever the user has typed by the time the response lands.
    const submittedCode = code;
    const submittedLanguage = language;
    setRunState({
      running: true,
      result: null,
      error: null,
      ranCode: submittedCode,
      ranLanguage: submittedLanguage,
    });
    try {
      const result = await callApi('/api/execute', {
        method: 'POST',
        body: { language: submittedLanguage, code: submittedCode },
      });
      setRunState({
        running: false,
        result,
        error: null,
        ranCode: submittedCode,
        ranLanguage: submittedLanguage,
      });
    } catch (err) {
      // Translate known backend error codes into human messages.
      const friendly = {
        missing_code: 'Editor is empty — write some code first.',
        code_too_large: 'Code exceeds the 256\u00a0KB size limit.',
        unsupported_language: `Language "${language}" is not supported yet.`,
        rate_limited: 'Too many runs — please wait a minute.',
        execute_disabled: 'Code execution is disabled on this server.',
        image_missing: 'Sandbox image not pulled on this server.',
        docker_unreachable: 'Docker daemon is not running on the server.',
      }[err.message] || err.message;
      setRunState({
        running: false,
        result: null,
        error: friendly,
        ranCode: submittedCode,
        ranLanguage: submittedLanguage,
      });
    }
  };

  /**
   * Load a snippet into the room. applyCode pushes the new
   * buffer into local state AND broadcasts to peers AND fires a
   * synthetic remote 'code-change' event so Monaco applies it.
   */
  const handleLoadSnippet = (snippet) => {
    if (snippet.language && snippet.language !== language) {
      sendLanguage(snippet.language);
    }
    applyCode(snippet.code);
    push(`Loaded "${snippet.title}"`, { variant: 'success' });
  };

  if (metaState.status === 'loading' || status === 'connecting') {
    return (
      <section className="room room--centered" role="status">
        <Spinner size="lg" ariaLabel="Connecting to room" />
      </section>
    );
  }

  if (metaState.status === 'not_found') {
    return (
      <section className="room room--centered">
        <h1>Room not found</h1>
        <p>That room either doesn't exist or has expired.</p>
      </section>
    );
  }

  if (metaState.status === 'error' || status === 'error') {
    return (
      <section className="room room--centered">
        <h1>Couldn't load this room</h1>
        <p>{metaState.error || error}</p>
      </section>
    );
  }

  return (
    <section className="room">
      <div className="room__topbar">
        <RoomShareBar roomId={roomId} />
        <UserAvatars users={users} />
      </div>

      <Toolbar
        language={language}
        onLanguageChange={sendLanguage}
        onRun={handleRun}
        running={runState.running}
        onClear={clearOutput}
        canClear={!!runState.result || !!runState.error}
      />

      <div className="room__work">
        <div className="room__editor-col">
          <Editor
            value={code}
            language={language}
            remoteEvents={remoteEvents}
            onLocalChange={sendCode}
            onCursorMove={sendCursor}
            onEditorMount={(ed) => setEditor(ed)}
          />

          {editor && (
            <UserCursors editor={editor} users={users} remoteEvents={remoteEvents} />
          )}

          <Output
            result={runState.result}
            running={runState.running}
            error={runState.error}
            stale={stale}
            hasCode={!!code && !!code.trim()}
          />
        </div>

        <div className="room__side-col">
          <SnippetsSidebar
            currentCode={code}
            currentLanguage={language}
            onLoadSnippet={handleLoadSnippet}
          />
        </div>
      </div>
    </section>
  );
}