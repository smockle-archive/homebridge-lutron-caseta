import net from "net";

import { Logging, PlatformConfig } from "homebridge";
import { HomebridgeAPI } from "homebridge/lib/api";

import { ButtonState } from "../lutron-accessory";
import { LutronCasetaPlatform } from "../lutron-caseta-platform";
import { FakeServer, FakeServerConnection } from "./fake-server";

describe("LutronCasetaPlatform", () => {
  let homebridge: HomebridgeAPI;
  let platform: LutronCasetaPlatform;
  let server: FakeServer;
  let serverSocket: net.Socket;

  const baseConfig = {
    accessories: [
      {
        type: "PICO-REMOTE",
        integrationID: 2,
        name: "test remote",
      },
    ],
  };

  beforeEach(() => {
    const debug = false;

    homebridge = new HomebridgeAPI();
    server = new FakeServer({ debug });

    server.listeningPromise.then((address) => {
      const platformConfig: Partial<PlatformConfig> = Object.assign(
        {},
        baseConfig,
        {
          bridgeConnection: {
            host:
              address && typeof address !== "string"
                ? address.address
                : undefined,
            port:
              address && typeof address !== "string" ? address.port : undefined,
            debug: debug,
          },
        }
      );
      platform = new LutronCasetaPlatform(
        (console.log as unknown) as Logging,
        platformConfig as PlatformConfig,
        homebridge
      );
      homebridge.emit("didFinishLaunching");
    });

    return server.connectionReceivedPromise.then((connection) => {
      const serverConnection = connection as FakeServerConnection;
      serverSocket = serverConnection.socket;

      return new Promise((resolve) => {
        platform.bridgeConnection.on("loggedIn", resolve);
      });
    });
  });

  afterEach(() => {
    const closePromise = new Promise((resolve) => {
      server.netServer!.once("close", resolve);
    });
    platform.bridgeConnection.socket.destroy();
    server.netServer!.close();
    return closePromise;
  });

  it("doesn't trigger a switch event on button down", () => {
    expect.assertions(1);

    const accessory = platform.accessoriesByIntegrationID["2"];
    const service = accessory.platformAccessory.getServiceByUUIDAndSubType(
      homebridge.hap.Service.StatelessProgrammableSwitch,
      "4"
    );
    const characteristic = service!.getCharacteristic(
      homebridge.hap.Characteristic.ProgrammableSwitchEvent
    );

    characteristic.setValue = jest.fn();

    serverSocket.write(`~DEVICE,2,4,${ButtonState.BUTTON_DOWN}`);

    return new Promise((resolve) => {
      platform.bridgeConnection.on("monitorMessageReceived", () => {
        expect((characteristic.setValue as jest.Mock).mock.calls).toEqual([]);
        resolve();
      });
    });
  });

  it("triggers a switch event on button up", () => {
    expect.assertions(1);

    const accessory = platform.accessoriesByIntegrationID["2"];
    const service = accessory.platformAccessory.getServiceByUUIDAndSubType(
      homebridge.hap.Service.StatelessProgrammableSwitch,
      "4"
    );
    const characteristic = service!.getCharacteristic(
      homebridge.hap.Characteristic.ProgrammableSwitchEvent
    );

    characteristic.setValue = jest.fn();

    serverSocket.write(`~DEVICE,2,4,${ButtonState.BUTTON_UP}`);

    return new Promise((resolve) => {
      platform.bridgeConnection.on("monitorMessageReceived", () => {
        expect((characteristic.setValue as jest.Mock).mock.calls).toEqual([
          [0],
        ]);
        resolve();
      });
    });
  });
});
