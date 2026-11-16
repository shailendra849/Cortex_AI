const SELECTED_KEY = 'cortex:selectedConversationId';

export const saveSelectedConversationId = (id) => {
  if (!id) {
    localStorage.removeItem(SELECTED_KEY);
    return;
  }
  localStorage.setItem(SELECTED_KEY, id);
};

export const loadSelectedConversationId = () => localStorage.getItem(SELECTED_KEY);

export const findLatestPdfAttachment = (messages = []) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const pdf = messages[i]?.attachments?.find(
      (file) =>
        file?.mimeType === 'application/pdf' && (file.url || file.previewUrl)
    );
    if (pdf) return pdf;
  }
  return null;
};

export const pdfArtifactFromAttachment = (file) => {
  if (!file) return null;
  return [
    {
      id: Date.now(),
      type: 'pdf',
      title: file.name,
      url: file.url || file.previewUrl || null,
    },
  ];
};
