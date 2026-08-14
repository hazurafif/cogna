import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import {
  Heart,
  Search,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import {
  addKudos,
  fetchFeed,
  fetchFollowing,
  fetchLeaderboard,
  FeedItem,
  followUser,
  LeaderboardEntry,
  removeKudos,
  searchUsers,
  unfollowUser,
  UserFollow,
} from "../api/social";
import { Screen } from "../components/Screen";
import { SubjectIcon } from "../components/SubjectIcon";
import { subjectLabel } from "../constants/subjectIcons";
import { Button as BnaButton } from "../components/ui/button";
import { Icon } from "../components/ui/icon";
import { Input } from "../components/ui/input";
import { ScrollView } from "../components/ui/scroll-view";
import { Text } from "../components/ui/text";
import { View } from "../components/ui/view";
import { AppColors, useAppColors } from "../hooks/useAppColors";
import { appFonts } from "../theme/fonts";
import { fontSize, radius, spacing } from "../theme/tokens";
import { formatDuration, formatMinutes } from "../utils/time";

type Segment = "feed" | "friends";

function initialOf(nameOrEmail: string): string {
  return nameOrEmail.trim().charAt(0).toUpperCase() || "?";
}

function displayName(u: { name: string; email: string }): string {
  return u.name?.trim() || u.email;
}

function formatTime(startedAt: string): string {
  const [date, time] = startedAt.split("T");
  if (!time) return date.slice(5);
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export function FeedScreen() {
  const { token, user } = useAuth();
  const [segment, setSegment] = useState<Segment>("feed");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [following, setFollowing] = useState<UserFollow[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserFollow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const c = useAppColors();
  const styles = makeStyles(c);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setItems((await fetchFeed(token)).items);
    } catch {
      setError("Could not load the feed.");
    }
    try {
      setEntries((await fetchLeaderboard(token)).entries);
    } catch {
      setEntries([]);
    }
    try {
      setFollowing((await fetchFollowing(token)).following);
    } catch {
      setFollowing([]);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onSearch = async () => {
    if (!token || query.trim() === "") return;
    try {
      setResults((await searchUsers(token, query.trim())).users);
      setError(null);
    } catch {
      setError("Could not search users.");
    }
  };

  const toggleFollow = async (friend: UserFollow) => {
    if (!token) return;
    try {
      if (friend.is_following) {
        await unfollowUser(token, friend.id);
      } else {
        await followUser(token, friend.id);
      }
      setResults((prev) =>
        prev ? prev.map((u) => (u.id === friend.id ? { ...u, is_following: !u.is_following } : u)) : prev,
      );
      refresh();
    } catch {
      setError("Could not update follow state.");
    }
  };

  const toggleKudos = async (item: FeedItem) => {
    if (!token || item.session.user_id === user?.id) return;
    const previous = { count: item.kudos_count, mine: item.kudos_by_me };
    setItems((prev) =>
      prev.map((it) =>
        it.session.id === item.session.id
          ? {
              ...it,
              kudos_count: it.kudos_by_me ? it.kudos_count - 1 : it.kudos_count + 1,
              kudos_by_me: !it.kudos_by_me,
            }
          : it,
      ),
    );
    try {
      if (previous.mine) {
        await removeKudos(token, item.session.id);
      } else {
        await addKudos(token, item.session.id);
      }
      setError(null);
    } catch {
      setItems((prev) =>
        prev.map((it) =>
          it.session.id === item.session.id
            ? { ...it, kudos_count: previous.count, kudos_by_me: previous.mine }
            : it,
        ),
      );
      setError("Could not update kudos.");
    }
  };

  return (
    <Screen title="Social">
      {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}
      <View
        style={[
          styles.segmentWrap,
          { backgroundColor: c.surfaceElevated, borderColor: c.border },
        ]}
      >
        {(["feed", "friends"] as const).map((seg) => (
          <Pressable
            key={seg}
            onPress={() => setSegment(seg)}
            style={[
              styles.segmentBtn,
              segment === seg && { backgroundColor: c.primary },
            ]}
            testID={`segment-${seg}`}
          >
            <Text
              style={[
                styles.segmentLabel,
                { color: segment === seg ? c.onPrimary : c.textSecondary },
              ]}
            >
              {seg === "feed" ? "Feed" : "Friends"}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {segment === "feed" ? (
          <FeedList items={items} myId={user?.id} onKudos={toggleKudos} />
        ) : (
          <FriendsPanel
            entries={entries}
            following={following}
            query={query}
            setQuery={setQuery}
            results={results}
            onSearch={onSearch}
            onToggleFollow={toggleFollow}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

function FeedList({
  items,
  myId,
  onKudos,
}: {
  items: FeedItem[];
  myId?: number;
  onKudos: (item: FeedItem) => void;
}) {
  const c = useAppColors();
  const styles = makeStyles(c);

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: c.surfaceElevated }]}>
          <Icon name={Users} size={26} strokeWidth={2} color={c.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No activity yet</Text>
        <Text style={[styles.emptyBody, { color: c.textMuted }]}>
          Follow friends in the Friends tab to see their study sessions here.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.feedList}>
      {items.map((item) => {
        const mine = item.session.user_id === myId;
        return (
          <View
            key={item.session.id}
            style={[styles.feedCard, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}
            testID={`feed-item-${item.session.id}`}
          >
            <View style={styles.feedHeader}>
              <View style={[styles.avatar, { backgroundColor: c.primary }]}>
                <Text style={[styles.avatarText, { color: c.onPrimary }]}>
                  {initialOf(displayName(item.user))}
                </Text>
              </View>
              <View style={styles.feedIdentity}>
                <Text style={styles.feedName}>
                  {displayName(item.user)}
                  {mine ? <Text style={[styles.youBadge, { color: c.primary }]}> · you</Text> : null}
                </Text>
                <Text style={[styles.feedMeta, { color: c.textMuted }]}>
                  {formatTime(item.session.started_at)} · {formatDuration(item.session.duration_minutes)}
                </Text>
              </View>
              <View style={[styles.iconChip, { backgroundColor: c.primarySoft }]}>
                <SubjectIcon name={item.session.subject_icon} size={14} />
              </View>
            </View>
            <Text style={[styles.feedSubject, { color: c.textSecondary }]}>
              {subjectLabel(item.session.subject_name)}
              {item.session.note ? ` — ${item.session.note}` : ""}
            </Text>
            <View style={styles.kudosRow}>
              <Pressable
                onPress={() => onKudos(item)}
                disabled={mine}
                hitSlop={8}
                style={[styles.kudosBtn, mine && styles.kudosDisabled]}
                testID={`kudos-${item.session.id}`}
              >
                <Icon
                  name={Heart}
                  size={16}
                  strokeWidth={2.2}
                  color={item.kudos_by_me ? c.primary : c.textMuted}
                />
                <Text
                  style={[
                    styles.kudosCount,
                    { color: item.kudos_by_me ? c.primary : c.textMuted },
                  ]}
                >
                  {String(item.kudos_count)}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function FriendsPanel({
  entries,
  following,
  query,
  setQuery,
  results,
  onSearch,
  onToggleFollow,
}: {
  entries: LeaderboardEntry[];
  following: UserFollow[];
  query: string;
  setQuery: (q: string) => void;
  results: UserFollow[] | null;
  onSearch: () => void;
  onToggleFollow: (u: UserFollow) => void;
}) {
  const c = useAppColors();
  const styles = makeStyles(c);

  return (
    <View style={styles.friendsContent}>
      <View style={[styles.card, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <Icon name={Trophy} size={16} strokeWidth={2.2} color={c.primary} />
          <Text style={styles.cardTitle}>This week</Text>
        </View>
        {entries.length === 0 ? (
          <Text style={[styles.cardHint, { color: c.textMuted }]}>
            Follow friends to compare your study time.
          </Text>
        ) : (
          entries.slice(0, 5).map((e, i) => (
            <View
              key={e.id}
              style={[
                styles.rankRow,
                e.is_self && [styles.rankRowSelf, { backgroundColor: c.primarySoft }],
              ]}
            >
              <Text style={[styles.rankPos, { color: c.textMuted }]}>#{i + 1}</Text>
              <View style={[styles.rankAvatar, { backgroundColor: c.primary }]}>
                <Text style={[styles.rankAvatarText, { color: c.onPrimary }]}>
                  {initialOf(displayName(e))}
                </Text>
              </View>
              <Text style={styles.rankName}>
                {displayName(e)}
                {e.is_self ? <Text style={[styles.youBadge, { color: c.primary }]}> · you</Text> : null}
              </Text>
              <Text style={styles.rankMinutes}>{formatMinutes(e.minutes)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={[styles.card, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <Icon name={Search} size={16} strokeWidth={2.2} color={c.primary} />
          <Text style={styles.cardTitle}>Find friends</Text>
        </View>
        <Input
          variant="filled"
          icon={Search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by email"
          placeholderTextColor={c.textMuted}
          onSubmitEditing={onSearch}
          returnKeyType="search"
          testID="friend-search-input"
          inputStyle={styles.searchInput}
          rightComponent={
            <BnaButton
              variant="secondary"
              size="icon"
              icon={Search}
              label="Search"
              onPress={onSearch}
              haptic={false}
              testID="friend-search-button"
              style={styles.searchBtn}
            />
          }
        />
        {results !== null ? (
          results.length === 0 ? (
            <Text style={[styles.cardHint, { color: c.textMuted }]}>No users found.</Text>
          ) : (
            results.map((u) => (
              <View key={u.id} style={styles.personRow}>
                <View style={[styles.rankAvatar, { backgroundColor: c.primary }]}>
                  <Text style={[styles.rankAvatarText, { color: c.onPrimary }]}>
                    {initialOf(displayName(u))}
                  </Text>
                </View>
                <View style={styles.personBody}>
                  <Text style={styles.personName}>{displayName(u)}</Text>
                  <Text style={[styles.personEmail, { color: c.textMuted }]}>{u.email}</Text>
                </View>
                <Pressable
                  onPress={() => onToggleFollow(u)}
                  style={[
                    styles.followBtn,
                    { backgroundColor: c.primary },
                    u.is_following && [styles.followBtnActive, { backgroundColor: c.surface, borderColor: c.border }],
                  ]}
                  testID={`follow-${u.id}`}
                >
                  <Icon
                    name={u.is_following ? UserMinus : UserPlus}
                    size={14}
                    strokeWidth={2.2}
                    color={u.is_following ? c.text : c.onPrimary}
                  />
                  <Text
                    style={[
                      styles.followLabel,
                      { color: u.is_following ? c.text : c.onPrimary },
                    ]}
                  >
                    {u.is_following ? "Unfollow" : "Follow"}
                  </Text>
                </Pressable>
              </View>
            ))
          )
        ) : null}
      </View>

      {following.length > 0 ? (
        <View style={[styles.card, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
          <View style={styles.cardHeader}>
            <Icon name={Users} size={16} strokeWidth={2.2} color={c.primary} />
            <Text style={styles.cardTitle}>Following ({following.length})</Text>
          </View>
          {following.map((u) => (
            <View key={u.id} style={styles.personRow}>
              <View style={[styles.rankAvatar, { backgroundColor: c.primary }]}>
                <Text style={[styles.rankAvatarText, { color: c.onPrimary }]}>
                  {initialOf(displayName(u))}
                </Text>
              </View>
              <View style={styles.personBody}>
                <Text style={styles.personName}>{displayName(u)}</Text>
                <Text style={[styles.personEmail, { color: c.textMuted }]}>
                  {formatMinutes(u.weekly_minutes)} this week
                </Text>
              </View>
              <Pressable
                onPress={() => onToggleFollow(u)}
                style={[
                  styles.followBtn,
                  styles.followBtnActive,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
                testID={`unfollow-${u.id}`}
              >
                <Icon name={UserMinus} size={14} strokeWidth={2.2} color={c.text} />
                <Text style={[styles.followLabel, { color: c.text }]}>Unfollow</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    content: { gap: spacing.md, paddingBottom: spacing.xl },
    error: { fontSize: fontSize.body },
    segmentWrap: {
      flexDirection: "row",
      borderWidth: 1,
      borderRadius: radius.full,
      padding: 3,
      gap: 3,
    },
    segmentBtn: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
    },
    segmentLabel: { fontSize: fontSize.body, fontFamily: appFonts.bold },
    empty: { alignItems: "center", gap: spacing.sm, marginTop: spacing.xl * 2 },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: { fontSize: fontSize.title, fontFamily: appFonts.bold },
    emptyBody: { fontSize: fontSize.body, textAlign: "center" },
    feedList: { gap: spacing.md },
    feedCard: {
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    feedHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: fontSize.body, fontFamily: appFonts.extraBold },
    feedIdentity: { flex: 1 },
    feedName: { fontSize: fontSize.body, fontFamily: appFonts.bold },
    feedMeta: { fontSize: fontSize.caption, marginTop: 1 },
    youBadge: { fontFamily: appFonts.bold },
    iconChip: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    feedSubject: { fontSize: fontSize.body },
    kudosRow: { flexDirection: "row" },
    kudosBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    kudosDisabled: { opacity: 0.5 },
    kudosCount: { fontSize: fontSize.caption, fontFamily: appFonts.bold },
    friendsContent: { gap: spacing.md },
    card: {
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    cardTitle: { fontSize: fontSize.body, fontFamily: appFonts.bold },
    cardHint: { fontSize: fontSize.caption },
    rankRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    rankRowSelf: {
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    rankPos: { width: 28, fontSize: fontSize.caption, fontFamily: appFonts.extraBold },
    rankAvatar: {
      width: 30,
      height: 30,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    rankAvatarText: { fontSize: fontSize.label, fontFamily: appFonts.extraBold },
    rankName: { flex: 1, fontSize: fontSize.body, fontFamily: appFonts.semibold },
    rankMinutes: {
      fontSize: fontSize.body,
      fontFamily: appFonts.extraBold,
      fontVariant: ["tabular-nums"],
    },
    searchInput: {
      backgroundColor: "transparent",
    },
    searchBtn: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
    },
    personRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    personBody: { flex: 1 },
    personName: { fontSize: fontSize.body, fontFamily: appFonts.bold },
    personEmail: { fontSize: fontSize.caption, marginTop: 1 },
    followBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    followBtnActive: {
      borderWidth: 1,
    },
    followLabel: { fontSize: fontSize.caption, fontFamily: appFonts.bold },
  });
}
