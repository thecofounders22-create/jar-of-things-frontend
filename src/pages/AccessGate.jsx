import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./AccessGate.css";

const SECRET_KEY = import.meta.env.VITE_JAR_ACCESS_KEY;

const FRIEND_NAME = "Bestie";
const FRIEND_INITIAL = "B";

const INTRO = [
    "you found the little archive.",
    "I kept the important things here.",
    "the embarrassing things too.",
    "prove you're my person first.",
];

const WRONG = [
    "girl, that is not it.",
    "you definitely know this.",
    "try again, bestie.",
];

const RIGHT = [
    "obviously it was you.",
    "come in, idiot.",
    "I saved you a little space.",
];

const MEMORIES = [
    {
        id: "01",
        year: "THE BEGINNING",
        title: "First poha",
        location: "DEVJHIRI",
        detail: "Some memories start quietly.",
        color: "rose",
        symbol: "✳",
    },
    {
        id: "02",
        year: "SIDE QUEST",
        title: "64 kilometres",
        location: "ONE SCOOTY",
        detail: "No plan. Too much talking.",
        color: "olive",
        symbol: "↗",
    },
    {
        id: "03",
        year: "REEL ARCHIVE",
        title: "Anjana · Anjani",
        location: "FIRST REEL",
        detail: "We were already ridiculous.",
        color: "purple",
        symbol: "♡",
    },
    {
        id: "04",
        year: "NO SLEEP CLUB",
        title: "05:47 AM",
        location: "KALYANPURA",
        detail: "Still talking, obviously.",
        color: "gold",
        symbol: "☼",
    },
];

let uid = 0;

