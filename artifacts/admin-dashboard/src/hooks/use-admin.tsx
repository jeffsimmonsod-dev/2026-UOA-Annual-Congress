import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";

interface AdminContextType {
  pin: string | null;
  setPin: (pin: string | null) => void;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

const PIN_STORAGE_KEY = "admin_pin";

export function AdminProvider({ children }: { children: ReactNode }) {
  const [pin, setPinState] = useState<string | null>(() => {
    return localStorage.getItem(PIN_STORAGE_KEY);
  });
  const [, setLocation] = useLocation();

  const setPin = (newPin: string | null) => {
    setPinState(newPin);
    if (newPin) {
      localStorage.setItem(PIN_STORAGE_KEY, newPin);
    } else {
      localStorage.removeItem(PIN_STORAGE_KEY);
    }
  };

  const logout = () => {
    setPin(null);
    setLocation("/");
  };

  return (
    <AdminContext.Provider value={{ pin, setPin, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
