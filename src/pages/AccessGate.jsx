import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./AccessGate.css";

const SECRET_KEY = import.meta.env.VITE_JAR_ACCESS_KEY;

function AccessGate({ onUnlock }) {
    const [key, setKey] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isWrong, setIsWrong] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!SECRET_KEY) {
            setError("The jar's secret hasn't been configured yet.");
            return;
        }

        if (!key.trim()) {
            setError("The jar is waiting for your secret...");
            return;
        }

        setLoading(true);
        setError("");
        setIsWrong(false);

        setTimeout(() => {
            if (key === SECRET_KEY) {
                sessionStorage.setItem("jarAccessGranted", "true");
                onUnlock();
            } else {
                setError("Hmm... that's not the key.");
                setIsWrong(true);
                setLoading(false);
            }
        }, 900);
    };

    return (
        <main className="access-gate">

            {/* Background atmosphere */}
            <div className="night-sky" />

            <div className="moon">
                <div className="moon-glow" />
            </div>

            {/* Floating stars */}
            <div className="stars">
                <span>✦</span>
                <span>·</span>
                <span>✧</span>
                <span>·</span>
                <span>✦</span>
                <span>·</span>
                <span>✧</span>
                <span>✦</span>
            </div>

            {/* Soft ambient glow */}
            <div className="ambient-glow ambient-one" />
            <div className="ambient-glow ambient-two" />

            <motion.section
                className="access-scene"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                    duration: 1.2,
                    ease: [0.22, 1, 0.36, 1],
                }}
            >

                {/* Tiny top label */}
                <motion.p
                    className="access-label"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    SOMEWHERE BETWEEN A MEMORY & A DREAM
                </motion.p>

                {/* Jar */}
                <motion.div
                    className={`jar-wrapper ${isWrong ? "jar-wrong" : ""}`}
                    animate={
                        isWrong
                            ? {
                                  x: [-5, 5, -4, 4, 0],
                              }
                            : {
                                  y: [0, -8, 0],
                              }
                    }
                    transition={
                        isWrong
                            ? {
                                  duration: 0.35,
                              }
                            : {
                                  duration: 4,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                              }
                    }
                >

                    {/* Glow behind jar */}
                    <div className="jar-aura" />

                    {/* Jar itself */}
                    <div className="memory-jar">

                        <div className="jar-lid">
                            <div className="lid-top" />
                        </div>

                        <div className="jar-glass">

                            <div className="jar-shine" />

                            {/* Little memories floating inside */}
                            <motion.span
                                className="memory-star star-one"
                                animate={{
                                    y: [0, -10, 0],
                                    rotate: [0, 15, 0],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                }}
                            >
                                ✦
                            </motion.span>

                            <motion.span
                                className="memory-star star-two"
                                animate={{
                                    y: [0, 8, 0],
                                    rotate: [0, -10, 0],
                                }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                }}
                            >
                                ✧
                            </motion.span>

                            <span className="memory-heart">♡</span>

                            <div className="paper-memory">
                                little
                                <br />
                                things
                            </div>

                        </div>
                    </div>
                </motion.div>

                {/* Main title */}
                <motion.div
                    className="access-heading"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                >
                    <p className="handwritten">Welcome to...</p>

                    <h1>
                        The Jar
                        <span>of Little Things</span>
                    </h1>

                    <p className="heading-description">
                        A tiny corner of the universe where
                        <br />
                        little moments are kept safe.
                    </p>
                </motion.div>

                {/* Secret key section */}
                <motion.form
                    className="secret-form"
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                >
                    <div className="secret-label">
                        <span className="line" />
                        <span>ONLY THE RIGHT PERSON KNOWS</span>
                        <span className="line" />
                    </div>

                    <div className={`key-box ${error ? "has-error" : ""}`}>

                        <span className="key-icon">
                            ✦
                        </span>

                        <input
                            id="secret-key"
                            type="password"
                            value={key}
                            onChange={(event) => {
                                setKey(event.target.value);
                                setError("");
                                setIsWrong(false);
                            }}
                            placeholder="enter the little secret..."
                            autoComplete="off"
                            disabled={loading}
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            aria-label="Unlock jar"
                        >
                            {loading ? (
                                <span className="unlock-loader">···</span>
                            ) : (
                                "→"
                            )}
                        </button>

                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.p
                                className="secret-error"
                                initial={{
                                    opacity: 0,
                                    y: -5,
                                }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                }}
                                exit={{
                                    opacity: 0,
                                }}
                            >
                                {error}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </motion.form>

                {/* Footer */}
                <motion.div
                    className="access-bottom"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                >
                    <span>made with</span>
                    <span className="tiny-heart">♡</span>
                    <span>for the little things that matter</span>
                </motion.div>

            </motion.section>

        </main>
    );
}

export default AccessGate;