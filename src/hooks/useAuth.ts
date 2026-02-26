import { useEffect } from "react";
import { useAppStore } from "../store/appStore";

export const useAuth = () => {
  const user = useAppStore((state) => state.user);
  const loading = useAppStore((state) => state.userLoading);
  const errorMessage = useAppStore((state) => state.userError);
  const hydrateTelegramUser = useAppStore((state) => state.hydrateTelegramUser);
  const fetchUser = useAppStore((state) => state.fetchUser);

  useEffect(() => {
    hydrateTelegramUser();
    void fetchUser({ background: true });
  }, [fetchUser, hydrateTelegramUser]);

  const refetch = async () => {
    await fetchUser({ force: true, background: false });
  };

  return {
    user,
    loading,
    error: errorMessage ? new Error(errorMessage) : null,
    refetch,
  };
};

