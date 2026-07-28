import type {LocalizationLanguage} from './translations.ts';

export interface LocalizationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LocalizationRuntimeDependencies {
  document: Document;
  storage?: LocalizationStorage | null;
  browserLanguage?: string | null;
  resolveLanguage(value: string | null | undefined): LocalizationLanguage;
  translate(language: LocalizationLanguage, key: string): string;
  rebuild?: () => void;
  refresh?: () => void;
  storageKey?: string;
  languageButtonId?: string;
}

export interface LocalizationRuntime {
  language(): LocalizationLanguage;
  translate(key: string): string;
  apply(): void;
  setLanguage(language: string): LocalizationLanguage;
  toggle(): LocalizationLanguage;
}

function readInitialLanguage(
  storage: LocalizationStorage | null | undefined,
  storageKey: string,
  browserLanguage: string | null | undefined,
): string {
  try {
    const stored = storage?.getItem(storageKey);
    if(stored) return stored;
  } catch {
    // Storage can be unavailable for local files or hardened browser profiles.
  }
  return browserLanguage?.startsWith('en') ? 'en' : 'zh';
}

/** Owns language state and all language-specific DOM synchronization. */
export function createLocalizationRuntime(
  dependencies: LocalizationRuntimeDependencies,
): LocalizationRuntime {
  const {
    document,
    storage = null,
    browserLanguage = null,
    resolveLanguage,
    translate,
    rebuild,
    refresh,
    storageKey = 'hiking_lang',
    languageButtonId = 'lang-btn',
  } = dependencies;
  let current = resolveLanguage(readInitialLanguage(storage, storageKey, browserLanguage));

  const text = (key: string): string => translate(current, key);

  const apply = (): void => {
    document.documentElement.lang = current === 'en' ? 'en' : 'zh-CN';
    document.title = text('app.title');
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(element => {
      element.textContent = text(element.dataset.i18n || '');
    });
    document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach(element => {
      element.title = text(element.dataset.i18nTitle || '');
    });
    const languageButton = document.getElementById(languageButtonId);
    if(languageButton) languageButton.textContent = current === 'zh' ? '🌐 EN' : '🌐 中';

    const EventConstructor = document.defaultView?.CustomEvent;
    if(EventConstructor) {
      document.defaultView?.dispatchEvent(new EventConstructor('studio:language-changed', {
        detail:{language:current},
      }));
    }
  };

  const setLanguage = (language: string): LocalizationLanguage => {
    current = resolveLanguage(language);
    try {
      storage?.setItem(storageKey, current);
    } catch {
      // Language still applies for this session when persistence is unavailable.
    }
    rebuild?.();
    apply();
    refresh?.();
    return current;
  };

  return Object.freeze({
    language:() => current,
    translate:text,
    apply,
    setLanguage,
    toggle:() => setLanguage(current === 'zh' ? 'en' : 'zh'),
  });
}
