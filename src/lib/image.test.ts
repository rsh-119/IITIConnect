import { describe, expect, it } from "vitest";
import { identifyItemImage } from "./image";

describe("item image signature checks", () => {
  it("accepts supported image signatures", () => {
    expect(identifyItemImage(new Uint8Array([255, 216, 255]))?.extension).toBe(
      "jpg",
    );
    expect(
      identifyItemImage(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))
        ?.extension,
    ).toBe("png");
    expect(
      identifyItemImage(
        new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]),
      )?.extension,
    ).toBe("webp");
  });

  it("rejects HTML and SVG even if a browser labels them as an image", () => {
    expect(identifyItemImage(new TextEncoder().encode("<html>"))).toBeNull();
    expect(identifyItemImage(new TextEncoder().encode("<svg>"))).toBeNull();
  });
});
