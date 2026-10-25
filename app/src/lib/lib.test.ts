import { describe, expect, it } from 'vitest';
import { activeMention, cleanPseudo, formatCodeInput, initials, mentionPattern, mentionsName, suggestMentions } from './format';
import { buildPollCommand, isPollCommand, parsePoll } from './poll';
import { cleanName as cleanFileName } from './files';

describe('initials', () => {
  it('prend les deux premières lettres des mots', () => {
    expect(initials('Alice Martin')).toBe('AM');
    expect(initials('bob')).toBe('B');
  });

  it('ne coupe jamais un emoji en deux (régression du pseudo illisible)', () => {
    expect(initials('🎉Fête')).toBe('🎉');
    expect(initials('😎Cool')).toBe('😎');
  });

  it('retourne ? quand il n’y a rien', () => {
    expect(initials('   ')).toBe('?');
  });
});

describe('cleanPseudo', () => {
  it('limite à 24 points de code sans couper un emoji', () => {
    const out = cleanPseudo('🎉'.repeat(30));
    expect([...out]).toHaveLength(24);
    expect(out).not.toContain('\uFFFD');
  });

  it('retire les caractères de contrôle et les espaces superflus', () => {
    expect(cleanPseudo('  Ana\u0007   Lise  ')).toBe('Ana Lise');
  });
});

describe('cleanFileName', () => {
  it('garde le nom et retire les caractères de contrôle', () => {
    expect(cleanFileName('rapport\u0000.pdf')).toBe('rapport.pdf');
  });
});

describe('mentionsName', () => {
  it('détecte @nom, sans tenir compte de la casse', () => {
    expect(mentionsName('salut @bob tu viens ?', 'Bob')).toBe(true);
  });

  it('tolère la ponctuation finale', () => {
    expect(mentionsName('merci @Bob!', 'bob')).toBe(true);
  });

  it('ne déclenche pas sur un nom qui commence pareil', () => {
    expect(mentionsName('@bobby salut', 'bob')).toBe(false);
  });

  it('ignore un pseudo vide', () => {
    expect(mentionsName('@ salut', '   ')).toBe(false);
  });

  it('reconnaît un pseudo à espaces en entier', () => {
    expect(mentionsName('tu viens @Invité 1 ?', 'Invité 1')).toBe(true);
    expect(mentionsName('tu viens @Invité 2 ?', 'Invité 1')).toBe(false);
  });
});

describe('mentionPattern', () => {
  it('préfère le pseudo le plus long quand deux commencent pareil', () => {
    const re = mentionPattern(['Ann', 'Anne-Marie']);
    const m = re!.exec('bonjour @Anne-Marie !');
    expect(m?.[0]).toBe('@Anne-Marie');
  });

  it('renvoie null sans pseudo', () => {
    expect(mentionPattern([])).toBeNull();
  });
});

describe('formatCodeInput', () => {
  it('met en forme par blocs de 4 et force les majuscules', () => {
    expect(formatCodeInput('abcd1234efgh')).toBe('ABCD-1234-EFGH');
  });
});

describe('parsePoll', () => {
  const id = () => 'fixed-id';

  it('lit une question et ses options', () => {
    expect(parsePoll('/sondage Pizza ce soir ? | Oui | Non', id)).toEqual({
      id: 'fixed-id', q: 'Pizza ce soir ?', opts: ['Oui', 'Non'],
    });
  });

  it('refuse moins de deux options', () => {
    expect(parsePoll('/sondage Seul | une', id)).toBeNull();
  });

  it('ignore un message ordinaire', () => {
    expect(parsePoll('bonjour | à tous | non', id)).toBeNull();
  });

  it('plafonne à six options', () => {
    const p = parsePoll('/sondage Q | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8', id);
    expect(p?.opts).toHaveLength(6);
  });
});

describe('commande sondage', () => {
  it('reconnaît une tentative même incomplète', () => {
    expect(isPollCommand('/sondage')).toBe(true);
    expect(isPollCommand('/sondage Pizza')).toBe(true);
    expect(isPollCommand('bonjour')).toBe(false);
  });

  it('construit une commande valide depuis le formulaire', () => {
    expect(buildPollCommand('Pizza ?', ['Oui', 'Non', ''])).toBe('/sondage Pizza ? | Oui | Non');
  });

  it('refuse un formulaire avec moins de deux options', () => {
    expect(buildPollCommand('Pizza ?', ['Oui', ''])).toBeNull();
    expect(buildPollCommand('', ['Oui', 'Non'])).toBeNull();
  });

  it('retire les séparateurs saisis dans les champs', () => {
    expect(buildPollCommand('A | B', ['x|y', 'z'])).toBe('/sondage A B | x y | z');
  });
});

describe('mentions en cours de saisie', () => {
  it('trouve le @ en cours avant le curseur', () => {
    expect(activeMention('salut @inv', 10)).toEqual({ start: 6, query: 'inv' });
  });
  it('ignore un @ collé à un mot (adresse e-mail)', () => {
    expect(activeMention('mail a@b', 8)).toBeNull();
  });
  it('propose Invité 1 pour @inv, sans tenir compte de la casse ni des accents', () => {
    const list = [{ name: 'Alice' }, { name: 'Invité 1' }, { name: 'Ivan' }];
    expect(suggestMentions(list, 'INV').map((x) => x.name)).toEqual(['Invité 1']);
    expect(suggestMentions(list, 'inv').map((x) => x.name)).toEqual(['Invité 1']);
    expect(suggestMentions(list, 'i').map((x) => x.name)).toEqual(['Invité 1', 'Ivan', 'Alice']);
  });
});
