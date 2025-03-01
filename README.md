# airelease - AI-Powered Release Message Generator

Inspired by [aicommits](https://github.com/Nutlope/aicommits), `airelease` helps automate the generation of release messages based on commit titles between release versions.

## How to Use

### 1. Installation

To install `airelease`, run:

```bash
npm i -g airelease@latest
```

### 2. Retrieve API Key

Get your OpenAI API key from [OpenAI](https://platform.openai.com/account/api-keys).

### 3. Set OpenAI API Key

Configure the API key by running:

```bash
airelease config set OPENAI_KEY=<your-openai-api-key>
```

This will create a `.airelease` file in your home directory.

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
airelease <major|minor|patch> -t <target-tag>
```

### Description

- **Target Version**: Specify the release version type (major, minor, or patch) to generate the release message.

- **Target Tag (-t)**: Specify the previous tag version to generate the release message. If omitted, the tool uses the latest previous tag.

### Interactive Options

After generating a release message, you'll have three options:

1. **Just commit** - Proceed with the AI-generated message
2. **Edit message** - Open the message in your configured editor
3. **Cancel release** - Abort the release process

## How It Works

This CLI tool uses `git log` to gather all commit logs filtered by the specified release version. It then sends the collected logs to OpenAI's GPT, which generates an AI-powered release note.

When editing messages, the tool opens your configured text editor (or system default) with full multiline support, allowing you to format your release notes with proper spacing and structure.

## Configurable Options

| Option       | Description                     | Default          | Command                                 |
| ------------ | ------------------------------- | ---------------- | --------------------------------------- |
| `OPENAI_KEY` | Your OpenAI API key             | (Required)       | `airelease config set OPENAI_KEY=<key>` |
| `model`      | OpenAI model to use             | gpt-3.5-turbo    | `airelease config set model=<model>`    |
| `locale`     | Language for generated messages | en               | `airelease config set locale=<locale>`  |
| `editor`     | Text editor for message editing | Platform default | `airelease config set editor=<editor>`  |
| `timeout`    | API timeout in milliseconds     | 10000            | `airelease config set timeout=<ms>`     |


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
