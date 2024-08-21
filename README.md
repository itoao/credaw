# credaw

`credaw` is a CLI tool designed to simplify the setup of AWS credentials. It allows you to interactively input your profile name, access key, secret key, and region, then automatically writes them to your credentials and config files.

## Features

- Interactive CLI for easy AWS profile setup
- Automatically saves credentials to `~/.aws/credentials` and `~/.aws/config`
- Supports multiple AWS profiles

## Installation

To install `credaw`, run the following command:

```bash
npm install -g credaw
```

## Usage

Simply run the `credaw` command to start the profile setup process:

```bash
credaw
```

1. Enter your profile name
2. Enter your AWS Access Key ID
3. Enter your AWS Secret Access Key
4. Select your AWS region

Once the information is provided, `credaw` will save the details to `~/.aws/credentials` and `~/.aws/config` automatically.

## License

MIT License
