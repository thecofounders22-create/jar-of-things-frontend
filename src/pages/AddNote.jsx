import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { createNote, getCategories } from "../services/api";
import { COLORS } from "../components/Jar";
import "./AddNote.css";

/* ADD NOTE — "the writing desk", scrapbook edition.
   Same fields, same API call. Write on lined paper, pick a corner of the
   jar, choose who it's from, optionally seal it or tuck in a photo. On save
   the note folds into a star that flies into the jar. */

const AUTHORS = [
  { id: "1", name: "Aaradhy" },
  { id: "2", name: "Preeti" },
];

const MAX_LENGTH = 5000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const JAR_PATH =
    "M100 70 L200 70 L200 95 C200 112 260 116 260 162 L260 330 C260 355 240 366 214 366 L86 366 C60 366 40 355 40 330 L40 162 C40 116 100 112 100 95 Z";

const STAR_PATH = (() => {
  const p = [];
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? 12 : 6.2;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    p.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${p.join("L")}Z`;
})();

const PILE = [
  [78, 340, -20], [108, 344, 15], [138, 338, -8], [168, 343, 24], [198, 339, -14],
  [226, 342, 10], [92, 316, 30], [122, 318, -25], [152, 314, 12], [182, 318, -30],
  [212, 315, 18], [106, 292, -12], [136, 290, 22], [166, 294, -18], [196, 290, 8],
  [120, 268, 16], [150, 266, -22], [180, 270, 28],
];

const colorFor = (id, index = 0) => {
  const key = Number(id);
  const seed = Number.isFinite(key) && key > 0 ? key : index;
  return COLORS[seed % COLORS.length];
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
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
};

const countWords = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);

function MiniJar({ starCount, ghostColor, showGhost }) {
  const stars = PILE.slice(0, Math.min(starCount, PILE.length));

  return (
      <svg className="sb-jar-svg" viewBox="0 0 300 390" role="img" aria-label="The jar">
        <defs>
          <linearGradient id="an-glass" x1="0" x2="1">
            <stop offset="0" stopColor="#eadbc7" stopOpacity=".14" />
            <stop offset=".5" stopColor="#eadbc7" stopOpacity=".02" />
            <stop offset="1" stopColor="#eadbc7" stopOpacity=".1" />
          </linearGradient>
          <radialGradient id="an-glow" cx=".5" cy=".8" r=".65">
            <stop offset="0" stopColor="#8e3f4b" stopOpacity=".5" />
            <stop offset="1" stopColor="#8e3f4b" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="150" cy="372" rx="118" ry="9" fill="rgba(0,0,0,.4)" />
        <path d={JAR_PATH} fill="url(#an-glow)" />

        {stars.map(([x, y, r], i) => (
            <motion.g key={i} transform={`translate(${x} ${y})`} initial={i >= 9 ? { opacity: 0 } : false} animate={{ opacity: 1 }}>
              <g transform={`rotate(${r})`}>
                <path d={STAR_PATH} fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} strokeWidth="5" strokeLinejoin="round" />
              </g>
            </motion.g>
        ))}

        <path d={JAR_PATH} fill="url(#an-glass)" stroke="rgba(234,219,199,.5)" strokeWidth="2" />
        <path d="M62 172 C57 222 57 292 66 336" stroke="#eadbc7" strokeOpacity=".3" strokeWidth="6" strokeLinecap="round" fill="none" />

        <g transform="translate(218 44) rotate(24)">
          <rect width="92" height="26" rx="4" fill="#b79768" />
          <rect x="-4" y="21" width="100" height="7" rx="3" fill="#5d4b32" />
        </g>

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
                  <path d={STAR_PATH} fill={ghostColor} stroke={ghostColor} strokeWidth="5" strokeLinejoin="round" transform="scale(1.5)" />
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
        <path d={STAR_PATH} fill={color} stroke={color} strokeWidth="4" strokeLinejoin="round" />
      </motion.svg>
  );
}

function AddNote() {
  const navigate = useNavigate();

  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [createdBy, setCreatedBy] = useState("1");
  const [unlockAt, setUnlockAt] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

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
    (async () => {
      try {
        const response = await getCategories();
        setCategories(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Could not load categories:", error);
        setStatus("Could not load categories.");
      }
    })();
  }, []);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const selectedCategory = useMemo(
      () => categories.find((c) => String(c.id) === String(categoryId)),
      [categories, categoryId]
  );
  const selectedIndex = categories.findIndex((c) => String(c.id) === String(categoryId));
  const starColor = selectedCategory ? colorFor(selectedCategory.id, selectedIndex) : "#eadbc7";
  const authorName = AUTHORS.find((a) => a.id === String(createdBy))?.name || "Someone";
  const words = countWords(content);
  const nearLimit = content.length > MAX_LENGTH * 0.9;

  const acceptFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setStatus("Please choose a valid image file.");
    if (file.size > MAX_IMAGE_BYTES) return setStatus("Image must be smaller than 10 MB.");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStatus("");
  };

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

  const toggleSealed = () =>
      setSealed((on) => {
        if (on) setUnlockAt("");
        return !on;
      });

  const resetForm = () => {
    setContent("");
    setCategoryId("");
    setUnlockAt("");
    setSealed(false);
    clearImage();
  };

  const landStar = () => {
    setFlight(null);
    setStarCount((n) => n + 1);
    jarControls.start({
      rotate: [0, -6, 5, -3, 0],
      y: [0, 4, 0],
      transition: { duration: 0.6, ease: "easeInOut" },
    });
    setTimeout(() => setLastSaved((s) => s && { ...s, shown: true }), 250);
  };

  const launchStar = (color) => {
    const button = (writingRef.current || submitRef.current)?.getBoundingClientRect();
    const jar = jarRef.current?.getBoundingClientRect();
    const visible = jar && jar.width > 0 && jar.bottom > 0 && jar.top < window.innerHeight;

    if (!button || !visible) return landStar();

    setFlight({
      color,
      from: { x: button.left + button.width / 2, y: button.top + button.height / 2 },
      to: { x: jar.left + jar.width / 2, y: jar.top + jar.height * 0.3 },
    });
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();
    if (saving) return;

    if (!content.trim() || !categoryId) {
      setStatus("write something and choose a corner of the jar first.");
      return;
    }
    if (sealed && !unlockAt) {
      setStatus("pick a date to seal it until, or switch sealing off.");
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
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        setLaunching(false);
        launchStar(color);
      }, 450);
    } catch (error) {
      console.error("Could not create note:", error);
      setStatus("something went wrong while saving your note. try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleTextareaKey = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") handleSubmit(event);
  };

  const showDone = Boolean(lastSaved?.shown);

  return (
      <main className="sb-page an-page">
        <div className="sb-paper" />

        <header className="sb-topbar">
          <div className="sb-brand">
            <span className="sb-brand-symbol">✳</span>
            <span>THE WRITING DESK</span>
          </div>
          <div className="sb-topbar-center">a new little thing / for the jar</div>
          <button className="an-back" onClick={() => navigate("/jar")}>← back to the wall</button>
        </header>

        <div className="an-layout">
          {/* ---------- the journal page ---------- */}
          <motion.section
              className="an-spread"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 110, damping: 16 }}
          >
            <div className="an-spread-top">
              <span>JOURNAL ENTRY / NEW</span>
              <span>somewhere between then &amp; now</span>
            </div>

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
                      <path d={STAR_PATH} fill="#b79768" stroke="#b79768" strokeWidth="4" strokeLinejoin="round" />
                    </motion.svg>

                    <p className="sb-kicker">folded and dropped</p>
                    <h1 className="sb-title an-title">It's in<em>the jar.</em></h1>

                    <p className="an-done-text">
                      {lastSaved.author} left a little thing
                      {lastSaved.category ? ` in "${lastSaved.category}"` : ""}.
                      {lastSaved.unlock
                          ? ` It stays sealed until ${lastSaved.unlock}.`
                          : " It's ready to be found whenever someone shakes the jar."}
                    </p>

                    <div className="an-done-actions">
                      <button className="sb-btn" onClick={() => setLastSaved(null)}>fold another<span>+</span></button>
                      <button className="sb-btn sb-btn-ghost" onClick={() => navigate("/jar")}>go see the wall<span>↗</span></button>
                    </div>
                  </motion.div>
              ) : (
                  <motion.form
                      key="form"
                      className="an-form"
                      onSubmit={handleSubmit}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.92, rotate: -3, transition: { duration: 0.3 } }}
                      noValidate
                  >
                    <div className="an-head">
                      <p className="sb-kicker">a very serious collection<br />of unserious notes</p>
                      <h1 className="sb-title an-title">Fold something<em>small.</em></h1>
                      <p className="an-intro">
                        A memory, a joke, a secret wish, or a reason to smile. Write it on the paper,
                        fold it up and drop it in.
                      </p>
                    </div>

                    {/* message */}
                    <div className="an-field">
                      <label htmlFor="note-content" className="an-label">01 · your little message</label>
                      <div className="an-sheet">
                        <div className="an-tape" />
                        <textarea
                            ref={writingRef}
                            id="note-content"
                            className="an-writing"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onKeyDown={handleTextareaKey}
                            placeholder="write something from your heart…"
                            rows={6}
                            maxLength={MAX_LENGTH}
                        />
                        <div className="an-writing-foot">
                          <span>ctrl / ⌘ + enter drops it in</span>
                          <span className={nearLimit ? "is-near" : ""}>{content.length} / {MAX_LENGTH}</span>
                        </div>
                      </div>
                    </div>

                    {/* category */}
                    <fieldset className="an-field">
                      <legend className="an-label">02 · choose a corner of the jar</legend>
                      {categories.length === 0 ? (
                          <p className="an-muted">finding the corners…</p>
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
                                        onChange={(e) => setCategoryId(e.target.value)}
                                    />
                                    <svg viewBox="-16 -16 32 32" aria-hidden="true">
                                      <path d={STAR_PATH} strokeWidth="4" strokeLinejoin="round" />
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
                      <legend className="an-label">03 · who is leaving this note?</legend>
                      <div className="an-authors">
                        {AUTHORS.map((author) => {
                          const on = String(createdBy) === author.id;
                          return (
                              <label key={author.id} className={`an-author${on ? " is-on" : ""}`}>
                                <input
                                    type="radio"
                                    name="note-author"
                                    value={author.id}
                                    checked={on}
                                    onChange={(e) => setCreatedBy(e.target.value)}
                                />
                                <span className="an-author-initial">{author.name[0]}</span>
                                <span className="an-author-name">{author.name}</span>
                              </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    {/* seal */}
                    <div className="an-field">
                      <label className="an-toggle">
                        <input type="checkbox" checked={sealed} onChange={toggleSealed} />
                        <span className="an-toggle-track"><span className="an-toggle-thumb" /></span>
                        <span className="an-toggle-text">
                      <b>04 · seal it until later</b>
                      <small>it stays folded until the moment you pick.</small>
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
                              <label htmlFor="unlock-time" className="an-sr-only">Unlock date and time</label>
                              <input
                                  id="unlock-time"
                                  type="datetime-local"
                                  value={unlockAt}
                                  min={nowForInput()}
                                  onChange={(e) => setUnlockAt(e.target.value)}
                              />
                            </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* picture */}
                    <div className="an-field">
                      <span className="an-label">05 · tuck in a picture <em>(optional)</em></span>

                      {imagePreview ? (
                          <motion.div
                              className="an-polaroid"
                              initial={{ opacity: 0, rotate: -8, y: 10 }}
                              animate={{ opacity: 1, rotate: -2, y: 0 }}
                          >
                            <img src={imagePreview} alt="Selected memory preview" />
                            <button type="button" className="an-remove" onClick={clearImage}>take it out</button>
                          </motion.div>
                      ) : (
                          <label
                              htmlFor="note-image"
                              className={`an-drop${dragging ? " is-over" : ""}`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragging(true);
                              }}
                              onDragLeave={() => setDragging(false)}
                              onDrop={handleDrop}
                          >
                            <span className="an-drop-icon" aria-hidden="true">+</span>
                            <span>drop a photo here or <u>choose one</u></span>
                            <small>images up to 10 MB</small>
                          </label>
                      )}

                      <input
                          ref={fileInputRef}
                          id="note-image"
                          className="an-sr-only"
                          type="file"
                          accept="image/*"
                          onChange={(e) => acceptFile(e.target.files?.[0])}
                      />
                    </div>

                    <button
                        ref={submitRef}
                        className="sb-btn an-submit"
                        type="submit"
                        disabled={saving || launching || Boolean(flight)}
                    >
                      {saving ? "folding it up…" : "fold it & drop it in"}
                      <span>↗</span>
                    </button>

                    <AnimatePresence>
                      {status && (
                          <motion.p
                              className="an-status"
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

          {/* ---------- the jar + the slip ---------- */}
          <aside className="an-aside">
            <div className="an-frame">
              <motion.div ref={jarRef} className="an-jar" animate={jarControls}>
                <MiniJar
                    starCount={starCount}
                    ghostColor={starColor}
                    showGhost={Boolean(content.trim()) && !flight && !launching && !showDone}
                />
              </motion.div>
            </div>

            {!showDone && (
                <div className="an-slip">
                  <p className="an-slip-title">ADMIT ONE · on this slip</p>
                  <dl>
                    <div><dt>from</dt><dd>{authorName}</dd></div>
                    <div><dt>corner</dt><dd>{selectedCategory?.name || "not chosen yet"}</dd></div>
                    <div><dt>opens</dt><dd>{sealed && unlockAt ? formatUnlock(unlockAt) : "right away"}</dd></div>
                    <div><dt>picture</dt><dd>{imageFile ? "tucked in" : "none"}</dd></div>
                    <div><dt>words</dt><dd>{words}</dd></div>
                  </dl>
                </div>
            )}
          </aside>
        </div>

        <footer className="sb-bottom-line">
          <span>the places are real. the memories are ours.</span>
          <span>∞</span>
          <span>for my favourite person</span>
        </footer>

        {flight && <FlyingStar flight={flight} onDone={landStar} />}
      </main>
  );
}

export default AddNote;