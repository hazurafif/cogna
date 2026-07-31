import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { saveToken, loadToken, clearToken } from "./token";

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

const storage = new Map<string, string>();
const webStorage = {
  getItem: jest.fn((key: string) => storage.get(key) ?? null),
  setItem: jest.fn((key: string, value: string) => {
    storage.set(key, value);
  }),
  removeItem: jest.fn((key: string) => {
    storage.delete(key);
  }),
  clear: jest.fn(() => storage.clear()),
  key: jest.fn(() => ""),
  length: 0,
};

(global as unknown as { localStorage: typeof webStorage }).localStorage = webStorage;

describe("token storage", () => {
  beforeEach(() => {
    storage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => jest.restoreAllMocks());

  it("stores and loads via secure store on native", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue("tok-1");
    await saveToken("tok-1");
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith("cogna_token", "tok-1");
    await expect(loadToken()).resolves.toBe("tok-1");
  });

  it("clears the token", async () => {
    await clearToken();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith("cogna_token");
  });

  it("does not touch localStorage on native", async () => {
    await clearToken();
    expect(webStorage.removeItem).not.toHaveBeenCalled();
  });

  it("uses localStorage on web", async () => {
    jest.replaceProperty(Platform, "OS", "web");
    await saveToken("web-token");
    expect(webStorage.setItem).toHaveBeenCalledWith("cogna_token", "web-token");
    expect(await loadToken()).toBe("web-token");
    await clearToken();
    expect(webStorage.removeItem).toHaveBeenCalledWith("cogna_token");
    expect(await loadToken()).toBeNull();
  });
});
