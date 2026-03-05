import { emit, on } from '@create-figma-plugin/utilities';
import { render, h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { contrastRatio, ratioGrade } from '../src/lib/contrast';
import { formatFullExport, type ExportFormat, type NamingPreset } from '../src/lib/export';
import { extractThemeFromImageFile } from '../src/lib/image-theme';
import { oklchToRgb, parseColorInput, rgbToHex, rgbToOklch } from '../src/lib/color';
import type { PluginGenerated, PluginSettings } from './shared';
import './styles.css';

type MainTab = 'controls' | 'preview' | 'export';
type PreviewTab = 'palette' | 'ui' | 'contrast';
type ExportRoute = 'agent' | 'code' | 'figma';

var HISTORY_KEY = 'okscale.figma.history.v1';
var EXPORT_FORMATS: ExportFormat[] = ['css', 'tailwind', 'tokens', 'figma', 'scss'];
var NAMING_PRESETS: NamingPreset[] = ['numeric', 'semantic'];

function roleArray(generated: PluginGenerated) {
  return [
    generated.palette.primary,
    generated.palette.secondary,
    generated.palette.accent,
    generated.palette.neutral,
  ];
}

function loadHistory(): string[] {
  try {
    var raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(function (hex) {
      return typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex);
    });
  } catch (_err) {
    return [];
  }
}

function saveHistory(list: string[]) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 10)));
  } catch (_err) {
    // ignore
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_err) {
    try {
      var area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(area);
      return !!ok;
    } catch (_e) {
      return false;
    }
  }
}

function exportFilename(format: ExportFormat, namingPreset: NamingPreset): string {
  var suffix = namingPreset === 'semantic' ? '-semantic' : '-numeric';
  if (format === 'tailwind') return 'okscale-tailwind.config' + suffix + '.ts';
  if (format === 'tokens') return 'okscale-tokens' + suffix + '.json';
  if (format === 'figma') return 'okscale-figma-variables' + suffix + '.json';
  if (format === 'scss') return 'okscale-palette' + suffix + '.scss';
  return 'okscale-palette' + suffix + '.css';
}

function scaleHex(
  role: { scale: Array<{ step: number; hex: string }> },
  step: number,
  fallback: string,
): string {
  for (var i = 0; i < role.scale.length; i++) {
    if (role.scale[i].step === step) return role.scale[i].hex;
  }
  return fallback;
}

function exampleText(label: string): string {
  if (label === 'Body text on light surfaces') return 'The quick brown fox jumps over the lazy dog.';
  if (label === 'Body text on brand surfaces') return 'Get started →';
  if (label === 'Large headlines on brand surfaces') return 'Hello.';
  return 'Last updated 2 hours ago';
}

