import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createTextPost, createMultipartPost } from '../api/tgapp';
import type { InlineButton } from '../types/api';

type MediaType = 'photo' | 'video' | 'document' | 'audio';
type ContentType = 'text' | 'media' | 'album';

type AlbumItem = {
  id: string;
  type: MediaType;
  file: File | null;
  caption: string;
};

type InlineBtn = {
  id: string;
  text: string;
  url: string;
  row: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const resolveAccept = (type: MediaType) => {
  if (type === 'photo') return 'image/*';
  if (type === 'video') return 'video/*';
  if (type === 'audio') return 'audio/*';
  return '*/*';
};

const makeId = () => Math.random().toString(36).slice(2, 9);

const CreatePostPage = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();

  // Form state
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'published' | 'scheduled'>('published');
  const [publishAt, setPublishAt] = useState('');
  const [disablePreview, setDisablePreview] = useState(false);
  const [contentType, setContentType] = useState<ContentType>('text');

  // Single media
  const [mediaType, setMediaType] = useState<MediaType>('photo');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');
  const singleFileRef = useRef<HTMLInputElement>(null);

  // Album
  const [albumItems, setAlbumItems] = useState<AlbumItem[]>([{ id: makeId(), type: 'photo', file: null, caption: '' }]);

  // Inline buttons
  const [buttons, setButtons] = useState<InlineBtn[]>([]);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // AI chat
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Привет! Помогу создать крутой пост. Расскажи, о чём хочешь написать?' },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // ── Formatting helpers ──────────────────────────────────────────────────────

  const applyFormat = (kind: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const map: Record<string, [string, string]> = {
      bold: ['<b>', '</b>'],
      italic: ['<i>', '</i>'],
      underline: ['<u>', '</u>'],
      strike: ['<s>', '</s>'],
      code: ['<code>', '</code>'],
      pre: ['<pre>', '</pre>'],
      link: ['<a href="https://">', '</a>'],
    };
    const [before, after] = map[kind] ?? ['', ''];
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(start, end) || 'текст';
    const next = ta.value.slice(0, start) + before + selected + after + ta.value.slice(end);
    setText(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  // ── Album helpers ───────────────────────────────────────────────────────────

  const addAlbumItem = () =>
    setAlbumItems((prev) => [...prev, { id: makeId(), type: 'photo', file: null, caption: '' }]);

  const removeAlbumItem = (id: string) =>
    setAlbumItems((prev) => prev.filter((i) => i.id !== id));

  const updateAlbumItem = (id: string, patch: Partial<AlbumItem>) =>
    setAlbumItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  // ── Button helpers ──────────────────────────────────────────────────────────

  const addButton = () =>
    setButtons((prev) => [...prev, { id: makeId(), text: '', url: '', row: '' }]);

  const removeButton = (id: string) => setButtons((prev) => prev.filter((b) => b.id !== id));

  const updateButton = (id: string, patch: Partial<InlineBtn>) =>
    setButtons((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const collectButtons = (): InlineButton[] =>
    buttons
      .filter((b) => b.text && b.url)
      .map((b) => {
        const btn: InlineButton = { text: b.text, url: b.url };
        const row = parseInt(b.row, 10);
        if (!isNaN(row)) btn.row = row;
        return btn;
      });

  // ── Validate album ──────────────────────────────────────────────────────────

  const validateAlbum = (items: AlbumItem[]): string | null => {
    const hasAudio = items.some((i) => i.type === 'audio');
    const hasDoc = items.some((i) => i.type === 'document');
    const hasPhotoVideo = items.some((i) => i.type === 'photo' || i.type === 'video');
    if ((hasAudio && (hasDoc || hasPhotoVideo)) || (hasDoc && hasPhotoVideo)) {
      return 'Альбом должен содержать только аудио, только документы, или фото/видео.';
    }
    return null;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!channelId) return;
    setSubmitError(null);

    // Validation
    if (contentType === 'text' && !title && !text) {
      setSubmitError('Введите заголовок или текст');
      return;
    }
    if (status === 'scheduled') {
      if (!publishAt) { setSubmitError('Укажите время публикации'); return; }
      if (isNaN(new Date(publishAt).getTime())) { setSubmitError('Некорректное время'); return; }
    }
    if (contentType === 'media' && !mediaFile) {
      setSubmitError('Выберите файл для медиа');
      return;
    }
    if (contentType === 'album') {
      const albumErr = validateAlbum(albumItems);
      if (albumErr) { setSubmitError(albumErr); return; }
      if (!albumItems.some((i) => i.file)) { setSubmitError('Добавьте хотя бы один файл в альбом'); return; }
      if (albumItems.some((i) => !i.file)) { setSubmitError('Выберите файлы для всех элементов альбома'); return; }
    }

    setSubmitting(true);
    try {
      const publishAtIso = status === 'scheduled' ? new Date(publishAt).toISOString() : undefined;
      const btns = collectButtons();

      if (contentType === 'text') {
        await createTextPost(channelId, {
          title: title || undefined,
          text: text || undefined,
          parseMode: 'HTML',
          disableWebPagePreview: disablePreview || undefined,
          status,
          publishAt: publishAtIso,
          buttons: btns.length ? btns : undefined,
        });
      } else {
        await createMultipartPost(channelId, {
          title: title || undefined,
          text: text || undefined,
          parseMode: 'HTML',
          disableWebPagePreview: disablePreview || undefined,
          status,
          publishAt: publishAtIso,
          buttons: btns.length ? btns : undefined,
          ...(contentType === 'media' && mediaFile
            ? { mediaType, mediaFile, mediaCaption: mediaCaption || undefined }
            : {}),
          ...(contentType === 'album'
            ? {
                albumItems: albumItems
                  .filter((i): i is AlbumItem & { file: File } => i.file !== null)
                  .map((i) => ({ type: i.type, file: i.file, caption: i.caption || undefined })),
              }
            : {}),
        });
      }

      navigate(`/channel/${channelId}`);
    } catch (err: unknown) {
      setSubmitError((err as Error).message ?? 'Не удалось создать пост');
    } finally {
      setSubmitting(false);
    }
  };

  // ── AI chat ─────────────────────────────────────────────────────────────────

  const sendAiMessage = () => {
    if (!aiInput.trim()) return;
    const userMsg: Message = { id: makeId(), role: 'user', content: aiInput };
    setMessages((p) => [...p, userMsg]);
    setAiInput('');
    setIsTyping(true);
    setTimeout(() => {
      const replies = [
        'Попробуй добавить эмодзи для большей вовлеченности 🚀',
        'Начни с интригующего вопроса — это зацепит аудиторию.',
        'Добавь призыв к действию в конце — это повысит вовлеченность.',
        'Разбей текст на короткие абзацы для лучшей читаемости.',
        'Отличный заголовок! Теперь добавь немного личного опыта.',
      ];
      const ai: Message = {
        id: makeId(),
        role: 'assistant',
        content: replies[Math.floor(Math.random() * replies.length)],
      };
      setMessages((p) => [...p, ai]);
      setIsTyping(false);
    }, 1200);
  };

  const insertAiText = (content: string) => {
    setText((p) => (p ? `${p}\n\n${content}` : content));
    setIsAiOpen(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/channel/${channelId}`}
            aria-label="Назад"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800/80 bg-slate-900/60 text-slate-200 transition hover:border-slate-600/80 hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Создание</p>
            <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">Новый пост</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsAiOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-blue-100 transition hover:border-blue-500/50 hover:bg-blue-500/20"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <path d="M10 3a7 7 0 0 1 7 7v1a2 2 0 0 1-2 2h-1m-1-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          AI помощник
        </button>
      </header>

      {/* Title + Status */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="post-title" className="text-xs uppercase tracking-[0.2em] text-slate-500">Заголовок</label>
            <input
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Заголовок поста"
              className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="post-status" className="text-xs uppercase tracking-[0.2em] text-slate-500">Статус</label>
            <select
              id="post-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'published' | 'scheduled')}
              className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-500/60"
            >
              <option value="published">Опубликовать сейчас</option>
              <option value="scheduled">Запланировать</option>
            </select>
          </div>
        </div>

        {status === 'scheduled' && (
          <div className="space-y-1">
            <label htmlFor="publish-at" className="text-xs uppercase tracking-[0.2em] text-slate-500">Время публикации</label>
            <input
              id="publish-at"
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-500/60"
            />
            <p className="text-xs text-slate-500">Время берётся с устройства.</p>
          </div>
        )}
      </section>

      {/* Text */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 space-y-3">
        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Текст / подпись</label>

        {/* Formatting toolbar */}
        <div className="flex flex-wrap gap-2">
          {['bold','italic','underline','strike','code','pre','link'].map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => applyFormat(fmt)}
              className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              {fmt === 'bold' ? 'B' : fmt === 'italic' ? 'I' : fmt === 'underline' ? 'U' : fmt === 'strike' ? 'S' : fmt.charAt(0).toUpperCase() + fmt.slice(1)}
            </button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          id="post-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Текст поста или подпись к медиа..."
          rows={8}
          className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/30"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={disablePreview}
              onChange={(e) => setDisablePreview(e.target.checked)}
              className="accent-blue-500"
            />
            Отключить превью ссылок
          </label>
          <span>{text.length} симв. · Рекомендуем 100–300</span>
        </div>

        <p className="text-xs text-slate-500">HTML: &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;s&gt;, &lt;code&gt;, &lt;pre&gt;, &lt;a href=""&gt;</p>
      </section>

      {/* Content type */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Тип контента</p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-300">
            {(['text','media','album'] as ContentType[]).map((ct) => (
              <label key={ct} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="contentType"
                  value={ct}
                  checked={contentType === ct}
                  onChange={() => setContentType(ct)}
                  className="accent-blue-500"
                />
                {ct === 'text' ? 'Текст' : ct === 'media' ? 'Медиа' : 'Альбом'}
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500">Если выбрано медиа/альбом, текст выше станет подписью.</p>
        </div>

        {/* Single media */}
        {contentType === 'media' && (
          <div className="space-y-3 border-t border-slate-800/60 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Тип медиа</label>
                <select
                  value={mediaType}
                  onChange={(e) => {
                    setMediaType(e.target.value as MediaType);
                    setMediaFile(null);
                    if (singleFileRef.current) singleFileRef.current.value = '';
                  }}
                  className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none"
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
                  ref={singleFileRef}
                  type="file"
                  accept={resolveAccept(mediaType)}
                  onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-blue-500/20 file:px-3 file:py-1 file:text-xs file:text-blue-200"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Подпись (caption)</label>
              <textarea
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                placeholder="Если пусто — будет использован текст выше"
                rows={3}
                className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500/60"
              />
            </div>
          </div>
        )}

        {/* Album */}
        {contentType === 'album' && (
          <div className="space-y-3 border-t border-slate-800/60 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">Элементы альбома</p>
                <p className="text-xs text-slate-500">Разрешено: все аудио, все документы, или фото/видео.</p>
              </div>
              <button type="button" onClick={addAlbumItem} className="rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white">
                + Добавить
              </button>
            </div>
            <div className="space-y-3">
              {albumItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={item.type}
                      onChange={(e) => updateAlbumItem(item.id, { type: e.target.value as MediaType, file: null })}
                      className="flex-1 min-w-[120px] rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none"
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
                      className="flex-1 min-w-0 rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 file:mr-2 file:rounded-full file:border-0 file:bg-blue-500/20 file:px-2 file:py-1 file:text-xs file:text-blue-200"
                    />
                    <button type="button" onClick={() => removeAlbumItem(item.id)} className="rounded-xl border border-red-400/30 px-3 py-1.5 text-xs text-red-300 hover:border-red-400">
                      Удалить
                    </button>
                  </div>
                  <textarea
                    value={item.caption}
                    onChange={(e) => updateAlbumItem(item.id, { caption: e.target.value })}
                    placeholder="Подпись для этого элемента"
                    rows={2}
                    className="w-full rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500/60"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Inline buttons */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-100">Inline кнопки</p>
            <p className="text-xs text-slate-500">Row группирует кнопки в строку.</p>
          </div>
          <button type="button" onClick={addButton} className="rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white">
            + Добавить
          </button>
        </div>
        {buttons.map((btn) => (
          <div key={btn.id} className="flex flex-wrap gap-2">
            <input
              value={btn.text}
              onChange={(e) => updateButton(btn.id, { text: e.target.value })}
              placeholder="Текст кнопки"
              className="flex-1 min-w-[120px] rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500/60"
            />
            <input
              value={btn.url}
              onChange={(e) => updateButton(btn.id, { url: e.target.value })}
              placeholder="https://"
              className="flex-1 min-w-[120px] rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500/60"
            />
            <input
              value={btn.row}
              onChange={(e) => updateButton(btn.id, { row: e.target.value })}
              placeholder="Row"
              className="w-16 rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500/60"
            />
            <button type="button" onClick={() => removeButton(btn.id)} className="rounded-xl border border-red-400/30 px-3 py-2 text-xs text-red-300 hover:border-red-400">
              ✕
            </button>
          </div>
        ))}
      </section>

      {/* Error */}
      {submitError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          to={`/channel/${channelId}`}
          className="flex-1 inline-flex items-center justify-center rounded-full border border-slate-700/70 bg-slate-950/80 px-5 py-3 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-600/70 hover:text-white"
        >
          Отмена
        </Link>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleSubmit()}
          className="flex-1 inline-flex items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-xs uppercase tracking-[0.2em] text-blue-100 transition hover:border-blue-500/50 hover:bg-blue-500/20 disabled:opacity-50"
        >
          {submitting ? 'Создание...' : status === 'scheduled' ? 'Запланировать' : 'Опубликовать'}
        </button>
      </div>

      {/* AI Chat Sheet */}
      {isAiOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button type="button" className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setIsAiOpen(false)} aria-label="Закрыть" />
          <section
            className="relative z-10 flex w-full max-w-md flex-col rounded-t-3xl border border-slate-800/70 bg-slate-900/95 backdrop-blur sm:max-w-xl lg:max-w-3xl"
            style={{ height: '85vh' }}
          >
            <div className="flex items-center justify-between border-b border-slate-800/60 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-blue-300">
                    <path d="M10 3a7 7 0 0 1 7 7v1a2 2 0 0 1-2 2h-1m-1-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">AI Помощник</p>
                  <p className="text-xs text-slate-400">Помогу создать пост</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsAiOpen(false)} className="rounded-full p-2 hover:bg-slate-800/50">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-slate-400"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div ref={chatRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-blue-500/20 text-blue-50' : 'bg-slate-800/60 text-slate-100'}`}>
                    <p className="text-sm">{msg.content}</p>
                    {msg.role === 'assistant' && (
                      <button type="button" onClick={() => insertAiText(msg.content)} className="mt-2 text-xs text-blue-300 hover:text-blue-200">
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
                      {[0, 150, 300].map((delay) => (
                        <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800/60 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendAiMessage()}
                  placeholder="Спросите что-нибудь..."
                  className="flex-1 rounded-full border border-slate-800/80 bg-slate-950/60 px-4 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500/60"
                />
                <button
                  type="button"
                  onClick={sendAiMessage}
                  disabled={!aiInput.trim()}
                  className="rounded-full bg-blue-500/20 px-4 py-2 text-blue-100 hover:bg-blue-500/30 disabled:opacity-50"
                >
                  <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                    <path d="M3 10h14m-7-7 7 7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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