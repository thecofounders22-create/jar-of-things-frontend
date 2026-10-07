import { useMemo } from "react";
import { motion } from "framer-motion";

export const COLORS = ["#b87378", "#b79768", "#69705b", "#76677b", "#8e3f4b", "#eadbc7"];

const JAR =
    "M100 70 L200 70 L200 95 C200 112 260 116 260 162 L260 330 C260 355 240 366 214 366 L86 366 C60 366 40 355 40 330 L40 162 C40 116 100 112 100 95 Z";

function rng(seed) {
    let a = seed;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const STAR = (() => {
    const p = [];
    for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 6.2 : 12;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        p.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
    }
    return `M${p.join("L")}Z`;
})();

export default function Jar({ count = 20, lit = -1, opening = false, tag, label }) {
    const stars = useMemo(() => {
        const r = rng(7);
        return Array.from({ length: Math.min(count, 42) }, (_, i) => ({
            x: 72 + (i % 6) * 29 + (Math.floor(i / 6) % 2 ? 14 : 0) + (r() - 0.5) * 8,
            y: 338 - Math.floor(i / 6) * 25 + (r() - 0.5) * 6,
            rot: (r() - 0.5) * 70,
            f: r(),
        }));
    }, [count]);

    return (
        <svg className="sb-jar-svg" viewBox="0 0 300 390" role="img" aria-label={label}>
            <defs>
                <linearGradient id="sbg" x1="0" x2="1">
                    <stop offset="0" stopColor="#eadbc7" stopOpacity=".14" />
                    <stop offset=".5" stopColor="#eadbc7" stopOpacity=".02" />
                    <stop offset="1" stopColor="#eadbc7" stopOpacity=".1" />
                </linearGradient>
                <radialGradient id="sbglow" cx=".5" cy=".78" r=".65">
                    <stop offset="0" stopColor="#8e3f4b" stopOpacity=".5" />
                    <stop offset="1" stopColor="#8e3f4b" stopOpacity="0" />
                </radialGradient>
            </defs>
            <ellipse cx="150" cy="372" rx="118" ry="9" fill="rgba(0,0,0,.4)" />
            <path d={JAR} fill="url(#sbglow)" />
            {stars.map((s, i) => (
                <g key={i} transform={`translate(${s.x} ${s.y})`}>
                    <motion.g
                        initial={false}
                        animate={
                            opening
                                ? { x: (s.x - 150) * 0.9, y: -380 - s.f * 140, rotate: s.rot + 280, opacity: 0, scale: 0.6 }
                                : { x: 0, y: i === lit ? -8 : 0, rotate: s.rot, opacity: 1, scale: i === lit ? 1.5 : 1 }
                        }
                        transition={opening ? { duration: 0.9, delay: s.f * 0.25 } : { type: "spring", stiffness: 240, damping: 16 }}
                    >
                        <path d={STAR} fill={COLORS[i % 6]} stroke={COLORS[i % 6]} strokeWidth="5" strokeLinejoin="round" />
                    </motion.g>
                </g>
            ))}
            <path d={JAR} fill="url(#sbg)" stroke="rgba(234,219,199,.5)" strokeWidth="2" />
            <path d="M62 172 C57 222 57 292 66 336" stroke="#eadbc7" strokeOpacity=".3" strokeWidth="6" strokeLinecap="round" fill="none" />
            <motion.g
                initial={false}
                animate={opening ? { y: -170, x: 50, rotate: 210, opacity: 0 } : { y: 0, x: 0, rotate: 0, opacity: 1 }}
                transition={{ duration: 0.7, ease: "easeIn" }}
            >
                <rect x="92" y="40" width="116" height="32" rx="4" fill="#b79768" />
                <rect x="86" y="66" width="128" height="9" rx="3" fill="#5d4b32" />
            </motion.g>
            {tag && (
                <g transform="translate(222 108) rotate(12)">
                    <path d="M0 14 L10 0 L66 0 L66 28 L10 28 Z" fill="#eadbc7" />
                    <text x="39" y="19" textAnchor="middle" fontFamily="Caveat, cursive" fontSize="14" fill="#151216">{tag}</text>
                </g>
            )}
        </svg>
    );
}