function App() {
  var settingsState = useState<PluginSettings>({
    colorInput: '#d9ff00',
    shadeMode: 'natural',
    harmonyType: 'complementary',
    anchorBehavior: 'preserve-input',
    neutralMode: 'keep-hue',
  });
  var settings = settingsState[0];
  var setSettings = settingsState[1];

  var generatedState = useState<PluginGenerated | null>(null);
  var generated = generatedState[0];
  var setGenerated = generatedState[1];

  var statusState = useState('Ready.');
  var status = statusState[0];
  var setStatus = statusState[1];

  var isErrorState = useState(false);
  var isError = isErrorState[0];
  var setIsError = isErrorState[1];

  var mainTabState = useState<MainTab>('controls');
  var mainTab = mainTabState[0];
  var setMainTab = mainTabState[1];

  var previewTabState = useState<PreviewTab>('palette');
  var previewTab = previewTabState[0];
  var setPreviewTab = previewTabState[1];

  var routeState = useState<ExportRoute>('agent');
  var route = routeState[0];
  var setRoute = routeState[1];

  var formatState = useState<ExportFormat>('css');
  var exportFormat = formatState[0];
  var setExportFormat = formatState[1];

  var namingState = useState<NamingPreset>('numeric');
  var namingPreset = namingState[0];
  var setNamingPreset = namingState[1];

  var historyState = useState<string[]>(loadHistory());
  var history = historyState[0];
  var setHistory = historyState[1];

  var copiedState = useState('');
  var copied = copiedState[0];
  var setCopied = copiedState[1];
  var copiedTimerRef = useRef(0);

  var debounceRef = useRef(0);

  var parsed = useMemo(function () {
    return parseColorInput(settings.colorInput);
  }, [settings.colorInput]);

  var localOklch = useMemo(function () {
    return parsed ? rgbToOklch(parsed) : null;
  }, [parsed]);

  var code = useMemo(function () {
    if (!generated) return '/* Generate a palette to unlock export output */';
    return formatFullExport(exportFormat, generated.palette, namingPreset);
  }, [generated, exportFormat, namingPreset]);

  var exportMeta = useMemo(function () {
    return {
      filename: exportFilename(exportFormat, namingPreset),
      format: exportFormat.toUpperCase(),
      naming: namingPreset === 'semantic' ? 'Semantic' : 'Numeric',
    };
  }, [exportFormat, namingPreset]);

  var agentCommand = useMemo(function () {
    return (
      'mcporter call okscale.generate_palette ' +
      "colorInput='" + settings.colorInput + "' " +
      'shadeMode=' + settings.shadeMode + ' ' +
      'harmonyType=' + settings.harmonyType + ' ' +
      'anchorBehavior=' + settings.anchorBehavior + ' ' +
      '--output json'
    );
  }, [settings]);

  var agentPrompt = useMemo(function () {
    return [
      'Use OKScale for this request.',
      'Run generate_palette with:',
      JSON.stringify(
        {
          colorInput: settings.colorInput,
          shadeMode: settings.shadeMode,
          harmonyType: settings.harmonyType,
          anchorBehavior: settings.anchorBehavior,
          neutralMode: settings.neutralMode,
        },
        null,
        2,
      ),
      'Then summarize primary/secondary/accent/neutral and recommend one export route.',
    ].join('\n');
  }, [settings]);

  var rawContrastRows = useMemo(function () {
    if (!generated) return [] as Array<{ step: number; ratio: number; useWhite: boolean; grade: string; hex: string }>;
    var scale = generated.palette.primary.scale;
    var rows: Array<{ step: number; ratio: number; useWhite: boolean; grade: string; hex: string }> = [];
    for (var i = 0; i < scale.length; i++) {
      var item = scale[i];
      var wr = contrastRatio('#ffffff', item.hex);
      var br = contrastRatio('#000000', item.hex);
      var useWhite = wr >= br;
      var ratio = useWhite ? wr : br;
      if (ratio < 4.5) continue;
      rows.push({
        step: item.step,
        ratio: ratio,
        useWhite: useWhite,
        grade: ratioGrade(ratio),
        hex: item.hex,
      });
    }
    return rows;
  }, [generated]);

  function flashCopied(key: string) {
    setCopied(key);
    if (copiedTimerRef.current) {
      window.clearTimeout(copiedTimerRef.current);
    }
    copiedTimerRef.current = window.setTimeout(function () {
      setCopied('');
      copiedTimerRef.current = 0;
    }, 1200);
  }

  function sendGenerate() {
    emit('GENERATE', settings);
  }

  function onSetting<K extends keyof PluginSettings>(key: K, value: PluginSettings[K]) {
    setSettings(function (prev) {
      var next = Object.assign({}, prev);
      next[key] = value;
      return next;
    });
  }

  function setFromLch(nextL: number, nextC: number, nextH: number) {
    var hex = rgbToHex(oklchToRgb({ l: nextL, c: nextC, h: nextH }));
    onSetting('colorInput', hex);
  }

  function removeHistory(hex: string) {
    setHistory(function (prev) {
      var next = prev.filter(function (item) {
        return item.toLowerCase() !== hex.toLowerCase();
      });
      saveHistory(next);
      return next;
    });
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  function resetSettings() {
    setSettings({
      colorInput: '#d9ff00',
      shadeMode: 'natural',
      harmonyType: 'complementary',
      anchorBehavior: 'preserve-input',
      neutralMode: 'keep-hue',
    });
    setStatus('Reset to defaults.');
    setIsError(false);
  }

  async function copyWithStatus(label: string, text: string) {
    var ok = await copyText(text);
    if (ok) {
      flashCopied(label);
      setStatus('Copied.');
      setIsError(false);
      return;
    }
    setStatus('Clipboard copy failed.');
    setIsError(true);
  }

  function downloadText(filename: string, content: string, type: string) {
    var blob = new Blob([content], { type: type });
    var href = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
  }

  async function handleImagePick(event: Event) {
    var input = event.currentTarget as HTMLInputElement;
    var file = input.files && input.files[0];
    if (!file) return;
    try {
      var colors = await extractThemeFromImageFile(file, 6);
      if (colors.length > 0) {
        onSetting('colorInput', colors[0]);
        setStatus('Image theme extracted.');
        setIsError(false);
      }
    } catch (_err) {
      setStatus('Image extraction failed.');
      setIsError(true);
    } finally {
      input.value = '';
    }
  }

  useEffect(function () {
    return on('GENERATED', function (payload: PluginGenerated) {
      setGenerated(payload);
      setStatus(
        'Generated ' +
          payload.request.normalizedHex +
          ' at step ' +
          payload.request.anchorStep +
          '.',
      );
      setIsError(false);
    });
  }, []);

  useEffect(function () {
    return on('APPLIED', function (payload: { collectionName: string; updatedCount: number }) {
      setStatus(
        'Applied ' +
          payload.updatedCount +
          ' variables to "' +
          payload.collectionName +
          '".',
      );
      setIsError(false);
    });
  }, []);

  useEffect(function () {
    return on('ERROR', function (payload: { code: string; message: string; hint?: string }) {
      var detail = payload.code + ': ' + payload.message;
      if (payload.hint) {
        detail += ' (' + payload.hint + ')';
      }
      setStatus(detail);
      setIsError(true);
    });
  }, []);

  useEffect(function () {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(function () {
      sendGenerate();
      debounceRef.current = 0;
    }, 140);

    return function () {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [settings]);

  useEffect(function () {
    if (!generated) return;
    var hex = generated.request.normalizedHex;
    setHistory(function (prev) {
      var deduped = prev.filter(function (item) {
        return item.toLowerCase() !== hex.toLowerCase();
      });
      var next = [hex].concat(deduped).slice(0, 10);
      saveHistory(next);
      return next;
    });
  }, [generated]);

  useEffect(function () {
    return function () {
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  return (
    <div class="plugin-wrap">
      <header class="plugin-topbar">
        <span class="plugin-title">OKScale Generator</span>
        <button
          type="button"
          class="plugin-close"
          onClick={function () {
            emit('CLOSE');
          }}
        >
          Close
        </button>
      </header>

      <div class="plugin-tabs">
        {(['controls', 'preview', 'export'] as MainTab[]).map(function (tab) {
          return (
            <button
              key={tab}
              type="button"
              class={'plugin-tab-btn' + (mainTab === tab ? ' active' : '')}
              onClick={function () {
                setMainTab(tab);
              }}
            >
              {tab === 'controls' ? 'Controls' : tab === 'preview' ? 'Preview' : 'Export'}
            </button>
          );
        })}
      </div>

      <main class="plugin-content">
        {/* Controls tab content - will add in next chunk */}
        {mainTab === 'controls' && (
          <div>
            <div class="section">
              <div class="section-title">Color source</div>
              <div class="color-row">
                <input
                  type="color"
                  class="color-input"
                  value={parsed ? rgbToHex(parsed) : '#d9ff00'}
                  onInput={function (e) {
                    onSetting('colorInput', (e.currentTarget as HTMLInputElement).value);
                  }}
                />
                <input
                  class="hex"
                  value={settings.colorInput}
                  onInput={function (e) {
                    onSetting('colorInput', (e.currentTarget as HTMLInputElement).value);
                  }}
                />
              </div>

              {localOklch && (
                <>
                  <div class="slider-row">
                    <div class="slider-head"><span>L</span><span>{(localOklch.l * 100).toFixed(1)}</span></div>
                    <input
                      class="slider"
                      type="range"
                      min="0"
                      max="1"
                      step="0.001"
                      value={localOklch.l}
                      onInput={function (e) {
                        var val = parseFloat((e.currentTarget as HTMLInputElement).value);
                        setFromLch(val, localOklch.c, localOklch.h);
                      }}
                    />
                  </div>
                  <div class="slider-row">
                    <div class="slider-head"><span>C</span><span>{(localOklch.c * 100).toFixed(1)}</span></div>
                    <input
                      class="slider"
                      type="range"
                      min="0"
                      max="0.4"
                      step="0.001"
                      value={localOklch.c}
                      onInput={function (e) {
                        var val = parseFloat((e.currentTarget as HTMLInputElement).value);
                        setFromLch(localOklch.l, val, localOklch.h);
                      }}
                    />
                  </div>
                  <div class="slider-row">
                    <div class="slider-head"><span>H</span><span>{localOklch.h.toFixed(1)}</span></div>
                    <input
                      class="slider"
                      type="range"
                      min="0"
                      max="360"
                      step="0.1"
                      value={localOklch.h}
                      onInput={function (e) {
                        var val = parseFloat((e.currentTarget as HTMLInputElement).value);
                        setFromLch(localOklch.l, localOklch.c, val);
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <div class="section">
              <div class="row">
                <div class="field">
                  <label class="label">Shade mode</label>
                  <select class="select" value={settings.shadeMode} onChange={function (e) {
                    onSetting('shadeMode', (e.currentTarget as HTMLSelectElement).value as PluginSettings['shadeMode']);
                  }}>
                    <option value="none">none</option>
                    <option value="warm">warm</option>
                    <option value="cool">cool</option>
                    <option value="natural">natural</option>
                  </select>
                </div>
                <div class="field">
                  <label class="label">Harmony</label>
                  <select class="select" value={settings.harmonyType} onChange={function (e) {
                    onSetting('harmonyType', (e.currentTarget as HTMLSelectElement).value as PluginSettings['harmonyType']);
                  }}>
                    <option value="complementary">complementary</option>
                    <option value="analogous">analogous</option>
                    <option value="triadic">triadic</option>
                    <option value="split-complementary">split-complementary</option>
                    <option value="tetradic">tetradic</option>
                  </select>
                </div>
              </div>
              <div class="row">
                <div class="field">
                  <label class="label">Anchor behavior</label>
                  <select class="select" value={settings.anchorBehavior} onChange={function (e) {
                    onSetting('anchorBehavior', (e.currentTarget as HTMLSelectElement).value as PluginSettings['anchorBehavior']);
                  }}>
                    <option value="preserve-input">preserve-input</option>
                    <option value="auto-gamut">auto-gamut</option>
                  </select>
                </div>
                <div class="field">
                  <label class="label">Neutral mode</label>
                  <select class="select" value={settings.neutralMode} onChange={function (e) {
                    onSetting('neutralMode', (e.currentTarget as HTMLSelectElement).value as PluginSettings['neutralMode']);
                  }}>
                    <option value="keep-hue">keep-hue</option>
                    <option value="absolute-gray">absolute-gray</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">History</div>
              <div class="history-wrap">
                {history.length === 0 && <span class="label">No history yet</span>}
                {history.map(function (hex) {
                  var active = settings.colorInput.toLowerCase() === hex.toLowerCase();
                  return (
                    <div key={hex} class="history-entry">
                      <button
                        type="button"
                        class={'history-chip' + (active ? ' active' : '')}
                        onClick={function () {
                          onSetting('colorInput', hex);
                        }}
                      >
                        {hex}
                      </button>
                      <button
                        type="button"
                        class="history-remove"
                        onClick={function () {
                          removeHistory(hex);
                        }}
                        aria-label={'Remove ' + hex}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              <div class="row">
                <button class="btn" type="button" onClick={sendGenerate}>Regenerate</button>
                <label class="btn" style="display:flex;align-items:center;justify-content:center;cursor:pointer;">
                  Upload image
                  <input type="file" accept="image/*" onChange={handleImagePick} style="display:none;" />
                </label>
              </div>
              <div class="row">
                <button class="btn" type="button" onClick={resetSettings}>Reset</button>
                <button class="btn" type="button" onClick={clearHistory}>Clear history</button>
              </div>
            </div>
          </div>
        )}

        {/* Preview tab */}
        {mainTab === 'preview' && (
          <div>
            <div class="section">
              <div class="preview-tabs">
                {(['palette', 'ui', 'contrast'] as PreviewTab[]).map(function (tab) {
                  return (
                    <button
                      key={tab}
                      type="button"
                      class={'preview-tab' + (previewTab === tab ? ' active' : '')}
                      onClick={function () {
                        setPreviewTab(tab);
                      }}
                    >
                      {tab === 'ui' ? 'UI Preview' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  );
                })}
              </div>

              {!generated && <div class="label">Generate a palette to see preview data.</div>}

              {generated && previewTab === 'palette' && (
                <div style="display:flex;flex-direction:column;gap:12px;">
                  {roleArray(generated).map(function (role) {
                    return (
                      <div class="role-block" key={role.role}>
                        <div class="role-head">
                          <span>{role.label}</span>
                          <span>{role.baseHex}</span>
                        </div>
                        <div class="scale-row">
                          {role.scale.map(function (item) {
                            var key = 'scale-' + role.role + '-' + item.step;
                            return (
                              <button
                                key={role.role + '-' + item.step}
                                type="button"
                                class="scale-circle"
                                style={{ background: item.hex }}
                                title={role.role + '/' + item.step + ': ' + item.hex}
                                onClick={function () {
                                  copyWithStatus(key, item.hex);
                                }}
                              >
                                <span class="scale-circle-step">{item.step}</span>
                                <span class="scale-circle-hex">{copied === key ? '✓' : item.hex.replace('#', '')}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {generated.gradients[0] && (
                    <div class="gradient-group">
                      <div class="section-title">Gradient</div>
                      <button
                        type="button"
                        class="gradient-bar"
                        style={{ background: generated.gradients[0].css }}
                        onClick={function () { copyWithStatus('grad-main', generated.gradients[0].css); }}
                      >
                        <span>{copied === 'grad-main' ? 'Copied' : 'Copy CSS'}</span>
                      </button>
                      <pre class="code-box"><code>{generated.gradients[0].css}</code></pre>
                    </div>
                  )}

                  {generated.gradients[1] && (
                    <div class="gradient-group">
                      <div class="section-title">Vivid</div>
                      <button
                        type="button"
                        class="gradient-bar"
                        style={{ background: generated.gradients[1].css }}
                        onClick={function () { copyWithStatus('grad-vivid', generated.gradients[1].css); }}
                      >
                        <span>{copied === 'grad-vivid' ? 'Copied' : 'Copy CSS'}</span>
                      </button>
                      <pre class="code-box"><code>{generated.gradients[1].css}</code></pre>
                    </div>
                  )}

                  {generated.gradients[2] && generated.gradients[3] && generated.gradients[4] && (
                    <div class="gradient-group">
                      <div class="section-title">× Neutral 50</div>
                      <div class="gradient-trio">
                        {[
                          { label: 'Primary', g: generated.gradients[2], key: 'grad-p' },
                          { label: 'Secondary', g: generated.gradients[3], key: 'grad-s' },
                          { label: 'Accent', g: generated.gradients[4], key: 'grad-a' },
                        ].map(function (item) {
                          return (
                            <div class="gradient-trio-item" key={item.label}>
                              <button
                                type="button"
                                class="gradient-bar"
                                style={{ background: item.g.css }}
                                onClick={function () { copyWithStatus(item.key, item.g.css); }}
                              >
                                <span>{copied === item.key ? 'Copied' : 'Copy'}</span>
                              </button>
                              <span class="label">{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {generated && previewTab === 'ui' && (
                <div
                  class="preview-card"
                  style={{
                    backgroundColor: scaleHex(generated.palette.neutral, 50, '#f8fafc'),
                    borderColor: scaleHex(generated.palette.neutral, 200, '#e2e8f0'),
                    color: scaleHex(generated.palette.neutral, 900, '#0f172a'),
                  }}
                >
                  <div class="preview-card-head">
                    <div>
                      <div class="label">Product Card</div>
                      <div>Tokenized preview block</div>
                    </div>
                    <span
                      class="badge"
                      style={{
                        backgroundColor: scaleHex(generated.palette.accent, 100, '#e0f2fe'),
                        color: scaleHex(generated.palette.accent, 700, '#0c4a6e'),
                      }}
                    >
                      Accent Tag
                    </span>
                  </div>
                  <div class="preview-actions">
                    <button
                      type="button"
                      class="btn"
                      style={{
                        backgroundColor: scaleHex(generated.palette.primary, 600, '#2563eb'),
                        color: scaleHex(generated.palette.primary, 50, '#eff6ff'),
                      }}
                    >
                      Primary action
                    </button>
                    <button
                      type="button"
                      class="btn"
                      style={{
                        backgroundColor: scaleHex(generated.palette.neutral, 100, '#f1f5f9'),
                        color: scaleHex(generated.palette.neutral, 900, '#0f172a'),
                        borderColor: scaleHex(generated.palette.neutral, 300, '#cbd5e1'),
                      }}
                    >
                      Secondary action
                    </button>
                  </div>
                </div>
              )}

              {generated && previewTab === 'contrast' && (
                <div style="display:flex;flex-direction:column;gap:10px;">
                  {generated.usageRows.map(function (row) {
                    var textHex = scaleHex(generated.palette.primary, row.textStep, '#000');
                    var bgHex = scaleHex(generated.palette.primary, row.backgroundStep, '#fff');
                    var grade = ratioGrade(row.ratio);
                    return (
                      <div class="contrast-item" key={row.label}>
                        <div class="contrast-demo" style={{ background: bgHex, color: textHex }}>
                          {exampleText(row.label)}
                        </div>
                        <div class="contrast-meta">
                          {row.label} · {row.textStep} on {row.backgroundStep} · {row.ratio.toFixed(1)}:1 · {grade}
                        </div>
                      </div>
                    );
                  })}

                  <div class="raw-contrast-wrap">
                    <div class="section-title">Raw step ratios (AA+)</div>
                    {rawContrastRows.map(function (item) {
                      return (
                        <div class="raw-row" key={item.step}>
                          <div class="raw-swatch" style={{ background: item.hex }}></div>
                          <span>{item.step}</span>
                          <span>{item.useWhite ? 'W' : 'B'}</span>
                          <span>{item.ratio.toFixed(1)}:1</span>
                          <span>{item.grade}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Export tab */}
        {mainTab === 'export' && (
          <div>
            <div class="section">
              <div class="section-title">Export route</div>
              <div class="export-route-row">
                {(['agent', 'code', 'figma'] as ExportRoute[]).map(function (item) {
                  return (
                    <button
                      key={item}
                      type="button"
                      class={'route-btn' + (route === item ? ' active' : '')}
                      onClick={function () {
                        setRoute(item);
                      }}
                    >
                      {item === 'agent' ? 'Connect Agent' : item === 'code' ? 'Export Code' : 'Import to Figma'}
                    </button>
                  );
                })}
              </div>
            </div>

            {route === 'agent' && (
              <div class="section">
                <div class="section-title">Command</div>
                <pre class="code-box"><code>{agentCommand}</code></pre>
                <button class="btn" type="button" onClick={function () { copyWithStatus('agent-command', agentCommand); }}>
                  {copied === 'agent-command' ? 'Copied' : 'Copy command'}
                </button>

                <div class="section-title">Prompt template</div>
                <pre class="code-box"><code>{agentPrompt}</code></pre>
                <button class="btn" type="button" onClick={function () { copyWithStatus('agent-prompt', agentPrompt); }}>
                  {copied === 'agent-prompt' ? 'Copied' : 'Copy prompt'}
                </button>
              </div>
            )}

            {route === 'code' && (
              <>
                <div class="section">
                  <div class="row">
                    <div class="field">
                      <label class="label">Format</label>
                      <select class="select" value={exportFormat} onChange={function (e) {
                        setExportFormat((e.currentTarget as HTMLSelectElement).value as ExportFormat);
                      }}>
                        {EXPORT_FORMATS.map(function (fmt) {
                          return <option key={fmt} value={fmt}>{fmt.toUpperCase()}</option>;
                        })}
                      </select>
                    </div>
                    <div class="field">
                      <label class="label">Naming</label>
                      <select class="select" value={namingPreset} onChange={function (e) {
                        setNamingPreset((e.currentTarget as HTMLSelectElement).value as NamingPreset);
                      }}>
                        {NAMING_PRESETS.map(function (preset) {
                          return <option key={preset} value={preset}>{preset}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  <div class="label">Filename: {exportMeta.filename}</div>
                  <div class="label">Format: {exportMeta.format} · Naming: {exportMeta.naming}</div>
                </div>

                <div class="section">
                  <pre class="code-box"><code>{code.length > 2200 ? code.slice(0, 2200) + '\n…' : code}</code></pre>
                  <div class="row">
                    <button class="btn" type="button" onClick={function () { copyWithStatus('code-copy', code); }}>
                      {copied === 'code-copy' ? 'Copied' : 'Copy code'}
                    </button>
                    <button
                      class="btn"
                      type="button"
                      onClick={function () {
                        downloadText(exportFilename(exportFormat, namingPreset), code, 'text/plain;charset=utf-8');
                      }}
                    >
                      Download
                    </button>
                  </div>
                </div>
              </>
            )}

            {route === 'figma' && (
              <div class="section">
                <div class="section-title">Import to Figma Variables</div>
                <div class="field">
                  <label class="label">Naming</label>
                  <select class="select" value={namingPreset} onChange={function (e) {
                    setNamingPreset((e.currentTarget as HTMLSelectElement).value as NamingPreset);
                  }}>
                    {NAMING_PRESETS.map(function (preset) {
                      return <option key={preset} value={preset}>{preset}</option>;
                    })}
                  </select>
                </div>
                <ol class="label" style="margin:0;padding-left:16px;display:flex;flex-direction:column;gap:4px;">
                  <li>Generate with current settings.</li>
                  <li>Apply variables to local collection.</li>
                  <li>Use role/step variables in components.</li>
                </ol>
                <button
                  class="btn primary"
                  type="button"
                  onClick={function () {
                    emit('APPLY_VARIABLES', settings, namingPreset);
                  }}
                >
                  Apply Variables
                </button>
              </div>
            )}
          </div>
        )}

        <div class={isError ? 'status error' : 'status'}>{status}</div>
        {generated && generated.warnings.map(function (warn) {
          return (
            <div key={warn.code + warn.message} class="warning">
              {warn.code}: {warn.message}
            </div>
          );
        })}
      </main>

      <footer class="footer-actions">
        <button type="button" class="btn" onClick={sendGenerate}>Generate</button>
        <button
          type="button"
          class="btn primary"
          onClick={function () {
            emit('APPLY_VARIABLES', settings, namingPreset);
          }}
        >
          Apply Variables
        </button>
      </footer>
    </div>
  );
}

export default function () {
  render(<App />, document.getElementById('app')!);
}
