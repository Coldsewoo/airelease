# airelease - AI-Powered Release Message Generator

Inspired by [aicommits](https://github.com/Nutlope/aicommits), `airelease` helps automate the generation of release messages based on commit titles between release versions.

## How to Use

### 1. Installation

To install `airelease`, run:

```bash
npm i -g airelease@latest
```

### 2. Retrieve API Key

Get your API key from one of the following providers:

- [OpenAI](https://platform.openai.com/account/api-keys)
- [Anthropic](https://console.anthropic.com/keys)

### 3. Set API Key

Configure the API key for your chosen provider by running:

```bash
# For OpenAI
airelease config set OPENAI_KEY=<your-openai-api-key>

# For Anthropic
airelease config set ANTHROPIC_API_KEY=<your-anthropic-api-key>
airelease config set api_provider=anthropic
```

This will create a `.airelease` file in your home directory.

Note: By default, OpenAI is used as the API provider. You can switch between providers using the `api_provider` setting.

### 4. Configure Editor (Optional)

Set your preferred editor for editing release messages:

```bash

# Direct selection
airelease config set editor=vim

```

The tool will automatically detect installed editors on your system and provide recommendations.

### 5. Upgrading

To check the installed version:

```bash
airelease --version
```

If it's not the latest version, update with:

```bash
npm update -g airelease
```

## Usage

```bash
airelease <major|minor|patch> -t <target-tag> -a <api-provider>
```

### Description

- **Target Version**: Specify the release version type (major, minor, or patch) to generate the release message.

- **Target Tag (-t)**: Specify the previous tag version to generate the release message. If omitted, the tool uses the latest previous tag.

- **API Provider (-a)**: Specify the API provider to use ("openai" or "anthropic"). If omitted, the configured default is used.

### Interactive Options

After generating a release message, you'll have three options:

1. **Just commit** - Proceed with the AI-generated message
2. **Edit message** - Open the message in your configured editor
3. **Cancel release** - Abort the release process

## How It Works

This CLI tool uses `git log` to gather all commit logs filtered by the specified release version. It then sends the collected logs to the chosen AI provider (OpenAI or Anthropic), which generates an AI-powered release note.

When editing messages, the tool opens your configured text editor (or system default) with full multiline support, allowing you to format your release notes with proper spacing and structure.

## Configurable Options

| Option              | Description                     | Default           | Command                                        |
| ------------------- | ------------------------------- | ----------------- | ---------------------------------------------- |
| `api_provider`      | AI provider to use              | openai            | `airelease config set api_provider=<provider>` |
| `OPENAI_KEY`        | Your OpenAI API key             |                   | `airelease config set OPENAI_KEY=<key>`        |
| `ANTHROPIC_API_KEY` | Your Anthropic API key          |                   | `airelease config set ANTHROPIC_API_KEY=<key>` |
| `model`             | AI model to use                 | Provider-specific | `airelease config set model=<model>`           |
| `locale`            | Language for generated messages | en                | `airelease config set locale=<locale>`         |
| `editor`            | Text editor for message editing | Platform default  | `airelease config set editor=<editor>`         |
| `timeout`           | API timeout in milliseconds     | 10000             | `airelease config set timeout=<ms>`            |

### Models

#### OpenAI Models

- gpt-3.5-turbo (default)
- gpt-4
- gpt-4-turbo
- gpt-4o

#### Anthropic Models

- claude-3-opus-latest
- claude-3-5-haiku-latest (default)
- claude-3-7-sonnet-latest

### Contributing

If you'd like to contribute to `airelease`, here's how to set up your development environment:

1. Clone the repository:

   ```bash
   git clone https://github.com/Coldsewoo/airelease.git
   cd airelease
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Make your changes and test locally:
   ```bash
   npm run build
   ./dist/cli.mjs <command>
   ```

## Maintainers

- [Coldsewoo](https://github.com/Coldsewoo)
