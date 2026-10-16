/**
 * Демо-черга випускників (узагальнені факти + зовнішні URL).
 * Не копіює біографії theWaldorfs/Wikipedia.
 */
const { loadAlumni, saveAlumni, addAlumni } = require('./pipeline');

const SAMPLES = [
  {
    firstName: 'Jennifer',
    lastName: 'Aniston',
    country: 'USA',
    continent: 'Americas',
    occupationalGroup: 'Arts (performing - acting)',
    profession: 'Actress',
    sourceUrl: 'https://en.wikipedia.org/wiki/Jennifer_Aniston',
    profileShort:
      'Дженніфер Еністон — акторка, відома зокрема роллю у серіалі Friends. Навчалася у вальдорфській школі Rudolph Steiner School (Нью-Йорк).',
    source: 'seed',
  },
  {
    firstName: 'Big',
    lastName: 'Sean',
    aka: 'Sean Michael Anderson',
    country: 'USA',
    continent: 'Americas',
    occupationalGroup: 'Arts (performing - music)',
    profession: 'Rapper, songwriter',
    sourceUrl: 'https://en.wikipedia.org/wiki/Big_Sean',
    profileShort:
      'Big Sean — американський репер і автор пісень. Серед його освітнього шляху згадують вальдорфську школу.',
    source: 'seed',
  },
  {
    firstName: 'Ferdinand',
    lastName: 'Alexander Porsche',
    country: 'Germany',
    continent: 'Europe',
    occupationalGroup: 'Business / design',
    profession: 'Industrial designer',
    sourceUrl: 'https://en.wikipedia.org/wiki/Ferdinand_Alexander_Porsche',
    profileShort:
      'Фердинанд Александр Порше — промисловий дизайнер, пов’язаний із лінією Porsche; у джерелах вказують навчання у вальдорфській школі.',
    source: 'seed',
  },
  {
    firstName: 'Sandra',
    lastName: 'Bullock',
    country: 'Germany / USA',
    continent: 'Americas',
    occupationalGroup: 'Arts (performing - acting)',
    profession: 'Actress',
    sourceUrl: 'https://en.wikipedia.org/wiki/Sandra_Bullock',
    profileShort:
      'Сандра Буллок — акторка з міжнародною кар’єрою. У відкритих джерелах згадується період навчання у вальдорфській школі в Німеччині.',
    source: 'seed',
  },
  {
    firstName: 'Kenneth',
    lastName: 'Chenault',
    country: 'USA',
    continent: 'Americas',
    occupationalGroup: 'Business',
    profession: 'Business executive',
    sourceUrl: 'https://en.wikipedia.org/wiki/Kenneth_Chenault',
    profileShort:
      'Кеннет Ченолт — бізнес-лідер (зокрема American Express). У біографічних оглядах згадують вальдорфську освіту.',
    source: 'seed',
  },
  {
    firstName: 'Julianna',
    lastName: 'Margulies',
    country: 'USA',
    continent: 'Americas',
    occupationalGroup: 'Arts (performing - acting)',
    profession: 'Actress',
    sourceUrl: 'https://en.wikipedia.org/wiki/Julianna_Margulies',
    profileShort:
      'Джуліанна Маргуліс — акторка театру й кіно/ТБ. У профілях освіти фігурує вальдорфська школа.',
    source: 'seed',
  },
  {
    firstName: 'Nils',
    lastName: 'Mönkemeyer',
    country: 'Germany',
    continent: 'Europe',
    occupationalGroup: 'Arts (performing - music)',
    profession: 'Musician (violist)',
    sourceUrl: 'https://de.wikipedia.org/wiki/Nils_M%C3%B6nkemeyer',
    profileShort:
      'Нільс Мьонкемеєр — відомий альтист, викладач. Приклад музичної кар’єри серед випускників вальдорфських шкіл Німеччини.',
    source: 'seed',
  },
  {
    firstName: 'Matheus',
    lastName: 'Nachtergaele',
    country: 'Brazil',
    continent: 'Americas',
    occupationalGroup: 'Arts (performing - acting)',
    profession: 'Actor',
    sourceUrl: 'https://en.wikipedia.org/wiki/Matheus_Nachtergaele',
    profileShort:
      'Матеус Нахтергаеле — бразильський актор (зокрема City of God). У каталогах вальдорфських випускників його згадують серед діячів мистецтва.',
    source: 'seed',
  },
];

function seedSampleAlumni(opts = {}) {
  const force = Boolean(opts.force);
  const data = loadAlumni();
  if (!force && data.items.length > 0) {
    return {
      ok: true,
      skipped: true,
      message: `У черзі вже ${data.items.length} записів. Передайте force=true щоб додати ще.`,
      count: data.items.length,
    };
  }

  let added = 0;
  for (const sample of SAMPLES) {
    const exists = data.items.some(
      (a) =>
        a.firstName === sample.firstName &&
        a.lastName === sample.lastName &&
        a.status === 'queued'
    );
    if (exists) continue;
    const r = addAlumni({ ...sample, status: 'queued' });
    if (r.ok) added += 1;
  }

  const after = loadAlumni();
  return {
    ok: true,
    added,
    queued: after.items.filter((a) => a.status === 'queued').length,
    total: after.items.length,
  };
}

module.exports = { seedSampleAlumni, SAMPLES };

if (require.main === module) {
  const force = process.argv.includes('--force');
  const result = seedSampleAlumni({ force });
  console.log(JSON.stringify(result, null, 2));
}
