import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const dirs = ["src/screens", "src/components", "src/app"];

describe("theme hygiene", () => {
  it("has no raw hex colors outside the theme module", () => {
    const offenders: string[] = [];
    for (const dir of dirs) {
      const absolute = join(process.cwd(), dir);
      for (const file of readdirSync(absolute, { recursive: true }) as string[]) {
        if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
        if (file.endsWith(".test.tsx") || file.endsWith(".test.ts")) continue;
        const content = readFileSync(join(absolute, file), "utf8");
        const lines = content.split("\n");
        lines.forEach((line, i) => {
          if (/#[0-9A-Fa-f]{6}/.test(line)) {
            offenders.push(`${dir}/${file}:${i + 1}`);
          }
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});
