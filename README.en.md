<div align="center">
  <img src="icon.svg" width="88" alt="dsh-chat-web icon" />
  <h1>dsh-chat-web</h1>
  <p><strong>The authentic DeepSeek web chat, inside DeepSeek Harness (DSH).</strong></p>
  <p>
    <a href="https://github.com/duxuenan001-arch/dsh-web-chat/actions/workflows/test.yml"><img alt="Test" src="https://img.shields.io/github/actions/workflow/status/duxuenan001-arch/dsh-web-chat/test.yml?style=flat-square" /></a>
    <a href="https://github.com/duxuenan001-arch/dsh-web-chat/releases"><img alt="Release" src="https://img.shields.io/github/v/release/duxuenan001-arch/dsh-web-chat?style=flat-square" /></a>
    <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/github/license/duxuenan001-arch/dsh-web-chat?style=flat-square" /></a>
    <img alt="Based on official chat-demo" src="https://img.shields.io/badge/based_on-official%20chat--demo-2F6FEB?style=flat-square" />
    <a href="https://github.com/deepseek-ai/deepseek-harness"><img alt="powered by dsh" src="https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white" /></a>
  </p>
  <p><a href="README.md">简体中文</a> · English</p>
</div>

## Why it exists

On November 16, 2026, the DeepSeek app and web chat introduced usage limits, pushing many users to DeepSeek Harness. Those users just want chat, writing, and Q&A, but DSH is built for developers: every conversation carries thousands of characters of system prompt and tool injection, which turns the model into an "honest worker" and loses the spark of the original web chat. The difference is especially visible in writing and casual conversation.

This plugin adds a standalone panel to DSH that hosts the DeepSeek web frontend itself: the official lightweight system prompt, the official server-side tools, the official UI. Inside that small world there is only DeepSeek, no Harness — no tool scaffolding, no web limits (requests are billed through the API), and no wall between you and the model.

## What you get

- **Authentic**: the UI is the frontend DeepSeek open-sourced; interactions, layout, and animations are replicated from the official site
- **No API Key needed**: reuse the DeepSeek account already signed in on DSH
- **Not affected by official web limits**: requests go through the API
- **Full features**: web search, deep thinking, citation markers, formulas, charts, dark mode
- **Separate panel**: its own conversation list, managed independently from DSH sessions

<img src="docs/assets/webview-reply.png" width="760" alt="Conversation and thinking process">

## Install

**1. Open the "Plugins" page in the left sidebar**

<img src="docs/assets/dsh-1.png" width="760" alt="Open the plugins page">

**2. Click "Add plugin" in the top right**

<img src="docs/assets/dsh-2.png" width="760" alt="Click add plugin">

**3. Paste this repository's URL `https://github.com/duxuenan001-arch/dsh-web-chat` and click "Install"**

<img src="docs/assets/dsh-3.png" width="760" alt="Enter the package name and install">

**4. After installation, click "Enable now"**

<img src="docs/assets/dsh-4.png" width="760" alt="Click enable now">

A "Web" entry then appears in the left panel list.

## Usage

Click "Web" in the left panel list:

<img src="docs/assets/dsh-5.png" width="760" alt="Open the web panel">

If you want to focus on chatting, click the button in the top left to collapse the DSH session sidebar:

<img src="docs/assets/dsh-6.png" width="760" alt="Collapse the DSH sidebar">

After collapsing, you get the full web experience:

<img src="docs/assets/dsh-7.png" width="760" alt="The web panel">

The panel has its own conversation list, separate from DSH sessions.

## Bring conversations in

**From the DeepSeek website**

1. Open chat.deepseek.com, go to "Settings → Data management → Export all chats", and download the generated ZIP (file name like `deepseek_data-2026xxxx.zip`).
2. In the panel, click "Settings" at the bottom left → "Data management" → "Import chat history" and select that ZIP.

This import replaces every conversation currently in the panel, so finish any imports before starting new conversations.

**From DSH**

Right-click any session in the left session list → "Import to web chat". The conversation is copied in, and the two sides stay independent afterwards.

## Reliability

This plugin is built on DeepSeek's open-source [chat-demo](https://github.com/deepseek-ai/chat-demo). Where requests go, the logo in the top left, and hiding the API Key input are the changes needed to fit into DSH; every other UI detail is replicated from the official site.

The official chat-demo is only the skeleton of the web chat: the UI is there, but many interactions the web version already has are missing. We filled those in to get closer to chat.deepseek.com itself:

- Conversation search: search titles, message bodies, thinking content, and attachment names; title hits get their own row, message hits carry a branch index
- Turn rail on the right: one tick per user turn, hover to preview, click to jump
- Pinning and multi-select batch management: pin, unpin, delete, with the same entry points and confirmation dialogs as the web version
- Long text paste to attachment: plain text over 2000 characters becomes an attachment card, restorable in one click, with undo/redo
- Voice input and read-aloud: the web version's recording, transcription, and playback paths
- Reading long answers: sticky code-block toolbar, back-to-latest button, Mermaid chart zoom
- Dark mode, formulas, charts, and other UI details aligned with the official styles

No repackaging, and no "optimizing" of the prompt for you — the model receives exactly what the web version sends.
