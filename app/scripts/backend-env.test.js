const { parseEnv } = require("./backend-env");

describe("parseEnv", () => {
  it("parses key=value lines", () => {
    expect(parseEnv("PORT=8069\nDATABASE_PATH=data/cogna.db")).toEqual({
      PORT: "8069",
      DATABASE_PATH: "data/cogna.db",
    });
  });

  it("ignores comments and blank lines", () => {
    expect(parseEnv("# comment\n\nPORT=8080\n")).toEqual({ PORT: "8080" });
  });

  it("strips inline comments", () => {
    expect(parseEnv("PORT=8080 # default port")).toEqual({ PORT: "8080" });
  });

  it("strips surrounding quotes", () => {
    expect(parseEnv('JWT_SECRET="abc def"\nPORT=\'8069\'')).toEqual({
      JWT_SECRET: "abc def",
      PORT: "8069",
    });
  });

  it("skips malformed lines", () => {
    expect(parseEnv("NOT_A_VAR\nPORT=8080")).toEqual({ PORT: "8080" });
  });
});
