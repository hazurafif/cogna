import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { FeedScreen } from "./FeedScreen";
import { useAuth } from "../auth/AuthContext";
import {
  addKudos,
  fetchFeed,
  fetchFollowing,
  fetchLeaderboard,
  followUser,
  removeKudos,
  searchUsers,
  unfollowUser,
} from "../api/social";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/social", () => ({
  fetchFeed: jest.fn(),
  fetchFollowing: jest.fn(),
  fetchLeaderboard: jest.fn(),
  searchUsers: jest.fn(),
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
  addKudos: jest.fn(),
  removeKudos: jest.fn(),
}));
jest.mock("expo-router", () => {
  const React = require("react");
  return { useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]) };
});

const mockUseAuth = useAuth as jest.Mock;
const mockFetchFeed = fetchFeed as jest.Mock;
const mockFetchFollowing = fetchFollowing as jest.Mock;
const mockFetchLeaderboard = fetchLeaderboard as jest.Mock;
const mockSearchUsers = searchUsers as jest.Mock;
const mockFollowUser = followUser as jest.Mock;
const mockUnfollowUser = unfollowUser as jest.Mock;
const mockAddKudos = addKudos as jest.Mock;
const mockRemoveKudos = removeKudos as jest.Mock;

function session(id: number, userId: number, subject: string, minutes: number) {
  return {
    id, user_id: userId, subject_id: 1, subject_name: subject, subject_icon: "book-open",
    started_at: "2026-07-31T09:00:00", ended_at: "2026-07-31T09:00:00",
    duration_minutes: minutes, source: "timer" as const, note: null, created_at: "",
  };
}

function feedItem(id: number, userId: number, name: string, subject: string, minutes: number) {
  return {
    session: session(id, userId, subject, minutes),
    user: { id: userId, email: `${name.toLowerCase()}@example.com`, name, created_at: "" },
    kudos_count: 0,
    kudos_by_me: false,
  };
}

describe("FeedScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      token: "tok",
      user: { id: 1, email: "me@example.com", name: "Me", created_at: "" },
    });
    mockFetchFeed.mockResolvedValue({ items: [] });
    mockFetchFollowing.mockResolvedValue({ following: [] });
    mockFetchLeaderboard.mockResolvedValue({ entries: [] });
    mockSearchUsers.mockResolvedValue({ users: [] });
  });

  it("shows the feed with names, subjects and kudos counts", async () => {
    mockFetchFeed.mockResolvedValue({
      items: [
        { ...feedItem(11, 2, "Bob", "math", 90), kudos_count: 3, kudos_by_me: true },
        feedItem(12, 1, "Me", "reading", 45),
      ],
    });

    const { getByText } = await render(<FeedScreen />);

    await waitFor(() => expect(getByText("Bob")).toBeTruthy());
    expect(getByText(/you/)).toBeTruthy();
    expect(getByText(/1h 30m/)).toBeTruthy();
    expect(getByText("3")).toBeTruthy();
  });

  it("toggles kudos optimistically and rolls back on failure", async () => {
    mockFetchFeed.mockResolvedValue({ items: [feedItem(21, 2, "Bob", "math", 60)] });
    mockAddKudos.mockResolvedValue({ kudos: true });

    const { getByTestId, getByText } = await render(<FeedScreen />);
    await waitFor(() => expect(getByTestId("kudos-21")).toBeTruthy());

    await fireEvent.press(getByTestId("kudos-21"));
    await waitFor(() => expect(mockAddKudos).toHaveBeenCalledWith("tok", 21));
    expect(getByText("1")).toBeTruthy();

    mockRemoveKudos.mockRejectedValueOnce(new Error("boom"));
    await fireEvent.press(getByTestId("kudos-21"));
    await waitFor(() => expect(getByText(/could not update kudos/i)).toBeTruthy());
    expect(getByText("1")).toBeTruthy();
  });

  it("does not allow kudos on your own session", async () => {
    mockFetchFeed.mockResolvedValue({ items: [feedItem(31, 1, "Me", "math", 60)] });

    const { getByTestId } = await render(<FeedScreen />);
    await waitFor(() => expect(getByTestId("kudos-31")).toBeTruthy());
    await fireEvent.press(getByTestId("kudos-31"));
    expect(mockAddKudos).not.toHaveBeenCalled();
  });

  it("searches, follows and unfollows friends", async () => {
    const bob = { id: 2, email: "bob@example.com", name: "Bob", created_at: "", is_following: false, weekly_minutes: 0 };
    mockSearchUsers.mockResolvedValue({ users: [bob] });
    mockFollowUser.mockResolvedValue({ following: true });

    const { getByTestId, getByText } = await render(<FeedScreen />);
    await fireEvent.press(getByTestId("segment-friends"));

    await waitFor(() => expect(getByTestId("friend-search-input")).toBeTruthy());
    await fireEvent.changeText(getByTestId("friend-search-input"), "bob@example.com");
    await fireEvent(getByTestId("friend-search-input"), "submitEditing");

    await waitFor(() => expect(getByText("Bob")).toBeTruthy());
    await fireEvent.press(getByTestId("follow-2"));
    await waitFor(() => expect(mockFollowUser).toHaveBeenCalledWith("tok", 2));
    expect(getByText("Unfollow")).toBeTruthy();

    mockUnfollowUser.mockResolvedValue({ following: false });
    await fireEvent.press(getByTestId("follow-2"));
    await waitFor(() => expect(mockUnfollowUser).toHaveBeenCalledWith("tok", 2));
  });

  it("shows the weekly leaderboard with the self row", async () => {
    mockFetchLeaderboard.mockResolvedValue({
      entries: [
        { id: 2, email: "bob@example.com", name: "Bob", created_at: "", minutes: 300, is_self: false },
        { id: 1, email: "me@example.com", name: "Me", created_at: "", minutes: 120, is_self: true },
      ],
    });

    const { getByTestId, getByText } = await render(<FeedScreen />);
    await fireEvent.press(getByTestId("segment-friends"));

    await waitFor(() => expect(getByText("#1")).toBeTruthy());
    expect(getByText("5h")).toBeTruthy();
    expect(getByText("2h")).toBeTruthy();
    expect(getByText(/you/)).toBeTruthy();
  });

  it("shows an empty state without a feed", async () => {
    const { getByText } = await render(<FeedScreen />);

    await waitFor(() => expect(getByText("No activity yet")).toBeTruthy());
    expect(getByText(/Friends tab/i)).toBeTruthy();
  });
});
