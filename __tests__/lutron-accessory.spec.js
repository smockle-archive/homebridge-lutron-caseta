// @ts-check
const { HomebridgeAPI } = require("homebridge/lib/api");
const { FakeServer } = require("./fake-server");
const { LutronCasetaPlatform } = require("../src/lutron-caseta-platform");
const { ButtonState } = require("../src/lutron-accessory");

describe("LutronCasetaPlatform", () => {
  let homebridge, platform, server, serverSocket;
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
    server = new FakeServer({ debug: debug });

    server.listeningPromise.then((address) => {
      const platformConfig = Object.assign({}, baseConfig, {
        bridgeConnection: {
          host: address.address,
          port: address.port,
          debug: debug,
        },
      });
      platform = new LutronCasetaPlatform(
        console.log,
        platformConfig,
        homebridge
      );
      homebridge.emit("didFinishLaunching");
    });

    return server.connectionReceivedPromise.then((connection) => {
      serverSocket = connection.socket;

      return new Promise((resolve) => {
        platform.bridgeConnection.on("loggedIn", resolve);
      });
    });
  });

  afterEach(() => {
    const closePromise = new Promise((resolve) => {
      server.netServer.once("close", resolve);
    });
    platform.bridgeConnection.socket.destroy();
    server.netServer.close();
    return closePromise;
  });

  it("doesn't trigger a switch event on button down", () => {
    expect.assertions(1);

    const accessory = platform.accessoriesByIntegrationID["2"];
    const service = accessory.platformAccessory.getServiceByUUIDAndSubType(
      homebridge.hap.Service.StatelessProgrammableSwitch,
      "4"
    );
    const characteristic = service.getCharacteristic(
      homebridge.hap.Characteristic.ProgrammableSwitchEvent
    );

    characteristic.setValue = jest.fn();

    serverSocket.write(`~DEVICE,2,4,${ButtonState.BUTTON_DOWN}`);

    return new Promise((resolve) => {
      platform.bridgeConnection.on("monitorMessageReceived", () => {
        expect(characteristic.setValue.mock.calls).toEqual([]);
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
    const characteristic = service.getCharacteristic(
      homebridge.hap.Characteristic.ProgrammableSwitchEvent
    );

    characteristic.setValue = jest.fn();

    serverSocket.write(`~DEVICE,2,4,${ButtonState.BUTTON_UP}`);

    return new Promise((resolve) => {
      platform.bridgeConnection.on("monitorMessageReceived", () => {
        expect(characteristic.setValue.mock.calls).toEqual([[0]]);
        resolve();
      });
    });
  });
});
