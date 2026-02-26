import { fetchData } from './ApiSett';
import type { User } from '../types/api';

interface RawUser {
  _id?: string;
  tgId?: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  subscription?: User['subscription'];
}

interface MeResponse {
  user?: RawUser;
}

const mapUser = (raw: RawUser): User => ({
  id: raw._id || String(raw.tgId || ''),
  firstName: raw.firstName,
  lastName: raw.lastName,
  username: raw.username,
  photoUrl: raw.photoUrl,
  subscription: raw.subscription ?? 'not_paid',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const authApi = {
  getCurrentUser: async (): Promise<User> => {
    const response = await fetchData<MeResponse | RawUser>({
      method: 'GET',
      url: '/api/tgapp/me',
      cacheTtlMs: 15000,
    });

    const raw = (response as MeResponse).user ?? (response as RawUser);
    return mapUser(raw);
  },

  getUserById: async (id: string): Promise<User> => {
    const response = await fetchData<RawUser>({
      method: 'GET',
      url: `/api/users/${id}`,
      cacheTtlMs: 15000,
    });
    return mapUser(response);
  },
};
