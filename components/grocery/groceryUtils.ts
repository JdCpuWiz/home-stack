export type GroceryStore = {
  id: number;
  name: string;
  position: number;
  createdAt: string;
};

export type GroceryArea = {
  id: number;
  name: string;
  position: number;
  createdAt: string;
};

export type GroceryListItem = {
  id: number;
  listId: number;
  areaId: number | null;
  area: GroceryArea | null;
  name: string;
  quantity: string | null;
  purchased: boolean;
  position: number;
  createdAt: string;
};

export type GroceryList = {
  id: number;
  storeId: number;
  store?: GroceryStore;
  status: "ACTIVE" | "COMPLETED";
  createdAt: string;
  updatedAt: string;
  items: GroceryListItem[];
};

export type GroceryTripItem = {
  id: number;
  tripId: number;
  name: string;
  quantity: string | null;
  areaName: string | null;
  purchased: boolean;
};

export type GroceryTrip = {
  id: number;
  listId: number;
  storeName: string;
  completedAt: string;
  items: GroceryTripItem[];
};