export default function AccessGate({ onUnlock }) {
    const [activeMemory, setActiveMemory] = useState(0);
    const [log, setLog] = useState([]);
    const [typing, setTyping] = useState(false);
    const [key, setKey] = useState("");
    const [busy, setBusy] = useState(true);
    const [leaving, setLeaving] = useState(false);
    const [unlocked, setUnlocked] = useState(false);
    const [error, setError] = useState("");

    const endRef = useRef(null);
    const timers = useRef([]);

    const activeItem = MEMORIES[activeMemory];

    const later = (callback, delay) => {
        const timer = window.setTimeout(callback, delay);
        timers.current.push(timer);
        return timer;
    };

    const add = (from, text) => {
        setLog((current) => [
            ...current,
            {
                id: ++uid,
                from,
                text,
            },
        ]);
    };

    const say = (lines, done) => {
        let delay = 250;

        lines.forEach((line) => {
            later(() => setTyping(true), delay);
            delay += 620;

            later(() => {
                setTyping(false);
                add("friend", line);
            }, delay);

            delay += 260;
        });

        if (done) {
            later(done, delay);
        }
    };

    useEffect(() => {
        say(INTRO, () => setBusy(false));

        return () => {
            timers.current.forEach(window.clearTimeout);
        };
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
    }, [log, typing]);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (busy) return;

        if (!SECRET_KEY) {
            setError("Add VITE_JAR_ACCESS_KEY to your .env file.");
            return;
        }

        if (!key.trim()) return;

        const attempt = key.trim();

        setKey("");
        setError("");
        setBusy(true);

        add("me", "•".repeat(Math.min(attempt.length, 12)));

        if (attempt === SECRET_KEY) {
            say(RIGHT, () => {
                setUnlocked(true);

                later(() => {
                    setLeaving(true);
                }, 550);

                later(() => {
                    sessionStorage.setItem(
                        "jarAccessGranted",
                        "true"
                    );

                    onUnlock();
                }, 1800);
            });

            return;
        }

        say(WRONG, () => setBusy(false));
    };

    return (
        <main
            className={`scrapbook-page ${
                unlocked ? "is-unlocked" : ""
            }`}
        >
            <div className="paper-texture" />

            <header className="topbar">
                <div className="brand">
                    <span className="brand-symbol">✳</span>
                    <span>THE BESTIE ARCHIVE</span>
                </div>

                <div className="topbar-center">
                    private collection / for one person only
                </div>

                <div className="page-number">01—04</div>
            </header>

            <div className="scrapbook-layout">
                <aside className="memory-index">
                    <div className="index-heading">
                        <span>CONTENTS</span>
                        <span>♡</span>
                    </div>

                    <div className="index-list">
                        {MEMORIES.map((memory, index) => (
                            <button
                                key={memory.id}
                                type="button"
                                className={`index-item ${
                                    activeMemory === index
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() =>
                                    setActiveMemory(index)
                                }
                            >
                                <span className="index-number">
                                    {memory.id}
                                </span>

                                <span className="index-title">
                                    {memory.title}
                                </span>

                                <span className="index-arrow">
                                    ↗
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="index-note">
                        <span>filed under:</span>
                        <strong>us, obviously</strong>
                    </div>
                </aside>

                <section className="journal-spread">
                    <div className="spread-topline">
                        <span>JOURNAL ENTRY / 001</span>
                        <span>somewhere between then & now</span>
                    </div>

                    <div className="spread-content">
                        <div className="headline-block">
                            <p className="kicker">
                                a very serious collection
                                <br />
                                of unserious memories
                            </p>

                            <h1>
                                Things I kept
                                <em>because of us.</em>
                            </h1>

                            <p className="intro-copy">
                                Tiny places, long rides, bad jokes,
                                random photos, and all the moments
                                that became ours without asking.
                            </p>
                        </div>

                        <div className="collage">
                            <div className="photo-frame large-photo">
                                <div className="photo-inner">
                                    <span>OUR</span>
                                    <strong>LITTLE</strong>
                                    <strong>WORLD</strong>
                                    <i>✳</i>
                                </div>
                            </div>

                            <div className="photo-frame small-photo">
                                <div className="photo-inner">
                                    <span>05:47</span>
                                    <strong>AM</strong>
                                    <i>☼</i>
                                </div>
                            </div>

                            <div className="ticket">
                                <span>ADMIT ONE</span>
                                <strong>BESTIE</strong>
                                <small>valid forever</small>
                            </div>

                            <div className="torn-note">
                                <span>important:</span>
                                <strong>
                                    you make
                                    <br />
                                    ordinary days
                                    <br />
                                    feel special.
                                </strong>
                            </div>

                            <div className="thread thread-one" />
                            <div className="thread thread-two" />
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeItem.id}
                                className={`active-memory ${activeItem.color}`}
                                initial={{
                                    opacity: 0,
                                    y: 10,
                                }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                }}
                                exit={{
                                    opacity: 0,
                                    y: -10,
                                }}
                                transition={{
                                    duration: 0.3,
                                }}
                            >
                                <div className="active-memory-symbol">
                                    {activeItem.symbol}
                                </div>

                                <div>
                                    <span>{activeItem.year}</span>
                                    <h2>{activeItem.title}</h2>
                                    <p>
                                        {activeItem.detail} ·{" "}
                                        {activeItem.location}
                                    </p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="spread-footer">
                        <span>made of little things</span>
                        <span>turn the page →</span>
                    </div>
                </section>

                <motion.aside
                    className="secret-note"
                    initial={{
                        opacity: 0,
                        x: 25,
                        rotate: 3,
                    }}
                    animate={{
                        opacity: 1,
                        x: 0,
                        rotate: 3,
                    }}
                    transition={{
                        delay: 0.45,
                        duration: 0.75,
                    }}
                >
                    <div className="note-tape" />

                    <div className="note-header">
                        <span>PERSONAL NOTE</span>
                        <span>♡</span>
                    </div>

                    <div className="note-avatar">
                        {FRIEND_INITIAL}
                    </div>

                    <h2>
                        Hey,
                        <br />
                        {FRIEND_NAME}.
                    </h2>

                    <p className="note-copy">
                        I hid the rest of our little things in here.
                        But first, tell me the word only we would
                        remember.
                    </p>

                    <div className="chat-log" role="log">
                        <AnimatePresence initial={false}>
                            {log.map((message) => (
                                <motion.p
                                    key={message.id}
                                    className={`chat-bubble ${message.from}`}
                                    initial={{
                                        opacity: 0,
                                        y: 7,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                    }}
                                >
                                    {message.text}
                                </motion.p>
                            ))}

                            {typing && (
                                <motion.div
                                    className="chat-bubble friend typing"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <i />
                                    <i />
                                    <i />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div ref={endRef} />
                    </div>

                    {error && (
                        <p className="secret-error" role="alert">
                            {error}
                        </p>
                    )}

                    <form
                        className="secret-form"
                        onSubmit={handleSubmit}
                    >
                        <label htmlFor="secret-word">
                            <span>our secret word</span>

                            <input
                                id="secret-word"
                                type="password"
                                value={key}
                                onChange={(event) =>
                                    setKey(event.target.value)
                                }
                                placeholder={
                                    busy
                                        ? "wait..."
                                        : "you know this"
                                }
                                autoComplete="off"
                                disabled={busy}
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={busy || !key.trim()}
                        >
                            open archive
                            <span>↗</span>
                        </button>
                    </form>

                    <div className="note-footer">
                        <span>NO STRANGERS</span>
                        <span>FILED WITH LOVE</span>
                    </div>
                </motion.aside>
            </div>

            <footer className="bottom-line">
                <span>the places are real. the memories are ours.</span>
                <span>∞</span>
                <span>for my favourite person</span>
            </footer>

            <motion.div
                className="page-transition"
                aria-hidden="true"
                initial={{
                    clipPath: "circle(0% at 50% 50%)",
                }}
                animate={{
                    clipPath: leaving
                        ? "circle(150% at 50% 50%)"
                        : "circle(0% at 50% 50%)",
                }}
                transition={{
                    duration: 1.15,
                    ease: [0.76, 0, 0.24, 1],
                }}
            />
        </main>
    );
}