export function getActiveSessionUser<T extends { isActive: boolean }>(
  user: T | null | undefined
): T | null;
