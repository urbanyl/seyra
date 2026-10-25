import type { Dict } from './i18n';
import { APPSTR_EN } from './appstrings.en';
import { APPSTR_FR } from './appstrings.fr';
import { APPSTR_ZH } from './appstrings.zh';
import { APPSTR_RU } from './appstrings.ru';
import { APPSTR_KO } from './appstrings.ko';
import { APPSTR_AR } from './appstrings.ar';

/** Toutes les chaînes des applications, par langue (repli automatique sur en). */
export const APPSTR: Record<string, Dict> = {
  en: APPSTR_EN,
  fr: APPSTR_FR,
  zh: APPSTR_ZH,
  ru: APPSTR_RU,
  ko: APPSTR_KO,
  ar: APPSTR_AR,
};
