import { Reactory } from "@reactory/server-core/types/reactory";

import system from "./system";

const translations: Reactory.IReactoryTranslation[]  = [
  ...system
];

const en: Reactory.IReactoryTranslations = {
  id: null,
  locale: 'en',
  translations
};

export default en;
