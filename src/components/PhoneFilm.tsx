"use client";

import { useEffect, useRef } from "react";
import { motion, useTransform, type MotionValue } from "motion/react";
import { phonePosterUrl, phoneVideoUrl } from "@/lib/frames";
import { CLIPS, sceneIndexAt, smoothstep, type Timeline } from "@/lib/timeline";

/** The new scene's poster fades in over the old video this long before its video takes over. */
const CROSSFADE_MS = 400;
/** Once the new video is playing, its poster (the same first frame) fades out this fast. */
const REVEAL_MS = 200;
/** The next scene's video starts loading this far through the current scene. */
const PRELOAD_AT = 0.6;
/** Soft top and bottom edges: the video fades into the cream over 12% of its height. */
const EDGES = "linear-gradient(to bottom, var(--cream), rgb(234 216 191 / 0) 12%, rgb(234 216 191 / 0) 88%, var(--cream))";

export type PhoneFilmEvent = { t: number; type: string; scene: number; src: string };
export type PhoneFilmDebug = { readonly scene: number; events: PhoneFilmEvent[] };

const posterOf = (scene: number) => phonePosterUrl(CLIPS[scene].dir);
const videoOf = (scene: number) => phoneVideoUrl(CLIPS[scene].dir);

/**
 * Portrait phones: instead of scrubbing frames, each scene plays its own short muted
 * video once, from the start, and then holds its last frame. Everything is driven by
 * events (scene changes, `playing`, visibility), so nothing runs per frame.
 *
 * One <video> shows the scene in view. On a scene change the new scene's poster (an
 * <img> above the video) fades in, then the video switches to the new clip, and the
 * poster fades out once that clip is playing. If playback is refused (Low Power Mode,
 * autoplay blocked) or the user prefers reduced motion, the poster simply stays.
 */
export function PhoneFilm({ tl, position, reduced }: { tl: Timeline; position: MotionValue<number>; reduced: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const coverRef = useRef<HTMLImageElement>(null);
  const nextRef = useRef<HTMLVideoElement>(null);
  // The closing fade to cream before the stage unpins (the canvas film's `fade`).
  const opacity = useTransform(position, (v) => 1 - smoothstep((v - tl.segments[CLIPS.length - 1].end) / tl.fadeOut));

  useEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;
    const cover = coverRef.current;
    const next = nextRef.current;
    if (!root || !video || !cover || !next) return;
    video.muted = video.defaultMuted = true;
    next.muted = next.defaultMuted = true;

    /** The scene in view (or being faded to), and the scene the video holds. */
    let scene = -1;
    let loaded = -1;
    let preloaded = -1;
    /** The cover is fully up: the video below it isn't seen. */
    let covered = true;
    let inView = false;
    let leftView = false;
    let swap = 0;

    // ?debug: every scene change, src swap and playback event, for the e2e tests.
    let debug: PhoneFilmDebug | null = null;
    if (new URLSearchParams(window.location.search).has("debug")) {
      debug = {
        get scene() {
          return scene;
        },
        events: [],
      };
      (window as unknown as { __phoneFilm: PhoneFilmDebug }).__phoneFilm = debug;
    }
    const log = (type: string) =>
      debug?.events.push({ t: performance.now(), type, scene, src: video.getAttribute("src") ?? "" });

    const fadeCover = (to: number, ms: number) => {
      cover.style.transitionDuration = `${ms}ms`;
      cover.style.opacity = String(to);
    };

    const play = () => {
      if (reduced || loaded !== scene || !inView || document.hidden) return;
      video.play().catch(() => log("blocked")); // the poster stays up
    };

    /** Show scene `to`: crossfade to its poster, then play its video from the start. */
    const show = (to: number, instant: boolean) => {
      scene = to;
      window.clearTimeout(swap);
      log("scene");
      if (covered && !instant) {
        // The cover already hides the video (playback refused, or reduced motion): drop it
        // instantly onto the identical frame below, so the new poster can fade in over it.
        fadeCover(0, 0);
        void cover.offsetWidth;
      }
      cover.src = posterOf(to);
      fadeCover(1, instant ? 0 : CROSSFADE_MS);
      const load = () => {
        covered = true;
        video.poster = posterOf(to);
        if (reduced) return;
        video.src = videoOf(to); // starts again from the beginning
        loaded = to;
        log("swap");
        play();
      };
      if (instant) load();
      else swap = window.setTimeout(load, CROSSFADE_MS);
    };

    const onPlaying = () => {
      log("playing");
      if (loaded !== scene) return;
      covered = false;
      fadeCover(0, REVEAL_MS);
    };
    const onEnded = () => log("ended"); // no loop: the last frame stays
    video.addEventListener("playing", onPlaying);
    video.addEventListener("ended", onEnded);

    const onPosition = (v: number) => {
      const now = sceneIndexAt(tl, v);
      if (now !== scene) show(now, scene === -1);
      // About 60% through a scene, start loading the next scene's video.
      const { start, end } = tl.segments[now];
      if (!reduced && now + 1 < CLIPS.length && preloaded !== now + 1 && (v - start) / (end - start) >= PRELOAD_AT) {
        preloaded = now + 1;
        next.src = videoOf(now + 1);
        log("preload");
      }
    };
    onPosition(position.get());
    const offPosition = position.on("change", onPosition);

    // Pause while the stage is off-screen or the tab is hidden.
    const sync = () => {
      if (inView && !document.hidden) {
        // Scrolling back onto the film after leaving it re-enters the scene: play it again.
        if (leftView && video.ended) show(scene, false);
        else if (video.paused && !video.ended) play();
        leftView = false;
      } else {
        video.pause();
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (!inView) leftView = true;
      sync();
    });
    io.observe(root);
    document.addEventListener("visibilitychange", sync);

    return () => {
      window.clearTimeout(swap);
      offPosition();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("ended", onEnded);
      video.pause();
      video.removeAttribute("src");
      next.removeAttribute("src");
    };
  }, [tl, position, reduced]);

  return (
    // Same place as the stage's CSS poster (.film-stage): full width, centred at 40% of the stage.
    // Opaque cream below, so that poster never shows through the closing fade.
    <div
      ref={rootRef}
      aria-hidden="true"
      className="absolute inset-x-0 top-[calc(40dvh-var(--film-frame-h)/2)] h-(--film-frame-h) bg-cream"
    >
      <motion.div className="absolute inset-0" style={{ opacity }}>
        <video
          ref={videoRef}
          muted
          playsInline
          preload="metadata"
          disablePictureInPicture
          aria-hidden="true"
          poster={posterOf(0)}
          className="absolute inset-0 size-full object-cover"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- swapped imperatively, above the video */}
        <img ref={coverRef} src={posterOf(0)} alt="" className="absolute inset-0 size-full object-cover transition-opacity" />
        <div className="absolute inset-0" style={{ backgroundImage: EDGES }} />
      </motion.div>
      {/* Loads the next scene's video ahead of time; never shown. */}
      <video ref={nextRef} muted playsInline preload="auto" aria-hidden="true" className="hidden" />
    </div>
  );
}
