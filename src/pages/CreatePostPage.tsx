import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { postsApi } from "../api/posts";
import { useBackButton, useHapticFeedback } from "../hooks/useTelegramWebApp";
import { useToast } from "../hooks/useToast";
import type { Channel } from "../types/api";
import { useAppStore } from "../store/appStore";

type ContentType = "text" | "media" | "album";
type MediaType = "photo" | "video" | "document" | "audio";
type PostStatus = "published" | "scheduled";

type AlbumItem = {
  id: string;
  type: MediaType;
  file: File | null;
  caption: string;
};

type ButtonItem = {
  id: string;
  text: string;
  url: string;
  row: string;
};

// ── Validation ───────────────────────────────────────────────────────────────

type ValidationErrors = {
  text?: string;
  publishAt?: string;
  mediaFile?: string;
  album?: string;
  buttons?: Record<string, { text?: string; url?: string }>;
};

const URL_RE = /^https?:\/\/.+\..+/i;

const validate = (
  text: string,
  status: PostStatus,
  publishAt: string,
  contentType: ContentType,
  mediaFile: File | null,
  albumItems: AlbumItem[],
  buttons: ButtonItem[]
): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Текст обязателен всегда
  if (!text.trim()) {
    errors.text = "Текст поста обязателен";
  }

  // Время публикации при запланированном посте
  if (status === "scheduled") {
    if (!publishAt) {
      errors.publishAt = "Укажите время публикации";
    } else if (new Date(publishAt).getTime() <= Date.now()) {
      errors.publishAt = "Время должно быть в будущем";
    }
  }

  // Одиночное медиа
  if (contentType === "media") {
    if (!mediaFile) {
      errors.mediaFile = "Выберите файл";
    }
  }

  // Альбом
  if (contentType === "album") {
    const hasEmpty = albumItems.some((i) => !i.file);
    const allEmpty = albumItems.every((i) => !i.file);

    if (allEmpty) {
      errors.album = "Добавьте хотя бы один файл в альбом";
    } else if (hasEmpty) {
      errors.album = "Выберите файлы для всех элементов альбома";
    } else {
      const hasAudio = albumItems.some((i) => i.type === "audio");
      const hasDoc = albumItems.some((i) => i.type === "document");
      const hasPhVid = albumItems.some((i) => i.type === "photo" || i.type === "video");
      if ((hasAudio && (hasDoc || hasPhVid)) || (hasDoc && hasPhVid)) {
        errors.album =
          "Альбом должен содержать только аудио, только документы, или фото/видео";
      }
    }
  }

  // Кнопки — если добавлены, оба поля обязательны + URL валиден
  if (buttons.length > 0) {
    const btnErrors: Record<string, { text?: string; url?: string }> = {};
    buttons.forEach((btn) => {
      const e: { text?: string; url?: string } = {};
      if (!btn.text.trim()) e.text = "Введите текст кнопки";
      if (!btn.url.trim()) {
        e.url = "Введите URL";
      } else if (!URL_RE.test(btn.url.trim())) {
        e.url = "Введите корректный URL (https://...)";
      }
      if (Object.keys(e).length) btnErrors[btn.id] = e;
    });
    if (Object.keys(btnErrors).length) errors.buttons = btnErrors;
  }

  return errors;
};

const hasErrors = (errors: ValidationErrors) =>
  Object.keys(errors).length > 0;

// ── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const resolveAccept = (type: MediaType): string => {
  if (type === "photo") return "image/*";
  if (type === "video") return "video/*";
  if (type === "audio") return "audio/*";
  return "*/*";
};

// ── Sub-components ───────────────────────────────────────────────────────────

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="mt-1 text-xs text-red-400">{message}</p>
  ) : null;

