import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";

export function useNetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    if (Capacitor.isNativePlatform()) {
      void Network.getStatus().then((status) => {
        if (!disposed) setOnline(status.connected);
      });
      void Network.addListener("networkStatusChange", (status) => {
        setOnline(status.connected);
      }).then((listener) => {
        cleanup = () => void listener.remove();
      });
    } else {
      const update = () => setOnline(window.navigator.onLine);
      update();
      window.addEventListener("online", update);
      window.addEventListener("offline", update);
      cleanup = () => {
        window.removeEventListener("online", update);
        window.removeEventListener("offline", update);
      };
    }

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return online;
}
