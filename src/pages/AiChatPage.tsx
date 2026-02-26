import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { aiApi, type AiMessage, type AiSession } from "../api/ai";
import Skeleton from "../components/ui/Skeleton/Skeleton";
import { useAppStore } from "../store/appStore";

const SESSION_LIMIT = 20;
const MESSAGE_LIMIT = 100;

type SessionsCache = Record<string, AiSession[]>;
type ActiveSessionCache = Record<string, string>;
type MessagesCache = Record<string, AiMessage[]>;
type DraftCache = Record<string, string>;
type PendingSend = {
  channelId: string;
  tempMessageId: string;
  sessionId: string | null;
  message: AiMessage;
};
type PendingSendCache = Record<string, PendingSend | null>;

const toSessionKey = (channelId: string, sessionId: string) =>
  `${channelId}:${sessionId}`;

const mergeMessages = (current: AiMessage[], incoming: AiMessage[]): AiMessage[] => {
  const byId = new Map<string, AiMessage>();
  [...current, ...incoming].forEach((message) => {
    byId.set(message.id, message);
  });

  return Array.from(byId.values()).sort((left, right) => {
    const leftTs = Date.parse(left.createdAt);
    const rightTs = Date.parse(right.createdAt);
    if (Number.isNaN(leftTs) || Number.isNaN(rightTs)) {
      return 0;
    }
    return leftTs - rightTs;
  });
};

const upsertSession = (sessions: AiSession[], nextSession: AiSession): AiSession[] => {
  const nextList = [
    nextSession,
    ...sessions.filter((session) => session.id !== nextSession.id),
  ];

  return nextList.sort((left, right) => {
    const leftTs = Date.parse(left.updatedAt);
    const rightTs = Date.parse(right.updatedAt);
    if (Number.isNaN(leftTs) || Number.isNaN(rightTs)) {
      return 0;
    }
    return rightTs - leftTs;
  });
};

const formatDateTime = (value?: string) => {
  if (!value) return "--";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";

  return parsed.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTime = (value?: string) => {
  if (!value) return "--:--";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--:--";

  return parsed.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeUsername = (username?: string) => {
  if (!username) return "";
  return username.startsWith("@") ? username : `@${username}`;
};

const renderMessageContent = (content: string): ReactNode[] => {
  const chunks: ReactNode[] = [];
  const boldPattern = /\*\*(.+?)\*\*/gs;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = boldPattern.exec(content)) !== null) {
    const full = match[0];
    const boldText = match[1] ?? "";

    if (match.index > lastIndex) {
      chunks.push(content.slice(lastIndex, match.index));
    }

    chunks.push(
      <strong
        key={`bold-${match.index}-${lastIndex}`}
        className="font-semibold text-slate-50"
      >
        {boldText}
      </strong>
    );

    lastIndex = match.index + full.length;
  }

  if (lastIndex < content.length) {
    chunks.push(content.slice(lastIndex));
  }

  return chunks.length > 0 ? chunks : [content];
};

const SessionSkeletonList = () => (
  <div className="mt-3 space-y-2">
    {[0, 1, 2].map((item) => (
      <div
        key={item}
        className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-3"
      >
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-3 w-36" />
      </div>
    ))}
  </div>
);

const MessageSkeletonList = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((item) => (
      <div
        key={item}
        className="max-w-[86%] rounded-2xl border border-slate-800/70 bg-slate-900/50 p-3"
      >
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-3 w-full" />
        <Skeleton className="mt-1 h-3 w-10/12" />
      </div>
    ))}
  </div>
);

