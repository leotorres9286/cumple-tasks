const disabledValues = new Set(["0", "false", "no", "off", "disabled"]);

export function isPublicSignupEnabled() {
  const value = process.env.PUBLIC_SIGNUP_ENABLED;

  if (!value) {
    return true;
  }

  return !disabledValues.has(value.trim().toLowerCase());
}
