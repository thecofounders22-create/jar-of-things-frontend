import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    motion,
    AnimatePresence,
    useMotionValue,
    useSpring,
    useTransform,
} from "framer-motion";

import AccessGate from "./pages/AccessGate";
import Collection from "./pages/Collection";
import AddNote from "./pages/AddNote";

import {
    getAllNotes,
    getCategories,
    collectNote,
    getCollectedNotes,
} from "./services/api";

import "./App.css";

/* =====================================================================
   THE JAR OF LITTLE THINGS
   Same visual language.
   Completely redesigned MEMORY STRUCTURE.
   ===================================================================== */

const USER_ID = 1;
const MAX_STARS = 42;

const PAPER_COLORS = [
    "#b87378",
    "#b79768",
    "#69705b",
    "#76677b",
    "#8e3f4b",
    "#eadbc7",
];

const JAR_PATH =
    "M100 70 L200 70 L200 95 C200 112 260 116 260 162 L260 330 C260 355 240 366 214 366 L86 366 C60 366 40 355 40 330 L40 162 C40 116 100 112 100 95 Z";

function mulberry32(seed) {
    let a = seed;

    return function random() {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;

        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function buildStarPath(outer = 12, inner = 6.2) {
    const points = [];

    for (let i = 0; i < 10; i += 1) {
        const radius = i % 2 === 0 ? outer : inner;
        const angle = (Math.PI / 5) * i - Math.PI / 2;

        points.push(
            `${(Math.cos(angle) * radius).toFixed(2)},${(
                Math.sin(angle) * radius
            ).toFixed(2)}`
        );
    }

    return `M${points.join("L")}Z`;
}

const STAR_PATH = buildStarPath();

function pileLayout(count, seed = 7) {
    const random = mulberry32(seed);
    const perRow = 6;

    return Array.from({ length: count }, (_, i) => {
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const offset = row % 2 ? 14 : 0;

        return {
            x: 72 + col * 29 + offset + (random() - 0.5) * 8,
            y: 338 - row * 25 + (random() - 0.5) * 6,
            rotate: (random() - 0.5) * 70,
            float: random(),
        };
    });
}

const paperFor = (note, index) => {
    const key = Number(note?.id);
    const seed = Number.isFinite(key) ? Math.abs(key) : index;

    return PAPER_COLORS[seed % PAPER_COLORS.length];
};

const pad = (n) => String(n).padStart(2, "0");

const formatDate = (value) => {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

const extractNoteId = (entry) => {
    if (entry?.note?.id !== undefined) return Number(entry.note.id);
    if (entry?.noteId !== undefined) return Number(entry.noteId);
    if (entry?.note?.noteId !== undefined) return Number(entry.note.noteId);

    return null;
};

/* =====================================================================
   HOOKS
   ===================================================================== */

function useJarData(userId) {
    const [notes, setNotes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [keptIds, setKeptIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const [notesResponse, categoryResponse] = await Promise.all([
                getAllNotes(),
                getCategories(),
            ]);

            setNotes(
                Array.isArray(notesResponse.data)
                    ? notesResponse.data
                    : []
            );

            setCategories(
                Array.isArray(categoryResponse.data)
                    ? categoryResponse.data
                    : []
            );

            try {
                const collectedResponse = await getCollectedNotes(userId);

                const collections = Array.isArray(collectedResponse.data)
                    ? collectedResponse.data
                    : [];

                setKeptIds(
                    collections
                        .map(extractNoteId)
                        .filter(
                            (id) =>
                                id !== null &&
                                !Number.isNaN(id)
                        )
                );
            } catch (collectionError) {
                console.error(
                    "Could not load collected notes:",
                    collectionError
                );

                setKeptIds([]);
            }
        } catch (err) {
            console.error("Could not load jar data:", err);

            setError(
                "The jar didn't open. Check your connection and try again."
            );
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        load();
    }, [load]);

    return {
        notes,
        categories,
        keptIds,
        setKeptIds,
        loading,
        error,
        reload: load,
    };
}

function useTilt(range = 5) {
    const pointerX = useMotionValue(0);
    const pointerY = useMotionValue(0);

    const springX = useSpring(pointerX, {
        stiffness: 150,
        damping: 20,
    });

    const springY = useSpring(pointerY, {
        stiffness: 150,
        damping: 20,
    });

    const rotateX = useTransform(
        springY,
        [-1, 1],
        [range, -range]
    );

    const rotateY = useTransform(
        springX,
        [-1, 1],
        [-range, range]
    );

    const onMouseMove = (event) => {
        const box = event.currentTarget.getBoundingClientRect();

        pointerX.set(
            ((event.clientX - box.left) / box.width) * 2 - 1
        );

        pointerY.set(
            ((event.clientY - box.top) / box.height) * 2 - 1
        );
    };

    const reset = useCallback(() => {
        pointerX.set(0);
        pointerY.set(0);
    }, [pointerX, pointerY]);

    return {
        rotateX,
        rotateY,
        onMouseMove,
        onMouseLeave: reset,
        reset,
    };
}

/* =====================================================================
   SHARED
   ===================================================================== */

function TopLine({ left, center, right }) {
    return (
        <header className="sb-topbar">
            <div className="sb-brand">
                <span className="sb-brand-symbol">✳</span>
                <span>{left}</span>
            </div>

            <div className="sb-topbar-center">
                {center}
            </div>

            <div className="sb-page-number">
                {right}
            </div>
        </header>
    );
}

function PaperStar({
                       item,
                       position,
                       active,
                       mode,
                       onPick,
                       index,
                   }) {
    const opening = mode === "opening";
    const pickable = Boolean(onPick);

    const handleKey = (event) => {
        if (
            event.key === "Enter" ||
            event.key === " "
        ) {
            event.preventDefault();
            onPick(index);
        }
    };

    return (
        <g transform={`translate(${position.x} ${position.y})`}>
            <motion.g
                className={`sb-star${active ? " is-active" : ""}${
                    pickable ? " is-pickable" : ""
                }`}
                initial={false}
                animate={
                    opening
                        ? {
                            x:
                                (position.x - 150) *
                                0.9,
                            y:
                                -380 -
                                position.float * 140,
                            rotate:
                                position.rotate + 280,
                            opacity: 0,
                            scale: 0.6,
                        }
                        : {
                            x: 0,
                            y: active ? -6 : 0,
                            rotate: position.rotate,
                            opacity: 1,
                            scale: active ? 1.35 : 1,
                        }
                }
                transition={
                    opening
                        ? {
                            duration: 0.9,
                            delay:
                                position.float * 0.25,
                            ease: [
                                0.2,
                                0.7,
                                0.3,
                                1,
                            ],
                        }
                        : {
                            type: "spring",
                            stiffness: 260,
                            damping: 18,
                        }
                }
                whileHover={
                    pickable
                        ? {
                            scale: active
                                ? 1.42
                                : 1.22,
                        }
                        : undefined
                }
                onClick={
                    pickable
                        ? () => onPick(index)
                        : undefined
                }
                onKeyDown={
                    pickable
                        ? handleKey
                        : undefined
                }
                role={
                    pickable
                        ? "button"
                        : undefined
                }
                tabIndex={
                    pickable
                        ? 0
                        : undefined
                }
                aria-label={
                    pickable
                        ? `Unfold note ${
                            index + 1
                        }`
                        : undefined
                }
                aria-pressed={
                    pickable
                        ? active
                        : undefined
                }
            >
                <path
                    d={STAR_PATH}
                    fill={item.color}
                    stroke={item.color}
                    strokeWidth="5"
                    strokeLinejoin="round"
                />

                <path
                    d={STAR_PATH}
                    fill="none"
                    stroke="rgba(21, 18, 22, 0.35)"
                    strokeWidth="0.9"
                    transform="scale(0.55)"
                />

                {item.kept && (
                    <circle
                        r="2.4"
                        fill="#151216"
                    />
                )}
            </motion.g>
        </g>
    );
}

function GlassJar({
                      items,
                      activeId,
                      onPick,
                      mode = "idle",
                      tag,
                      label,
                  }) {
    const layout = useMemo(
        () => pileLayout(items.length),
        [items.length]
    );

    const opening = mode === "opening";

    return (
        <svg
            className="sb-jar-svg"
            viewBox="0 0 300 390"
            role={onPick ? "group" : "img"}
            aria-label={label}
        >
            <defs>
                <linearGradient
                    id="sb-glass"
                    x1="0"
                    x2="1"
                >
                    <stop
                        offset="0"
                        stopColor="#eadbc7"
                        stopOpacity="0.14"
                    />
                    <stop
                        offset="0.45"
                        stopColor="#eadbc7"
                        stopOpacity="0.02"
                    />
                    <stop
                        offset="1"
                        stopColor="#eadbc7"
                        stopOpacity="0.1"
                    />
                </linearGradient>

                <radialGradient
                    id="sb-inner-glow"
                    cx="0.5"
                    cy="0.78"
                    r="0.65"
                >
                    <stop
                        offset="0"
                        stopColor="#8e3f4b"
                        stopOpacity="0.45"
                    />
                    <stop
                        offset="1"
                        stopColor="#8e3f4b"
                        stopOpacity="0"
                    />
                </radialGradient>

                <linearGradient
                    id="sb-lid"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                >
                    <stop
                        offset="0"
                        stopColor="#c9ab7c"
                    />
                    <stop
                        offset="1"
                        stopColor="#7c6342"
                    />
                </linearGradient>
            </defs>

            <ellipse
                className="sb-jar-shadow"
                cx="150"
                cy="372"
                rx="118"
                ry="9"
            />

            <path
                d={JAR_PATH}
                fill="url(#sb-inner-glow)"
            />

            {items.map((item, i) => (
                <PaperStar
                    key={item.id}
                    item={item}
                    index={i}
                    position={layout[i]}
                    active={
                        item.id === activeId
                    }
                    mode={mode}
                    onPick={onPick}
                />
            ))}

            <path
                d={JAR_PATH}
                fill="url(#sb-glass)"
                stroke="rgba(234,219,199,0.5)"
                strokeWidth="2"
                pointerEvents="none"
            />

            <path
                d="M62 172 C57 222 57 292 66 336"
                stroke="#eadbc7"
                strokeOpacity="0.3"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                pointerEvents="none"
            />

            <path
                d="M242 190 C245 230 245 270 241 300"
                stroke="#eadbc7"
                strokeOpacity="0.14"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                pointerEvents="none"
            />

            <motion.g
                initial={false}
                animate={
                    opening
                        ? {
                            y: -170,
                            x: 50,
                            rotate: 210,
                            opacity: 0,
                        }
                        : {
                            y: 0,
                            x: 0,
                            rotate: 0,
                            opacity: 1,
                        }
                }
                transition={{
                    duration: 0.7,
                    ease: "easeIn",
                }}
            >
                <rect
                    x="92"
                    y="40"
                    width="116"
                    height="32"
                    rx="4"
                    fill="url(#sb-lid)"
                />

                {Array.from(
                    { length: 7 },
                    (_, k) => (
                        <line
                            key={k}
                            x1={102 + k * 16}
                            x2={102 + k * 16}
                            y1="45"
                            y2="67"
                            stroke="rgba(21,18,22,0.3)"
                            strokeWidth="2"
                        />
                    )
                )}

                <rect
                    x="86"
                    y="66"
                    width="128"
                    height="9"
                    rx="3"
                    fill="#5d4b32"
                />
            </motion.g>

            {tag && (
                <g pointerEvents="none">
                    <path
                        d="M200 86 C216 92 226 106 230.8 124"
                        stroke="#b79768"
                        strokeWidth="1.5"
                        fill="none"
                    />

                    <g
                        transform="translate(222 108) rotate(12)"
                    >
                        <path
                            d="M0 14 L10 0 L66 0 L66 28 L10 28 Z"
                            fill="#eadbc7"
                        />

                        <circle
                            cx="12"
                            cy="14"
                            r="2.6"
                            fill="#151216"
                        />

                        <text
                            x="39"
                            y="19"
                            textAnchor="middle"
                            fontFamily="Caveat, cursive"
                            fontSize="14"
                            fill="#151216"
                        >
                            {tag}
                        </text>
                    </g>
                </g>
            )}
        </svg>
    );
}

function StampButton({
                         kept,
                         busy,
                         onClick,
                     }) {
    return (
        <button
            className={`sb-stamp${
                kept ? " is-kept" : ""
            }`}
            onClick={onClick}
            disabled={busy || kept}
            title={
                kept
                    ? "Already kept"
                    : "Keep this note"
            }
        >
            <span className="sb-stamp-icon">
                {busy
                    ? "…"
                    : kept
                        ? "✓"
                        : "♡"}
            </span>

            <span className="sb-stamp-word">
                {kept
                    ? "KEPT"
                    : "ADMIT ONE"}
            </span>

            <small>
                {kept
                    ? "filed with love"
                    : "tap to keep"}
            </small>
        </button>
    );
}

function SpinningStar() {
    return (
        <motion.svg
            width="34"
            height="34"
            viewBox="-16 -16 32 32"
            animate={{
                rotate: 360,
            }}
            transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "linear",
            }}
            aria-hidden="true"
        >
            <path
                d={STAR_PATH}
                fill="#b79768"
                stroke="#b79768"
                strokeWidth="4"
                strokeLinejoin="round"
            />
        </motion.svg>
    );
}

/* =====================================================================
   WELCOME
   ===================================================================== */

function Welcome() {
    const navigate = useNavigate();
    const [opening, setOpening] =
        useState(false);

    const demoStars = useMemo(
        () =>
            Array.from(
                { length: 20 },
                (_, i) => ({
                    id: `demo-${i}`,
                    color:
                        PAPER_COLORS[
                        i %
                        PAPER_COLORS.length
                            ],
                })
            ),
        []
    );

    const openJar = () => {
        if (opening) return;

        setOpening(true);

        setTimeout(
            () => navigate("/jar"),
            1100
        );
    };

    return (
        <main className="sb-page sb-welcome">
            <div className="sb-paper" />

            <TopLine
                left="THE JAR OF LITTLE THINGS"
                center="private collection / for one person only"
                right="00—01"
            />

            <div className="sb-welcome-grid">
                <motion.div
                    className="sb-welcome-copy"
                    initial={{
                        opacity: 0,
                        y: 24,
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                    }}
                    transition={{
                        duration: 0.9,
                        ease: "easeOut",
                    }}
                >
                    <p className="sb-kicker">
                        a keeping place for
                        <br />
                        very small things
                    </p>

                    <h1 className="sb-title">
                        The Jar of
                        <em>
                            Little Things.
                        </em>
                    </h1>

                    <p className="sb-lede">
                        Fold up the tiny moments
                        — a joke that landed, a
                        shade of sky, a name you
                        don't want to forget — and
                        drop them in. Come back
                        whenever you need
                        something small and true.
                    </p>

                    <button
                        className="sb-btn sb-btn-primary"
                        onClick={openJar}
                        disabled={opening}
                    >
                        {opening
                            ? "unscrewing the lid…"
                            : "unscrew the lid"}

                        <span>↗</span>
                    </button>

                    <p className="sb-hand">
                        filed under: filled by
                        hand, one note at a time
                    </p>
                </motion.div>

                <motion.div
                    className="sb-jar-stage"
                    initial={{
                        opacity: 0,
                        scale: 0.94,
                    }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                    }}
                    transition={{
                        duration: 1,
                        ease: "easeOut",
                        delay: 0.15,
                    }}
                >
                    <div className="sb-photo-frame">
                        <motion.div
                            className="sb-welcome-jar"
                            animate={
                                opening
                                    ? {
                                        y: -14,
                                        scale: 1.05,
                                        rotate: [
                                            0,
                                            -4,
                                            4,
                                            0,
                                        ],
                                    }
                                    : {
                                        y: [
                                            0,
                                            -8,
                                            0,
                                        ],
                                    }
                            }
                            transition={
                                opening
                                    ? {
                                        duration: 0.5,
                                        ease: "easeOut",
                                    }
                                    : {
                                        duration: 6,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }
                            }
                        >
                            <GlassJar
                                items={demoStars}
                                mode={
                                    opening
                                        ? "opening"
                                        : "idle"
                                }
                                tag="little things"
                                label="A glass jar full of folded paper stars"
                            />
                        </motion.div>
                    </div>

                    <div className="sb-ticket">
                        <span>
                            ADMIT ONE
                        </span>
                        <strong>
                            BESTIE
                        </strong>
                        <small>
                            valid forever
                        </small>
                    </div>
                </motion.div>
            </div>

            <footer className="sb-bottom-line">
                <span>
                    the places are real. the
                    memories are ours.
                </span>

                <span>∞</span>

                <span>
                    for my favourite person
                </span>
            </footer>

            <motion.div
                className="sb-flood"
                initial={false}
                animate={
                    opening
                        ? {
                            clipPath:
                                "circle(150% at 50% 50%)",
                        }
                        : {
                            clipPath:
                                "circle(0% at 50% 50%)",
                        }
                }
                transition={{
                    duration: 1.1,
                    ease: [
                        0.76,
                        0,
                        0.24,
                        1,
                    ],
                }}
                aria-hidden="true"
            />
        </main>
    );
}

