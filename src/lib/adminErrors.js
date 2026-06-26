export function getAdminErrorMessage(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const message =
    data?.message ||
    data?.error ||
    (Array.isArray(data?.errors) ? data.errors[0]?.message : undefined) ||
    err?.message;

  if (status === 409) return 'Already exists';
  if (status === 400) return message || 'Validation error';
  return message || 'Request failed';
}

