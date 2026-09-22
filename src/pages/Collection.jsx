import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getCollectedNotes } from "../services/api";

/* =====================================================================
   COLLECTION — "the washing line"
   Every note you stamped hangs from a string of pegs under the night
   sky, swaying a little. Search, filter by corner, sort, or let the
   line pick one for you. Open any letter and flip through the rest.
   ===================================================================== */

// ---------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------

const USER_ID = 1;

// Same rule the jar uses: past this, the note gets clamped to a preview.
const LONG_NOTE_LENGTH = 220;

const PAPER_COLORS = [
  "#f6d7b0",
  "#f3b6a8",
  "#c9dcc0",
  "#f1e3a4",
  "#cfd6ee",
  "#e9c3d9",
];

const TILTS = [-2.2, 1.6, -0.8, 2.4, -1.6, 0.9];

const SORTS = [
  { id: "newest", label: "newest first" },
  { id: "oldest", label: "oldest first" },
  { id: "jar", label: "as they were kept" },
];

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

const pad = (n) => String(n).padStart(2, "0");

const toTime = (value) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const formatDate = (value, long = false) => {
  const time = toTime(value);
  if (time === null) return null;
  return new Date(time).toLocaleDateString(
    undefined,
    long
      ? { day: "numeric", month: "long", year: "numeric" }
      : { day: "numeric", month: "short", year: "numeric" }
  );
};

// Flatten whatever shape the API returns into one tidy object per note.
const normalize = (collection, index) => {
  const note = collection?.note || collection || {};
  const numericId = Number(note.id);
  const seed = Number.isFinite(numericId) ? Math.abs(numericId) : index;

  return {
    key: collection?.id ?? note.id ?? `note-${index}`,
    order: index,
    content: note.content || "",
    imageUrl: note.imageUrl,
    categoryName: note.category?.name || note.categoryName || "",
    date: note.createdAt || collection?.createdAt || null,
    paper: PAPER_COLORS[seed % PAPER_COLORS.length],
    tilt: TILTS[index % TILTS.length],
  };
};

// ---------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------

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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function HangingNote({ note, index, onOpen }) {
  const isLong = note.content.length > LONG_NOTE_LENGTH;
  const date = formatDate(note.date);

  return (
    <motion.li
      className="tr-hang"
      layout
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30, transition: { duration: 0.2 } }}
      transition={{
        type: "spring",
        stiffness: 120,
        damping: 14,
        delay: Math.min(index, 9) * 0.06,
      }}
    >
      <span className="tr-peg" aria-hidden="true" />

      <button
        className="tr-card"
        style={{
          "--paper": note.paper,
          "--tilt": `${note.tilt}deg`,
          "--delay": `${(index % 5) * -1.4}s`,
        }}
        onClick={() => onOpen(index)}
        aria-label={`Open treasured note ${index + 1}`}
      >
        <span className="tr-card-head">
          <span className="tr-card-no">No. {pad(index + 1)}</span>
          {date && <span>{date}</span>}
        </span>

        <span className="tr-card-body">{note.content}</span>

        {note.imageUrl && (
          <span className="tr-thumb">
            <img src={note.imageUrl} alt="Memory attached to this note" />
          </span>
        )}

        <span className="tr-card-foot">
          {note.categoryName ? (
            <span className="lj-label">{note.categoryName}</span>
          ) : (
            <span />
          )}
          <span className="tr-read">{isLong ? "read the rest →" : "open →"}</span>
        </span>
      </button>
    </motion.li>
  );
}

