import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function handleOnline() {
      setIsOnline(true);
      setShowReconnected(true);
      timer = setTimeout(() => setShowReconnected(false), 3000);
    }

    function handleOffline() {
      setIsOnline(false);
      setShowReconnected(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearTimeout(timer);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`w-full px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
        isOnline
          ? "bg-green-600 text-white"
          : "bg-amber-500 text-white"
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          Back online — data is syncing
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          You&apos;re offline — showing cached data
        </>
      )}
    </div>
  );
}
