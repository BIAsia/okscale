export var GENERATE_REQUEST_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://okscale.dev/schemas/generate-request.schema.json',
  title: 'OKScale Generate Request',
  type: 'object',
  additionalProperties: false,
  required: ['colorInput', 'shadeMode', 'harmonyType'],
  properties: {
    schemaVersion: { type: 'string', enum: ['1.0'] },
    colorInput: { type: 'string', minLength: 1 },
    shadeMode: { type: 'string', enum: ['none', 'warm', 'cool', 'natural'] },
    harmonyType: {
      type: 'string',
      enum: ['complementary', 'analogous', 'triadic', 'split-complementary', 'tetradic']
    },
    anchorBehavior: { type: 'string', enum: ['preserve-input', 'auto-gamut'] }
  }
};

export var GENERATE_RESPONSE_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://okscale.dev/schemas/generate-response.schema.json',
  title: 'OKScale Generate Response',
  type: 'object',
  required: ['schemaVersion', 'algorithmVersion', 'request', 'warnings', 'palette', 'harmony'],
  properties: {
    schemaVersion: { type: 'string', enum: ['1.0'] },
    algorithmVersion: { type: 'string' },
    request: { type: 'object' },
    warnings: { type: 'array' },
    palette: { type: 'object' },
    harmony: { type: 'object' }
  }
};

export var EXPORT_REQUEST_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://okscale.dev/schemas/export-request.schema.json',
  title: 'OKScale Export Request',
  type: 'object',
  additionalProperties: false,
  required: ['colorInput', 'shadeMode', 'harmonyType', 'format'],
  properties: {
    schemaVersion: { type: 'string', enum: ['1.0'] },
    colorInput: { type: 'string', minLength: 1 },
    shadeMode: { type: 'string', enum: ['none', 'warm', 'cool', 'natural'] },
    harmonyType: {
      type: 'string',
      enum: ['complementary', 'analogous', 'triadic', 'split-complementary', 'tetradic']
    },
    anchorBehavior: { type: 'string', enum: ['preserve-input', 'auto-gamut'] },
    format: { type: 'string', enum: ['css', 'tailwind', 'tokens', 'figma', 'scss'] },
    namingPreset: { type: 'string', enum: ['numeric', 'semantic'] }
  }
};

export var EXPORT_RESPONSE_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://okscale.dev/schemas/export-response.schema.json',
  title: 'OKScale Export Response',
  type: 'object',
  required: [
    'schemaVersion',
    'algorithmVersion',
    'format',
    'namingPreset',
    'filename',
    'mediaType',
    'content',
    'generate'
  ],
  properties: {
    schemaVersion: { type: 'string', enum: ['1.0'] },
    algorithmVersion: { type: 'string' },
    format: { type: 'string' },
    namingPreset: { type: 'string' },
    filename: { type: 'string' },
    mediaType: { type: 'string' },
    content: { type: 'string' },
    generate: { type: 'object' }
  }
};
