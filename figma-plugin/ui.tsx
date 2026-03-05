import { emit, on } from '@create-figma-plugin/utilities';
import {
  Button,
  Container,
  Dropdown,
  DropdownOption,
  render,
  Textbox,
  VerticalSpace,
  Tabs,
  TabsOption,
  Text,
  Bold,
} from '@create-figma-plugin/ui';
import { h } from 'preact';
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

function Plugin() {
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

  var mainTabOptions: TabsOption[] = [
    { value: 'controls', children: <Text>Controls</Text> },
    { value: 'preview', children: <Text>Preview</Text> },
    { value: 'export', children: <Text>Export</Text> },
  ];

  var shadeModeOptions: DropdownOption[] = [
    { value: 'none' },
    { value: 'warm' },
    { value: 'cool' },
    { value: 'natural' },
  ];

  var harmonyOptions: DropdownOption[] = [
    { value: 'complementary' },
    { value: 'analogous' },
    { value: 'triadic' },
    { value: 'split-complementary' },
    { value: 'tetradic' },
  ];

  var anchorOptions: DropdownOption[] = [
    { value: 'preserve-input' },
    { value: 'auto-gamut' },
  ];

  var neutralOptions: DropdownOption[] = [
    { value: 'keep-hue' },
    { value: 'absolute-gray' },
  ];

  return (
    <Container space="medium">
      <VerticalSpace space="small" />
      <Tabs
        options={mainTabOptions}
        value={mainTab}
        onValueChange={function (value) {
          setMainTab(value as MainTab);
        }}
      />
      <VerticalSpace space="medium" />

      {mainTab === 'controls' && (
        <Container space="medium">
          <Text><Bold>Color source</Bold></Text>
          <VerticalSpace space="small" />
          <Textbox
            value={settings.colorInput}
            onValueInput={function (value) {
              onSetting('colorInput', value);
            }}
            variant="border"
          />
          <VerticalSpace space="medium" />

          {localOklch && (
            <>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <Text>L</Text>
                <Text>{(localOklch.l * 100).toFixed(1)}</Text>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={localOklch.l}
                onInput={function (e) {
                  var val = parseFloat((e.currentTarget as HTMLInputElement).value);
                  setFromLch(val, localOklch.c, localOklch.h);
                }}
                style="width:100%;"
              />
              <VerticalSpace space="small" />

              <div style="display:flex;justify-content:space-between;align-items:center;">
                <Text>C</Text>
                <Text>{(localOklch.c * 100).toFixed(1)}</Text>
              </div>
              <input
                type="range"
                min="0"
                max="0.4"
                step="0.001"
                value={localOklch.c}
                onInput={function (e) {
                  var val = parseFloat((e.currentTarget as HTMLInputElement).value);
                  setFromLch(localOklch.l, val, localOklch.h);
                }}
                style="width:100%;"
              />
              <VerticalSpace space="small" />

              <div style="display:flex;justify-content:space-between;align-items:center;">
                <Text>H</Text>
                <Text>{localOklch.h.toFixed(1)}</Text>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="0.1"
                value={localOklch.h}
                onInput={function (e) {
                  var val = parseFloat((e.currentTarget as HTMLInputElement).value);
                  setFromLch(localOklch.l, localOklch.c, val);
                }}
                style="width:100%;"
              />
              <VerticalSpace space="medium" />
            </>
          )}

          <Text><Bold>Shade mode</Bold></Text>
          <VerticalSpace space="small" />
          <Dropdown
            options={shadeModeOptions}
            value={settings.shadeMode}
            onValueChange={function (value) {
              onSetting('shadeMode', value as PluginSettings['shadeMode']);
            }}
          />
          <VerticalSpace space="small" />

          <Text><Bold>Harmony</Bold></Text>
          <VerticalSpace space="small" />
          <Dropdown
            options={harmonyOptions}
            value={settings.harmonyType}
            onValueChange={function (value) {
              onSetting('harmonyType', value as PluginSettings['harmonyType']);
            }}
          />
          <VerticalSpace space="small" />

          <Text><Bold>Anchor behavior</Bold></Text>
          <VerticalSpace space="small" />
          <Dropdown
            options={anchorOptions}
            value={settings.anchorBehavior}
            onValueChange={function (value) {
              onSetting('anchorBehavior', value as PluginSettings['anchorBehavior']);
            }}
          />
          <VerticalSpace space="small" />

          <Text><Bold>Neutral mode</Bold></Text>
          <VerticalSpace space="small" />
          <Dropdown
            options={neutralOptions}
            value={settings.neutralMode}
            onValueChange={function (value) {
              onSetting('neutralMode', value as PluginSettings['neutralMode']);
            }}
          />
          <VerticalSpace space="medium" />

          <Text><Bold>History</Bold></Text>
          <VerticalSpace space="small" />
          {history.length === 0 && <Text>No history yet</Text>}
          {history.map(function (hex) {
            var active = settings.colorInput.toLowerCase() === hex.toLowerCase();
            return (
              <div key={hex} style="display:flex;gap:8px;margin-bottom:4px;">
                <Button
                  secondary={!active}
                  onClick={function () {
                    onSetting('colorInput', hex);
                  }}
                  style="flex:1;"
                >
                  {hex}
                </Button>
                <Button
                  secondary
                  onClick={function () {
                    removeHistory(hex);
                  }}
                >
                  ×
                </Button>
              </div>
            );
          })}
          <VerticalSpace space="small" />

          <Button fullWidth onClick={sendGenerate}>Regenerate</Button>
          <VerticalSpace space="extraSmall" />
          <Button fullWidth secondary onClick={resetSettings}>Reset</Button>
          <VerticalSpace space="extraSmall" />
          <Button fullWidth secondary onClick={clearHistory}>Clear history</Button>
          <VerticalSpace space="medium" />

          <Button
            fullWidth
            onClick={function () {
              emit('APPLY_VARIABLES', settings, namingPreset);
            }}
          >
            Apply Variables
          </Button>
        </Container>
      )}

      {mainTab === 'preview' && (
        <Container space="medium">
          <Text>Preview tab - palette/UI/contrast views will be added</Text>
        </Container>
      )}

      {mainTab === 'export' && (
        <Container space="medium">
          <Text>Export tab - agent/code/figma routes will be added</Text>
        </Container>
      )}

      <VerticalSpace space="small" />
      <Text>{status}</Text>
      {generated && generated.warnings.map(function (warn) {
        return (
          <div key={warn.code + warn.message}>
            <Text>{warn.code}: {warn.message}</Text>
          </div>
        );
      })}
    </Container>
  );
}

export default render(Plugin);
