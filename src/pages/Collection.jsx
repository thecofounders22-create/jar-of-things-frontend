import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getCollectedNotes } from "../services/api";

// Same rule the jar uses: past this, the note gets clamped to a preview.
const LONG_NOTE_LENGTH = 220;

function Collection() {
    const navigate = useNavigate();

    const [treasuredNotes, setTreasuredNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // The note currently opened in the full "letter" view, or null.
    const [openNote, setOpenNote] = useState(null);

    const userId = 1;

    useEffect(() => {
        const loadTreasuredNotes = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await getCollectedNotes(userId);

                setTreasuredNotes(
                    Array.isArray(response.data) ? response.data : []
                );
            } catch (err) {
                console.error("Could not load treasured notes:", err);
                setError("Your treasures didn't load. Try again.");
            } finally {
                setLoading(false);
            }
        };

        loadTreasuredNotes();
    }, []);

    // Escape folds the open note back up.
    useEffect(() => {
        if (!openNote) return;

        const onKey = (event) => {
            if (event.key === "Escape") setOpenNote(null);
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [openNote]);

    const filteredNotes = treasuredNotes.filter((collection) => {
        const note = collection.note || collection;
        const content = note.content || "";
        const categoryName = note.category?.name || note.categoryName || "";

        return `${content} ${categoryName}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
    });

    return (
        <main className="collection-page">
            <div className="stars stars-one"></div>
            <div className="stars stars-two"></div>

            <header className="collection-header">
                <button className="back-button" onClick={() => navigate("/jar")}>
                    ← Back to the jar
                </button>

                <p className="room-label">Your little universe</p>

                <div className="room-counter">
                    ✦ {treasuredNotes.length} treasures
                </div>
            </header>

            <section className="collection-content">
                <motion.div
                    className="collection-heading"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <p className="eyebrow">Little things worth keeping</p>

                    <h1>Your Treasured Notes</h1>

                    <p>
                        A quiet corner for the words, memories, and feelings you
                        never want to lose.
                    </p>
                </motion.div>

                {!loading && !error && treasuredNotes.length > 0 && (
                    <div className="treasure-search">
                        <input
                            type="text"
                            placeholder="Search your treasured notes..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </div>
                )}

                {loading ? (
                    <p className="status-message">Gathering your treasures…</p>
                ) : error ? (
                    <p className="status-message error-message">{error}</p>
                ) : treasuredNotes.length === 0 ? (
                    <motion.div
                        className="empty-collection"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="empty-heart">♡</div>

                        <h2>Nothing treasured yet</h2>

                        <p>
                            Some beautiful little things are still waiting to be
                            discovered.
                        </p>

                        <button
                            className="reveal-button"
                            onClick={() => navigate("/jar")}
                        >
                            Discover a note
                        </button>
                    </motion.div>
                ) : filteredNotes.length === 0 ? (
                    <motion.div
                        className="empty-collection"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="empty-heart">⌕</div>

                        <h2>No matching treasures</h2>

                        <p>Try searching with a different word or feeling.</p>

                        <button
                            className="reveal-button"
                            onClick={() => setSearchTerm("")}
                        >
                            Show all treasures
                        </button>
                    </motion.div>
                ) : (
                    <div className="treasured-grid">
                        {filteredNotes.map((collection, index) => {
                            const note = collection.note || collection;

                            const noteDate = note.createdAt || collection.createdAt;

                            const categoryName =
                                note.category?.name || note.categoryName;

                            const isLongNote =
                                (note.content || "").length > LONG_NOTE_LENGTH;

                            // Everything the letter view needs, in one object.
                            const fullNote = {
                                ...note,
                                categoryName,
                                noteDate,
                            };

                            return (
                                <motion.article
                                    className={`treasured-card${
                                        isLongNote ? " treasured-card-clickable" : ""
                                    }`}
                                    key={collection.id || note.id || index}
                                    initial={{ opacity: 0, y: 25 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.45,
                                        delay: Math.min(index, 8) * 0.08,
                                    }}
                                    onClick={() => isLongNote && setOpenNote(fullNote)}
                                >
                                    <div className="treasured-card-top">
                                        <span>✦ A treasured little thing</span>
                                        <span>💛</span>
                                    </div>

                                    <div className="treasured-body">
                                        <div className="treasured-content-wrap">
                                            <p
                                                className={`treasured-content${
                                                    isLongNote
                                                        ? " treasured-content-clamped"
                                                        : ""
                                                }`}
                                            >
                                                {note.content}
                                            </p>

                                            {isLongNote && (
                                                <div className="treasured-fade"></div>
                                            )}
                                        </div>

                                        {isLongNote && (
                                            <button
                                                className="treasured-expand-hint"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setOpenNote(fullNote);
                                                }}
                                            >
                                                Read the rest
                                            </button>
                                        )}

                                        {note.imageUrl && (
                                            <img
                                                className="treasured-thumb"
                                                src={note.imageUrl}
                                                alt="Memory attached to this note"
                                            />
                                        )}

                                        {categoryName && (
                                            <span className="note-category">
                                                {categoryName}
                                            </span>
                                        )}
                                    </div>

                                    <div className="treasured-card-bottom">
                                        <span>Kept with love ♡</span>

                                        {noteDate && (
                                            <span>
                                                {new Date(noteDate).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </motion.article>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ---------- full note, on paper ---------- */}
            <AnimatePresence>
                {openNote && (
                    <motion.div
                        className="note-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={() => setOpenNote(null)}
                    >
                        <motion.article
                            className="note-modal-card"
                            initial={{ opacity: 0, y: 40, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 170, damping: 20 }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <button
                                className="note-modal-close"
                                onClick={() => setOpenNote(null)}
                                aria-label="Fold the note back up"
                            >
                                ✕
                            </button>

                            <div className="note-card-inner">
                                <p className="note-content note-content-full">
                                    {openNote.content}
                                </p>

                                {openNote.imageUrl && (
                                    <img
                                        className="note-memory-image"
                                        src={openNote.imageUrl}
                                        alt="Memory attached to this note"
                                    />
                                )}

                                <div className="note-card-bottom">
                                    {openNote.categoryName && (
                                        <span className="note-category">
                                            {openNote.categoryName}
                                        </span>
                                    )}

                                    <span className="note-footer">
                                        {openNote.noteDate
                                            ? `kept ${new Date(
                                                  openNote.noteDate
                                              ).toLocaleDateString()}`
                                            : "kept with love"}
                                    </span>
                                </div>
                            </div>
                        </motion.article>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}

export default Collection;