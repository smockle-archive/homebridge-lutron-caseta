import {
  API,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from "homebridge";

export enum ButtonState {
  BUTTON_DOWN = "3",
  BUTTON_UP = "4",
}

const ButtonMap = {
  "PICO-REMOTE": ["2", "4"],
  "PJ2-2B": ["2", "4"],
  "PJ2-3B": ["2", "3", "4"],
  "PJ2-3BRL": ["2", "4", "5", "6", "3"],
  "PJ2-4B": ["8", "9", "10", "11"],
};

export class LutronAccessory {
  static accessoryForType(
    type: keyof typeof ButtonMap,
    log: Logging,
    platformAccessory: PlatformAccessory,
    api: API
  ) {
    if (!Object.keys(ButtonMap).includes(type)) {
      log(`Unknown accessory type: ${type}`);
    }
    return new LutronPicoRemoteAccessory(
      ButtonMap[type],
      log,
      platformAccessory,
      api
    );
  }

  log: Logging;
  platformAccessory: PlatformAccessory;
  config: PlatformConfig;
  homebridgeAPI: API;
  integrationID: string;

  constructor(log: Logging, platformAccessory: PlatformAccessory, api: API) {
    this.log = log;
    this.platformAccessory = platformAccessory;
    this.config = platformAccessory.context.config;
    this.homebridgeAPI = api;
    this.integrationID = this.config.integrationID;
  }
}

export class LutronPicoRemoteAccessory extends LutronAccessory {
  switchServicesByButtonNumber: { [key: string]: Service };

  constructor(
    buttons: string[],
    log: Logging,
    platformAccessory: PlatformAccessory,
    api: API
  ) {
    super(log, platformAccessory, api);

    const StatelessProgrammableSwitch = this.homebridgeAPI.hap.Service
      .StatelessProgrammableSwitch;
    this.switchServicesByButtonNumber = buttons.reduce((acc, number) => {
      const displayName = `Switch ${number}`;

      let existingService:
        | Service
        | null
        | undefined = this.platformAccessory.getServiceByUUIDAndSubType(
        StatelessProgrammableSwitch,
        number
      );
      if (existingService && existingService.displayName != displayName) {
        this.platformAccessory.removeService(existingService);
        existingService = null;
      }

      let service;
      if (existingService) {
        service = existingService;
      } else {
        service = new this.homebridgeAPI.hap.Service.StatelessProgrammableSwitch(
          displayName,
          number
        );
        this.platformAccessory.addService(service);
      }

      acc[number] = service;

      return acc;
    }, {} as { [key: string]: Service });
  }

  _dispatchMonitorMessage(commandFields: [string, string]) {
    const [serviceNumber, buttonState] = commandFields;
    if (buttonState == ButtonState.BUTTON_UP) {
      const service = this.switchServicesByButtonNumber[serviceNumber];
      const characteristic = service.getCharacteristic(
        this.homebridgeAPI.hap.Characteristic.ProgrammableSwitchEvent
      );
      characteristic.setValue(0);
    }
  }
}
