import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

import AccessGate from "./pages/AccessGate";
import Collection from "./pages/Collection";
import AddNote from "./pages/AddNote";

import {
  getAllNotes,
  getCategories,
  collectNote,
  getCollectedNotes,
} from "./services/api";

import "./App.css";

/* =====================================================================
   THE JAR OF LITTLE THINGS
   Concept: a midnight shelf lit by a warm lamp. Every note is a folded
   paper "lucky star" inside a real glass jar. Tap a star to unfold it
   into a letter, shake the jar for a random one, and seal the ones you
   love with a postage stamp.
   ===================================================================== */

// ---------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------

const USER_ID = 1;
const LONG_NOTE_LENGTH = 220;
const MAX_STARS = 42;

const PAPER_COLORS = [
  "#f6d7b0", // apricot
  "#f3b6a8", // blush
  "#c9dcc0", // sage
  "#f1e3a4", // butter
  "#cfd6ee", // periwinkle
  "#e9c3d9", // lilac
];

const JAR_PATH =
  "M100 70 L200 70 L200 95 C200 112 260 116 260 162 L260 330 C260 355 240 366 214 366 L86 366 C60 366 40 355 40 330 L40 162 C40 116 100 112 100 95 Z";

// Tiny deterministic RNG so layouts don't jump between renders.
function mulberry32(seed) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildStarPath(outer = 12, inner = 6.2) {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(
      `${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`
    );
  }
  return `M${points.join("L")}Z`;
}

const STAR_PATH = buildStarPath();

// Stars settle into a loose pile at the bottom of the jar.
function pileLayout(count, seed = 7) {
  const random = mulberry32(seed);
  const perRow = 6;

  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const offset = row % 2 ? 14 : 0;

    return {
      x: 72 + col * 29 + offset + (random() - 0.5) * 8,
      y: 338 - row * 25 + (random() - 0.5) * 6,
      rotate: (random() - 0.5) * 70,
      float: random(),
    };
  });
}

const paperFor = (note, index) => {
  const key = Number(note?.id);
  const seed = Number.isFinite(key) ? Math.abs(key) : index;
  return PAPER_COLORS[seed % PAPER_COLORS.length];
};

const pad = (n) => String(n).padStart(2, "0");

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const extractNoteId = (entry) => {
  if (entry?.note?.id !== undefined) return Number(entry.note.id);
  if (entry?.noteId !== undefined) return Number(entry.noteId);
  if (entry?.note?.noteId !== undefined) return Number(entry.note.noteId);
  return null;
};

// ---------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------

function useJarData(userId) {
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [keptIds, setKeptIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [notesResponse, categoryResponse] = await Promise.all([
        getAllNotes(),
        getCategories(),
      ]);

      setNotes(Array.isArray(notesResponse.data) ? notesResponse.data : []);
      setCategories(
        Array.isArray(categoryResponse.data) ? categoryResponse.data : []
      );

      try {
        const collectedResponse = await getCollectedNotes(userId);
        const collections = Array.isArray(collectedResponse.data)
          ? collectedResponse.data
          : [];

        setKeptIds(
          collections
            .map(extractNoteId)
            .filter((id) => id !== null && !Number.isNaN(id))
        );
      } catch (collectionError) {
        console.error("Could not load collected notes:", collectionError);
        setKeptIds([]);
      }
    } catch (err) {
      console.error("Could not load jar data:", err);
      setError("The jar didn't open. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { notes, categories, keptIds, setKeptIds, loading, error, reload: load };
}

function useTilt(range = 6) {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 150, damping: 20 });
  const springY = useSpring(pointerY, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(springY, [-1, 1], [range, -range]);
  const rotateY = useTransform(springX, [-1, 1], [-range, range]);

  const onMouseMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - box.left) / box.width) * 2 - 1);
    pointerY.set(((event.clientY - box.top) / box.height) * 2 - 1);
  };

  const reset = useCallback(() => {
    pointerX.set(0);
    pointerY.set(0);
  }, [pointerX, pointerY]);

  return { rotateX, rotateY, onMouseMove, onMouseLeave: reset, reset };
}

// ---------------------------------------------------------------------
// Shared visual pieces
// ---------------------------------------------------------------------

