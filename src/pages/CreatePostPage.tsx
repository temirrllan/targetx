import { useState, useRef, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { postsApi } from "../api/posts";
import { channelsApi } from "../api/channels";
import { useBackButton, useMainButton, useHapticFeedback } from "../hooks/useTelegramWebApp";
import { useToast } from "../hooks/useToast";
import type { Channel } from "../types/api";

type MediaType = "image" | "video" | "audio";

type MediaFile = {
  id: string;
  type: MediaType;
  file: File;
  preview: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const CreatePostPage = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const haptic = useHapticFeedback();
  
  const [channel, setChannel] = useState<Channel | null>(null);
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Привет! Я помогу тебе создать крутой пост. Расскажи, о чём хочешь написать?",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useBackButton(() => navigate(`/channel/${channelId}`), true);

  useEffect(() => {
    const fetchChannel = async () => {
      if (!channelId) return;
      
      try {
        const data = await channelsApi.getChannelById(channelId);
        setChannel(data);
      } catch (error) {
        console.error('Failed to fetch channel:', error);
        showToast('Не удалось загрузить канал', 'error');
      }
    };

    fetchChannel();
  }, [channelId, showToast]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (media.length + files.length > 10) {
      showToast('Максимум 10 файлов', 'error');
      return;
    }

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = event.target?.result as string;
        let type: MediaType = "image";

        if (file.type.startsWith("video/")) type = "video";
        else if (file.type.startsWith("audio/")) type = "audio";

        setMedia((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            type,
            file,
            preview,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    haptic.selectionChanged();
  };

  const handleRemoveMedia = (id: string) => {
    setMedia((prev) => prev.filter((item) => item.id !== id));
    haptic.impactOccurred('light');
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);
    haptic.selectionChanged();

    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateAiResponse(inputMessage),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
      haptic.notificationOccurred('success');
    }, 1500);
  };

  const generateAiResponse = (input: string) => {
    const responses = [
      "Отличная идея! Попробуй добавить эмодзи для большей вовлеченности 🚀",
      "Предлагаю начать с интригующего вопроса, чтобы зацепить аудиторию",
      "Добавь призыв к действию в конце поста - это повысит вовлеченность",
      "Можешь разбить текст на короткие абзацы для лучшей читаемости",
      "Отличный заголовок! Теперь добавь немного личного опыта",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleInsertAiText = (text: string) => {
    setContent((prev) => (prev ? `${prev}\n\n${text}` : text));
    setIsAiChatOpen(false);
    haptic.impactOccurred('medium');
  };

  const handleSaveDraft = async () => {
    if (!content.trim() && media.length === 0) {
      showToast('Добавьте текст или медиа', 'error');
      return;
    }

    setIsSubmitting(true);
    haptic.impactOccurred('medium');

    try {
      await postsApi.createPost({
        channelId: channelId!,
        content,
        media: media.map(m => m.file),
      });

      haptic.notificationOccurred('success');
      showToast('Черновик сохранен', 'success');
      navigate(`/channel/${channelId}`);
    } catch (error) {
      console.error('Failed to save draft:', error);
      haptic.notificationOccurred('error');
      showToast('Не удалось сохранить черновик', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSchedulePost = async () => {
    if (!content.trim() && media.length === 0) {
      showToast('Добавьте текст или медиа', 'error');
      return;
    }

    if (!scheduledAt) {
      showToast('Выберите дату и время публикации', 'error');
      return;
    }

    setIsSubmitting(true);
    haptic.impactOccurred('medium');

    try {
      await postsApi.createPost({
        channelId: channelId!,
        content,
        media: media.map(m => m.file),
        scheduledAt,
      });

      haptic.notificationOccurred('success');
      showToast('Пост запланирован', 'success');
      navigate(`/channel/${channelId}`);
    } catch (error) {
      console.error('Failed to schedule post:', error);
      haptic.notificationOccurred('error');
      showToast('Не удалось запланировать пост', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishNow = async () => {
    if (!content.trim() && media.length === 0) {
      showToast('Добавьте текст или медиа', 'error');
      return;
    }

    setIsSubmitting(true);
    haptic.impactOccurred('heavy');

    try {
      await postsApi.manualPost(channelId!, {
        content,
        media: media.map(m => m.file),
      });

      haptic.notificationOccurred('success');
      showToast('Пост опубликован', 'success');
      navigate(`/channel/${channelId}`);
    } catch (error) {
      console.error('Failed to publish post:', error);
      haptic.notificationOccurred('error');
      showToast('Не удалось опубликовать пост', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  useMainButton('Опубликовать сейчас', handlePublishNow, {
    show: !isSubmitting && (!!content.trim() || media.length > 0),
    isActive: !isSubmitting,
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-blue-700/20 blur-3xl animate-glow-pulse" />
        <div className="absolute right-[-120px] top-[-80px] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-4 pb-12 pt-6 sm:max-w-xl sm:px-6 sm:pt-8 lg:max-w-3xl">
        <div className="space-y-6 sm:space-y-8">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={`/channel/${channelId}`}
                aria-label="Назад"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/60 text-slate-200 transition hover:border-slate-600/80 hover:text-white"
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
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {channel?.title || 'Канал'}
                </p>
                <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
                  Новый пост
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsAiChatOpen(true);
                haptic.impactOccurred('light');
              }}
              className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-blue-100 transition hover:border-blue-500/50 hover:bg-blue-500/20"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path
                  d="M10 3a7 7 0 0 1 7 7v1a2 2 0 0 1-2 2h-1m-1-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              AI помощник
            </button>
          </header>

          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.8)] backdrop-blur sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Медиа
              </h2>
              <span className="text-xs text-slate-400">
                {media.length}/10 файлов
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
                haptic.impactOccurred('light');
              }}
              disabled={media.length >= 10}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-700/70 bg-slate-950/50 px-4 py-8 text-sm text-slate-300 transition hover:border-slate-600/70 hover:bg-slate-900/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                <path
                  d="M10 4v12m-6-6h12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              Добавить фото, видео или аудио
            </button>

            {media.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {media.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/60"
                  >
                    {item.type === "image" && (
                      <img
                        src={item.preview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    )}
                    {item.type === "video" && (
                      <video
                        src={item.preview}
                        className="h-full w-full object-cover"
                      />
                    )}
                    {item.type === "audio" && (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          className="h-8 w-8 text-purple-300"
                        >
                          <path
                            d="M8 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm0 0V6m8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm0 0V4l-8 2"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(item.id)}
                      className="absolute right-2 top-2 rounded-full bg-red-500/80 p-1.5 opacity-0 transition group-hover:opacity-100"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-3 w-3 text-white"
                      >
                        <path
                          d="M5 5l10 10M15 5L5 15"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                    <div className="absolute bottom-2 left-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300">
                      {item.type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.8)] backdrop-blur sm:p-6">
            <label
              htmlFor="content"
              className="mb-3 block text-xs uppercase tracking-[0.2em] text-slate-500"
            >
              Текст поста
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Напишите текст вашего поста..."
              rows={10}
              className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>{content.length} символов</span>
              <span>Рекомендуем: 100-300 символов</span>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.8)] backdrop-blur sm:p-6">
            <label
              htmlFor="scheduledAt"
              className="mb-3 block text-xs uppercase tracking-[0.2em] text-slate-500"
            >
              Запланировать публикацию (опционально)
            </label>
            <input
              type="datetime-local"
              id="scheduledAt"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
            />
          </section>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
              className="flex-1 rounded-full border border-slate-700/70 bg-slate-950/80 px-5 py-3 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-600/70 hover:text-white disabled:opacity-50"
            >
              Сохранить черновик
            </button>
            <button
              type="button"
              onClick={handleSchedulePost}
              disabled={isSubmitting || !scheduledAt}
              className="flex-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-xs uppercase tracking-[0.2em] text-blue-100 transition hover:border-blue-500/50 hover:bg-blue-500/20 disabled:opacity-50"
            >
              Запланировать
            </button>
          </div>
        </div>
      </div>

      {isAiChatOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setIsAiChatOpen(false)}
            aria-label="Закрыть чат"
          />
          <section
            className="relative z-10 flex w-full max-w-md flex-col rounded-t-3xl border border-slate-800/70 bg-slate-900/95 shadow-[0_-20px_45px_-30px_rgba(15,23,42,0.9)] backdrop-blur sm:max-w-xl lg:max-w-3xl"
            style={{ height: "85vh", maxHeight: "85vh" }}
          >
            <div className="flex items-center justify-between border-b border-slate-800/60 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                  <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-blue-300">
                    <path
                      d="M10 3a7 7 0 0 1 7 7v1a2 2 0 0 1-2 2h-1m-1-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">
                    AI Помощник
                  </h2>
                  <p className="text-xs text-slate-400">Помогу создать пост</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiChatOpen(false)}
                className="rounded-full p-2 transition hover:bg-slate-800/50"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-slate-400">
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div
              ref={chatScrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-blue-500/20 text-blue-50"
                        : "bg-slate-800/60 text-slate-100"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    {msg.role === "assistant" && (
                      <button
                        type="button"
                        onClick={() => handleInsertAiText(msg.content)}
                        className="mt-2 text-xs text-blue-300 hover:text-blue-200"
                      >
                        Вставить в пост →
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-slate-800/60 px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800/60 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Спросите что-нибудь..."
                  className="flex-1 rounded-full border border-slate-800/80 bg-slate-950/60 px-4 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500/60"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  className="rounded-full bg-blue-500/20 px-4 py-2 text-blue-100 transition hover:bg-blue-500/30 disabled:opacity-50"
                >
                  <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                    <path
                      d="M3 10h14m-7-7 7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default CreatePostPage;