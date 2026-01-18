import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
} from "react";

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  height?: string;
  maxHeight?: string;
  closeThresholdPx?: number;
  scrollRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
};

const CLOSE_DURATION_MS = 320;
const SNAP_THRESHOLD = 60;

const BottomSheet = ({
  isOpen,
  onClose,
  title,
  height = "95dvh",
  maxHeight,
  closeThresholdPx,
  scrollRef,
  children,
  bodyClassName = "",
  className = "",
}: BottomSheetProps) => {
  const sheetRef = useRef<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const startYRef = useRef(0);
  const startOffsetRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);
  const activeTouchIdRef = useRef<number | null>(null);
  const pendingTouchRef = useRef<{
    id: number;
    startY: number;
    allowDrag: boolean;
  } | null>(null);
  const isDragEnabledRef = useRef(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const baseOffsetRef = useRef(0);
  const maxHeightRef = useRef(0);
  const translateYRef = useRef(0);

  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  const maxHeightValue = maxHeight ?? height;
  const effectiveThreshold = closeThresholdPx ?? SNAP_THRESHOLD;

  const setTranslate = useCallback((value: number) => {
    translateYRef.current = value;
    setTranslateY(value);
  }, []);

  const resolveLength = useCallback((value: string) => {
    const trimmed = value.trim();
    const numeric = Number.parseFloat(trimmed);
    if (Number.isNaN(numeric)) {
      return null;
    }

    if (trimmed.endsWith("px")) {
      return numeric;
    }

    if (
      trimmed.endsWith("dvh") ||
      trimmed.endsWith("vh") ||
      trimmed.endsWith("svh") ||
      trimmed.endsWith("lvh") ||
      trimmed.endsWith("%")
    ) {
      return (window.innerHeight * numeric) / 100;
    }

    if (trimmed.endsWith("rem")) {
      const rootSize = Number.parseFloat(
        window.getComputedStyle(document.documentElement).fontSize || "16"
      );
      return numeric * (Number.isNaN(rootSize) ? 16 : rootSize);
    }

    return null;
  }, []);

  const measureHeights = useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) {
      return null;
    }

    const resolvedMax = resolveLength(maxHeightValue);
    const resolvedBase = resolveLength(height);
    const maxPx = resolvedMax ?? sheet.getBoundingClientRect().height;
    const basePx = resolvedBase ?? maxPx;
    const safeBase = Math.min(basePx, maxPx);
    const baseOffset = Math.max(maxPx - safeBase, 0);

    baseOffsetRef.current = baseOffset;
    maxHeightRef.current = maxPx;

    return { baseOffset, maxPx };
  }, [height, maxHeightValue, resolveLength]);

  const clearTimers = useCallback(() => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const finalizeClose = useCallback(() => {
    clearTimers();
    onClose();
  }, [clearTimers, onClose]);

  const animateTo = useCallback(
    (target: number) => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = window.requestAnimationFrame(() => {
        setTranslate(target);
        rafRef.current = null;
      });
    },
    [setTranslate]
  );

  const requestClose = useCallback(
    (startFrom?: number) => {
      if (isClosing) {
        return;
      }

      const closeOffset = maxHeightRef.current;

      setIsClosing(true);
      setIsDragging(false);
      isDragEnabledRef.current = false;

      clearTimers();

      if (typeof startFrom === "number") {
        setTranslate(startFrom);
      }

      animateTo(closeOffset);

      closeTimeoutRef.current = window.setTimeout(() => {
        finalizeClose();
      }, CLOSE_DURATION_MS + 40);
    },
    [animateTo, clearTimers, finalizeClose, isClosing, setTranslate]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        requestClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, requestClose]);

  useEffect(() => {
    if (!isOpen) {
      setTranslate(0);
      setIsDragging(false);
      setIsClosing(false);
      setIsEntering(false);
      isDragEnabledRef.current = false;
      activePointerIdRef.current = null;
      activeTouchIdRef.current = null;
      pendingTouchRef.current = null;
      clearTimers();
      return;
    }

    const handleResize = () => {
      if (isDragging || isClosing) {
        return;
      }

      const measured = measureHeights();
      if (!measured) {
        return;
      }

      const { baseOffset } = measured;
      const current = translateYRef.current;
      const target = baseOffset > 0 && current < baseOffset * 0.5 ? 0 : baseOffset;
      animateTo(target);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [animateTo, clearTimers, isClosing, isDragging, isOpen, measureHeights, setTranslate]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    const measured = measureHeights();
    if (!measured) {
      return;
    }

    const { baseOffset, maxPx } = measured;
    setIsEntering(true);
    setTranslate(maxPx);

    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = window.requestAnimationFrame(() => {
      setIsEntering(false);
      setTranslate(baseOffset);
      rafRef.current = null;
    });
  }, [isOpen, measureHeights, setTranslate]);

  const beginDrag = useCallback(
    (startY: number) => {
      if (isClosing) {
        return false;
      }

      const scrollContainer = scrollRef?.current ?? bodyRef.current;
      if (scrollContainer && scrollContainer.scrollTop > 1) {
        return false;
      }

      startYRef.current = startY;
      startOffsetRef.current = translateYRef.current;
      isDragEnabledRef.current = true;
      setIsDragging(true);
      return true;
    },
    [isClosing]
  );

  const moveDrag = useCallback(
    (clientY: number) => {
      if (!isDragEnabledRef.current) {
        return;
      }

      const delta = clientY - startYRef.current;
      const minOffset = 0;
      const maxOffset = maxHeightRef.current;
      let nextOffset = startOffsetRef.current + delta;

      if (nextOffset < minOffset) {
        nextOffset = minOffset;
      }

      if (maxOffset && nextOffset > maxOffset) {
        nextOffset = maxOffset;
      }

      setTranslate(nextOffset);
    },
    [setTranslate]
  );

  const endDrag = useCallback(
    (clientY: number) => {
      if (!isDragEnabledRef.current) {
        return;
      }

      const delta = clientY - startYRef.current;
      const baseOffset = baseOffsetRef.current;
      const finalOffset = startOffsetRef.current + delta;
      const closeThreshold = baseOffset + effectiveThreshold;
      const openThreshold = baseOffset - effectiveThreshold;

      isDragEnabledRef.current = false;
      setIsDragging(false);

      if (finalOffset > closeThreshold) {
        requestClose(finalOffset);
        return;
      }

      if (baseOffset === 0) {
        animateTo(0);
        return;
      }

      if (finalOffset < openThreshold) {
        animateTo(0);
        return;
      }

      animateTo(baseOffset);
    },
    [animateTo, effectiveThreshold, requestClose]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const sheet = sheetRef.current;
    if (!sheet) {
      return;
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (activeTouchIdRef.current !== null || activePointerIdRef.current) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const scrollContainer = scrollRef?.current ?? bodyRef.current;
      pendingTouchRef.current = {
        id: touch.identifier,
        startY: touch.clientY,
        allowDrag: !scrollContainer || scrollContainer.scrollTop <= 1,
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      const activeId = activeTouchIdRef.current;
      if (activeId !== null) {
        const touch = Array.from(event.touches).find(
          (item) => item.identifier === activeId
        );

        if (!touch) {
          return;
        }

        moveDrag(touch.clientY);
        if (event.cancelable) {
          event.preventDefault();
        }
        return;
      }

      const pending = pendingTouchRef.current;
      if (!pending) {
        return;
      }

      const touch = Array.from(event.touches).find(
        (item) => item.identifier === pending.id
      );

      if (!touch) {
        return;
      }

      if (!pending.allowDrag) {
        return;
      }

      const deltaY = touch.clientY - pending.startY;
      const hasMovement = Math.abs(deltaY) > 4;
      const scrollContainer = scrollRef?.current ?? bodyRef.current;
      const isAtTop = !scrollContainer || scrollContainer.scrollTop <= 1;
      const canDragDown = deltaY > 0 && isAtTop;
      const canDragUp = deltaY < 0 && isAtTop && translateYRef.current > 0;

      if (!hasMovement || (!canDragDown && !canDragUp)) {
        return;
      }

      if (!beginDrag(pending.startY)) {
        return;
      }

      activeTouchIdRef.current = pending.id;
      pendingTouchRef.current = null;
      moveDrag(touch.clientY);
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const activeId = activeTouchIdRef.current;
      if (activeId !== null) {
        const touch = Array.from(event.changedTouches).find(
          (item) => item.identifier === activeId
        );

        if (!touch) {
          return;
        }

        activeTouchIdRef.current = null;
        endDrag(touch.clientY);
        return;
      }

      const pending = pendingTouchRef.current;
      if (!pending) {
        return;
      }

      const touch = Array.from(event.changedTouches).find(
        (item) => item.identifier === pending.id
      );

      if (!touch) {
        return;
      }

      pendingTouchRef.current = null;
    };

    sheet.addEventListener("touchstart", handleTouchStart, { passive: false });
    sheet.addEventListener("touchmove", handleTouchMove, { passive: false });
    sheet.addEventListener("touchend", handleTouchEnd);
    sheet.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      sheet.removeEventListener("touchstart", handleTouchStart);
      sheet.removeEventListener("touchmove", handleTouchMove);
      sheet.removeEventListener("touchend", handleTouchEnd);
      sheet.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [beginDrag, endDrag, isOpen, moveDrag]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }

    if (activePointerIdRef.current !== null || activeTouchIdRef.current) {
      return;
    }

    if (!beginDrag(event.clientY)) {
      return;
    }

    activePointerIdRef.current = event.pointerId;
    sheetRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    moveDrag(event.clientY);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    sheetRef.current?.releasePointerCapture(event.pointerId);
    activePointerIdRef.current = null;
    endDrag(event.clientY);
  };

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-950/70 backdrop-blur-sm"
        onClick={() => requestClose()}
        aria-label="Close modal"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={sheetRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTransitionEnd={(event) => {
          if (isClosing && event.propertyName === "transform") {
            finalizeClose();
          }
        }}
        className={`relative z-10 flex w-full max-w-md flex-col rounded-t-3xl border border-slate-800/70 bg-slate-900/95 shadow-[0_-20px_45px_-30px_rgba(15,23,42,0.9)] backdrop-blur sm:max-w-xl lg:max-w-3xl ${isDragging || isEntering ? "transition-none" : "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"} ${className}`}
        style={{
          height: maxHeightValue,
          maxHeight: maxHeightValue,
          transform: `translateY(${translateY}px)`,
        }}
      >
        <div className="flex items-center justify-center mx-auto border-b border-slate-800/60 px-16 py-3">
          <div className="grid text-center gap-2">
            <span className="h-1 w-14 mx-auto rounded-full bg-slate-700/80" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
              {title}
            </h2>
          </div>
        </div>
        <div
          ref={bodyRef}
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4 ${bodyClassName}`}
        >
          {children}
        </div>
      </section>
    </div>,
    document.body
  );
};

export default BottomSheet;
