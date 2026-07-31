import * as SecureStore from "expo-secure-store";
import { saveToken, loadToken, clearToken } from "./token";

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe("token storage", () => {
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
});
