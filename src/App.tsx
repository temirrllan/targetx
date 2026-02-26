import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TelegramProvider } from "./contexts/TelegramContext.tsx";

const MainLayout = lazy(() => import("./layouts/MainLayout"));
const HomePage = lazy(() => import("./pages/HomePage"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const AddChannelPage = lazy(() => import("./pages/AddChannelPage"));
const ChannelDetailsPage = lazy(() => import("./pages/ChannelDetailsPage"));
const CreatePostPage = lazy(() => import("./pages/CreatePostPage"));
const AiChatPage = lazy(() => import("./pages/AiChatPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-blue-500" />
  </div>
);

const App = () => {
  return (
    <TelegramProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              <Route path="add-channel" element={<AddChannelPage />} />
              <Route path="ai-chat" element={<AiChatPage />} />
              <Route path="channel/:channelId" element={<ChannelDetailsPage />} />
              <Route path="channel/:channelId/ai-chat" element={<AiChatPage />} />
              <Route path="channel/:channelId/create-post" element={<CreatePostPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TelegramProvider>
  );
};

export default App;
