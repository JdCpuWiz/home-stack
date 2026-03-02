"use client";

import { createContext, useContext, useState } from "react";

type GroceryActions = {
  completeTrip: () => Promise<void>;
  storeName: string;
};

type GroceryActionsContextType = {
  actions: GroceryActions | null;
  register: (actions: GroceryActions) => void;
  unregister: () => void;
};

const GroceryActionsContext = createContext<GroceryActionsContextType>({
  actions: null,
  register: () => {},
  unregister: () => {},
});

export function GroceryActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<GroceryActions | null>(null);

  function register(a: GroceryActions) {
    setActions(a);
  }

  function unregister() {
    setActions(null);
  }

  return (
    <GroceryActionsContext.Provider value={{ actions, register, unregister }}>
      {children}
    </GroceryActionsContext.Provider>
  );
}

export function useGroceryActions() {
  return useContext(GroceryActionsContext);
}
