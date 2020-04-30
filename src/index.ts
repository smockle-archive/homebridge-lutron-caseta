import { API } from "homebridge";

import { PlatformName, PluginName } from "./common";
import { LutronCasetaPlatform } from "./lutron-caseta-platform";

export default function (homebridge: API) {
  homebridge.registerPlatform(PluginName, PlatformName, LutronCasetaPlatform);
}
