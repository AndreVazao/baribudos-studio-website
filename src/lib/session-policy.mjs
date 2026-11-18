export function getActiveSessionUser(user) {
  return user?.isActive === true ? user : null;
}
