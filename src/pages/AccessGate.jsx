import { useState } from "react";
import { motion } from "framer-motion";
import "./AccessGate.css";

const SECRET_KEY = import.meta.env.VITE_JAR_ACCESS_KEY;

function AccessGate({ onUnlock }) {
    const [key, setKey] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!SECRET_KEY) {
            setError("The jar's secret key has not been configured.");
            return;
        }

        if (!key.trim()) {
            setError("Please enter the secret key.");
            return;
        }

        setLoading(true);
        setError("");

        // Small delay for a more cinematic unlocking experience.
        setTimeout(() => {
            if (key === SECRET_KEY) {
                sessionStorage.setItem("jarAccessGranted", "true");
                onUnlock();
            } else {
                setError("That key does not open this jar.");
            }

            setLoading(false);
        }, 500);
    };

    return (
        <main className="access-gate">
            <div className="access-glow access-glow-one" />
            <div className="access-glow access-glow-two" />

            <motion.div
                className="access-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
            >
                <motion.div
                    className="access-jar"
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    🫙
                </motion.div>

               

                <p className="access-eyebrow">
                    A little place of memories
                </p>

                <h1>The Jar of Little Things</h1>

                <p className="access-description">
                    Some memories are meant to be shared only with the right person.
                </p>

                <form onSubmit={handleSubmit} className="access-form">
                    <label htmlFor="secret-key">Enter the secret key</label>

                    <input
                        id="secret-key"
                        type="password"
                        value={key}
                        onChange={(event) => setKey(event.target.value)}
                        placeholder="Your secret key..."
                        autoComplete="off"
                        disabled={loading}
                    />

                    {error && <p className="access-error">{error}</p>}

                    <button type="submit" disabled={loading}>
                        {loading ? "Opening the jar..." : "Unlock the Jar ✨"}
                    </button>
                </form>

                <p className="access-footer">
                    Made for the little things that matter.
                </p>
            </motion.div>
        </main>
    );
}

export default AccessGate;