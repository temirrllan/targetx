import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { channelsApi } from "../api/channels";
import { useBackButton, useHapticFeedback } from "../hooks/useTelegramWebApp";
import { useToast } from "../hooks/useToast";
import type { Channel } from "../types/api";

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

const uid = () => Math.random().toString(36).slice(2, 9);

const resolveAccept = (type: MediaType): string => {
  if (type === "photo") return "image/*";
  if (type === "video") return "video/*";
  if (type === "audio") return "audio/*";
  return "*/*";
};

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

const CreatePostPage = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const haptic = useHapticFeedback();

  const [channel, setChannel] = useState<Channel | null>(null);

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useBackButton(() => navigate(`/channel/${channelId}`), true);

  useEffect(() => {
    if (!channelId) return;
    channelsApi.getChannelById(channelId).then(setChannel).catch(() => {});
  }, [channelId]);

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

  const validateAlbum = (items: AlbumItem[]) => {
    const hasAudio = items.some((i) => i.type === "audio");
    const hasDoc = items.some((i) => i.type === "document");
    const hasPhVid = items.some((i) => i.type === "photo" || i.type === "video");
    if ((hasAudio && (hasDoc || hasPhVid)) || (hasDoc && hasPhVid))
      return "Альбом должен содержать только аудио, только документы, или фото/видео.";
    return null;
  };

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
  };

  // ── Отправка ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!channelId) return;

    if (contentType === "text" && !title.trim() && !text.trim()) {
      showToast("Введите текст или заголовок", "error"); return;
    }
    if (status === "scheduled" && !publishAt) {
      showToast("Укажите время публикации", "error"); return;
    }
    if (contentType === "media" && !mediaFile) {
      showToast("Выберите файл для медиа", "error"); return;
    }
    if (contentType === "album") {
      const filled = albumItems.filter((i) => i.file);
      if (!filled.length) { showToast("Добавьте хотя бы один элемент альбома", "error"); return; }
      if (filled.length !== albumItems.length) { showToast("Выберите файлы для всех элементов", "error"); return; }
      const err = validateAlbum(filled);
      if (err) { showToast(err, "error"); return; }
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
      const isMultipart = contentType === "media" || contentType === "album";

      if (isMultipart) {
        const form = new FormData();
        if (title.trim()) form.append("title", title.trim());
        if (text.trim()) form.append("text", text.trim());
        form.append("parseMode", "HTML");
        if (disablePreview) form.append("disableWebPagePreview", "true");
        form.append("status", status);
        if (status === "scheduled" && publishAt) {
          form.append("publishAt", new Date(publishAt).toISOString());
        }
        if (collectedButtons.length) {
          form.append("buttons", JSON.stringify(collectedButtons));
        }

        if (contentType === "media" && mediaFile) {
          form.append("mediaType", mediaType);
          if (mediaCaption.trim()) form.append("mediaCaption", mediaCaption.trim());
          form.append("mediaFile", mediaFile);
        }

        if (contentType === "album") {
          const filled = albumItems.filter((i) => i.file);
          const meta = filled.map((i) => ({ type: i.type, caption: i.caption || "" }));
          form.append("mediaGroupMeta", JSON.stringify(meta));
          filled.forEach((i) => form.append("mediaFiles", i.file!));
        }

        await apiClient.postFormData(`/api/tgapp/channels/${channelId}/posts`, form);
      } else {
        const payload: Record<string, unknown> = {
          title: title.trim() || undefined,
          text: text.trim() || undefined,
          parseMode: "HTML",
          status,
        };
        if (disablePreview) payload.disableWebPagePreview = true;
        if (status === "scheduled" && publishAt) {
          payload.publishAt = new Date(publishAt).toISOString();
        }
        if (collectedButtons.length) payload.buttons = collectedButtons;

        await apiClient.post(`/api/tgapp/channels/${channelId}/posts`, payload);
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="post-title" className="text-xs uppercase tracking-[0.2em] text-slate-500">Заголовок</label>
            <input
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Заголовок поста"
              className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Формат текста</p>
            <div className="flex items-center rounded-2xl border border-slate-800/80 bg-slate-950/40 px-4 py-2.5">
              <span className="text-sm text-slate-400">HTML (по умолчанию)</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="post-text" className="text-xs uppercase tracking-[0.2em] text-slate-500">Текст / подпись</label>
          <FormatToolbar onApply={applyFormat} />
          <textarea
            id="post-text"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Текст поста или подпись к медиа..."
            rows={7}
            className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
          />
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
            <label htmlFor="post-status" className="text-xs uppercase tracking-[0.2em] text-slate-500">Статус</label>
            <select
              id="post-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PostStatus)}
              className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500/60"
            >
              <option value="published">Опубликовать сейчас</option>
              <option value="scheduled">Запланировать</option>
            </select>
          </div>
          {status === "scheduled" && (
            <div className="space-y-1">
              <label htmlFor="publish-at" className="text-xs uppercase tracking-[0.2em] text-slate-500">Время публикации</label>
              <input
                id="publish-at"
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500/60"
              />
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
                <input type="radio" name="contentType" value={t} checked={contentType === t} onChange={() => setContentType(t)} className="accent-blue-500" />
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
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Тип медиа</label>
                <select
                  value={mediaType}
                  onChange={(e) => { setMediaType(e.target.value as MediaType); setMediaFile(null); }}
                  className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500/60"
                >
                  <option value="photo">Фото</option>
                  <option value="video">Видео</option>
                  <option value="document">Документ</option>
                  <option value="audio">Аудио</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Файл</label>
                <input
                  type="file"
                  accept={resolveAccept(mediaType)}
                  onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-xs text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-blue-500/20 file:px-3 file:py-1 file:text-xs file:text-blue-200"
                />
                {mediaFile && (
                  <p className="text-xs text-emerald-400 truncate">✓ {mediaFile.name}</p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Подпись (caption)</label>
              <textarea
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                placeholder="Если пусто — используется текст сверху"
                rows={3}
                className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500/60"
              />
            </div>
          </div>
        )}

        {/* Альбом */}
        {contentType === "album" && (
          <div className="space-y-3 border-t border-slate-800/60 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">Элементы альбома</p>
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
            <div className="space-y-2">
              {albumItems.map((item, idx) => (
                <div key={item.id} className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-3 space-y-2">
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
                  <textarea
                    value={item.caption}
                    onChange={(e) => updateAlbumItem(item.id, { caption: e.target.value })}
                    placeholder="Подпись для этого элемента"
                    rows={2}
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500/60"
                  />
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
            {buttons.map((btn) => (
              <div key={btn.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-950/50 p-2">
                <input
                  value={btn.text}
                  onChange={(e) => updateButton(btn.id, { text: e.target.value })}
                  placeholder="Текст кнопки"
                  className="flex-1 min-w-[100px] rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500/60"
                />
                <input
                  value={btn.url}
                  onChange={(e) => updateButton(btn.id, { url: e.target.value })}
                  placeholder="https://"
                  className="flex-1 min-w-[130px] rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500/60"
                />
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
            ))}
          </div>
        )}
      </section>

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