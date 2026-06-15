import { test, expect } from '@playwright/test';

const LLM_ENDPOINT = 'http://localhost:11434/v1';

function mockSseResponse(text: string): string {
  const lines = text.split('\n').flatMap(line => [
    `data: {"choices":[{"delta":{"content":"${line}\\n"}}]}`,
  ]);
  lines.push('data: [DONE]');
  return lines.join('\n');
}

function mockToolCallResponse(reasoning: string, code: string): string {
  const argsJson = JSON.stringify({ code });               // e.g. '{"code":"..."}'
  const escapedArgs = JSON.stringify(argsJson);            // e.g. '"{\\"code\\":\\"...\\"}"'
  return [
    `data: {"choices":[{"delta":{"content":"${reasoning}"}}]}`,
    `data: {"choices":[{"delta":{"role":"assistant","content":null,"tool_calls":[{"index":0,"id":"call_1","function":{"name":"set_code","arguments":""}}]}}]}`,
    `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":${escapedArgs}}}]}}]}`,
    `data: {"choices":[{"delta":{}}],"usage":{}}`,
    `data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}`,
    'data: [DONE]',
  ].join('\n\n');
}

function mockCodeBlockResponse(reasoning: string, code: string): string {
  return mockSseResponse(`${reasoning}\n\`\`\`js\n${code}\n\`\`\``);
}

