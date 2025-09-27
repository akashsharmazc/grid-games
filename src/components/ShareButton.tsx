import { memo, useState, useCallback } from 'react';

interface ShareButtonProps {
  getUrl: () => string;
}

export const ShareButton = memo<ShareButtonProps>(({ getUrl }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    try {
      const url = getUrl();
      
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Ignore clipboard errors
    }
  }, [getUrl]);

  return (
    <button
      onClick={handleShare}
      className="rounded-xl bg-[color:var(--panel)] px-3 py-2 text-sm shadow hover:brightness-110 active:scale-[.98]"
    >
      {copied ? "Copied!" : "Share Link"}
    </button>
  );
});

ShareButton.displayName = 'ShareButton';
