import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "./AuthContext";
import { login } from "../api/auth";
import { loadToken } from "./token";

jest.mock("../api/auth", () => ({
  fetchMe: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
}));
jest.mock("./token", () => ({
  loadToken: jest.fn(),
  saveToken: jest.fn(),
  clearToken: jest.fn(),
}));

const mockedLogin = login as jest.Mock;
const mockedLoadToken = loadToken as jest.Mock;

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("logs in and stores the token", async () => {
    mockedLoadToken.mockResolvedValue(null);
    mockedLogin.mockResolvedValue({
      token: "tok",
      user: { id: 1, email: "a@b.c", created_at: "2026-07-31T00:00:00" },
    });

    const { result } = await renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login("a@b.c", "password123");
    });

    expect(result.current.user?.email).toBe("a@b.c");
    expect(result.current.token).toBe("tok");
    expect(mockedLogin).toHaveBeenCalledWith("a@b.c", "password123");
  });

  it("logs out and clears state", async () => {
    mockedLoadToken.mockResolvedValue(null);

    const { result } = await renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });
});
