import { useRegisterSW } from "virtual:pwa-register/react";

/** Shown when a new build has been fetched by the service worker. */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="toast no-print" role="status">
      <span>A new version is available.</span>
      <button onClick={() => void updateServiceWorker(true)}>Reload</button>
      <button onClick={() => setNeedRefresh(false)} style={{ background: "transparent", color: "inherit" }}>
        Later
      </button>
    </div>
  );
}
