import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface UserProfile {
  name: string;
  email: string;
}

interface ProfileContextValue {
  profile: UserProfile | null;
  profileLoaded: boolean;
  saveProfile: (p: UserProfile) => Promise<void>;
  clearProfile: () => Promise<void>;
}

const STORAGE_KEY = "@uoa_congress_2026_profile";

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  profileLoaded: false,
  saveProfile: async () => {},
  clearProfile: async () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            setProfile(JSON.parse(stored));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoaded(true));
  }, []);

  const saveProfile = useCallback(async (p: UserProfile) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setProfile(p);
  }, []);

  const clearProfile = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setProfile(null);
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, profileLoaded, saveProfile, clearProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
