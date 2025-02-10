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

### 4. Upgrading

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

## How It Works

This CLI tool uses `git log` to gather all commit logs filtered by the specified release version. It then sends the collected logs to OpenAI's GPT, which generates an AI-powered release note.

## Maintainers
- [Coldsewoo](https://github.com/Coldsewoo)

## Under Construction
