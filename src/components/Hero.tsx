type Props = {
  onJumpToGenerator: () => void;
};

export function Hero(props: Props) {
  return (
    <section id="hero" class="hero-section section">
      <div class="accent-strip" aria-hidden="true" />
      <p class="hero-kicker">Perceptual Color Infrastructure</p>
      <h1>OKSCALE</h1>
      <p class="hero-subtitle">Perceptually uniform color scales for modern design systems. Powered by Oklch.</p>
      <button type="button" class="cta" onClick={props.onJumpToGenerator}>
        Build your scale
      </button>
    </section>
  );
}
