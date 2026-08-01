import { apiUrl } from "./config";

describe("apiUrl", () => {
  it("defaults to port 8080 on localhost", () => {
    expect(apiUrl({})).toBe("http://localhost:8080");
  });

  it("uses the port from the shared backend env", () => {
    expect(apiUrl({ EXPO_PUBLIC_API_PORT: "8069" })).toBe("http://localhost:8069");
  });

  it("lets an explicit API URL win", () => {
    expect(
      apiUrl({ EXPO_PUBLIC_API_URL: "https://api.example.com", EXPO_PUBLIC_API_PORT: "8069" }),
    ).toBe("https://api.example.com");
  });
});
