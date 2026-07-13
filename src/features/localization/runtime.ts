// @ts-nocheck
// Transitional classic fragments owned by localization.
// Bootstrap composes each named fragment exactly once into the compatibility runtime.
export {};

/* @runtime-fragment localization.runtime */
/* ============ i18n ============ */
let currentLang = (() => {
  try { return HTM_APP.resolveLocalizationLanguage(localStorage.getItem('hiking_lang') || (navigator.language && navigator.language.startsWith('en') ? 'en' : 'zh')); }
  catch(e) { return 'zh'; }
})();
function t(key) {
  return HTM_APP.translateMessage(currentLang, key);
}
function setLang(lang) {
  currentLang = HTM_APP.resolveLocalizationLanguage(lang);
  try { localStorage.setItem('hiking_lang', currentLang); } catch(e) {}
  if(typeof rebuildAll === 'function') rebuildAll({fit: false});
  applyI18n();  // 必须在 rebuildAll 之后再次调用，因为重建后 DOM 是新的中文默认
  // 海拔图、主轨迹小卡、模式标注点筛选标题用 JS 拼接，无 data-i18n，需手动刷新
  if(typeof refreshElevBar === 'function') refreshElevBar();
  if(typeof buildPrimaryMini === 'function') buildPrimaryMini();
  if(typeof buildPrimaryCard === 'function') buildPrimaryCard();
  if(typeof updateModeTagTitle === 'function') updateModeTagTitle();
}
function applyI18n() {
  document.title = t('app.title');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  HTM_APP.initializeWorkbenchChrome(document, window.localStorage);
}

/* ============ Changelog ============ */

function showChangelog() {
  return studioDialogs.content(HTM_APP.buildChangelogDialogModel(
    currentLang,
    t('changelog.title'),
    t('changelog.close'),
  ));
}
