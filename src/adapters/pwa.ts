export interface StudioServiceWorkerWindow extends Window {
  navigator: Navigator & {serviceWorker?: ServiceWorkerContainer};
}

export function canRegisterStudioServiceWorker(windowRef: StudioServiceWorkerWindow): boolean {
  const localHost = ['localhost', '127.0.0.1', '::1'].includes(windowRef.location.hostname);
  return (windowRef.location.protocol === 'https:' || localHost)
    && Boolean(windowRef.navigator.serviceWorker);
}

/** Registers only the Pages application shell; project data remains owned by IndexedDB. */
export async function registerStudioServiceWorker(
  windowRef: StudioServiceWorkerWindow,
): Promise<ServiceWorkerRegistration | null> {
  if(!canRegisterStudioServiceWorker(windowRef)) return null;
  try {
    const url = new URL('./service-worker.js', windowRef.location.href);
    return await windowRef.navigator.serviceWorker!.register(url.href, {scope:'./'});
  } catch(error) {
    console.warn('Outdoor Route Studio offline shell is unavailable', error);
    return null;
  }
}
