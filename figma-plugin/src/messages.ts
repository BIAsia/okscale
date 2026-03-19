/**
 * Messages between the Figma plugin code (sandbox) and the UI (iframe).
 */

/** UI → Plugin: apply the generated palette as Figma color styles */
export type ApplyStylesMsg = {
  type: 'apply-styles';
  palette: SerializedPalette;
};

/** UI → Plugin: apply the generated palette as Figma local variables */
export type ApplyVariablesMsg = {
  type: 'apply-variables';
  palette: SerializedPalette;
};

/** UI → Plugin: resize the plugin window */
export type ResizeMsg = {
  type: 'resize';
  width: number;
  height: number;
};

/** UI → Plugin: apply a color to the selected node's fill */
export type ApplyFillMsg = {
  type: 'apply-fill';
  hex: string;
};

/** UI → Plugin: show a native Figma notification */
export type NotifyUserMsg = {
  type: 'notify-user';
  message: string;
  error?: boolean;
};

/** UI → Plugin: create a structured color palette frame on the canvas */
export type ExportToCanvasMsg = {
  type: 'export-to-canvas';
  palette: SerializedPalette;
};

/** Plugin → UI: notify success/failure */
export type NotifyMsg = {
  type: 'notify';
  message: string;
  error?: boolean;
};

export type PluginMessage = ApplyStylesMsg | ApplyVariablesMsg | ResizeMsg | ApplyFillMsg | NotifyUserMsg | ExportToCanvasMsg;
export type UIMessage = NotifyMsg;

/** Serialized palette to transfer over postMessage */
export type SerializedScaleColor = {
  step: number;
  hex: string;
};

export type SerializedRole = {
  role: string;
  label: string;
  baseHex: string;
  scale: SerializedScaleColor[];
};

export type SerializedPalette = {
  primary: SerializedRole;
  secondary: SerializedRole;
  accent: SerializedRole;
  neutral: SerializedRole;
};
