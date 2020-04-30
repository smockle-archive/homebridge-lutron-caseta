import net from "net";

import { Logging } from "homebridge";

import {
  CasetaBridgeConnection,
  ConnectionState,
} from "../caseta-bridge-connection";
import {
  FakeServer,
  FakeServerConnection,
  FakeServerConnectionState,
} from "./fake-server";

describe("CasetaBridgeConnection", () => {
  describe("#constructor", () => {
    let connectMock: jest.Mock;
    beforeEach(() => {
      connectMock = jest.fn((port, host) => {
        return { on: jest.fn() };
      });
      jest.spyOn(net, "connect").mockImplementation(connectMock);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("opens a socket to the provided host and port", () => {
      const fakeHost = "random.string",
        fakePort = 12312;
      new CasetaBridgeConnection((jest.fn() as unknown) as Logging, {
        host: fakeHost,
        port: fakePort,
      });

      expect(connectMock.mock.calls[0]).toEqual([fakePort, fakeHost]);
    });

    it("initializes the state to AWAITING_LOGIN", () => {
      const bridgeConnection = new CasetaBridgeConnection(
        (jest.fn() as unknown) as Logging
      );
      expect(bridgeConnection.state).toEqual(ConnectionState.AWAITING_LOGIN);
    });
  });

  describe("with fake server", () => {
    let messages: { receiver: string; data: string }[];
    let server: FakeServer;
    let serverConnection: FakeServerConnection;
    let serverSocket: net.Socket;
    let bridgeConnection: CasetaBridgeConnection;
    let bridgeSocket: net.Socket;

    beforeEach(() => {
      const debug = false;
      messages = [];

      server = new FakeServer({ messages: messages, debug: debug });
      server.listeningPromise.then((address) => {
        bridgeConnection = new CasetaBridgeConnection(
          (jest.fn() as unknown) as Logging,
          {
            host:
              address && typeof address !== "string"
                ? address.address
                : undefined,
            port:
              address && typeof address !== "string" ? address.port : undefined,
            debug,
          }
        );
        bridgeSocket = bridgeConnection.socket;

        bridgeSocket.on("data", (data) => {
          if (debug) {
            console.log("Bridge socket received data", data.toString());
          }
          messages.push({
            receiver: "bridge_connection",
            data: data.toString(),
          });
        });
      });

      return server.connectionReceivedPromise.then((connection) => {
        serverConnection = connection as FakeServerConnection;
        serverSocket = serverConnection.socket;
      });
    });

    afterEach(() => {
      bridgeSocket.destroy();
      const closePromise = new Promise((resolve) => {
        server.netServer!.once("close", resolve);
      });
      server.netServer!.close();
      return closePromise;
    });

    describe("#receiveData", () => {
      describe("state = AWAITING_LOGIN", () => {
        it("logs in", async () => {
          expect.assertions(8 * 2 + 1 + 1);
          await new Promise((resolve) => bridgeSocket.once("data", resolve));
          expect(messages.length).toEqual(1);
          expect(messages[messages.length - 1]).toEqual({
            receiver: "bridge_connection",
            data: "login: \r\n",
          });

          await new Promise((resolve) => serverSocket.once("data", resolve));
          expect(messages.length).toEqual(2);
          expect(messages[messages.length - 1]).toEqual({
            receiver: "server_connection",
            data: "lutron\r\n",
          });

          await new Promise((resolve) => bridgeSocket.once("data", resolve));
          expect(messages.length).toEqual(3);
          expect(messages[messages.length - 1]).toEqual({
            receiver: "bridge_connection",
            data: "password: \r\n",
          });

          await new Promise((resolve) => serverSocket.once("data", resolve));
          expect(messages.length).toEqual(4);
          expect(messages[messages.length - 1]).toEqual({
            receiver: "server_connection",
            data: "integration\r\n",
          });

          await new Promise((resolve) => bridgeSocket.once("data", resolve));
          expect(messages.length).toEqual(5);
          expect(messages[messages.length - 1]).toEqual({
            receiver: "bridge_connection",
            data: "login: \r\n",
          });

          await new Promise((resolve) => serverSocket.once("data", resolve));
          expect(messages.length).toEqual(6);
          expect(messages[messages.length - 1]).toEqual({
            receiver: "server_connection",
            data: "lutron\r\n",
          });

          await new Promise((resolve) => bridgeSocket.once("data", resolve));
          expect(messages.length).toEqual(7);
          expect(messages[messages.length - 1]).toEqual({
            receiver: "bridge_connection",
            data: "password: \r\n",
          });

          await new Promise((resolve) => serverSocket.once("data", resolve));
          expect(messages.length).toEqual(8);
          expect(messages[messages.length - 1]).toEqual({
            receiver: "server_connection",
            data: "integration\r\n",
          });

          expect(serverConnection.state).toEqual(
            FakeServerConnectionState.LOGGED_IN
          );

          await new Promise((resolve) => bridgeSocket.once("data", resolve));
          expect(bridgeConnection.state).toEqual(ConnectionState.LOGGED_IN);
        });

        it("emits logged in messages", () => {
          const expectationPromise = new Promise((resolve) => {
            bridgeConnection.on("loggedIn", resolve);
          });

          return expectationPromise;
        });
      });

      describe("state = LOGGED_IN", () => {
        beforeEach(() => {
          serverConnection.state = FakeServerConnectionState.LOGGED_IN;
          bridgeConnection.state = ConnectionState.LOGGED_IN;
        });

        it("emits parsed monitoring messages", () => {
          expect.assertions(2);

          serverSocket.write("~DEVICE,2,3,4");

          return new Promise((resolve) => {
            bridgeConnection.on(
              "monitorMessageReceived",
              (integrationID, commandFields) => {
                expect(integrationID).toEqual("2");
                expect(commandFields).toEqual(["3", "4"]);
                resolve();
              }
            );
          });
        });
      });
    });
  });
});