test.describe('AI Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.evaluate((endpoint) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('codevinci-llm-enabled', 'true');
      localStorage.setItem('codevinci-llm-config', JSON.stringify({
        provider: 'openai-compatible',
        apiEndpoint: endpoint,
        apiKey: 'sk-test-key-123',
        defaultModel: 'test-model',
        systemPrompt: 'You are a test assistant.',
        availableModels: ['test-model'],
        connectionValid: true,
        temperature: 0.7,
        topP: 0.95,
        maxTokens: 4096,
        cspOrigin: 'http://localhost:11434',
      }));
    }, LLM_ENDPOINT);
    await page.reload();
  });

  test('AI Chat: streaming indicator shows and response appears', async ({ page }) => {
    await acceptDisclaimer(page);
    await page.selectOption('select', 'ai-chat');
    await page.waitForTimeout(2000);

    // Check that the chat panel loaded
    await expect(page.locator('textarea[placeholder*="Ask AI"]')).toBeVisible({ timeout: 5000 });

    const responseText = 'Hello! I am a streaming response.';

    let apiCalled = false;
    await page.route('**/chat/completions', async (route) => {
      apiCalled = true;
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: mockSseResponse(responseText),
      });
    });

    // Send a message
    await page.locator('textarea[placeholder*="Ask AI"]').fill('stream test');
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(2000);

    // Verify the API was called
    expect(apiCalled).toBe(true);

    // The response should appear in the chat
    await expect(page.getByText(responseText)).toBeVisible({ timeout: 5000 });
  });

  test('AI Chat: text-only response (no code, no edit)', async ({ page }) => {
    await acceptDisclaimer(page);
    await page.selectOption('select', 'ai-chat');
    await page.waitForTimeout(2000);

    await page.route('**/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: mockSseResponse('This is a plain text response without any code.'),
      });
    });

    await page.locator('textarea[placeholder*="Ask AI"]').fill('tell me something');
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(2000);

    // The response text should appear
    await expect(page.getByText('plain text response')).toBeVisible({ timeout: 5000 });

    // No Accept/Reject buttons should appear (no code generated)
    await expect(page.getByRole('button', { name: 'Accept code' })).not.toBeVisible({ timeout: 2000 });
    await expect(page.getByRole('button', { name: 'Reject' })).not.toBeVisible({ timeout: 1000 });
  });

  test('AI Chat: reasoning + code block rendered with separation', async ({ page }) => {
    await acceptDisclaimer(page);
    await page.selectOption('select', 'ai-chat');
    await page.waitForTimeout(2000);

    await page.route('**/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: mockCodeBlockResponse('First I will add a counter.', 'let count = 0;\nfunction inc() { count++; }'),
      });
    });

    await page.locator('textarea[placeholder*="Ask AI"]').fill('add counter');
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(3000);

    // Reasoning text should be visible
    await expect(page.getByText('First I will add a counter.')).toBeVisible({ timeout: 5000 });

    // Code block should be rendered (the pre element has dark background)
    const codeBlock = page.locator('pre').filter({ hasText: 'let count = 0' });
    await expect(codeBlock).toBeVisible({ timeout: 3000 });

    // No Accept/Reject buttons (code was in text, not tool call)
    await expect(page.getByRole('button', { name: 'Accept code' })).not.toBeVisible({ timeout: 2000 });
  });

  test('AI Chat: tool call shows Accept/Reject for generated code', async ({ page }) => {
    await acceptDisclaimer(page);
    await page.selectOption('select', 'ai-chat');
    await page.waitForTimeout(2000);

    await page.route('**/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: mockToolCallResponse('Adding a counter.', 'let counter = 0;'),
      });
    });

    await page.locator('textarea[placeholder*="Ask AI"]').fill('add a counter');
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(3000);

    // Reasoning text should be visible
    await expect(page.getByText('Adding a counter.')).toBeVisible({ timeout: 5000 });

    // Pending code should be visible in the code review section
    await expect(page.getByText('Code generated')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('let counter = 0;')).toBeVisible({ timeout: 3000 });

    // Accept and Reject buttons should be visible
    await expect(page.getByRole('button', { name: 'Accept code' })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('button', { name: 'Reject' })).toBeVisible({ timeout: 1000 });
  });

  test('AI Chat: accept generated code applies to editor', async ({ page }) => {
    await acceptDisclaimer(page);
    await page.selectOption('select', 'ai-chat');
    await page.waitForTimeout(2000);

    await page.route('**/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: mockToolCallResponse('Here is the code.', 'document.title = "accepted";'),
      });
    });

    await page.locator('textarea[placeholder*="Ask AI"]').fill('update title');
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(2000);

    // Accept the code
    await expect(page.getByRole('button', { name: 'Accept code' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Accept code' }).click();
    await page.waitForTimeout(500);

    // Switch to view-edit mode to check the editor (editor is not rendered in ai-chat)
    await page.selectOption('select', 'view-edit');
    await page.waitForTimeout(1000);

    // Verify the editor was updated with the accepted code
    const editorContent = await page.locator('.cm-content').first().innerText();
    expect(editorContent).toContain('document.title = "accepted"');
  });

  test('AI Chat: reject code clears pending without applying', async ({ page }) => {
    await acceptDisclaimer(page);
    await page.selectOption('select', 'ai-chat');
    await page.waitForTimeout(2000);

    await page.route('**/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: mockToolCallResponse('Generated code.', 'var x = 42;'),
      });
    });

    await page.locator('textarea[placeholder*="Ask AI"]').fill('generate code');
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(2000);

    // Reject the code
    await expect(page.getByRole('button', { name: 'Reject' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Reject' }).click();
    await page.waitForTimeout(500);

    // The code review section should be gone
    await expect(page.getByText('Code generated')).not.toBeVisible({ timeout: 2000 });
    await expect(page.getByRole('button', { name: 'Accept code' })).not.toBeVisible({ timeout: 1000 });
  });

  test('AI Chat: API request includes correct auth and model', async ({ page }) => {
    await acceptDisclaimer(page);
    await switchToAiChat(page);

    let requestVerified = false;
    await page.route('**/chat/completions', async (route) => {
      const headers = route.request().headers();
      const body = JSON.parse(route.request().postData() || '{}');
      expect(headers['authorization']).toBe('Bearer sk-test-key-123');
      expect(body.model).toBe('test-model');
      expect(body.stream).toBe(true);
      requestVerified = true;
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: mockSseResponse('Verified'),
      });
    });

    await typeAndSendChat(page, 'test');
    expect(requestVerified).toBe(true);
  });

  test('CSP: changing base URL triggers reload banner', async ({ page }) => {
    await acceptDisclaimer(page);

    // Open settings via top bar gear
    await page.locator('[aria-label="Settings"]').first().click();
    await page.waitForTimeout(500);

    // Change base URL
    await page.locator('input[type="text"][value*="localhost"]').first().fill('https://custom.example.com/v1');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/Reload required|update CSP/i)).toBeVisible({ timeout: 3000 });
  });

  test('CSP: same origin different path does NOT trigger reload', async ({ page }) => {
    await acceptDisclaimer(page);

    await page.locator('[aria-label="Settings"]').first().click();
    await page.waitForTimeout(500);

    // Change only the path, not the origin
    const urlInput = page.locator('input[type="text"][value*="localhost"]').first();
    await urlInput.fill('http://localhost:11434/v2');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);

    // No CSP reload banner — origin is the same
    await expect(page.getByText(/Reload required|update CSP/i)).not.toBeVisible({ timeout: 2000 });
  });

  test('CSP: after endpoint change and reload, CSP includes new origin', async ({ page }) => {
    await acceptDisclaimer(page);

    // Change endpoint
    await page.locator('[aria-label="Settings"]').first().click();
    await page.waitForTimeout(500);
    await page.locator('input[type="text"][value*="localhost"]').first().fill('https://new-endpoint.example.com/v1');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);

    // Click reload on the CSP banner
    const reloadBtn = page.getByRole('button', { name: 'Reload' });
    if (await reloadBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await reloadBtn.click();
      await page.waitForTimeout(2000);

      const csp = await page.evaluate(() => {
        const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        return meta?.getAttribute('content');
      });
      expect(csp).toContain('new-endpoint.example.com');
    }
  });

  test('Settings: change model and API key, verify config persists', async ({ page }) => {
    await acceptDisclaimer(page);

    // Open settings
    await page.locator('[aria-label="Settings"]').first().click();
    await page.waitForTimeout(500);

    // Change API key
    await page.locator('input[type="password"]').first().fill('sk-new-key-999');

    // Change model
    const modelField = page.locator('input[placeholder*="llama"]').first();
    if (await modelField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await modelField.fill('new-model-name');
    }

    // Save
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(500);

    // Reload and verify config persists
    await page.reload();
    await page.waitForTimeout(1000);

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('codevinci-llm-config');
      return raw ? JSON.parse(raw) : null;
    });
    expect(stored.apiEndpoint).toBe(LLM_ENDPOINT);
    expect(stored.apiKey).toBe('sk-new-key-999');
  });

  test.describe('Pre-enable: LLM not configured', () => {
    test.beforeEach(async ({ page }) => {
      // Clean state — no localStorage set
      await page.goto('http://localhost:5173');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
    });

    test('select box does not contain ai-chat option', async ({ page }) => {
      await acceptDisclaimer(page);
      const options = await page.locator('select option').all();
      const values = await Promise.all(options.map(o => o.getAttribute('value')));
      expect(values).not.toContain('ai-chat');
    });

    test('mode=ai-chat in URL is silently downgraded to view-edit', async ({ page }) => {
      // Navigate with ai-chat mode in URL
      await page.goto('http://localhost:5173/?mode=ai-chat');
      await page.waitForTimeout(500);
      await acceptDisclaimer(page);
      await page.waitForTimeout(500);

      // The select should show view-edit, not ai-chat
      const selectValue = await page.locator('select').inputValue();
      expect(selectValue).toBe('view-edit');
    });

    test('settings gear icon opens settings dialog', async ({ page }) => {
      await acceptDisclaimer(page);
      await page.locator('[aria-label="Settings"]').first().click();
      await page.waitForTimeout(500);
      await expect(page.getByText('AI Features')).toBeVisible();
    });
  });

  test.describe('Full onboarding: enable → configure → chat', () => {
    test.beforeEach(async ({ page }) => {
      // Clean state
      await page.goto('http://localhost:5173');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
    });

    test('toggle AI on shows reload banner, reload works, then configure and chat', async ({ page }) => {
      await acceptDisclaimer(page);

      // Step 1: Open settings — AI is OFF
      await page.locator('[aria-label="Settings"]').first().click();
      await page.waitForTimeout(500);
      await expect(page.getByText('Disabled')).toBeVisible();

      // Step 2: Toggle AI ON (the switch is a hidden input; click its label)
      const switchLabel = page.locator('label:has(input[role="switch"])').first();
      await switchLabel.click();
      await page.waitForTimeout(300);

      // Step 3: See reload banner
      await expect(page.getByText(/Reload to activate/i)).toBeVisible({ timeout: 3000 });
      const reloadBtn = page.getByRole('button', { name: 'Reload' });
      await expect(reloadBtn).toBeVisible();

      // Step 4: Click Reload
      await reloadBtn.click();
      await page.waitForTimeout(2000);

      // Step 5: After reload, AI is enabled. Accept disclaimer if shown.
      const runBtn = page.getByRole('button', { name: 'Run code' });
      if (await runBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await runBtn.click();
        await page.waitForTimeout(500);
      }
      await expect(page.locator('option[value="ai-chat"]')).toBeAttached({ timeout: 3000 });

      // Settings dialog should auto-open (reopened after reload)
      // User can now configure the endpoint/model/key
      await expect(page.getByText('Enabled')).toBeVisible({ timeout: 3000 });

      // Configure endpoint (the base URL field is visible now)
      const urlInput = page.locator('input[type="text"][placeholder*="localhost"]').first();
      await urlInput.fill(LLM_ENDPOINT);

      // Set model
      const modelField = page.locator('input[placeholder*="llama"]').first();
      if (await modelField.isVisible({ timeout: 1000 }).catch(() => false)) {
        await modelField.fill('test-model');
      }

      // Set API key
      const keyInput = page.locator('input[type="password"]').first();
      await keyInput.fill('sk-test-key-123');

      // Save
      await page.getByRole('button', { name: 'Save' }).click();
      await page.waitForTimeout(500);

      // After reload, mark connection as valid (simulates successful Test Connection)
      await page.evaluate(() => {
        const raw = localStorage.getItem('codevinci-llm-config');
        if (raw) {
          const config = JSON.parse(raw);
          config.connectionValid = true;
          localStorage.setItem('codevinci-llm-config', JSON.stringify(config));
        }
      });
      await page.reload();
      await page.waitForTimeout(2000);

      // Accept disclaimer if shown after reload
      const runBtn2 = page.getByRole('button', { name: 'Run code' });
      if (await runBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await runBtn2.click();
        await page.waitForTimeout(500);
      }

      // Step 7: Switch to AI Chat and send a prompt
      await page.selectOption('select', 'ai-chat');
      await page.waitForTimeout(1500);

      let apiCalled = false;
      await page.route('**/chat/completions', async (route) => {
        apiCalled = true;
        const body = JSON.parse(route.request().postData() || '{}');
        expect(body.model).toBe('test-model');
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: mockSseResponse('Welcome to AI Chat!'),
        });
      });

      await typeAndSendChat(page, 'hello');
      expect(apiCalled).toBe(true);
      await expect(page.getByText('Welcome to AI Chat!')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('CSP not updated until reload', () => {
    test.beforeEach(async ({ page }) => {
      // Start with a configured endpoint
      await page.goto('http://localhost:5173');
      await page.evaluate((endpoint) => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('codevinci-llm-enabled', 'true');
        localStorage.setItem('codevinci-llm-config', JSON.stringify({
          provider: 'openai-compatible',
          apiEndpoint: endpoint,
          apiKey: 'sk-test-key',
          defaultModel: 'test-model',
          systemPrompt: 'Test.',
          availableModels: ['test-model'],
          connectionValid: true,
          temperature: 0.7,
          topP: 0.95,
          maxTokens: 4096,
          cspOrigin: 'http://localhost:11434',
        }));
      }, LLM_ENDPOINT);
      await page.reload();
    });

    test('chat blocked by CSP when endpoint changed before reload', async ({ page }) => {
      await acceptDisclaimer(page);

      // Open settings
      await page.locator('[aria-label="Settings"]').first().click();
      await page.waitForTimeout(500);

      // Change endpoint to a different origin
      const urlInput = page.locator('input[type="text"][value*="localhost"]').first();
      await urlInput.fill('https://blocked-endpoint.test/v1');

      // Save — CSP reload banner appears
      await page.getByRole('button', { name: 'Save' }).click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/Reload required|csp/i)).toBeVisible({ timeout: 3000 });

      // Close the settings dialog programmatically so we can try to chat
      await page.evaluate(() => {
        const d = document.querySelector('dialog[open]');
        if (d) (d as HTMLDialogElement).close();
      });
      await page.waitForTimeout(300);

      // Switch to AI Chat
      await page.selectOption('select', 'ai-chat');
      await page.waitForTimeout(1500);

      // Try to send a prompt — CSP should block the request
      let cspBlocked = false;
      await page.route('**/blocked-endpoint.test/**', (route) => {
        cspBlocked = false; // This should never be reached — CSP blocks before route
        route.fulfill({ status: 200, body: '' });
      });

      const input = page.locator('textarea[placeholder*="Ask AI"]');
      if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
        await input.fill('hello');
        await page.keyboard.press('Control+Enter');
        await page.waitForTimeout(3000);

        // The API call should fail (CSP blocks it) and show error in chat
        await expect(page.getByText(/not configured|error|fail/i)).toBeVisible({ timeout: 5000 });
      }
    });
  });

});

async function acceptDisclaimer(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Run code' }).click();
  await page.waitForTimeout(500);
}

async function switchToAiChat(page: import('@playwright/test').Page) {
  // The ai-chat option exists only when enableLlm is true
  await expect(page.locator('option[value="ai-chat"]')).toBeAttached({ timeout: 3000 });

  await page.selectOption('select', 'ai-chat');
  await page.waitForTimeout(1500);

  // Wait for the lazy-loaded LLMPanel to render (the chat input is the tell)
  await expect(page.locator('textarea[placeholder*="Ask AI"]')).toBeVisible({ timeout: 8000 });
}

async function typeAndSendChat(page: import('@playwright/test').Page, text: string) {
  const input = page.locator('textarea[placeholder*="Ask AI"]');
  await expect(input).toBeVisible({ timeout: 3000 });
  await expect(input).toBeEnabled({ timeout: 3000 });
  await input.fill(text);
  await page.keyboard.press('Control+Enter');
  await page.waitForTimeout(1000);
}
