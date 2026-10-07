import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getCollectedNotes } from "../services/api";

/* =====================================================================
   COLLECTION — THE ROYAL MEMORY ARCHIVE

   The collection is no longer a washing line.

   Each memory is treated like an heirloom document preserved inside
   a private archive.
   ===================================================================== */

const USER_ID = 1;

const LONG_NOTE_LENGTH = 220;

const PAPER_COLORS = [
  "#ead8b9",
  "#e6cda8",
  "#dfc7a4",
  "#efe0c4",
  "#e2cfb1",
  "#e8d4bd",
];

const SORTS = [
  { id: "newest", label: "newest first" },
  { id: "oldest", label: "oldest first" },
  { id: "jar", label: "as they were kept" },
];

const pad = (n) => String(n).padStart(2, "0");

/* ---------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------- */

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
          ? {
            day: "numeric",
            month: "long",
            year: "numeric",
          }
          : {
            day: "numeric",
            month: "short",
            year: "numeric",
          }
  );
};

const getMemoryTitle = (content, categoryName) => {
  if (!content) {
    return categoryName || "A little thing worth keeping";
  }

  const firstLine = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);

  if (!firstLine) {
    return categoryName || "A little thing worth keeping";
  }

  if (firstLine.length <= 52) {
    return firstLine;
  }

  return `${firstLine.slice(0, 49)}…`;
};

const getInitial = (content) => {
  if (!content) return "M";

  const character = content.trim().charAt(0);

  return character ? character.toUpperCase() : "M";
};

/* ---------------------------------------------------------------------
   Normalize API data
   --------------------------------------------------------------------- */

const normalize = (collection, index) => {
  const note = collection?.note || collection || {};

  const numericId = Number(note.id);

  const seed = Number.isFinite(numericId)
      ? Math.abs(numericId)
      : index;

  const categoryName =
      note.category?.name ||
      note.categoryName ||
      "";

  const content = note.content || "";

  return {
    key:
        collection?.id ??
        note.id ??
        `note-${index}`,

    order: index,

    content,

    imageUrl: note.imageUrl,

    categoryName,

    date:
        note.createdAt ||
        collection?.createdAt ||
        null,

    paper:
        PAPER_COLORS[seed % PAPER_COLORS.length],

    title: getMemoryTitle(
        content,
        categoryName
    ),

    initial: getInitial(content),
  };
};

/* =====================================================================
   ICONS
   ===================================================================== */

function SearchIcon() {
  return (
      <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
      >
        <circle cx="11" cy="11" r="6.8" />
        <path d="M16 16l5 5" />
      </svg>
  );
}

function ArchiveIcon() {
  return (
      <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          aria-hidden="true"
      >
        <path d="M4 7.5h16" />
        <path d="M5.5 7.5v11h13v-11" />
        <path d="M7 4.5h10l1.5 3H5.5z" />
        <path d="M9 12h6" />
      </svg>
  );
}

function CrownIcon() {
  return (
      <svg
          viewBox="0 0 32 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          aria-hidden="true"
      >
        <path d="M3 5l6 5 7-8 7 8 6-5-3 14H6z" />
        <path d="M6 19h20" />
      </svg>
  );
}

function WaxSeal() {
  return (
      <div className="ra-seal" aria-hidden="true">
      <span className="ra-seal-inner">
        M
      </span>
      </div>
  );
}

/* =====================================================================
   ARCHIVE CARD
   ===================================================================== */

