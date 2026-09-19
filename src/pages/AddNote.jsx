import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { createNote, getCategories } from "../services/api";

function AddNote() {
    const navigate = useNavigate();

    const [content, setContent] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [createdBy, setCreatedBy] = useState(1);
    const [unlockAt, setUnlockAt] = useState("");
    const [categories, setCategories] = useState([]);
    const [status, setStatus] = useState("");
    const [saving, setSaving] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const response = await getCategories();
                setCategories(response.data);
            } catch (error) {
                console.error("Could not load categories:", error);
                setStatus("Could not load categories.");
            }
        };

        loadCategories();
    }, []);

    const handleImageChange = (event) => {
        const file = event.target.files[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            setStatus("Please choose a valid image file.");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setStatus("Image must be smaller than 10 MB.");
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setStatus("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!content.trim() || !categoryId) {
            setStatus("Please write something and choose a category.");
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

            setStatus("Your little thing has been placed in the jar. 💛");

            setContent("");
            setCategoryId("");
            setUnlockAt("");
            setImageFile(null);
            setImagePreview("");
        } catch (error) {
            console.error("Could not create note:", error);
            setStatus("Something went wrong while saving your note.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="add-note-page">
            <button className="back-button" onClick={() => navigate("/jar")}>
                ← Back to the jar
            </button>

            <motion.section
                className="add-note-card"
                initial={{ opacity: 0, y: 25, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 16 }}
            >
                <span className="washi-tape tape-brass"></span>
                <span className="note-pin"></span>
                <span className="note-quote-mark" aria-hidden="true">❝</span>

                <div className="add-note-card-inner">
                    <h1>Add a little thing 💌</h1>

                    <p className="form-intro">
                        A memory, a joke, a secret wish, or a reason to smile.
                        Fold it up and drop it in.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <label htmlFor="note-content">Your little message</label>

                        <textarea
                            id="note-content"
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            placeholder="Write something from your heart..."
                            rows="5"
                            maxLength="1000"
                        />

                        <p className="character-count">{content.length}/1000</p>

                        <label htmlFor="note-category">Choose a corner of the jar</label>

                        <select
                            id="note-category"
                            value={categoryId}
                            onChange={(event) => setCategoryId(event.target.value)}
                        >
                            <option value="">Choose a category</option>

                            {categories.map((category) => (
                                <option value={category.id} key={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>

                        <label htmlFor="note-author">Who is leaving this note?</label>

                        <select
                            id="note-author"
                            value={createdBy}
                            onChange={(event) => setCreatedBy(event.target.value)}
                        >
                            <option value="1">Jar Owner</option>
                            <option value="2">Best Friend</option>
                        </select>

                        <label htmlFor="unlock-time">
                            Unlock later <span>(optional)</span>
                        </label>

                        <input
                            id="unlock-time"
                            type="datetime-local"
                            value={unlockAt}
                            onChange={(event) => setUnlockAt(event.target.value)}
                        />

                        <label htmlFor="note-image">
                            Add a memory picture <span>(optional)</span>
                        </label>

                        <input
                            id="note-image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                        />

                        {imagePreview && (
                            <div className="image-preview">
                                <img
                                    src={imagePreview}
                                    alt="Selected memory preview"
                                />
                            </div>
                        )}

                        <button className="save-note-button" type="submit" disabled={saving}>
                            {saving ? "Placing it in the jar..." : "Place it in the jar ✨"}
                        </button>
                    </form>

                    {status && <p className="form-status">{status}</p>}
                </div>
            </motion.section>
        </main>
    );
}

export default AddNote;