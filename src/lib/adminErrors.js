export function getAdminErrorMessage(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const message =
    data?.message ||
    data?.error ||
    (Array.isArray(data?.errors) ? data.errors[0]?.message : undefined) ||
    err?.message;

  if (status === 409) return 'Already exists';
  if (status === 413) {
    return (
      message ||
      'Video file is too large for the server. Try a smaller file or ask admin to raise the upload limit.'
    );
  }
  if (status === 400) return message || 'Validation error';
  if (!err?.response && err?.code === 'ECONNABORTED') {
    return 'Upload timed out. Try a smaller video or check your connection.';
  }
  if (!err?.response && err?.message === 'Network Error') {
    return 'Upload failed (network). Large videos may be blocked by the server proxy — try under 50MB or contact support.';
  }
  return message || 'Request failed';
}

