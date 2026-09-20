import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";

import { useEffect, useState } from "react";
import AccessGate from "./pages/AccessGate";

import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

import {
  getAllNotes,
  getCategories,
  collectNote,
  getCollectedNotes,
} from "./services/api";

import Collection from "./pages/Collection";
import AddNote from "./pages/AddNote";
import "./App.css";

// --------------------
// Welcome Page
// --------------------

const jarVariants = {
  idle: {
    y: [0, -10, 0],
    scale: 1,
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },

  opening: {
    y: -16,
    scale: 1.05,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const lidVariants = {
  idle: {
    y: 0,
    rotate: 0,
    opacity: 1,
  },

  opening: {
    y: -85,
    rotate: -34,
    opacity: 0,
    transition: {
      duration: 0.6,
      ease: "easeIn",
    },
  },
};

const scrapMotion = {
  1: {
    restRotate: -11,
    x: -46,
    y: -150,
    rotate: -56,
    delay: 0.16,
  },

  2: {
    restRotate: 9,
    x: 38,
    y: -175,
    rotate: 47,
    delay: 0.05,
  },

  3: {
    restRotate: -5,
    x: -14,
    y: -140,
    rotate: -27,
    delay: 0.22,
  },

  4: {
    restRotate: 13,
    x: 24,
    y: -165,
    rotate: 41,
    delay: 0.11,
  },
};

const scrapVariants = (number) => ({
  idle: {
    x: 0,
    y: 0,
    rotate: scrapMotion[number].restRotate,
    opacity: 1,
  },

  opening: {
    x: scrapMotion[number].x,
    y: scrapMotion[number].y,
    rotate: scrapMotion[number].rotate,
    opacity: 0,
    transition: {
      duration: 0.75,
      delay: scrapMotion[number].delay,
      ease: "easeOut",
    },
  },
});

const flashVariants = {
  idle: {
    opacity: 0,
  },

  opening: {
    opacity: [0, 0.85, 0],
    transition: {
      duration: 0.9,
      times: [0, 0.55, 1],
    },
  },
};

function Welcome() {
  const navigate = useNavigate();

  const [isOpening, setIsOpening] = useState(false);

  const garlandMarks = [
    "✦",
    "♡",
    "✦",
    "♡",
    "✦",
    "♡",
    "✦",
  ];

  const handleOpenJar = () => {
    if (isOpening) {
      return;
    }

    setIsOpening(true);

    setTimeout(() => {
      navigate("/jar");
    }, 950);
  };

  const motionState = isOpening ? "opening" : "idle";

  return (
    <main className="welcome-page">
      <div className="light-beam"></div>

      <div className="garland" aria-hidden="true">
        {garlandMarks.map((mark, index) => (
          <span
            className="garland-tag"
            key={index}
            style={{ "--i": index }}
          >
            {mark}
          </span>
        ))}
      </div>

      <motion.div
        className="welcome-content"
        initial={{
          opacity: 0,
          y: 24,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 1,
          ease: "easeOut",
        }}
      >
        <div className="welcome-grid">
          <div className="welcome-text">
            <h1>The Jar of Little Things</h1>

            <p className="welcome-description">
              Fold up the tiny moments — a joke that landed, a shade
              of sky, a name you don't want to forget — and drop them
              in. Come back whenever you need something small and true.
            </p>

            <motion.button
              className="open-jar-button"
              whileHover={!isOpening ? { y: -2 } : {}}
              whileTap={!isOpening ? { scale: 0.97 } : {}}
              onClick={handleOpenJar}
              disabled={isOpening}
            >
              {isOpening ? "Opening..." : "Open the jar"}
            </motion.button>

            <p className="bottom-message">
              filled by hand, one note at a time
            </p>
          </div>

          <motion.div
            className="jar-illustration"
            variants={jarVariants}
            animate={motionState}
          >
            <motion.div
              className="jar-ring"
              variants={lidVariants}
              animate={motionState}
            ></motion.div>

            <div className="jar-glass">
              <motion.span
                className="note-scrap scrap-1"
                variants={scrapVariants(1)}
                animate={motionState}
              ></motion.span>

              <motion.span
                className="note-scrap scrap-2"
                variants={scrapVariants(2)}
                animate={motionState}
              ></motion.span>

              <motion.span
                className="note-scrap scrap-3"
                variants={scrapVariants(3)}
                animate={motionState}
              ></motion.span>

              <motion.span
                className="note-scrap scrap-4"
                variants={scrapVariants(4)}
                animate={motionState}
              ></motion.span>

              <div className="jar-glass-sheen"></div>
            </div>

            <div className="jar-shadow"></div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="opening-flash"
        variants={flashVariants}
        animate={motionState}
        aria-hidden="true"
      ></motion.div>
    </main>
  );
}

// --------------------
// Jar Room Page
// --------------------

// Drop-in replacement for the JarRoom function in App.jsx.
// All data logic is unchanged — only the layout and a "draw a random
// note" interaction on the jar are new.

function JarRoom() {
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collectedNoteIds, setCollectedNoteIds] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [collecting, setCollecting] = useState(false);
  const [collectionMessage, setCollectionMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [drawing, setDrawing] = useState(false);

  const userId = 1;

  // ---- tilt (unchanged) ----
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const springX = useSpring(tiltX, { stiffness: 150, damping: 20 });
  const springY = useSpring(tiltY, { stiffness: 150, damping: 20 });
  const noteRotateX = useTransform(springY, [-40, 40], [6, -6]);
  const noteRotateY = useTransform(springX, [-40, 40], [-6, 6]);

  const handleNoteMouseMove = (event) => {
    const b = event.currentTarget.getBoundingClientRect();
    tiltX.set(event.clientX - b.left - b.width / 2);
    tiltY.set(event.clientY - b.top - b.height / 2);
  };

  const handleNoteMouseLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  // ---- load (unchanged) ----
  const loadJarData = async () => {
    try {
      setLoading(true);
      setError("");

      const [notesResponse, categoryResponse] = await Promise.all([
        getAllNotes(),
        getCategories(),
      ]);

      setNotes(notesResponse.data || []);
      setCategories(categoryResponse.data || []);
      setCurrentIndex(0);

      try {
        const collectedResponse = await getCollectedNotes(userId);
        const collections = Array.isArray(collectedResponse.data)
          ? collectedResponse.data
          : [];

        const savedIds = collections
          .map((c) => {
            if (c.note?.id !== undefined) return Number(c.note.id);
            if (c.noteId !== undefined) return Number(c.noteId);
            if (c.note?.noteId !== undefined) return Number(c.note.noteId);
            return null;
          })
          .filter((id) => id !== null && !Number.isNaN(id));

        setCollectedNoteIds(savedIds);
      } catch (collectionError) {
        console.error("Could not load collected notes:", collectionError);
        setCollectedNoteIds([]);
      }
    } catch (err) {
      console.error("Could not load jar data:", err);
      setError("The jar didn't open. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJarData();
  }, []);

  useEffect(() => {
    tiltX.set(0);
    tiltY.set(0);
    setIsExpanded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // Arrow keys move through the jar; Escape folds a note back up.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") return setIsExpanded(false);
      if (isExpanded) return;
      if (event.key === "ArrowRight") nextNote();
      if (event.key === "ArrowLeft") previousNote();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, notes.length]);

  const currentNote = notes[currentIndex];

  const isLongNote = Boolean(
    currentNote && currentNote.content && currentNote.content.length > 220
  );

  const nextNote = () => {
    setCurrentIndex((i) => Math.min(i + 1, notes.length - 1));
    setCollectionMessage("");
  };

  const previousNote = () => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
    setCollectionMessage("");
  };

  // Shake the jar: land on a note you weren't already looking at.
  const drawRandomNote = () => {
    if (notes.length < 2 || drawing) return;

    setDrawing(true);
    setCollectionMessage("");

    setTimeout(() => {
      let pick = currentIndex;
      while (pick === currentIndex) {
        pick = Math.floor(Math.random() * notes.length);
      }
      setCurrentIndex(pick);
      setDrawing(false);
    }, 520);
  };

  // ---- collect (unchanged) ----
  const handleCollectNote = async () => {
    if (!currentNote || collecting) return;

    if (collectedNoteIds.includes(currentNote.id)) {
      setCollectionMessage("This one is already in your treasures.");
      return;
    }

    try {
      setCollecting(true);
      setCollectionMessage("");

      await collectNote(currentNote.id, userId);

      setCollectedNoteIds((ids) => [...ids, currentNote.id]);
      setCollectionMessage("Kept. It's in your treasures now.");
    } catch (err) {
      console.error("Collection error:", err);

      if (err.response?.status === 409) {
        setCollectedNoteIds((ids) =>
          ids.includes(currentNote.id) ? ids : [...ids, currentNote.id]
        );
        setCollectionMessage("This one is already in your treasures.");
      } else {
        setCollectionMessage("That didn't save. Try keeping it again.");
      }
    } finally {
      setCollecting(false);
    }
  };

  const isKept = currentNote && collectedNoteIds.includes(currentNote.id);

  return (
    <main className="desk">
      <div className="light-beam room-beam"></div>

      {/* ---------- LEFT RAIL: the jar lives here permanently ---------- */}
      <aside className="desk-rail">
        <button className="rail-back" onClick={() => navigate("/")}>
          ← the doorway
        </button>

        <motion.button
          className="rail-jar"
          onClick={drawRandomNote}
          animate={
            drawing
              ? { rotate: [0, -7, 6, -4, 3, 0], y: [0, -6, 0] }
              : { rotate: 0, y: [0, -7, 0] }
          }
          transition={
            drawing
              ? { duration: 0.52, ease: "easeInOut" }
              : { duration: 5, repeat: Infinity, ease: "easeInOut" }
          }
          aria-label="Shake the jar for a random note"
        >
          <span className="jar-ring big-ring"></span>

          <span className="jar-glass big-glass">
            <span className="note-scrap scrap-1"></span>
            <span className="note-scrap scrap-2"></span>
            <span className="note-scrap scrap-3"></span>
            <span className="note-scrap scrap-4"></span>
            <span className="jar-glass-sheen"></span>
          </span>

          <span className="jar-shadow big-shadow"></span>
        </motion.button>

        <p className="rail-hint">Shake it for a note at random</p>

        <p className="rail-count">
          <strong>{notes.length}</strong> folded up
          <br />
          <strong>{collectedNoteIds.length}</strong> kept
        </p>

        {categories.length > 0 && (
          <div className="rail-tags">
            {categories.map((category) => (
              <span className="rail-tag" key={category.id}>
                {category.name}
              </span>
            ))}
          </div>
        )}

        <div className="rail-actions">
          <button onClick={() => navigate("/add-note")}>Fold a new one</button>
          <button onClick={() => navigate("/collection")}>Your treasures</button>
        </div>
      </aside>

      {/* ---------- RIGHT STAGE: one note, nothing else ---------- */}
      <section className="desk-stage">
        {loading ? (
          <p className="status-message">Unfolding…</p>
        ) : error ? (
          <p className="status-message error-message">{error}</p>
        ) : !currentNote ? (
          <div className="stage-empty">
            <h2>Nothing in here yet</h2>
            <p>The jar fills up one small thing at a time. Start it off.</p>
            <button onClick={() => navigate("/add-note")}>Fold the first one</button>
          </div>
        ) : (
          <>
            <div className="note-theatre">
              <button
                className="theatre-arrow"
                onClick={previousNote}
                disabled={currentIndex === 0}
                aria-label="Previous note"
              >
                ←
              </button>

              <div className="note-stack">
                <div className="note-stack-layer stack-back"></div>
                <div className="note-stack-layer stack-mid"></div>

                <motion.article
                  className={`note-card${isLongNote ? " note-card-clickable" : ""}`}
                  key={currentNote.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95, rotate: -5 }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotate: -1 }}
                  transition={{ type: "spring", stiffness: 140, damping: 15 }}
                  style={{
                    rotateX: noteRotateX,
                    rotateY: noteRotateY,
                    transformPerspective: 900,
                  }}
                  onMouseMove={handleNoteMouseMove}
                  onMouseLeave={handleNoteMouseLeave}
                  onClick={() => isLongNote && setIsExpanded(true)}
                >
                  <span className="note-ribbon"></span>

                  <span
                    className={`washi-tape ${
                      ["tape-rose", "tape-sage", "tape-brass"][currentIndex % 3]
                    }`}
                  ></span>

                  <span className="note-pin"></span>

                  <div className="note-card-inner">
                    <div className="note-content-wrap">
                      <p
                        className={`note-content${
                          isLongNote ? " note-content-clamped" : ""
                        }`}
                      >
                        {currentNote.content}
                      </p>

                      {isLongNote && <div className="note-fade-bottom"></div>}
                    </div>

                    {isLongNote && (
                      <button
                        className="note-expand-hint"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsExpanded(true);
                        }}
                      >
                        Read the rest
                      </button>
                    )}

                    {currentNote.imageUrl && (
                      <img
                        className="note-memory-image"
                        src={currentNote.imageUrl}
                        alt="Memory attached to this note"
                      />
                    )}

                    <div className="note-card-bottom">
                      {currentNote.category && (
                        <span className="note-category">
                          {currentNote.category.name}
                        </span>
                      )}

                      <button
                        className={`wax-seal${isKept ? " wax-seal-kept" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCollectNote();
                        }}
                        disabled={collecting || isKept}
                        title={isKept ? "Already kept" : "Keep this note"}
                      >
                        {collecting ? "…" : isKept ? "✓" : "♡"}
                        <span className="wax-seal-label">
                          {isKept ? "Kept" : "Keep"}
                        </span>
                      </button>
                    </div>
                  </div>
                </motion.article>
              </div>

              <button
                className="theatre-arrow"
                onClick={nextNote}
                disabled={currentIndex === notes.length - 1}
                aria-label="Next note"
              >
                →
              </button>
            </div>

            {/* the jar's contents, strung out as beads on a thread */}
            <div className="bead-thread" role="tablist" aria-label="Notes in the jar">
              {notes.map((note, index) => (
                <button
                  key={note.id}
                  className={`bead${index === currentIndex ? " bead-active" : ""}${
                    collectedNoteIds.includes(note.id) ? " bead-kept" : ""
                  }`}
                  onClick={() => {
                    setCurrentIndex(index);
                    setCollectionMessage("");
                  }}
                  aria-label={`Note ${index + 1}`}
                  aria-selected={index === currentIndex}
                />
              ))}
            </div>

            <p className="collection-message">{collectionMessage}</p>
          </>
        )}
      </section>

      {/* ---------- expanded letter view ---------- */}
      <AnimatePresence>
        {isExpanded && currentNote && (
          <motion.div
            className="note-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setIsExpanded(false)}
          >
            <motion.article
              className="note-modal-card"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 170, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="note-modal-close"
                onClick={() => setIsExpanded(false)}
                aria-label="Fold the note back up"
              >
                ✕
              </button>

              <div className="note-card-inner">
                <p className="note-content note-content-full">
                  {currentNote.content}
                </p>

                {currentNote.imageUrl && (
                  <img
                    className="note-memory-image"
                    src={currentNote.imageUrl}
                    alt="Memory attached to this note"
                  />
                )}

                <div className="note-card-bottom">
                  {currentNote.category && (
                    <span className="note-category">
                      {currentNote.category.name}
                    </span>
                  )}
                  <span className="note-footer">from the jar</span>
                </div>
              </div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

// --------------------
// Main App
// --------------------
function App() {
  const [isUnlocked, setIsUnlocked] = useState(
    () => sessionStorage.getItem("jarAccessGranted") === "true"
  );

  if (!isUnlocked) {
    return <AccessGate onUnlock={() => setIsUnlocked(true)} />;
  }

  const handleLogout = () => {
    sessionStorage.removeItem("jarAccessGranted");
    setIsUnlocked(false);
  };

  return (
    <BrowserRouter>
      <button onClick={handleLogout} className="lock-jar-button">
        🔒 Lock the Jar
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