import  {MetaProvider}  from '@builderbot/provider-meta'; // si lo estás usando
import { config } from './index';
import { createProvider } from '@builderbot/bot';
import {BaileysProvider} from '@builderbot/provider-baileys'

 const providerMeta = createProvider (MetaProvider, {
  jwtToken: config.jwtToken,
  numberId: config.numberId,
  verifyToken: config.verifyToken,
  version: config.version,
});



 const providerBaileys = createProvider (BaileysProvider);

 export {providerMeta, providerBaileys}

