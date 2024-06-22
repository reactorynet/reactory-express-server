'use strict'
import clientData from '@reactory/server-core/data/clients';
import emojiData from '@reactory/server-core/data/emoji'
import componentData from '@reactory/server-core/data/components';

export const clients = clientData;
export const emoji = emojiData;
export const components = componentData;

export default {
  emoji,
  clients,
  components,
};
