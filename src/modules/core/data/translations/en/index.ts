import { Reactory } from "@reactory/server-core/types/reactory";

import system from "./system";

const translations: Reactory.Models.IReactoryTranslation[]  = [
  ...system
];

const en: Reactory.Models.IReactoryTranslations = {
  id: null,
  locale: 'en',
  translations
};

export default en;
