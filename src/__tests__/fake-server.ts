import { rejects } from "assert";
import net from "net";

import { BridgeConnectionOptions } from "../caseta-bridge-connection";

export enum FakeServerConnectionState {
  AWAITING_FIRST_LOGIN = 1,
  AWAITING_FIRST_PASSWORD = 2,
  AWAITING_SECOND_LOGIN = 3,
  AWAITING_SECOND_PASSWORD = 4,
  LOGGED_IN = 5,
}

interface FakeServerOptions extends Partial<BridgeConnectionOptions> {
  messages: { receiver: string; data: string }[];
}

export class FakeServerConnection {
  options: FakeServerOptions;
  state: FakeServerConnectionState;
  socket: net.Socket;

  constructor(socket: net.Socket, options: FakeServerOptions) {
    this.options = {
      ...{
        debug: false,
        messages: [],
        username: "lutron",
        password: "integration",
      },
      ...options,
    };
    this.state = FakeServerConnectionState.AWAITING_FIRST_LOGIN;
    this.socket = socket;
    this.socket.on("data", (data) => {
      this.receivedData(data);
    });
    // Initial login sequence.
    this.socket.write("login: \r\n");
  }

  receivedData(data: Buffer) {
    if (this.options.debug) {
      console.log("Server socket received data", data);
    }
    this.options.messages.push({
      receiver: "server_connection",
      data: data.toString(),
    });

    const lines = data
      .toString()
      .split("\r\n")
      .filter((l) => l != "");

    for (let line of lines) {
      switch (this.state) {
        case FakeServerConnectionState.AWAITING_FIRST_LOGIN:
        case FakeServerConnectionState.AWAITING_SECOND_LOGIN:
          this.processUsername(line);
          break;
        case FakeServerConnectionState.AWAITING_FIRST_PASSWORD:
        case FakeServerConnectionState.AWAITING_SECOND_PASSWORD:
          this.processPassword(line);
          break;
        case FakeServerConnectionState.LOGGED_IN:
          this.sendPrompt();
          break;
      }
    }
  }

  processUsername(line: string) {
    if (line == this.options.username) {
      this.state =
        this.state == FakeServerConnectionState.AWAITING_FIRST_LOGIN
          ? FakeServerConnectionState.AWAITING_FIRST_PASSWORD
          : FakeServerConnectionState.AWAITING_SECOND_PASSWORD;
      this.socket.write("password: \r\n");
    } else {
      throw new Error(
        `Fake server expected username ${this.options.username} but received '${line}'`
      );
    }
  }

  processPassword(line: string) {
    if (line == this.options.password) {
      if (this.state == FakeServerConnectionState.AWAITING_FIRST_PASSWORD) {
        this.state = FakeServerConnectionState.AWAITING_SECOND_LOGIN;
        this.socket.write("login: \r\n");
      } else {
        this.state = FakeServerConnectionState.LOGGED_IN;
        this.sendPrompt();
      }
    } else {
      throw new Error(
        `Fake server expected password ${this.options.password} but received '${line}'`
      );
    }
  }

  sendPrompt() {
    this.socket.write("GNET> \r\n");
  }
}

export class FakeServer {
  options: FakeServerOptions;
  connectionReceivedPromise: Promise<FakeServerConnection | void>;
  listeningPromise: Promise<net.AddressInfo | string | null | void>;
  netServer: net.Server | undefined;

  constructor(options: Partial<FakeServerOptions>) {
    this.options = {
      ...{
        debug: false,
        messages: [],
      },
      ...options,
    };

    this.connectionReceivedPromise = new Promise<FakeServerConnection | void>(
      (resolve) => {
        this.netServer = net.createServer((socket) => {
          const connection = new FakeServerConnection(socket, {
            debug: this.options.debug,
            messages: this.options.messages,
          });
          resolve(connection);
        });
      }
    ).catch((e) => {
      console.error("FakeServer encountered error receiving connection:", e);
    });

    this.listeningPromise = new Promise<net.AddressInfo | string | null | void>(
      (resolve) => {
        this.netServer!.listen({ host: "127.0.0.1", port: 0 }, () => {
          resolve(this.netServer!.address());
        });
      }
    ).catch((e) => {
      console.error("FakeServer encountered error starting listening:", e);
    });
  }
}
