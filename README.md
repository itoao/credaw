# credaw 🛡️

`credaw` is a CLI tool designed to simplify the setup of AWS credentials. It allows you to interactively input your profile name, access key, secret key, and region, then automatically writes them to your credentials and config files.

## Features

- Interactive CLI for easy AWS profile setup
- Automatically saves credentials to `~/.aws/credentials` and `~/.aws/config`
- Supports multiple AWS profiles
- List, update, and delete existing profiles

## Installation

To install `credaw`, run the following command:

```bash
npm install -g credaw
```

## Usage

Simply run the `credaw` command to start the profile management process:

```bash
credaw
```

You will be presented with the following options:

1. Add a new profile
2. List existing profiles
3. Update an existing profile
4. Delete a profile

When adding a new profile:

1. Enter your profile name
2. Enter your AWS Access Key ID
3. Enter your AWS Secret Access Key
4. Select your AWS region

Once the information is provided, `credaw` will automatically save the details to `~/.
aws/credentials` and `~/.aws/config`.

## Developer Information

### Development

1. Build the project:
   ```
   pnpm build
   ```

2. Install the package globally:
   ```
   npm install -g .
   ```

3. Run the CLI tool:
   ```
   credaw-dev
   ```

### Production Release

1. Update version

2. Build:
   ```
   pnpm build
   ```

3. Publish:
   ```
   npm publish
   ```

4. Global installation:
   ```
   npm i -g credaw
   ```

5. Usage:
   ```
   credaw
   ```

## License

MIT License