function ArchiveCard({
                       note,
                       index,
                       onOpen,
                     }) {
  const isLong =
      note.content.length >
      LONG_NOTE_LENGTH;

  const date = formatDate(note.date);

  return (
      <motion.article
          className="ra-card-wrap"
          layout
          initial={{
            opacity: 0,
            y: 30,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: 30,
          }}
          transition={{
            duration: 0.45,
            delay:
                Math.min(index, 8) * 0.055,
            ease: [0.22, 1, 0.36, 1],
          }}
      >
        <button
            className="ra-card"
            onClick={() => onOpen(index)}
            style={{
              "--paper": note.paper,
            }}
            aria-label={`Open memory ${index + 1}`}
        >
          {/* decorative top label */}
          <div className="ra-card-top">
          <span className="ra-card-archive">
            PERSONAL ARCHIVE
          </span>

            <span className="ra-card-number">
            No. {pad(index + 1)}
          </span>
          </div>

          {/* ornament */}
          <div className="ra-card-ornament">
            <span />
            <i>✦</i>
            <span />
          </div>

          {/* title */}
          <div className="ra-card-heading">
          <span className="ra-card-initial">
            {note.initial}
          </span>

            <div>
            <span className="ra-card-kicker">
              {note.categoryName ||
                  "A LITTLE MEMORY"}
            </span>

              <h2>{note.title}</h2>
            </div>
          </div>

          {/* preview */}
          <p className="ra-card-preview">
            {note.content}
          </p>

          {/* image */}
          {note.imageUrl && (
              <div className="ra-card-photo">
                <img
                    src={note.imageUrl}
                    alt="Memory attached to this note"
                />

                <span className="ra-photo-caption">
              preserved photograph
            </span>
              </div>
          )}

          {/* bottom */}
          <div className="ra-card-bottom">
            <div className="ra-card-meta">
              {date && (
                  <span>
                {date}
              </span>
              )}

              {note.categoryName && (
                  <span>
                {note.categoryName}
              </span>
              )}
            </div>

            <span className="ra-open">
            {isLong
                ? "open archive"
                : "open memory"}
              <b>↗</b>
          </span>
          </div>

          <div className="ra-card-corner ra-card-corner-tl" />
          <div className="ra-card-corner ra-card-corner-tr" />
          <div className="ra-card-corner ra-card-corner-bl" />
          <div className="ra-card-corner ra-card-corner-br" />
        </button>
      </motion.article>
  );
}

/* =====================================================================
   MEMORY VIEWER
   ===================================================================== */