function NightSky({ count = 70 }) {
  const dots = useMemo(() => {
    const random = mulberry32(42);
    return Array.from({ length: count }, () => ({
      left: random() * 100,
      top: random() * 75,
      size: random() * 2 + 1,
      delay: random() * 4,
      duration: 2.5 + random() * 3,
    }));
  }, [count]);

  return (
    <div className="lj-sky" aria-hidden="true">
      {dots.map((dot, i) => (
        <span
          key={i}
          style={{
            left: `${dot.left}%`,
            top: `${dot.top}%`,
            width: dot.size,
            height: dot.size,
            animationDelay: `${dot.delay}s`,
            animationDuration: `${dot.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function PaperStar({ item, position, active, mode, onPick, index }) {
  const opening = mode === "opening";
  const pickable = Boolean(onPick);

  const handleKey = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPick(index);
    }
  };

  return (
    <g transform={`translate(${position.x} ${position.y})`}>
      <motion.g
        className={`lj-star${active ? " is-active" : ""}${
          pickable ? " is-pickable" : ""
        }`}
        initial={false}
        animate={
          opening
            ? {
                x: (position.x - 150) * 0.9,
                y: -380 - position.float * 140,
                rotate: position.rotate + 280,
                opacity: 0,
                scale: 0.6,
              }
            : {
                x: 0,
                y: active ? -6 : 0,
                rotate: position.rotate,
                opacity: 1,
                scale: active ? 1.35 : 1,
              }
        }
        transition={
          opening
            ? { duration: 0.9, delay: position.float * 0.25, ease: [0.2, 0.7, 0.3, 1] }
            : { type: "spring", stiffness: 260, damping: 18 }
        }
        whileHover={pickable ? { scale: active ? 1.42 : 1.22 } : undefined}
        onClick={pickable ? () => onPick(index) : undefined}
        onKeyDown={pickable ? handleKey : undefined}
        role={pickable ? "button" : undefined}
        tabIndex={pickable ? 0 : undefined}
        aria-label={pickable ? `Unfold note ${index + 1}` : undefined}
        aria-pressed={pickable ? active : undefined}
      >
        <path
          d={STAR_PATH}
          fill={item.color}
          stroke={item.color}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d={STAR_PATH}
          fill="none"
          stroke="rgba(80, 50, 30, 0.28)"
          strokeWidth="0.9"
          transform="scale(0.55)"
        />
        {item.kept && <circle r="2.4" fill="#b94536" />}
      </motion.g>
    </g>
  );
}

function GlassJar({ items, activeId, onPick, mode = "idle", tag, label }) {
  const layout = useMemo(() => pileLayout(items.length), [items.length]);
  const opening = mode === "opening";

  return (
    <svg
      className="lj-jar-svg"
      viewBox="0 0 300 390"
      role={onPick ? "group" : "img"}
      aria-label={label}
    >
      <defs>
        <linearGradient id="lj-glass" x1="0" x2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.03" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.12" />
        </linearGradient>
        <radialGradient id="lj-inner-glow" cx="0.5" cy="0.78" r="0.65">
          <stop offset="0" stopColor="#ffc978" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ffc978" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lj-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ecc176" />
          <stop offset="1" stopColor="#9c6a2c" />
        </linearGradient>
      </defs>

      <ellipse className="lj-jar-shadow" cx="150" cy="372" rx="118" ry="9" />

      {/* warm glow living inside the glass */}
      <path d={JAR_PATH} fill="url(#lj-inner-glow)" />

      {items.map((item, i) => (
        <PaperStar
          key={item.id}
          item={item}
          index={i}
          position={layout[i]}
          active={item.id === activeId}
          mode={mode}
          onPick={onPick}
        />
      ))}

      {/* glass body + highlights */}
      <path
        d={JAR_PATH}
        fill="url(#lj-glass)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="2.5"
        pointerEvents="none"
      />
      <path
        d="M62 172 C57 222 57 292 66 336"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        pointerEvents="none"
      />
      <path
        d="M242 190 C245 230 245 270 241 300"
        stroke="#ffffff"
        strokeOpacity="0.15"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        pointerEvents="none"
      />

      {/* brass lid */}
      <motion.g
        initial={false}
        animate={
          opening
            ? { y: -170, x: 50, rotate: 210, opacity: 0 }
            : { y: 0, x: 0, rotate: 0, opacity: 1 }
        }
        transition={{ duration: 0.7, ease: "easeIn" }}
      >
        <rect x="92" y="40" width="116" height="32" rx="7" fill="url(#lj-lid)" />
        {Array.from({ length: 7 }, (_, k) => (
          <line
            key={k}
            x1={102 + k * 16}
            x2={102 + k * 16}
            y1="45"
            y2="67"
            stroke="rgba(90,55,20,0.35)"
            strokeWidth="2"
          />
        ))}
        <rect x="86" y="66" width="128" height="9" rx="4.5" fill="#7a4f1f" />
      </motion.g>

      {/* paper tag tied around the neck */}
      {tag && (
        <g pointerEvents="none">
          <path
            d="M200 86 C216 92 226 106 230.8 124"
            stroke="#d9c7a3"
            strokeWidth="1.5"
            fill="none"
          />
          <g transform="translate(222 108) rotate(12)">
            <path d="M0 14 L10 0 L66 0 L66 28 L10 28 Z" fill="#f5ecd9" />
            <circle cx="12" cy="14" r="2.6" fill="#15131f" />
            <text
              x="39"
              y="19"
              textAnchor="middle"
              fontFamily="Caveat, cursive"
              fontSize="14"
              fill="#3a2f3f"
            >
              {tag}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

function StampButton({ kept, busy, onClick }) {
  return (
    <button
      className={`lj-stamp${kept ? " is-kept" : ""}`}
      onClick={onClick}
      disabled={busy || kept}
      title={kept ? "Already kept" : "Keep this note"}
    >
      <span className="lj-stamp-paper">
        <span className="lj-stamp-face">
          <span className="lj-stamp-icon">{busy ? "…" : kept ? "✓" : "♡"}</span>
          <span className="lj-stamp-word">{kept ? "Kept" : "Keep"}</span>
        </span>
      </span>
    </button>
  );
}

function SpinningStar() {
  return (
    <motion.svg
      width="34"
      height="34"
      viewBox="-16 -16 32 32"
      animate={{ rotate: 360 }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
      aria-hidden="true"
    >
      <path
        d={STAR_PATH}
        fill="#f3b660"
        stroke="#f3b660"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

// ---------------------------------------------------------------------
// Welcome — the doorway
// ---------------------------------------------------------------------

function Welcome() {
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);

  const demoStars = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: `demo-${i}`,
        color: PAPER_COLORS[i % PAPER_COLORS.length],
      })),
    []
  );

  const openJar = () => {
    if (opening) return;
    setOpening(true);
    setTimeout(() => navigate("/jar"), 1100);
  };

  return (
    <main className="lj-scene lj-welcome">
      <NightSky />
      <div className="lj-lamp" aria-hidden="true" />

      <div className="lj-welcome-grid">
        <motion.div
          className="lj-welcome-copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <p className="lj-kicker">a keeping place for</p>

          <h1 className="lj-title">
            The Jar of <em>Little Things</em>
          </h1>

          <p className="lj-lede">
            Fold up the tiny moments — a joke that landed, a shade of sky, a
            name you don't want to forget — and drop them in. Come back
            whenever you need something small and true.
          </p>

          <button
            className="lj-btn lj-btn-primary"
            onClick={openJar}
            disabled={opening}
          >
            {opening ? "Unscrewing the lid…" : "Unscrew the lid"}
          </button>

          <p className="lj-footnote">filled by hand, one note at a time</p>
        </motion.div>

        <motion.div
          className="lj-jar-stage"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
        >
          <motion.div
            className="lj-welcome-jar"
            animate={
              opening
                ? { y: -14, scale: 1.05, rotate: [0, -4, 4, 0] }
                : { y: [0, -10, 0] }
            }
            transition={
              opening
                ? { duration: 0.5, ease: "easeOut" }
                : { duration: 6, repeat: Infinity, ease: "easeInOut" }
            }
          >
            <GlassJar
              items={demoStars}
              mode={opening ? "opening" : "idle"}
              tag="little things"
              label="A glass jar full of folded paper stars"
            />
          </motion.div>
          <div className="lj-shelf" aria-hidden="true" />
        </motion.div>
      </div>

      <motion.div
        className="lj-flood"
        initial={false}
        animate={
          opening
            ? { opacity: [0, 0, 1], scale: [0.2, 0.2, 3] }
            : { opacity: 0, scale: 0.2 }
        }
        transition={{ duration: 1.1, times: [0, 0.45, 1] }}
        aria-hidden="true"
      />
    </main>
  );
}

// ---------------------------------------------------------------------
// Jar Room — the shelf, the jar, and one unfolded letter
// ---------------------------------------------------------------------

function NoteLetter({ note, index, total, isKept, collecting, onKeep, onExpand }) {
  const isLong = Boolean(note.content && note.content.length > LONG_NOTE_LENGTH);
  const date = formatDate(note.createdAt);

  return (
    <motion.article
      key={note.id}
      className="lj-letter"
      style={{ "--paper": paperFor(note, index) }}
      initial={{ opacity: 0, rotateX: -75, y: -24 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      exit={{ opacity: 0, y: 24, rotate: 3, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 120, damping: 16 }}
    >
      <div className="lj-letter-head">
        <span className="lj-letter-no">
          No. {pad(index + 1)} / {pad(total)}
        </span>
        {date && <span>{date}</span>}
      </div>

      <p className={`lj-letter-body${isLong ? " is-clamped" : ""}`}>
        {note.content}
      </p>

      {isLong && (
        <button className="lj-read-more" onClick={onExpand}>
          unfold the rest →
        </button>
      )}

      {note.imageUrl && (
        <figure className="lj-polaroid">
          <img src={note.imageUrl} alt="Memory attached to this note" />
        </figure>
      )}

      <footer className="lj-letter-foot">
        {note.category ? (
          <span className="lj-label">{note.category.name}</span>
        ) : (
          <span />
        )}
        <StampButton kept={isKept} busy={collecting} onClick={onKeep} />
      </footer>
    </motion.article>
  );
}

function LetterModal({ note, index, onClose }) {
  return (
    <AnimatePresence>
      {note && (
        <motion.div
          className="lj-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.article
            className="lj-letter lj-modal"
            style={{ "--paper": paperFor(note, index) }}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 170, damping: 20 }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              className="lj-close"
              onClick={onClose}
              aria-label="Fold the note back up"
            >
              ✕
            </button>

            <div className="lj-letter-head">
              <span className="lj-letter-no">No. {pad(index + 1)}</span>
            </div>

            <p className="lj-letter-body">{note.content}</p>

            {note.imageUrl && (
              <figure className="lj-polaroid">
                <img src={note.imageUrl} alt="Memory attached to this note" />
              </figure>
            )}

            <footer className="lj-letter-foot">
              {note.category ? (
                <span className="lj-label">{note.category.name}</span>
              ) : (
                <span />
              )}
              <span className="lj-signoff">— from the jar</span>
            </footer>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function JarRoom() {
  const navigate = useNavigate();
  const { notes, categories, keptIds, setKeptIds, loading, error, reload } =
    useJarData(USER_ID);

  const [filter, setFilter] = useState("all");
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [message, setMessage] = useState("");

  const tilt = useTilt();

  const visibleNotes = useMemo(
    () =>
      filter === "all"
        ? notes
        : notes.filter((note) => String(note.category?.id) === String(filter)),
    [notes, filter]
  );

  const currentNote = visibleNotes[index];
  const isKept = Boolean(currentNote && keptIds.includes(Number(currentNote.id)));

  const jarItems = useMemo(
    () =>
      visibleNotes.slice(0, MAX_STARS).map((note, i) => ({
        id: note.id,
        color: paperFor(note, i),
        kept: keptIds.includes(Number(note.id)),
      })),
    [visibleNotes, keptIds]
  );

  const hiddenCount = Math.max(0, visibleNotes.length - MAX_STARS);

  // keep the index inside the current list
  useEffect(() => {
    if (index > visibleNotes.length - 1) {
      setIndex(Math.max(0, visibleNotes.length - 1));
    }
  }, [visibleNotes.length, index]);

  // every new note starts flat and folded
  useEffect(() => {
    tilt.reset();
    setExpanded(false);
  }, [index, filter, tilt.reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = useCallback((nextIndex) => {
    setIndex(nextIndex);
    setMessage("");
  }, []);

  const step = useCallback(
    (direction) => {
      setIndex((i) => Math.min(Math.max(i + direction, 0), visibleNotes.length - 1));
      setMessage("");
    },
    [visibleNotes.length]
  );

  const changeFilter = (value) => {
    setFilter(value);
    setIndex(0);
    setMessage("");
  };

  // Shake the jar: land on a note you weren't already looking at.
  const drawRandomNote = useCallback(() => {
    if (visibleNotes.length < 2 || drawing) return;

    setDrawing(true);
    setMessage("");

    setTimeout(() => {
      setIndex((current) => {
        let pick = current;
        while (pick === current) {
          pick = Math.floor(Math.random() * visibleNotes.length);
        }
        return pick;
      });
      setDrawing(false);
    }, 620);
  }, [visibleNotes.length, drawing]);

  // ← → wander, S shakes, Escape folds the letter back up
  useEffect(() => {
    const onKey = (event) => {
      if (event.target?.closest?.("input, textarea, select")) return;
      if (event.key === "Escape") return setExpanded(false);
      if (expanded) return;
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "s" || event.key === "S") drawRandomNote();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, step, drawRandomNote]);

  const handleKeep = async () => {
    if (!currentNote || collecting) return;

    const noteId = Number(currentNote.id);

    if (keptIds.includes(noteId)) {
      setMessage("This one is already in your treasures.");
      return;
    }

    try {
      setCollecting(true);
      setMessage("");

      await collectNote(currentNote.id, USER_ID);

      setKeptIds((ids) => [...ids, noteId]);
      setMessage("Stamped and kept. It's in your treasures now.");
    } catch (err) {
      console.error("Collection error:", err);

      if (err.response?.status === 409) {
        setKeptIds((ids) => (ids.includes(noteId) ? ids : [...ids, noteId]));
        setMessage("This one is already in your treasures.");
      } else {
        setMessage("That didn't save. Try keeping it again.");
      }
    } finally {
      setCollecting(false);
    }
  };

  const renderStage = () => {
    if (loading) {
      return (
        <div className="lj-status">
          <SpinningStar />
          <p>Unfolding…</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="lj-empty">
          <h2>The lid is stuck</h2>
          <p>{error}</p>
          <button className="lj-btn lj-btn-primary" onClick={reload}>
            Try again
          </button>
        </div>
      );
    }

    if (notes.length === 0) {
      return (
        <div className="lj-empty">
          <h2>Nothing in here yet</h2>
          <p>The jar fills up one small thing at a time. Start it off.</p>
          <button className="lj-btn lj-btn-primary" onClick={() => navigate("/add-note")}>
            Fold the first one
          </button>
        </div>
      );
    }

    if (!currentNote) {
      return (
        <div className="lj-empty">
          <h2>Nothing under this label</h2>
          <p>No little things have been filed here yet.</p>
          <button className="lj-btn lj-btn-ghost" onClick={() => changeFilter("all")}>
            Show every note
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="lj-letter-nav">
          <button
            className="lj-round"
            onClick={() => step(-1)}
            disabled={index === 0}
            aria-label="Previous note"
          >
            ←
          </button>

          <span className="lj-counter">
            {pad(index + 1)} <i>of</i> {pad(visibleNotes.length)}
          </span>

          <button
            className="lj-round"
            onClick={() => step(1)}
            disabled={index === visibleNotes.length - 1}
            aria-label="Next note"
          >
            →
          </button>
        </div>

        <motion.div
          className="lj-tilt"
          style={{
            rotateX: tilt.rotateX,
            rotateY: tilt.rotateY,
            transformPerspective: 1000,
          }}
          onMouseMove={tilt.onMouseMove}
          onMouseLeave={tilt.onMouseLeave}
        >
          <AnimatePresence mode="wait">
            <NoteLetter
              key={currentNote.id}
              note={currentNote}
              index={index}
              total={visibleNotes.length}
              isKept={isKept}
              collecting={collecting}
              onKeep={handleKeep}
              onExpand={() => setExpanded(true)}
            />
          </AnimatePresence>
        </motion.div>

        <p className="lj-message" aria-live="polite">
          {message}
        </p>
      </>
    );
  };

  return (
    <main className="lj-scene lj-room">
      <NightSky count={45} />
      <div className="lj-lamp lj-lamp-room" aria-hidden="true" />

      <header className="lj-topbar">
        <button className="lj-link" onClick={() => navigate("/")}>
          ← back to the doorway
        </button>

        <div className="lj-tally">
          <span>
            <b>{notes.length}</b> folded
          </span>
          <span className="lj-dot" />
          <span>
            <b>{keptIds.length}</b> kept
          </span>
        </div>

        <nav className="lj-top-actions">
          <button className="lj-btn lj-btn-ghost" onClick={() => navigate("/add-note")}>
            Fold a new one
          </button>
          <button className="lj-btn lj-btn-ghost" onClick={() => navigate("/collection")}>
            Your treasures
          </button>
        </nav>
      </header>

      <div className="lj-room-grid">
        {/* ---------- the jar on its shelf ---------- */}
        <section className="lj-jar-side">
          <motion.div
            className="lj-room-jar"
            animate={
              drawing
                ? { rotate: [0, -9, 8, -6, 4, 0], y: [0, -12, 0, -5, 0] }
                : { rotate: 0, y: [0, -6, 0] }
            }
            transition={
              drawing
                ? { duration: 0.62, ease: "easeInOut" }
                : { duration: 5, repeat: Infinity, ease: "easeInOut" }
            }
          >
            <GlassJar
              items={jarItems}
              activeId={currentNote?.id}
              onPick={goTo}
              label="Paper stars in the jar. Choose one to unfold it."
            />
          </motion.div>
          <div className="lj-shelf" aria-hidden="true" />

          <button
            className="lj-btn lj-btn-primary lj-shake"
            onClick={drawRandomNote}
            disabled={visibleNotes.length < 2 || drawing}
          >
            {drawing ? "Shaking…" : "Shake for a random one"}
          </button>

          <p className="lj-hint">
            tap a star to unfold it · ← → to wander · S to shake
          </p>
          {hiddenCount > 0 && (
            <p className="lj-hint">+{hiddenCount} more buried deeper in the jar</p>
          )}
        </section>

        {/* ---------- the unfolded letter ---------- */}
        <section className="lj-letter-side">
          {categories.length > 0 && (
            <div className="lj-chips" aria-label="Filter notes by label">
              <button
                className={`lj-chip${filter === "all" ? " is-on" : ""}`}
                onClick={() => changeFilter("all")}
                aria-pressed={filter === "all"}
              >
                everything
              </button>
              {categories.map((category) => {
                const on = String(filter) === String(category.id);
                return (
                  <button
                    key={category.id}
                    className={`lj-chip${on ? " is-on" : ""}`}
                    onClick={() => changeFilter(category.id)}
                    aria-pressed={on}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          )}

          {renderStage()}
        </section>
      </div>

      <LetterModal
        note={expanded ? currentNote : null}
        index={index}
        onClose={() => setExpanded(false)}
      />
    </main>
  );
}
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Caveat:wght@500;700&family=Karla:wght@400;500;700&display=swap');

.lj-scene {
  --cream: #f5ecd9;
  --amber: #f3b660;
  --muted: #a79fb8;
  --text: #efe7d6;
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  color: var(--text);
  font-family: "Karla", system-ui, sans-serif;
  background:
    radial-gradient(120% 80% at 15% 0%, #2b2440 0%, transparent 60%),
    linear-gradient(180deg, #17142a 0%, #120f1c 60%, #0d0b14 100%);
}
.lj-scene *, .lj-scene *::before, .lj-scene *::after { box-sizing: border-box; }
.lj-scene button:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }

/* sky + lamp */
.lj-sky { position: absolute; inset: 0; pointer-events: none; }
.lj-sky span {
  position: absolute; border-radius: 50%; background: #fff6dc; opacity: .2;
  animation: lj-twinkle ease-in-out infinite;
}
@keyframes lj-twinkle {
  0%, 100% { opacity: .15; transform: scale(1); }
  50% { opacity: .9; transform: scale(1.4); }
}
.lj-lamp {
  position: absolute; top: -20vh; right: -10vw; width: 70vw; height: 90vh;
  background: radial-gradient(closest-side, rgba(243,182,96,.22), rgba(243,182,96,0));
  pointer-events: none;
}
.lj-lamp-room { right: auto; left: -18vw; }

/* buttons */
.lj-btn {
  font: inherit; font-weight: 700; cursor: pointer; border-radius: 999px;
  padding: 14px 26px; border: 1px solid transparent;
  transition: transform .2s, background .2s, box-shadow .2s, opacity .2s, border-color .2s;
}
.lj-btn:disabled { opacity: .55; cursor: default; }
.lj-btn-primary {
  background: linear-gradient(180deg, #f7c677, #e39a42); color: #2a1a0b;
  box-shadow: 0 10px 30px rgba(243,170,80,.3), inset 0 1px 0 rgba(255,255,255,.5);
}
.lj-btn-primary:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px rgba(243,170,80,.45), inset 0 1px 0 rgba(255,255,255,.5);
}
.lj-btn-primary:not(:disabled):active { transform: scale(.97); }
.lj-btn-ghost {
  background: rgba(255,255,255,.04); color: var(--text);
  border-color: rgba(255,255,255,.14); padding: 10px 18px; font-weight: 500;
}
.lj-btn-ghost:hover { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.3); }
.lj-link {
  background: none; border: 0; color: var(--muted); font: inherit;
  cursor: pointer; padding: 8px 0; transition: color .2s;
}
.lj-link:hover { color: var(--text); }

/* jar */
.lj-jar-svg { width: 100%; height: auto; display: block; overflow: visible; }
.lj-jar-shadow { fill: rgba(0,0,0,.35); }
.lj-star { transition: filter .3s; outline: none; }
.lj-star.is-pickable { cursor: pointer; }
.lj-star.is-active {
  filter: drop-shadow(0 0 6px rgba(255,214,140,.95)) drop-shadow(0 0 14px rgba(255,190,100,.6));
}
.lj-star.is-pickable:focus-visible { filter: drop-shadow(0 0 4px #fff) drop-shadow(0 0 8px #fff); }
.lj-shelf {
  position: relative; z-index: -1;
  width: min(460px, 100%); height: 14px; margin-top: -14px; border-radius: 3px;
  background: linear-gradient(180deg, #8a5a34, #5b3a22);
  box-shadow: 0 18px 30px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,220,170,.35);
}

/* ---------- welcome ---------- */
.lj-welcome-grid {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: 1.05fr .95fr; align-items: center;
  gap: clamp(24px, 5vw, 80px);
  max-width: 1180px; min-height: 100dvh; margin: 0 auto;
  padding: clamp(64px, 10vh, 120px) clamp(20px, 5vw, 56px) 56px;
}
.lj-kicker {
  display: inline-block; margin: 0 0 6px; transform: rotate(-2deg);
  font-family: "Caveat", cursive; font-size: 1.7rem; color: var(--amber);
}
.lj-title {
  margin: 0 0 26px; color: #fbf3e2;
  font-family: "Fraunces", Georgia, serif; font-weight: 400;
  font-size: clamp(2.8rem, 6.4vw, 5.6rem); line-height: .95; letter-spacing: -.02em;
}
.lj-title em { display: block; font-style: italic; font-weight: 300; color: var(--amber); }
.lj-lede { max-width: 36ch; margin: 0 0 34px; font-size: 1.12rem; line-height: 1.7; color: #cfc6dc; }
.lj-footnote { margin: 22px 0 0; font-family: "Caveat", cursive; font-size: 1.35rem; color: var(--muted); }
.lj-jar-stage { position: relative; display: flex; flex-direction: column; align-items: center; }
.lj-welcome-jar { width: min(360px, 82%); }
.lj-flood {
  position: fixed; left: 50%; top: 50%; z-index: 20;
  width: 60vmax; height: 60vmax; margin: -30vmax 0 0 -30vmax; border-radius: 50%;
  background: radial-gradient(circle, #fff3d6 0%, #f3b660 45%, rgba(243,182,96,0) 70%);
  pointer-events: none; opacity: 0;
}

/* ---------- jar room ---------- */
.lj-topbar {
  position: relative; z-index: 2;
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
  max-width: 1240px; margin: 0 auto; padding: 22px clamp(20px, 4vw, 48px);
}
.lj-tally {
  display: flex; align-items: center; gap: 12px;
  font-family: "Caveat", cursive; font-size: 1.45rem; color: var(--muted);
}
.lj-tally b {
  margin-right: 4px; font-family: "Fraunces", serif; font-weight: 500;
  font-size: 1.3rem; color: var(--amber);
}
.lj-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--muted); }
.lj-top-actions { display: flex; flex-wrap: wrap; gap: 10px; }

.lj-room-grid {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
  align-items: start; gap: clamp(24px, 5vw, 72px);
  max-width: 1240px; margin: 0 auto; padding: 12px clamp(20px, 4vw, 48px) 80px;
}
.lj-jar-side {
  position: sticky; top: 24px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
}
.lj-room-jar { width: min(340px, 100%); transform-origin: 50% 90%; }
.lj-shake { margin-top: 30px; }
.lj-hint { margin: 14px 0 0; font-size: .85rem; letter-spacing: .02em; color: var(--muted); }

.lj-letter-side { display: flex; flex-direction: column; align-items: center; min-width: 0; padding-top: 8px; }
.lj-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 30px; }
.lj-chip {
  font: inherit; font-size: .88rem; padding: 7px 15px; border-radius: 999px; cursor: pointer;
  border: 1px dashed rgba(255,255,255,.24); background: transparent; color: var(--muted);
  transition: all .2s;
}
.lj-chip:hover { color: var(--text); border-color: rgba(255,255,255,.45); }
.lj-chip.is-on { background: var(--cream); color: #2a2233; border: 1px solid var(--cream); }

.lj-letter-nav { display: flex; align-items: center; gap: 18px; margin-bottom: 26px; }
.lj-round {
  width: 44px; height: 44px; border-radius: 50%; cursor: pointer; font-size: 1.1rem;
  border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.04); color: var(--text);
  transition: all .2s;
}
.lj-round:hover:not(:disabled) { background: var(--amber); border-color: var(--amber); color: #2a1a0b; }
.lj-round:disabled { opacity: .3; cursor: default; }
.lj-counter {
  min-width: 100px; text-align: center; font-family: "Fraunces", serif;
  font-size: 1.1rem; letter-spacing: .08em; color: var(--text);
}
.lj-counter i { margin: 0 4px; font-family: "Caveat", cursive; font-style: normal; font-size: 1.3rem; color: var(--muted); }

/* ---------- the letter ---------- */
.lj-tilt { width: min(560px, 100%); }
.lj-letter {
  --paper: #f6d7b0;
  position: relative; transform-origin: 50% 0%;
  padding: 36px clamp(26px, 4vw, 46px) 26px clamp(34px, 5vw, 56px);
  border-radius: 4px; color: #2b2330;
  background:
    linear-gradient(180deg,
      transparent 0 32.8%, rgba(60,40,20,.08) 33.3%, rgba(255,255,255,.4) 33.8%, transparent 34.3%,
      transparent 66.2%, rgba(60,40,20,.08) 66.7%, rgba(255,255,255,.4) 67.2%, transparent 67.7%),
    repeating-linear-gradient(180deg, transparent 0 33px, rgba(70,60,110,.12) 33px 34px),
    linear-gradient(180deg,
      color-mix(in srgb, var(--paper) 35%, #fffaf0),
      color-mix(in srgb, var(--paper) 60%, #fff6e6));
  box-shadow: 0 30px 60px -20px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.5);
}
.lj-letter::before {
  content: ""; position: absolute; top: 0; bottom: 0; left: clamp(18px, 3vw, 30px);
  width: 1px; background: rgba(214,96,96,.4);
}
.lj-letter::after {
  content: ""; position: absolute; top: -12px; left: 50%; width: 110px; height: 26px;
  transform: translateX(-50%) rotate(-3deg);
  background: rgba(255,255,255,.42); box-shadow: 0 1px 3px rgba(0,0,0,.15);
}
.lj-letter-head {
  display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
  margin-bottom: 14px; font-family: "Caveat", cursive; font-size: 1.35rem; color: rgba(43,35,48,.6);
}
.lj-letter-no {
  font-family: "Fraunces", serif; font-size: .78rem; letter-spacing: .22em;
  text-transform: uppercase; color: rgba(43,35,48,.55);
}
.lj-letter-body {
  margin: 0; white-space: pre-wrap; overflow-wrap: anywhere;
  font-family: "Fraunces", Georgia, serif; font-size: clamp(1.12rem, 1.6vw, 1.32rem); line-height: 34px;
}
.lj-letter-body.is-clamped {
  display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden;
}
.lj-read-more {
  margin-top: 10px; padding: 0; border: 0; background: none; cursor: pointer;
  font-family: "Caveat", cursive; font-size: 1.45rem; color: #a4532e;
  text-decoration: underline wavy rgba(164,83,46,.45); text-underline-offset: 5px;
}
.lj-polaroid {
  width: fit-content; max-width: 88%; margin: 24px auto 4px; padding: 10px 10px 30px;
  background: #fff; transform: rotate(2deg); box-shadow: 0 10px 24px rgba(0,0,0,.22);
}
.lj-polaroid img { display: block; max-width: 100%; max-height: 280px; object-fit: cover; }
.lj-letter-foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-top: 24px; }
.lj-label {
  position: relative; padding: 2px 16px 2px 24px;
  font-family: "Caveat", cursive; font-size: 1.3rem; color: #3a2f3f;
  background: rgba(255,255,255,.6);
  clip-path: polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 0 50%);
}
.lj-label::before {
  content: ""; position: absolute; left: 10px; top: 50%; width: 5px; height: 5px;
  border-radius: 50%; background: rgba(43,35,48,.4); transform: translateY(-50%);
}

/* postage-stamp keep button */
.lj-stamp {
  position: relative; flex-shrink: 0; padding: 0; border: 0; background: none; cursor: pointer; font: inherit;
  transform: rotate(5deg); filter: drop-shadow(0 6px 8px rgba(0,0,0,.22));
  transition: transform .25s ease;
}
.lj-stamp:hover:not(:disabled) { transform: rotate(0deg) scale(1.07); }
.lj-stamp:disabled { cursor: default; }
.lj-stamp-paper {
  display: block; width: 78px; height: 92px; padding: 9px; background: #fffaf0;
  -webkit-mask:
    radial-gradient(circle 3px, #0000 98%, #000) 0 0 / 10px 10px round,
    linear-gradient(#000 0 0) 6px 6px / calc(100% - 12px) calc(100% - 12px) no-repeat;
  mask:
    radial-gradient(circle 3px, #0000 98%, #000) 0 0 / 10px 10px round,
    linear-gradient(#000 0 0) 6px 6px / calc(100% - 12px) calc(100% - 12px) no-repeat;
}
.lj-stamp-face {
  height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  border-radius: 2px; color: #fff6e6; background: linear-gradient(160deg, #e2735b, #b94536);
}
.lj-stamp-icon { font-size: 1.6rem; line-height: 1; }
.lj-stamp-word { font-family: "Fraunces", serif; font-size: .66rem; letter-spacing: .22em; text-transform: uppercase; }
.lj-stamp.is-kept .lj-stamp-face { background: linear-gradient(160deg, #8fb79a, #4f7d61); }
.lj-stamp.is-kept::after {
  content: ""; position: absolute; top: -12px; right: -22px; width: 58px; height: 58px;
  border: 2px solid rgba(60,50,80,.45); border-radius: 50%;
  box-shadow: inset 0 0 0 5px transparent, inset 0 0 0 6px rgba(60,50,80,.3);
}

.lj-message {
  min-height: 1.6em; margin: 24px 0 0; text-align: center;
  font-family: "Caveat", cursive; font-size: 1.5rem; color: var(--amber);
}
.lj-status {
  display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 0;
  font-family: "Caveat", cursive; font-size: 1.6rem; color: var(--muted);
}
.lj-status p { margin: 0; }
.lj-empty {
  max-width: 400px; padding: 44px 28px; text-align: center;
  border: 1px dashed rgba(255,255,255,.2); border-radius: 20px; background: rgba(255,255,255,.02);
}
.lj-empty h2 { margin: 0 0 10px; font-family: "Fraunces", serif; font-weight: 400; font-size: 2rem; color: #fbf3e2; }
.lj-empty p { margin: 0 0 24px; line-height: 1.6; color: var(--muted); }

/* ---------- modal ---------- */
.lj-backdrop {
  position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 24px;
  background: rgba(10,8,16,.74); backdrop-filter: blur(6px);
}
.lj-modal { width: min(680px, 100%); max-height: 86vh; overflow-y: auto; transform-origin: 50% 50%; }
.lj-modal::after { display: none; }
.lj-close {
  position: absolute; top: 14px; right: 14px; width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid rgba(43,35,48,.2); background: rgba(255,255,255,.55); color: #2b2330; cursor: pointer;
}
.lj-signoff { font-family: "Caveat", cursive; font-size: 1.35rem; color: rgba(43,35,48,.55); }

/* ---------- lock tag ---------- */
.lj-lock {
  position: fixed; right: 18px; bottom: 18px; z-index: 60;
  display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,.16); background: rgba(21,19,31,.78); backdrop-filter: blur(8px);
  color: #e9e1d0; font: 500 .85rem "Karla", system-ui, sans-serif; cursor: pointer;
  transition: border-color .2s, color .2s, transform .2s;
}
.lj-lock:hover { border-color: #f3b660; color: #f3b660; transform: translateY(-1px); }
.lj-lock svg { width: 14px; height: 14px; }

/* ---------- responsive ---------- */
@media (max-width: 900px) {
  .lj-welcome-grid { grid-template-columns: 1fr; text-align: center; padding-top: 40px; }
  .lj-welcome-grid .lj-jar-stage { order: -1; }
  .lj-welcome-jar { width: min(250px, 66%); }
  .lj-lede { margin-left: auto; margin-right: auto; }
  .lj-topbar { justify-content: center; }
  .lj-room-grid { grid-template-columns: 1fr; }
  .lj-jar-side { position: relative; top: 0; }
  .lj-room-jar { width: min(230px, 64%); }
}
@media (prefers-reduced-motion: reduce) {
  .lj-sky span { animation: none; }
}
`;

function JarStyles() {
  return <style>{STYLES}</style>;
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

// ---------------------------------------------------------------------
// App
// ---------------------------------------------------------------------

function App() {
  const [isUnlocked, setIsUnlocked] = useState(
    () => sessionStorage.getItem("jarAccessGranted") === "true"
  );

  if (!isUnlocked) {
    return <AccessGate onUnlock={() => setIsUnlocked(true)} />;
  }

  const handleLock = () => {
    sessionStorage.removeItem("jarAccessGranted");
    setIsUnlocked(false);
  };

  return (
    <BrowserRouter>
      <JarStyles />

      <button onClick={handleLock} className="lj-lock">
        <LockIcon />
        Lock the jar
      </button>

      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/jar" element={<JarRoom />} />
        <Route path="/add-note" element={<AddNote />} />
        <Route path="/collection" element={<Collection />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;