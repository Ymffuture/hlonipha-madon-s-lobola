import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { RsvpForm } from "@/components/invite/RsvpForm";
import type { EventSettings } from "@/lib/event";

// framer-motion's whileInView needs this; jsdom doesn't provide it.
beforeAll(() => {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
});

const settings = {
  max_guests: 5,
  rsvp_contact: "072 345 6789",
  couple_names: "H & M",
  event_name: "Lobola",
} as unknown as EventSettings;

describe("RsvpForm guest dropdown", () => {
  it("offers 1..max_guests taken from the settings prop", () => {
    render(<RsvpForm settings={settings} />);
    // The dropdown only appears once the guest says they are attending (first radio).
    fireEvent.click(screen.getAllByRole("radio")[0]);
    const select = screen.getByLabelText(/number of guests/i) as HTMLSelectElement;
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("shows the live 'Incomplete · 1 of 2' label when 3 guests but only 1 name", () => {
    render(<RsvpForm settings={settings} />);
    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.change(screen.getByLabelText(/number of guests/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/additional guest names/i), {
      target: { value: "Tsakani" },
    });
    expect(screen.getAllByText(/Incomplete · 1 of 2/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText(/additional guest names/i), {
      target: { value: "Tsakani, Rhulani" },
    });
    expect(screen.getByText(/Complete · 2 of 2/)).toBeInTheDocument();
  });
});
