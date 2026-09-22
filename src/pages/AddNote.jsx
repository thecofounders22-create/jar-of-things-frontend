import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { createNote, getCategories } from "../services/api";

/* =====================================================================
   ADD NOTE — "the writing desk"
   Write on a sheet of lined paper, pick a corner of the jar, choose who
   it's from, optionally seal it until later or tuck in a photo. On save
   the letter folds into a paper star that flies into the jar.
   ===================================================================== */

// ---------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------

const AUTHORS = [
  { id: "1", name: "Aaradhy" },
  { id: "2", name: "Preeti" },
];

const MAX_LENGTH = 5000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const PAPER_COLORS = [
  "#f6d7b0",
  "#f3b6a8",
  "#c9dcc0",
  "#f1e3a4",
  "#cfd6ee",
  "#e9c3d9",
];

const JAR_PATH =
  "M100 70 L200 70 L200 95 C200 112 260 116 260 162 L260 330 C260 355 240 366 214 366 L86 366 C60 366 40 355 40 330 L40 162 C40 116 100 112 100 95 Z";

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

// a loose, hand-placed pile at the bottom of the jar
const PILE = [
  [78, 340, -20], [108, 344, 15], [138, 338, -8], [168, 343, 24], [198, 339, -14],
  [226, 342, 10], [92, 316, 30], [122, 318, -25], [152, 314, 12], [182, 318, -30],
  [212, 315, 18], [106, 292, -12], [136, 290, 22], [166, 294, -18], [196, 290, 8],
  [120, 268, 16], [150, 266, -22], [180, 270, 28],
];

const colorFor = (id, index = 0) => {
  const key = Number(id);
  const seed = Number.isFinite(key) && key > 0 ? key : index;
  return PAPER_COLORS[seed % PAPER_COLORS.length];
};

const nowForInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const formatUnlock = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const countWords = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0);

// ---------------------------------------------------------------------
// Little visual pieces
// ---------------------------------------------------------------------

