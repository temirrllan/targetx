import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { channelService } from "../services/channelService";
import type { ChannelSummary } from "../types/api";

interface ChannelsContextValue {
  channels: ChannelSummary[];
  isLoading: boolean;
  error: Error | null;
  refreshChannels: () => Promise<void>;
}

const ChannelsContext = createContext<ChannelsContextValue | undefined>(
  undefined
);

export const useChannels = () => {
  const context = useContext(ChannelsContext);
  if (!context) {
    throw new Error("useChannels must be used within ChannelsProvider");
  }
  return context;
};

interface ChannelsProviderProps {
  children: ReactNode;
}

export const ChannelsProvider = ({ children }: ChannelsProviderProps) => {
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshChannels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const channelsData = await channelService.getChannels();
      setChannels(channelsData);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Неизвестная ошибка");
      setError(error);
      console.error("Ошибка при загрузке каналов:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshChannels();
  }, [refreshChannels]);

  const value: ChannelsContextValue = {
    channels,
    isLoading,
    error,
    refreshChannels,
  };

  return (
    <ChannelsContext.Provider value={value}>
      {children}
    </ChannelsContext.Provider>
  );
};