const AiChatPage = () => {
  const navigate = useNavigate();
  const { channelId: routeChannelId } = useParams<{ channelId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const channels = useAppStore((state) => state.channels);
  const channelsLoading = useAppStore((state) => state.channelsLoading);
  const channelsError = useAppStore((state) => state.channelsError);
  const fetchChannels = useAppStore((state) => state.fetchChannels);

  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [sessionsByChannel, setSessionsByChannel] = useState<SessionsCache>({});
  const [activeSessionByChannel, setActiveSessionByChannel] =
    useState<ActiveSessionCache>({});
  const [messagesBySession, setMessagesBySession] = useState<MessagesCache>({});
  const [draftByChannel, setDraftByChannel] = useState<DraftCache>({});
  const [pendingByChannel, setPendingByChannel] = useState<PendingSendCache>({});
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [forceNewSession, setForceNewSession] = useState(false);
  const [typingDotsCount, setTypingDotsCount] = useState(1);

  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsRefreshing, setSessionsRefreshing] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesRefreshing, setMessagesRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const selectedChannelRef = useRef("");
  const activeSessionByChannelRef = useRef<ActiveSessionCache>({});
  const sessionsByChannelRef = useRef<SessionsCache>({});
  const messagesBySessionRef = useRef<MessagesCache>({});
  const sessionsRequestRef = useRef<Record<string, number>>({});
  const messagesRequestRef = useRef<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
  }, []);

  useEffect(() => {
    selectedChannelRef.current = selectedChannelId;
  }, [selectedChannelId]);

  useEffect(() => {
    sessionsByChannelRef.current = sessionsByChannel;
  }, [sessionsByChannel]);

  useEffect(() => {
    messagesBySessionRef.current = messagesBySession;
  }, [messagesBySession]);

  useEffect(() => {
    activeSessionByChannelRef.current = activeSessionByChannel;
  }, [activeSessionByChannel]);

  useEffect(() => {
    void fetchChannels({ background: true });
  }, [fetchChannels]);

  const queryChannelId = searchParams.get("channelId")?.trim() ?? "";

  useEffect(() => {
    if (routeChannelId && routeChannelId !== selectedChannelId) {
      setSelectedChannelId(routeChannelId);
      return;
    }

    if (!selectedChannelId && queryChannelId) {
      setSelectedChannelId(queryChannelId);
      return;
    }

    if (!selectedChannelId && channels.length > 0) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, queryChannelId, routeChannelId, selectedChannelId]);

  useEffect(() => {
    if (!selectedChannelId || channels.length === 0) return;

    const exists = channels.some((channel) => channel.id === selectedChannelId);
    if (!exists) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  useEffect(() => {
    if (!selectedChannelId || routeChannelId) return;

    const currentFromQuery = searchParams.get("channelId")?.trim() ?? "";
    if (currentFromQuery === selectedChannelId) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("channelId", selectedChannelId);
    setSearchParams(nextParams, { replace: true });
  }, [routeChannelId, searchParams, selectedChannelId, setSearchParams]);

  useEffect(() => {
    setForceNewSession(false);
    setError(null);
  }, [selectedChannelId]);

  const loadSessions = useCallback(
    async (channelId: string, options?: { showLoader?: boolean }) => {
      const nextRequestId = (sessionsRequestRef.current[channelId] ?? 0) + 1;
      sessionsRequestRef.current[channelId] = nextRequestId;

      const isCurrentChannel = selectedChannelRef.current === channelId;
      if (isCurrentChannel) {
        if (options?.showLoader) {
          setSessionsLoading(true);
        } else {
          setSessionsRefreshing(true);
        }
      }

      try {
        const response = await aiApi.getSessions(channelId, {
          limit: SESSION_LIMIT,
        });

        if (sessionsRequestRef.current[channelId] !== nextRequestId) {
          return;
        }

        setSessionsByChannel((prev) => ({
          ...prev,
          [channelId]: response.sessions,
        }));

        setActiveSessionByChannel((prev) => {
          const currentActive = prev[channelId];
          if (
            currentActive &&
            response.sessions.some((session) => session.id === currentActive)
          ) {
            return prev;
          }

          return {
            ...prev,
            [channelId]: response.sessions[0]?.id ?? "",
          };
        });

        if (isCurrentChannel) {
          setError(null);
        }
      } catch (requestError) {
        if (sessionsRequestRef.current[channelId] !== nextRequestId) {
          return;
        }

        if (isCurrentChannel) {
          const message =
            requestError instanceof Error
              ? requestError.message
              : "Failed to load chat sessions";
          setError(message);
        }
      } finally {
        const isLatestRequest =
          sessionsRequestRef.current[channelId] === nextRequestId;
        if (isLatestRequest && isCurrentChannel) {
          setSessionsLoading(false);
          setSessionsRefreshing(false);
        }
      }
    },
    []
  );

  const loadMessages = useCallback(
    async (
      channelId: string,
      sessionId: string,
      options?: { showLoader?: boolean }
    ) => {
      const requestKey = toSessionKey(channelId, sessionId);
      const nextRequestId = (messagesRequestRef.current[requestKey] ?? 0) + 1;
      messagesRequestRef.current[requestKey] = nextRequestId;

      const isCurrentSession =
        selectedChannelRef.current === channelId &&
        activeSessionByChannelRef.current[channelId] === sessionId;

      if (isCurrentSession) {
        if (options?.showLoader) {
          setMessagesLoading(true);
        } else {
          setMessagesRefreshing(true);
        }
      }

      try {
        const response = await aiApi.getSessionMessages(channelId, sessionId, {
          limit: MESSAGE_LIMIT,
        });

        if (messagesRequestRef.current[requestKey] !== nextRequestId) {
          return;
        }

        setMessagesBySession((prev) => ({
          ...prev,
          [requestKey]: response.messages,
        }));

        setSessionsByChannel((prev) => ({
          ...prev,
          [channelId]: upsertSession(prev[channelId] ?? [], response.session),
        }));

        if (isCurrentSession) {
          setError(null);
        }
      } catch (requestError) {
        if (messagesRequestRef.current[requestKey] !== nextRequestId) {
          return;
        }

        if (isCurrentSession) {
          const message =
            requestError instanceof Error
              ? requestError.message
              : "Failed to load messages";
          setError(message);
        }
      } finally {
        const isLatestRequest =
          messagesRequestRef.current[requestKey] === nextRequestId;
        if (isLatestRequest && isCurrentSession) {
          setMessagesLoading(false);
          setMessagesRefreshing(false);
        }
      }
    },
    []
  );

  const sessions = useMemo(
    () => (selectedChannelId ? sessionsByChannel[selectedChannelId] ?? [] : []),
    [selectedChannelId, sessionsByChannel]
  );

  const activeSessionId = selectedChannelId
    ? activeSessionByChannel[selectedChannelId] ?? ""
    : "";

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions]
  );

  const messages = useMemo(() => {
    if (!selectedChannelId || !activeSessionId) {
      return [];
    }

    const key = toSessionKey(selectedChannelId, activeSessionId);
    return messagesBySession[key] ?? [];
  }, [activeSessionId, messagesBySession, selectedChannelId]);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  );

  const draft = selectedChannelId ? draftByChannel[selectedChannelId] ?? "" : "";
  const pendingSend = selectedChannelId
    ? pendingByChannel[selectedChannelId] ?? null
    : null;
  const isWaitingAssistantResponse = Boolean(
    pendingSend && selectedChannelId === pendingSend.channelId
  );

  const displayMessages = useMemo(() => {
    if (!pendingSend) {
      return messages;
    }

    const alreadyIncluded = messages.some(
      (message) => message.id === pendingSend.tempMessageId
    );

    if (alreadyIncluded) {
      return messages;
    }

    return mergeMessages(messages, [pendingSend.message]);
  }, [messages, pendingSend]);

  useEffect(() => {
    if (!isWaitingAssistantResponse) {
      setTypingDotsCount(1);
      return;
    }

    const intervalId = window.setInterval(() => {
      setTypingDotsCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 260);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isWaitingAssistantResponse]);

  useEffect(() => {
    if (!selectedChannelId) return;

    const cachedSessions = sessionsByChannelRef.current[selectedChannelId] ?? [];
    void loadSessions(selectedChannelId, {
      showLoader: cachedSessions.length === 0,
    });
  }, [loadSessions, selectedChannelId]);

  useEffect(() => {
    if (!selectedChannelId || !activeSessionId) return;

    const sessionKey = toSessionKey(selectedChannelId, activeSessionId);
    const cachedMessages = messagesBySessionRef.current[sessionKey] ?? [];
    void loadMessages(selectedChannelId, activeSessionId, {
      showLoader: cachedMessages.length === 0,
    });
  }, [activeSessionId, loadMessages, selectedChannelId]);

  useEffect(() => {
    if (!activeSessionId && !isWaitingAssistantResponse) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [activeSessionId, displayMessages.length, isWaitingAssistantResponse]);

  const handleSelectChannel = useCallback(
    (nextChannelId: string) => {
      if (!nextChannelId || nextChannelId === selectedChannelId) return;

      setSelectedChannelId(nextChannelId);

      if (routeChannelId && nextChannelId !== routeChannelId) {
        navigate(`/ai-chat?channelId=${encodeURIComponent(nextChannelId)}`);
      }
    },
    [navigate, routeChannelId, selectedChannelId]
  );

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (!selectedChannelId || !sessionId) return;

      setActiveSessionByChannel((prev) => ({
        ...prev,
        [selectedChannelId]: sessionId,
      }));
      setError(null);
    },
    [selectedChannelId]
  );

  const handleDraftChange = useCallback(
    (value: string) => {
      if (!selectedChannelId) return;

      setDraftByChannel((prev) => ({
        ...prev,
        [selectedChannelId]: value,
      }));
    },
    [selectedChannelId]
  );

  const handleRefresh = useCallback(() => {
    if (!selectedChannelId) return;

    void loadSessions(selectedChannelId, { showLoader: false });

    const sessionId = activeSessionByChannelRef.current[selectedChannelId];
    if (sessionId) {
      void loadMessages(selectedChannelId, sessionId, { showLoader: false });
    }
  }, [loadMessages, loadSessions, selectedChannelId]);

  const handleSend = useCallback(async () => {
    if (!selectedChannelId || sending) return;

    const nextMessage = draft.trim();
    if (!nextMessage) return;

    const currentSessionId =
      activeSessionByChannelRef.current[selectedChannelId] ?? "";
    const optimisticSessionId = forceNewSession ? null : currentSessionId || null;
    const tempMessageId = `temp-user-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;
    const createdAt = new Date().toISOString();
    const optimisticUserMessage: AiMessage = {
      id: tempMessageId,
      role: "user",
      kind: "user",
      content: nextMessage,
      tokenEstimate: 0,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      createdAt,
      updatedAt: createdAt,
    };

    if (optimisticSessionId) {
      const optimisticKey = toSessionKey(selectedChannelId, optimisticSessionId);
      setMessagesBySession((prev) => ({
        ...prev,
        [optimisticKey]: mergeMessages(prev[optimisticKey] ?? [], [
          optimisticUserMessage,
        ]),
      }));
    }

    setPendingByChannel((prev) => ({
      ...prev,
      [selectedChannelId]: {
        channelId: selectedChannelId,
        tempMessageId,
        sessionId: optimisticSessionId,
        message: optimisticUserMessage,
      },
    }));

    setDraftByChannel((prev) => ({
      ...prev,
      [selectedChannelId]: "",
    }));

    setSending(true);
    setError(null);

    try {
      const response = await aiApi.sendMessage(selectedChannelId, {
        message: nextMessage,
        useWebSearch,
        forceNewSession,
      });

      setSessionsByChannel((prev) => ({
        ...prev,
        [selectedChannelId]: upsertSession(
          prev[selectedChannelId] ?? [],
          response.session
        ),
      }));

      setActiveSessionByChannel((prev) => ({
        ...prev,
        [selectedChannelId]: response.session.id,
      }));

      setMessagesBySession((prev) => {
        const nextState = { ...prev };
        Object.keys(nextState).forEach((key) => {
          if (!key.startsWith(`${selectedChannelId}:`)) return;
          nextState[key] = (nextState[key] ?? []).filter(
            (message) => message.id !== tempMessageId
          );
        });

        const targetKey = toSessionKey(selectedChannelId, response.session.id);
        nextState[targetKey] = mergeMessages(nextState[targetKey] ?? [], [
          response.userMessage,
          response.assistantMessage,
        ]);

        return nextState;
      });

      setPendingByChannel((prev) => ({
        ...prev,
        [selectedChannelId]: null,
      }));

      setForceNewSession(false);

      void loadSessions(selectedChannelId, { showLoader: false });
      void loadMessages(selectedChannelId, response.session.id, {
        showLoader: false,
      });
    } catch (requestError) {
      setMessagesBySession((prev) => {
        const nextState = { ...prev };
        Object.keys(nextState).forEach((key) => {
          if (!key.startsWith(`${selectedChannelId}:`)) return;
          nextState[key] = (nextState[key] ?? []).filter(
            (message) => message.id !== tempMessageId
          );
        });
        return nextState;
      });

      setPendingByChannel((prev) => ({
        ...prev,
        [selectedChannelId]: null,
      }));

      const message =
        requestError instanceof Error
          ? requestError.message
          : "Failed to send message";
      setError(message);
    } finally {
      setSending(false);
    }
  }, [
    draft,
    forceNewSession,
    loadMessages,
    loadSessions,
    selectedChannelId,
    sending,
    useWebSearch,
  ]);

  const handleComposerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey) return;

      event.preventDefault();
      void handleSend();
    },
    [handleSend]
  );

  const showSessionsSkeleton = sessionsLoading && sessions.length === 0;
  const showMessagesSkeleton = messagesLoading && messages.length === 0;
  const canSend = Boolean(selectedChannelId && draft.trim() && !sending);

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-20 sm:space-y-6 sm:pb-6">
      <header className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={routeChannelId ? `/channel/${routeChannelId}` : "/"}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/60 text-slate-200 transition hover:border-slate-600/80 hover:text-white"
            aria-label="Go back"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path
                d="M12.5 4.5 7 10l5.5 5.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AI</p>
            <h1 className="truncate text-xl font-semibold text-slate-50 sm:text-2xl">
              Chat Assistant
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={!selectedChannelId || sessionsRefreshing || messagesRefreshing || sending}
          className="inline-flex items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/70 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-300 transition hover:border-slate-600/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh
        </button>
      </header>

      <section className="animate-fade-up w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.9)] sm:p-5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Channel</p>
          {selectedChannel && (
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-slate-100">
                {selectedChannel.title}
              </p>
              {selectedChannel.username && (
                <p className="truncate text-xs text-slate-500">
                  {normalizeUsername(selectedChannel.username)}
                </p>
              )}
            </div>
          )}
        </div>

        {channelsLoading && channels.length === 0 ? (
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-800/70 bg-slate-950/50 p-3"
              >
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            ))}
          </div>
        ) : channels.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 text-sm text-slate-400">
            <p>No channels available yet.</p>
            <Link
              to="/add-channel"
              className="mt-3 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-blue-100 transition hover:border-blue-500/50 hover:bg-blue-500/20"
            >
              Add channel
            </Link>
          </div>
        ) : (
          <fieldset className="mt-3 flex max-h-44 min-w-0 flex-col gap-2 overflow-x-hidden overflow-y-auto pr-1">
            {channels.map((channel) => {
              const checked = channel.id === selectedChannelId;

              return (
                <label
                  key={channel.id}
                  className={`flex w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3 transition ${
                    checked
                      ? "border-blue-500/60 bg-blue-500/15"
                      : "border-slate-800/70 bg-slate-950/50 hover:border-slate-700/70"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-100">
                      {channel.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {channel.username
                        ? normalizeUsername(channel.username)
                        : "No username"}
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="chat-channel"
                    checked={checked}
                    onChange={() => handleSelectChannel(channel.id)}
                    className="h-4 w-4 shrink-0 accent-blue-500"
                  />
                </label>
              );
            })}
          </fieldset>
        )}

        {channelsError && channels.length === 0 && (
          <p className="mt-3 text-xs text-red-300">{channelsError}</p>
        )}
      </section>

      <section className="grid w-full min-w-0 max-w-full gap-4 overflow-x-hidden lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <aside className="animate-fade-up min-w-0 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Sessions</p>
            {sessionsRefreshing && (
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                Updating...
              </p>
            )}
          </div>

          {showSessionsSkeleton ? (
            <SessionSkeletonList />
          ) : sessions.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 text-sm text-slate-400">
              Send first message to start a new session.
            </div>
          ) : (
            <div className="mt-3 flex min-w-0 flex-col gap-2 overflow-x-hidden">
              {sessions.map((session) => {
                const active = session.id === activeSessionId;

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => handleSelectSession(session.id)}
                    className={`w-full min-w-0 rounded-2xl border p-3 text-left transition ${
                      active
                        ? "border-cyan-500/55 bg-cyan-500/15"
                        : "border-slate-800/70 bg-slate-950/60 hover:border-slate-700/70"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      {session.status}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-100">
                      {session.model}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      messages: {session.messageCount} | tokens: {session.usage.totalTokens}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatDateTime(session.updatedAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <main className="animate-fade-up min-w-0 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-5">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dialog</p>
              <p className="break-words text-sm font-semibold text-slate-100 [overflow-wrap:anywhere]">
                {activeSession
                  ? `${activeSession.model} | ${activeSession.status}`
                  : "No active session"}
              </p>
              {activeSession && (
                <p className="text-xs text-slate-500">
                  updated: {formatDateTime(activeSession.updatedAt)}
                </p>
              )}
            </div>
            {messagesRefreshing && (
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                Updating...
              </p>
            )}
          </div>

          {error && (
            <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mt-4 h-[36dvh] min-h-[220px] w-full min-w-0 overscroll-x-none overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-800/70 bg-slate-950/55 p-3 sm:h-[42dvh] sm:min-h-[280px]">
            {!selectedChannelId ? (
              <div className="grid h-full place-items-center text-center text-sm text-slate-500">
                Select a channel to start chatting.
              </div>
            ) : !activeSessionId && !sending && !pendingSend ? (
              <div className="grid h-full place-items-center text-center text-sm text-slate-500">
                Session will be created automatically after first message.
              </div>
            ) : showMessagesSkeleton && displayMessages.length === 0 ? (
              <MessageSkeletonList />
            ) : displayMessages.length === 0 ? (
              <div className="grid h-full place-items-center text-center text-sm text-slate-500">
                No messages yet.
              </div>
            ) : (
              <div className="min-w-0 space-y-3">
                {displayMessages.map((message) => {
                  const isUser = message.role === "user";

                  return (
                    <article
                      key={message.id}
                      className={`w-fit max-w-[88%] min-w-0 overflow-hidden rounded-2xl border px-3 py-2 ${
                        isUser
                          ? "ml-auto border-blue-500/30 bg-blue-500/15 text-blue-50"
                          : "mr-auto border-slate-700/70 bg-slate-900/70 text-slate-100"
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                        {message.role} | {formatTime(message.createdAt)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                        {renderMessageContent(message.content)}
                      </p>
                    </article>
                  );
                })}
                {isWaitingAssistantResponse && (
                  <article className="mr-auto w-fit max-w-[88%] min-w-0 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-slate-100">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                      assistant | typing
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-300">
                      {".".repeat(typingDotsCount)}
                    </p>
                  </article>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="mt-4 min-w-0 max-w-full space-y-3 overflow-x-hidden">
            <label className="flex w-full min-w-0 items-start gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={useWebSearch}
                onChange={(event) => setUseWebSearch(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-500"
              />
              <span className="min-w-0 break-words leading-snug [overflow-wrap:anywhere]">
                Use web search for resources
              </span>
            </label>
            <label className="flex w-full min-w-0 items-start gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={forceNewSession}
                onChange={(event) => setForceNewSession(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-500"
              />
              <span className="min-w-0 break-words leading-snug [overflow-wrap:anywhere]">
                Start new session for the next message
              </span>
            </label>

            <textarea
              value={draft}
              onChange={(event) => handleDraftChange(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={4}
              placeholder="Type message for AI..."
              className="w-full max-w-full min-w-0 resize-none rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-500/50"
            />

            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 flex-1 break-words text-xs text-slate-500">
                {activeSession
                  ? `tokens: ${activeSession.usage.totalTokens} | cost: $${Number(activeSession.usage.estimatedCostUsd ?? 0).toFixed(4)}`
                  : "New session will appear after first answer"}
              </p>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!canSend}
                className="inline-flex min-w-28 shrink-0 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/15 px-5 py-2 text-xs uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-500/70 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </main>
      </section>
    </div>
  );
};

export default AiChatPage;
