import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLongPress } from "@/hooks/use-long-press";

// jsdom has no PointerEvent, so coordinates/pointerType would be dropped. Minimal stand-in:
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerType: string;
    constructor(type: string, init: MouseEventInit & { pointerType?: string } = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? "mouse";
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

function Row({ onLong, onTap }: { onLong: () => void; onTap: () => void }) {
  const { handlers } = useLongPress(onLong, onTap, { ms: 500 });
  return <button {...handlers}>row</button>;
}

describe("useLongPress", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    const onLong = vi.fn();
    const onTap = vi.fn();
    render(<Row onLong={onLong} onTap={onTap} />);
    return { onLong, onTap, el: screen.getByText("row") };
  };

  it("a quick tap only calls onTap", () => {
    const { onLong, onTap, el } = setup();
    fireEvent.pointerDown(el, { pointerType: "touch", clientX: 5, clientY: 5 });
    act(() => void vi.advanceTimersByTime(150));
    fireEvent.pointerUp(el, { pointerType: "touch" });
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onLong).not.toHaveBeenCalled();
  });

  it("holding for 500ms calls onLongPress and not onTap", () => {
    const { onLong, onTap, el } = setup();
    fireEvent.pointerDown(el, { pointerType: "touch", clientX: 5, clientY: 5 });
    act(() => void vi.advanceTimersByTime(520));
    fireEvent.pointerUp(el, { pointerType: "touch" });
    expect(onLong).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
  });

  it("moving more than the tolerance (scrolling) cancels the press", () => {
    const { onLong, onTap, el } = setup();
    fireEvent.pointerDown(el, { pointerType: "touch", clientX: 5, clientY: 5 });
    fireEvent.pointerMove(el, { pointerType: "touch", clientX: 5, clientY: 40 });
    act(() => void vi.advanceTimersByTime(800));
    fireEvent.pointerUp(el, { pointerType: "touch" });
    expect(onLong).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
  });

  it("right-click / context menu key opens actions once", () => {
    const { onLong, el } = setup();
    fireEvent.contextMenu(el);
    expect(onLong).toHaveBeenCalledTimes(1);
  });

  it("long press followed by the OS context-menu event does not fire twice", () => {
    const { onLong, el } = setup();
    fireEvent.pointerDown(el, { pointerType: "touch", clientX: 5, clientY: 5 });
    act(() => void vi.advanceTimersByTime(520));
    fireEvent.contextMenu(el);
    expect(onLong).toHaveBeenCalledTimes(1);
  });

  it("Enter views the row", () => {
    const { onTap, el } = setup();
    fireEvent.keyDown(el, { key: "Enter" });
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