function LetterViewer({ notes, index, onClose, onStep }) {
  const note = index !== null ? notes[index] : null;

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
          <div className="tr-viewer" onClick={(event) => event.stopPropagation()}>
            <AnimatePresence mode="wait">
              <motion.article
                key={note.key}
                className="lj-letter lj-modal"
                style={{ "--paper": note.paper }}
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, y: 30, rotateX: -30 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: -20, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 170, damping: 20 }}
              >
                <button
                  className="lj-close"
                  onClick={onClose}
                  aria-label="Fold the note back up"
                >
                  ✕
                </button>

                <div className="lj-letter-head">
                  <span className="lj-letter-no">
                    No. {pad(index + 1)} / {pad(notes.length)}
                  </span>
                </div>

                <p className="lj-letter-body">{note.content}</p>

                {note.imageUrl && (
                  <figure className="lj-polaroid">
                    <img src={note.imageUrl} alt="Memory attached to this note" />
                  </figure>
                )}

                <footer className="lj-letter-foot">
                  {note.categoryName ? (
                    <span className="lj-label">{note.categoryName}</span>
                  ) : (
                    <span />
                  )}
                  <span className="lj-signoff">
                    {note.date ? `kept ${formatDate(note.date, true)}` : "kept with love"}
                  </span>
                </footer>
              </motion.article>
            </AnimatePresence>

            {notes.length > 1 && (
              <div className="tr-viewer-nav">
                <button
                  className="lj-round"
                  onClick={() => onStep(-1)}
                  disabled={index === 0}
                  aria-label="Previous treasure"
                >
                  ←
                </button>
                <span className="lj-counter">
                  {pad(index + 1)} <i>of</i> {pad(notes.length)}
                </span>
                <button
                  className="lj-round"
                  onClick={() => onStep(1)}
                  disabled={index === notes.length - 1}
                  aria-label="Next treasure"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------

function Collection() {
  const navigate = useNavigate();

  const [treasuredNotes, setTreasuredNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [corner, setCorner] = useState("all");
  const [sort, setSort] = useState("newest");

  // index (inside the visible list) of the letter being read, or null
  const [openIndex, setOpenIndex] = useState(null);

  const loadTreasuredNotes = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getCollectedNotes(USER_ID);

      setTreasuredNotes(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Could not load treasured notes:", err);
      setError("Your treasures didn't load. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTreasuredNotes();
  }, []);

  const allNotes = useMemo(() => treasuredNotes.map(normalize), [treasuredNotes]);

  const corners = useMemo(
    () => [...new Set(allNotes.map((n) => n.categoryName).filter(Boolean))],
    [allNotes]
  );

  const hasDates = allNotes.some((n) => toTime(n.date) !== null);

  const visibleNotes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const filtered = allNotes.filter((note) => {
      if (corner !== "all" && note.categoryName !== corner) return false;
      if (!term) return true;
      return `${note.content} ${note.categoryName}`.toLowerCase().includes(term);
    });

    if (sort === "jar" || !hasDates) return filtered;

    return [...filtered].sort((a, b) => {
      const ta = toTime(a.date) ?? 0;
      const tb = toTime(b.date) ?? 0;
      return sort === "newest" ? tb - ta : ta - tb;
    });
  }, [allNotes, searchTerm, corner, sort, hasDates]);

  const stats = useMemo(() => {
    const times = allNotes.map((n) => toTime(n.date)).filter((t) => t !== null);
    return {
      total: allNotes.length,
      pictures: allNotes.filter((n) => n.imageUrl).length,
      since: times.length ? formatDate(Math.min(...times), true) : null,
    };
  }, [allNotes]);

  // close the viewer if filtering removes the open note
  useEffect(() => {
    if (openIndex !== null && openIndex > visibleNotes.length - 1) {
      setOpenIndex(null);
    }
  }, [visibleNotes.length, openIndex]);

  const step = (direction) => {
    setOpenIndex((i) =>
      i === null ? i : Math.min(Math.max(i + direction, 0), visibleNotes.length - 1)
    );
  };

  const surprise = () => {
    if (visibleNotes.length === 0) return;
    setOpenIndex(Math.floor(Math.random() * visibleNotes.length));
  };

  const cycleSort = () => {
    const at = SORTS.findIndex((s) => s.id === sort);
    setSort(SORTS[(at + 1) % SORTS.length].id);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCorner("all");
  };

  // Escape folds the letter back up; arrows flip through the line.
  useEffect(() => {
    if (openIndex === null) return undefined;

    const onKey = (event) => {
      if (event.key === "Escape") setOpenIndex(null);
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex, visibleNotes.length]);

  const renderLine = () => {
    if (loading) {
      return (
        <div className="lj-status">
          <SpinningStar />
          <p>Gathering your treasures…</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="lj-empty tr-empty">
          <h2>The line snapped</h2>
          <p>{error}</p>
          <button className="lj-btn lj-btn-primary" onClick={loadTreasuredNotes}>
            Try again
          </button>
        </div>
      );
    }

    if (allNotes.length === 0) {
      return (
        <motion.div
          className="lj-empty tr-empty"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="tr-empty-pegs" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h2>Nothing hanging here yet</h2>
          <p>
            Open the jar, unfold a few little things, and stamp the ones you
            never want to lose.
          </p>
          <button className="lj-btn lj-btn-primary" onClick={() => navigate("/jar")}>
            Go find a note
          </button>
        </motion.div>
      );
    }

    if (visibleNotes.length === 0) {
      return (
        <motion.div
          className="lj-empty tr-empty"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2>No matching treasures</h2>
          <p>Try a different word, feeling, or corner of the jar.</p>
          <button className="lj-btn lj-btn-ghost" onClick={clearFilters}>
            Show every treasure
          </button>
        </motion.div>
      );
    }

    return (
      <ul className="tr-line">
        <AnimatePresence mode="popLayout">
          {visibleNotes.map((note, index) => (
            <HangingNote
              key={note.key}
              note={note}
              index={index}
              onOpen={setOpenIndex}
            />
          ))}
        </AnimatePresence>
      </ul>
    );
  };

  const currentSort = SORTS.find((s) => s.id === sort);

  return (
    <main className="collection-page tr-page">
      <div className="tr-wrap">
        <header className="tr-top">
          <button className="back-button" onClick={() => navigate("/jar")}>
            ← back to the jar
          </button>

          <div className="lj-tally">
            <span>
              <b>{stats.total}</b> kept
            </span>
            <span className="lj-dot" />
            <span>
              <b>{stats.pictures}</b> with pictures
            </span>
          </div>
        </header>

        <motion.section
          className="tr-hero"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <p className="lj-kicker">little things worth keeping</p>
          <h1 className="tr-title">
            Your <em>treasures</em>
          </h1>
          <p className="tr-intro">
            A quiet line of pegs for the words, memories, and feelings you
            never want to lose.
            {stats.since && ` Hanging here since 10th May.`}
          </p>
        </motion.section>

        {!loading && !error && allNotes.length > 0 && (
          <motion.div
            className="tr-controls"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="tr-toolbar">
              <label className="tr-search">
                <SearchIcon />
                <span className="an-sr-only">Search your treasures</span>
                <input
                  type="search"
                  placeholder="Search a word or a feeling…"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>

              {hasDates && (
                <button className="lj-btn lj-btn-ghost tr-sort" onClick={cycleSort}>
                  ↕ {currentSort.label}
                </button>
              )}

              <button
                className="lj-btn lj-btn-primary tr-surprise"
                onClick={surprise}
                disabled={visibleNotes.length === 0}
              >
                Pick one for me
              </button>
            </div>

            {corners.length > 1 && (
              <div className="lj-chips tr-chips" aria-label="Filter by corner">
                <button
                  className={`lj-chip${corner === "all" ? " is-on" : ""}`}
                  onClick={() => setCorner("all")}
                  aria-pressed={corner === "all"}
                >
                  everything
                </button>
                {corners.map((name) => (
                  <button
                    key={name}
                    className={`lj-chip${corner === name ? " is-on" : ""}`}
                    onClick={() => setCorner(name)}
                    aria-pressed={corner === name}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            {(searchTerm || corner !== "all") && visibleNotes.length > 0 && (
              <p className="tr-result">
                showing {visibleNotes.length} of {allNotes.length}
              </p>
            )}
          </motion.div>
        )}

        {renderLine()}
      </div>

      <LetterViewer
        notes={visibleNotes}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onStep={step}
      />
    </main>
  );
}

export default Collection;