import {
  API,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
} from "homebridge";

import {
  BridgeConnectionOptions,
  CasetaBridgeConnection,
  ConnectionEvent,
} from "./caseta-bridge-connection";
import { PlatformName, PluginName } from "./common";
import {
  LutronAccessory,
  LutronAccessoryConfig,
  LutronPicoRemoteAccessory,
} from "./lutron-accessory";

export interface LutronCasetaPlatformConfig extends PlatformConfig {
  bridgeConnection: Partial<BridgeConnectionOptions> | undefined;
  accessories: LutronAccessoryConfig[];
}

export class LutronCasetaPlatform implements DynamicPlatformPlugin {
  log: Logging;
  config: LutronCasetaPlatformConfig;
  homebridgeAPI: API;
  bridgeConnection: CasetaBridgeConnection;
  accessoriesByIntegrationID: {
    [key: string]: LutronPicoRemoteAccessory;
  };

  constructor(log: Logging, config: LutronCasetaPlatformConfig, api: API) {
    this.log = log;
    this.config = config;
    this.homebridgeAPI = api;

    this.bridgeConnection = new CasetaBridgeConnection(
      this.log,
      this.config.bridgeConnection
    );
    this.bridgeConnection.on(
      ConnectionEvent.MonitorMessageReceived,
      (integrationID, commandFields) => {
        if (
          this.accessoriesByIntegrationID &&
          this.accessoriesByIntegrationID[integrationID]
        ) {
          this._dispatchMonitorMessage(integrationID, commandFields);
        }
      }
    );

    this.accessoriesByIntegrationID = {};

    this.homebridgeAPI.on("didFinishLaunching", () => {
      for (let accessoryConfig of this.config.accessories) {
        accessoryConfig.integrationID = String(accessoryConfig.integrationID);
        this._addAccessoryFromConfig(accessoryConfig);
      }
    });
  }

  // Homebridge uses this API to load accessories from its cache.
  configureAccessory(
    platformAccessory: PlatformAccessory<{ config: LutronAccessoryConfig }>
  ) {
    this._addAccessoryFromConfig(
      platformAccessory.context.config,
      platformAccessory
    );
  }

  _trackAccessory(accessory: LutronPicoRemoteAccessory) {
    this.accessoriesByIntegrationID[accessory.integrationID] = accessory;
  }

  _addAccessoryFromConfig(
    accessoryConfig: LutronAccessoryConfig,
    cachedPlatformAccessory: PlatformAccessory<{
      config: LutronAccessoryConfig;
    }> | null = null
  ) {
    const existingAccessory = this.accessoriesByIntegrationID[
      accessoryConfig.integrationID
    ];

    let needToRegisterPlatformAccessory = false;

    if (cachedPlatformAccessory === null) {
      if (existingAccessory && "platformAccessory" in existingAccessory) {
        cachedPlatformAccessory = existingAccessory.platformAccessory;
      } else {
        const uuid = this.homebridgeAPI.hap.uuid.generate(accessoryConfig.name);
        cachedPlatformAccessory = new this.homebridgeAPI.platformAccessory(
          accessoryConfig.name,
          uuid
        );
        needToRegisterPlatformAccessory = true;
      }
      cachedPlatformAccessory.context.config = accessoryConfig;
    }

    if (existingAccessory === undefined) {
      const accessory = LutronAccessory.accessoryForType(
        accessoryConfig.type,
        this.log,
        cachedPlatformAccessory,
        this.homebridgeAPI
      );
      this._trackAccessory(accessory);
    }

    if (needToRegisterPlatformAccessory) {
      this.homebridgeAPI.registerPlatformAccessories(PluginName, PlatformName, [
        cachedPlatformAccessory,
      ]);
    }
  }

  _dispatchMonitorMessage(
    integrationID: "string",
    commandFields: [string, string]
  ) {
    const accessory = this.accessoriesByIntegrationID[integrationID];
    accessory._dispatchMonitorMessage(commandFields);
  }
}