const FormatToolbar = ({ onApply }: { onApply: (fmt: string) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {[
      { key: "bold", label: "B" },
      { key: "italic", label: "I" },
      { key: "underline", label: "U" },
      { key: "strike", label: "S" },
      { key: "code", label: "Code" },
      { key: "pre", label: "Pre" },
      { key: "link", label: "Link" },
    ].map(({ key, label }) => (
      <button
        key={key}
        type="button"
        onClick={() => onApply(key)}
        className="rounded-lg border border-slate-700/70 bg-slate-800/60 px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-700/70 active:scale-95"
      >
        {label}
      </button>
    ))}
  </div>
);

// ── Page ─────────────────────────────────────────────────────────────────────

const CreatePostPage = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const haptic = useHapticFeedback();
  const channels = useAppStore((state) => state.channels);
  const channelCache = useAppStore((state) =>
    channelId ? state.channelCache[channelId] : undefined
  );
  const fetchChannelDetails = useAppStore((state) => state.fetchChannelDetails);

  // Поля формы
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [disablePreview, setDisablePreview] = useState(false);
  const [status, setStatus] = useState<PostStatus>("published");
  const [publishAt, setPublishAt] = useState("");
  const [contentType, setContentType] = useState<ContentType>("text");

  // Одиночное медиа
  const [mediaType, setMediaType] = useState<MediaType>("photo");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");

  // Альбом
  const [albumItems, setAlbumItems] = useState<AlbumItem[]>([
    { id: uid(), type: "photo", file: null, caption: "" },
  ]);

  // Inline кнопки
  const [buttons, setButtons] = useState<ButtonItem[]>([]);

  // Валидация
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleBack = useCallback(() => {
    navigate(`/channel/${channelId}`);
  }, [navigate, channelId]);

  useBackButton(handleBack, true);

  const fallbackChannel = useMemo(() => {
    if (!channelId) return null;
    return channels.find((item) => item.id === channelId) ?? null;
  }, [channelId, channels]);

  const channel = (channelCache?.details ?? fallbackChannel) as Channel | null;

  useEffect(() => {
    if (!channelId) return;
    void fetchChannelDetails(channelId, { background: true });
  }, [channelId, fetchChannelDetails]);

  // Пересчитываем ошибки в реальном времени после первой попытки отправки
  useEffect(() => {
    if (!submitted) return;
    setErrors(validate(text, status, publishAt, contentType, mediaFile, albumItems, buttons));
  }, [submitted, text, status, publishAt, contentType, mediaFile, albumItems, buttons]);

  // ── HTML форматирование ──────────────────────────────────────────────────
  const applyFormat = useCallback((kind: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const tags: Record<string, [string, string]> = {
      bold: ["<b>", "</b>"],
      italic: ["<i>", "</i>"],
      underline: ["<u>", "</u>"],
      strike: ["<s>", "</s>"],
      code: ["<code>", "</code>"],
      pre: ["<pre>", "</pre>"],
      link: ['<a href="https://">', "</a>"],
    };
    const [before, after] = tags[kind] ?? ["", ""];
    const placeholder = kind === "code" ? "code" : kind === "link" ? "ссылка" : "текст";
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const selected = ta.value.slice(start, end) || placeholder;
    setText(ta.value.slice(0, start) + before + selected + after + ta.value.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }, []);

  // ── Альбом ──────────────────────────────────────────────────────────────
  const addAlbumItem = () =>
    setAlbumItems((p) => [...p, { id: uid(), type: "photo", file: null, caption: "" }]);
  const removeAlbumItem = (id: string) =>
    setAlbumItems((p) => p.filter((i) => i.id !== id));
  const updateAlbumItem = (id: string, patch: Partial<AlbumItem>) =>
    setAlbumItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  // ── Кнопки ──────────────────────────────────────────────────────────────
  const addButton = () =>
    setButtons((p) => [...p, { id: uid(), text: "", url: "", row: "" }]);
  const removeButton = (id: string) =>
    setButtons((p) => p.filter((b) => b.id !== id));
  const updateButton = (id: string, patch: Partial<ButtonItem>) =>
    setButtons((p) => p.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  // ── Сброс ────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setTitle(""); setText(""); setDisablePreview(false);
    setStatus("published"); setPublishAt("");
    setContentType("text"); setMediaType("photo");
    setMediaFile(null); setMediaCaption("");
    setAlbumItems([{ id: uid(), type: "photo", file: null, caption: "" }]);
    setButtons([]);
    setErrors({});
    setSubmitted(false);
  };

  // ── Отправка ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!channelId) return;

    setSubmitted(true);
    const nextErrors = validate(text, status, publishAt, contentType, mediaFile, albumItems, buttons);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      haptic.notificationOccurred("error");
      showToast("Заполните все обязательные поля", "error");
      return;
    }

    setIsSubmitting(true);
    haptic.impactOccurred("heavy");

    const collectedButtons = buttons
      .filter((b) => b.text.trim() && b.url.trim())
      .map((b) => {
        const row = parseInt(b.row, 10);
        return { text: b.text.trim(), url: b.url.trim(), ...(isNaN(row) ? {} : { row }) };
      });

    try {
      const payload = {
        channelId,
        title: title.trim() || undefined,
        text: text.trim() || undefined,
        parseMode: "HTML" as const,
        status,
        disableWebPagePreview: disablePreview || undefined,
        publishAt:
          status === "scheduled" && publishAt
            ? new Date(publishAt).toISOString()
            : undefined,
        buttons: collectedButtons.length ? collectedButtons : undefined,
      };

      if (contentType === "media" && mediaFile) {
        await postsApi.createPost({
          ...payload,
          mediaType,
          mediaCaption: mediaCaption.trim() || undefined,
          mediaFile,
        });
      } else if (contentType === "album") {
        const filled = albumItems.filter((i) => i.file);
        await postsApi.createPost({
          ...payload,
          mediaFiles: filled.map((i) => i.file!).filter(Boolean),
          mediaGroupMeta: filled.map((i) => ({
            type: i.type,
            caption: i.caption || "",
          })),
        });
      } else {
        await postsApi.createPost(payload);
      }

      haptic.notificationOccurred("success");
      showToast(status === "scheduled" ? "Пост запланирован" : "Пост опубликован!", "success");
      navigate(`/channel/${channelId}`);
    } catch (err) {
      haptic.notificationOccurred("error");
      showToast(err instanceof Error ? err.message : "Не удалось создать пост", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Helpers для классов полей ────────────────────────────────────────────
  const fieldCls = (hasError: boolean) =>
    `w-full rounded-2xl border bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:ring-2 ${
      hasError
        ? "border-red-500/60 focus:border-red-500/80 focus:ring-red-500/20"
        : "border-slate-800/80 focus:border-blue-500/60 focus:ring-blue-500/30"
    }`;

  const textareaCls = (hasError: boolean) =>
    `w-full rounded-2xl border bg-slate-950/60 px-4 py-3 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:ring-2 ${
      hasError
        ? "border-red-500/60 focus:border-red-500/80 focus:ring-red-500/20"
        : "border-slate-800/80 focus:border-blue-500/60 focus:ring-blue-500/30"
    }`;

  return (
    <div className="space-y-5 pb-16">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Link
          to={`/channel/${channelId}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/60 text-slate-200 transition hover:border-slate-600/80 hover:text-white"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{channel?.title ?? "Канал"}</p>
          <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">Новый пост</h1>
        </div>
      </header>

      {/* Заголовок + текст */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur space-y-4">
        {/* Заголовок (опциональный) */}
        <div className="space-y-1">
          <label htmlFor="post-title" className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Заголовок <span className="text-slate-600 normal-case tracking-normal">(необязательно)</span>
          </label>
          <input
            id="post-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок поста"
            className={fieldCls(false)}
          />
        </div>

        {/* Текст */}
        <div className="space-y-2">
          <label htmlFor="post-text" className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Текст / подпись <span className="text-red-400">*</span>
          </label>
          <textarea
            id="post-text"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Текст поста или подпись к медиа..."
            rows={7}
            className={textareaCls(!!errors.text)}
          />
          <FieldError message={errors.text} />
          <FormatToolbar onApply={applyFormat} />
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={disablePreview} onChange={(e) => setDisablePreview(e.target.checked)} className="accent-blue-500" />
              Отключить превью ссылок
            </label>
            <span className="text-xs text-slate-600">{text.length} симв.</span>
          </div>
          <p className="text-xs text-slate-600">Теги: &lt;b&gt; &lt;i&gt; &lt;u&gt; &lt;s&gt; &lt;code&gt; &lt;pre&gt; &lt;a href=""&gt;</p>
        </div>
      </section>

      {/* Статус */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="post-status" className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Статус <span className="text-red-400">*</span>
            </label>
            <select
              id="post-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PostStatus)}
              className={fieldCls(false)}
            >
              <option value="published">Опубликовать сейчас</option>
              <option value="scheduled">Запланировать</option>
            </select>
          </div>

          {status === "scheduled" && (
            <div className="space-y-1">
              <label htmlFor="publish-at" className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Время публикации <span className="text-red-400">*</span>
              </label>
              <input
                id="publish-at"
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className={fieldCls(!!errors.publishAt)}
              />
              <FieldError message={errors.publishAt} />
              <p className="text-xs text-slate-600">Время берётся с устройства.</p>
            </div>
          )}
        </div>
      </section>

      {/* Тип контента */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Тип контента</p>
          <div className="flex gap-4">
            {(["text", "media", "album"] as const).map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="radio"
                  name="contentType"
                  value={t}
                  checked={contentType === t}
                  onChange={() => { setContentType(t); setMediaFile(null); }}
                  className="accent-blue-500"
                />
                {t === "text" ? "Текст" : t === "media" ? "Медиа" : "Альбом"}
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-600">При медиа/альбоме текст становится подписью.</p>
        </div>

        {/* Одиночное медиа */}
        {contentType === "media" && (
          <div className="space-y-3 border-t border-slate-800/60 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Тип медиа <span className="text-red-400">*</span>
                </label>
                <select
                  value={mediaType}
                  onChange={(e) => { setMediaType(e.target.value as MediaType); setMediaFile(null); }}
                  className={fieldCls(false)}
                >
                  <option value="photo">Фото</option>
                  <option value="video">Видео</option>
                  <option value="document">Документ</option>
                  <option value="audio">Аудио</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Файл <span className="text-red-400">*</span>
                </label>
                <input
                  type="file"
                  accept={resolveAccept(mediaType)}
                  onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
                  className={`w-full rounded-2xl border px-3 py-2 text-xs text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-blue-500/20 file:px-3 file:py-1 file:text-xs file:text-blue-200 ${
                    errors.mediaFile
                      ? "border-red-500/60 bg-red-500/5"
                      : "border-slate-800/80 bg-slate-950/60"
                  }`}
                />
                {mediaFile ? (
                  <p className="text-xs text-emerald-400 truncate">✓ {mediaFile.name}</p>
                ) : (
                  <FieldError message={errors.mediaFile} />
                )}
              </div>
            </div>

            {/* Подпись к медиа (опциональная) */}
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Подпись к медиа <span className="text-slate-600 normal-case tracking-normal">(необязательно)</span>
              </label>
              <input
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                placeholder="Подпись..."
                className={fieldCls(false)}
              />
            </div>
          </div>
        )}

        {/* Альбом */}
        {contentType === "album" && (
          <div className="space-y-3 border-t border-slate-800/60 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  Элементы альбома <span className="text-red-400">*</span>
                </p>
                <p className="text-xs text-slate-500">Только аудио, только документы, или фото/видео.</p>
              </div>
              <button
                type="button"
                onClick={addAlbumItem}
                className="rounded-full border border-slate-700/70 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700/60"
              >
                + Добавить
              </button>
            </div>

            {errors.album && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
                {errors.album}
              </div>
            )}

            <div className="space-y-2">
              {albumItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 space-y-2 ${
                    errors.album && !item.file
                      ? "border-red-500/40 bg-red-500/5"
                      : "border-slate-800/70 bg-slate-950/50"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-600 w-5 text-center">#{idx + 1}</span>
                    <select
                      value={item.type}
                      onChange={(e) => updateAlbumItem(item.id, { type: e.target.value as MediaType, file: null })}
                      className="rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 outline-none"
                    >
                      <option value="photo">Фото</option>
                      <option value="video">Видео</option>
                      <option value="document">Документ</option>
                      <option value="audio">Аудио</option>
                    </select>
                    <input
                      type="file"
                      accept={resolveAccept(item.type)}
                      onChange={(e) => updateAlbumItem(item.id, { file: e.target.files?.[0] ?? null })}
                      className="flex-1 min-w-0 text-xs text-slate-300 file:mr-2 file:rounded-full file:border-0 file:bg-blue-500/20 file:px-2 file:py-1 file:text-xs file:text-blue-200"
                    />
                    {albumItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAlbumItem(item.id)}
                        className="rounded-full border border-red-400/30 px-2 py-1 text-xs text-red-300 hover:border-red-400/60"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {item.file && <p className="text-xs text-emerald-400 pl-7 truncate">✓ {item.file.name}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Inline кнопки */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-100">Inline кнопки</p>
            <p className="text-xs text-slate-500">Row группирует кнопки в строку.</p>
          </div>
          <button
            type="button"
            onClick={addButton}
            className="rounded-full border border-slate-700/70 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700/60"
          >
            + Добавить
          </button>
        </div>

        {buttons.length > 0 && (
          <div className="space-y-2">
            {buttons.map((btn) => {
              const btnErr = errors.buttons?.[btn.id];
              return (
                <div
                  key={btn.id}
                  className={`rounded-xl border p-2 space-y-1.5 ${
                    btnErr ? "border-red-500/40 bg-red-500/5" : "border-slate-800/70 bg-slate-950/50"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-1 min-w-[100px] flex-col gap-1">
                      <input
                        value={btn.text}
                        onChange={(e) => updateButton(btn.id, { text: e.target.value })}
                        placeholder="Текст кнопки *"
                        className={`rounded-xl border px-3 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500/60 bg-slate-900/60 ${
                          btnErr?.text ? "border-red-500/60" : "border-slate-700/70"
                        }`}
                      />
                      {btnErr?.text && <p className="text-[10px] text-red-400">{btnErr.text}</p>}
                    </div>

                    <div className="flex flex-1 min-w-[130px] flex-col gap-1">
                      <input
                        value={btn.url}
                        onChange={(e) => updateButton(btn.id, { url: e.target.value })}
                        placeholder="https:// *"
                        className={`rounded-xl border px-3 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500/60 bg-slate-900/60 ${
                          btnErr?.url ? "border-red-500/60" : "border-slate-700/70"
                        }`}
                      />
                      {btnErr?.url && <p className="text-[10px] text-red-400">{btnErr.url}</p>}
                    </div>

                    <input
                      value={btn.row}
                      onChange={(e) => updateButton(btn.id, { row: e.target.value })}
                      placeholder="Row"
                      className="w-14 rounded-xl border border-slate-700/70 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500/60"
                    />
                    <button
                      type="button"
                      onClick={() => removeButton(btn.id)}
                      className="rounded-full border border-red-400/30 px-2 py-1 text-xs text-red-300 hover:border-red-400/60"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Суммарная ошибка */}
      {submitted && hasErrors(errors) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-300">
          Пожалуйста, исправьте ошибки перед публикацией.
        </div>
      )}

      {/* Кнопки действий */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={resetForm}
          disabled={isSubmitting}
          className="rounded-full border border-slate-700/70 bg-slate-800/60 px-5 py-3 text-xs uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-200 disabled:opacity-50"
        >
          Сбросить
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 rounded-full border border-blue-500/40 bg-blue-500/15 px-5 py-3 text-xs uppercase tracking-[0.2em] text-blue-100 transition hover:border-blue-500/60 hover:bg-blue-500/25 disabled:opacity-50"
        >
          {isSubmitting
            ? "Отправка..."
            : status === "scheduled"
            ? "Запланировать"
            : "Опубликовать сейчас"}
        </button>
      </div>
    </div>
  );
};

export default CreatePostPage;