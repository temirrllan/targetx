import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

type ElasticListProps = {
  children: ReactNode;
  className?: string;
  maxStretchPx?: number;
};

const ElasticList = forwardRef<HTMLDivElement, ElasticListProps>(
  ({ children, className = "", maxStretchPx = 80 }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const activeTouchIdRef = useRef<number | null>(null);
    const startYRef = useRef(0);
    const isElasticRef = useRef(false);
    const rafRef = useRef<number | null>(null);
    const pendingOffsetRef = useRef(0);

    const [offset, setOffset] = useState(0);
    const [isElastic, setIsElastic] = useState(false);

    useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

    const scheduleOffset = useCallback((value: number) => {
      pendingOffsetRef.current = value;
      if (rafRef.current) {
        return;
      }

      rafRef.current = window.requestAnimationFrame(() => {
        setOffset(pendingOffsetRef.current);
        rafRef.current = null;
      });
    }, []);

    const setElastic = useCallback((nextValue: boolean) => {
      isElasticRef.current = nextValue;
      setIsElastic(nextValue);
    }, []);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const handleTouchStart = (event: TouchEvent) => {
        const touch = event.touches[0];
        if (!touch) {
          return;
        }

        activeTouchIdRef.current = touch.identifier;
        startYRef.current = touch.clientY;
      };

      const handleTouchMove = (event: TouchEvent) => {
        const activeId = activeTouchIdRef.current;
        if (activeId === null) {
          return;
        }

        const touch = Array.from(event.touches).find(
          (item) => item.identifier === activeId
        );

        if (!touch) {
          return;
        }

        const deltaY = touch.clientY - startYRef.current;
        const scrollTop = container.scrollTop;
        const maxScroll = container.scrollHeight - container.clientHeight;
        const atTop = scrollTop <= 0;
        const atBottom = maxScroll <= 1 || scrollTop >= maxScroll - 1;
        const shouldStretch =
          (atTop && deltaY > 0) || (atBottom && deltaY < 0);

        if (!shouldStretch) {
          if (isElasticRef.current) {
            setElastic(false);
            scheduleOffset(0);
          }
          return;
        }

        if (!isElasticRef.current) {
          setElastic(true);
          startYRef.current = touch.clientY;
        }

        const nextOffset = Math.max(
          -maxStretchPx,
          Math.min(maxStretchPx, deltaY * 0.35)
        );

        scheduleOffset(nextOffset);
        if (event.cancelable) {
          event.preventDefault();
        }
      };

      const handleTouchEnd = (event: TouchEvent) => {
        if (activeTouchIdRef.current === null) {
          return;
        }

        const touch = Array.from(event.changedTouches).find(
          (item) => item.identifier === activeTouchIdRef.current
        );

        if (!touch) {
          return;
        }

        activeTouchIdRef.current = null;

        if (isElasticRef.current) {
          setElastic(false);
          scheduleOffset(0);
        }
      };

      container.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
      container.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      container.addEventListener("touchend", handleTouchEnd);
      container.addEventListener("touchcancel", handleTouchEnd);

      return () => {
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouchMove);
        container.removeEventListener("touchend", handleTouchEnd);
        container.removeEventListener("touchcancel", handleTouchEnd);
      };
    }, [maxStretchPx, scheduleOffset, setElastic]);

    useEffect(() => {
      return () => {
        if (rafRef.current) {
          window.cancelAnimationFrame(rafRef.current);
        }
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={`overflow-y-auto overscroll-contain ${isElastic ? "transition-none" : "transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"} ${className}`}
        style={{ transform: `translateY(${offset}px)` }}
      >
        {children}
      </div>
    );
  }
);

ElasticList.displayName = "ElasticList";

export default ElasticList;
