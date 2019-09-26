# Homebridge Lutron Caséta

[![npm](https://img.shields.io/npm/v/homebridge-lutron-caseta-smockle.svg)](https://www.npmjs.com/package/homebridge-lutron-caseta-smockle)
[![Publish Workflow](https://github.com/smockle/homebridge-lutron-caseta/workflows/Publish/badge.svg)](https://github.com/smockle/homebridge-lutron-caseta/actions)
[![codecov](https://codecov.io/gh/smockle/homebridge-lutron-caseta/branch/master/graph/badge.svg)](https://codecov.io/gh/smockle/homebridge-lutron-caseta)
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=smockle/homebridge-lutron-caseta)](https://dependabot.com)

This is a fork of [jcoleman/homebridge-lutron-caseta](https://github.com/jcoleman/homebridge-lutron-caseta), a Homebridge plugin for integration with the Lutron Caséta Smart Bridge Pro.

# Update 2019-06-14

**I don’t use Lutron Caséta switches or remotes anymore, and I’m unlikely to undertake any new development on this plugin in the near future.** For now, new patch versions will continue to be published automatically when this plugin’s depedencies are updated. Please open an issue if you are interested in maintaining this plugin.

# Motivation

Lutron doesn’t expose its versatile Pico remotes as HomeKit accessories, so it’s not possible to use them to control non-Lutron accessories.

However, the Smart Bridge Pro (L-BDGPRO2-WH) allows connections over telnet via the Lutron Integration Protocol. This connection allows direct control of accessories, and, more critically for our purposes, streams notifications of Pico button presses. By watching this stream, `homebridge-lutron-caseta` can support Pico remotes in Homekit.

# Installation

Review the [Installation](https://github.com/nfarina/homebridge#installation) section of the Homebridge README.

```Bash
npm install -g homebridge-lutron-caseta-smockle
```

This project was originally published to the npm registry as [`@smockle/homebridge-lutron-caseta`](https://www.npmjs.com/package/@smockle/homebridge-lutron-caseta), but that package is now deprecated. Homebridge only supports plugins with names that start with `homebridge-`, i.e. [scoped packages are not supported](https://github.com/nfarina/homebridge/pull/2023).

# Setup

1. Connect your Lutron Caséta Smart Bridge Pro (L-BDGPRO2-WH) to power and ethernet

2. Login and add devices (e.g. Pico remotes) using [the Lutron iOS app](https://itunes.apple.com/us/app/lutron-caséta-ra2-select-app/id886753021)

3. In the Lutron app, press the gear in the top-left, then “Advanced” > “Integration”

- Enable “Telnet Support”
- Send the “Integration Report” to yourself via email
- Note the IP address assigned to your bridge in “Network Settings”

4. Configure your router to a static IP address to your bridge, matching the current IP address (noted in step 3).

# Configuration

```JSON
{
  "bridge": {
    "name": "Lutron Bridge",
    "username": "CC:22:3D:E3:CE:30",
    "port": 51826,
    "pin": "031-45-154"
  },
  "description": "SmartHome with Homebridge",
  "accessories": [],
  "platforms": [{
    "platform": "LutronCasetaPlatform",
    "bridgeConnection": {
      "host": "192.168.1.2"
    },
    "accessories": [{
      "name": "FiveButtonRemote1",
      "type": "PJ2-3BRL",
      "integrationID": 2
    }, {
      "name": "TwoButtonRemote1",
      "type": "PJ2-2B",
      "integrationID": 3
    }, {
      "name": "CompatibleTwoButtonRemote",
      "type": "PICO-REMOTE",
      "integrationID": 4
    }]
  }]
}
```

**Notes:**

- `"platform"` must be `"LutronCasetaPlatform"`
- `"host"` should match the static IP address of your bridge
- `"name"` values must be unique
- `"type"` should be one of `"PJ2-3BRL"`, `"PJ2-2B"` (which are [Pico model numbers](http://www.lutron.com/en-US/Products/Pages/SingleRoomControls/CasetaWireless/ModelNumbers.aspx#SectionHead3)) or `"PICO-REMOTE"` (which is compatible with [jcoleman/homebridge-lutron-caseta](https://github.com/jcoleman/homebridge-lutron-caseta))
- `"integrationID"` should match `"ID"` values from the “Integration Report” (emailed in Setup, step 3 above)

# Debugging

Review the [Plugin Development](https://github.com/nfarina/homebridge#plugin-development) section of the Homebridge README.

```Bash
mkdir -p ~/.homebridge-dev
cp /var/lib/homebridge-lutron/config.json ~/.homebridge-dev/
cd ~/Developer && git clone https://github.com/smockle/homebridge-lutron-caseta
cd ~
DEBUG=* ~/.npm-global/bin/homebridge -D -U ~/.homebridge-dev -P ~/Developer/homebridge-lutron-caseta/
```

# Disclaimer

Caséta, Clear Connect, Lutron and Pico are trademarks of Lutron Electronics Co., Inc., registered in the U.S. and other countries.

This project is in no way affiliated with, authorized, maintained, sponsored or endorsed by Lutron Electronics, Co., Inc., or any of its affiliates or subsidiaries.