function LetterViewer({
                        notes,
                        index,
                        onClose,
                        onStep,
                      }) {
  const note =
      index !== null
          ? notes[index]
          : null;

  return (
      <AnimatePresence>
        {note && (
            <motion.div
                className="ra-overlay"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                transition={{
                  duration: 0.3,
                }}
                onClick={onClose}
            >
              <div
                  className="ra-viewer"
                  onClick={(event) =>
                      event.stopPropagation()
                  }
              >
                <AnimatePresence mode="wait">
                  <motion.article
                      key={note.key}
                      className="ra-document"
                      style={{
                        "--paper": note.paper,
                      }}
                      role="dialog"
                      aria-modal="true"
                      aria-label="Memory archive document"
                      initial={{
                        opacity: 0,
                        scale: 0.94,
                        y: 35,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.97,
                        y: -20,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 170,
                        damping: 22,
                      }}
                  >
                    {/* OUTER FRAME */}
                    <div className="ra-document-frame">

                      {/* close */}
                      <button
                          className="ra-close"
                          onClick={onClose}
                          aria-label="Close memory"
                      >
                        <span>×</span>
                      </button>

                      {/* document top */}
                      <header className="ra-document-head">

                        <div className="ra-document-class">
                      <span>
                        PRIVATE COLLECTION
                      </span>

                          <span>
                        ARCHIVE / {pad(index + 1)}
                      </span>
                        </div>

                        <div className="ra-document-title-row">
                          <div>
                        <span className="ra-document-kicker">
                          A MEMORY PRESERVED
                        </span>

                            <h2>
                              {note.title}
                            </h2>
                          </div>

                          <WaxSeal />
                        </div>

                        <div className="ra-document-rule">
                          <span />
                          <i>✦</i>
                          <span />
                        </div>

                        <div className="ra-document-details">
                      <span>
                        RECORD No.{" "}
                        {pad(index + 1)}
                      </span>

                          {note.categoryName && (
                              <span>
                          {note.categoryName}
                        </span>
                          )}

                          {note.date && (
                              <span>
                          {formatDate(
                              note.date,
                              true
                          )}
                        </span>
                          )}
                        </div>
                      </header>

                      {/* body */}
                      <div className="ra-document-scroll">
                        <section className="ra-document-content">

                          <div className="ra-manuscript-mark">
                            {note.initial}
                          </div>

                          <p>
                            {note.content}
                          </p>

                          {note.imageUrl && (
                              <figure className="ra-mounted-photo">
                                <div className="ra-photo-frame">
                                  <img
                                      src={note.imageUrl}
                                      alt="Memory attached to this note"
                                  />
                                </div>

                                <figcaption>
                            <span>
                              ARCHIVED PHOTOGRAPH
                            </span>

                                  <span>
                              kept alongside this memory
                            </span>
                                </figcaption>
                              </figure>
                          )}

                        </section>
                      </div>

                      {/* footer */}
                      <footer className="ra-document-footer">

                        <div className="ra-footer-left">
                          <CrownIcon />

                          <span>
                        Every little thing
                        <br />
                        is worth keeping.
                      </span>
                        </div>

                        <div className="ra-footer-date">
                          <small>
                            PRESERVED
                          </small>

                          <strong>
                            {note.date
                                ? formatDate(
                                    note.date,
                                    true
                                )
                                : "without a date"}
                          </strong>
                        </div>

                        <div className="ra-footer-mark">
                          M
                        </div>
                      </footer>

                      {/* paper ornaments */}
                      <span className="ra-document-corner ra-doc-tl" />
                      <span className="ra-document-corner ra-doc-tr" />
                      <span className="ra-document-corner ra-doc-bl" />
                      <span className="ra-document-corner ra-doc-br" />

                      <div className="ra-side-label">
                        MEMORA · PRIVATE · PRESERVED
                      </div>
                    </div>
                  </motion.article>
                </AnimatePresence>

                {/* navigation */}
                {notes.length > 1 && (
                    <div className="ra-viewer-nav">
                      <button
                          className="ra-nav-button"
                          onClick={() =>
                              onStep(-1)
                          }
                          disabled={index === 0}
                          aria-label="Previous memory"
                      >
                        <span>←</span>
                        <small>previous</small>
                      </button>

                      <div className="ra-viewer-counter">
                  <span>
                    {pad(index + 1)}
                  </span>

                        <i>of</i>

                        <span>
                    {pad(notes.length)}
                  </span>
                      </div>

                      <button
                          className="ra-nav-button"
                          onClick={() =>
                              onStep(1)
                          }
                          disabled={
                              index ===
                              notes.length - 1
                          }
                          aria-label="Next memory"
                      >
                        <small>next</small>
                        <span>→</span>
                      </button>
                    </div>
                )}
              </div>
            </motion.div>
        )}
      </AnimatePresence>
  );
}

/* =====================================================================
   MAIN COLLECTION
   ===================================================================== */

