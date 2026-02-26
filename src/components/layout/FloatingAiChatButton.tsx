import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Position = {
  x: number;
  y: number;
};

const BUTTON_SIZE = 56;
const EDGE_MARGIN = 12;
const LONG_PRESS_MS = 420;
const MOVE_CANCEL_THRESHOLD = 18;
const STORAGE_KEY = "targetx-floating-chat-position-v1";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getViewportSize = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

const getDefaultPosition = (width: number, height: number): Position => ({
  x: width - BUTTON_SIZE - EDGE_MARGIN,
  y: clamp(
    Math.round(height * 0.68),
    EDGE_MARGIN,
    height - BUTTON_SIZE - EDGE_MARGIN
  ),
});

const clampInsideViewport = (
  position: Position,
  width: number,
  height: number
): Position => ({
  x: clamp(position.x, EDGE_MARGIN, width - BUTTON_SIZE - EDGE_MARGIN),
  y: clamp(position.y, EDGE_MARGIN, height - BUTTON_SIZE - EDGE_MARGIN),
});

const snapToNearestEdge = (
  position: Position,
  width: number,
  height: number
): Position => {
  const clamped = clampInsideViewport(position, width, height);

  const leftX = EDGE_MARGIN;
  const rightX = width - BUTTON_SIZE - EDGE_MARGIN;
  const topY = EDGE_MARGIN;
  const bottomY = height - BUTTON_SIZE - EDGE_MARGIN;

  const distances = {
    left: Math.abs(clamped.x - leftX),
    right: Math.abs(rightX - clamped.x),
    top: Math.abs(clamped.y - topY),
    bottom: Math.abs(bottomY - clamped.y),
  };

  const nearest = Object.entries(distances).reduce((currentMin, next) =>
    next[1] < currentMin[1] ? next : currentMin
  )[0] as keyof typeof distances;

  switch (nearest) {
    case "left":
      return { x: leftX, y: clamped.y };
    case "right":
      return { x: rightX, y: clamped.y };
    case "top":
      return { x: clamped.x, y: topY };
    case "bottom":
      return { x: clamped.x, y: bottomY };
    default:
      return clamped;
  }
};

const readStoredPosition = (): Position | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<Position>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
      return null;
    }

    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
};

const persistPosition = (position: Position) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {
    // Ignore storage access errors (e.g. restricted mode).
  }
};

const resolveChatPath = (pathname: string): string => {
  const channelMatch = pathname.match(/^\/channel\/([^/]+)/);
  if (channelMatch?.[1]) {
    return `/channel/${channelMatch[1]}/ai-chat`;
  }
  return "/ai-chat";
};

const FloatingAiChatButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [position, setPosition] = useState<Position>(() => {
    if (typeof window === "undefined") {
      return { x: EDGE_MARGIN, y: EDGE_MARGIN };
    }

    const { width, height } = getViewportSize();
    const stored = readStoredPosition();
    const base = stored ?? getDefaultPosition(width, height);
    return snapToNearestEdge(base, width, height);
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [activePointerId, setActivePointerId] = useState<number | null>(null);

  const pointerIdRef = useRef<number | null>(null);
  const pressStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pressTimerRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const positionRef = useRef(position);

  const chatPath = useMemo(() => resolveChatPath(location.pathname), [location.pathname]);

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current === null) return;
    window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = null;
  }, []);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  const snapAndPersist = useCallback((nextPosition: Position) => {
    const { width, height } = getViewportSize();
    const snapped = snapToNearestEdge(nextPosition, width, height);
    setPosition(snapped);
    persistPosition(snapped);
  }, []);

  useEffect(() => {
    const onResize = () => {
      setPosition((prev) => {
        const { width, height } = getViewportSize();
        const snapped = snapToNearestEdge(prev, width, height);
        persistPosition(snapped);
        return snapped;
      });
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearPressTimer();
    };
  }, [clearPressTimer]);

  const handleNavigate = useCallback(() => {
    if (location.pathname === chatPath) {
      return;
    }
    navigate(chatPath);
  }, [chatPath, location.pathname, navigate]);

  const finishGesture = useCallback(
    (shouldNavigate: boolean) => {
      const wasDragging = isDraggingRef.current;

      clearPressTimer();
      pointerIdRef.current = null;
      pressStartRef.current = null;
      setActivePointerId(null);
      setIsPressing(false);

      if (wasDragging) {
        isDraggingRef.current = false;
        setIsDragging(false);
        snapAndPersist(positionRef.current);
        return;
      }

      if (shouldNavigate) {
        handleNavigate();
      }
    },
    [clearPressTimer, handleNavigate, snapAndPersist]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0 || pointerIdRef.current !== null) return;

      event.preventDefault();

      pointerIdRef.current = event.pointerId;
      setActivePointerId(event.pointerId);
      pressStartRef.current = { x: event.clientX, y: event.clientY };
      dragOffsetRef.current = {
        x: event.clientX - position.x,
        y: event.clientY - position.y,
      };

      setIsPressing(true);

      clearPressTimer();
      pressTimerRef.current = window.setTimeout(() => {
        setIsPressing(false);
        isDraggingRef.current = true;
        setIsDragging(true);

        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light");
      }, LONG_PRESS_MS);
    },
    [clearPressTimer, position.x, position.y]
  );

  useEffect(() => {
    if (activePointerId === null) return;

    const handleWindowPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;

      const start = pressStartRef.current;
      if (!start) return;

      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (!isDraggingRef.current && distance > MOVE_CANCEL_THRESHOLD) {
        clearPressTimer();
        setIsPressing(false);
      }

      if (!isDraggingRef.current) return;

      event.preventDefault();

      const { width, height } = getViewportSize();
      const nextPosition = clampInsideViewport(
        {
          x: event.clientX - dragOffsetRef.current.x,
          y: event.clientY - dragOffsetRef.current.y,
        },
        width,
        height
      );

      positionRef.current = nextPosition;
      setPosition(nextPosition);
    };

    const handleWindowPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;

      const start = pressStartRef.current;
      const moved =
        !!start &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) >
          MOVE_CANCEL_THRESHOLD;

      finishGesture(!moved);
    };

    const handleWindowPointerCancel = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      finishGesture(false);
    };

    window.addEventListener("pointermove", handleWindowPointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerCancel);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
    };
  }, [activePointerId, clearPressTimer, finishGesture]);

  const isActive = location.pathname === chatPath;

  return (
    <button
      type="button"
      aria-label="AI chat"
      title="AI chat"
      onPointerDown={handlePointerDown}
      onContextMenu={(event) => event.preventDefault()}
      className={`fixed z-[70] flex h-14 w-14 items-center justify-center rounded-full border text-white shadow-[0_12px_32px_-14px_rgba(14,165,233,0.75)] transition ${
        isActive
          ? "border-cyan-300/80 bg-cyan-500/35"
          : "border-cyan-400/40 bg-cyan-500/20"
      } ${isDragging ? "cursor-grabbing scale-105" : "cursor-grab"} ${isPressing ? "scale-95" : ""}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6">
        <path
          d="M4 6.5A2.5 2.5 0 0 1 6.5 4h7A2.5 2.5 0 0 1 16 6.5v4A2.5 2.5 0 0 1 13.5 13H9l-3.4 2.55A.4.4 0 0 1 5 15.2V13.9A2.5 2.5 0 0 1 4 11.5v-5Z"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
};

export default FloatingAiChatButton;
