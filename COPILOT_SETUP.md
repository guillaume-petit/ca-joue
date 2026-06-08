# GitHub Copilot SDK Integration Setup Guide

This project uses the GitHub Models API (powered by Copilot) to automatically suggest French word translations and example sentences.

## Prerequisites

- GitHub account with access to [GitHub Copilot](https://github.com/features/copilot)
- GitHub personal access token

## Setup Instructions

### 1. Create a GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Configure the token:
   - **Token name:** `ca-joue-copilot` (or any name you prefer)
   - **Expiration:** Select appropriate expiration (90 days recommended)
   - **Scopes:** Select `copilot` to enable GitHub Models API access
4. Click **"Generate token"**
5. Copy the generated token immediately (you won't see it again)

### 2. Add Token to `.env.local`

Open or create `.env.local` in the project root:

```bash
# GitHub Models API Configuration
GITHUB_TOKEN=your_generated_token_here
```

Replace `your_generated_token_here` with the token you just created.

### 3. Verify the Setup

Start the development server:

```bash
npm run dev
```

1. Navigate to http://localhost:3000
2. Click the **"Ajouter"** (Add) button
3. Enter a French word in the word field
4. Click the **"IA"** button (with the lightbulb icon)
5. Wait for suggestions to appear

If successful, you'll see suggestions for:
- **Type:** Part of speech (noun, verb, adjective, etc.)
- **Translation:** Chinese translation with pinyin
- **Example:** French sentence using the word

### Available Models

The default model is `gpt-4o`. To use a different model, edit `app/actions/vocabulary.ts` and change the model in the `getWordSuggestions` function:

Available models (as of June 2026):
- `gpt-4o` (default, recommended for quality)
- `gpt-4-turbo`
- `claude-3.5-sonnet`
- `llama-2-7b`
- `phi-3`
- `mistral-7b`

## Troubleshooting

### "GITHUB_TOKEN not configured" error
- Ensure `.env.local` has the `GITHUB_TOKEN` variable set
- Verify the token is valid and has not expired
- Restart the development server after adding the token

### "Impossible to obtain suggestions" error
- Check your internet connection
- Verify GitHub is accessible
- Ensure your GitHub account has access to Copilot/Models
- Check that your personal access token has the `copilot` scope

### API rate limiting
GitHub Models API may have rate limits. If you hit limits:
- Wait a few minutes and try again
- Consider requesting higher rate limits through GitHub

## Cost

GitHub Copilot Models API usage is subject to your GitHub Copilot subscription. Check your usage at https://github.com/settings/billing/limits

## Architecture

The integration works as follows:

1. **Client Component** (`app/page.tsx`):
   - User enters a French word and clicks "IA" button
   - Shows loading state while fetching suggestions
   - Displays success/error messages

2. **Server Action** (`app/actions/vocabulary.ts`):
   - `getWordSuggestions(word)` function
   - Calls GitHub Models API endpoint
   - Generates structured JSON response with type, translation, example

3. **Error Handling**:
   - Graceful fallback if token is not configured
   - User-friendly error messages
   - Console logging for debugging

## Documentation References

- [GitHub Copilot SDK Documentation](https://docs.github.com/en/copilot/how-tos/copilot-sdk/getting-started)
- [GitHub Models API Docs](https://docs.github.com/en/copilot/managing-copilot/managing-copilot-business/copilot-business-setup)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

## Security Note

- Never commit `.env.local` to version control (it's gitignored)
- Treat your GITHUB_TOKEN like a password
- Rotate tokens periodically
- Use environment-specific tokens if needed

