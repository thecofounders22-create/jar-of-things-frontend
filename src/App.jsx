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

  const userId = 1;

  // --------------------
  // Note Card Tilt
  // --------------------

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);

  const springX = useSpring(tiltX, {
    stiffness: 150,
    damping: 20,
  });

  const springY = useSpring(tiltY, {
    stiffness: 150,
    damping: 20,
  });

  const noteRotateX = useTransform(
    springY,
    [-40, 40],
    [7, -7]
  );

  const noteRotateY = useTransform(
    springX,
    [-40, 40],
    [-7, 7]
  );

  const handleNoteMouseMove = (event) => {
    const bounds =
      event.currentTarget.getBoundingClientRect();

    tiltX.set(
      event.clientX - bounds.left - bounds.width / 2
    );

    tiltY.set(
      event.clientY - bounds.top - bounds.height / 2
    );
  };

  const handleNoteMouseLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  // --------------------
  // Load Jar Data
  // --------------------

  const loadJarData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        notesResponse,
        categoryResponse,
      ] = await Promise.all([
        getAllNotes(),
        getCategories(),
      ]);

      setNotes(notesResponse.data || []);
      setCategories(categoryResponse.data || []);
      setCurrentIndex(0);

      try {
        const collectedResponse =
          await getCollectedNotes(userId);

        console.log(
          "Collected notes response:",
          collectedResponse.data
        );

        const collections = Array.isArray(
          collectedResponse.data
        )
          ? collectedResponse.data
          : [];

        const savedIds = collections
          .map((collection) => {
            if (collection.note?.id !== undefined) {
              return Number(collection.note.id);
            }

            if (collection.noteId !== undefined) {
              return Number(collection.noteId);
            }

            if (collection.note?.noteId !== undefined) {
              return Number(collection.note.noteId);
            }

            return null;
          })
          .filter(
            (id) => id !== null && !Number.isNaN(id)
          );

        console.log("Saved note IDs:", savedIds);

        setCollectedNoteIds(savedIds);
      } catch (collectionError) {
        console.error(
          "Could not load collected notes:",
          collectionError
        );

        setCollectedNoteIds([]);
      }
    } catch (err) {
      console.error("Could not load jar data:", err);
      setError("The jar is sleeping. Please try again.");
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const currentNote = notes[currentIndex];

  // --------------------
  // Note Navigation
  // --------------------

  const nextNote = () => {
    setCurrentIndex((previousIndex) =>
      Math.min(
        previousIndex + 1,
        notes.length - 1
      )
    );

    setCollectionMessage("");
  };

  const previousNote = () => {
    setCurrentIndex((previousIndex) =>
      Math.max(previousIndex - 1, 0)
    );

    setCollectionMessage("");
  };

  // --------------------
  // Collect Note
  // --------------------

  const handleCollectNote = async () => {
    if (!currentNote || collecting) {
      return;
    }

    if (collectedNoteIds.includes(currentNote.id)) {
      setCollectionMessage(
        "You already treasured this note. 💛"
      );

      return;
    }

    try {
      setCollecting(true);
      setCollectionMessage("");

      await collectNote(currentNote.id, userId);

      setCollectedNoteIds((previousIds) => [
        ...previousIds,
        currentNote.id,
      ]);

      setCollectionMessage(
        "Saved to your treasures. 💛"
      );
    } catch (err) {
      console.error("Collection error:", err);

      if (err.response?.status === 409) {
        setCollectedNoteIds((previousIds) =>
          previousIds.includes(currentNote.id)
            ? previousIds
            : [...previousIds, currentNote.id]
        );

        setCollectionMessage(
          "You already treasured this note. 💛"
        );
      } else {
        setCollectionMessage(
          "This note could not be saved."
        );
      }
    } finally {
      setCollecting(false);
    }
  };

  // --------------------
  // JSX
  // --------------------

  return (
    <main className="jar-room">
      <div className="light-beam room-beam"></div>

      <header className="room-header">
        <button
          className="back-button"
          onClick={() => navigate("/")}
        >
          ← Back
        </button>

        <p className="room-label">
          Your little universe
        </p>

        <div className="room-counter">
          {notes.length} notes tucked away
        </div>
      </header>

      <section className="jar-room-content">
        <motion.div
          className="room-heading"
          initial={{
            opacity: 0,
            y: -20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
        >
          <h1>Pick a little piece of magic</h1>

          <p>
            Every note holds a tiny feeling, a memory, or a reason
            to smile.
          </p>
        </motion.div>

        <motion.div
          className="big-jar"
          initial={{
            opacity: 0,
            scale: 0.9,
            y: 16,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -8, 0],
          }}
          transition={{
            opacity: {
              duration: 0.6,
              delay: 0.1,
            },
            scale: {
              duration: 0.6,
              delay: 0.1,
            },
            y: {
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.7,
            },
          }}
        >
          <div className="jar-ring big-ring"></div>

          <div className="jar-glass big-glass">
            <span className="note-scrap scrap-1"></span>
            <span className="note-scrap scrap-2"></span>
            <span className="note-scrap scrap-3"></span>
            <span className="note-scrap scrap-4"></span>

            <div className="jar-glass-sheen"></div>
          </div>

          <div className="jar-shadow big-shadow"></div>
        </motion.div>

        {loading ? (
          <p className="status-message">
            Looking for your little notes...
          </p>
        ) : error ? (
          <p className="status-message error-message">
            {error}
          </p>
        ) : currentNote ? (
          <div className="note-stack">
            <div className="note-stack-layer stack-back"></div>
            <div className="note-stack-layer stack-mid"></div>

            <motion.article
              className="note-card"
              key={currentNote.id}
              initial={{
                opacity: 0,
                y: 35,
                scale: 0.94,
                rotate: -6,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                rotate: -1,
              }}
              transition={{
                type: "spring",
                stiffness: 140,
                damping: 15,
                delay: 0.15,
              }}
              style={{
                rotateX: noteRotateX,
                rotateY: noteRotateY,
                transformPerspective: 900,
              }}
              onMouseMove={handleNoteMouseMove}
              onMouseLeave={handleNoteMouseLeave}
            >
              <span className="note-ribbon"></span>

              <span
                className={`washi-tape ${[
                  "tape-rose",
                  "tape-sage",
                  "tape-brass",
                ][currentIndex % 3]
                  }`}
              ></span>

              <span className="note-pin"></span>

              <span
                className="note-quote-mark"
                aria-hidden="true"
              >
                ❝
              </span>

              <div className="note-card-inner">
                <div className="note-card-top">
                  <span>
                    note {currentIndex + 1} of {notes.length}
                  </span>

                  <span>♡</span>
                </div>

                <p className="note-content">
                  {currentNote.content}
                </p>

                {/* Attached memory image */}
                {currentNote.imageUrl && (
                  <img
                    className="note-memory-image"
                    src={currentNote.imageUrl}
                    alt="Memory attached to this note"
                  />
                )}

                {currentNote.category && (
                  <span className="note-category">
                    {currentNote.category.name}
                  </span>
                )}

                <div className="note-card-bottom">
                  <span className="note-footer">
                    kept with love, from the jar
                  </span>
                </div>
              </div>
            </motion.article>
          </div>
        ) : (
          <p className="status-message">
            The jar is empty for now. 💛
          </p>
        )}

        {/* Collect Note Button */}
        {currentNote && (
          <button
            className="collect-button"
            onClick={handleCollectNote}
            disabled={
              collecting ||
              collectedNoteIds.includes(currentNote.id)
            }
          >
            {collecting
              ? "Saving..."
              : collectedNoteIds.includes(currentNote.id)
                ? "💛 Already treasured"
                : "♡ Keep this note"}
          </button>
        )}

        {collectionMessage && (
          <p className="collection-message">
            {collectionMessage}
          </p>
        )}

        {/* Note Navigation */}
        {notes.length > 0 && (
          <div className="note-navigation">
            <button
              className="note-nav-button"
              onClick={previousNote}
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>

            <button
              className="note-nav-button"
              onClick={nextNote}
              disabled={
                currentIndex === notes.length - 1
              }
            >
              Next →
            </button>
          </div>
        )}

        {/* Add Note Button */}
        <button
          className="reveal-button"
          onClick={() => navigate("/add-note")}
        >
          + Add a little thing
        </button>

        {/* Collection Page Button */}
        <button
          className="collection-link"
          onClick={() => navigate("/collection")}
        >
          ♡ View treasured notes
        </button>

        {/* Categories */}
        <div className="category-list">
          <p className="category-heading">
            Corners of the jar
          </p>

          <div className="category-pills">
            {categories.map((category) => (
              <span
                className="category-pill"
                key={category.id}
              >
                {category.name}
              </span>
            ))}
          </div>
        </div>
      </section>
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

  function YourNavbar({ onLogout }) {
    return (
      <button onClick={onLogout}>
        Lock the Jar 🔒
      </button>
    );
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