export type SavedAccount = { email: string; name: string };

const STORAGE_KEY = "vju-clubhub-accounts";

export function getSavedAccounts(): SavedAccount[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item): item is SavedAccount => !!item && typeof item.email === "string" && typeof item.name === "string") : [];
  } catch {
    return [];
  }
}

export function rememberAccount(account: SavedAccount) {
  const accounts = getSavedAccounts().filter((item) => item.email.toLowerCase() !== account.email.toLowerCase());
  localStorage.setItem(STORAGE_KEY, JSON.stringify([account, ...accounts].slice(0, 8)));
}