/* =====================================================================
   NEW MEMORY CARD
   ===================================================================== */

function MemoryArtifact({
                            note,
                            index,
                            total,
                            isKept,
                            collecting,
                            onKeep,
                            onExpand,
                        }) {
    const date = formatDate(
        note.createdAt
    );

    const category =
        note.category?.name ||
        "little things";

    return (
        <motion.article
            className="memory-artifact"
            style={{
                "--artifact-accent":
                    paperFor(note, index),
            }}
            initial={{
                opacity: 0,
                y: 30,
                scale: 0.97,
            }}
            animate={{
                opacity: 1,
                y: 0,
                scale: 1,
            }}
            exit={{
                opacity: 0,
                y: 20,
                scale: 0.98,
            }}
            transition={{
                type: "spring",
                stiffness: 110,
                damping: 18,
            }}
        >
            {/* decorative back plates */}
            <div className="artifact-shadow-sheet artifact-sheet-one" />
            <div className="artifact-shadow-sheet artifact-sheet-two" />

            {/* MAIN FRAME */}
            <div className="artifact-frame">

                {/* LEFT ARCHIVE SPINE */}
                <aside className="artifact-spine">
                    <span className="spine-word">
                        MEMORY
                    </span>

                    <span className="spine-number">
                        {pad(index + 1)}
                    </span>

                    <span className="spine-mark">
                        ✳
                    </span>

                    <span className="spine-word">
                        ARCHIVE
                    </span>
                </aside>

                {/* MAIN CONTENT */}
                <div className="artifact-main">

                    {/* TOP ARCHIVE BAR */}
                    <header className="artifact-top">
                        <div>
                            <span className="artifact-eyebrow">
                                PERSONAL ARCHIVE
                            </span>

                            <span className="artifact-code">
                                FILE /{" "}
                                {pad(index + 1)}
                                {" — "}
                                {pad(total)}
                            </span>
                        </div>

                        <div className="artifact-seal">
                            <span>✦</span>
                            <small>
                                KEPT
                            </small>
                        </div>
                    </header>

                    {/* TITLE / DATE AREA */}
                    <section className="artifact-heading">
                        <div className="artifact-chapter">
                            <span>
                                CHAPTER
                            </span>

                            <strong>
                                {pad(
                                    index + 1
                                )}
                            </strong>
                        </div>

                        <div className="artifact-heading-copy">
                            <span className="artifact-label">
                                A LITTLE THING
                            </span>

                            <h2>
                                {category}
                            </h2>

                            {date && (
                                <p>
                                    recorded on{" "}
                                    <strong>
                                        {date}
                                    </strong>
                                </p>
                            )}
                        </div>
                    </section>

                    {/* GOLD DIVIDER */}
                    <div className="artifact-rule">
                        <span />
                        <i>✦</i>
                        <span />
                    </div>

                    {/* MEMORY AREA */}
                    <section className="artifact-content">

                        {/* PHOTO */}
                        {note.imageUrl && (
                            <figure className="artifact-photo">
                                <div className="photo-corner photo-corner-a" />
                                <div className="photo-corner photo-corner-b" />

                                <img
                                    src={
                                        note.imageUrl
                                    }
                                    alt="Memory attached to this note"
                                />

                                <figcaption>
                                    <span>
                                        PLATE{" "}
                                        {pad(
                                            index + 1
                                        )}
                                    </span>

                                    <span>
                                        from the
                                        little things
                                    </span>
                                </figcaption>
                            </figure>
                        )}

                        {/* TEXT SCROLL */}
                        <div className="artifact-writing">
                            <div className="writing-top">
                                <span>
                                    DEAR MEMORY,
                                </span>

                                <span>
                                    ✳
                                </span>
                            </div>

                            <div className="writing-scroll">
                                <p>
                                    {note.content}
                                </p>
                            </div>

                            <div className="writing-bottom">
                                <span>
                                    —
                                </span>

                                <span>
                                    preserved
                                    here
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* BOTTOM ARCHIVE */}
                    <footer className="artifact-footer">
                        <div className="artifact-meta">
                            <span>
                                COLLECTION
                            </span>

                            <strong>
                                THE JAR OF
                                LITTLE THINGS
                            </strong>
                        </div>

                        <div className="artifact-meta">
                            <span>
                                STATUS
                            </span>

                            <strong>
                                {isKept
                                    ? "FILED"
                                    : "UNFILED"}
                            </strong>
                        </div>

                        <StampButton
                            kept={isKept}
                            busy={collecting}
                            onClick={onKeep}
                        />
                    </footer>
                </div>
            </div>

            {/* OPEN / UNFOLD BUTTON */}
            <button
                className="artifact-unfold"
                onClick={onExpand}
            >
                <span>
                    unfold memory
                </span>

                <strong>
                    ↗
                </strong>
            </button>
        </motion.article>
    );
}

