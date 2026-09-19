import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getCollectedNotes } from "../services/api";

function Collection() {
    const navigate = useNavigate();

    const [treasuredNotes, setTreasuredNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const userId = 1;

    useEffect(() => {
        const loadTreasuredNotes = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await getCollectedNotes(userId);

                console.log("Treasured notes:", response.data);

                setTreasuredNotes(
                    Array.isArray(response.data) ? response.data : []
                );
            } catch (err) {
                console.error("Could not load treasured notes:", err);
                setError("Your treasures are hiding. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadTreasuredNotes();
    }, []);

    const filteredNotes = treasuredNotes.filter((collection) => {
        const note = collection.note || collection;

        const content = note.content || "";

        const categoryName =
            note.category?.name ||
            note.categoryName ||
            "";

        const searchableText =
            `${content} ${categoryName}`.toLowerCase();

        return searchableText.includes(searchTerm.toLowerCase());
    });

    return (
        <main className="collection-page">
            <div className="stars stars-one"></div>
            <div className="stars stars-two"></div>

            <header className="collection-header">
                <button
                    className="back-button"
                    onClick={() => navigate("/jar")}
                >
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
                    <p className="eyebrow">
                        Little things worth keeping
                    </p>

                    <h1>Your Treasured Notes</h1>

                    <p>
                        A quiet corner for the words, memories, and feelings
                        you never want to lose.
                    </p>
                </motion.div>

                {!loading &&
                    !error &&
                    treasuredNotes.length > 0 && (
                        <div className="treasure-search">
                            <input
                                type="text"
                                placeholder="Search your treasured notes..."
                                value={searchTerm}
                                onChange={(event) =>
                                    setSearchTerm(event.target.value)
                                }
                            />
                        </div>
                    )}

                {loading ? (
                    <p className="status-message">
                        Gathering your treasures...
                    </p>
                ) : error ? (
                    <p className="status-message error-message">
                        {error}
                    </p>
                ) : treasuredNotes.length === 0 ? (
                    <motion.div
                        className="empty-collection"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="empty-heart">♡</div>

                        <h2>Nothing treasured yet</h2>

                        <p>
                            Some beautiful little things are still waiting
                            to be discovered.
                        </p>

                        <button
                            className="reveal-button"
                            onClick={() => navigate("/jar")}
                        >
                            Discover a note ✨
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

                        <p>
                            Try searching with a different word or feeling.
                        </p>

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

                            const noteDate =
                                note.createdAt || collection.createdAt;

                            const categoryName =
                                note.category?.name ||
                                note.categoryName;

                            return (
                                <motion.article
                                    className="treasured-card"
                                    key={
                                        collection.id ||
                                        note.id ||
                                        index
                                    }
                                    initial={{
                                        opacity: 0,
                                        y: 25,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                    }}
                                    transition={{
                                        duration: 0.45,
                                        delay: index * 0.1,
                                    }}
                                >
                                    <div className="treasured-card-top">
                                        <span>
                                            ✦ A treasured little thing
                                        </span>

                                        <span>💛</span>
                                    </div>

                                    <p className="treasured-content">
                                        {note.content}
                                    </p>

                                    {/* Attached memory image */}
                                    {note.imageUrl && (
                                        <img
                                            className="note-memory-image"
                                            src={note.imageUrl}
                                            alt="Memory attached to this note"
                                        />
                                    )}

                                    {categoryName && (
                                        <span className="note-category">
                                            {categoryName}
                                        </span>
                                    )}

                                    <div className="treasured-card-bottom">
                                        <span>
                                            Kept with love ♡
                                        </span>

                                        {noteDate && (
                                            <span>
                                                {new Date(
                                                    noteDate
                                                ).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </motion.article>
                            );
                        })}
                    </div>
                )}
            </section>
        </main>
    );
}

export default Collection;