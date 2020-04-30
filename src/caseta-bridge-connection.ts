import { EventEmitter } from "events";
import net from "net";

import { Logging } from "homebridge";

export enum ConnectionState {
  AWAITING_LOGIN = 1,
  LOGGED_IN = 2,
}

export const ConnectionEvent = {
  LoggedIn: "loggedIn",
  MonitorMessageReceived: "monitorMessageReceived",
};

export type BridgeConnectionOptions = {
  host: string;
  port: string | number;
  username: string;
  password: string;
  debug: boolean;
};

export class CasetaBridgeConnection extends EventEmitter {
  log: Logging;
  options: BridgeConnectionOptions;
  state: ConnectionState;
  socket: net.Socket;

  constructor(log: Logging, options?: Partial<BridgeConnectionOptions>) {
    super();
    this.log = log;
    this.options = {
      ...{
        host: "",
        port: 23,
        username: "lutron",
        password: "integration",
        debug: false,
      },
      ...options,
    };
    this.state = ConnectionState.AWAITING_LOGIN;
    this.socket = net.connect(Number(this.options.port), this.options.host);
    this.socket.on("data", (data) => {
      this.receiveData(data);
    });
    this.socket.on("error", (error) => {
      log(`CasetaBridgeConnection error: ${error.message}`);
    });
  }

  receiveData(data: Buffer) {
    const lines = data
      .toString()
      .split("\r\n")
      .filter((l) => l != "");
    for (let line of lines) {
      if (this.options.debug) {
        console.log("Bridge connection processing line", line);
      }
      switch (this.state) {
        case ConnectionState.AWAITING_LOGIN:
          if (/^login:\s*/.test(line)) {
            this.socket.write(`${this.options.username}\r\n`);
          } else if (/^password:\s*/.test(line)) {
            this.socket.write(`${this.options.password}\r\n`);
          } else if (/^GNET>\s*/.test(line)) {
            this.state = ConnectionState.LOGGED_IN;
            this.emit(ConnectionEvent.LoggedIn);
          }
          break;
        case ConnectionState.LOGGED_IN:
          const args = line.split(",");
          if (args[0][0] === "~") {
            this.emit(
              ConnectionEvent.MonitorMessageReceived,
              args[1],
              args.slice(2)
            );
          }
          break;
      }
    }
  }
}
