import { useState, useCallback, useRef } from "react";
import { css } from "../../../styled-system/css";
import { ActionButton } from "../../components/ActionButton";
import { Switch } from "../../components/Switch";
import {
  llmConfigStore,
  getEndpointForProvider,
  extractOrigin,
  DEFAULT_SYSTEM_PROMPT,
  type LlmProvider,
  type LLMConfig,
} from "../../services/llm/config";

interface LlmSettingsProps {
  enableLlm: boolean;
  onEnableLlmChange: (enabled: boolean) => void;
  onClose: () => void;
}

export const LlmSettings = ({ enableLlm, onEnableLlmChange, onClose }: LlmSettingsProps) => {
  const stored = llmConfigStore.config;

  const [provider, setProvider] = useState<LlmProvider>(stored.provider);
  const [endpoint, setEndpoint] = useState(stored.apiEndpoint);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const hasStoredKey = !!stored.apiKey;
  const [defaultModel, setDefaultModel] = useState(stored.defaultModel);
  const [systemPrompt, setSystemPrompt] = useState(stored.systemPrompt);

  const [needsReload, setNeedsReload] = useState(false);
  const [reloadReason, setReloadReason] = useState<'enable' | 'csp' | null>(null);
  const [testing, setTesting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [models, setModels] = useState<string[]>(stored.availableModels);
  const [customModel, setCustomModel] = useState(
    stored.availableModels.length > 0 && !stored.availableModels.includes(stored.defaultModel) ? stored.defaultModel : ''
  );
  const selectRef = useRef<HTMLSelectElement>(null);

  const showConfig = enableLlm && !(needsReload && reloadReason === 'enable');

  const hasChanges = showConfig && (
    provider !== stored.provider ||
    endpoint !== stored.apiEndpoint ||
    (apiKeyInput !== '' && apiKeyInput !== stored.apiKey) ||
    defaultModel !== stored.defaultModel ||
    systemPrompt !== stored.systemPrompt
  );

  const handleProviderChange = useCallback((p: LlmProvider) => {
    setProvider(p);
    const newEndpoint = getEndpointForProvider(p, endpoint);
    setEndpoint(newEndpoint);
  }, [endpoint]);

  const handleSave = useCallback(() => {
    const resolvedKey = apiKeyInput || stored.apiKey;
    const prevCspOrigin = stored.cspOrigin;
    const newCspOrigin = extractOrigin(endpoint);
    const resolvedModel = selectRef.current?.value === '__custom__' ? customModel : selectRef.current?.value || defaultModel;
    const config: LLMConfig = {
      ...stored,
      provider,
      apiEndpoint: endpoint,
      apiKey: resolvedKey,
      defaultModel: resolvedModel,
      systemPrompt,
      availableModels: models,
    };

    if (newCspOrigin && newCspOrigin !== prevCspOrigin) {
      config.cspOrigin = newCspOrigin;
      llmConfigStore.store(config);
      setNeedsReload(true);
      setReloadReason('csp');
      return;
    }

    llmConfigStore.store(config);
    setApiKeyInput('');
    onClose();
  }, [provider, endpoint, apiKeyInput, defaultModel, customModel, systemPrompt, models, stored, onClose]);

  const handleToggleAi = useCallback(() => {
    onEnableLlmChange(!enableLlm);
    setNeedsReload(true);
    setReloadReason('enable');
  }, [enableLlm, onEnableLlmChange]);

  const handleReload = useCallback(() => {
    try { sessionStorage.setItem('codevinci-reopen-settings', 'true'); } catch {}
    location.reload();
  }, []);

  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    const testKey = apiKeyInput || stored.apiKey;
    try {
      const { LLMClient } = await import("../../services/llm");
      const ok = await llmConfigStore.withConfig({
        provider,
        apiEndpoint: endpoint,
        apiKey: testKey,
        defaultModel: defaultModel || 'gpt-4o',
      }, async () => {
        const client = new LLMClient();
        return await client.testConnection().catch(() => false);
      });
      setTestResult({
        ok,
        msg: ok ? 'Connected successfully' : 'Connection failed — check URL and key',
      });
      if (ok) {
        llmConfigStore.setConnectionValid(true);
      }
    } catch (e) {
      setTestResult({
        ok: false,
        msg: 'Error: ' + (e instanceof Error ? e.message : String(e)),
      });
    } finally {
      setTesting(false);
    }
  }, [provider, endpoint, apiKeyInput, defaultModel, stored]);

  const handleFetchModels = useCallback(async () => {
    setFetchingModels(true);
    const fetchKey = apiKeyInput || stored.apiKey;
    try {
      const { LLMClient } = await import("../../services/llm");
      const fetched = await llmConfigStore.withConfig({
        provider,
        apiEndpoint: endpoint,
        apiKey: fetchKey,
      }, async () => {
        const client = new LLMClient();
        return await client.fetchModels().catch(() => []);
      });
      setModels(fetched);
      if (fetched.length > 0 && !defaultModel) {
        setDefaultModel(fetched[0]);
      }
    } catch {
      // ignore
    } finally {
      setFetchingModels(false);
    }
  }, [provider, endpoint, apiKeyInput, defaultModel, stored]);

  const fieldStyles = {
    px: '3',
    py: '2',
    borderRadius: 'md',
    border: '1px solid',
    borderColor: 'stone.600',
    background: 'stone.800',
    color: 'stone.100',
    fontSize: 'sm',
    outline: 'none',
    width: 'full',
    fontFamily: 'mono',
    '&:focus': {
      borderColor: 'sky.500',
    },
    '&:disabled': {
      opacity: '0.4',
      cursor: 'not-allowed',
    },
  } as const;

  const labelStyles = css({
    fontSize: 'xs',
    color: 'stone.400',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    mb: '1',
  });

  return (
    <div className={css({
      display: 'flex',
      flexDirection: 'column',
      gap: '4',
      minW: { base: '72', sm: '80' },
      maxW: '96',
    })}>
      {/* AI Enable toggle */}
      <div className={css({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pb: '3',
      })}>
        <div>
          <div className={css({ fontWeight: 'semibold', fontSize: 'sm', color: 'stone.100' })}>
            AI Features
          </div>
          <div className={css({ fontSize: 'xs', color: 'stone.500', mt: '0.5' })}>
            {enableLlm ? 'Enabled — configure provider below' : 'Disabled'}
          </div>
        </div>
        <Switch checked={enableLlm} onChange={handleToggleAi} />
      </div>

      {/* Reload banner */}
      {needsReload && (
        <div className={css({
          p: '3',
          borderRadius: 'md',
          fontSize: 'sm',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2',
          ...(reloadReason === 'csp'
            ? { bg: 'amber.900/30', color: 'amber.200', border: '1px solid', borderColor: 'amber.700/50' }
            : { bg: 'blue.900/30', color: 'blue.200', border: '1px solid', borderColor: 'blue.700/50' }
          ),
        })}>
          <span className={css({ flex: '1' })}>
            {reloadReason === 'csp'
              ? 'Provider URL changed. Reload required to update CSP.'
              : enableLlm
                ? 'AI Features enabled. Reload to activate.'
                : 'AI Features disabled. Reload to apply.'
            }
          </span>
          <ActionButton size="xs" visual="primary" onClick={handleReload}>
            Reload
          </ActionButton>
        </div>
      )}

      {/* Provider config — only show when AI is enabled and no pending enable-reload */}
      {showConfig && (
        <>
          {/* Provider selection */}
          <div className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
            <label className={labelStyles}>Provider</label>
            <div className={css({ display: 'flex', gap: '2' })}>
              {(['openai-compatible', 'openai'] as LlmProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handleProviderChange(p)}
                  className={css({
                    flex: '1',
                    px: '3',
                    py: '2',
                    borderRadius: 'md',
                    fontSize: 'sm',
                    cursor: 'pointer',
                    border: '1px solid',
                    transition: 'all 0.15s',
                    ...(provider === p
                      ? { bg: 'blue.500/20', color: 'blue.300', borderColor: 'blue.500/50' }
                      : { bg: 'stone.800', color: 'stone.400', borderColor: 'stone.600', _hover: { borderColor: 'stone.500' } }
                    ),
                  })}
                >
                  {p === 'openai' ? 'OpenAI' : 'OpenAI Compatible'}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
            <label className={labelStyles}>API Key</label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={hasStoredKey ? 'Key saved — enter new key to replace' : (provider === 'openai' ? 'sk-...' : 'Optional')}
              className={css(fieldStyles)}
            />
          </div>

          {/* Model */}
          <div className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
            <label className={labelStyles}>Model</label>
            <div className={css({ display: 'flex', gap: '2', alignItems: 'flex-start' })}>
              {models.length > 0 ? (
                <select
                  ref={selectRef}
                  value={models.includes(defaultModel) ? defaultModel : '__custom__'}
                  onChange={(e) => {
                    if (e.target.value !== '__custom__') setDefaultModel(e.target.value);
                  }}
                  className={css(fieldStyles, { flex: '1', appearance: 'auto', maxW: 'full' })}
                >
                  <option value="" disabled>Select a model…</option>
                  {models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value="__custom__">Custom model…</option>
                </select>
              ) : (
                <div className={css({ flex: '1', position: 'relative' })}>
                  <input
                    type="text"
                    value={defaultModel}
                    onChange={(e) => setDefaultModel(e.target.value)}
                    placeholder={provider === 'openai' ? 'gpt-4o' : 'llama3.2'}
                    className={css(fieldStyles)}
                  />
                  {defaultModel === '' && (
                    <span className={css({
                      position: 'absolute', right: '2', top: '50%', transform: 'translateY(-50%)',
                      fontSize: 'xs', color: 'stone.500', pointerEvents: 'none',
                    })}>
                      Fetch models ↓
                    </span>
                  )}
                </div>
              )}
              <ActionButton
                size="xs"
                visual="secondary"
                onClick={handleFetchModels}
                disabled={fetchingModels}
                className={css({ whiteSpace: 'nowrap', mt: '0.5' })}
              >
                {fetchingModels ? '...' : 'Fetch'}
              </ActionButton>
            </div>
            {models.length > 0 && (selectRef.current?.value === '__custom__' || !models.includes(defaultModel)) && (
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Enter model name"
                className={css(fieldStyles, { mt: '1' })}
              />
            )}
          </div>

          {/* Base URL (only for openai-compatible) */}
          {provider === 'openai-compatible' && (
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
              <label className={labelStyles}>Base URL</label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="http://localhost:11434/v1"
                className={css(fieldStyles)}
              />
            </div>
          )}

          {/* System Prompt */}
          <div className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
            <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
              <label className={labelStyles}>System Prompt</label>
              <button
                type="button"
                onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                className={css({
                  fontSize: 'xs',
                  color: 'stone.400',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                  _hover: { color: 'stone.200' },
                })}
              >
                Reset
              </button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              className={css(fieldStyles, { resize: 'vertical', minH: '16' })}
            />
          </div>

          {/* Test connection + result */}
          <div className={css({ display: 'flex', gap: '2', alignItems: 'center' })}>
            <ActionButton
              size="sm"
              visual="secondary"
              onClick={handleTestConnection}
              disabled={testing || !defaultModel}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </ActionButton>
            {testResult && (
              <span className={css({
                fontSize: 'sm',
                color: testResult.ok ? 'green.400' : 'red.400',
              })}>
                {testResult.msg}
              </span>
            )}
          </div>

          {/* Save */}
          <div className={css({
            display: 'flex',
            gap: '2',
            justifyContent: 'flex-end',
            pt: '2',
          })}>
            <ActionButton size="sm" visual="secondary" onClick={onClose}>
              Cancel
            </ActionButton>
            <ActionButton size="sm" visual="primary" onClick={handleSave} disabled={!hasChanges}>
              Save
            </ActionButton>
          </div>
        </>
      )}
    </div>
  );
};

export default LlmSettings;