/* =====================================================================
   FULL MEMORY MODAL
   ===================================================================== */

function MemoryModal({
                         note,
                         index,
                         total,
                         onClose,
                         onPrevious,
                         onNext,
                     }) {
    if (!note) return null;

    const date = formatDate(
        note.createdAt
    );

    const category =
        note.category?.name ||
        "little things";

    return (
        <AnimatePresence>
            <motion.div
                className="memory-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* BACKDROP */}
                <div
                    className="memory-modal-backdrop"
                    onClick={onClose}
                />

                {/* TOP UI */}
                <div className="memory-modal-top">
                    <div className="modal-file">
                        ARCHIVE /{" "}
                        {pad(index + 1)}
                    </div>

                    <button
                        className="modal-close"
                        onClick={onClose}
                    >
                        <span>close</span>
                        <strong>×</strong>
                    </button>
                </div>

                {/* ARTIFACT */}
                <motion.div
                    className="royal-memory"
                    initial={{
                        opacity: 0,
                        y: 50,
                        scale: 0.94,
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                    }}
                    exit={{
                        opacity: 0,
                        y: 30,
                        scale: 0.96,
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 130,
                        damping: 20,
                    }}
                >
                    {/* BACK LAYERS */}
                    <div className="royal-layer royal-layer-back" />
                    <div className="royal-layer royal-layer-mid" />

                    <div className="royal-frame">

                        {/* VERTICAL SIDE */}
                        <aside className="royal-side">
                            <span>
                                THE JAR
                            </span>

                            <div className="royal-side-line" />

                            <strong>
                                {pad(
                                    index + 1
                                )}
                            </strong>

                            <div className="royal-side-line" />

                            <span>
                                OF LITTLE
                                THINGS
                            </span>
                        </aside>

                        {/* PAPER */}
                        <div className="royal-paper">

                            {/* CORNERS */}
                            <span className="royal-corner royal-corner-tl">
                                ❧
                            </span>

                            <span className="royal-corner royal-corner-tr">
                                ❧
                            </span>

                            <span className="royal-corner royal-corner-bl">
                                ❧
                            </span>

                            <span className="royal-corner royal-corner-br">
                                ❧
                            </span>

                            {/* HEADER */}
                            <header className="royal-header">
                                <div>
                                    <span className="royal-kicker">
                                        PRIVATE MEMORY
                                    </span>

                                    <h1>
                                        {category}
                                    </h1>
                                </div>

                                <div className="royal-number">
                                    <small>
                                        NO.
                                    </small>

                                    <strong>
                                        {pad(
                                            index + 1
                                        )}
                                    </strong>
                                </div>
                            </header>

                            <div className="royal-subheader">
                                <span>
                                    {date ||
                                        "undated"}
                                </span>

                                <span>
                                    preserved
                                    with care
                                </span>

                                <span>
                                    ✦
                                </span>
                            </div>

                            {/* BODY */}
                            <div className="royal-body">

                                {/* PHOTO COLUMN */}
                                {note.imageUrl && (
                                    <div className="royal-photo-column">
                                        <div className="royal-photo-frame">
                                            <img
                                                src={
                                                    note.imageUrl
                                                }
                                                alt="Memory"
                                            />
                                        </div>

                                        <span>
                                            FIG.{" "}
                                            {pad(
                                                index +
                                                1
                                            )}
                                        </span>

                                        <small>
                                            one moment,
                                            carefully
                                            kept
                                        </small>
                                    </div>
                                )}

                                {/* TEXT COLUMN */}
                                <div className="royal-text-column">
                                    <div className="royal-dropcap">
                                        {note.content?.charAt(
                                            0
                                        ) || "✦"}
                                    </div>

                                    <div className="royal-scroll">
                                        <p>
                                            {note.content}
                                        </p>
                                    </div>

                                    <div className="royal-signature">
                                        <span>
                                            ✦
                                        </span>

                                        <span>
                                            a little
                                            thing worth
                                            remembering
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* FOOT */}
                            <footer className="royal-footer">
                                <div>
                                    <span>
                                        ARCHIVE
                                    </span>

                                    <strong>
                                        JAR /
                                        MEMORY
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        ENTRY
                                    </span>

                                    <strong>
                                        {pad(
                                            index + 1
                                        )}{" "}
                                        /{" "}
                                        {pad(total)}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        ✦
                                    </span>

                                    <strong>
                                        KEPT
                                        FOREVER
                                    </strong>
                                </div>
                            </footer>
                        </div>
                    </div>
                </motion.div>

                {/* NAVIGATION */}
                <div className="royal-navigation">
                    <button
                        onClick={onPrevious}
                        disabled={
                            index === 0
                        }
                    >
                        ←
                        <span>
                            previous
                        </span>
                    </button>

                    <div className="royal-counter">
                        <strong>
                            {pad(
                                index + 1
                            )}
                        </strong>

                        <span>
                            of
                        </span>

                        <strong>
                            {pad(total)}
                        </strong>
                    </div>

                    <button
                        onClick={onNext}
                        disabled={
                            index ===
                            total - 1
                        }
                    >
                        <span>
                            next
                        </span>
                        →
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

/* =====================================================================
   JAR ROOM
   ===================================================================== */

function JarRoom() {
    const navigate = useNavigate();

    const {
        notes,
        categories,
        keptIds,
        setKeptIds,
        loading,
        error,
        reload,
    } = useJarData(USER_ID);

    const [filter, setFilter] =
        useState("all");

    const [index, setIndex] =
        useState(0);

    const [expanded, setExpanded] =
        useState(false);

    const [drawing, setDrawing] =
        useState(false);

    const [collecting, setCollecting] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const tilt = useTilt();

    const visibleNotes = useMemo(
        () =>
            filter === "all"
                ? notes
                : notes.filter(
                    (note) =>
                        String(
                            note.category?.id
                        ) ===
                        String(filter)
                ),
        [notes, filter]
    );

    const currentNote =
        visibleNotes[index];

    const isKept = Boolean(
        currentNote &&
        keptIds.includes(
            Number(currentNote.id)
        )
    );

    const jarItems = useMemo(
        () =>
            visibleNotes
                .slice(0, MAX_STARS)
                .map((note, i) => ({
                    id: note.id,
                    color: paperFor(
                        note,
                        i
                    ),
                    kept: keptIds.includes(
                        Number(note.id)
                    ),
                })),
        [visibleNotes, keptIds]
    );

    const hiddenCount = Math.max(
        0,
        visibleNotes.length -
        MAX_STARS
    );

    useEffect(() => {
        if (
            index >
            visibleNotes.length - 1
        ) {
            setIndex(
                Math.max(
                    0,
                    visibleNotes.length - 1
                )
            );
        }
    }, [
        visibleNotes.length,
        index,
    ]);

    useEffect(() => {
        tilt.reset();
        setMessage("");
    }, [
        index,
        filter,
        tilt.reset,
    ]);

    const goTo = useCallback(
        (nextIndex) => {
            setIndex(nextIndex);
            setMessage("");
        },
        []
    );

    const step = useCallback(
        (direction) => {
            setIndex((i) =>
                Math.min(
                    Math.max(
                        i + direction,
                        0
                    ),
                    visibleNotes.length -
                    1
                )
            );

            setMessage("");
        },
        [visibleNotes.length]
    );

    const changeFilter = (
        value
    ) => {
        setFilter(value);
        setIndex(0);
        setMessage("");
    };

    const drawRandomNote =
        useCallback(() => {
            if (
                visibleNotes.length <
                2 ||
                drawing
            )
                return;

            setDrawing(true);
            setMessage("");

            setTimeout(() => {
                setIndex(
                    (current) => {
                        let pick =
                            current;

                        while (
                            pick ===
                            current
                            ) {
                            pick =
                                Math.floor(
                                    Math.random() *
                                    visibleNotes.length
                                );
                        }

                        return pick;
                    }
                );

                setDrawing(false);
            }, 620);
        }, [
            visibleNotes.length,
            drawing,
        ]);

    useEffect(() => {
        const onKey = (event) => {
            if (
                event.target?.closest?.(
                    "input, textarea, select"
                )
            )
                return;

            if (
                event.key ===
                "Escape"
            ) {
                setExpanded(false);
                return;
            }

            if (expanded) {
                if (
                    event.key ===
                    "ArrowRight"
                )
                    step(1);

                if (
                    event.key ===
                    "ArrowLeft"
                )
                    step(-1);

                return;
            }

            if (
                event.key ===
                "ArrowRight"
            )
                step(1);

            if (
                event.key ===
                "ArrowLeft"
            )
                step(-1);

            if (
                event.key === "s" ||
                event.key === "S"
            )
                drawRandomNote();
        };

        window.addEventListener(
            "keydown",
            onKey
        );

        return () =>
            window.removeEventListener(
                "keydown",
                onKey
            );
    }, [
        expanded,
        step,
        drawRandomNote,
    ]);

    const handleKeep =
        async () => {
            if (
                !currentNote ||
                collecting
            )
                return;

            const noteId = Number(
                currentNote.id
            );

            if (
                keptIds.includes(
                    noteId
                )
            ) {
                setMessage(
                    "this one is already in your treasures."
                );
                return;
            }

            try {
                setCollecting(true);
                setMessage("");

                await collectNote(
                    currentNote.id,
                    USER_ID
                );

                setKeptIds(
                    (ids) => [
                        ...ids,
                        noteId,
                    ]
                );

                setMessage(
                    "stamped and kept. it's in your treasures now."
                );
            } catch (err) {
                console.error(
                    "Collection error:",
                    err
                );

                if (
                    err.response?.status ===
                    409
                ) {
                    setKeptIds(
                        (ids) =>
                            ids.includes(
                                noteId
                            )
                                ? ids
                                : [
                                    ...ids,
                                    noteId,
                                ]
                    );

                    setMessage(
                        "this one is already in your treasures."
                    );
                } else {
                    setMessage(
                        "that didn't save. try keeping it again."
                    );
                }
            } finally {
                setCollecting(
                    false
                );
            }
        };

    const renderStage = () => {
        if (loading) {
            return (
                <div className="sb-status">
                    <SpinningStar />

                    <p>
                        unfolding…
                    </p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="sb-empty">
                    <h2>
                        The lid is
                        stuck.
                    </h2>

                    <p>{error}</p>

                    <button
                        className="sb-btn sb-btn-primary"
                        onClick={
                            reload
                        }
                    >
                        try again{" "}
                        <span>
                            ↗
                        </span>
                    </button>
                </div>
            );
        }

        if (notes.length === 0) {
            return (
                <div className="sb-empty">
                    <h2>
                        Nothing in
                        here yet.
                    </h2>

                    <p>
                        The jar fills
                        up one small
                        thing at a
                        time. Start
                        it off.
                    </p>

                    <button
                        className="sb-btn sb-btn-primary"
                        onClick={() =>
                            navigate(
                                "/add-note"
                            )
                        }
                    >
                        fold the first
                        one{" "}
                        <span>
                            ↗
                        </span>
                    </button>
                </div>
            );
        }

        if (!currentNote) {
            return (
                <div className="sb-empty">
                    <h2>
                        Nothing under
                        this label.
                    </h2>

                    <p>
                        No little
                        things have
                        been filed
                        here yet.
                    </p>

                    <button
                        className="sb-btn sb-btn-ghost"
                        onClick={() =>
                            changeFilter(
                                "all"
                            )
                        }
                    >
                        show every note
                    </button>
                </div>
            );
        }

        return (
            <>
                <div className="sb-letter-nav">
                    <button
                        className="sb-round"
                        onClick={() =>
                            step(-1)
                        }
                        disabled={
                            index === 0
                        }
                        aria-label="Previous note"
                    >
                        ←
                    </button>

                    <span className="sb-counter">
                        {pad(
                            index + 1
                        )}{" "}
                        <i>
                            of
                        </i>{" "}
                        {pad(
                            visibleNotes.length
                        )}
                    </span>

                    <button
                        className="sb-round"
                        onClick={() =>
                            step(1)
                        }
                        disabled={
                            index ===
                            visibleNotes.length -
                            1
                        }
                        aria-label="Next note"
                    >
                        →
                    </button>
                </div>

                <motion.div
                    className="sb-tilt"
                    style={{
                        rotateX:
                        tilt.rotateX,
                        rotateY:
                        tilt.rotateY,
                        transformPerspective: 1000,
                    }}
                    onMouseMove={
                        tilt.onMouseMove
                    }
                    onMouseLeave={
                        tilt.onMouseLeave
                    }
                >
                    <AnimatePresence mode="wait">
                        <MemoryArtifact
                            key={
                                currentNote.id
                            }
                            note={
                                currentNote
                            }
                            index={index}
                            total={
                                visibleNotes.length
                            }
                            isKept={
                                isKept
                            }
                            collecting={
                                collecting
                            }
                            onKeep={
                                handleKeep
                            }
                            onExpand={() =>
                                setExpanded(
                                    true
                                )
                            }
                        />
                    </AnimatePresence>
                </motion.div>

                <p
                    className="sb-message"
                    aria-live="polite"
                >
                    {message}
                </p>
            </>
        );
    };

    return (
        <main className="sb-page sb-room">
            <div className="sb-paper" />

            <TopLine
                left="THE JAR OF LITTLE THINGS"
                center={`${notes.length} folded / ${keptIds.length} kept`}
                right="01—04"
            />

            <div className="sb-room-grid">
                <aside className="sb-index">
                    <div className="sb-index-heading">
                        <span>
                            CONTENTS
                        </span>

                        <span>
                            ♡
                        </span>
                    </div>

                    <div
                        className="sb-index-list"
                        aria-label="Filter notes by label"
                    >
                        <button
                            className={`sb-index-item${
                                filter ===
                                "all"
                                    ? " active"
                                    : ""
                            }`}
                            onClick={() =>
                                changeFilter(
                                    "all"
                                )
                            }
                            aria-pressed={
                                filter ===
                                "all"
                            }
                        >
                            <span className="sb-index-number">
                                00
                            </span>

                            <span className="sb-index-title">
                                everything
                            </span>

                            <span className="sb-index-arrow">
                                ↗
                            </span>
                        </button>

                        {categories.map(
                            (
                                category,
                                i
                            ) => {
                                const on =
                                    String(
                                        filter
                                    ) ===
                                    String(
                                        category.id
                                    );

                                return (
                                    <button
                                        key={
                                            category.id
                                        }
                                        className={`sb-index-item${
                                            on
                                                ? " active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            changeFilter(
                                                category.id
                                            )
                                        }
                                        aria-pressed={
                                            on
                                        }
                                    >
                                        <span className="sb-index-number">
                                            {pad(
                                                i +
                                                1
                                            )}
                                        </span>

                                        <span className="sb-index-title">
                                            {
                                                category.name
                                            }
                                        </span>

                                        <span className="sb-index-arrow">
                                            ↗
                                        </span>
                                    </button>
                                );
                            }
                        )}
                    </div>

                    <div className="sb-index-actions">
                        <button
                            className="sb-link"
                            onClick={() =>
                                navigate(
                                    "/add-note"
                                )
                            }
                        >
                            fold a new one ↗
                        </button>

                        <button
                            className="sb-link"
                            onClick={() =>
                                navigate(
                                    "/collection"
                                )
                            }
                        >
                            your treasures ↗
                        </button>

                        <button
                            className="sb-link"
                            onClick={() =>
                                navigate("/")
                            }
                        >
                            ← back to the
                            doorway
                        </button>
                    </div>

                    <div className="sb-index-note">
                        <span>
                            filed under:
                        </span>

                        <strong>
                            us, obviously
                        </strong>
                    </div>
                </aside>

                <section className="sb-spread">
                    <div className="sb-spread-topline">
                        <span>
                            MEMORY ARCHIVE /{" "}
                            {pad(
                                index + 1
                            )}
                        </span>

                        <span>
                            somewhere between
                            then &amp; now
                        </span>
                    </div>

                    <div className="sb-spread-body">
                        <div className="sb-jar-side">
                            <motion.div
                                className="sb-room-jar"
                                animate={
                                    drawing
                                        ? {
                                            rotate: [
                                                0,
                                                -9,
                                                8,
                                                -6,
                                                4,
                                                0,
                                            ],
                                            y: [
                                                0,
                                                -12,
                                                0,
                                                -5,
                                                0,
                                            ],
                                        }
                                        : {
                                            rotate: 0,
                                            y: [
                                                0,
                                                -5,
                                                0,
                                            ],
                                        }
                                }
                                transition={
                                    drawing
                                        ? {
                                            duration: 0.62,
                                            ease: "easeInOut",
                                        }
                                        : {
                                            duration: 5,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                        }
                                }
                            >
                                <GlassJar
                                    items={
                                        jarItems
                                    }
                                    activeId={
                                        currentNote?.id
                                    }
                                    onPick={
                                        goTo
                                    }
                                    label="Paper stars in the jar. Choose one to unfold it."
                                />
                            </motion.div>

                            <button
                                className="sb-btn sb-btn-primary sb-shake"
                                onClick={
                                    drawRandomNote
                                }
                                disabled={
                                    visibleNotes.length <
                                    2 ||
                                    drawing
                                }
                            >
                                {drawing
                                    ? "shaking…"
                                    : "shake for a random one"}

                                <span>
                                    ↗
                                </span>
                            </button>

                            <p className="sb-hint">
                                tap a star · ← →
                                to wander · S to
                                shake
                            </p>

                            {hiddenCount >
                                0 && (
                                    <p className="sb-hint">
                                        +
                                        {
                                            hiddenCount
                                        }{" "}
                                        more buried
                                        deeper in the
                                        jar
                                    </p>
                                )}
                        </div>

                        <div className="sb-letter-side">
                            {renderStage()}
                        </div>
                    </div>

                    <div className="sb-spread-footer">
                        <span>
                            made of little
                            things
                        </span>

                        <span>
                            turn the page →
                        </span>
                    </div>
                </section>
            </div>

            <footer className="sb-bottom-line">
                <span>
                    the places are real. the
                    memories are ours.
                </span>

                <span>∞</span>

                <span>
                    for my favourite person
                </span>
            </footer>

            <MemoryModal
                note={
                    expanded
                        ? currentNote
                        : null
                }
                index={index}
                total={
                    visibleNotes.length
                }
                onClose={() =>
                    setExpanded(false)
                }
                onPrevious={() =>
                    step(-1)
                }
                onNext={() =>
                    step(1)
                }
            />
        </main>
    );
}

function LockIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
        >
            <rect
                x="4"
                y="11"
                width="16"
                height="10"
                rx="2"
            />

            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
    );
}

/* =====================================================================
   APP
   ===================================================================== */

function App() {
    const [
        isUnlocked,
        setIsUnlocked,
    ] = useState(
        () =>
            sessionStorage.getItem(
                "jarAccessGranted"
            ) === "true"
    );

    if (!isUnlocked) {
        return (
            <AccessGate
                onUnlock={() =>
                    setIsUnlocked(true)
                }
            />
        );
    }

    const handleLock = () => {
        sessionStorage.removeItem(
            "jarAccessGranted"
        );

        setIsUnlocked(false);
    };

    return (
        <BrowserRouter>
            <button
                onClick={handleLock}
                className="sb-lock"
            >
                <LockIcon />
                lock the jar
            </button>

            <Routes>
                <Route
                    path="/"
                    element={<Welcome />}
                />

                <Route
                    path="/jar"
                    element={<JarRoom />}
                />

                <Route
                    path="/add-note"
                    element={<AddNote />}
                />

                <Route
                    path="/collection"
                    element={<Collection />}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;