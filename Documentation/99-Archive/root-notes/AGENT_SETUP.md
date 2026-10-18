# Agent Configuration Setup

## Overview

I've configured two specialized agents for your OpenCode setup:

1. **Plan Agent** - Uses Xiaomi MiMo-V2.5-Pro for analysis and planning
2. **Kimi Coding Agent** - Uses Kimi K2.6 for implementation tasks

## Configuration Files Created

- `opencode.json` - Main configuration with agent definitions
- `.opencode/agents/plan.md` - Plan agent prompt and settings
- `.opencode/agents/kimi-coding.md` - Kimi coding agent prompt and settings

## Important: Provider Setup Required

### Xiaomi MiMo-V2.5-Pro

The Plan agent is configured to use `openrouter/xiaomi/mimo-v2.5-pro`. You need to:

1. **Verify the model exists** on your chosen provider:
   ```bash
   opencode
   /models
   ```
   
2. **If using OpenRouter** (configured by default):
   - Get an API key from https://openrouter.ai/settings/keys
   - Run `/connect` in OpenCode and select OpenRouter
   
3. **If the model ID is different**, update:
   - `opencode.json` → `agent.plan.model`
   - `.opencode/agents/plan.md` → frontmatter `model`

### Kimi K2.6

The Kimi coding agent is configured to use `moonshotai/kimi-k2.6`. You need to:

1. **Verify the model exists**:
   ```bash
   opencode
   /models
   ```
   
2. **Set up Moonshot AI**:
   - Create account at https://platform.moonshot.ai/console
   - Generate an API key
   - Run `/connect` in OpenCode and select Moonshot AI
   
3. **If using a different provider** (e.g., OpenRouter, Together AI, Hugging Face):
   - Update the model ID in both files
   - Common alternatives:
     - `openrouter/moonshotai/kimi-k2.6`
     - `together-ai/kimi-k2.6`

## Switching Between Agents

In the OpenCode TUI:
- Press **Tab** to cycle between primary agents (Build, Plan, Kimi Coding)
- Or use the `/agents` command to see available agents

## Troubleshooting

### Model Not Found
If you get "model not found" errors:
1. Check available models: `/models`
2. Verify your provider connection: `/connect`
3. Update the model ID in the configuration

### Permission Issues
The Plan agent is restricted (no edits/bash). The Kimi Coding agent has full access but will ask before running bash commands.

## Alternative Setup

If these exact models aren't available, you can use similar alternatives:

**For Planning:**
- `anthropic/claude-haiku-4-20250514` (fast, cheap)
- `openai/gpt-5` (good reasoning)

**For Coding:**
- `anthropic/claude-sonnet-4-20250514` (excellent coding)
- `opencode/gpt-5.1-codex` (OpenCode Zen)
- `deepseek/deepseek-v4-pro`

## Next Steps

1. Connect your providers with `/connect`
2. Verify models with `/models`
3. Update model IDs if needed
4. Start using agents with **Tab** key

For help, run `/help` in OpenCode or visit https://opencode.ai/docs
