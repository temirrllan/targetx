import { BrowserRouter, Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AddChannelPage from "./pages/AddChannelPage";
import ChannelDetailsPage from "./pages/ChannelDetailsPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import SubscriptionPage from "./pages/SubscriptionPage";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="add-channel" element={<AddChannelPage />} />
          <Route path="channel/:channelId" element={<ChannelDetailsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
