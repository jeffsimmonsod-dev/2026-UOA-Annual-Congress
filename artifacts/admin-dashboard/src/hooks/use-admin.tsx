import { createContext, useContext, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

interface AdminContextType {
  pin: string | null;
  operatorName: string | null;
  operatorSession: string | null;
  signIn: (pin: string, operatorName: string, operatorSession: string) => void;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

const PIN_STORAGE_KEY = "admin_pin";
const OPERATOR_STORAGE_KEY = "admin_operator";

export function AdminProvider({ children }: { children: ReactNode }) {
  const [pin, setPinState] = useState<string | null>(() => {
    // Discard older shared-PIN-only login state; it cannot identify an operator.
    localStorage.removeItem(PIN_STORAGE_KEY);
    return sessionStorage.getItem(PIN_STORAGE_KEY);
  });
  const [operator, setOperator] = useState<{ name: string; token: string } | null>(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(OPERATOR_STORAGE_KEY) ?? "null");
      return typeof value?.name === "string" && typeof value?.token === "string" ? value : null;
    } catch { return null; }
  });
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const signIn = (newPin: string, operatorName: string, operatorSession: string) => {
    sessionStorage.setItem(PIN_STORAGE_KEY, newPin);
    sessionStorage.setItem(OPERATOR_STORAGE_KEY, JSON.stringify({ name: operatorName, token: operatorSession }));
    setPinState(newPin);
    setOperator({ name: operatorName, token: operatorSession });
  };

  const logout = () => {
    sessionStorage.removeItem(PIN_STORAGE_KEY);
    sessionStorage.removeItem(OPERATOR_STORAGE_KEY);
    setPinState(null);
    setOperator(null);
    queryClient.clear();
    setLocation("/");
  };

  return (
    <AdminContext.Provider value={{ pin: operator ? pin : null, operatorName: operator?.name ?? null, operatorSession: operator?.token ?? null, signIn, logout }}>
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
