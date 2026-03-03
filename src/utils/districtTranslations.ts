// District translations for Tashkent
// Keys are in Russian (as stored in database), values are translations

export const DISTRICT_TRANSLATIONS = {
  'Юнусабад': {
    uz: 'Yunusobod',
    en: 'Yunusobod',
    ru: 'Юнусабад'
  },
  'Чиланзар': {
    uz: 'Chilonzor',
    en: 'Chilonzor',
    ru: 'Чиланзар'
  },
  'Мирзо Улугбек': {
    uz: 'Mirzo Ulug\'bek',
    en: 'Mirzo Ulugbek',
    ru: 'Мирзо Улугбек'
  },
  'Сергели': {
    uz: 'Sergeli',
    en: 'Sergeli',
    ru: 'Сергели'
  },
  'Яккасарай': {
    uz: 'Yakkasaroy',
    en: 'Yakkasaray',
    ru: 'Яккасарай'
  },
  'Шайхонтохур': {
    uz: 'Shayxontohur',
    en: 'Shaykhontohur',
    ru: 'Шайхонтохур'
  },
  'Учтепа': {
    uz: 'Uchtepa',
    en: 'Uchtepa',
    ru: 'Учтепа'
  },
  'Бектемир': {
    uz: 'Bektemir',
    en: 'Bektemir',
    ru: 'Бектемир'
  },
  'Яшнобод': {
    uz: 'Yashnobod',
    en: 'Yashnobod',
    ru: 'Яшнобод'
  },
  'Олмазар': {
    uz: 'Olmazor',
    en: 'Olmazor',
    ru: 'Олмазар'
  },
  'Миробод': {
    uz: 'Mirobod',
    en: 'Mirobod',
    ru: 'Миробод'
  }
} as const;

// Get list of district keys (in Russian, as stored in database)
export const getDistrictKeys = (): string[] => {
  return Object.keys(DISTRICT_TRANSLATIONS);
};

// Translate a district name based on language
export const translateDistrict = (districtKey: string, language: 'en' | 'ru' | 'uz'): string => {
  const translation = DISTRICT_TRANSLATIONS[districtKey as keyof typeof DISTRICT_TRANSLATIONS];
  if (!translation) return districtKey; // Return original if not found
  return translation[language];
};

// Get all districts translated to a specific language
export const getTranslatedDistricts = (language: 'en' | 'ru' | 'uz'): string[] => {
  return getDistrictKeys().map(key => translateDistrict(key, language));
};

// Reverse lookup: find Russian key from translated name (for saving to database)
export const findDistrictKey = (translatedName: string): string => {
  for (const [key, translations] of Object.entries(DISTRICT_TRANSLATIONS)) {
    if (Object.values(translations).includes(translatedName)) {
      return key; // Return Russian key
    }
  }
  return translatedName; // Return original if not found
};