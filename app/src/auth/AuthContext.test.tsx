import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "./AuthContext";
import { fetchMe, login, register } from "../api/auth";
import { clearToken, loadToken } from "./token";

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

const mockedFetchMe = fetchMe as jest.Mock;
const mockedLogin = login as jest.Mock;
const mockedRegister = register as jest.Mock;
const mockedLoadToken = loadToken as jest.Mock;
const mockedClearToken = clearToken as jest.Mock;

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

  it("registers and stores the token", async () => {
    mockedLoadToken.mockResolvedValue(null);
    mockedRegister.mockResolvedValue({
      token: "reg-tok",
      user: { id: 2, email: "r@b.c", created_at: "2026-07-31T00:00:00" },
    });

    const { result } = await renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.register("r@b.c", "password123");
    });

    expect(result.current.user?.email).toBe("r@b.c");
    expect(result.current.token).toBe("reg-tok");
    expect(mockedRegister).toHaveBeenCalledWith("r@b.c", "password123");
  });

  it("bootstraps the user from a stored token", async () => {
    mockedLoadToken.mockResolvedValue("tok");
    mockedFetchMe.mockResolvedValue({
      user: { id: 3, email: "b@c.d", created_at: "2026-07-31T00:00:00" },
    });

    const { result } = await renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.token).toBe("tok");
    expect(result.current.user?.email).toBe("b@c.d");
    expect(mockedFetchMe).toHaveBeenCalledWith("tok");
  });

  it("clears an invalid stored token", async () => {
    mockedLoadToken.mockResolvedValue("bad");
    mockedFetchMe.mockRejectedValue(new Error("unauthorized"));

    const { result } = await renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedClearToken).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
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

  it("throws when used outside an AuthProvider", async () => {
    await expect(renderHook(() => useAuth())).rejects.toThrow(
      "useAuth must be used within AuthProvider",
    );
  });
});
