type PaletteScaleItem = { step: number; hex: string };
type PaletteRole = {
  role: string;
  label: string;
  baseHex: string;
  scale: PaletteScaleItem[];
};

type GenerateResult = {
  request: {
    normalizedHex: string;
    anchorStep: number;
  };
  warnings: Array<{ code: string; message: string }>;
  palette: {
    primary: PaletteRole;
    secondary: PaletteRole;
    accent: PaletteRole;
    neutral: PaletteRole;
  };
};

type PluginInbound =
  | { type: 'generated'; payload: GenerateResult }
  | { type: 'applied'; payload: { collectionName: string; updatedCount: number } }
  | { type: 'error'; payload: { code: string; message: string; hint?: string } };

function byId<T extends HTMLElement>(id: string): T {
  var el = document.getElementById(id);
  if (!el) {
    throw new Error('Missing required element #' + id);
  }
  return el as T;
}

var colorInput = byId<HTMLInputElement>('colorInput');
var shadeMode = byId<HTMLSelectElement>('shadeMode');
var harmonyType = byId<HTMLSelectElement>('harmonyType');
var anchorBehavior = byId<HTMLSelectElement>('anchorBehavior');
var generateBtn = byId<HTMLButtonElement>('generateBtn');
var applyBtn = byId<HTMLButtonElement>('applyBtn');
var closeBtn = byId<HTMLButtonElement>('closeBtn');
var statusEl = byId<HTMLDivElement>('status');
var warningsEl = byId<HTMLDivElement>('warnings');
var paletteEl = byId<HTMLDivElement>('palette');

function messagePayload() {
  return {
    colorInput: colorInput.value,
    shadeMode: shadeMode.value,
    harmonyType: harmonyType.value,
    anchorBehavior: anchorBehavior.value,
  };
}

function send(type: 'generate' | 'apply') {
  parent.postMessage(
    {
      pluginMessage: {
        type: type,
        payload: messagePayload(),
      },
    },
    '*'
  );
}

function setStatus(text: string, isError?: boolean) {
  statusEl.textContent = text;
  statusEl.className = isError ? 'status error' : 'status';
}

function renderWarnings(warnings: Array<{ code: string; message: string }>) {
  warningsEl.innerHTML = '';
  if (!warnings || warnings.length === 0) return;

  var frag = document.createDocumentFragment();
  for (var i = 0; i < warnings.length; i++) {
    var line = document.createElement('div');
    line.className = 'warn';
    line.textContent = warnings[i].code + ': ' + warnings[i].message;
    frag.appendChild(line);
  }
  warningsEl.appendChild(frag);
}

function renderRole(role: PaletteRole) {
  var wrapper = document.createElement('div');
  wrapper.className = 'role';

  var head = document.createElement('div');
  head.className = 'role-head';
  head.innerHTML = '<strong>' + role.label + '</strong><span>' + role.baseHex + '</span>';

  var swatches = document.createElement('div');
  swatches.className = 'swatches';

  for (var i = 0; i < role.scale.length; i++) {
    var item = role.scale[i];
    var sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = item.hex;
    sw.title = role.role + '/' + item.step + ': ' + item.hex;
    swatches.appendChild(sw);
  }

  wrapper.appendChild(head);
  wrapper.appendChild(swatches);
  return wrapper;
}

function renderPalette(payload: GenerateResult) {
  paletteEl.innerHTML = '';

  var roles = [
    payload.palette.primary,
    payload.palette.secondary,
    payload.palette.accent,
    payload.palette.neutral,
  ];

  for (var i = 0; i < roles.length; i++) {
    paletteEl.appendChild(renderRole(roles[i]));
  }

  var summary =
    'Generated ' + payload.request.normalizedHex +
    ' at anchor step ' + payload.request.anchorStep + '.';
  setStatus(summary);
  renderWarnings(payload.warnings || []);
}

window.onmessage = function (event) {
  var msg = event.data && event.data.pluginMessage;
  if (!msg || !msg.type) return;

  var inbound = msg as PluginInbound;

  if (inbound.type === 'generated') {
    renderPalette(inbound.payload);
    return;
  }

  if (inbound.type === 'applied') {
    setStatus(
      'Applied ' + inbound.payload.updatedCount +
      ' variables to collection "' + inbound.payload.collectionName + '".'
    );
    return;
  }

  if (inbound.type === 'error') {
    var text = inbound.payload.code + ': ' + inbound.payload.message;
    if (inbound.payload.hint) {
      text += ' (' + inbound.payload.hint + ')';
    }
    setStatus(text, true);
  }
};

function handleAutoGenerate() {
  send('generate');
}

colorInput.addEventListener('change', handleAutoGenerate);
shadeMode.addEventListener('change', handleAutoGenerate);
harmonyType.addEventListener('change', handleAutoGenerate);
anchorBehavior.addEventListener('change', handleAutoGenerate);

generateBtn.addEventListener('click', function () {
  send('generate');
});

applyBtn.addEventListener('click', function () {
  send('apply');
});

closeBtn.addEventListener('click', function () {
  parent.postMessage({ pluginMessage: { type: 'close' } }, '*');
});

send('generate');
