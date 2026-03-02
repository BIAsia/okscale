import { Generator, type GeneratorProps } from '../components/Generator';
import type { FullPalette } from '../lib/palette';

type WorkspacePageProps = {
  onNavigate: (to: string) => void;
  palette: FullPalette | null;
} & GeneratorProps;

export function WorkspacePage(props: WorkspacePageProps) {
  return (
    <Generator
      colorInput={props.colorInput}
      colorError={props.colorError}
      primaryOklch={props.primaryOklch}
      palette={props.palette}
      harmony={props.harmony}
      gradients={props.gradients}
      shadeMode={props.shadeMode}
      harmonyType={props.harmonyType}
      onColorChange={props.onColorChange}
      onShadeModeChange={props.onShadeModeChange}
      onHarmonyTypeChange={props.onHarmonyTypeChange}
      anchorBehavior={props.anchorBehavior}
      anchorStep={props.anchorStep}
      onAnchorBehaviorChange={props.onAnchorBehaviorChange}
      recentColors={props.recentColors}
      onSelectRecentColor={props.onSelectRecentColor}
      onRemoveRecentColor={props.onRemoveRecentColor}
      onClearHistory={props.onClearHistory}
      neutralMode={props.neutralMode}
      onNeutralModeChange={props.onNeutralModeChange}
      onNavigate={props.onNavigate}
    />
  );
}
