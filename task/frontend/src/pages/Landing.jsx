/**
 * Landing.jsx — homepage.
 *
 * Two states:
 *   Signed out → hero + Sign-in CTA
 *   Signed in  → hero + "New Room" button (creates room via
 *                 POST /api/rooms then navigates to /r/:id)
 *
 * Snippets sidebar and recent-rooms list will live INSIDE the
 * /r/:roomId page (Phase 3/6). Landing intentionally stays
 * focused on the single "start a session" action.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { api } from '../lib/api.js';
import { useApi } from '../hooks/useApi.js';
import { useRooms } from '../hooks/useRooms.js';
import { useSnippets } from '../hooks/useSnippets.js';
import { Editor } from '../components/Editor.jsx';
import { Output } from '../components/Output.jsx';
import { RunButton } from '../components/RunButton.jsx';
import { LanguageDropdown } from '../components/LanguageDropdown.jsx';
import { Spinner } from '../components/Spinner.jsx';
import './Landing.css';

const LANGUAGE_STORAGE_KEY = 'collab.preferred-language';

const ROOM_STARTERS = {
  javascript: '// Invite a second cursor and hit Run.\nconsole.log("room ready");\n',
  typescript: '// Invite a second cursor and hit Run.\nconsole.log("room ready");\n',
  python: '# Invite a second cursor and hit Run.\nprint("room ready")\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("room ready")\n}\n',
  rust: 'fn main() {\n    println!("room ready");\n}\n',
  java: 'class Main {\n  public static void main(String[] args) {\n    System.out.println("room ready");\n  }\n}\n',
  c: '#include <stdio.h>\n\nint main(void) {\n  printf("room ready\\n");\n  return 0;\n}\n',
  cpp: '#include <iostream>\n\nint main() {\n  std::cout << "room ready" << std::endl;\n  return 0;\n}\n',
};

const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  go: 'Go',
  rust: 'Rust',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
};

const HERO_POINTS = [
  'Share a room in seconds',
  'Run code in a sandbox',
  'Save snippets you can relaunch later',
];

const WORKFLOW_STEPS = [
  {
    title: '1. Start with a real editor',
    body: 'Spin up a room, choose a language, and write code without local setup.',
  },
  {
    title: '2. Send one link',
    body: 'The share bar is the activation path. Bring in the second cursor fast.',
  },
  {
    title: '3. Run and iterate together',
    body: 'Execute in the sandbox, keep snippets, and stay in one browser tab.',
  },
];

function getPreferredLanguage() {
  if (typeof window === 'undefined') return 'javascript';
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return ROOM_STARTERS[stored] ? stored : 'javascript';
}

function persistPreferredLanguage(language) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

function formatRelativeTime(iso) {
  if (!iso) return 'just now';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff) || diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

function getRunError(err, language) {
  return {
    missing_code: 'Write something first, then run it.',
    code_too_large: 'Preview is capped at 256 KB.',
    unsupported_language: `${LANGUAGE_LABELS[language] || language} is not supported in the preview yet.`,
    rate_limited: 'Preview limit reached. Wait a minute and try again.',
    execute_disabled: 'Sandbox execution is disabled on this server.',
    image_missing: 'Sandbox image is missing on this server.',
    docker_unreachable: 'Docker is not running on the backend.',
  }[err.message] || err.message;
}

function useRunShortcut(onRun, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const handleKeyDown = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== 'Enter') return;
      event.preventDefault();
      onRun();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onRun]);
}

export function Landing() {
  return (
    <section className="landing">
      <SignedOut>
        <SignedOutLanding />
      </SignedOut>

      <SignedIn>
        <SignedInLanding />
      </SignedIn>
    </section>
  );
}

function SignedOutLanding() {
  const [language, setLanguage] = useState(getPreferredLanguage);
  const [code, setCode] = useState(() => ROOM_STARTERS[getPreferredLanguage()]);
  const [runState, setRunState] = useState({
    running: false,
    result: null,
    error: null,
    ranCode: null,
    ranLanguage: null,
  });
  const remoteEvents = useMemo(() => new EventTarget(), []);

  const handleLanguageChange = (nextLanguage) => {
    persistPreferredLanguage(nextLanguage);
    setLanguage(nextLanguage);
    setCode(ROOM_STARTERS[nextLanguage] || ROOM_STARTERS.javascript);
    setRunState({ running: false, result: null, error: null, ranCode: null, ranLanguage: null });
  };

  const handleRun = useCallback(async () => {
    if (!code.trim()) {
      setRunState({
        running: false,
        result: null,
        error: 'Write something first, then run it.',
        ranCode: null,
        ranLanguage: null,
      });
      return;
    }

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
      const result = await api('/api/execute/preview', {
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
      setRunState({
        running: false,
        result: null,
        error: getRunError(err, submittedLanguage),
        ranCode: submittedCode,
        ranLanguage: submittedLanguage,
      });
    }
  }, [code, language]);

  useRunShortcut(handleRun);

  const stale =
    !!runState.result &&
    runState.ranCode !== null &&
    runState.ranCode !== code;

  return (
    <div className="landing__shell">
      <div className="landing__hero">
        <div className="landing__eyebrow">Browser-based pair programming</div>
        <h1 className="landing__title">Pair-program in your browser. Share a room in seconds.</h1>
        <p className="landing__tagline">
          CollabCode gives you a shared editor, sandboxed execution, personal snippets, and a DJ booth without making people install anything first.
        </p>

        <div className="landing__cta">
          <Link to="/sign-up" className="landing__btn landing__btn--primary">
            Start coding free
          </Link>
          <Link to="/sign-in" className="landing__btn landing__btn--ghost">
            Sign in
          </Link>
        </div>

        <ul className="landing__points" aria-label="Key product benefits">
          {HERO_POINTS.map((point) => (
            <li key={point} className="landing__point">{point}</li>
          ))}
        </ul>

        <div className="landing__workflow" aria-label="How it works">
          {WORKFLOW_STEPS.map((step) => (
            <article key={step.title} className="landing__workflow-card">
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </div>

      <aside className="landing__playground" aria-label="Live preview">
        <div className="landing__playground-header">
          <div>
            <p className="landing__playground-kicker">Try the sandbox now</p>
            <h2 className="landing__playground-title">No signup required for this preview.</h2>
          </div>
          <span className="landing__playground-badge">Cmd/Ctrl + Enter</span>
        </div>

        <div className="landing__playground-toolbar">
          <LanguageDropdown value={language} onChange={handleLanguageChange} />
          <RunButton onClick={handleRun} running={runState.running} />
        </div>

        <div className="landing__playground-editor">
          <Editor
            value={code}
            language={language}
            remoteEvents={remoteEvents}
            onLocalChange={setCode}
            onCursorMove={() => {}}
          />
        </div>

        <Output
          result={runState.result}
          running={runState.running}
          error={runState.error}
          stale={stale}
          hasCode={!!code.trim()}
        />

        <p className="landing__playground-note">
          This preview runs in the same sandbox as the room experience. Create an account when you want to save snippets or invite someone else in.
        </p>
      </aside>
    </div>
  );
}

function SignedInLanding() {
  const callApi = useApi();
  const navigate = useNavigate();
  const { status: roomsStatus, rooms, error: roomsError } = useRooms(6);
  const { status: snippetsStatus, snippets, error: snippetsError } = useSnippets();
  const [language, setLanguage] = useState(getPreferredLanguage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLanguageChange = (nextLanguage) => {
    persistPreferredLanguage(nextLanguage);
    setLanguage(nextLanguage);
  };

  const createRoom = useCallback(async (snippet = null) => {
    setError(null);
    setLoading(true);
    try {
      const room = await callApi('/api/rooms', {
        method: 'POST',
        body: { language: snippet?.language || language },
      });
      navigate(`/r/${room.id}`, {
        state: {
          justCreated: true,
          bootstrapSnippet: snippet
            ? {
                title: snippet.title,
                code: snippet.code,
                language: snippet.language,
              }
            : null,
        },
      });
    } catch (err) {
      setError(err.message || 'Could not create room');
      setLoading(false);
    }
  }, [callApi, language, navigate]);

  const recentSnippets = snippets.slice(0, 4);
  const hasRooms = roomsStatus === 'ready' && rooms.length > 0;

  return (
    <div className="landing__dashboard">
      <div className="landing__dashboard-hero">
        <div className="landing__dashboard-copy">
          <div className="landing__eyebrow">Signed in</div>
          <h1 className="landing__title landing__title--dashboard">
            {hasRooms ? 'Jump back into your rooms.' : 'Create your first room.'}
          </h1>
          <p className="landing__tagline">
            Pick a language, open the editor, and get to the share link fast. The whole point of this screen is to get you from zero to a second cursor.
          </p>
        </div>

        <div className="landing__create-card">
          <p className="landing__create-label">New room defaults</p>
          <div className="landing__create-row">
            <LanguageDropdown value={language} onChange={handleLanguageChange} />
            <button
              type="button"
              className="landing__btn landing__btn--primary"
              onClick={() => createRoom()}
              disabled={loading}
            >
              {loading ? <Spinner size="sm" color="currentColor" /> : 'Create room'}
            </button>
          </div>
          <p className="landing__create-hint">
            We open the editor immediately and surface the invite link at the top of the room.
          </p>
          {error && <p className="landing__error" role="alert">{error}</p>}
        </div>
      </div>

      <div className="landing__dashboard-grid">
        <section className="landing__panel" aria-labelledby="recent-rooms-title">
          <div className="landing__panel-head">
            <h2 id="recent-rooms-title">Recent rooms</h2>
            <span>{roomsStatus === 'ready' ? `${rooms.length} total shown` : 'Resume fast'}</span>
          </div>

          {roomsStatus === 'loading' && (
            <div className="landing__panel-state">
              <Spinner size="sm" />
              <span>Loading recent rooms…</span>
            </div>
          )}

          {roomsStatus === 'error' && (
            <p className="landing__panel-error">Could not load rooms: {roomsError}</p>
          )}

          {roomsStatus === 'ready' && rooms.length === 0 && (
            <div className="landing__empty-state">
              <p>Your first room should take one click, one run, one copied link.</p>
              <ul>
                <li>Pick the language you actually use.</li>
                <li>Create the room.</li>
                <li>Share the link from the room header.</li>
              </ul>
            </div>
          )}

          {roomsStatus === 'ready' && rooms.length > 0 && (
            <div className="landing__room-list">
              {rooms.map((room) => (
                <Link key={room.id} to={`/r/${room.id}`} className="landing__room-card">
                  <div>
                    <p className="landing__room-label">{LANGUAGE_LABELS[room.language] || room.language} room</p>
                    <h3>{room.id.slice(0, 8)}</h3>
                  </div>
                  <div className="landing__room-meta">
                    <span>Last active {formatRelativeTime(room.lastActiveAt)}</span>
                    <span>Created {formatRelativeTime(room.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="landing__panel" aria-labelledby="snippets-title">
          <div className="landing__panel-head">
            <h2 id="snippets-title">Snippets</h2>
            <span>Start from saved work</span>
          </div>

          {snippetsStatus === 'loading' && (
            <div className="landing__panel-state">
              <Spinner size="sm" />
              <span>Loading snippets…</span>
            </div>
          )}

          {snippetsStatus === 'error' && (
            <p className="landing__panel-error">Could not load snippets: {snippetsError}</p>
          )}

          {snippetsStatus === 'ready' && recentSnippets.length === 0 && (
            <div className="landing__empty-state">
              <p>No snippets yet.</p>
              <p>Save one inside any room and it will show up here as a launch point.</p>
            </div>
          )}

          {snippetsStatus === 'ready' && recentSnippets.length > 0 && (
            <div className="landing__snippet-list">
              {recentSnippets.map((snippet) => (
                <button
                  key={snippet.id}
                  type="button"
                  className="landing__snippet-card"
                  onClick={() => createRoom(snippet)}
                  disabled={loading}
                >
                  <div>
                    <p className="landing__snippet-label">{LANGUAGE_LABELS[snippet.language] || snippet.language}</p>
                    <h3>{snippet.title}</h3>
                  </div>
                  <span>Start room</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