function Collection() {
  const navigate = useNavigate();

  const [
    treasuredNotes,
    setTreasuredNotes,
  ] = useState([]);

  const [loading, setLoading] =
      useState(true);

  const [error, setError] =
      useState("");

  const [searchTerm, setSearchTerm] =
      useState("");

  const [corner, setCorner] =
      useState("all");

  const [sort, setSort] =
      useState("newest");

  const [openIndex, setOpenIndex] =
      useState(null);

  /* -------------------------------------------------------------------
     Load memories
     ------------------------------------------------------------------- */

  const loadTreasuredNotes =
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
              await getCollectedNotes(
                  USER_ID
              );

          setTreasuredNotes(
              Array.isArray(
                  response.data
              )
                  ? response.data
                  : []
          );
        } catch (err) {
          console.error(
              "Could not load treasured notes:",
              err
          );

          setError(
              "Your treasures didn't load. Try again."
          );
        } finally {
          setLoading(false);
        }
      };

  useEffect(() => {
    loadTreasuredNotes();
  }, []);

  /* -------------------------------------------------------------------
     Normalize
     ------------------------------------------------------------------- */

  const allNotes = useMemo(
      () =>
          treasuredNotes.map(
              normalize
          ),
      [treasuredNotes]
  );

  /* -------------------------------------------------------------------
     Categories
     ------------------------------------------------------------------- */

  const corners = useMemo(
      () =>
          [
            ...new Set(
                allNotes
                    .map(
                        (note) =>
                            note.categoryName
                    )
                    .filter(Boolean)
            ),
          ],
      [allNotes]
  );

  const hasDates =
      allNotes.some(
          (note) =>
              toTime(note.date) !== null
      );

  /* -------------------------------------------------------------------
     Filtering + sorting
     ------------------------------------------------------------------- */

  const visibleNotes = useMemo(() => {
    const term =
        searchTerm
            .trim()
            .toLowerCase();

    const filtered =
        allNotes.filter(
            (note) => {
              if (
                  corner !== "all" &&
                  note.categoryName !==
                  corner
              ) {
                return false;
              }

              if (!term) return true;

              return `${note.content} ${note.categoryName} ${note.title}`
                  .toLowerCase()
                  .includes(term);
            }
        );

    if (
        sort === "jar" ||
        !hasDates
    ) {
      return filtered;
    }

    return [...filtered].sort(
        (a, b) => {
          const ta =
              toTime(a.date) ?? 0;

          const tb =
              toTime(b.date) ?? 0;

          return sort === "newest"
              ? tb - ta
              : ta - tb;
        }
    );
  }, [
    allNotes,
    searchTerm,
    corner,
    sort,
    hasDates,
  ]);

  /* -------------------------------------------------------------------
     Stats
     ------------------------------------------------------------------- */

  const stats = useMemo(() => {
    const times =
        allNotes
            .map((note) =>
                toTime(note.date)
            )
            .filter(
                (time) =>
                    time !== null
            );

    return {
      total:
      allNotes.length,

      pictures:
      allNotes.filter(
          (note) =>
              note.imageUrl
      ).length,

      since:
          times.length
              ? formatDate(
                  Math.min(...times),
                  true
              )
              : null,
    };
  }, [allNotes]);

  /* -------------------------------------------------------------------
     Close viewer if filtering changes
     ------------------------------------------------------------------- */

  useEffect(() => {
    if (
        openIndex !== null &&
        openIndex >
        visibleNotes.length - 1
    ) {
      setOpenIndex(null);
    }
  }, [
    visibleNotes.length,
    openIndex,
  ]);

  /* -------------------------------------------------------------------
     Lock page scrolling while viewer is open
     ------------------------------------------------------------------- */

  useEffect(() => {
    if (openIndex === null) {
      return undefined;
    }

    const previousOverflow =
        document.body.style.overflow;

    document.body.style.overflow =
        "hidden";

    return () => {
      document.body.style.overflow =
          previousOverflow;
    };
  }, [openIndex]);

  /* -------------------------------------------------------------------
     Keyboard navigation
     ------------------------------------------------------------------- */

  const step = (direction) => {
    setOpenIndex((current) => {
      if (current === null) {
        return current;
      }

      return Math.min(
          Math.max(
              current + direction,
              0
          ),
          visibleNotes.length - 1
      );
    });
  };

  useEffect(() => {
    if (openIndex === null) {
      return undefined;
    }

    const onKey = (event) => {
      if (
          event.key === "Escape"
      ) {
        setOpenIndex(null);
      }

      if (
          event.key === "ArrowRight"
      ) {
        step(1);
      }

      if (
          event.key === "ArrowLeft"
      ) {
        step(-1);
      }
    };

    window.addEventListener(
        "keydown",
        onKey
    );

    return () => {
      window.removeEventListener(
          "keydown",
          onKey
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    openIndex,
    visibleNotes.length,
  ]);

  /* -------------------------------------------------------------------
     Surprise
     ------------------------------------------------------------------- */

  const surprise = () => {
    if (
        visibleNotes.length === 0
    ) {
      return;
    }

    setOpenIndex(
        Math.floor(
            Math.random() *
            visibleNotes.length
        )
    );
  };

  /* -------------------------------------------------------------------
     Sorting
     ------------------------------------------------------------------- */

  const cycleSort = () => {
    const current =
        SORTS.findIndex(
            (item) =>
                item.id === sort
        );

    setSort(
        SORTS[
        (current + 1) %
        SORTS.length
            ].id
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCorner("all");
  };

  const currentSort =
      SORTS.find(
          (item) =>
              item.id === sort
      );

  /* ===================================================================
     PAGE
     =================================================================== */

  return (
      <main className="archive-page">

        <div className="archive-grain" />

        <div className="archive-wrap">

          {/* -------------------------------------------------------------
           TOP BAR
           ------------------------------------------------------------- */}

          <header className="archive-top">

            <button
                className="archive-back"
                onClick={() =>
                    navigate("/jar")
                }
            >
              <span>←</span>
              return to the jar
            </button>

            <div className="archive-brand">
              <ArchiveIcon />

              <div>
              <span>
                PRIVATE ARCHIVE
              </span>

                <strong>
                  Jar of Little Things
                </strong>
              </div>
            </div>

            <div className="archive-count">
            <span>
              <b>{stats.total}</b>
              memories
            </span>

              <i />

              <span>
              <b>{stats.pictures}</b>
              photographs
            </span>
            </div>

          </header>

          {/* -------------------------------------------------------------
           HERO
           ------------------------------------------------------------- */}

          <motion.section
              className="archive-hero"
              initial={{
                opacity: 0,
                y: 25,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.8,
              }}
          >
            <div className="hero-crest">
              <CrownIcon />
            </div>

            <span className="archive-overline">
            THE PRIVATE COLLECTION
          </span>

            <h1>
              Memories,
              <em>preserved.</em>
            </h1>

            <p>
              A collection of little things
              that deserved more than being
              forgotten in a camera roll.
            </p>

            <div className="hero-rule">
              <span />
              <i>✦</i>
              <span />
            </div>

            {stats.since && (
                <small>
                  The archive has been keeping
                  your memories since{" "}
                  <strong>
                    {stats.since}
                  </strong>
                </small>
            )}
          </motion.section>

          {/* -------------------------------------------------------------
           CONTROLS
           ------------------------------------------------------------- */}

          {!loading &&
              !error &&
              allNotes.length > 0 && (
                  <motion.section
                      className="archive-controls"
                      initial={{
                        opacity: 0,
                        y: 15,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay: 0.2,
                      }}
                  >
                    <div className="archive-toolbar">

                      <label className="archive-search">
                        <SearchIcon />

                        <span className="sr-only">
                    Search your memories
                  </span>

                        <input
                            type="search"
                            placeholder="search the archive…"
                            value={
                              searchTerm
                            }
                            onChange={(
                                event
                            ) =>
                                setSearchTerm(
                                    event.target
                                        .value
                                )
                            }
                        />
                      </label>

                      {hasDates && (
                          <button
                              className="archive-control-button"
                              onClick={
                                cycleSort
                              }
                          >
                    <span>
                      SORT
                    </span>

                            {currentSort.label}
                          </button>
                      )}

                      <button
                          className="archive-surprise"
                          onClick={
                            surprise
                          }
                          disabled={
                              visibleNotes.length ===
                              0
                          }
                      >
                  <span>
                    ✦
                  </span>

                        choose a memory
                      </button>

                    </div>

                    {corners.length >
                        1 && (
                            <div className="archive-filters">

                  <span>
                    FILED UNDER
                  </span>

                              <div>
                                <button
                                    className={
                                      corner ===
                                      "all"
                                          ? "active"
                                          : ""
                                    }
                                    onClick={() =>
                                        setCorner(
                                            "all"
                                        )
                                    }
                                >
                                  all
                                </button>

                                {corners.map(
                                    (name) => (
                                        <button
                                            key={
                                              name
                                            }
                                            className={
                                              corner ===
                                              name
                                                  ? "active"
                                                  : ""
                                            }
                                            onClick={() =>
                                                setCorner(
                                                    name
                                                )
                                            }
                                        >
                                          {name}
                                        </button>
                                    )
                                )}
                              </div>
                            </div>
                        )}

                    {(searchTerm ||
                        corner !==
                        "all") && (
                        <div className="archive-result">
                          Showing{" "}
                          <strong>
                            {
                              visibleNotes.length
                            }
                          </strong>{" "}
                          of{" "}
                          <strong>
                            {
                              allNotes.length
                            }
                          </strong>{" "}
                          memories
                        </div>
                    )}
                  </motion.section>
              )}

          {/* -------------------------------------------------------------
           CONTENT
           ------------------------------------------------------------- */}

          <section className="archive-content">

            {loading && (
                <div className="archive-status">
                  <div className="loading-seal">
                    ✦
                  </div>

                  <span>
                Opening the archive…
              </span>

                  <small>
                    gathering your little things
                  </small>
                </div>
            )}

            {!loading &&
                error && (
                    <div className="archive-empty">
                      <div className="empty-symbol">
                        ×
                      </div>

                      <h2>
                        The archive is
                        temporarily closed.
                      </h2>

                      <p>
                        {error}
                      </p>

                      <button
                          onClick={
                            loadTreasuredNotes
                          }
                      >
                        try again
                      </button>
                    </div>
                )}

            {!loading &&
                !error &&
                allNotes.length ===
                0 && (
                    <div className="archive-empty">
                      <div className="empty-symbol">
                        ✦
                      </div>

                      <h2>
                        The archive is
                        waiting.
                      </h2>

                      <p>
                        Open the jar, find a
                        little thing, and keep
                        it here forever.
                      </p>

                      <button
                          onClick={() =>
                              navigate("/jar")
                          }
                      >
                        return to the jar
                      </button>
                    </div>
                )}

            {!loading &&
                !error &&
                allNotes.length >
                0 &&
                visibleNotes.length ===
                0 && (
                    <div className="archive-empty">
                      <div className="empty-symbol">
                        ?
                      </div>

                      <h2>
                        Nothing was found.
                      </h2>

                      <p>
                        Try another word or
                        another section of the
                        archive.
                      </p>

                      <button
                          onClick={
                            clearFilters
                          }
                      >
                        show everything
                      </button>
                    </div>
                )}

            {!loading &&
                !error &&
                visibleNotes.length >
                0 && (
                    <motion.div
                        className="archive-grid"
                        layout
                    >
                      <AnimatePresence mode="popLayout">
                        {visibleNotes.map(
                            (
                                note,
                                index
                            ) => (
                                <ArchiveCard
                                    key={
                                      note.key
                                    }
                                    note={note}
                                    index={
                                      index
                                    }
                                    onOpen={
                                      setOpenIndex
                                    }
                                />
                            )
                        )}
                      </AnimatePresence>
                    </motion.div>
                )}

          </section>

          {/* -------------------------------------------------------------
           FOOTER
           ------------------------------------------------------------- */}

          <footer className="archive-footer">
          <span>
            ✦
          </span>

            <p>
              Some things are too little
              to post,
              <br />
              but too important to forget.
            </p>

            <span>
            ✦
          </span>
          </footer>

        </div>

        {/* ---------------------------------------------------------------
         VIEWER
         --------------------------------------------------------------- */}

        <LetterViewer
            notes={visibleNotes}
            index={openIndex}
            onClose={() =>
                setOpenIndex(null)
            }
            onStep={step}
        />

      </main>
  );
}

export default Collection;