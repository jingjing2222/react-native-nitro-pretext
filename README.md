# react-native-nitro-pretext

React Native port of pretext with native text measurement backends for accurate multiline layout

## Installation

```sh
npm install react-native-nitro-pretext react-native-nitro-modules

> `react-native-nitro-modules` is required as this library relies on [Nitro Modules](https://nitro.margelo.com/).
```

## Usage

```ts
import { measure, measureBatch } from "react-native-nitro-pretext";

// ...

const width = measure("Pretext", "System", 16);
const widths = measureBatch(["One", "Two"], "System", 16);
```

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
