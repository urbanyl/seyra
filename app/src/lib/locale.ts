import { getLang } from './i18n';

const LOCALES: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
  zh: 'zh-CN',
  ru: 'ru-RU',
  ko: 'ko-KR',
  ar: 'ar-EG',
};

/** Locale Intl correspondant à la langue de l'interface. */
export function locale(): string {
  return LOCALES[getLang()] ?? 'en-GB';
}