function MiniJar({ starCount, ghostColor, showGhost }) {
  const stars = PILE.slice(0, Math.min(starCount, PILE.length));

  return (
    <svg className="lj-jar-svg" viewBox="0 0 300 390" role="img" aria-label="The jar">
      <defs>
        <linearGradient id="an-glass" x1="0" x2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.03" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.12" />
        </linearGradient>
        <radialGradient id="an-glow" cx="0.5" cy="0.8" r="0.65">
          <stop offset="0" stopColor="#ffc978" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ffc978" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="an-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ecc176" />
          <stop offset="1" stopColor="#9c6a2c" />
        </linearGradient>
      </defs>

      <ellipse className="lj-jar-shadow" cx="150" cy="372" rx="118" ry="9" />
      <path d={JAR_PATH} fill="url(#an-glow)" />

      {stars.map(([x, y, r], i) => (
        <motion.g
          key={i}
          transform={`translate(${x} ${y})`}
          initial={i >= 9 ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
        >
          <g transform={`rotate(${r})`}>
            <path
              d={STAR_PATH}
              fill={PAPER_COLORS[i % PAPER_COLORS.length]}
              stroke={PAPER_COLORS[i % PAPER_COLORS.length]}
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>
        </motion.g>
      ))}

      <path
        d={JAR_PATH}
        fill="url(#an-glass)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="2.5"
      />
      <path
        d="M62 172 C57 222 57 292 66 336"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {/* open jar: the lid rests tilted beside the neck */}
      <g transform="translate(218 44) rotate(24)">
        <rect x="0" y="0" width="92" height="26" rx="6" fill="url(#an-lid)" />
        <rect x="-4" y="21" width="100" height="7" rx="3.5" fill="#7a4f1f" />
      </g>

      {/* the star you are writing, hovering over the opening */}
      <AnimatePresence>
        {showGhost && (
          <motion.g
            key="ghost"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: [0, -8, 0] }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{ y: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } }}
          >
            <g transform="translate(150 34)">
              <path
                className="an-ghost-star"
                d={STAR_PATH}
                fill={ghostColor}
                stroke={ghostColor}
                strokeWidth="5"
                strokeLinejoin="round"
                transform="scale(1.5)"
              />
            </g>
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

function FlyingStar({ flight, onDone }) {
  const { from, to, color } = flight;
  const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 180 };

  return (
    <motion.svg
      className="an-flying-star"
      width="44"
      height="44"
      viewBox="-16 -16 32 32"
      initial={{ x: from.x - 22, y: from.y - 22, scale: 0.4, rotate: 0, opacity: 0 }}
      animate={{
        x: [from.x - 22, mid.x - 22, to.x - 22],
        y: [from.y - 22, mid.y - 22, to.y - 22],
        scale: [0.4, 1.4, 0.7],
        rotate: [0, 200, 400],
        opacity: [0, 1, 1],
      }}
      transition={{ duration: 1, ease: "easeInOut", times: [0, 0.45, 1] }}
      onAnimationComplete={onDone}
      aria-hidden="true"
    >
      <path
        d={STAR_PATH}
        fill={color}
        stroke={color}
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------

function AddNote() {
  const navigate = useNavigate();

  // form data (same fields the API expects)
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [createdBy, setCreatedBy] = useState("1");
  const [unlockAt, setUnlockAt] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  // ui state
  const [categories, setCategories] = useState([]);
  const [sealed, setSealed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [flight, setFlight] = useState(null);
  const [starCount, setStarCount] = useState(9);
  const [lastSaved, setLastSaved] = useState(null);
  const [launching, setLaunching] = useState(false);

  const fileInputRef = useRef(null);
  const submitRef = useRef(null);
  const writingRef = useRef(null);
  const jarRef = useRef(null);
  const jarControls = useAnimationControls();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await getCategories();
        setCategories(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Could not load categories:", error);
        setStatus("Could not load categories.");
      }
    };

    loadCategories();
  }, []);

  // free the preview URL when it changes or the page closes
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(categoryId)),
    [categories, categoryId]
  );

  const selectedIndex = categories.findIndex(
    (c) => String(c.id) === String(categoryId)
  );

  const starColor = selectedCategory
    ? colorFor(selectedCategory.id, selectedIndex)
    : "#f5ecd9";

  const authorName =
    AUTHORS.find((a) => a.id === String(createdBy))?.name || "Someone";

  const words = countWords(content);
  const nearLimit = content.length > MAX_LENGTH * 0.9;

  // ---- image handling ----
  const acceptFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus("Please choose a valid image file.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setStatus("Image must be smaller than 10 MB.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStatus("");
  };

  const handleImageChange = (event) => acceptFile(event.target.files?.[0]);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleSealed = () => {
    setSealed((on) => {
      if (on) setUnlockAt("");
      return !on;
    });
  };

  const resetForm = () => {
    setContent("");
    setCategoryId("");
    setUnlockAt("");
    setSealed(false);
    clearImage();
  };

  // ---- the star flies into the jar ----
  const launchStar = (color) => {
    const button = (writingRef.current || submitRef.current)?.getBoundingClientRect();
    const jar = jarRef.current?.getBoundingClientRect();
    const jarVisible = jar && jar.width > 0 && jar.bottom > 0 && jar.top < window.innerHeight;

    if (!button || !jarVisible) {
      landStar();
      return;
    }

    setFlight({
      color,
      from: { x: button.left + button.width / 2, y: button.top + button.height / 2 },
      to: { x: jar.left + jar.width / 2, y: jar.top + jar.height * 0.3 },
    });
  };

  const landStar = () => {
    setFlight(null);
    setStarCount((n) => n + 1);
    jarControls.start({
      rotate: [0, -6, 5, -3, 0],
      y: [0, 4, 0],
      transition: { duration: 0.6, ease: "easeInOut" },
    });
    setTimeout(() => setLastSaved((saved) => saved && { ...saved, shown: true }), 250);
  };

  // ---- submit (same API call as before) ----
  const handleSubmit = async (event) => {
    event?.preventDefault();

    if (saving) return;

    if (!content.trim() || !categoryId) {
      setStatus("Please write something and choose a corner of the jar.");
      return;
    }

    if (sealed && !unlockAt) {
      setStatus("Pick a date to seal it until, or switch sealing off.");
      return;
    }

    const noteData = {
      content: content.trim(),
      categoryId: Number(categoryId),
      createdBy: Number(createdBy),
      unlockAt: unlockAt || null,
    };

    try {
      setSaving(true);
      setStatus("");

      await createNote(noteData, imageFile);

      setLastSaved({
        author: authorName,
        category: selectedCategory?.name,
        unlock: formatUnlock(unlockAt),
        shown: false,
      });

      const color = starColor;
      resetForm();
      setLaunching(true);

      // bring the jar into view, then fold the letter into a star and send it
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        setLaunching(false);
        launchStar(color);
      }, 450);
    } catch (error) {
      console.error("Could not create note:", error);
      setStatus("Something went wrong while saving your note. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleTextareaKey = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      handleSubmit(event);
    }
  };

  const showDone = Boolean(lastSaved?.shown);

  return (
    <main className="add-note-page an-page">
      <header className="an-top">
        <button className="back-button" onClick={() => navigate("/jar")}>
          ← back to the jar
        </button>
      </header>

      <div className="an-layout">
        {/* ---------------- the letter ---------------- */}
        <motion.section
          className="an-card"
          initial={{ opacity: 0, y: 30, rotateX: -12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ type: "spring", stiffness: 110, damping: 16 }}
        >
          <AnimatePresence mode="wait">
            {showDone ? (
              <motion.div
                key="done"
                className="an-done"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
              >
                <motion.svg
                  className="an-done-star"
                  viewBox="-16 -16 32 32"
                  animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
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

                <p className="eyebrow">folded and dropped</p>
                <h1>It's in the jar.</h1>

                <p className="an-done-text">
                  {lastSaved.author} left a little thing
                  {lastSaved.category ? ` in "${lastSaved.category}"` : ""}.
                  {lastSaved.unlock
                    ? ` It stays sealed until ${lastSaved.unlock}.`
                    : " It's ready to be found whenever someone shakes the jar."}
                </p>

                <div className="an-done-actions">
                  <button
                    className="save-note-button"
                    onClick={() => setLastSaved(null)}
                  >
                    Fold another
                  </button>
                  <button className="add-note-link" onClick={() => navigate("/jar")}>
                    Go see the jar
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.92, rotate: -3, transition: { duration: 0.3 } }}
                noValidate
              >
                <div className="an-head">
                  <p className="eyebrow">a new little thing</p>
                  <h1>Fold something small</h1>
                  <p className="an-intro">
                    A memory, a joke, a secret wish, or a reason to smile. Write
                    it on the paper, fold it up and drop it in.
                  </p>
                </div>

                {/* message */}
                <div className="an-field">
                  <label htmlFor="note-content" className="an-label">
                    Your little message
                  </label>

                  <textarea
                    ref={writingRef}
                    id="note-content"
                    className="an-writing"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    onKeyDown={handleTextareaKey}
                    placeholder="Write something from your heart…"
                    rows={6}
                    maxLength={MAX_LENGTH}
                  />

                  <div className="an-writing-foot">
                    <span className="an-shortcut">Ctrl / ⌘ + Enter drops it in</span>
                    <span className={nearLimit ? "is-near" : ""}>
                      {content.length} / {MAX_LENGTH}
                    </span>
                  </div>
                </div>

                {/* category */}
                <fieldset className="an-field">
                  <legend className="an-label">Choose a corner of the jar</legend>

                  {categories.length === 0 ? (
                    <p className="an-muted">Finding the corners…</p>
                  ) : (
                    <div className="an-chips">
                      {categories.map((category, index) => {
                        const on = String(categoryId) === String(category.id);
                        return (
                          <label
                            key={category.id}
                            className={`an-chip${on ? " is-on" : ""}`}
                            style={{ "--chip": colorFor(category.id, index) }}
                          >
                            <input
                              type="radio"
                              name="note-category"
                              value={category.id}
                              checked={on}
                              onChange={(event) => setCategoryId(event.target.value)}
                            />
                            <svg viewBox="-16 -16 32 32" aria-hidden="true">
                              <path
                                d={STAR_PATH}
                                strokeWidth="4"
                                strokeLinejoin="round"
                              />
                            </svg>
                            {category.name}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </fieldset>

                {/* author */}
                <fieldset className="an-field">
                  <legend className="an-label">Who is leaving this note?</legend>

                  <div className="an-authors">
                    {AUTHORS.map((author) => {
                      const on = String(createdBy) === author.id;
                      return (
                        <label
                          key={author.id}
                          className={`an-author${on ? " is-on" : ""}`}
                        >
                          <input
                            type="radio"
                            name="note-author"
                            value={author.id}
                            checked={on}
                            onChange={(event) => setCreatedBy(event.target.value)}
                          />
                          <span className="an-author-initial">{author.name[0]}</span>
                          <span className="an-author-name">{author.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {/* seal until later */}
                <div className="an-field">
                  <label className="an-toggle">
                    <input type="checkbox" checked={sealed} onChange={toggleSealed} />
                    <span className="an-toggle-track">
                      <span className="an-toggle-thumb" />
                    </span>
                    <span className="an-toggle-text">
                      <b>Seal it until later</b>
                      <small>It stays folded until the moment you pick.</small>
                    </span>
                  </label>

                  <AnimatePresence initial={false}>
                    {sealed && (
                      <motion.div
                        className="an-unlock"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <label htmlFor="unlock-time" className="an-sr-only">
                          Unlock date and time
                        </label>
                        <input
                          id="unlock-time"
                          type="datetime-local"
                          value={unlockAt}
                          min={nowForInput()}
                          onChange={(event) => setUnlockAt(event.target.value)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* picture */}
                <div className="an-field">
                  <span className="an-label">
                    Tuck in a picture <em>(optional)</em>
                  </span>

                  {imagePreview ? (
                    <motion.div
                      className="an-polaroid"
                      initial={{ opacity: 0, rotate: -8, y: 10 }}
                      animate={{ opacity: 1, rotate: -2, y: 0 }}
                    >
                      <img src={imagePreview} alt="Selected memory preview" />
                      <button type="button" className="an-remove" onClick={clearImage}>
                        take it out
                      </button>
                    </motion.div>
                  ) : (
                    <label
                      htmlFor="note-image"
                      className={`an-drop${dragging ? " is-over" : ""}`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop}
                    >
                      <span className="an-drop-icon" aria-hidden="true">
                        +
                      </span>
                      <span>
                        Drop a photo here or <u>choose one</u>
                      </span>
                      <small>images up to 10 MB</small>
                    </label>
                  )}

                  <input
                    ref={fileInputRef}
                    id="note-image"
                    className="an-sr-only"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </div>

                <button
                  ref={submitRef}
                  className="save-note-button an-submit"
                  type="submit"
                  disabled={saving || launching || Boolean(flight)}
                >
                  {saving ? "Folding it up…" : "Fold it & drop it in"}
                </button>

                <AnimatePresence>
                  {status && (
                    <motion.p
                      className="form-status"
                      role="status"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {status}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ---------------- the jar + the slip ---------------- */}
        <aside className="an-aside">
          <motion.div ref={jarRef} className="an-jar" animate={jarControls}>
            <MiniJar
              starCount={starCount}
              ghostColor={starColor}
              showGhost={Boolean(content.trim()) && !flight && !launching && !showDone}
            />
          </motion.div>
          <div className="lj-shelf" aria-hidden="true" />

          {!showDone && (
          <div className="an-slip">
            <p className="an-slip-title">on this slip</p>
            <dl>
              <div>
                <dt>from</dt>
                <dd>{authorName}</dd>
              </div>
              <div>
                <dt>corner</dt>
                <dd>{selectedCategory?.name || "not chosen yet"}</dd>
              </div>
              <div>
                <dt>opens</dt>
                <dd>{sealed && unlockAt ? formatUnlock(unlockAt) : "right away"}</dd>
              </div>
              <div>
                <dt>picture</dt>
                <dd>{imageFile ? "tucked in" : "none"}</dd>
              </div>
              <div>
                <dt>words</dt>
                <dd>{words}</dd>
              </div>
            </dl>
          </div>
          )}
        </aside>
      </div>

      {flight && <FlyingStar flight={flight} onDone={landStar} />}
    </main>
  );
}

export default AddNote;